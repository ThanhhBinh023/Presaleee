-- 011_add_proposal_review_notes.sql
-- Store review feedback notes from Presale Lead when rejecting or requesting changes on proposal

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS review_notes TEXT;
