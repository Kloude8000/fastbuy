const express = require("express");
const router = express.Router();

const categoryController =
  require("../controllers/categoryController");

const {
  protect,
  adminOnly
} = require("../middlewares/authMiddleware");

const {
  categoryValidation
} = require("../validators/categoryValidator");

const {
  validate
} = require("../middlewares/validationMiddleware");

// PUBLIC ROUTES
router.get("/", categoryController.getCategories);

router.get(
  "/:id",
  categoryController.getCategoryById
);

// ADMIN ROUTES
router.post(
  "/",
  protect,
  adminOnly,
  categoryValidation,
  validate,
  categoryController.createCategory
);

router.put(
  "/:id",
  protect,
  adminOnly,
  categoryValidation,
  validate,
  categoryController.updateCategory
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  categoryController.deleteCategory
);

module.exports = router;