const db = require("../config/db");

// CREATE CATEGORY
exports.createCategory = (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      message: "Category name is required"
    });
  }

  const query =
    "INSERT INTO categories (name) VALUES (?)";

  db.query(query, [name], (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.status(201).json({
      message: "Category created successfully",
      categoryId: result.insertId
    });
  });
};

// GET ALL CATEGORIES
exports.getCategories = (req, res) => {
  const query =
    "SELECT * FROM categories ORDER BY name";

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
  });
};

// GET SINGLE CATEGORY
exports.getCategoryById = (req, res) => {
  const query =
    "SELECT * FROM categories WHERE id = ?";

  db.query(query, [req.params.id], (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Category not found"
      });
    }

    res.json(results[0]);
  });
};

// UPDATE CATEGORY
exports.updateCategory = (req, res) => {
  const { name } = req.body;

  const query =
    "UPDATE categories SET name = ? WHERE id = ?";

  db.query(
    query,
    [name, req.params.id],
    (err, result) => {
      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        message: "Category updated successfully"
      });
    }
  );
};

// DELETE CATEGORY
exports.deleteCategory = (req, res) => {
  const query =
    "DELETE FROM categories WHERE id = ?";

  db.query(query, [req.params.id], (err) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json({
      message: "Category deleted successfully"
    });
  });
};