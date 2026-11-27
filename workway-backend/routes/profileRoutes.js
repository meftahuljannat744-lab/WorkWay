
const express = require("express");
const db = require("../config/database");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);


// ==========================================
// PROFILE COMPLETION CALCULATOR
// ==========================================

async function refreshProfileCompletion(userId) {
  try {
    const [profileRows] = await db.execute(
      `SELECT
         u.full_name,
         u.mobile,
         p.professional_title,
         p.career_summary,
         p.current_location_text
       FROM users u
       LEFT JOIN job_seeker_profiles p
         ON p.user_id = u.id
       WHERE u.id = ?
         AND u.deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );

    if (profileRows.length === 0) {
      return 0;
    }

    const profile = profileRows[0];

    const personalInfoComplete = [
      profile.full_name,
      profile.mobile,
      profile.professional_title,
      profile.career_summary,
      profile.current_location_text
    ].every(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );

    const [educationRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM educations
       WHERE user_id = ?`,
      [userId]
    );

    const [skillRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM user_skills
       WHERE user_id = ?`,
      [userId]
    );

    const [careerRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM user_career_goals
       WHERE user_id = ?`,
      [userId]
    );

    const completedItems = [
      personalInfoComplete,
      Number(educationRows[0].total) > 0,
      Number(skillRows[0].total) > 0,
      Number(careerRows[0].total) > 0
    ].filter(Boolean).length;

    const completion = Math.round(
      (completedItems / 4) * 100
    );

    await db.execute(
      `INSERT INTO job_seeker_profiles
         (user_id, profile_completion)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         profile_completion = VALUES(profile_completion),
         updated_at = NOW()`,
      [userId, completion]
    );

    console.log(
      `Profile completion for user ${userId}: ${completion}%`
    );

    return completion;

  } catch (error) {
    console.error(
      "Profile completion calculation error:",
      error.message
    );

    throw error;
  }
}


// ==========================================
// CURRENT USER
// ==========================================

router.get("/users/me", async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await db.execute(
      `SELECT
         id,
         full_name,
         email,
         mobile,
         role,
         account_status
       FROM users
       WHERE id = ?
         AND deleted_at IS NULL
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


// ==========================================
// GET USER PROFILE
// ==========================================

router.get("/profile", async (req, res) => {
  try {
    const userId = req.user.id;

    await db.execute(
      `INSERT IGNORE INTO job_seeker_profiles (user_id)
       VALUES (?)`,
      [userId]
    );

    const completion = await refreshProfileCompletion(userId);

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

    rows[0].profile_completion = completion;

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


// ==========================================
// UPDATE USER PROFILE
// ==========================================

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
    (
      typeof body.full_name !== "string" ||
      !body.full_name.trim()
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Full name must be a non-empty string."
    });
  }

  if (
    body.expected_salary_min !== undefined &&
    body.expected_salary_min !== null &&
    (
      !Number.isFinite(Number(body.expected_salary_min)) ||
      Number(body.expected_salary_min) < 0
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Minimum expected salary must be a valid non-negative number."
    });
  }

  if (
    body.expected_salary_max !== undefined &&
    body.expected_salary_max !== null &&
    (
      !Number.isFinite(Number(body.expected_salary_max)) ||
      Number(body.expected_salary_max) < 0
    )
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

    await connection.execute(
      `INSERT IGNORE INTO job_seeker_profiles (user_id)
       VALUES (?)`,
      [userId]
    );

    if (body.full_name !== undefined) {
      await connection.execute(
        `UPDATE users
         SET full_name = ?, updated_at = NOW()
         WHERE id = ? AND deleted_at IS NULL`,
        [body.full_name.trim(), userId]
      );
    }

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
            typeof value === "string"
              ? value.trim() || null
              : value
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

    const completion = await refreshProfileCompletion(userId);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile_completion: completion
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


// ==========================================
// REUSABLE USER-OWNED CRUD ROUTES
// ==========================================

function registerUserCrudRoutes({
  path,
  table,
  fields,
  requiredFields = []
}) {

  // GET records

  router.get(path, async (req, res) => {
    try {
      const [rows] = await db.execute(
        `SELECT *
         FROM ${table}
         WHERE user_id = ?
         ORDER BY id DESC`,
        [req.user.id]
      );

      return res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error(`GET ${path} error:`, error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve records."
      });
    }
  });


  // CREATE record

  router.post(path, async (req, res) => {
    try {
      const body = req.body || {};

      for (const field of requiredFields) {
        if (
          typeof body[field] !== "string" ||
          !body[field].trim()
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} is required.`
          });
        }
      }

      const selectedFields = fields.filter(
        (field) => Object.prototype.hasOwnProperty.call(body, field)
      );

      if (selectedFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields provided."
        });
      }

      const columns = ["user_id", ...selectedFields];

      const values = [
        req.user.id,
        ...selectedFields.map((field) =>
          typeof body[field] === "string"
            ? body[field].trim() || null
            : body[field]
        )
      ];

      const placeholders = columns.map(() => "?").join(", ");

      const [result] = await db.execute(
        `INSERT INTO ${table} (${columns.join(", ")})
         VALUES (${placeholders})`,
        values
      );

      const completion = await refreshProfileCompletion(req.user.id);

      return res.status(201).json({
        success: true,
        message: "Record created successfully.",
        id: result.insertId,
        profile_completion: completion
      });

    } catch (error) {
      console.error(`POST ${path} error:`, error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to create record."
      });
    }
  });


  // UPDATE record

  router.put(`${path}/:id`, async (req, res) => {
    try {
      const body = req.body || {};

      const selectedFields = fields.filter(
        (field) => Object.prototype.hasOwnProperty.call(body, field)
      );

      if (selectedFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields provided."
        });
      }

      const assignments = selectedFields.map(
        (field) => `${field} = ?`
      );

      const values = selectedFields.map((field) =>
        typeof body[field] === "string"
          ? body[field].trim() || null
          : body[field]
      );

      const [result] = await db.execute(
        `UPDATE ${table}
         SET ${assignments.join(", ")}
         WHERE id = ? AND user_id = ?`,
        [...values, req.params.id, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Record not found."
        });
      }

      const completion = await refreshProfileCompletion(req.user.id);

      return res.json({
        success: true,
        message: "Record updated successfully.",
        profile_completion: completion
      });

    } catch (error) {
      console.error(`PUT ${path} error:`, error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to update record."
      });
    }
  });


  // DELETE record

  router.delete(`${path}/:id`, async (req, res) => {
    try {
      const [result] = await db.execute(
        `DELETE FROM ${table}
         WHERE id = ? AND user_id = ?`,
        [req.params.id, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Record not found."
        });
      }

      const completion = await refreshProfileCompletion(req.user.id);

      return res.json({
        success: true,
        message: "Record deleted successfully.",
        profile_completion: completion
      });

    } catch (error) {
      console.error(`DELETE ${path} error:`, error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to delete record."
      });
    }
  });
}


