const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");

// CREATE ORDER (CHECKOUT)
router.post("/", protect, orderController.createOrder);

// GET USER ORDERS
router.get("/", protect, orderController.getUserOrders);

// GET ORDER DETAILS
router.get("/:id", protect, orderController.getOrderDetails);

module.exports = router;