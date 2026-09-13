const crypto = require("crypto");
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const { sendEmail } = require("../utils/emailService");
const { sendServerError } = require("../middlewares/errorMiddleware");


// REGISTER
exports.register = (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const checkUserQuery = "SELECT * FROM users WHERE email = ?";

  db.query(checkUserQuery, [email], async (err, result) => {
    if (err) return sendServerError(res, err, "Registration failed");

    if (result.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery =
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    db.query(insertQuery, [name, email, hashedPassword], (err, data) => {
      if (err) return sendServerError(res, err, "Registration failed");

      const newUser = {
        id: data.insertId,
        name,
        email,
        role: "customer",
      };

      const token = generateToken(newUser);

      // Optionally send welcome email here using sendEmail()
      sendEmail(
        email,
        "Welcome to FastBuy",
        `
          <h1>Welcome ${name}</h1>
          <p>Your account has been created successfully.</p>
        `
      );

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: newUser,
      });
    });
  });
};

// LOGIN
exports.login = (req, res) => {
  const { email, password } = req.body;

  const query = "SELECT * FROM users WHERE email = ?";

  db.query(query, [email], async (err, result) => {
    if (err) return sendServerError(res, err, "Registration failed");

    if (result.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });
};

exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  const query = "SELECT * FROM users WHERE email = ?";

  db.query(query, [email], (err, users) => {
    if (err) {
      return sendServerError(res, err, "Server error");
    }

    if (!users.length) {
      return res.json({
        success: true,
        message: "If an account exists for this email, a reset link has been sent",
      });
    }

    const user = users[0];

    const resetToken = crypto.randomBytes(32).toString("hex");

    const expiry = new Date(Date.now() + 1000 * 60 * 15); // 15 min

    const updateQuery = `
      UPDATE users
      SET reset_token = ?, reset_token_expiry = ?
      WHERE id = ?
    `;

    db.query(updateQuery, [resetToken, expiry, user.id], (err) => {
      if (err) {
        return sendServerError(res, err, "Failed to generate reset token");
      }

      sendEmail(
        email,
        "FastBuy Password Reset",
        `
          <h1>Password Reset Request</h1>
          <p>Use this token to reset your password:</p>
          <h3>${resetToken}</h3>
          <p>This token expires in 15 minutes.</p>
        `
      );

      // Token is emailed; do not return it in the API response
      res.json({
        success: true,
        message: "If an account exists for this email, a reset link has been sent",
      });
    });
  });
};

exports.resetPassword = (req, res) => {
  const { token, newPassword } = req.body;

  const query = `
    SELECT * FROM users
    WHERE reset_token = ?
    AND reset_token_expiry > NOW()
  `;

  db.query(query, [token], (err, users) => {
    if (err) {
      return sendServerError(res, err, "Server error");
    }

    if (!users.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = users[0];

    bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        return sendServerError(res, hashErr, "Failed to reset password");
      }

      const updateQuery = `
        UPDATE users
        SET password = ?, reset_token = NULL, reset_token_expiry = NULL
        WHERE id = ?
      `;

      db.query(updateQuery, [hashedPassword, user.id], (err) => {
        if (err) {
          return sendServerError(res, err, "Failed to reset password");
        }

        res.json({
          success: true,
          message: "Password reset successful",
        });
      });
    });
  });
};