// ==========================================
// EDUCATION MANAGEMENT
// ==========================================

registerUserCrudRoutes({
  path: "/educations",
  table: "educations",
  fields: [
    "institution",
    "degree",
    "field_of_study",
    "result_text",
    "start_date",
    "end_date",
    "is_current",
    "description"
  ],
  requiredFields: ["institution"]
});


// ==========================================
// EXPERIENCE MANAGEMENT
// ==========================================

registerUserCrudRoutes({
  path: "/experiences",
  table: "experiences",
  fields: [
    "organization_name",
    "job_title",
    "employment_type",
    "location_text",
    "start_date",
    "end_date",
    "is_current",
    "description"
  ],
  requiredFields: ["organization_name", "job_title"]
});


// ==========================================
// PROJECT MANAGEMENT
// ==========================================

registerUserCrudRoutes({
  path: "/projects",
  table: "projects",
  fields: [
    "title",
    "description",
    "project_url",
    "repository_url",
    "start_date",
    "end_date"
  ],
  requiredFields: ["title"]
});


// ==========================================
// CERTIFICATION MANAGEMENT
// ==========================================

registerUserCrudRoutes({
  path: "/certifications",
  table: "certifications",
  fields: [
    "name",
    "issuing_organization",
    "issue_date",
    "expiry_date",
    "credential_id",
    "credential_url"
  ],
  requiredFields: ["name"]
});


// ==========================================
// SKILLS MANAGEMENT
// ==========================================

// GET skills catalog

