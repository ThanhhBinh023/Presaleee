# User Directory and Self-Service Registration API

Base path: `/api/v1`. Authentication uses the `presaleee_access` HttpOnly cookie issued by `/auth`. Roles are `ADMIN`, `PRESALE_LEAD`, `SOLUTION_ARCHITECT`, `SALES_REP`, `VIEWER`; statuses are `ACTIVE`, `INVITED`, `DEACTIVATED`.

## Endpoints

| Method and endpoint | Authorization | Purpose |
| --- | --- | --- |
| `POST /auth/register` | Public (CSRF origin checked) | Create an organization and its first `ADMIN` user. |
| `GET /users/me/organizations` | Any authenticated user | Organizations the current user belongs to. |
| `PATCH /users/me` | Any authenticated user | Update own profile or password. |
| `GET /users` | Any authenticated user | Member directory of the caller's organization. |
| `GET /users/:id` | Any authenticated user | One member. |
| `POST /users` | `ADMIN`, `PRESALE_LEAD` | Add a member to the caller's organization. |
| `PATCH /users/:id` | `ADMIN`, `PRESALE_LEAD` | Change a member's name, role or status. |

## Self-service registration

```json
{
  "email": "lead@example.com",
  "password": "Str0ngPassphrase!",
  "fullName": "Minh Nguyen",
  "organizationName": "Acme Presale",
  "organizationDomain": "acme.example"
}
```

`organizationDomain` is optional. The organization row and the `ADMIN` user are inserted in one transaction, so a partial registration cannot be left behind. A taken email returns `409`.

The response is `201` with `data: { user, organization }` and sets the access cookie. **No refresh token is issued at registration** — the client must call `POST /auth/login` to obtain a durable 30-day session. The access token carries the role claim, so a role change only takes effect when the token is reissued (within 15 minutes).

## Self-service profile update

`PATCH /users/me` accepts `fullName`, `avatarUrl`, and a password change as `{ "password": "...", "currentPassword": "..." }`. `currentPassword` is mandatory when changing the password and a wrong value returns `401`. Changing the password revokes every stored refresh session for the user, forcing re-login elsewhere. Role and status are not editable here.

## Member directory

Query parameters for `GET /users`: `search`, `role`, `status`, `page`, `limit` (default 50, max 100). Add `allOrganizations=true` to browse every organization the current user belongs to; that flag is honored for `ADMIN` only and otherwise returns `403`. Without it, and in every other case, the query stays scoped to the caller's organization. Responses expose the directory projection — never `password_hash` or refresh tokens.

`POST /users` body: `email`, `fullName`, `password` (required, strength-validated), `role` (optional, defaults to `VIEWER`). The email must be globally unique.

`PATCH /users/:id` accepts `fullName`, `role`, `status`. Guards:
- A user may not change their own role or status (`400`) — privilege changes must come from another administrator.
- A change that would leave the organization without an active `ADMIN` returns `409`.
- Setting `status` to `DEACTIVATED` revokes the member's refresh sessions immediately.

## Audit trail

`USER_REGISTERED`, `USER_CREATED`, `USER_UPDATED`, `USER_PROFILE_UPDATED` and `USER_PASSWORD_CHANGED` events are written to `audit_logs`; read them through `GET /audit-logs` (see `AUDIT_LOG_API.md`).
