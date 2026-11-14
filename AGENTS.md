# AGENTS.md

## Commands and verification

- Not an npm workspace. Root `package.json` is not an app manifest; install and run separately in `backend/` and `frontend/`. CI uses Node 22.
- Frontend (`frontend/`): `npm run dev`, `npm run lint` (`oxlint`), `npm run build` (`tsc -b && vite build`). No frontend tests.
- Backend (`backend/`): `npm run dev` (`tsx watch src/server.ts`), `npm run build` (`tsc`, the only typecheck), `npm run start` (`node dist/server.js`). There is no backend `test` or `lint` script.
- Verification: frontend `npm run lint && npm run build`; backend `npm run build` plus focused tests.
- Tests use `node:test` through tsx: `npx tsx --test <file...>` (repeat file paths for more tests). Do not use Jest/Vitest. HTTP/auth suites live in `backend/tests/`; payment tests sit beside the module in `backend/src/modules/payments/`.
- `backend/tests/users.test.ts` is a manual live-database script, not a `node:test` suite; exclude it from normal test runs.
- The atomic payment test is skipped unless `PAYMENT_TEST_DATABASE_URL` points at a disposable loopback database named `payment_integrity_test`.
- CI runs on pushes/PRs to `main` only, and only runs frontend lint/build plus backend `tsc`; tests are not in CI. `docs/DEPLOYMENT.md` says Render auto-deploys `backend/` from `dev`, so a push to `dev` does not trigger GitHub CI.
- Render's build command must keep `--include=dev` (`npm install --include=dev && npm run build`) because `typescript` and `@types/*` are devDependencies.

## Backend architecture

- Express 5 + TypeScript ESM with NodeNext. Local imports must include the `.js` extension even in `.ts` files. `strict` and `noUncheckedIndexedAccess` are on.
- Entrypoints: `backend/src/server.ts` starts the listener (and the 60-second payment-email retry), `backend/src/app.ts` builds the app. The `src/seed-courses.ts`, `src/list-users.ts`, `src/test-login.ts`, and `scripts/` files are ad hoc scripts, not app entrypoints.
- Modules live in `backend/src/modules/<domain>/` and follow `<domain>.routes|controller|service|repository|types.ts`. Classes are paired with an exported singleton instance (e.g. `authService`); follow this pattern.
- Only `auth`, `users`, `courses`, `payments`, and `workshops` are implemented; other module directories contain only `.gitkeep`.
- Mounts: `/api/auth`, `/api/users`, `/api/courses`, `/api/payment` (singular), `/api/workshops`; health at `/api/health`; Swagger at `/docs`.
- Controllers handle request parsing, validation, and the response; services hold business rules and throw domain errors; repositories own all Supabase/RPC/pg access. Keep data access out of controllers/services.
- Response conventions: success is usually `{ success: true, data }`; errors are usually `{ message }` or `{ success: false, message }`; logout returns `204`.
- Validation is mostly manual in controllers/services. `middlewares/validateRequest.ts` exists but is rarely used. Domain errors: `AuthError`, `CourseRequestError`, `WorkshopRequestError`, `PaymentWebhookError`.

## Frontend

- React 19 + Vite 8 + Tailwind 4. Admin user management lives in `frontend/src/pages/quan_ly_nguoi_dung/` (Vietnamese folder name), not `pages/users/`.
- `tsconfig.app.json` enforces `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`: use `import type` for type-only imports, and avoid enums and constructor parameter properties.
- API clients resolve `VITE_API_URL` first, then `VITE_API_BASE_URL`, then `http://localhost:5000/api`. Auth and checkout calls send `credentials: 'include'` for the refresh cookie. Vite also proxies `/api` to `http://localhost:5000`.
- Auth state: the access token and user are persisted in `localStorage` under `your-voice-auth-session`; refresh is called only by explicit authenticated recovery flows, not on page load. Do not add automatic refresh on mount.

## Authentication and authorization

- Two auth systems: regular users are stored in PostgreSQL tables and authenticated with raw `pg` + bcryptjs; admin login uses Supabase Auth. Do not add a third scheme.
- Access tokens are custom HS256 JWTs (30-minute lifetime) signed with `AUTH_JWT_SECRET` (must be at least 32 bytes). Refresh tokens are HttpOnly cookies (`english_learning_platform_refresh`), hashed in `auth_sessions`, valid for 7 days.
- `authenticate` puts the user in `response.locals.authUser`; `authorize(...roles)` checks uppercase roles `STUDENT | TEACHER | ADMIN`.
- Auth mutation routes use `requireTrustedOrigin`; the request `Origin` must match `FRONTEND_URL` or `API_ORIGIN`. Keep this guard when adding auth endpoints.
- Google login has both a server redirect flow (`/api/auth/google` → `/google/callback`) and client credential/session routes (`/google`, `/google/session`, `/google/identity`); inspect `auth.controller.ts` before changing it.

## Database and payments

- Schema changes are SQL migrations in `supabase/migrations/`; there is no ORM. Add a new timestamped migration instead of editing an applied one.
- Most repositories use the service-role Supabase client and bypass RLS; raw `pg` is used by auth. Never expose or log `SUPABASE_SERVICE_ROLE_KEY` or any `.env` value.
- Payment confirmation must go through the `confirm_course_order_payment` RPC, which atomically marks the order paid and creates enrollment. Do not split this into separate status/enrollment updates.
- `/api/payment/sepay-webhook` authenticates with `X-Secret-Key` (IPN secret). `/api/payment/sepay-bank-webhook` verifies an HMAC over the exact raw body plus a 5-minute timestamp; `app.ts` captures `rawBody` only for that path. Do not replace or reorder the JSON body middleware without preserving it.

## API docs and environment

- OpenAPI is hand-written in `backend/src/openapi.ts` and served at `/docs` and `/docs/openapi.json`; update it whenever routes, payloads, or status codes change.
- `backend/src/config/env.ts` loads `backend/.env` relative to the module file, not the process cwd. Frontend env vars must use the `VITE_` prefix and are inlined at build time; changing them requires a rebuild.
- Documentation drift: `docs/AUTH_IMPLEMENTATION_TASK.md` claims NestJS, but the implementation is Express. Trust source code and package scripts over prose.

## Project memory and working rules

- Before starting a task, read `docs/PROJECT_MEMORY.md` if it exists.
- Inspect the relevant source files before making changes. Never assume documentation is more accurate than the implementation.
- For large or cross-module tasks, explain the implementation plan and wait for approval before editing.
- If `docs/PROJECT_MEMORY.md` exists, keep it updated when architecture, APIs, database schema, important business rules, or project structure change. Do not rewrite the whole file for small changes.
- Never store passwords, API keys, tokens, secrets, or `.env` values in project documentation.
- At the end of each task, report changed files, checks performed, results, and remaining issues.
