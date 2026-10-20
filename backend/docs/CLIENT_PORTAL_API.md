# Client Portal API

Base path: `/api/v1`. Internal staff use the normal employee access token to issue/revoke sessions and manage materials. Clients use a separate opaque portal access token in `Authorization: Bearer <accessToken>`; employee JWTs do not grant client portal access.

## Client session lifecycle

| Method and endpoint | Authentication | Purpose |
| --- | --- | --- |
| `POST /portal/sessions` | Employee access token | Create a proposal-scoped client session. |
| `DELETE /portal/sessions/:sessionId` | Employee access token | Revoke an active client session immediately. |

Example request:

```json
{
  "proposalId": "00000000-0000-4000-8000-000000000000",
  "clientEmail": "client@example.com",
  "clientName": "Alex Nguyen",
  "expiresInHours": 168
}
```

Sessions can be issued only for `APPROVED`, `SENT_TO_CLIENT`, or `ACCEPTED` proposals. Creating the first session for an `APPROVED` proposal atomically moves it to `SENT_TO_CLIENT` and records an audit event; only `ADMIN` and `PRESALE_LEAD` can trigger that transition. Other allowed staff roles can create additional sessions after it is sent. Expiration defaults to 168 hours and is bounded to 1–720 hours. The response includes a random one-time `accessToken`; only its SHA-256 hash is stored. Keep the raw token private and deliver it to the intended client over a secure channel.

## Client-facing endpoints

Each route below requires a valid, unexpired, unrevoked session whose proposal ID matches the URL.

| Method and endpoint | Purpose |
| --- | --- |
| `GET /portal/proposals/:proposalId` | Return client-shareable proposal fields and sheets. Internal lead/org/user fields are omitted. |
| `POST /portal/proposals/:proposalId/questions` | Answer a client question from shared proposal sheets and return sheet citations. |
| `GET /portal/proposals/:proposalId/comments` | Return up to the latest 500 comments for this proposal. |
| `POST /portal/proposals/:proposalId/comments` | Add a client comment/question. |
| `GET /portal/proposals/:proposalId/materials` | List only materials marked `is_shared=true`. |
| `GET /portal/proposals/:proposalId/export-pdf` | Download the proposal PDF. |

Question body: `{ "question": "Does the proposal include a migration rehearsal?" }`. The answer is constrained to the proposal sheets and citations identify the relevant sheet names. It does not retrieve internal lead/RFP data or non-shared Knowledge Vault material.

Comment body: `{ "authorName": "Alex Nguyen", "body": "Could you clarify the support hours?" }`. `authorName` is optional and defaults to the session client name or email. The authenticated session email is used as the author email. Body is limited to 5,000 characters.

## Internal shared material management

The client materials list requires explicit rows, so staff can register or remove materials with:

| Method and endpoint | Purpose |
| --- | --- |
| `GET /proposals/:proposalId/portal-materials` | List every material on the proposal, shared or not, with `isShared` and `createdBy`. |
| `GET /proposals/:proposalId/portal-sessions` | List client sessions with `revokedAt`, `lastAccessedAt`, `createdAt` and the client's `commentCount`. |
| `POST /proposals/:proposalId/portal-materials` | Register an HTTPS file URL and metadata; defaults to not shared. |
| `DELETE /proposals/:proposalId/portal-materials/:materialId` | Remove the material from the proposal portal. |

Both reads require an employee access token, an organization claim, and a proposal that exists in the caller's organization (otherwise `404`). They return staff-only projections: session rows never include the stored token hash, and the material list is the staff view — the client-facing `GET /portal/proposals/:proposalId/materials` still returns only `is_shared=true` rows.

Create body fields: `title`, `fileName`, and `fileUrl` (required); `description`, `mimeType`, and `isShared` (optional). Only authorized proposal staff may manage materials. The API stores a URL and metadata; it does not upload the file or create signed URLs. For private object storage, supply a short-lived signed HTTPS URL and refresh it through the storage integration before it expires.

## Database and verification

Migration `src/database/migrations/007_client_portal.sql` creates proposal-scoped sessions, comments, and explicitly shared materials. Sessions are hashed, expire, can be revoked, and are constrained to one proposal and organization. Session issuance, proposal status transition, and audit logging are transactional. Client-facing routes never trust an employee JWT as a portal credential.

The existing PDF exporter is reused; it renders proposal text with a built-in font and may replace unsupported characters with `?`. Apply migration 007 before deploying. Run `npm run build` from `backend` for TypeScript verification; no DB integration test was run as part of this implementation.
