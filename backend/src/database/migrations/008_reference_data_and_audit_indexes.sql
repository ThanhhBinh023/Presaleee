-- ==============================================================================
-- 008: Reference-data hardening for Clients, Rate Cards, and Audit Logging.
-- ==============================================================================

-- Monthly rate is what staffing sheets and quotations compute against.
ALTER TABLE rate_cards ADD COLUMN IF NOT EXISTS monthly_rate_usd NUMERIC(12, 2);

-- Derive the seeded monthly rate from the daily rate so existing workspaces
-- keep pricing without manual re-entry (21 billable days per month).
UPDATE rate_cards
SET monthly_rate_usd = ROUND(daily_rate_usd * 21, 2)
WHERE monthly_rate_usd IS NULL;

-- One card per role/level/currency inside an organization.
CREATE UNIQUE INDEX IF NOT EXISTS uq_rate_cards_org_role_level_currency
  ON rate_cards (organization_id, lower(role_name), level, currency);
CREATE INDEX IF NOT EXISTS idx_rate_cards_org_active
  ON rate_cards (organization_id, is_active, role_name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_org_company
  ON clients (organization_id, lower(company_name));
CREATE INDEX IF NOT EXISTS idx_clients_org_created
  ON clients (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON audit_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_entity
  ON audit_logs (organization_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_action
  ON audit_logs (organization_id, action, created_at DESC);
