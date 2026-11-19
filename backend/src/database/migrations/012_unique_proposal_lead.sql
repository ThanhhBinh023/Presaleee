-- One proposal per lead: blocks duplicate creation (React StrictMode double-POST, retries).
-- Run the dedup script (keep newest updated_at per lead) BEFORE applying this index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_proposals_lead_id
ON proposals (lead_id)
WHERE lead_id IS NOT NULL;