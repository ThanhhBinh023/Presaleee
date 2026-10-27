# Lead and RFP Intake API Implementation

Implemented for the Express + TypeScript + PostgreSQL backend. All routes are mounted under `/api/v1` and require a valid auth session whose token contains an organization ID.

## Endpoints

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `POST` | `/leads/intake/analyze` | Analyze free-form RFP text with AI and return an unsaved normalized draft plus missing-information questions. |
| `POST` | `/leads` | Persist a reviewed draft with its title, source, RFP text and editable extracted metadata. Starts in `NEW`. |
| `GET` | `/leads` | List organization leads with `page`, `limit`, `status`, `source`, `search`, and `assignedTo` filters. |
| `GET` | `/leads/:id` | Return complete lead including raw RFP, extracted metadata and latest BANT result. |
| `PATCH` | `/leads/:id` | Update `title`, `clientId`, `assignedTo`, `source`, `rawRfpContent`, and/or `extractedMetadata`. |
| `PATCH` | `/leads/:id/status` | Apply a validated workflow transition. Approving requires a saved qualification score. |
| `DELETE` | `/leads/:id` | Permanently delete the organization-scoped lead; dependent meetings cascade per the existing schema. |
| `POST` | `/leads/:id/qualifications` | Run AI BANT/feasibility assessment (task mode 4), validate the result and save it to `bant_score`/`bant_details`. |
| `GET` | `/leads/:id/qualifications/latest` | Return the latest saved qualification or 404 if none exists. |

## Request examples

### Analyze RFP (unsaved draft)

```json
POST /api/v1/leads/intake/analyze
{
  "rawRfpContent": "The customer needs an offline-capable retail POS and inventory synchronization.",
  "source": "MANUAL"
}
```

### Save reviewed draft

```json
POST /api/v1/leads
{
  "title": "Offline Retail POS",
  "source": "MANUAL",
  "rawRfpContent": "The customer needs an offline-capable retail POS and inventory synchronization.",
  "extractedMetadata": {
    "clientIndustry": "Retail",
    "businessGoal": "Support sales during outages and sync inventory afterward.",
    "timelineWeeks": 20,
    "budgetUsd": null,
    "targetPlatforms": ["Web", "Android"],
    "coreFunctionalModules": ["Offline POS", "Inventory sync"]
  },
  "clientId": null,
  "assignedTo": null
}
```

`organizationId` and `createdBy` are taken from the authenticated user, never from request JSON. The request supports `clientId`/`assignedTo` UUIDs; those fields should refer to rows in the same organization. The current schema does not define an invitation/assignee lookup endpoint.

### List and filters

```text
GET /api/v1/leads?page=1&limit=20&status=NEW&source=MANUAL&search=retail&assignedTo=<uuid>
```

List responses omit `rawRfpContent` and `bantDetails`; use the detail endpoint to load those fields. Search is parameterized and escapes `%`, `_`, and backslash wildcard characters.

### Change status

```json
PATCH /api/v1/leads/<lead-id>/status
{
  "status": "IN_REVIEW"
}
```

Supported status values: `NEW`, `IN_REVIEW`, `QUALIFYING`, `QUALIFIED`, `PROPOSAL_DRAFTING`, `APPROVED`, `REJECTED`, `WON`, `LOST`.

Allowed transitions:

- `NEW` → `IN_REVIEW`, `QUALIFYING`, `REJECTED`
- `IN_REVIEW` → `QUALIFYING`, `APPROVED`, `REJECTED`
- `QUALIFYING` → `QUALIFIED`, `IN_REVIEW`, `REJECTED`
- `QUALIFIED` → `APPROVED`, `PROPOSAL_DRAFTING`, `REJECTED`
- `PROPOSAL_DRAFTING` → `APPROVED`, `REJECTED`
- `APPROVED` → `PROPOSAL_DRAFTING`, `REJECTED`
- `REJECTED` and `LOST` → `IN_REVIEW`
- `WON` is terminal.

The database operation also checks `organization_id`, the current status, and the existence of a BANT score for `APPROVED`.

## Qualification response

`POST /api/v1/leads/:id/qualifications` calls the configured AI service with task mode 4. It expects JSON with a total score and four criteria, each scored 0–25; the total must equal their sum. Invalid or malformed AI output is rejected and is not stored.

```json
{
  "success": true,
  "data": {
    "score": 76,
    "recommendation": "QUALIFY",
    "summary": "The need is clear; budget and authority need confirmation.",
    "criteria": {
      "budget": { "score": 16, "maxScore": 25, "assessment": "Budget is not confirmed.", "evidence": [] },
      "authority": { "score": 15, "maxScore": 25, "assessment": "Decision maker is not named.", "evidence": [] },
      "need": { "score": 24, "maxScore": 25, "assessment": "Requirements are detailed.", "evidence": ["Offline POS"] },
      "timeline": { "score": 21, "maxScore": 25, "assessment": "A delivery window is stated.", "evidence": [] }
    },
    "risks": ["Budget confirmation pending"],
    "nextSteps": ["Confirm approved budget"],
    "evaluatedAt": "2026-10-19T00:00:00.000Z"
  }
}
```

The result is stored in the existing `leads.bant_score` and `leads.bant_details` columns. Re-running qualification replaces the latest result; this schema does not retain historical qualification versions.

## Security and data behavior

- Every lead endpoint, including RFP analysis, requires authentication and an organization claim. Missing organization returns 403.
- Every repository read/write filters by the organization derived from auth claims, preventing cross-tenant ID access; a lead in another tenant appears as 404.
- All SQL values are parameterized. UUIDs, source/status enums, title/body length, page and limit are validated at the application boundary.
- AI input is explicitly treated as untrusted data in the prompt. AI JSON is parsed and schema-checked before DB writes.
- Delete is permanent. Consider adding soft-delete/audit history if product policy requires retention.
- Success responses use the existing `{ success, data, meta? }` envelope. Errors use the existing `{ success: false, error, statusCode }` handler.

## Database changes

No new migration is required by these endpoints; they use the existing `leads` and `clients` tables. Existing `001_initial_schema.sql` creates both. The most recent auth migration is additive and unrelated to the lead schema.

## Files changed

- `src/domain/entities/Lead.ts`, `src/domain/repositories/ILeadRepository.ts`
- `src/application/dtos/LeadDTO.ts`, `src/application/use-cases/LeadUseCases.ts`
- `src/infrastructure/database/repositories/PostgresLeadRepository.ts`
- `src/presentation/controllers/LeadIntakeController.ts`, `src/presentation/routes/leadIntakeRoutes.ts`, `src/presentation/middlewares/requireAuth.ts`
- `src/container.ts`

## Validation run and known gaps

- `npm run build` — TypeScript compilation passed.
- End-to-end database/AI requests were not run in this environment.
- `POST /leads/intake/analyze` now requires auth and an organization claim; this differs from the previously public unsaved analysis endpoint.
- Qualification history is not retained; only the latest result is stored.
- The UI's displayed sample score/details must be replaced with this response, and the client must send `credentials: 'include'` as documented in `AUTH_API_IMPLEMENTATION.md`.
- No shared rate limiter was added. Configure a gateway/Redis rate limiter for analyze and qualification endpoints before public production deployment.
