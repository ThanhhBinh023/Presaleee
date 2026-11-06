-- ==============================================================================
-- G5 + G6 UI TEST SEED — Rate cards, extra leads, meetings, a quotation proposal
-- Prerequisite: chạy `G4_SEED_UI_TEST.sql` trước (org Northwind a1...0001, users, clients).
-- Dán vào Supabase SQL Editor, chạy MỘT lần. INSERT dùng ON CONFLICT DO NOTHING.
--
-- UUID:
--   e2... = rate_cards     d1...0008+ = extra leads     f1... = meetings     e3... = proposals
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. RATE CARDS (org A) — đủ level, một thẻ inactive, một thẻ EUR
--    monthly = daily * 21 khi không có monthly thương lượng.
-- ------------------------------------------------------------------------------
INSERT INTO rate_cards (id, organization_id, role_name, level, hourly_rate_usd, daily_rate_usd, monthly_rate_usd, currency, is_active) VALUES
  ('e2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Project Manager',           'LEAD',   90, 720, 15120, 'USD', TRUE),
  ('e2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Solution Architect',        'LEAD',   85, 680, 14280, 'USD', TRUE),
  ('e2000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'Senior Backend Developer',  'SENIOR', 55, 440,  9240, 'USD', TRUE),
  ('e2000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'Frontend Developer',        'MID',    40, 320,  6720, 'USD', TRUE),
  ('e2000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'QA Engineer',               'MID',    35, 280,  5880, 'USD', TRUE),
  ('e2000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000001', 'Junior Developer',          'JUNIOR', 25, 200,  4200, 'USD', TRUE),
  ('e2000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000001', 'Archived Support Engineer', 'MID',    30, 240,  5040, 'USD', FALSE),
  ('e2000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000001', 'EU Solution Architect',     'LEAD',   80, 640, 13440, 'EUR', TRUE),
  ('e2000000-0000-4000-8000-000000000101', 'a1000000-0000-4000-8000-000000000002', 'Omega Backend Engineer',    'SENIOR', 50, 400,  8400, 'USD', TRUE)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. EXTRA LEADS — QUALIFIED (để tạo proposal), QUALIFYING (để chạy BANT),
--    PROPOSAL_DRAFTING. G4 đã seed NEW / IN_REVIEW / APPROVED / WON / LOST.
-- ------------------------------------------------------------------------------
INSERT INTO leads (id, organization_id, client_id, created_by, assigned_to, title, source, status, raw_rfp_content, extracted_metadata, bant_score, bant_details) VALUES
  (
    'd1000000-0000-4000-8000-000000000008',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000004',
    'HealthFirst offline clinic suite',
    'REFERRAL',
    'QUALIFIED',
    'HealthFirst needs an offline-first clinic suite for 40 sites. Web + Android, 20 week delivery, HIPAA controls, inventory of medicines, appointment sync when the network returns.',
    '{"projectName":"Offline clinic suite","clientIndustry":"Healthcare","businessGoal":"Keep clinics selling and booking while offline.","timelineWeeks":20,"budgetUsd":420000,"targetPlatforms":["Web","Android"],"coreFunctionalModules":["Offline POS","Appointment sync"],"integrationsRequired":["HIS"],"complianceAndSecurity":["HIPAA"],"priorityLevel":"High"}'::jsonb,
    78,
    '{"score":78,"recommendation":"QUALIFY","summary":"Need and timeline are clear; budget is named; authority is a referral rather than a named buyer.","criteria":{"budget":{"score":18,"maxScore":25,"assessment":"Budget of 420k USD is stated.","evidence":["420000"]},"authority":{"score":14,"maxScore":25,"assessment":"Referral, decision maker not named.","evidence":[]},"need":{"score":24,"maxScore":25,"assessment":"Offline clinic workflow is detailed.","evidence":["Offline POS"]},"timeline":{"score":22,"maxScore":25,"assessment":"20 week window is explicit.","evidence":["20 weeks"]}},"risks":["Named buyer missing"],"nextSteps":["Confirm the CIO sponsor"],"evaluatedAt":"2026-10-21T00:00:00.000Z"}'::jsonb
  ),
  (
    'd1000000-0000-4000-8000-000000000009',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000004',
    'b1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000005',
    'Mekong yard control tower',
    'WEBSITE',
    'QUALIFYING',
    'Inbound form: real-time yard control for three river ports. Integrations with TOS unknown. Budget not confirmed.',
    '{"projectName":"Yard control tower","clientIndustry":"Logistics","businessGoal":"Live berth and truck visibility.","timelineWeeks":null,"budgetUsd":null,"targetPlatforms":["Web"],"coreFunctionalModules":["Yard map","Gate events"],"integrationsRequired":[],"complianceAndSecurity":[],"priorityLevel":"Medium"}'::jsonb,
    NULL,
    '{}'::jsonb
  ),
  (
    'd1000000-0000-4000-8000-000000000010',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000004',
    'Beta POS staffing quotation',
    'MEETING',
    'PROPOSAL_DRAFTING',
    'Follow-up after discovery: 120 stores, offline POS, 14 weeks. Ready for a priced proposal.',
    '{"projectName":"Beta POS modernization","clientIndustry":"Retail","businessGoal":"Offline-first POS across 120 outlets.","timelineWeeks":14,"budgetUsd":300000,"targetPlatforms":["Android","Web"],"coreFunctionalModules":["POS","Inventory sync"],"integrationsRequired":["ERP"],"complianceAndSecurity":["PCI-DSS"],"priorityLevel":"High"}'::jsonb,
    81,
    '{"score":81,"recommendation":"QUALIFY","summary":"Strong need and a named timeline; budget is in range.","criteria":{"budget":{"score":20,"maxScore":25,"assessment":"300k USD named.","evidence":[]},"authority":{"score":18,"maxScore":25,"assessment":"Meeting with the retail ops lead.","evidence":[]},"need":{"score":23,"maxScore":25,"assessment":"Store POS upgrade is specific.","evidence":[]},"timeline":{"score":20,"maxScore":25,"assessment":"14 weeks.","evidence":[]}},"risks":[],"nextSteps":["Price the staffing sheet"],"evaluatedAt":"2026-10-21T00:00:00.000Z"}'::jsonb
  )
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. MEETINGS — gắn vào lead APPROVED (G4 d1...0005) và lead QUALIFIED mới.
--    Cần migration 006 (cột organization_id, attendees, status).
-- ------------------------------------------------------------------------------
INSERT INTO meetings (id, lead_id, organization_id, created_by, title, meeting_date, attendees, status, raw_transcript) VALUES
  (
    'f1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000005',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000003',
    'Compliance workshop #1',
    NOW() - INTERVAL '12 days',
    '[{"name":"Le Presale Lead","email":"lead@presaleee.test","role":"PRESALE_LEAD"},{"name":"Acme CISO","role":"Buyer"}]'::jsonb,
    'INSPECTED',
    'Discussed evidence portal scope and mTLS requirements.'
  ),
  (
    'f1000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000008',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000004',
    'Clinic offline discovery',
    NOW() - INTERVAL '5 days',
    '[{"name":"Pham Solution Arch","role":"SOLUTION_ARCHITECT"}]'::jsonb,
    'OPEN',
    NULL
  )
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. PROPOSAL — để nút Apply trên máy tính giá ghi total_cost.
-- ------------------------------------------------------------------------------
INSERT INTO proposals (id, organization_id, lead_id, created_by, title, version, status, total_cost, currency, estimated_timeline_weeks) VALUES
  (
    'e3000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000010',
    'b1000000-0000-4000-8000-000000000003',
    'Beta POS staffing quotation v1',
    'v1.0',
    'DRAFT',
    NULL,
    'USD',
    14
  )
ON CONFLICT DO NOTHING;

COMMIT;

-- ------------------------------------------------------------------------------
-- 5. KIỂM TRA
-- ------------------------------------------------------------------------------
SELECT 'rate_cards org A' AS tbl, COUNT(*) FROM rate_cards WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'leads org A', COUNT(*) FROM leads WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'meetings org A', COUNT(*) FROM meetings WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'proposals org A', COUNT(*) FROM proposals WHERE organization_id = 'a1000000-0000-4000-8000-000000000001';
-- Kỳ vọng sau G4+G5/G6: rate_cards >= 8, leads >= 10, meetings >= 2, proposals >= 1

-- ------------------------------------------------------------------------------
-- 6. DỌN DẸP (cố ý comment)
-- ------------------------------------------------------------------------------
-- DELETE FROM meetings    WHERE id::text LIKE 'f1%';
-- DELETE FROM proposals   WHERE id::text LIKE 'e3%';
-- DELETE FROM rate_cards  WHERE id::text LIKE 'e2%';
-- DELETE FROM leads       WHERE id IN (
--   'd1000000-0000-4000-8000-000000000008',
--   'd1000000-0000-4000-8000-000000000009',
--   'd1000000-0000-4000-8000-000000000010'
-- );
