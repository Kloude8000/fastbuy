const db = require("../config/db");
const { sendServerError } = require("../middlewares/errorMiddleware");

exports.createCategory = (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      message: "Category name is required",
    });
  }

  const query = "INSERT INTO categories (name) VALUES (?)";

  db.query(query, [name], (err, result) => {
    if (err) return sendServerError(res, err, "Failed to create category");

    res.status(201).json({
      message: "Category created successfully",
      categoryId: result.insertId,
    });
  });
};

exports.getCategories = (req, res) => {
  const query = "SELECT * FROM categories ORDER BY name";

  db.query(query, (err, results) => {
    if (err) return sendServerError(res, err, "Failed to fetch categories");
    res.json(results);
  });
};

exports.getCategoryById = (req, res) => {
  const query = "SELECT * FROM categories WHERE id = ?";

  db.query(query, [req.params.id], (err, results) => {
    if (err) return sendServerError(res, err, "Failed to fetch category");

    if (results.length === 0) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    res.json(results[0]);
  });
};

exports.updateCategory = (req, res) => {
  const { name } = req.body;

  const query = "UPDATE categories SET name = ? WHERE id = ?";

  db.query(query, [name, req.params.id], (err) => {
    if (err) return sendServerError(res, err, "Failed to update category");

    res.json({
      message: "Category updated successfully",
    });
  });
};

exports.deleteCategory = (req, res) => {
  const query = "DELETE FROM categories WHERE id = ?";

  db.query(query, [req.params.id], (err) => {
    if (err) return sendServerError(res, err, "Failed to delete category");

    res.json({
      message: "Category deleted successfully",
    });
  });
};
