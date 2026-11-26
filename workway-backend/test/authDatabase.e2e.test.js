const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const enabled = process.env.WORKWAY_E2E === "1" && process.env.DB_NAME === "workway";
test("password reset and Google sign-in complete against MariaDB", { skip: !enabled }, async (t) => {
  process.env.GOOGLE_CLIENT_ID ||= "workway-test.apps.googleusercontent.com";
  process.env.JWT_SECRET ||= "test-only-secret-with-more-than-32-characters";

  const bcrypt = require("bcrypt");
  const { OAuth2Client } = require("google-auth-library");
  const emailService = require("../config/emailService");
  const db = require("../config/database");
  const sentResetEmails = [];
  emailService.sendPasswordResetLink = async (email, url) => sentResetEmails.push({ email, url });

  const googleEmail = `google-${crypto.randomUUID()}@example.test`;
  const existingEmail = `linked-${crypto.randomUUID()}@example.test`;
  const googleSubject = `google-sub-${crypto.randomUUID()}`;
  const prefix = `e2e-${crypto.randomUUID()}`;
  const resetEmail = `${prefix}@example.test`;
  const originalVerify = OAuth2Client.prototype.verifyIdToken;
  OAuth2Client.prototype.verifyIdToken = async ({ idToken, audience }) => {
    assert.equal(audience, process.env.GOOGLE_CLIENT_ID);
    if (idToken !== "test-google-verified-id-token") throw new Error("Invalid test token");
    const email = idToken === "test-google-verified-id-token" ? googleEmail : "";
    return { getPayload: () => ({ sub: googleSubject, email, email_verified: true, name: "Google E2E User" }) };
  };

  const app = require("../server");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const postJson = (path, body, headers = {}) => fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });

  try {
    const initialHash = await bcrypt.hash("old-password-123", 10);
    const [insert] = await db.execute(
      `INSERT INTO users (full_name, email, password_hash, role, account_status, email_verified_at)
       VALUES (?, ?, ?, 'USER', 'ACTIVE', NOW())`,
      ["Reset E2E User", resetEmail, initialHash]
    );
    const resetUserId = insert.insertId;
    await db.execute(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))`,
      [resetUserId, crypto.randomBytes(32).toString("hex")]
    );

    const requested = await postJson("/api/auth/forgot-password", { email: resetEmail });
    assert.equal(requested.status, 200);
    assert.equal(sentResetEmails.length, 1);
    const resetToken = new URL(sentResetEmails[0].url).searchParams.get("token");
    assert.ok(resetToken);

    const [tokenRows] = await db.execute(
      "SELECT token_hash FROM password_reset_tokens WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [resetUserId]
    );
    assert.equal(tokenRows[0].token_hash, crypto.createHash("sha256").update(resetToken).digest("hex"));

    const reset = await postJson("/api/auth/reset-password", { token: resetToken, new_password: "new-password-456" });
    assert.equal(reset.status, 200);
    const [sessionRows] = await db.execute("SELECT revoked_at FROM user_sessions WHERE user_id = ?", [resetUserId]);
    assert.ok(sessionRows[0].revoked_at);
    const [userRows] = await db.execute("SELECT password_hash FROM users WHERE id = ?", [resetUserId]);
    assert.equal(await bcrypt.compare("new-password-456", userRows[0].password_hash), true);
    assert.equal((await postJson("/api/auth/reset-password", { token: resetToken, new_password: "other-password-789" })).status, 400);
    assert.equal((await postJson("/api/auth/login", { email: resetEmail, password: "old-password-123" })).status, 401);
    assert.equal((await postJson("/api/auth/login", { email: resetEmail, password: "new-password-456" })).status, 200);

    const google = await postJson("/api/auth/google", { credential: "test-google-verified-id-token" });
    assert.equal(google.status, 200);
    const googleBody = await google.json();
    assert.equal(googleBody.user.email, googleEmail);
    assert.equal(googleBody.user.role, "USER");
    const profile = await fetch(`${baseUrl}/api/auth/profile`, { headers: { authorization: `Bearer ${googleBody.token}` } });
    assert.equal(profile.status, 200);
    const [googleUsers] = await db.execute("SELECT id, account_status, email_verified_at, google_subject FROM users WHERE email = ?", [googleEmail]);
    assert.equal(googleUsers.length, 1);
    assert.equal(googleUsers[0].account_status, "ACTIVE");
    assert.ok(googleUsers[0].email_verified_at);
    assert.equal(googleUsers[0].google_subject, googleSubject);

    const linkedHash = await bcrypt.hash("linked-password-123", 10);
    await db.execute(
      `INSERT INTO users (full_name, email, password_hash, role, account_status, email_verified_at)
       VALUES (?, ?, ?, 'USER', 'ACTIVE', NOW())`,
      ["Existing E2E User", existingEmail, linkedHash]
    );
    const linkedSubject = `linked-sub-${crypto.randomUUID()}`;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({ sub: linkedSubject, email: existingEmail, email_verified: true, name: "Linked User" })
    });
    const linked = await postJson("/api/auth/google", { credential: "test-google-verified-id-token" });
    assert.equal(linked.status, 200);
    const [linkedUsers] = await db.execute("SELECT google_subject FROM users WHERE email = ?", [existingEmail]);
    assert.equal(linkedUsers[0].google_subject, linkedSubject);

    t.diagnostic("Password reset, single-use token, session revocation, login, Google account creation, profile session, and verified-email account linking passed.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    OAuth2Client.prototype.verifyIdToken = originalVerify;
    await db.execute("DELETE FROM users WHERE email LIKE ?", [`${prefix}%`]);
    await db.execute("DELETE FROM users WHERE email IN (?, ?)", [googleEmail, existingEmail]);
    await db.end();
  }
});
