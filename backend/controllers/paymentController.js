const db = require("../config/db");
const { sendServerError } = require("../middlewares/errorMiddleware");
const {
  getCartSummary,
  processOrderFromCart,
  commitTransaction,
  rollbackTransaction,
  sendOrderEmail,
} = require("../services/orderService");
const paystack = require("../services/paystackService");

function getPendingPayment(reference) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM pending_payments WHERE reference = ? LIMIT 1",
      [reference],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      }
    );
  });
}

function markPendingPayment(connection, reference, status, orderId = null) {
  return new Promise((resolve, reject) => {
    connection.query(
      `UPDATE pending_payments
       SET status = ?, order_id = COALESCE(?, order_id)
       WHERE reference = ?`,
      [status, orderId, reference],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

async function fulfillPaystackPayment(reference, expectedUserId = null) {
  const pending = await getPendingPayment(reference);

  if (!pending) {
    return { ok: false, status: 404, message: "Payment reference not found" };
  }

  if (pending.status === "completed" && pending.order_id) {
    return {
      ok: true,
      alreadyCompleted: true,
      orderId: pending.order_id,
      total: pending.amount_ghs,
      currency: pending.currency,
    };
  }

  if (expectedUserId && pending.user_id !== expectedUserId) {
    return { ok: false, status: 403, message: "Payment reference mismatch" };
  }

  let verification;
  try {
    verification = await paystack.verifyTransaction(reference);
  } catch (err) {
    return {
      ok: false,
      status: 502,
      message: err.message || "Unable to verify payment",
    };
  }

  const transaction = verification.data;
  const paidAmount = Number(transaction.amount);
  const currency = (transaction.currency || "").toUpperCase();

  if (transaction.status !== "success") {
    return { ok: false, status: 400, message: "Payment was not successful" };
  }

  if (currency !== paystack.getCurrency()) {
    return { ok: false, status: 400, message: "Unexpected payment currency" };
  }

  if (paidAmount !== Number(pending.amount_pesewas)) {
    return {
      ok: false,
      status: 400,
      message: "Payment amount does not match order total",
    };
  }

  const userEmail = await new Promise((resolve, reject) => {
    db.query(
      "SELECT email FROM users WHERE id = ? LIMIT 1",
      [pending.user_id],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0]?.email || null);
      }
    );
  });

  return new Promise((resolve, reject) => {
    db.getConnection(async (connErr, connection) => {
      if (connErr) return reject(connErr);

      connection.beginTransaction(async (txErr) => {
        if (txErr) {
          connection.release();
          return reject(txErr);
        }

        try {
          const lockedPending = await new Promise((res, rej) => {
            connection.query(
              "SELECT * FROM pending_payments WHERE reference = ? FOR UPDATE",
              [reference],
              (err, rows) => {
                if (err) return rej(err);
                res(rows[0] || null);
              }
            );
          });

          if (!lockedPending) {
            await rollbackTransaction(connection);
            return resolve({
              ok: false,
              status: 404,
              message: "Payment reference not found",
            });
          }

          if (lockedPending.status === "completed" && lockedPending.order_id) {
            await rollbackTransaction(connection);
            return resolve({
              ok: true,
              alreadyCompleted: true,
              orderId: lockedPending.order_id,
              total: lockedPending.amount_ghs,
              currency: lockedPending.currency,
            });
          }

          const orderResult = await processOrderFromCart(
            connection,
            pending.user_id,
            {
              paymentMethod: "paystack",
              paymentStatus: "paid",
              paystackReference: reference,
              currency: paystack.getCurrency(),
              orderStatus: "pending",
            }
          );

          if (!orderResult.ok) {
            await rollbackTransaction(connection);
            return resolve({
              ok: false,
              status: orderResult.status,
              message: orderResult.message,
            });
          }

          if (
            Math.abs(orderResult.total - Number(pending.amount_ghs)) > 0.01
          ) {
            await rollbackTransaction(connection);
            return resolve({
              ok: false,
              status: 409,
              message: "Cart total changed since payment was initialized",
            });
          }

          await markPendingPayment(
            connection,
            reference,
            "completed",
            orderResult.orderId
          );
          await commitTransaction(connection);
          connection.release();

          sendOrderEmail(
            userEmail,
            orderResult.orderId,
            orderResult.total,
            "paystack"
          );

          resolve({
            ok: true,
            orderId: orderResult.orderId,
            total: orderResult.total,
            currency: orderResult.currency,
          });
        } catch (err) {
          await rollbackTransaction(connection);
          reject(err);
        }
      });
    });
  });
}

exports.getPaystackConfig = (req, res) => {
  res.json({
    publicKey: paystack.getPublicKey(),
    currency: paystack.getCurrency(),
  });
};

exports.initializePaystack = async (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;

  if (!paystack.getSecretKey() || !paystack.getPublicKey()) {
    return res.status(503).json({
      success: false,
      message: "Paystack is not configured",
    });
  }

  try {
    const preview = await getCartSummary(db, userId);

    if (!preview.ok) {
      return res.status(preview.status).json({
        success: false,
        message: preview.message,
      });
    }

    const total = preview.total;
    const amountPesewas = paystack.ghsToPesewas(total);
    const reference = paystack.generateReference(userId);

    await new Promise((resolve, reject) => {
      db.query(
        `INSERT INTO pending_payments
         (user_id, reference, amount_ghs, amount_pesewas, currency, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [userId, reference, total, amountPesewas, paystack.getCurrency()],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    const initData = await paystack.initializeTransaction({
      email: userEmail,
      amountPesewas,
      reference,
      metadata: {
        user_id: userId,
        checkout: true,
      },
    });

    return res.json({
      success: true,
      reference,
      access_code: initData.data.access_code,
      authorization_url: initData.data.authorization_url,
      amount: amountPesewas,
      amountGhs: total,
      currency: paystack.getCurrency(),
      publicKey: paystack.getPublicKey(),
      email: userEmail,
    });
  } catch (err) {
    return sendServerError(res, err, "Failed to initialize Paystack payment");
  }
};

exports.verifyPaystack = async (req, res) => {
  const reference = req.params.reference;
  const userId = req.user.id;

  try {
    const result = await fulfillPaystackPayment(reference, userId);

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: result.alreadyCompleted
        ? "Payment already processed"
        : "Payment verified",
      orderId: result.orderId,
      total: result.total,
      currency: result.currency || paystack.getCurrency(),
    });
  } catch (err) {
    return sendServerError(res, err, "Failed to verify payment");
  }
};

exports.handlePaystackWebhook = async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).send("Invalid webhook payload");
  }

  if (!paystack.verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).send("Invalid signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).send("Invalid JSON");
  }

  if (event.event !== "charge.success") {
    return res.status(200).send("Ignored");
  }

  const reference = event.data?.reference;
  if (!reference) {
    return res.status(200).send("No reference");
  }

  try {
    await fulfillPaystackPayment(reference);
    return res.status(200).send("OK");
  } catch (err) {
    console.error("Paystack webhook fulfillment failed:", err);
    return res.status(500).send("Fulfillment failed");
  }
};
