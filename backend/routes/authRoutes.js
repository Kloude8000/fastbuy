const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

const {
  registerValidation,
  loginValidation
} = require("../validators/authValidator");

const {
  validate
} = require("../middlewares/validationMiddleware");

router.post(
  "/register",
  registerValidation,
  validate,
  authController.register
);
router.post(
  "/login",
  loginValidation,
  validate,
  authController.login
);

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;