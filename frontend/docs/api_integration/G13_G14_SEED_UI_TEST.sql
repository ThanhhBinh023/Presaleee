-- ==============================================================================
-- G13 + G14 UI TEST SEED — fill empty pipeline stage REJECTED, bump timestamps
-- for dashboard activity UPDATED rows, and insert sample audit_logs (SQL seeds
-- do not go through use cases so they leave no audit otherwise).
-- Prerequisite: G4 then G5/G6 (leads d1...0001–0010, proposals e3...).
-- UUID: d1...0011 lead, e7 audit rows.
-- ==============================================================================

BEGIN;

INSERT INTO leads (id, organization_id, client_id, created_by, assigned_to, title, source, status, raw_rfp_content, extracted_metadata, bant_score, bant_details) VALUES
  (
    'd1000000-0000-4000-8000-000000000011',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000004',
    'b1000000-0000-4000-8000-000000000005',
    'b1000000-0000-4000-8000-000000000005',
    'Mekong rejected seasonal RFP',
    'WEBSITE',
    'REJECTED',
    'Inbound form closed after the buyer chose an incumbent TOS vendor.',
    '{"projectName":"Seasonal TOS overlay","priorityLevel":"Low"}'::jsonb,
    22,
    '{}'::jsonb
  )
ON CONFLICT DO NOTHING;

-- created_at/updated_at delta > 1s so GET /dashboard/activity emits LEAD_UPDATED
UPDATE leads
SET updated_at = NOW()
WHERE id = 'd1000000-0000-4000-8000-000000000008'
  AND updated_at <= created_at + INTERVAL '1 second';

UPDATE proposals
SET updated_at = NOW()
WHERE id = 'e3000000-0000-4000-8000-000000000001'
  AND updated_at <= created_at + INTERVAL '1 second';

INSERT INTO audit_logs (id, organization_id, user_id, action, entity_type, entity_id, payload, result_status, ip_address, created_at) VALUES
  (
    'e7000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'LEAD_CREATED',
    'lead',
    'd1000000-0000-4000-8000-000000000011',
    '{"title":"Mekong rejected seasonal RFP","source":"WEBSITE"}'::jsonb,
    'SUCCESS',
    '127.0.0.1',
    NOW() - INTERVAL '3 days'
  ),
  (
    'e7000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'LEAD_STATUS_CHANGED',
    'lead',
    'd1000000-0000-4000-8000-000000000011',
    '{"from":"NEW","to":"REJECTED"}'::jsonb,
    'SUCCESS',
    '127.0.0.1',
    NOW() - INTERVAL '2 days'
  ),
  (
    'e7000000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000003',
    'PROPOSAL_STATUS_CHANGED',
    'proposal',
    'e3000000-0000-4000-8000-000000000004',
    '{"from":"IN_REVIEW","to":"APPROVED"}'::jsonb,
    'SUCCESS',
    '127.0.0.1',
    NOW() - INTERVAL '1 days'
  ),
  (
    'e7000000-0000-4000-8000-000000000004',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000003',
    'CLIENT_PORTAL_SESSION_CREATED',
    'proposal',
    'e3000000-0000-4000-8000-000000000005',
    '{"clientEmail":"cio@acme.example.io"}'::jsonb,
    'SUCCESS',
    '127.0.0.1',
    NOW() - INTERVAL '12 hours'
  ),
  (
    'e7000000-0000-4000-8000-000000000005',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'LOGIN_REJECTED',
    'user',
    'b1000000-0000-4000-8000-000000000006',
    '{"reason":"UI fixture only — writers never emit FAILED"}'::jsonb,
    'FAILED',
    '127.0.0.1',
    NOW() - INTERVAL '6 hours'
  )
ON CONFLICT DO NOTHING;

COMMIT;

SELECT 'leads org A' AS tbl, COUNT(*)::int AS n FROM leads WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'rejected leads', COUNT(*)::int FROM leads WHERE id = 'd1000000-0000-4000-8000-000000000011'
UNION ALL SELECT 'g13 audit fixtures', COUNT(*)::int FROM audit_logs WHERE id::text LIKE 'e7%';

-- DELETE FROM audit_logs WHERE id::text LIKE 'e7%';
-- DELETE FROM leads WHERE id = 'd1000000-0000-4000-8000-000000000011';
