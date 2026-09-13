const express = require("express");
const router = express.Router();

const profileController = require("../controllers/profileController");
const { protect } = require("../middlewares/authMiddleware");
const {
  updateProfileValidation,
  changePasswordValidation,
} = require("../validators/profileValidator");
const { validate } = require("../middlewares/validationMiddleware");

router.get("/", protect, profileController.getProfile);

router.put(
  "/",
  protect,
  updateProfileValidation,
  validate,
  profileController.updateProfile
);

router.put(
  "/password",
  protect,
  changePasswordValidation,
  validate,
  profileController.changePassword
);

module.exports = router;
