const db = require("../config/db");
const { sendServerError } = require("../middlewares/errorMiddleware");

exports.getUserOrders = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT 
      o.*,
      COUNT(oi.id) AS total_items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return sendServerError(res, err, "Failed to fetch orders");
    res.json(results);
  });
};

exports.getOrderDetails = (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  const isAdmin = req.user.role === "admin";

  const orderQuery = isAdmin
    ? `SELECT * FROM orders WHERE id = ?`
    : `SELECT * FROM orders WHERE id = ? AND user_id = ?`;

  const orderParams = isAdmin ? [orderId] : [orderId, userId];

  db.query(orderQuery, orderParams, (err, orderResult) => {
    if (err) return sendServerError(res, err, "Failed to fetch order");

    if (orderResult.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const itemsQuery = `
      SELECT oi.*, p.name, p.image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;

    db.query(itemsQuery, [orderId], (err2, items) => {
      if (err2) return sendServerError(res, err2, "Failed to fetch order items");

      res.json({
        order: orderResult[0],
        items,
      });
    });
  });
};

exports.getAllOrders = (req, res) => {
  const query = `
    SELECT 
      o.*,
      u.name AS customer_name,
      u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) return sendServerError(res, err, "Failed to fetch orders");
    res.json(results);
  });
};

exports.updateOrderStatus = (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const validStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid status",
    });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      return sendServerError(res, connErr, "Failed to acquire database connection");
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return sendServerError(res, err, "Failed to start transaction");
      }

      connection.query(
        `SELECT id, status FROM orders WHERE id = ? FOR UPDATE`,
        [orderId],
        (err, orders) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              sendServerError(res, err, "Failed to fetch order");
            });
          }

          if (!orders.length) {
            return connection.rollback(() => {
              connection.release();
              res.status(404).json({ message: "Order not found" });
            });
          }

          const currentStatus = orders[0].status;
          const isCancelling =
            status === "cancelled" && currentStatus !== "cancelled";
          const isUncancelling =
            currentStatus === "cancelled" && status !== "cancelled";

          const updateOrder = () => {
            connection.query(
              `UPDATE orders SET status = ? WHERE id = ?`,
              [status, orderId],
              (err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    sendServerError(res, err, "Failed to update order status");
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
                  res.json({
                    message: "Order status updated successfully",
                  });
                });
              }
            );
          };

          if (!isCancelling && !isUncancelling) {
            return updateOrder();
          }

          const itemsQuery = `
            SELECT product_id, quantity
            FROM order_items
            WHERE order_id = ?
          `;

          connection.query(itemsQuery, [orderId], (err, items) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                sendServerError(res, err, "Failed to fetch order items");
              });
            }

            let i = 0;

            const adjustStock = () => {
              if (i >= items.length) {
                return updateOrder();
              }

              const item = items[i];
              const stockSql = isCancelling
                ? `UPDATE products SET stock = stock + ? WHERE id = ?`
                : `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`;

              const stockParams = isCancelling
                ? [item.quantity, item.product_id]
                : [item.quantity, item.product_id, item.quantity];

              connection.query(stockSql, stockParams, (err, result) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    sendServerError(res, err, "Stock adjustment failed");
                  });
                }

                if (!isCancelling && result.affectedRows !== 1) {
                  return connection.rollback(() => {
                    connection.release();
                    res.status(400).json({
                      message: `Insufficient stock to reactivate order for product ${item.product_id}`,
                    });
                  });
                }

                i++;
                adjustStock();
              });
            };

            adjustStock();
          });
        }
      );
    });
  });
};

exports.filterOrdersByStatus = (req, res) => {
  const { status } = req.query;

  const query = `
    SELECT * FROM orders
    WHERE status = ?
    ORDER BY created_at DESC
  `;

  db.query(query, [status], (err, results) => {
    if (err) return sendServerError(res, err, "Failed to filter orders");
    res.json(results);
  });
};
