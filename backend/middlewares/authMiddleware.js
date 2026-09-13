const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { sendServerError } = require("./errorMiddleware");

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token, access denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: "No token, access denied" });
  }

  db.query(
    "SELECT role FROM users WHERE id = ?",
    [req.user.id],
    (err, rows) => {
      if (err) {
        return sendServerError(res, err, "Authorization check failed");
      }

      if (!rows.length || rows[0].role !== "admin") {
        return res.status(403).json({ message: "Admin access only" });
      }

      req.user.role = rows[0].role;
      next();
    }
  );
};

module.exports = { protect, adminOnly };
