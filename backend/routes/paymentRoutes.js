const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/paystack/config", paymentController.getPaystackConfig);
router.post("/paystack/initialize", protect, paymentController.initializePaystack);
router.get("/paystack/verify/:reference", protect, paymentController.verifyPaystack);

module.exports = router;
