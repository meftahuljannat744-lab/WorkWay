
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const profileRoutes = require("./routes/profileRoutes");

console.log("AUTH ROUTE FILE:", require.resolve("./routes/authRoutes"));

const app = express();

app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "WorkWay Backend is running"
  });
});

// Database test route
app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DATABASE() AS databaseName, VERSION() AS version"
    );

    res.json({
      success: true,
      message: "Database connected successfully",
      database: rows[0].databaseName,
      version: rows[0].version
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

// Authentication routes
app.use("/api/auth", authRoutes);

// OTP verification routes
app.use("/api/otp", otpRoutes);

// User Profile routes
app.use("/api", profileRoutes);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`WorkWay Backend running at http://localhost:${PORT}`);
});
