const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../validators/authValidator");

const { validate } = require("../middlewares/validationMiddleware");

const {
  authLimiter,
  loginLimiter,
  passwordResetLimiter,
} = require("../middlewares/rateLimitMiddleware");

router.post(
  "/register",
  authLimiter,
  registerValidation,
  validate,
  authController.register
);

router.post(
  "/login",
  loginLimiter,
  loginValidation,
  validate,
  authController.login
);

router.post(
  "/forgot-password",
  passwordResetLimiter,
  forgotPasswordValidation,
  validate,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  resetPasswordValidation,
  validate,
  authController.resetPassword
);

module.exports = router;
