const { body } = require("express-validator");

exports.productValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required"),

  body("price")
    .isFloat({ min: 0.01 })
    .withMessage("Price must be greater than 0"),

  // ==== ADDED: old_price validation (optional, but if provided must be >= price)
  body("old_price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Old price must be a positive number")
    .custom((value, { req }) => {
      if (value && req.body.price && parseFloat(value) <= parseFloat(req.body.price)) {
        throw new Error("Old price must be greater than current price");
      }
      return true;
    }),

  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock cannot be negative"),

  body("category_id")
    .isInt()
    .withMessage("Valid category required")
];