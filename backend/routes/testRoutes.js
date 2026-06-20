const express = require("express");
const router = express.Router();
const { sendEmail } = require("../utils/emailService");

router.get("/test-email", async (req, res) => {
  await sendEmail(
    "yourgmail@gmail.com",
    "FastBuy Email Test",
    "<h1>Email System Working ✅</h1>"
  );

  res.json({ message: "Email sent (check inbox)" });
});

module.exports = router;