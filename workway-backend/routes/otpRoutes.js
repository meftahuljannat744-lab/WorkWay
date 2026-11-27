
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const db = require("../config/database");
const { sendVerificationOtp } = require("../config/emailService");
const { otpLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// POST: Verify Email OTP
router.post("/verify-email", otpLimiter, async (req, res) => {
  const { email, otp } = req.body || {};

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "A valid email address is required."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address."
    });
  }

  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "OTP must be 6 digits."
    });
  }

  let connection;
  let transactionStarted = false;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [otpRows] = await connection.execute(
      `SELECT
         ov.id,
         ov.user_id,
         ov.otp_hash,
         ov.attempts,
         ov.expires_at,
         u.account_status,
         u.email_verified_at
       FROM otp_verifications ov
       LEFT JOIN users u ON u.id = ov.user_id
       WHERE ov.destination = ?
         AND ov.purpose = 'VERIFY_EMAIL'
         AND ov.verified_at IS NULL
       ORDER BY ov.created_at DESC, ov.id DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (otpRows.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "No pending OTP found. Please request a new OTP."
      });
    }

    const otpRecord = otpRows[0];

    if (!otpRecord.user_id || !otpRecord.account_status) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Associated user account was not found."
      });
    }

    if (
      otpRecord.account_status === "SUSPENDED" ||
      otpRecord.account_status === "DELETED"
    ) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        message: "This account is not allowed to be activated."
      });
    }

    if (
      otpRecord.account_status === "ACTIVE" &&
      otpRecord.email_verified_at
    ) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(200).json({
        success: true,
        message: "Email is already verified. You can log in."
      });
    }

    if (otpRecord.attempts >= 5) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Request a new OTP."
      });
    }

    if (new Date(otpRecord.expires_at).getTime() <= Date.now()) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP."
      });
    }

    const isValidOtp = await bcrypt.compare(
      otp,
      otpRecord.otp_hash
    );

    if (!isValidOtp) {
      await connection.execute(
        `UPDATE otp_verifications
         SET attempts = attempts + 1
         WHERE id = ?`,
        [otpRecord.id]
      );

      await connection.commit();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Invalid OTP."
      });
    }

    // Mark OTP as verified
    await connection.execute(
      `UPDATE otp_verifications
       SET verified_at = NOW()
       WHERE id = ?`,
      [otpRecord.id]
    );

    // Verify email and activate pending account
    await connection.execute(
      `UPDATE users
       SET
         email_verified_at = COALESCE(email_verified_at, NOW()),
         account_status = CASE
           WHEN account_status = 'PENDING' THEN 'ACTIVE'
           ELSE account_status
         END
       WHERE id = ?`,
      [otpRecord.user_id]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Your account is now active. You can log in."
    });

  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Transaction rollback error:", rollbackError.message);
      }
    }

    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "OTP verification failed."
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});


// POST: Resend Email OTP
router.post("/resend", otpLimiter, async (req, res) => {
  const { email } = req.body || {};

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "A valid email address is required."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

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

    const [users] = await connection.execute(
      `SELECT id, account_status, email_verified_at
       FROM users
       WHERE email = ?
         AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Unable to process OTP request."
      });
    }

    const user = users[0];

    if (
      user.account_status !== "PENDING" ||
      user.email_verified_at
    ) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "This account does not require email verification."
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    await connection.execute(
      `UPDATE otp_verifications
       SET verified_at = NOW()
       WHERE user_id = ?
         AND purpose = 'VERIFY_EMAIL'
         AND verified_at IS NULL`,
      [user.id]
    );

    await connection.execute(
      `INSERT INTO otp_verifications
       (user_id, destination, purpose, otp_hash, expires_at)
       VALUES (?, ?, 'VERIFY_EMAIL', ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [user.id, normalizedEmail, otpHash]
    );

    await connection.commit();
    transactionStarted = false;

    try {
      await sendVerificationOtp(normalizedEmail, otp);
    } catch (emailError) {
      console.error("Resend OTP email error:", emailError.message);

      return res.status(503).json({
        success: false,
        message: "OTP could not be sent to your email. Please try again."
      });
    }

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email."
    });

  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Resend OTP rollback error:", rollbackError.message);
      }
    }

    console.error("Resend OTP error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to resend OTP. Please try again."
    });

  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
