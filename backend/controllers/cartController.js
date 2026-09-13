const db = require("../config/db");
const { sendServerError } = require("../middlewares/errorMiddleware");

const parseQuantity = (quantity) => {
  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) {
    return null;
  }
  return qty;
};

exports.addToCart = (req, res) => {
  const userId = req.user.id;
  const { product_id } = req.body;
  const quantity = parseQuantity(req.body.quantity) ?? 1;

  if (!product_id) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  if (quantity === null) {
    return res.status(400).json({ message: "Quantity must be at least 1" });
  }

  db.query(
    `SELECT id, stock, name FROM products WHERE id = ?`,
    [product_id],
    (err, products) => {
      if (err) return sendServerError(res, err, "Failed to fetch product");

      if (!products.length) {
        return res.status(404).json({ message: "Product not found" });
      }

      const product = products[0];

      db.query(
        `SELECT * FROM cart WHERE user_id = ? AND product_id = ?`,
        [userId, product_id],
        (err, existing) => {
          if (err) return sendServerError(res, err, "Failed to check cart");

          const newQuantity = existing.length
            ? existing[0].quantity + quantity
            : quantity;

          if (newQuantity > product.stock) {
            return res.status(400).json({
              message: `Only ${product.stock} units available for ${product.name}`,
            });
          }

          if (existing.length > 0) {
            db.query(
              `UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?`,
              [newQuantity, userId, product_id],
              (err2) => {
                if (err2) return sendServerError(res, err2, "Failed to update cart");
                res.json({ message: "Cart updated successfully" });
              }
            );
          } else {
            db.query(
              `INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)`,
              [userId, product_id, quantity],
              (err3) => {
                if (err3) return sendServerError(res, err3, "Failed to add to cart");
                res.status(201).json({ message: "Item added to cart" });
              }
            );
          }
        }
      );
    }
  );
};

exports.getCart = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT 
      c.id AS cart_id,
      c.quantity,
      p.id,
      p.name,
      p.price,
      p.image,
      p.stock,
      (c.quantity * p.price) AS total
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return sendServerError(res, err, "Failed to fetch cart");

    let grandTotal = 0;
    results.forEach((item) => {
      grandTotal += Number(item.total);
    });

    res.json({
      items: results,
      grandTotal,
    });
  });
};

exports.updateCart = (req, res) => {
  const userId = req.user.id;
  const cartId = req.params.id;
  const quantity = parseQuantity(req.body.quantity);

  if (quantity === null) {
    return res.status(400).json({ message: "Quantity must be at least 1" });
  }

  const lookupQuery = `
    SELECT c.id, p.stock, p.name
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.id = ? AND c.user_id = ?
  `;

  db.query(lookupQuery, [cartId, userId], (err, rows) => {
    if (err) return sendServerError(res, err, "Failed to fetch cart item");

    if (!rows.length) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    const item = rows[0];

    if (quantity > item.stock) {
      return res.status(400).json({
        message: `Only ${item.stock} units available for ${item.name}`,
      });
    }

    db.query(
      `UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?`,
      [quantity, cartId, userId],
      (err) => {
        if (err) return sendServerError(res, err, "Failed to update cart");
        res.json({ message: "Cart updated" });
      }
    );
  });
};

exports.removeFromCart = (req, res) => {
  const userId = req.user.id;
  const cartId = req.params.id;

  db.query(
    `DELETE FROM cart WHERE id = ? AND user_id = ?`,
    [cartId, userId],
    (err, result) => {
      if (err) return sendServerError(res, err, "Failed to remove cart item");

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json({ message: "Item removed from cart" });
    }
  );
};
