const express = require("express");
const router = express.Router();
const { submitContact } = require("../controllers/contactController");
const { contactValidation } = require("../validators/contactValidator");
const { contactLimiter } = require("../middlewares/rateLimitMiddleware");

router.post("/", contactLimiter, contactValidation, submitContact);

module.exports = router;
