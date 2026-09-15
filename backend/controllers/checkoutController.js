const db = require("../config/db");
const { sendServerError } = require("../middlewares/errorMiddleware");
const { createOrderFromCart } = require("../services/orderService");

exports.checkout = (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;
  const paymentMethod = req.body?.paymentMethod === "paystack" ? "paystack" : "cod";

  if (paymentMethod === "paystack") {
    return res.status(400).json({
      success: false,
      message: "Use Paystack payment initialization for online payments",
    });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      return sendServerError(res, connErr, "Failed to acquire database connection");
    }

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return sendServerError(res, err, "Failed to start transaction");
      }

      try {
        const result = await createOrderFromCart(connection, userId, userEmail, {
          paymentMethod: "cod",
          paymentStatus: "unpaid",
          paystackReference: null,
          currency: "GHS",
          orderStatus: "pending",
        });

        if (!result.ok) {
          return res.status(result.status).json({
            success: false,
            message: result.message,
          });
        }

        return res.json({
          success: true,
          message: "Order placed successfully",
          orderId: result.orderId,
          total: result.total,
          currency: result.currency,
          paymentMethod: "cod",
        });
      } catch (error) {
        return sendServerError(res, error, "Checkout failed");
      }
    });
  });
};
