const db = require("../config/db");
const bcrypt = require("bcryptjs");

exports.getProfile = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT id, name, email, role, created_at
    FROM users
    WHERE id = ?
  `;

  db.query(query, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result[0]);
  });
};

exports.updateProfile = (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body;

  const query = `
    UPDATE users
    SET name = ?, email = ?
    WHERE id = ?
  `;

  db.query(query, [name, email, userId], (err) => {
    if (err) return res.status(500).json(err);

    res.json({
      message: "Profile updated successfully"
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
    if (err) return res.status(500).json(err);

    const user = result[0];

    bcrypt.compare(oldPassword, user.password, (err2, isMatch) => {
      if (!isMatch) {
        return res.status(400).json({
          message: "Old password is incorrect"
        });
      }

      const hashedPassword = bcrypt.hashSync(newPassword, 10);

      const updateQuery = `
        UPDATE users
        SET password = ?
        WHERE id = ?
      `;

      db.query(updateQuery, [hashedPassword, userId], (err3) => {
        if (err3) return res.status(500).json(err3);

        res.json({
          message: "Password changed successfully"
        });
      });
    });
  });
};