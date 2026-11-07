-- ==============================================================================
-- G7 + G8 UI TEST SEED — Discovery meetings, proposal sheets, extra quotations
-- Prerequisite: G4_SEED_UI_TEST.sql rồi G5_G6_SEED_UI_TEST.sql
-- UUID hex only: f1 meetings, e3 proposals, e31/e32 sheets
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Extra meetings on HealthFirst QUALIFIED lead (d1...0008) and Beta POS (d1...0010)
-- ------------------------------------------------------------------------------
INSERT INTO meetings (id, lead_id, organization_id, created_by, title, meeting_date, attendees, status, raw_transcript, clean_notes, decisions, action_items, open_questions, gap_analysis, analysis, analyzed_at) VALUES
  (
    'f1000000-0000-4000-8000-000000000003',
    'd1000000-0000-4000-8000-000000000008',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000004',
    'Clinic HIS integration workshop',
    NOW() - INTERVAL '2 days',
    '[{"name":"Pham Solution Arch","role":"SOLUTION_ARCHITECT"},{"name":"HealthFirst CIO","email":"cio@healthfirst.example.io","role":"Buyer"}]'::jsonb,
    'OPEN',
    'We discussed offline appointment sync. The CIO wants HL7 FHIR for the hospital HIS. Dual-write for 8 weeks. No budget change. Follow-up: name the security reviewer.',
    NULL,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    NULL
  ),
  (
    'f1000000-0000-4000-8000-000000000004',
    'd1000000-0000-4000-8000-000000000010',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000003',
    'Beta POS locked architecture call',
    NOW() - INTERVAL '1 days',
    '[{"name":"Le Presale Lead","role":"PRESALE_LEAD"}]'::jsonb,
    'LOCKED',
    'Locked after the customer confirmed Android-first POS and 120 stores. Do not edit until reopened.',
    NULL,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    NULL
  )
ON CONFLICT DO NOTHING;

UPDATE meetings
SET
  clean_notes = 'Evidence portal needs mTLS and an audit pack export.',
  decisions = '["Adopt mTLS for the evidence portal","Keep the first release to evidence upload only"]'::jsonb,
  action_items = '[{"task":"Send architecture one-pager","assignee":"Pham Solution Arch","deadline":null}]'::jsonb,
  open_questions = '["Who signs the InfoSec waiver?"]'::jsonb,
  gap_analysis = '{"risks":["InfoSec approval slip"],"missingInformation":["Named CISO signer"],"followUpQuestions":["When is the waiver committee?"]}'::jsonb,
  analysis = '{"summary":"Compliance workshop scoped an evidence portal with mTLS.","technicalSummary":"mTLS between the portal and the customer IdP.","decisions":["Adopt mTLS for the evidence portal"],"actionItems":[{"task":"Send architecture one-pager","assignee":"Pham Solution Arch","deadline":null}],"openQuestions":["Who signs the InfoSec waiver?"],"gapAnalysis":{"risks":["InfoSec approval slip"],"missingInformation":["Named CISO signer"],"followUpQuestions":["When is the waiver committee?"]}}'::jsonb,
  analyzed_at = NOW() - INTERVAL '10 days'
WHERE id = 'f1000000-0000-4000-8000-000000000001'
  AND (clean_notes IS NULL OR clean_notes = '');

-- ------------------------------------------------------------------------------
-- 2. 10 sheets for the G5/G6 Beta POS proposal (e3...0001)
-- ------------------------------------------------------------------------------
INSERT INTO proposal_sheets (id, proposal_id, sheet_name, sheet_order, sheet_data, ai_generated)
SELECT
  ('e3100000-0000-4000-8000-' || lpad(s.ord::text, 12, '0'))::uuid,
  'e3000000-0000-4000-8000-000000000001',
  s.name,
  s.ord,
  s.data::jsonb,
  FALSE
FROM (VALUES
  (1, 'Overview', '{"title":"Executive Summary & Overview","projectName":"Beta POS staffing quotation v1","executiveSummary":"Offline-first POS for 120 retail outlets.","keyObjectives":["Offline POS","Inventory sync"],"currency":"USD"}'),
  (2, 'Scope of Work', '{"title":"Scope of Work (WBS & Features)","modules":[{"wbs":"1.0","module":"POS","feature":"Offline ticket","complexity":"M","priority":"High","estimatedDays":20}]}'),
  (3, 'Architecture & Tech Stack', '{"title":"Architecture, Non-FR & Tech Stack","stack":["React Native","Node.js"],"nonFunctionalRequirements":["Offline 24h"]}'),
  (4, 'Timeline & Milestones', '{"title":"Implementation Timeline & Gantt","totalWeeks":14,"milestones":[{"name":"Discovery","week":2},{"name":"UAT","week":12}]}'),
  (5, 'Team & Rate Cards', '{"title":"Team Composition & Role Allocation","roles":[{"roleName":"Senior Backend Developer","level":"SENIOR","manMonths":6,"monthlyRate":9240,"totalCost":55440}],"totalEffortManMonths":6,"totalTeamCost":55440}'),
  (6, 'Pricing & Quotation', '{"title":"Commercial Proposal & Milestone Payments","currency":"USD","items":[{"name":"Build","amount":55440}],"subtotal":55440,"taxPercentage":0,"taxAmount":0,"grandTotal":55440}'),
  (7, 'Assumptions & Dependencies', '{"title":"Assumptions & Client Responsibilities","items":["Customer supplies store Wi-Fi SSIDs"]}'),
  (8, 'Risk Management (RAID)', '{"title":"RAID Log & Mitigation Strategies","risks":[{"risk":"Device fragmentation","mitigation":"Two reference SKUs"}]}'),
  (9, 'SLA & Maintenance', '{"title":"Service Level Agreement & Warranty","warrantyMonths":12,"warrantyTerms":"Business-hours P1","incidentMatrix":[]}'),
  (10, 'Appendices & Case Studies', '{"title":"Relevant Experience & Case Studies","caseStudies":[]}')
) AS s(ord, name, data)
ON CONFLICT DO NOTHING;

