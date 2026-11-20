-- One proposal per lead: blocks duplicate creation (React StrictMode double-POST, retries).
-- Deduplicate: keep newest updated_at per lead BEFORE applying this index.
DELETE FROM proposals p
WHERE p.lead_id IS NOT NULL
  AND p.id NOT IN (
    SELECT DISTINCT ON (lead_id) id
    FROM proposals
    WHERE lead_id IS NOT NULL
    ORDER BY lead_id, updated_at DESC, created_at DESC
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_proposals_lead_id
ON proposals (lead_id)
WHERE lead_id IS NOT NULL;
