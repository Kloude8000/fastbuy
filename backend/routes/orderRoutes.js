const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const checkoutController = require("../controllers/checkoutController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, checkoutController.checkout);

router.get("/", protect, orderController.getUserOrders);

router.get("/:id", protect, orderController.getOrderDetails);

module.exports = router;
