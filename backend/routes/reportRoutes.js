const express = require("express");
const router = express.Router();

const reportController =
  require("../controllers/reportController");

const {
  protect,
  adminOnly
} = require("../middlewares/authMiddleware");

router.get(
  "/revenue",
  protect,
  adminOnly,
  reportController.getRevenueReport
);

router.get(
  "/products",
  protect,
  adminOnly,
  reportController.getTopProductsReport
);

router.get(
  "/customers",
  protect,
  adminOnly,
  reportController.getTopCustomersReport
);

router.get(
  "/inventory",
  protect,
  adminOnly,
  reportController.getInventoryReport
);

router.get(
  "/orders",
  protect,
  adminOnly,
  reportController.getOrdersReport
);

module.exports = router;