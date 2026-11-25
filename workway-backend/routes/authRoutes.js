
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("../config/database");
const authMiddleware = require('../middleware/authMiddleware');

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

// POST: User Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  let connection;

  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured."
      });
    }

    connection = await db.getConnection();

    const [users] = await connection.execute(
      `SELECT id, full_name, email, mobile, password_hash,
              role, account_status, email_verified_at
       FROM users
       WHERE email = ? AND deleted_at IS NULL
       LIMIT 1`,
      [normalizedEmail]
    );

    if (users.length === 0 || !users[0].password_hash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const user = users[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    if (!user.email_verified_at) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email first."
      });
    }

    if (user.account_status === "PENDING") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_PENDING",
        message: "Your account is awaiting admin approval."
      });
    }

    if (user.account_status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "This account is not currently active."
      });
    }

    const crypto = require("crypto");
    const jwt = require("jsonwebtoken");

    const sessionId = crypto.randomUUID();

    const token = jwt.sign(
      {
        sub: String(user.id),
        role: user.role,
        sid: sessionId
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
        issuer: "workway-api",
        audience: "workway-client"
      }
    );

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO user_sessions
       (user_id, token_hash, device_name, ip_address,
        user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        tokenHash,
        (req.get("x-device-name") || "").slice(0, 150) || null,
        req.ip || null,
        (req.get("user-agent") || "").slice(0, 500) || null,
        expiresAt
      ]
    );

    await connection.execute(
      "UPDATE users SET last_login_at = NOW() WHERE id = ?",
      [user.id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }

    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again."
    });

  } finally {
    if (connection) connection.release();
  }
});
// Protected Profile Route
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, full_name, email, mobile, role, account_status FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error.'
        });
    }
});
module.exports = router;
