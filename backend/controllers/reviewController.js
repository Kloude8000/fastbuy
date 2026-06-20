const db = require("../config/db");

exports.createReview = (req, res) => {
  const userId = req.user.id;
  const { product_id, rating, comment } = req.body;

  const checkQuery = `
    SELECT * FROM reviews
    WHERE user_id = ? AND product_id = ?
  `;

  db.query(checkQuery, [userId, product_id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length > 0) {
      return res.status(400).json({
        message: "You have already reviewed this product"
      });
    }

    const insertQuery = `
      INSERT INTO reviews (user_id, product_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `;

    db.query(insertQuery, [userId, product_id, rating, comment], (err2) => {
      if (err2) return res.status(500).json(err2);

      res.status(201).json({
        message: "Review created successfully"
      });
    });
  });
};


exports.updateReview = (req, res) => {
  const userId = req.user.id;
  const reviewId = req.params.id;
  const { rating, comment } = req.body;

  const query = `
    UPDATE reviews
    SET rating = ?, comment = ?
    WHERE id = ? AND user_id = ?
  `;

  db.query(query, [rating, comment, reviewId, userId], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Review not found or not yours"
      });
    }

    res.json({
      message: "Review updated successfully"
    });
  });
};


exports.deleteReview = (req, res) => {
  const userId = req.user.id;
  const reviewId = req.params.id;

  const query = `
    DELETE FROM reviews
    WHERE id = ? AND user_id = ?
  `;

  db.query(query, [reviewId, userId], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Review not found or not yours"
      });
    }

    res.json({
      message: "Review deleted successfully"
    });
  });
};


exports.getProductReviews = (req, res) => {
  const productId = req.params.productId;

  const query = `
    SELECT
      r.id,
      r.rating,
      r.comment,
      r.created_at,
      u.name
    FROM reviews r
    JOIN users u
      ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(query, [productId], (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
  });
};


exports.getReviewSummary = (req, res) => {
  const productId = req.params.productId;

  const query = `
    SELECT
      AVG(rating) AS averageRating,
      COUNT(*) AS totalReviews
    FROM reviews
    WHERE product_id = ?
  `;

  db.query(query, [productId], (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json({
      averageRating:
        Number(results[0].averageRating || 0).toFixed(1),
      totalReviews:
        results[0].totalReviews
    });
  });
};