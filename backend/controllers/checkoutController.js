const { sendEmail } = require("../utils/emailService");
const db = require("../config/db");
const { sendServerError } = require("../middlewares/errorMiddleware");

exports.checkout = (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;

  db.getConnection((connErr, connection) => {
    if (connErr) {
      return sendServerError(res, connErr, "Failed to acquire database connection");
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return sendServerError(res, err, "Failed to start transaction");
      }

      const cartQuery = `
        SELECT c.product_id, c.quantity, p.price, p.stock, p.name
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
        FOR UPDATE
      `;

      connection.query(cartQuery, [userId], (err, cartItems) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            sendServerError(res, err, "Failed to fetch cart items");
          });
        }

        if (cartItems.length === 0) {
          return connection.rollback(() => {
            connection.release();
            res.status(400).json({
              success: false,
              message: "Cart is empty",
            });
          });
        }

        let total = 0;

        for (const item of cartItems) {
          if (item.stock < item.quantity) {
            return connection.rollback(() => {
              connection.release();
              res.status(400).json({
                success: false,
                message: `Insufficient stock for ${item.name}`,
              });
            });
          }

          total += item.price * item.quantity;
        }

        const orderQuery = `
          INSERT INTO orders (user_id, total_price, status)
          VALUES (?, ?, 'pending')
        `;

        connection.query(orderQuery, [userId, total], (err, orderResult) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              sendServerError(res, err, "Failed to create order");
            });
          }

          const orderId = orderResult.insertId;

          const items = cartItems.map((item) => [
            orderId,
            item.product_id,
            item.quantity,
            item.price,
          ]);

          const itemsQuery = `
            INSERT INTO order_items (order_id, product_id, quantity, price)
            VALUES ?
          `;

          connection.query(itemsQuery, [items], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                sendServerError(res, err, "Failed to insert order items");
              });
            }

            let i = 0;

            const updateStock = () => {
              if (i >= cartItems.length) {
                return clearCart();
              }

              const item = cartItems[i];

              connection.query(
                `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
                [item.quantity, item.product_id, item.quantity],
                (err, result) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      sendServerError(res, err, "Stock update failed");
                    });
                  }

                  if (result.affectedRows !== 1) {
                    return connection.rollback(() => {
                      connection.release();
                      res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${item.name}`,
                      });
                    });
                  }

                  i++;
                  updateStock();
                }
              );
            };

            const clearCart = () => {
              connection.query(
                `DELETE FROM cart WHERE user_id = ?`,
                [userId],
                (err) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      sendServerError(res, err, "Failed to clear cart");
                    });
                  }

                  connection.commit((err) => {
                    if (err) {
                      return connection.rollback(() => {
                        connection.release();
                        sendServerError(res, err, "Commit failed");
                      });
                    }

                    connection.release();

                    if (userEmail) {
                      sendEmail(
                        userEmail,
                        "Order Confirmation - FastBuy",
                        `
                          <h1>Order Successful</h1>
                          <p>Your order #${orderId} has been placed successfully.</p>
                          <p>Total: $${total}</p>
                        `
                      );
                    }

                    return res.json({
                      success: true,
                      message: "Order placed successfully",
                      orderId,
                      total,
                    });
                  });
                }
              );
            };

            updateStock();
          });
        });
      });
    });
  });
};
