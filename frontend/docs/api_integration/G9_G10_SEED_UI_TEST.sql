-- ==============================================================================
-- G9 + G10 UI TEST SEED — APPROVED / SENT_TO_CLIENT proposals, portal session,
-- shared + unshared materials, one client comment.
-- Prerequisite: G4 then G5/G6 then G7/G8.
-- UUID hex only: e3...0004/0005 proposals, e34/e35 sheets, e40 materials, e50 session
--
-- Known G10 token (plaintext, never stored). SHA-256 hex is written to token_hash:
--   g10-ui-client-token-northwind
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. APPROVED proposal for first-share (ADMIN / PRESALE_LEAD)
-- ------------------------------------------------------------------------------
INSERT INTO proposals (id, organization_id, lead_id, created_by, title, version, status, total_cost, currency, estimated_timeline_weeks) VALUES
  (
    'e3000000-0000-4000-8000-000000000004',
    'a1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000008',
    'b1000000-0000-4000-8000-000000000001',
    'HealthFirst clinic suite approved',
    'v1.0',
    'APPROVED',
    186000,
    'USD',
    20
  ),
  (
    'e3000000-0000-4000-8000-000000000005',
    'a1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000005',
    'b1000000-0000-4000-8000-000000000003',
    'Acme evidence portal sent to client',
    'v1.1',
    'SENT_TO_CLIENT',
    150000,
    'USD',
    10
  )
ON CONFLICT DO NOTHING;

INSERT INTO proposal_sheets (id, proposal_id, sheet_name, sheet_order, sheet_data, ai_generated)
SELECT
  ('e3400000-0000-4000-8000-' || lpad(s.ord::text, 12, '0'))::uuid,
  'e3000000-0000-4000-8000-000000000004',
  s.name,
  s.ord,
  s.data::jsonb,
  FALSE
FROM (VALUES
  (1, 'Overview', '{"title":"Executive Summary & Overview","projectName":"HealthFirst clinic suite approved","executiveSummary":"Offline clinic HIS with FHIR.","keyObjectives":["Offline appointments","HL7 FHIR"],"currency":"USD"}'),
  (2, 'Scope of Work', '{"title":"Scope of Work (WBS & Features)","modules":[{"wbs":"1.0","module":"HIS","feature":"Appointment sync","complexity":"L","priority":"High","estimatedDays":30}]}'),
  (3, 'Architecture & Tech Stack', '{"title":"Architecture, Non-FR & Tech Stack","stack":["React","Node.js","FHIR"],"nonFunctionalRequirements":["Offline 24h"]}'),
  (4, 'Timeline & Milestones', '{"title":"Implementation Timeline & Gantt","totalWeeks":20,"milestones":[{"name":"Discovery","week":2},{"name":"Go-live","week":20}]}'),
  (5, 'Team & Rate Cards', '{"title":"Team Composition & Role Allocation","roles":[{"roleName":"Solution Architect","level":"LEAD","manMonths":4,"monthlyRate":14280,"totalCost":57120}],"totalEffortManMonths":4,"totalTeamCost":57120}'),
  (6, 'Pricing & Quotation', '{"title":"Commercial Proposal & Milestone Payments","currency":"USD","items":[{"name":"Build","amount":186000}],"subtotal":186000,"taxPercentage":0,"taxAmount":0,"grandTotal":186000}'),
  (7, 'Assumptions & Dependencies', '{"title":"Assumptions & Client Responsibilities","items":["Hospital HIS sandbox credentials"]}'),
  (8, 'Risk Management (RAID)', '{"title":"RAID Log & Mitigation Strategies","risks":[{"risk":"HIS vendor delay","mitigation":"Mock FHIR store"}]}'),
  (9, 'SLA & Maintenance', '{"title":"Service Level Agreement & Warranty","warrantyMonths":12,"warrantyTerms":"Business-hours P1","incidentMatrix":[]}'),
  (10, 'Appendices & Case Studies', '{"title":"Relevant Experience & Case Studies","caseStudies":[]}')
) AS s(ord, name, data)
ON CONFLICT DO NOTHING;

INSERT INTO proposal_sheets (id, proposal_id, sheet_name, sheet_order, sheet_data, ai_generated)
SELECT
  ('e3500000-0000-4000-8000-' || lpad(s.ord::text, 12, '0'))::uuid,
  'e3000000-0000-4000-8000-000000000005',
  s.name,
  s.ord,
  s.data::jsonb,
  FALSE
