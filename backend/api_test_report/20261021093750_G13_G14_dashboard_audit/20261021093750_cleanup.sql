-- Test data from E2E run 20261021093750. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021093750@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['423cf104-5f88-465b-858e-1fc1d2bd1524', '40305b53-d58d-4e2c-996b-3dd6fc796de7', '92871ca6-fd36-4567-bf70-3349a029bca4']::uuid[]);
COMMIT;
-- Leads, proposals, clients and audit rows created by this run live in the three test
-- organizations above and cascade with them. These statements are listed explicitly so the
-- audit trail can be removed without relying on FK behaviour. Review before executing.
BEGIN;
DELETE FROM audit_logs WHERE organization_id = ANY(ARRAY['423cf104-5f88-465b-858e-1fc1d2bd1524', '40305b53-d58d-4e2c-996b-3dd6fc796de7', '92871ca6-fd36-4567-bf70-3349a029bca4']::uuid[]);
DELETE FROM proposal_sheets WHERE proposal_id IN (SELECT id FROM proposals WHERE organization_id = ANY(ARRAY['423cf104-5f88-465b-858e-1fc1d2bd1524', '40305b53-d58d-4e2c-996b-3dd6fc796de7', '92871ca6-fd36-4567-bf70-3349a029bca4']::uuid[]));
DELETE FROM proposals WHERE organization_id = ANY(ARRAY['423cf104-5f88-465b-858e-1fc1d2bd1524', '40305b53-d58d-4e2c-996b-3dd6fc796de7', '92871ca6-fd36-4567-bf70-3349a029bca4']::uuid[]);
DELETE FROM leads WHERE organization_id = ANY(ARRAY['423cf104-5f88-465b-858e-1fc1d2bd1524', '40305b53-d58d-4e2c-996b-3dd6fc796de7', '92871ca6-fd36-4567-bf70-3349a029bca4']::uuid[]);
DELETE FROM clients WHERE organization_id = ANY(ARRAY['423cf104-5f88-465b-858e-1fc1d2bd1524', '40305b53-d58d-4e2c-996b-3dd6fc796de7', '92871ca6-fd36-4567-bf70-3349a029bca4']::uuid[]);
COMMIT;
