const { sendEmail } = require("../utils/emailService");

function fetchCartItems(connection, userId, forUpdate = true) {
  return new Promise((resolve, reject) => {
    const cartQuery = `
      SELECT c.product_id, c.quantity, p.price, p.stock, p.name
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ${forUpdate ? "FOR UPDATE" : ""}
    `;

    connection.query(cartQuery, [userId], (err, cartItems) => {
      if (err) return reject(err);
      resolve(cartItems);
    });
  });
}

function validateCartItems(cartItems) {
  if (cartItems.length === 0) {
    return { ok: false, status: 400, message: "Cart is empty" };
  }

  let total = 0;
  for (const item of cartItems) {
    if (item.stock < item.quantity) {
      return {
        ok: false,
        status: 400,
        message: `Insufficient stock for ${item.name}`,
      };
    }
    total += Number(item.price) * Number(item.quantity);
  }

  return { ok: true, cartItems, total };
}

function getCartSummary(db, userId) {
  return new Promise((resolve, reject) => {
    db.getConnection(async (connErr, connection) => {
      if (connErr) return reject(connErr);

      try {
        const cartItems = await fetchCartItems(connection, userId, false);
        connection.release();
        resolve(validateCartItems(cartItems));
      } catch (err) {
        connection.release();
        reject(err);
      }
    });
  });
}

function insertOrder(connection, userId, total, paymentOptions) {
  const {
    paymentMethod = "cod",
    paymentStatus = "unpaid",
    paystackReference = null,
    currency = "GHS",
    orderStatus = "pending",
  } = paymentOptions;

  return new Promise((resolve, reject) => {
    const orderQuery = `
      INSERT INTO orders (
        user_id, total_price, status,
        payment_method, payment_status, paystack_reference, currency
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(
      orderQuery,
      [
        userId,
        total,
        orderStatus,
        paymentMethod,
        paymentStatus,
        paystackReference,
        currency,
      ],
      (err, orderResult) => {
        if (err) return reject(err);
        resolve(orderResult.insertId);
      }
    );
  });
}

function insertOrderItems(connection, orderId, cartItems) {
  const items = cartItems.map((item) => [
    orderId,
    item.product_id,
    item.quantity,
    item.price,
  ]);

  return new Promise((resolve, reject) => {
    connection.query(
      "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?",
      [items],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function decrementStock(connection, cartItems) {
  return cartItems.reduce((promise, item) => {
    return promise.then(
      () =>
        new Promise((resolve, reject) => {
          connection.query(
            `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
            [item.quantity, item.product_id, item.quantity],
            (err, result) => {
              if (err) return reject(err);
              if (result.affectedRows !== 1) {
                return reject(
                  new Error(`Insufficient stock for ${item.name}`)
                );
              }
              resolve();
            }
          );
        })
    );
  }, Promise.resolve());
}

function clearCart(connection, userId) {
  return new Promise((resolve, reject) => {
    connection.query(
      "DELETE FROM cart WHERE user_id = ?",
      [userId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function commitTransaction(connection) {
  return new Promise((resolve, reject) => {
    connection.commit((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function rollbackTransaction(connection) {
  return new Promise((resolve) => {
    connection.rollback(() => {
      connection.release();
      resolve();
    });
  });
}

async function processOrderFromCart(connection, userId, paymentOptions) {
  const cartItems = await fetchCartItems(connection, userId, true);
  const validation = validateCartItems(cartItems);

  if (!validation.ok) {
    return validation;
  }

  const orderId = await insertOrder(
    connection,
    userId,
    validation.total,
    paymentOptions
  );
  await insertOrderItems(connection, orderId, cartItems);
  await decrementStock(connection, cartItems);
  await clearCart(connection, userId);

  return {
    ok: true,
    orderId,
    total: validation.total,
    currency: paymentOptions.currency || "GHS",
  };
}

function sendOrderEmail(userEmail, orderId, total, paymentMethod) {
  if (!userEmail) return;

  const methodLabel =
    paymentMethod === "paystack"
      ? "Paystack (paid online)"
      : "Cash on Delivery";

  sendEmail(
    userEmail,
    "Order Confirmation - FastBuy",
    `
      <h1>Order Successful</h1>
      <p>Your order #${orderId} has been placed successfully.</p>
      <p>Total: GH₵${Number(total).toFixed(2)}</p>
      <p>Payment: ${methodLabel}</p>
    `
  );
}

async function createOrderFromCart(connection, userId, userEmail, paymentOptions) {
  try {
    const result = await processOrderFromCart(connection, userId, paymentOptions);

    if (!result.ok) {
      await rollbackTransaction(connection);
      return result;
    }

    await commitTransaction(connection);
    connection.release();

    sendOrderEmail(
      userEmail,
      result.orderId,
      result.total,
      paymentOptions.paymentMethod
    );

    return result;
  } catch (err) {
    await rollbackTransaction(connection);
    throw err;
  }
}

function runInTransaction(db, work) {
  return new Promise((resolve, reject) => {
    db.getConnection((connErr, connection) => {
      if (connErr) return reject(connErr);

      connection.beginTransaction(async (err) => {
        if (err) {
          connection.release();
          return reject(err);
        }

        try {
          const result = await work(connection);
          resolve(result);
        } catch (error) {
          await rollbackTransaction(connection);
          reject(error);
        }
      });
    });
  });
}

module.exports = {
  fetchCartItems,
  validateCartItems,
  getCartSummary,
  processOrderFromCart,
  createOrderFromCart,
  runInTransaction,
  commitTransaction,
  rollbackTransaction,
  sendOrderEmail,
};
