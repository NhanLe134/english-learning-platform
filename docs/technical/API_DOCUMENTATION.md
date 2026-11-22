# API Documentation

The complete OpenAPI document is served at `GET /docs/openapi.json`; the
documentation landing page is `GET /docs`.

All authentication mutation requests require an `Origin` matching
`FRONTEND_URL` or `API_ORIGIN`. Browser clients must send credentials so the
API can set and rotate the HttpOnly refresh cookie. Responses use JSON with
`{ "success": true, "data": ... }` for successful data responses, and
`{ "message": "..." }` for errors.
The refresh cookie uses `SameSite=Lax` so it remains available after the
cross-site Google OAuth redirect; state validation and trusted-origin checks
protect the authentication flow.

## Courses

### `GET /api/courses?ids=<course-id>,<course-id>`

Returns selected published courses in the requested order. Supply one to 50
comma-separated UUIDs. Each returned course includes its ID, title,
description, thumbnail URL, status, and teacher ID/name/avatar when available.
If any ID is invalid, the endpoint returns `400`. If any course is missing or
not published, it returns `404` and lists the unavailable IDs in `missingIds`.
The endpoint does not enroll the user or grant course access.

### Admin course management

The endpoints under `/api/courses/admin` require an active `ADMIN` access
token. `GET /api/courses/admin` returns a paginated catalog and accepts
`search`, `category`, `level`, `status`, `sort`, `page`, and `limit` filters.
The level filter accepts `all`, `beginner`, `intermediate`, or `advanced`.
The status filter accepts `all`, `draft`, `published`, or `archived`; sort
accepts `newest`, `price_asc`, or `price_desc`.

- `POST /api/courses/admin` creates a course and assigns the authenticated
  administrator as its initial teacher.
- `PATCH /api/courses/admin/{id}` updates course details.
- `PATCH /api/courses/admin/{id}/status` publishes or drafts a course.
- `DELETE /api/courses/admin/{id}` deletes a course. Database references can
  prevent deletion while enrollments or course content still exist.

Course input includes title, unique URL slug, description, category, level
(`beginner`, `intermediate`, or `advanced`), target audience, price, optional
discounted price, lesson count, thumbnail URL, and status. Prices are
non-negative and support up to two decimal places; a discount cannot exceed
the regular price. Thumbnail images are provided by HTTP(S) URL.

## Authentication

### Role authorization

Protected endpoints require a valid `Authorization: Bearer <accessToken>`.
Missing, invalid, expired, or revoked credentials return `401`; an
authenticated user without the required role receives `403`.

- `ADMIN` can access user-management endpoints under `/api/users` and course
  management endpoints under `/api/courses/admin`.
- `TEACHER` and `STUDENT` cannot access `/api/users`.
- Registration always assigns `STUDENT`; admin-created roles are assigned by
  the protected user-management API.
- IELTS exam, grading, and course-registration endpoints are not implemented
  in this backend yet, so there are no routes to authorize for those features
  at this time. The public course-selection endpoint is documented above.

### `POST /api/auth/register`

Creates an unverified PostgreSQL profile with a normalized email, full name,
date of birth, and server-assigned `STUDENT` role. The bcrypt password hash is
stored separately in the private `auth_credentials` table, not in the profile.
Optional `selectedCourseIds` must identify published courses; the IDs are
stored in a private registration-details table as intent only and do not
enroll the student. Request JSON:

```json
{
  "fullName": "Nguyễn Minh Anh",
  "dateOfBirth": "2000-01-15",
  "email": "learner@example.com",
  "phoneNumber": "+84 912 345 678",
  "password": "a-long-example-password",
  "confirmPassword": "a-long-example-password",
  "selectedCourseIds": ["c0a80101-0000-4000-8000-000000000001"]
}
```

Passwords must be at least 8 characters, at most 72 UTF-8 bytes, and match
their confirmation. Full name must be 1–120 characters; date of birth must be
a valid non-future `YYYY-MM-DD` date. Phone number is required and must contain
7–15 digits; it is saved to the student profile and included in the authenticated
profile returned after email verification. Returns `202` with `verificationRequired`,
email, and validated selected course IDs. It does not issue access/refresh
tokens or send a verification email itself; the client starts verification using
the resend endpoint below. Returns `400`
for invalid input or unavailable selected courses, `409` for a duplicate
email, `403` for an untrusted origin, `429` when rate-limited, or `503` if
registration services are not configured/available. Login and protected-token
validation reject unverified profiles.

### `POST /api/auth/register/verification/resend`

