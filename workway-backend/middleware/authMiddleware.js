
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/database");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Check Authorization header
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Invalid token."
            });
        }

        // Verify JWT
       const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    issuer: "workway-api",
    audience: "workway-client"
            });

        if (!decoded.sub) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        // Hash the received token
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Verify active session and user account
        const [sessions] = await db.execute(
            `SELECT
                us.id AS session_id,
                us.user_id,
                us.expires_at,
                us.revoked_at,
                u.role,
                u.account_status
             FROM user_sessions us
             INNER JOIN users u ON u.id = us.user_id
             WHERE us.token_hash = ?
               AND us.user_id = ?
               AND us.expires_at > NOW()
               AND us.revoked_at IS NULL
               AND u.account_status = 'ACTIVE'
               AND u.deleted_at IS NULL
             LIMIT 1`,
            [tokenHash, decoded.sub]
        );

        if (sessions.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Session expired or revoked. Please log in again."
            });
        }

        // Attach authenticated user information
        req.user = {
            ...decoded,
            id: decoded.sub,
            role: sessions[0].role
        };

        next();

    } catch (error) {
        if (error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError") {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token."
            });
        }

        console.error("Authentication middleware error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication service error."
        });
    }
};

module.exports = authMiddleware;
