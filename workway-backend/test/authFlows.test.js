const test = require("node:test");
const assert = require("node:assert/strict");

process.env.GOOGLE_CLIENT_ID = "workway-test.apps.googleusercontent.com";
process.env.JWT_SECRET = "test-only-secret-with-more-than-32-characters";

const app = require("../server");

const withServer = async (run) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

const postJson = (baseUrl, path, body) => fetch(`${baseUrl}${path}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body)
});

test("auth HTTP routes reject malformed and untrusted input", async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/`);
    assert.equal(health.status, 200);

    const login = await postJson(baseUrl, "/api/auth/login", {});
    assert.equal(login.status, 400);

    const forgot = await postJson(baseUrl, "/api/auth/forgot-password", { email: "not-an-email" });
    assert.equal(forgot.status, 400);

    const reset = await postJson(baseUrl, "/api/auth/reset-password", {
      token: "short-token",
      new_password: "new-password-123"
    });
    assert.equal(reset.status, 400);

    const googleMissing = await postJson(baseUrl, "/api/auth/google", {});
    assert.equal(googleMissing.status, 400);

    const googleInvalid = await postJson(baseUrl, "/api/auth/google", { credential: "not.a.google-token" });
    assert.equal(googleInvalid.status, 401);
  });
});
