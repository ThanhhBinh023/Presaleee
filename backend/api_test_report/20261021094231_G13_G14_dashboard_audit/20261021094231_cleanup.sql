-- Test data from E2E run 20261021094231. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021094231@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['8e8bc70a-4f5b-4f9c-93a7-3ab7e0207952', 'e98a895b-94c6-49fa-ba84-f0e5f5f6d03b', 'e55851bf-97a4-4f33-80de-d2ddc7fce50f']::uuid[]);
COMMIT;
-- Leads, proposals, clients and audit rows created by this run live in the three test
-- organizations above and cascade with them. These statements are listed explicitly so the
-- audit trail can be removed without relying on FK behaviour. Review before executing.
BEGIN;
DELETE FROM audit_logs WHERE organization_id = ANY(ARRAY['8e8bc70a-4f5b-4f9c-93a7-3ab7e0207952', 'e98a895b-94c6-49fa-ba84-f0e5f5f6d03b', 'e55851bf-97a4-4f33-80de-d2ddc7fce50f']::uuid[]);
DELETE FROM proposal_sheets WHERE proposal_id IN (SELECT id FROM proposals WHERE organization_id = ANY(ARRAY['8e8bc70a-4f5b-4f9c-93a7-3ab7e0207952', 'e98a895b-94c6-49fa-ba84-f0e5f5f6d03b', 'e55851bf-97a4-4f33-80de-d2ddc7fce50f']::uuid[]));
DELETE FROM proposals WHERE organization_id = ANY(ARRAY['8e8bc70a-4f5b-4f9c-93a7-3ab7e0207952', 'e98a895b-94c6-49fa-ba84-f0e5f5f6d03b', 'e55851bf-97a4-4f33-80de-d2ddc7fce50f']::uuid[]);
DELETE FROM leads WHERE organization_id = ANY(ARRAY['8e8bc70a-4f5b-4f9c-93a7-3ab7e0207952', 'e98a895b-94c6-49fa-ba84-f0e5f5f6d03b', 'e55851bf-97a4-4f33-80de-d2ddc7fce50f']::uuid[]);
DELETE FROM clients WHERE organization_id = ANY(ARRAY['8e8bc70a-4f5b-4f9c-93a7-3ab7e0207952', 'e98a895b-94c6-49fa-ba84-f0e5f5f6d03b', 'e55851bf-97a4-4f33-80de-d2ddc7fce50f']::uuid[]);
COMMIT;
