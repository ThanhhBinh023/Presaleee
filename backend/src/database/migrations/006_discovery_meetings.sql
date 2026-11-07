-- Discovery Meeting lifecycle and structured AI analysis.
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS open_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Populate the denormalized tenant key from the owning lead for efficient scoped access.
UPDATE meetings m
SET organization_id = l.organization_id
FROM leads l
WHERE m.lead_id = l.id AND m.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_lead_date ON meetings (lead_id, meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_organization_status ON meetings (organization_id, status);
