
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("../config/database");

const router = express.Router();

// POST: User Registration
router.post("/register", async (req, res) => {
  const { full_name, email, mobile, password } = req.body;

  // Validate required fields
  if (!full_name || !email || !mobile || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required."
    });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters."
    });
  }

  if (
    typeof full_name !== "string" ||
    typeof email !== "string" ||
    typeof mobile !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration information."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile.trim();

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check existing email or mobile
    const [existingUsers] = await connection.execute(
      `SELECT id FROM users
       WHERE email = ? OR mobile = ?
       LIMIT 1`,
      [normalizedEmail, normalizedMobile]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Email or mobile number already registered."
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create USER account
    const [userResult] = await connection.execute(
      `INSERT INTO users
       (full_name, email, mobile, password_hash, role, account_status)
       VALUES (?, ?, ?, ?, 'USER', 'PENDING')`,
      [
        full_name.trim(),
        normalizedEmail,
        normalizedMobile,
        passwordHash
      ]
    );

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Hash OTP
    const otpHash = await bcrypt.hash(otp, 10);

    // Save OTP with 5-minute expiry
    await connection.execute(
      `INSERT INTO otp_verifications
       (user_id, destination, purpose, otp_hash, expires_at)
       VALUES (?, ?, 'VERIFY_EMAIL', ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [userResult.insertId, normalizedEmail, otpHash]
    );

    await connection.commit();

    // Registration response
    const response = {
      success: true,
      message: "Registration successful. Email verification is pending."
    };

    // Show OTP only in development mode
    console.log("CURRENT NODE ENV:", process.env.NODE_ENV);
    if (process.env.NODE_ENV === "development") {
      response.developmentOTP = otp;

      console.log("WorkWay Development OTP:", otp);
    }

    return res.status(201).json(response);

  } catch (error) {
    await connection.rollback();

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again."
    });

  } finally {
    connection.release();
  }
});

module.exports = router;
