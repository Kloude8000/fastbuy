const express = require("express");
const router = express.Router();

const reviewController = require("../controllers/reviewController");
const { protect } = require("../middlewares/authMiddleware");

const {
  reviewValidation
} = require("../validators/reviewValidator");

const {
  validate
} = require("../middlewares/validationMiddleware");


// CREATE
router.post(
  "/",
  protect,
  reviewValidation,
  validate,
  reviewController.createReview
);


// UPDATE
router.put(
  "/:id",
  protect,
  reviewValidation,
  validate,
  reviewController.updateReview
);


// DELETE
router.delete("/:id", protect, reviewController.deleteReview);


// GET REVIEWS
router.get("/product/:productId", reviewController.getProductReviews);


// GET SUMMARY
router.get("/summary/:productId", reviewController.getReviewSummary);


module.exports = router;