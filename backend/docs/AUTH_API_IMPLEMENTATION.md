# Authentication API Implementation

This document records the authentication endpoints and database changes implemented for the current Express + TypeScript + PostgreSQL backend.

## Endpoints

All paths are mounted under `/api/v1`.

| Method | Endpoint | Authentication | Behavior |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Public | Validates email/password; returns the public user and sets short-lived access plus rotating refresh `HttpOnly` cookies. |
| `POST` | `/auth/refresh` | Refresh cookie | Rotates the refresh token transactionally and issues a new access token. |
| `POST` | `/auth/logout` | Refresh cookie | Revokes the current refresh session and clears auth cookies. |
| `GET` | `/auth/me` | Access cookie or `Authorization: Bearer <accessToken>` | Returns the active user and organization/role fields. |
| `POST` | `/auth/forgot-password` | Public | Returns a non-enumerating confirmation. Development also returns a reset token/link; production requires an email provider to deliver the link. |
| `POST` | `/auth/reset-password` | Reset token | Consumes a one-time reset token, hashes the new password, revokes all refresh sessions, and clears cookies. |

### Request examples

```json
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "a-long-user-password"
}
```

```json
POST /api/v1/auth/forgot-password
{
  "email": "user@example.com"
}
```

```json
POST /api/v1/auth/reset-password
{
  "token": "one-time-token-from-reset-link",
  "password": "a-new-long-password"
}
```

The successful JSON envelope is `{ "success": true, "data": ... }`. Login and refresh credentials are intentionally not included in JSON; browsers receive them in `HttpOnly` cookies. The public user payload never includes a password hash.

## Security and session behavior

- Passwords are hashed with Node.js `scrypt` using a random per-password salt; new/reset passwords must be 12–128 characters.
- Access JWTs expire after 15 minutes. Refresh tokens are random opaque 256-bit values, expire after 30 days, rotate on each refresh and are stored only as SHA-256 hashes.
- Password reset tokens are random, one-time, expiring tokens; only their SHA-256 hashes are stored. A password reset revokes all active refresh sessions for that user.
- Login errors are generic to reduce account enumeration. Forgot-password uses the same public response whether or not the account exists.
- Mutating auth requests validate the `Origin` header when present against `FRONTEND_URL`. CORS is configured for that single origin with credentials enabled.
- Cookies default to `HttpOnly`, `SameSite=Lax`, and `Secure=false` for local HTTP development. Set `AUTH_COOKIE_SECURE=true` in HTTPS deployment. `SameSite=None` requires secure cookies.
- `GET /auth/me` accepts either a Bearer access token or the `presaleee_access` HttpOnly cookie. Browser clients should send credentialed requests; non-browser clients may use the Bearer form if they obtain their own token through a separately agreed client contract.
- Deploy a shared rate limiter (API gateway/Redis) for login, refresh, forgot-password, and reset-password before public production exposure. No in-memory limiter was added because it is unsafe across multiple backend instances.

## Database migration

`src/database/migrations/005_auth_sessions_and_credentials.sql` adds a nullable `users.password_hash` column plus `auth_refresh_tokens` and `auth_password_reset_tokens`. It is additive and preserves existing user rows.

Apply this migration with:

```bash
cd backend
npm run db:migrate:auth
```

The runner tracks migration 005 in `schema_migrations` and applies only that migration; it intentionally does not execute older RAG migrations, including migration 003 which truncates knowledge data.

Existing accounts have no password hash until a trusted provisioning/invitation process sets one; they cannot sign in with this local-password flow before that step. No default password is seeded.

## Environment variables

Add these to `backend/.env` (see `.env.example`):

| Variable | Required | Description |
| --- | --- | --- |
| `JWT_ACCESS_SECRET` | Yes | Random secret of at least 32 bytes, used to sign access JWTs. |
| `AUTH_COOKIE_SECURE` | Recommended in production | `true` when serving HTTPS. |
| `AUTH_COOKIE_SAME_SITE` | No | `lax` by default; supported values: `strict`, `lax`, `none`. |
| `FRONTEND_URL` | No | Allowed browser origin; defaults to `http://localhost:5173`. |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | No | Reset link lifetime, 5–1440 minutes; defaults to 30. |

The backend now fails at startup when `DATABASE_URL` or a valid `JWT_ACCESS_SECRET` is missing. Generate a secret locally with a cryptographically secure random generator; do not commit it.

## Files changed

- `src/domain/entities/AuthUser.ts`, `src/domain/repositories/IAuthRepository.ts`
- `src/application/services/AuthTokenService.ts`, `src/application/use-cases/AuthUseCases.ts`
- `src/infrastructure/database/repositories/PostgresAuthRepository.ts`
- `src/presentation/controllers/AuthController.ts`, `src/presentation/routes/authRoutes.ts`, `src/presentation/middlewares/requireAuth.ts`
- `src/database/migrations/005_auth_sessions_and_credentials.sql`, `src/database/runAuthMigration.ts`
- `src/container.ts`, `src/presentation/routes/index.ts`, `src/index.ts`, `src/infrastructure/config/env.ts`
- `package.json`, `.env.example`

## Validation and known gaps

- Run `npm run build` in `backend/` to type-check the implementation.
- The database migration must be applied before auth endpoints can query the new columns/tables.
- No mail provider is configured: production forgot-password requests do not yet send email. Wire a mail service before exposing password recovery to end users.
- The current database schema has no password provisioning endpoint; use an administrator-controlled seed/invitation flow to establish initial password hashes.
- The frontend must send `credentials: 'include'` for browser requests that use auth cookies and call `/auth/refresh` after an expired access token; this backend work does not modify the frontend.
- Rate limiting and a security-focused integration test suite remain deployment follow-ups.
