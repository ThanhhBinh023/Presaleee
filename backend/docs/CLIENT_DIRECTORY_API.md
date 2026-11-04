# Client Directory API

Base path: `/api/v1`. All routes require an employee access token (`presaleee_access` cookie) and an organization claim. Reads are open to every authenticated member of the organization; writes are restricted to `ADMIN` and `PRESALE_LEAD`.

## Endpoints

| Method and endpoint | Authorization | Purpose |
| --- | --- | --- |
| `GET /clients` | Any member | Paginated client list. |
| `POST /clients` | `ADMIN`, `PRESALE_LEAD` | Create a client. Returns `201` with `Location`. |
| `GET /clients/:id` | Any member | Return one client. |
| `GET /clients/:id/leads` | Any member | Leads that reference this client (paginated). |
| `PATCH /clients/:id` | `ADMIN`, `PRESALE_LEAD` | Partial update. |
| `DELETE /clients/:id` | `ADMIN`, `PRESALE_LEAD` | Delete a client. Returns `204`. |

## Query parameters for `GET /clients`

`search` (case-insensitive match on company name, contact person or contact email), `industry`, `page` (default `1`, max `100000`), `limit` (default `20`, max `100`). Responses use the standard envelope with `meta: { total, page, limit, totalPages }`.

## Create and update body

```json
{
  "companyName": "Fintech Corp",
  "industry": "Fintech",
  "contactPerson": "Alex Nguyen",
  "contactEmail": "alex@fintechcorp.example",
  "contactPhone": "+84 900 000 000",
  "country": "Vietnam"
}
```

`companyName` is required (max 255 characters). `industry` must be one of: `Retail`, `Fintech`, `Healthcare`, `Logistics`, `Manufacturing`, `Education`, `Real Estate`, `Government`, `Telecom`, `Other`; send `null` or omit to clear it. `country` defaults to `Vietnam` and is validated as a 2–100 character name. `PATCH` requires at least one editable field.

## Rules

- Clients are unique per organization and company name (`uq_clients_org_company`); a duplicate returns `409`.
- `DELETE` returns `409` while leads still reference the client, so history cannot be orphaned.
- `clientId` and `assignedTo` on lead endpoints are validated against this directory, so an unknown or cross-organization UUID returns `400` instead of a database constraint error.
- Every create, update and delete writes an `audit_logs` row (`CLIENT_CREATED`, `CLIENT_UPDATED`, `CLIENT_DELETED`).

## Database

Migration `src/database/migrations/008_reference_data_and_audit_indexes.sql` adds the `clients` uniqueness constraint and the `idx_clients_org_created` index. Apply it before deploying.
