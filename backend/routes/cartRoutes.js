const express = require("express");
const router = express.Router();

const cartController = require("../controllers/cartController");

const {
  protect
} = require("../middlewares/authMiddleware");

// ALL CART ROUTES ARE PROTECTED
router.post("/", protect, cartController.addToCart);

router.get("/", protect, cartController.getCart);

router.put("/:id", protect, cartController.updateCart);

router.delete("/:id", protect, cartController.removeFromCart);

module.exports = router;