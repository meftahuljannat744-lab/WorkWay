
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const db = require("../config/database");
const authMiddleware = require("../middleware/authMiddleware");
const { sendVerificationOtp } = require("../config/emailService");
const { loginLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// ==========================================
// POST: User Registration
// ==========================================
router.post("/register", async (req, res) => {
  const { full_name, email, mobile, password } = req.body || {};

  if (
    typeof full_name !== "string" ||
    typeof email !== "string" ||
    typeof mobile !== "string" ||
    typeof password !== "string" ||
    !full_name.trim() ||
    !email.trim() ||
    !mobile.trim() ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required."
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address."
    });
  }

  let connection;
  let transactionStarted = false;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [existingUsers] = await connection.execute(
      `SELECT id FROM users
       WHERE email = ? OR mobile = ?
       LIMIT 1`,
      [normalizedEmail, normalizedMobile]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message: "Email or mobile number already registered."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

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

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    await connection.execute(
      `INSERT INTO otp_verifications
       (user_id, destination, purpose, otp_hash, expires_at)
       VALUES (?, ?, 'VERIFY_EMAIL', ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [userResult.insertId, normalizedEmail, otpHash]
    );

    
await connection.commit();
transactionStarted = false;

try {
  await sendVerificationOtp(normalizedEmail, otp);
} catch (emailError) {
  console.error("Registration OTP email error:", emailError.message);

  return res.status(503).json({
    success: false,
    message: "Registration completed, but OTP email could not be sent. Please request a new OTP."
  });
}

return res.status(201).json({
  success: true,
  message: "Registration successful. Please check your email for the verification OTP."
});


  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Registration rollback error:", rollbackError.message);
      }
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again."
    });

  } finally {
    if (connection) connection.release();
  }
});


// ==========================================
// POST: User Login
// ==========================================
router.post("/login", loginLimiter, async (req, res) => {
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

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return res.status(500).json({
      success: false,
      message: "Authentication is not configured."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  let connection;
  let transactionStarted = false;

  try {
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

    if (user.account_status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "Your account has been suspended."
      });
    }

    if (
      user.account_status === "DELETED" ||
      user.account_status !== "ACTIVE"
    ) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_NOT_ACTIVE",
        message: "Your account is not currently active."
      });
    }

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
    transactionStarted = true;

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
      `UPDATE users
       SET last_login_at = NOW()
       WHERE id = ?`,
      [user.id]
    );

    await connection.commit();
    transactionStarted = false;

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
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Login rollback error:", rollbackError.message);
      }
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


// ==========================================
// POST: User Logout
// ==========================================
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.slice(7).trim();

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const [result] = await db.execute(
      `UPDATE user_sessions
       SET revoked_at = NOW()
       WHERE token_hash = ?
         AND user_id = ?
         AND revoked_at IS NULL`,
      [tokenHash, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(401).json({
        success: false,
        message: "Session already logged out or invalid."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logout successful."
    });

  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Logout failed. Please try again."
    });
  }
});


// ==========================================
// GET: Protected User Profilec
// ==========================================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token."
      });
    }

    const [users] = await db.execute(
      `SELECT id, full_name, email, mobile, role, account_status
       FROM users
       WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (users[0].account_status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "This account is not currently active."
      });
    }

    return res.status(200).json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error("Profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load profile."
    });
  }
});

module.exports = router;
