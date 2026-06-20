const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const upload = require("../config/multer");

const {
  productValidation
} = require("../validators/productValidator");

const {
  validate
} = require("../middlewares/validationMiddleware");

// PUBLIC ROUTES
router.get("/", productController.getProducts);

router.get("/catalog/list", productController.listProducts);

router.get(
  "/featured/list",
  productController.getFeaturedProducts
);

router.get("/:id", productController.getProductById);

// ADMIN ROUTES
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("image"),
  productValidation,
  validate,
  productController.createProduct
);

router.put(
  "/:id",
  protect,
  adminOnly,
  productValidation,
  validate,
  productController.updateProduct
);

router.delete("/:id", protect, adminOnly, productController.deleteProduct);

module.exports = router;