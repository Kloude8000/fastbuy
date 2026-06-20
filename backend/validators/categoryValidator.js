const { body } = require("express-validator");

exports.categoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
];