# Dashboard API Implementation

Overview/dashboard endpoints have been added to the Express + TypeScript + PostgreSQL backend. They read existing lead and proposal data and return organization-scoped aggregates.

## Endpoints

All endpoints use `/api/v1` and require the authenticated user to have an `organizationId` claim. `requireAuth` and `requireOrganization` middleware are applied to the dashboard router.

| Method | Endpoint | Query | Purpose |
| --- | --- | --- | --- |
| `GET` | `/dashboard/overview` | `leadLimit` (default 8, max 50) | Returns KPIs, pipeline grouped by lead status, proposal estimates separated by currency, and a short active-lead list. |
| `GET` | `/dashboard/leads` | `limit` (default 20, max 100) | Returns active leads ordered by latest update, with client name, BANT score, status, owner ID and timestamps. |
| `GET` | `/dashboard/activity` | `limit` (default 20, max 100) | Returns a recent feed of lead/proposal creation and last-update events. |

Example:

```text
GET /api/v1/dashboard/overview?leadLimit=10
GET /api/v1/dashboard/leads?limit=25
GET /api/v1/dashboard/activity?limit=15
```

## Overview response

```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalLeads": 18,
      "activeLeads": 12,
      "qualifiedLeads": 5,
      "proposalsInProgress": 3,
      "estimatedValueByCurrency": [
        { "currency": "USD", "amount": 450000 }
      ]
    },
    "pipeline": [
      {
        "status": "NEW",
        "count": 4,
        "estimatedValueByCurrency": []
      },
      {
        "status": "PROPOSAL_DRAFTING",
        "count": 3,
        "estimatedValueByCurrency": [
          { "currency": "USD", "amount": 450000 }
        ]
      }
    ],
    "activeLeads": [],
    "generatedAt": "2026-10-19T00:00:00.000Z"
  }
}
```

Pipeline includes every supported lead status, even when its count is zero. Proposal `total_cost` is joined through `lead_id`; values are grouped by currency and never combined across currencies. Unlinked proposals still contribute to the overall estimated value KPI but cannot be attributed to a lead pipeline stage. Rejected proposals are excluded from estimates.

KPI definitions:

- `totalLeads`: all leads in the authenticated organization.
- `activeLeads`: leads whose status is not `WON`, `LOST`, or `REJECTED`.
- `qualifiedLeads`: leads in `QUALIFIED`, `PROPOSAL_DRAFTING`, or `APPROVED`.
- `proposalsInProgress`: proposals in `DRAFT` or `IN_REVIEW`.
- `estimatedValueByCurrency`: sum of non-null `total_cost` from proposals except `REJECTED`, grouped by currency.

## Activity feed behavior

The existing schema has `audit_logs`, but current lead/proposal writes do not record those events. To avoid pretending status history exists, this endpoint synthesizes `*_CREATED` and `*_UPDATED` entries from each entity's `created_at` and `updated_at` timestamps and shows the entity's current status. An update event is emitted when `updated_at` is more than one second later than `created_at`.

This is a recent-entity activity feed, not an immutable history of every status transition. If the UI needs exact actor, previous status, new status, or every review decision, the write use cases must start writing audit events and the endpoint should be changed to read `audit_logs`.

## Data isolation and validation

- Organization scope comes from the verified auth token, never from a query parameter.
- Every aggregate and listing query filters by `organization_id`; client joins also require matching organization.
- All SQL values are parameterized.
- Limits are validated as integers and bounded to prevent unbounded dashboard queries.
- Responses use the existing `{ success, data, meta? }` envelope.

## Files changed

- `src/domain/entities/Dashboard.ts`, `src/domain/repositories/IDashboardRepository.ts`
- `src/infrastructure/database/repositories/PostgresDashboardRepository.ts`
- `src/application/use-cases/DashboardUseCases.ts`
- `src/presentation/controllers/DashboardController.ts`, `src/presentation/routes/dashboardRoutes.ts`, `src/presentation/routes/index.ts`
- `src/container.ts`, `src/index.ts`

## Validation run

- `npm run build` — TypeScript compilation passed.
- `git diff --check` — passed.
- No live PostgreSQL request was run as part of this change.
