const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { sendServerError } = require("../middlewares/errorMiddleware");

exports.getProfile = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT id, name, email, role, created_at
    FROM users
    WHERE id = ?
  `;

  db.query(query, [userId], (err, result) => {
    if (err) return sendServerError(res, err, "Failed to fetch profile");
    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result[0]);
  });
};

exports.updateProfile = (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body;

  const checkEmailQuery =
    "SELECT id FROM users WHERE email = ? AND id != ?";

  db.query(checkEmailQuery, [email, userId], (err, existing) => {
    if (err) return sendServerError(res, err, "Failed to update profile");

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Email is already in use by another account",
      });
    }

    const query = `
      UPDATE users
      SET name = ?, email = ?
      WHERE id = ?
    `;

    db.query(query, [name, email, userId], (err2) => {
      if (err2) return sendServerError(res, err2, "Failed to update profile");

      res.json({
        message: "Profile updated successfully",
      });
    });
  });
};

exports.changePassword = (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  const getUserQuery = `
    SELECT password FROM users WHERE id = ?
  `;

  db.query(getUserQuery, [userId], (err, result) => {
    if (err) return sendServerError(res, err, "Failed to change password");

    if (!result.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result[0];

    bcrypt.compare(oldPassword, user.password, (err2, isMatch) => {
      if (err2) return sendServerError(res, err2, "Failed to change password");

      if (!isMatch) {
        return res.status(400).json({
          message: "Old password is incorrect",
        });
      }

      bcrypt.hash(newPassword, 10, (err3, hashedPassword) => {
        if (err3) {
          return sendServerError(res, err3, "Failed to change password");
        }

        const updateQuery = `
          UPDATE users
          SET password = ?
          WHERE id = ?
        `;

        db.query(updateQuery, [hashedPassword, userId], (err4) => {
          if (err4) {
            return sendServerError(res, err4, "Failed to change password");
          }

          res.json({
            message: "Password changed successfully",
          });
        });
      });
    });
  });
};
