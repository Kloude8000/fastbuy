const db = require("../config/db");

// ADD TO CART
exports.addToCart = (req, res) => {
  const userId = req.user.id;
  const { product_id, quantity } = req.body;

  // Check if item already exists in cart
  const checkQuery =
    "SELECT * FROM cart WHERE user_id = ? AND product_id = ?";

  db.query(checkQuery, [userId, product_id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length > 0) {
      // Update quantity
      const updateQuery =
        "UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?";

      db.query(
        updateQuery,
        [quantity, userId, product_id],
        (err2) => {
          if (err2) return res.status(500).json(err2);

          return res.json({
            message: "Cart updated successfully"
          });
        }
      );
    } else {
      // Insert new item
      const insertQuery =
        "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)";

      db.query(
        insertQuery,
        [userId, product_id, quantity],
        (err3) => {
          if (err3) return res.status(500).json(err3);

          res.status(201).json({
            message: "Item added to cart"
          });
        }
      );
    }
  });
};

// GET CART
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
      (c.quantity * p.price) AS total
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json(err);

    let grandTotal = 0;

    results.forEach(item => {
      grandTotal += item.total;
    });

    res.json({
      items: results,
      grandTotal
    });
  });
};

// UPDATE QUANTITY
exports.updateCart = (req, res) => {
  const userId = req.user.id;
  const { quantity } = req.body;
  const cartId = req.params.id;

  const query =
    "UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?";

  db.query(query, [quantity, cartId, userId], (err) => {
    if (err) return res.status(500).json(err);

    res.json({
      message: "Cart updated"
    });
  });
};

// REMOVE ITEM
exports.removeFromCart = (req, res) => {
  const userId = req.user.id;
  const cartId = req.params.id;

  const query =
    "DELETE FROM cart WHERE id = ? AND user_id = ?";

  db.query(query, [cartId, userId], (err) => {
    if (err) return res.status(500).json(err);

    res.json({
      message: "Item removed from cart"
    });
  });
};