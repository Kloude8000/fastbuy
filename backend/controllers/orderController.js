const db = require("../config/db");

// CREATE ORDER (CHECKOUT)
exports.createOrder = (req, res) => {
  const userId = req.user.id;

  const cartQuery = `
    SELECT c.product_id, c.quantity, p.price, p.stock
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(cartQuery, [userId], (err, cartItems) => {
    if (err) return res.status(500).json(err);

    if (cartItems.length === 0) {
      return res.status(400).json({
        message: "Cart is empty"
      });
    }

    // Validate stock
    for (let item of cartItems) {
      if (item.quantity > item.stock) {
        return res.status(400).json({
          message: `Insufficient stock for product ID ${item.product_id}`
        });
      }
    }

    let total = 0;

    cartItems.forEach(item => {
      total += item.price * item.quantity;
    });

    // Create order
    const orderQuery = `
      INSERT INTO orders (user_id, total_price)
      VALUES (?, ?)
    `;

    db.query(orderQuery, [userId, total], (err, orderResult) => {
      if (err) return res.status(500).json(err);

      const orderId = orderResult.insertId;

      // Insert order items
      const orderItemsQuery = `
        INSERT INTO order_items
        (order_id, product_id, quantity, price)
        VALUES ?
      `;

      const values = cartItems.map(item => [
        orderId,
        item.product_id,
        item.quantity,
        item.price
      ]);

      db.query(orderItemsQuery, [values], (err2) => {
        if (err2) return res.status(500).json(err2);

        // Update stock
        cartItems.forEach(item => {
          const stockQuery = `
            UPDATE products
            SET stock = stock - ?
            WHERE id = ?
          `;

          db.query(stockQuery, [
            item.quantity,
            item.product_id
          ]);
        });

        // Clear cart
        const clearCartQuery =
          "DELETE FROM cart WHERE user_id = ?";

        db.query(clearCartQuery, [userId]);

        res.status(201).json({
          message: "Order placed successfully",
          orderId,
          total
        });
      });
    });
  });
};

// GET USER ORDERS
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
    if (err) return res.status(500).json(err);

    res.json(results);
  });
};

// GET ORDER DETAILS
exports.getOrderDetails = (req, res) => {
  const orderId = req.params.id;

  const orderQuery = `
    SELECT * FROM orders WHERE id = ?
  `;

  db.query(orderQuery, [orderId], (err, orderResult) => {
    if (err) return res.status(500).json(err);

    if (orderResult.length === 0) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    const itemsQuery = `
      SELECT oi.*, p.name, p.image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;

    db.query(itemsQuery, [orderId], (err2, items) => {
      if (err2) return res.status(500).json(err2);

      res.json({
        order: orderResult[0],
        items
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
    if (err) return res.status(500).json(err);

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
    "cancelled"
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid status"
    });
  }

  const query = `
    UPDATE orders
    SET status = ?
    WHERE id = ?
  `;

  db.query(query, [status, orderId], (err) => {
    if (err) return res.status(500).json(err);

    res.json({
      message: "Order status updated successfully"
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
    if (err) return res.status(500).json(err);

    res.json(results);
  });
};