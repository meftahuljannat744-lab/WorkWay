
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

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const normalizedEmail = email.trim().toLowerCase();

    const [otpRows] = await connection.execute(
      `SELECT id, user_id, otp_hash, attempts, expires_at
       FROM otp_verifications
       WHERE destination = ?
         AND purpose = 'VERIFY_EMAIL'
         AND verified_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (otpRows.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "No pending OTP found. Please register again or request a new OTP."
      });
    }

    const otpRecord = otpRows[0];

    if (otpRecord.attempts >= 5) {
      await connection.rollback();

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Request a new OTP."
      });
    }

    if (new Date(otpRecord.expires_at).getTime() <= Date.now()) {
      await connection.rollback();

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

      return res.status(400).json({
        success: false,
        message: "Invalid OTP."
      });
    }

    await connection.execute(
      `UPDATE otp_verifications
       SET verified_at = NOW()
       WHERE id = ?`,
      [otpRecord.id]
    );

    await connection.execute(
      `UPDATE users
       SET email_verified_at = NOW()
       WHERE id = ?`,
      [otpRecord.user_id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Your account is awaiting admin approval."
    });

  } catch (error) {
    await connection.rollback();

    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "OTP verification failed."
    });

  } finally {
    connection.release();
  }
});

module.exports = router;
