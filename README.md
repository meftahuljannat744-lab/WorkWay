# WorkWay

An AI-powered job portal for smart job categorization and search.

## Frontend setup

1. In `workway-frontend`, copy `.env.example` to `.env` and set the backend URL and same Google Web client ID used by the backend.
2. Run `npm ci`, then `npm run dev`.
3. Add `http://localhost:5173` to the Google OAuth client's authorized JavaScript origins.

The sign-in page, password recovery page (`/forgot-password`), and reset page (`/reset-password?token=...`) use the backend endpoints below. A successful sign-in keeps the WorkWay session token in the current browser tab's `sessionStorage`.

## Backend setup

1. Import `database/workway_database_mariadb_10_4.sql` into MariaDB 10.4+.
2. In `workway-backend`, copy `.env.example` to `.env` and set the database, JWT, email, Google client ID, and frontend URL values.
3. Create a Google OAuth 2.0 **Web application** client in Google Cloud Console. Add the frontend origin to its authorized JavaScript origins and use that same client ID in both the frontend and `GOOGLE_CLIENT_ID`.
4. For Gmail delivery, enable 2-Step Verification and create an App Password. Set it as `EMAIL_APP_PASSWORD`.
5. Run `npm ci`, then `npm start` from `workway-backend`.

## Authentication endpoints

- `POST /api/auth/forgot-password` — body: `{ "email": "person@example.com" }`. Sends a single-use reset link, expires after 30 minutes. The response does not reveal whether the account exists.
- `POST /api/auth/reset-password` — body: `{ "token": "...", "new_password": "at-least-8-characters" }`. Consumes the token and revokes the user's existing sessions.
- `POST /api/auth/google` — body: `{ "credential": "<Google Identity Services ID token>" }`. Verifies the token signature, audience, issuer, expiry, and verified email with Google's OAuth client library; creates or links the account by verified email and returns the same WorkWay session token as password login.

Google Sign-In expects an ID token from Google Identity Services; do not send an access token or an unverified profile object. Google accounts with a verified email may activate a pending account or link to an existing account with the same email. Suspended/deleted accounts cannot sign in.

## Tests

Run `npm test` in `workway-backend` for HTTP-level authentication route smoke tests. To run the MariaDB-backed auth flow suite, first import the schema into an isolated test database and run with `WORKWAY_E2E=1` and `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=workway`, and `APP_BASE_URL` configured. The suite creates and removes its own test accounts. It captures reset email links and stubs Google's verified identity response, so it tests the API/database/session flows without sending email or depending on Google availability; the smoke suite also checks that a malformed Google token is rejected.