UPDATE proposals
SET total_cost = 55440, estimated_timeline_weeks = 14
WHERE id = 'e3000000-0000-4000-8000-000000000001' AND total_cost IS NULL;

-- ------------------------------------------------------------------------------
-- 3. Extra DRAFT proposal (empty-ish Overview) for generate / metadata edits
-- ------------------------------------------------------------------------------
INSERT INTO proposals (id, organization_id, lead_id, created_by, title, version, status, total_cost, currency, estimated_timeline_weeks) VALUES
  (
    'e3000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000008',
    'b1000000-0000-4000-8000-000000000003',
    'HealthFirst clinic suite draft',
    'v1.0',
    'DRAFT',
    NULL,
    'USD',
    20
  ),
  (
    'e3000000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000005',
    'b1000000-0000-4000-8000-000000000001',
    'Acme evidence portal in review',
    'v1.0',
    'IN_REVIEW',
    150000,
    'USD',
    10
  )
ON CONFLICT DO NOTHING;

INSERT INTO proposal_sheets (id, proposal_id, sheet_name, sheet_order, sheet_data, ai_generated)
SELECT
  ('e3200000-0000-4000-8000-' || lpad(s.ord::text, 12, '0'))::uuid,
  'e3000000-0000-4000-8000-000000000002',
  s.name,
  s.ord,
  s.data::jsonb,
  FALSE
FROM (VALUES
  (1, 'Overview', '{"title":"Executive Summary & Overview","projectName":"HealthFirst clinic suite draft","executiveSummary":"","keyObjectives":[],"currency":"USD"}'),
  (2, 'Scope of Work', '{"title":"Scope of Work (WBS & Features)","modules":[]}'),
  (3, 'Architecture & Tech Stack', '{"title":"Architecture, Non-FR & Tech Stack","stack":[],"nonFunctionalRequirements":[]}'),
  (4, 'Timeline & Milestones', '{"title":"Implementation Timeline & Gantt","totalWeeks":20,"milestones":[]}'),
  (5, 'Team & Rate Cards', '{"title":"Team Composition & Role Allocation","roles":[],"totalEffortManMonths":null,"totalTeamCost":null}'),
  (6, 'Pricing & Quotation', '{"title":"Commercial Proposal & Milestone Payments","currency":"USD","items":[],"subtotal":null,"taxPercentage":null,"taxAmount":null,"grandTotal":null}'),
  (7, 'Assumptions & Dependencies', '{"title":"Assumptions & Client Responsibilities","items":[]}'),
  (8, 'Risk Management (RAID)', '{"title":"RAID Log & Mitigation Strategies","risks":[]}'),
  (9, 'SLA & Maintenance', '{"title":"Service Level Agreement & Warranty","warrantyMonths":null,"warrantyTerms":"","incidentMatrix":[]}'),
  (10, 'Appendices & Case Studies', '{"title":"Relevant Experience & Case Studies","caseStudies":[]}')
) AS s(ord, name, data)
ON CONFLICT DO NOTHING;

INSERT INTO proposal_sheets (id, proposal_id, sheet_name, sheet_order, sheet_data, ai_generated)
SELECT
  ('e3300000-0000-4000-8000-' || lpad(s.ord::text, 12, '0'))::uuid,
  'e3000000-0000-4000-8000-000000000003',
  s.name,
  s.ord,
  '{"title":"Locked by IN_REVIEW","note":"Edits should 409"}'::jsonb,
  FALSE
FROM (VALUES
  (1, 'Overview'),
  (2, 'Scope of Work'),
  (3, 'Architecture & Tech Stack'),
  (4, 'Timeline & Milestones'),
  (5, 'Team & Rate Cards'),
  (6, 'Pricing & Quotation'),
  (7, 'Assumptions & Dependencies'),
  (8, 'Risk Management (RAID)'),
  (9, 'SLA & Maintenance'),
  (10, 'Appendices & Case Studies')
) AS s(ord, name)
ON CONFLICT DO NOTHING;

COMMIT;

SELECT 'meetings org A' AS tbl, COUNT(*)::int AS n FROM meetings WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'proposals org A', COUNT(*)::int FROM proposals WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'sheets org A', COUNT(*)::int FROM proposal_sheets ps JOIN proposals p ON p.id = ps.proposal_id WHERE p.organization_id = 'a1000000-0000-4000-8000-000000000001';

-- DELETE FROM proposal_sheets WHERE id::text LIKE 'e31%' OR id::text LIKE 'e32%' OR id::text LIKE 'e33%';
-- DELETE FROM proposals WHERE id IN ('e3000000-0000-4000-8000-000000000002','e3000000-0000-4000-8000-000000000003');
-- DELETE FROM meetings WHERE id IN ('f1000000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000004');
