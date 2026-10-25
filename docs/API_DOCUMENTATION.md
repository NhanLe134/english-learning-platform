# API Documentation

The complete OpenAPI document is served at `GET /docs/openapi.json`; the
documentation landing page is `GET /docs`.

All authentication mutation requests require an `Origin` matching
`FRONTEND_URL` or `API_ORIGIN`. Browser clients must send credentials so the
API can set and rotate the HttpOnly refresh cookie. Responses use JSON with
`{ "success": true, "data": ... }` for successful data responses, and
`{ "message": "..." }` for errors.

## Authentication

### Role authorization

Protected endpoints require a valid `Authorization: Bearer <accessToken>`.
Missing, invalid, expired, or revoked credentials return `401`; an
authenticated user without the required role receives `403`.

- `ADMIN` can access the currently implemented user-management endpoints
  under `/api/users`.
- `TEACHER` and `STUDENT` cannot access `/api/users`.
- Registration always assigns `STUDENT`; admin-created roles are assigned by
  the protected user-management API.
- IELTS exam, grading, course catalogue, and course-registration endpoints
  are not implemented in this backend yet, so there are no routes to authorize
  for those features at this time.

### `POST /api/auth/register`

Creates a PostgreSQL profile with a normalized email and server-assigned
`STUDENT` role. The bcrypt password hash is stored separately in the private
`auth_credentials` table, not in the API-readable profile. Request JSON:

```json
{
  "email": "learner@example.com",
  "password": "a-long-example-password",
  "confirmPassword": "a-long-example-password"
}
```

Passwords must be at least 8 characters, at most 72 UTF-8 bytes, and match
their confirmation. Returns `201` with a 30-minute `accessToken`, safe user
fields (`id`, `email`, `role`), and a seven-day HttpOnly refresh cookie.
Returns `400` for invalid input, `409` for a duplicate email, `403` for an
untrusted origin, `429` when rate-limited, or `503` if registration services
are not configured/available.

### `POST /api/auth/login`

Request JSON: `{ "email": "learner@example.com", "password": "..." }`.
Returns `200` with the access token and safe user fields and sets the refresh
cookie. Invalid credentials return the same `401` response. Invalid JSON
fields return `400`; rate-limited attempts return `429`.

### `POST /api/auth/refresh`

Requires the HttpOnly refresh cookie set by register/login. Returns `200` with
a new access token and rotates the refresh cookie. Missing, invalid, expired,
revoked, or reused refresh tokens return `401` and clear the cookie.

### `POST /api/auth/logout`

Accepts the current session’s bearer access token, or the refresh cookie if
the access token has expired. Revokes that session, clears the cookie, and
returns `204`. A missing or invalid credential returns `401`.

### `GET /api/auth/me`

Requires `Authorization: Bearer <accessToken>`. Returns `200` with the safe
current-user fields (`id`, `email`, `role`). Missing, invalid, expired, or
revoked credentials return `401`.

### `POST /api/auth/forgot-password`

Request JSON: `{ "email": "learner@example.com" }`. Always returns `200` with
the same generic message whether or not an account exists. If configured, an
email provider sends a single-use reset link that expires in 10 minutes.
Invalid JSON field types return `400`; rate-limited requests return `429`.
For local testing only, set `AUTH_EXPOSE_RESET_LINK=true` while
`NODE_ENV=development` to include `resetUrl` in the response. This option is
ignored outside development and must never be enabled in production.

### `POST /api/auth/reset-password`

Request JSON:

```json
{
  "token": "token-from-reset-email",
  "newPassword": "a-new-long-example-password",
  "confirmPassword": "a-new-long-example-password"
}
```

Requires a valid, unused reset token and a matching password confirmation
(minimum 8 characters and maximum 72 UTF-8 bytes). Returns `204` after
updating the PostgreSQL password hash and revoking all application sessions.
Invalid, expired, or previously used tokens and invalid input return `400`.

## Health

- `GET /api/health` returns `{ "status": "ok" }` when the API is running.

## Configuration

Copy `backend/.env.example` to `backend/.env`. Set `AUTH_JWT_SECRET` to a
randomly generated secret of at least 32 bytes (for example, run
`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`
from the backend directory). The backend loads this file regardless of the
directory from which the server is started.
Configure `DATABASE_URL` (or the `DB_URL` alias) for PostgreSQL-backed
authentication. Apply
`supabase/migrations/20261025003000_database_url_auth.sql` before using
register, login, refresh, logout, or password reset. This migration creates
private credential/session/reset-token tables, normalizes existing profile
emails, moves bcrypt-compatible legacy hashes to the private credential table
and clears the old profile hash column, and removes a profile-to-`auth.users`
foreign key if present. Review these existing-data/schema changes before
applying it. Configure
`RESEND_API_KEY` and `EMAIL_FROM` to deliver reset emails. The browser client
must use the configured `FRONTEND_URL`; production deployments must use HTTPS
for frontend/API origins and secure cookies.

The pre-existing user-management endpoints still use the Supabase API client;
the authentication routes above use only PostgreSQL via `DATABASE_URL`.

## Frontend authentication

The React authentication pages call the routes documented above. Configure
`VITE_API_URL` or `VITE_API_BASE_URL` in `frontend/.env` to the backend API
base URL, including `/api` (for example, `http://localhost:5000/api`). Browser
requests include credentials so the HttpOnly refresh cookie can be stored and
rotated. Keep the frontend origin consistent with `FRONTEND_URL` in the
backend configuration; for the local Vite default, use
`http://localhost:5173`, not `127.0.0.1`.

Access tokens remain in React memory and are refreshed on page load from the
HttpOnly cookie. When a protected user-management request receives `401`, the
frontend rotates the refresh cookie and retries that request once. If the
refresh session is invalid or expired, the admin session is cleared and the
user is redirected to login. The forgot-password page displays a generic
response; a development reset link appears only when the backend explicitly
returns one with `AUTH_EXPOSE_RESET_LINK=true` in development.
