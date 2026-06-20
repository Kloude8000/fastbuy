const express = require("express");
const router = express.Router();

const checkoutController =
  require("../controllers/checkoutController");

const { protect } =
  require("../middlewares/authMiddleware");

router.post("/", protect, checkoutController.checkout);

module.exports = router;