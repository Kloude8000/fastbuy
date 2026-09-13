const { validationResult } = require("express-validator");
const { sendEmail } = require("../utils/emailService");

exports.submitContact = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, message } = req.body;
  const recipient = process.env.CONTACT_EMAIL || process.env.EMAIL_USER;

  if (!recipient) {
    return res.status(503).json({
      message:
        "Contact form is temporarily unavailable. Please email us directly.",
    });
  }

  const html = `
    <h2>New FastBuy contact message</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

  const sent = await sendEmail(
    recipient,
    `FastBuy contact from ${name}`,
    html
  );

  if (!sent) {
    return res.status(503).json({
      message:
        "We could not send your message right now. Please try again later or email us directly.",
    });
  }

  res.json({
    message: "Thanks for reaching out! We will reply within one business day.",
  });
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
