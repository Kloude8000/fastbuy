const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const path = require("path");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminOrderRoutes = require("./routes/adminOrderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const profileRoutes = require("./routes/profileRoutes");
const reportRoutes = require("./routes/reportRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/test", require("./routes/testRoutes"));

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/checkout", checkoutRoutes);

app.get("/", (req, res) => {
  res.send("FastBuy API is running");
});

module.exports = app;