router.get("/skills/catalog", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         s.id,
         s.name,
         s.category_id,
         sc.name AS category_name
       FROM skills s
       LEFT JOIN skill_categories sc
         ON sc.id = s.category_id
       ORDER BY sc.name ASC, s.name ASC`
    );

    return res.status(200).json({
      success: true,
      skills: rows
    });

  } catch (error) {
    console.error("Get skills catalog error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve skills catalog."
    });
  }
});


// GET user skills

router.get("/skills", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         us.user_id,
         us.skill_id,
         us.proficiency,
         us.years_experience,
         us.created_at,
         s.name AS skill_name,
         sc.name AS category_name
       FROM user_skills us
       INNER JOIN skills s
         ON s.id = us.skill_id
       LEFT JOIN skill_categories sc
         ON sc.id = s.category_id
       WHERE us.user_id = ?
       ORDER BY us.created_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      skills: rows
    });

  } catch (error) {
    console.error("Get user skills error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve skills."
    });
  }
});


// ADD OR UPDATE user skill

router.post("/skills", async (req, res) => {
  try {
    const {
      skill_id,
      proficiency,
      years_experience
    } = req.body || {};

    if (
      !Number.isInteger(Number(skill_id)) ||
      Number(skill_id) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid skill_id is required."
      });
    }

    const allowedLevels = [
      "BEGINNER",
      "INTERMEDIATE",
      "ADVANCED",
      "EXPERT"
    ];

    if (
      proficiency != null &&
      !allowedLevels.includes(proficiency)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid proficiency level."
      });
    }

    if (
      years_experience != null &&
      (
        !Number.isFinite(Number(years_experience)) ||
        Number(years_experience) < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid years_experience."
      });
    }

    const [existingSkill] = await db.execute(
      `SELECT id
       FROM skills
       WHERE id = ?
       LIMIT 1`,
      [Number(skill_id)]
    );

    if (existingSkill.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Skill not found."
      });
    }

    await db.execute(
      `INSERT INTO user_skills
         (user_id, skill_id, proficiency, years_experience)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         proficiency = VALUES(proficiency),
         years_experience = VALUES(years_experience)`,
      [
        req.user.id,
        Number(skill_id),
        proficiency || null,
        years_experience == null
          ? null
          : Number(years_experience)
      ]
    );

    const completion = await refreshProfileCompletion(req.user.id);

    return res.status(201).json({
      success: true,
      message: "Skill saved successfully.",
      profile_completion: completion
    });

  } catch (error) {
    console.error("Add user skill error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to save skill."
    });
  }
});


// DELETE user skill

router.delete("/skills/:skillId", async (req, res) => {
  try {
    const skillId = Number(req.params.skillId);

    if (!Number.isInteger(skillId) || skillId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid skill ID."
      });
    }

    const [result] = await db.execute(
      `DELETE FROM user_skills
       WHERE user_id = ? AND skill_id = ?`,
      [req.user.id, skillId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User skill not found."
      });
    }

    const completion = await refreshProfileCompletion(req.user.id);

    return res.json({
      success: true,
      message: "Skill removed successfully.",
      profile_completion: completion
    });

  } catch (error) {
    console.error("Delete user skill error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to remove skill."
    });
  }
});


// ==========================================
// CAREER MANAGEMENT
// ==========================================

// GET active career catalogue

router.get("/careers", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         id,
         title,
         slug,
         description
       FROM careers
       WHERE is_active = 1
       ORDER BY title ASC`
    );

    return res.json({
      success: true,
      careers: rows
    });

  } catch (error) {
    console.error("Get careers error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve careers."
    });
  }
});


// GET user's selected career goal

router.get("/career-goal", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         ucg.user_id,
         ucg.career_id,
         ucg.created_at,
         ucg.updated_at,
         c.title,
         c.slug,
         c.description
       FROM user_career_goals ucg
       INNER JOIN careers c
         ON c.id = ucg.career_id
       WHERE ucg.user_id = ?
       LIMIT 1`,
      [req.user.id]
    );

    return res.json({
      success: true,
      career_goal: rows[0] || null
    });

  } catch (error) {
    console.error("Get career goal error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve career goal."
    });
  }
});


// SELECT OR UPDATE career goal

router.put("/career-goal", async (req, res) => {
  try {
    const careerId = Number(req.body?.career_id);

    if (
      !Number.isInteger(careerId) ||
      careerId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid career_id is required."
      });
    }

    const [careers] = await db.execute(
      `SELECT id, title
       FROM careers
       WHERE id = ?
         AND is_active = 1
       LIMIT 1`,
      [careerId]
    );

    if (careers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Career not found or inactive."
      });
    }

    await db.execute(
      `INSERT INTO user_career_goals
         (user_id, career_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         career_id = VALUES(career_id),
         updated_at = NOW()`,
      [req.user.id, careerId]
    );

    const completion = await refreshProfileCompletion(req.user.id);

    return res.json({
      success: true,
      message: "Career goal saved successfully.",
      career_goal: careers[0],
      profile_completion: completion
    });

  } catch (error) {
    console.error("Save career goal error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to save career goal."
    });
  }
});


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
