const db = require("../config/db");

exports.getRevenueReport = (req, res) => {
  const query = `
    SELECT
      COUNT(*) AS totalOrders,
      IFNULL(SUM(total_price), 0) AS totalRevenue,
      IFNULL(AVG(total_price), 0) AS averageOrderValue
    FROM orders
    WHERE status != 'cancelled'
  `;

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(result[0]);
  });
};

exports.getTopProductsReport = (req, res) => {
  const query = `
    SELECT
      p.id,
      p.name,
      SUM(oi.quantity) AS unitsSold,
      SUM(oi.quantity * oi.price) AS revenue
    FROM order_items oi
    JOIN products p
      ON oi.product_id = p.id
    GROUP BY p.id
    ORDER BY unitsSold DESC
    LIMIT 10
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
  });
};

exports.getTopCustomersReport = (req, res) => {
  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      COUNT(o.id) AS totalOrders,
      SUM(o.total_price) AS totalSpent
    FROM users u
    JOIN orders o
      ON u.id = o.user_id
    WHERE o.status != 'cancelled'
    GROUP BY u.id
    ORDER BY totalSpent DESC
    LIMIT 10
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
  });
};

exports.getInventoryReport = (req, res) => {
  const query = `
    SELECT
      id,
      name,
      stock,
      price
    FROM products
    ORDER BY stock ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
  });
};

exports.getOrdersReport = (req, res) => {
  const query = `
    SELECT
      status,
      COUNT(*) AS total
    FROM orders
    GROUP BY status
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
  });
};