# Proposal Builder API implementation

Base path: `/api/v1`. All proposal endpoints require a valid access token and an organization on the authenticated account. Proposal reads and writes are scoped to that organization; IDs from another organization return not found.

## Endpoints

| Method and endpoint | Behavior |
| --- | --- |
| `POST /proposals` | Create a `DRAFT` proposal. Uses the standard 10 empty sheets if `initialSheets` is omitted. |
| `POST /leads/:leadId/proposals` | Create a draft linked to a lead in the same organization. The lead must be `QUALIFIED`, `APPROVED`, or `PROPOSAL_DRAFTING`. Seeds known lead metadata into Overview and Scope. Optional body: `{ "title": "..." }`. |
| `GET /proposals` | Organization-scoped list. Supports `page`, `limit` (1–100), `status`, and `search`; returns `data` and pagination `meta`. |
| `GET /proposals/:id` | Read proposal plus its sheets. |
| `PATCH /proposals/:id` | Update proposal metadata, or change `status` in a separate request. |
| `PUT /proposals/:id/sheets/:sheetName` | Save a known sheet as `{ "sheetData": { ... } }`. Only `DRAFT` proposals are editable. |
| `POST /proposals/:id/generate` | Generate selected sheets or all 10 when `sheetNames` is omitted. Body may contain `sheetNames` and `instructions`. Returns generated sheets and RAG source excerpts. |
| `POST /proposals/:id/sheets/:sheetName/generate` | Generate one known sheet. Optional body: `{ "instructions": "..." }`. |
| `GET /proposals/:id/export-excel` | Download Excel workbook. |
| `GET /proposals/:id/export-pdf` | Download PDF document. |
| `DELETE /proposals/:id` | Delete the proposal and its dependent sheets according to the database foreign-key policy. |

Standard sheet names: `Overview`, `Scope of Work`, `Architecture & Tech Stack`, `Timeline & Milestones`, `Team & Rate Cards`, `Pricing & Quotation`, `Assumptions & Dependencies`, `Risk Management (RAID)`, `SLA & Maintenance`, `Appendices & Case Studies`.

### Create proposal request

```json
{
  "title": "Example delivery proposal",
  "version": "v1.0",
  "currency": "USD",
  "totalCost": null,
  "estimatedTimelineWeeks": null,
  "initialSheets": [
    { "sheetName": "Overview", "sheetOrder": 1, "sheetData": {} }
  ]
}
```

`organizationId`, `createdBy`, `leadId`, and status are set by the backend/authenticated context; client-supplied ownership values are ignored. Currency must be a three-letter uppercase ISO code. Sheet names must be known and unique.

### Status lifecycle

| Current status | Allowed next status |
| --- | --- |
| `DRAFT` | `IN_REVIEW`, `REJECTED` |
| `IN_REVIEW` | `DRAFT`, `APPROVED`, `REJECTED` |
| `APPROVED` | `IN_REVIEW`, `SENT_TO_CLIENT`, `REJECTED` |
| `SENT_TO_CLIENT` | `ACCEPTED`, `REJECTED` |
| `REJECTED` | `DRAFT` |
| `ACCEPTED` | none |

Transitions to `APPROVED`, `REJECTED`, `SENT_TO_CLIENT`, or `ACCEPTED` require `ADMIN` or `PRESALE_LEAD`. Status changes are conditional on the previously read status and are recorded in `audit_logs` in the same transaction. Metadata and status cannot be changed together. Sheet edits and generation are allowed only while the proposal is `DRAFT`.

## Generation and exports

Generation invokes the configured LLM gateway and organization-scoped hybrid RAG search. The prompt treats RFP and retrieved text as data, directs the model not to invent client facts or commitments, and asks for unknown values to remain empty/null. Each generated sheet is saved transactionally with its parent totals (where applicable). If generation fails partway through a multi-sheet request, earlier sheets may already have been saved; callers should inspect the response/error and reload the proposal before retrying.

Excel export uses the existing workbook exporter. PDF export is a basic readable text rendering of all proposal sheets using a built-in PDF font; unsupported/non-ASCII characters are replaced with `?`, and it is not a branded or pixel-perfect client template.

## Database and verification

The existing PostgreSQL `proposals`, `proposal_sheets`, and `audit_logs` tables are used. Sheet writes and status transitions use database transactions. No schema migration was required for these endpoints. To run the TypeScript build, use `npm run build` from `backend`. The existing database verification script `src/scripts/testProposalSprint1.ts` now requires `TEST_ORGANIZATION_ID` and `TEST_USER_ID` and writes a temporary proposal to the configured database; it was not run as part of this implementation.