FROM (VALUES
  (1, 'Overview', '{"title":"Executive Summary & Overview","projectName":"Acme evidence portal sent to client","executiveSummary":"Audit evidence portal with mTLS.","keyObjectives":["Evidence upload","Audit pack export"],"currency":"USD"}'),
  (2, 'Scope of Work', '{"title":"Scope of Work (WBS & Features)","modules":[{"wbs":"1.0","module":"Portal","feature":"Evidence upload","complexity":"M","priority":"High","estimatedDays":15}]}'),
  (3, 'Architecture & Tech Stack', '{"title":"Architecture, Non-FR & Tech Stack","stack":["React","Node.js"],"nonFunctionalRequirements":["mTLS"]}'),
  (4, 'Timeline & Milestones', '{"title":"Implementation Timeline & Gantt","totalWeeks":10,"milestones":[{"name":"UAT","week":8}]}'),
  (5, 'Team & Rate Cards', '{"title":"Team Composition & Role Allocation","roles":[{"roleName":"Senior Backend Developer","level":"SENIOR","manMonths":3,"monthlyRate":9240,"totalCost":27720}],"totalEffortManMonths":3,"totalTeamCost":27720}'),
  (6, 'Pricing & Quotation', '{"title":"Commercial Proposal & Milestone Payments","currency":"USD","items":[{"name":"Build","amount":150000}],"subtotal":150000,"taxPercentage":0,"taxAmount":0,"grandTotal":150000}'),
  (7, 'Assumptions & Dependencies', '{"title":"Assumptions & Client Responsibilities","items":["Customer IdP metadata"]}'),
  (8, 'Risk Management (RAID)', '{"title":"RAID Log & Mitigation Strategies","risks":[{"risk":"InfoSec waiver slip","mitigation":"Named CISO signer"}]}'),
  (9, 'SLA & Maintenance', '{"title":"Service Level Agreement & Warranty","warrantyMonths":12,"warrantyTerms":"P1 4h","incidentMatrix":[]}'),
  (10, 'Appendices & Case Studies', '{"title":"Relevant Experience & Case Studies","caseStudies":[{"name":"Prior evidence pack"}]}')
) AS s(ord, name, data)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. Active portal session for the SENT_TO_CLIENT proposal
--    Hash matches SHA-256 of g10-ui-client-token-northwind
-- ------------------------------------------------------------------------------
INSERT INTO portal_sessions (
  id, proposal_id, organization_id, created_by, client_email, client_name, token_hash, expires_at, revoked_at, last_accessed_at
) VALUES (
  'e5000000-0000-4000-8000-000000000001',
  'e3000000-0000-4000-8000-000000000005',
  'a1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000003',
  'cio@acme.example.io',
  'Acme CIO',
  encode(digest('g10-ui-client-token-northwind', 'sha256'), 'hex'),
  NOW() + INTERVAL '30 days',
  NULL,
  NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO proposal_portal_comments (
  id, proposal_id, organization_id, portal_session_id, author_name, author_email, body
) VALUES (
  'e5100000-0000-4000-8000-000000000001',
  'e3000000-0000-4000-8000-000000000005',
  'a1000000-0000-4000-8000-000000000001',
  'e5000000-0000-4000-8000-000000000001',
  'Acme CIO',
  'cio@acme.example.io',
  'Please confirm the mTLS cipher suite before legal signs.'
)
ON CONFLICT DO NOTHING;

INSERT INTO proposal_portal_materials (
  id, proposal_id, organization_id, title, description, file_name, file_url, mime_type, is_shared, created_by
) VALUES
  (
    'e4000000-0000-4000-8000-000000000001',
    'e3000000-0000-4000-8000-000000000005',
    'a1000000-0000-4000-8000-000000000001',
    'Client architecture one-pager',
    'Shared with the client portal.',
    'acme-evidence-architecture.pdf',
    'https://files.example.com/acme-evidence-architecture.pdf',
    'application/pdf',
    TRUE,
    'b1000000-0000-4000-8000-000000000003'
  ),
  (
    'e4000000-0000-4000-8000-000000000002',
    'e3000000-0000-4000-8000-000000000005',
    'a1000000-0000-4000-8000-000000000001',
    'Internal RAID working notes',
    'Staff only. Must not appear on the client materials list.',
    'internal-raid-notes.pdf',
    'https://files.example.com/internal-raid-notes.pdf',
    'application/pdf',
    FALSE,
    'b1000000-0000-4000-8000-000000000003'
  ),
  (
    'e4000000-0000-4000-8000-000000000003',
    'e3000000-0000-4000-8000-000000000004',
    'a1000000-0000-4000-8000-000000000001',
    'Unshared clinic rate card',
    'On the APPROVED proposal. Client cannot see this until a session exists and is_shared is true.',
    'clinic-rate-card.pdf',
    'https://files.example.com/clinic-rate-card.pdf',
    'application/pdf',
    FALSE,
    'b1000000-0000-4000-8000-000000000001'
  )
ON CONFLICT DO NOTHING;

COMMIT;

SELECT 'proposals portal' AS tbl, COUNT(*)::int AS n FROM proposals WHERE id IN (
  'e3000000-0000-4000-8000-000000000004',
  'e3000000-0000-4000-8000-000000000005'
)
UNION ALL SELECT 'portal sessions', COUNT(*)::int FROM portal_sessions WHERE id = 'e5000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'portal materials', COUNT(*)::int FROM proposal_portal_materials WHERE id::text LIKE 'e40%'
UNION ALL SELECT 'portal comments', COUNT(*)::int FROM proposal_portal_comments WHERE id = 'e5100000-0000-4000-8000-000000000001';

-- DELETE FROM proposal_portal_comments WHERE id = 'e5100000-0000-4000-8000-000000000001';
-- DELETE FROM proposal_portal_materials WHERE id::text LIKE 'e40%';
-- DELETE FROM portal_sessions WHERE id = 'e5000000-0000-4000-8000-000000000001';
-- DELETE FROM proposal_sheets WHERE id::text LIKE 'e34%' OR id::text LIKE 'e35%';
-- DELETE FROM proposals WHERE id IN ('e3000000-0000-4000-8000-000000000004','e3000000-0000-4000-8000-000000000005');
