
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const profileRoutes = require("./routes/profileRoutes");

console.log("AUTH ROUTE FILE:", require.resolve("./routes/authRoutes"));
console.log("PROFILE ROUTE FILE:", require.resolve("./routes/profileRoutes"));

// Check whether the skills catalog route is registered
console.log("PROFILE ROUTES IMPORTED SUCCESSFULLY");

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// HOME ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "WorkWay Backend is running"
  });
});


// ==========================================
// DATABASE TEST ROUTE
// ==========================================

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


// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.use("/api/auth", authRoutes);


// ==========================================
// OTP VERIFICATION ROUTES
// ==========================================

app.use("/api/otp", otpRoutes);


// ==========================================
// USER PROFILE ROUTES
// ==========================================

app.use("/api", profileRoutes);


// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
    path: req.originalUrl
  });
});


// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  console.error("Global server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});


// ==========================================
// START SERVER
// ==========================================

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log("-----------------------------------");
    console.log(`WorkWay Backend running at http://localhost:${PORT}`);
    console.log("Database:", process.env.DB_NAME || "Check database config");
    console.log("-----------------------------------");
  });
}

module.exports = app;
