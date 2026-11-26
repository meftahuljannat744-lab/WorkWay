
const express = require("express");
const db = require("../config/database");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require a valid logged-in user.
router.use(authMiddleware);

// GET /api/users/me
// Get authenticated user's basic account information.
router.get("/users/me", async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await db.execute(
      `SELECT id, full_name, email, mobile, role, account_status
       FROM users
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    return res.status(200).json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error("Get current user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user information."
    });
  }
});


// GET /api/profile
// Get authenticated user's profile.
router.get("/profile", async (req, res) => {
  try {
    const userId = req.user.id;

    // Create an empty profile row if one does not exist.
    await db.execute(
      `INSERT IGNORE INTO job_seeker_profiles (user_id)
       VALUES (?)`,
      [userId]
    );

    const [rows] = await db.execute(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.mobile,
         u.role,
         p.date_of_birth,
         p.gender,
         p.profile_photo_path,
         p.professional_title,
         p.career_summary,
         p.current_location_text,
         p.expected_salary_min,
         p.expected_salary_max,
         p.availability,
         p.profile_completion,
         p.updated_at
       FROM users u
       LEFT JOIN job_seeker_profiles p
         ON p.user_id = u.id
       WHERE u.id = ?
         AND u.deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found."
      });
    }

    return res.status(200).json({
      success: true,
      profile: rows[0]
    });

  } catch (error) {
    console.error("Get profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve profile."
    });
  }
});


// PUT /api/profile
// Update authenticated user's personal and professional profile.
router.put("/profile", async (req, res) => {
  const userId = req.user.id;
  const body = req.body || {};

  const allowedFields = {
    date_of_birth: "date_of_birth",
    gender: "gender",
    professional_title: "professional_title",
    career_summary: "career_summary",
    current_location_text: "current_location_text",
    expected_salary_min: "expected_salary_min",
    expected_salary_max: "expected_salary_max",
    availability: "availability"
  };

  const allowedInputKeys = [
    "full_name",
    ...Object.keys(allowedFields)
  ];

  const unknownFields = Object.keys(body).filter(
    (key) => !allowedInputKeys.includes(key)
  );

  if (unknownFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Unsupported profile fields.",
      fields: unknownFields
    });
  }

  if (
    body.full_name !== undefined &&
    (typeof body.full_name !== "string" ||
      !body.full_name.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "Full name must be a non-empty string."
    });
  }

  if (
    body.expected_salary_min !== undefined &&
    body.expected_salary_min !== null &&
    (!Number.isFinite(Number(body.expected_salary_min)) ||
      Number(body.expected_salary_min) < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Minimum expected salary must be a valid non-negative number."
    });
  }

  if (
    body.expected_salary_max !== undefined &&
    body.expected_salary_max !== null &&
    (!Number.isFinite(Number(body.expected_salary_max)) ||
      Number(body.expected_salary_max) < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Maximum expected salary must be a valid non-negative number."
    });
  }

  if (
    body.expected_salary_min != null &&
    body.expected_salary_max != null &&
    Number(body.expected_salary_min) > Number(body.expected_salary_max)
  ) {
    return res.status(400).json({
      success: false,
      message: "Minimum salary cannot exceed maximum salary."
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Ensure the profile exists.
    await connection.execute(
      `INSERT IGNORE INTO job_seeker_profiles (user_id)
       VALUES (?)`,
      [userId]
    );

    // Update full name in the users table.
    if (body.full_name !== undefined) {
      await connection.execute(
        `UPDATE users
         SET full_name = ?, updated_at = NOW()
         WHERE id = ? AND deleted_at IS NULL`,
        [body.full_name.trim(), userId]
      );
    }

    // Update only fields explicitly provided by the user.
    const updates = [];
    const values = [];

    for (const [inputField, columnName] of Object.entries(allowedFields)) {
      if (Object.prototype.hasOwnProperty.call(body, inputField)) {
        updates.push(`${columnName} = ?`);

        const value = body[inputField];

        if (
          inputField.startsWith("expected_salary_") &&
          value !== null
        ) {
          values.push(Number(value));
        } else {
          values.push(
            typeof value === "string" ? value.trim() || null : value
          );
        }
      }
    }

    if (updates.length > 0) {
      updates.push("updated_at = NOW()");

      await connection.execute(
        `UPDATE job_seeker_profiles
         SET ${updates.join(", ")}
         WHERE user_id = ?`,
        [...values, userId]
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully."
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update profile."
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
