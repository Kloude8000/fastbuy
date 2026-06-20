const { sendEmail } = require("../utils/emailService");

const db = require("../config/db");

exports.checkout = (req, res) => {
  const userId = req.user.id;

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Failed to start transaction"
      });
    }

    // 1. Get cart items
    const cartQuery = `
      SELECT c.product_id, c.quantity, p.price, p.stock
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `;

    db.query(cartQuery, [userId], (err, cartItems) => {
      if (err) {
        return db.rollback(() => {
          res.status(500).json({
            success: false,
            message: "Failed to fetch cart items"
          });
        });
      }

      if (cartItems.length === 0) {
        return db.rollback(() => {
          res.status(400).json({
            success: false,
            message: "Cart is empty"
          });
        });
      }

      // 2. Validate stock + calculate total
      let total = 0;

      for (let item of cartItems) {
        if (item.stock < item.quantity) {
          return db.rollback(() => {
            res.status(400).json({
              success: false,
              message: `Insufficient stock for product ${item.product_id}`
            });
          });
        }

        total += item.price * item.quantity;
      }

      // 3. Create order
      const orderQuery = `
        INSERT INTO orders (user_id, total_price, status)
        VALUES (?, ?, 'pending')
      `;

      db.query(orderQuery, [userId, total], (err, orderResult) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({
              success: false,
              message: "Failed to create order"
            });
          });
        }

        const orderId = orderResult.insertId;

        // 4. Insert order items
        const items = cartItems.map(item => [
          orderId,
          item.product_id,
          item.quantity,
          item.price
        ]);

        const itemsQuery = `
          INSERT INTO order_items
          (order_id, product_id, quantity, price)
          VALUES ?
        `;

        db.query(itemsQuery, [items], (err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({
                success: false,
                message: "Failed to insert order items"
              });
            });
          }

          // 5. Update stock sequentially
          let i = 0;

          const updateStock = () => {
            if (i >= cartItems.length) {
              return clearCart();
            }

            const item = cartItems[i];

            db.query(
              `UPDATE products SET stock = stock - ? WHERE id = ?`,
              [item.quantity, item.product_id],
              (err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({
                      success: false,
                      message: "Stock update failed"
                    });
                  });
                }

                i++;
                updateStock();
              }
            );
          };

          // 6. Clear cart
          const clearCart = () => {
            db.query(
              `DELETE FROM cart WHERE user_id = ?`,
              [userId],
              (err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({
                      success: false,
                      message: "Failed to clear cart"
                    });
                  });
                }

                // 7. COMMIT TRANSACTION
                db.commit((err) => {
                  if (err) {
                    return db.rollback(() => {
                      res.status(500).json({
                        success: false,
                        message: "Commit failed"
                      });
                    });
                  }

                  sendEmail(
                    req.user.email,
                    "Order Confirmation - FastBuy",
                    `
                      <h1>Order Successful</h1>
                      <p>Your order #${orderId} has been placed successfully.</p>
                      <p>Total: $${total}</p>
                    `
                  );

                  return res.json({
                    success: true,
                    message: "Order placed successfully",
                    orderId,
                    total
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
};