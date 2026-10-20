# Audit Log API

Base path: `/api/v1`. Requires an employee access token plus an organization claim, and the role must be `ADMIN` or `PRESALE_LEAD`.

| Method and endpoint | Authorization | Purpose |
| --- | --- | --- |
| `GET /audit-logs` | `ADMIN`, `PRESALE_LEAD` | Read the organization's activity trail. |

The endpoint is read-only by design — audit rows are written by use cases in the same transaction as the change they describe, and no HTTP surface may create, edit or delete them.

## Query parameters

| Parameter | Meaning |
| --- | --- |
| `action` | Exact action code, e.g. `CLIENT_CREATED`, `PRICING_APPLIED`. |
| `entityType` | `client`, `rate_card`, `proposal`, `user` |
| `entityId` | UUID of the affected record. |
| `actorId` | UUID of the user whose action produced the entry. |
| `resultStatus` | `SUCCESS` or `FAILED`. |
| `from`, `to` | ISO-8601 timestamps bounding `created_at`. |
| `page`, `limit` | Offset pagination; default `page=1`, `limit=50`, maximum `limit=200`. |

Response uses the standard envelope: `data` is the list newest-first, `meta` carries `{ total, page, limit, totalPages }`. Each entry exposes `id`, `organizationId`, `userId`, `actorName`, `action`, `entityType`, `entityId`, `payload`, `resultStatus` and `createdAt`. `actorName` is resolved with a single `LEFT JOIN users`, so listing a page of entries is one query rather than N.

## Recorded actions

New modules write `CLIENT_CREATED` / `CLIENT_UPDATED` / `CLIENT_DELETED`, `RATE_CARD_CREATED` / `RATE_CARD_UPDATED` / `RATE_CARD_DELETED`, `PRICING_CALCULATED` / `PRICING_APPLIED`, and `USER_REGISTERED` / `USER_CREATED` / `USER_UPDATED` / `USER_PROFILE_UPDATED` / `USER_PASSWORD_CHANGED`. Existing repositories contribute `PROPOSAL_STATUS_CHANGED`, `PROPOSAL_SUBMITTED_FOR_REVIEW`, `PROPOSAL_SHARED_WITH_CLIENT`, `CLIENT_PORTAL_SESSION_CREATED` and `CLIENT_PORTAL_SESSION_REVOKED`. Leads and meetings do not emit audit rows yet.

`payload` stores only non-sensitive metadata (changed field names, totals, role or email of the target). Passwords, password hashes, JWTs and portal tokens are never written to the audit trail.

## Database

Migration `src/database/migrations/008_reference_data_and_audit_indexes.sql` adds `idx_audit_logs_org_created`, `idx_audit_logs_org_entity` and `idx_audit_logs_org_action` so the default "newest first for this organization" read and the entity/action filters stay indexed. Apply it before deploying.
