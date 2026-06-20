const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const {
  protect,
  adminOnly
} = require("../middlewares/authMiddleware");

// ADMIN ONLY ROUTES
router.get(
  "/all",
  protect,
  adminOnly,
  orderController.getAllOrders
);

router.put(
  "/:id/status",
  protect,
  adminOnly,
  orderController.updateOrderStatus
);

router.get(
  "/filter",
  protect,
  adminOnly,
  orderController.filterOrdersByStatus
);

module.exports = router;