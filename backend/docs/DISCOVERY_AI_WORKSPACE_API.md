# Discovery Meeting and AI Workspace API

Base path: `/api/v1`. All endpoints require an access token and organization. Meeting access is tenant-scoped through the meeting's lead. Transcript input currently accepts plain text; audio/video upload and speech-to-text are not implemented.

## Discovery meetings

| Method and endpoint | Purpose |
| --- | --- |
| `GET /leads/:leadId/meetings` | List meetings for a lead in the authenticated organization. |
| `POST /leads/:leadId/meetings` | Create an `OPEN` meeting with title, date, and attendees. |
| `GET /meetings/:meetingId` | Read meeting lifecycle, attendees, transcript, notes, decisions, actions, open questions, gaps, and technical summary. |
| `POST /meetings/:meetingId/transcript` | Replace or append transcript text. Transcript edits are accepted only while `OPEN`. |
| `POST /meetings/:meetingId/analyze` | Generate summary, technical summary, decisions, action items, open questions, and gap analysis. Saves results and updates lead discovery context. |
| `PATCH /meetings/:meetingId/status` | Change status according to the meeting lifecycle. |

### Create a meeting

```json
{
  "title": "Cloud architecture discovery",
  "meetingDate": "2026-10-19T09:30:00Z",
  "attendees": [
    { "name": "Alex Nguyen", "email": "alex@example.com", "role": "CTO" }
  ]
}
```

### Save transcript

`POST /meetings/:meetingId/transcript` accepts `{ "transcript": "...", "append": false }`. The `content` property is also accepted as an alias for `transcript`. Set `append: true` to append the supplied text to an existing transcript. Maximum transcript length per request is 500,000 characters. Saving changed transcript clears old analysis so it cannot be mistaken for current results.

### Analyze

`POST /meetings/:meetingId/analyze` needs no body and requires an existing transcript. It uses lead intake metadata and up to five previously inspected meeting summaries as context. The result is stored in the meeting, lifecycle status becomes `INSPECTED`, and the matching meeting insight is upserted into `leads.extracted_metadata.discoveryInsights` in the same transaction. The analysis is constrained to the transcript and known lead context; unknown owners/dates remain null.

### Lifecycle

| Current | Allowed via status endpoint | Analysis behavior |
| --- | --- | --- |
| `OPEN` | `LOCKED` | Analysis changes it to `INSPECTED`. |
| `LOCKED` | `OPEN` | Analysis can inspect it and set `INSPECTED`. |
| `INSPECTED` | `OPEN` | Analysis may be rerun; successful analysis keeps it `INSPECTED`. |

`INSPECTED` is set only by successful analysis. Reopening changes status to `OPEN`, which allows transcript edits.

## Proposal editor and review

| Method and endpoint | Purpose |
| --- | --- |
| `POST /proposals/:id/sections/:sectionName/regenerate` | Regenerate one standard proposal sheet using lead RFP/metadata, up to five inspected discovery summaries, and organization-scoped Knowledge Vault results. Saves the sheet. |
| `POST /proposals/:id/submit-review` | Submit a `DRAFT` proposal, transition it to `IN_REVIEW`, and atomically add a `PROPOSAL_SUBMITTED_FOR_REVIEW` audit event. |

The section name must match one of the standard proposal sheet names (URL-encode spaces and punctuation). Optional body: `{ "instructions": "..." }`. Section regeneration is allowed only for `DRAFT` proposals. Review submission is allowed only from `DRAFT`; repeated submission or concurrent status changes return a conflict.

## Database

Migration `src/database/migrations/006_discovery_meetings.sql` adds meeting attendees, lifecycle state, structured analysis fields, timestamps, and indexes. Apply it before deploying these routes. Meeting rows are associated with the lead's organization, and analysis updates meeting and lead context transactionally. Proposal review submission updates proposal status and writes the audit record in one transaction.

Run `npm run build` from `backend` for TypeScript verification. No DB integration test was run as part of this implementation.
