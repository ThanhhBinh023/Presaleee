-- Test data from E2E run 20261021094750. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021094750@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['8728531b-f763-4fc8-b81b-e6d78e6ca131', '7b9923de-72ad-4ff9-a7b2-1bf12659fedf', 'f2c4bb00-3e38-4578-a314-f5834a446ffb']::uuid[]);
COMMIT;
-- Leads, proposals, clients and audit rows created by this run live in the three test
-- organizations above and cascade with them. These statements are listed explicitly so the
-- audit trail can be removed without relying on FK behaviour. Review before executing.
BEGIN;
DELETE FROM audit_logs WHERE organization_id = ANY(ARRAY['8728531b-f763-4fc8-b81b-e6d78e6ca131', '7b9923de-72ad-4ff9-a7b2-1bf12659fedf', 'f2c4bb00-3e38-4578-a314-f5834a446ffb']::uuid[]);
DELETE FROM proposal_sheets WHERE proposal_id IN (SELECT id FROM proposals WHERE organization_id = ANY(ARRAY['8728531b-f763-4fc8-b81b-e6d78e6ca131', '7b9923de-72ad-4ff9-a7b2-1bf12659fedf', 'f2c4bb00-3e38-4578-a314-f5834a446ffb']::uuid[]));
DELETE FROM proposals WHERE organization_id = ANY(ARRAY['8728531b-f763-4fc8-b81b-e6d78e6ca131', '7b9923de-72ad-4ff9-a7b2-1bf12659fedf', 'f2c4bb00-3e38-4578-a314-f5834a446ffb']::uuid[]);
DELETE FROM leads WHERE organization_id = ANY(ARRAY['8728531b-f763-4fc8-b81b-e6d78e6ca131', '7b9923de-72ad-4ff9-a7b2-1bf12659fedf', 'f2c4bb00-3e38-4578-a314-f5834a446ffb']::uuid[]);
DELETE FROM clients WHERE organization_id = ANY(ARRAY['8728531b-f763-4fc8-b81b-e6d78e6ca131', '7b9923de-72ad-4ff9-a7b2-1bf12659fedf', 'f2c4bb00-3e38-4578-a314-f5834a446ffb']::uuid[]);
-- One-off manual probe of the dashboard defaults (organization "Probe 75882424", 12 leads).
DELETE FROM audit_logs WHERE organization_id = 'd2c8f370-40e4-4f91-b3aa-442dd351bbd3';
DELETE FROM leads WHERE organization_id = 'd2c8f370-40e4-4f91-b3aa-442dd351bbd3';
DELETE FROM users WHERE email LIKE 'probe-%@presaleee-e2e.test';
DELETE FROM organizations WHERE id = 'd2c8f370-40e4-4f91-b3aa-442dd351bbd3';
COMMIT;