Request JSON: `{ "email": "learner@example.com" }`. If an unverified registration
exists, the API issues a cryptographically random six-digit OTP and sends it
through the configured Resend integration. The OTP is stored only as an
HMAC-SHA-256 hash, expires after 10 minutes, permits at most five incorrect
attempts, and cannot be resent within 60 seconds. A new code invalidates its
predecessor. The status and response body are identical for unknown, verified,
cooling-down, and eligible addresses. A `202` response does not confirm receipt
in the inbox. If the provider rejects delivery, the code is invalidated and the
API returns `503` so the user can retry; logs include no email, OTP, or provider
error details. For local development only, enabling
`AUTH_EXPOSE_REGISTRATION_OTP=true` returns the still-valid code in the response
instead, allowing testing when Resend's sender domain is unavailable. The UI
labels this as a temporary development OTP. This fallback is disabled in
production and must never be enabled there. Configuration/database failures may also return `503`; the
route's IP-based rate limiter may return `429` independently of account state.
By default, no OTP is returned in the response;
OTP values are never logged. For local development only, set
`AUTH_EXPOSE_REGISTRATION_OTP=true` in
`backend/.env` to include `developmentOtp` in a successful resend response.
The default is `false`, and the service additionally checks `NODE_ENV` so this
value is never included when `NODE_ENV=production`, even if the flag is true.
Never enable this setting in a shared or production environment.

### `POST /api/auth/register/verification/verify`

Request JSON: `{ "email": "learner@example.com", "otp": "042615" }`.
Successful verification atomically consumes the OTP and marks the profile
verified, then returns `200` with an access token and sets the HttpOnly refresh
cookie. An invalid, expired, exhausted, unrecognized, or already verified
address receives the same generic `400` response, so verification failures do
not disclose account state. The route's IP-based rate limiter may return `429`.
No session or cookie is issued for a failed verification.

Apply `supabase/migrations/20261031031000_add_registration_email_otps.sql`
after the existing auth and private-registration-details migrations before
enabling these endpoints. Configure `RESEND_API_KEY` and `EMAIL_FROM` using the
existing server-side Resend integration.

### `POST /api/auth/login`

Request JSON: `{ "email": "learner@example.com", "password": "...", "rememberMe": false }`.
`rememberMe` is optional and defaults to `true` for older clients. When true,
the refresh cookie is saved for seven days; when false, it lasts only for the
browser session. Refresh rotation preserves this choice. Returns `200` with the
access token and safe user fields and sets the refresh cookie. Invalid
credentials return the same `401` response. The public user object includes
`id`, `email`, `full_name`, `phone_number`, and `role` so checkout can display
the authenticated learner's profile rather than sample details. Invalid JSON
fields return `400`; rate-limited attempts return `429`.

### Google OAuth login and signup

Install the backend dependencies with `cd backend` followed by `npm install`.
Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`.
In Google Cloud Console, register
`{API_ORIGIN}/api/auth/google/callback` as an authorized redirect URI. For local
development, the default is `http://localhost:5000/api/auth/google/callback`.

`GET /api/auth/google` starts the OAuth authorization-code flow and redirects
the browser to Google. The backend sets a short-lived HttpOnly state cookie to
protect the callback from cross-site request forgery.
`GET /api/auth/google/callback` validates that state, exchanges the code on the
server, verifies the Google identity, then creates a `STUDENT` profile with the
Google name and avatar if no account exists. Existing active accounts with the
same verified email can sign in. The callback sets the refresh token as an
HttpOnly cookie and redirects to the frontend callback; it never places tokens
in the URL. `STUDENT` is the role name used for learners in this database.

The existing token endpoints are also available:

`POST /api/auth/google` accepts a Google or Supabase token, verifies it with
the provider, and logs in or creates a student account. Client-supplied profile
fields are not trusted. `POST /api/auth/google/identity` returns the verified
email, display name, and avatar URL for pre-filling the separate registration
form, without creating an account or issuing a session.

### `POST /api/auth/refresh`

Requires the HttpOnly refresh cookie set by successful email verification or
login. Returns `200` with
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
the same generic message whether or not an account exists. For an active
account, the backend generates a cryptographically secure temporary password,
emails it through Resend, then updates its credential in the account's
authentication provider: Admin accounts use Supabase Auth, while
PostgreSQL-authenticated accounts store only its bcrypt hash. Active sessions
are revoked. Email-delivery errors leave the current password unchanged and
return a service error. The password is never included in the API response or
logs.
Invalid JSON field types return `400`; rate-limited requests return `429`.

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
`supabase/migrations/20261025003000_database_url_auth.sql` and
`supabase/migrations/20261031024400_add_private_registration_details.sql` before
using registration. The first migration creates private
credential/session/reset-token tables, normalizes existing profile emails,
moves bcrypt-compatible legacy hashes to the private credential table and
clears the old profile hash column, and removes a profile-to-`auth.users`
foreign key if present. The registration migration creates an RLS-protected
table for date of birth and selected course intent, avoiding exposure through
the existing profile read policy. Review these schema changes before applying
them. Configure
`RESEND_API_KEY` and `EMAIL_FROM` to deliver temporary-password emails. The browser client
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
response; the temporary password is delivered only by email and is never
returned to the browser.
