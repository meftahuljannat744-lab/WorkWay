
const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/database");

const router = express.Router();

// POST: Verify Email OTP
router.post("/verify-email", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required."
    });
  }

  if (!/^\d{6}$/.test(String(otp))) {
    return res.status(400).json({
      success: false,
      message: "OTP must be 6 digits."
    });
  }

  let connection;
  let transactionStarted = false;

  try {
    const normalizedEmail = email.trim().toLowerCase();

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

    if (otpRecord.account_status === "ACTIVE" &&
        otpRecord.email_verified_at) {
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
      String(otp),
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

module.exports = router;
