-- Test data from E2E run 20261021094504. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021094504@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['63aa0dbd-8041-4296-8a05-4c00f59fa15e', 'bf7c21b2-10e4-4034-84a5-8532eb7bc5b5', 'c30f9afd-952f-4ca3-8efe-8611a79dfb8e']::uuid[]);
COMMIT;
-- Leads, proposals, clients and audit rows created by this run live in the three test
-- organizations above and cascade with them. These statements are listed explicitly so the
-- audit trail can be removed without relying on FK behaviour. Review before executing.
BEGIN;
DELETE FROM audit_logs WHERE organization_id = ANY(ARRAY['63aa0dbd-8041-4296-8a05-4c00f59fa15e', 'bf7c21b2-10e4-4034-84a5-8532eb7bc5b5', 'c30f9afd-952f-4ca3-8efe-8611a79dfb8e']::uuid[]);
DELETE FROM proposal_sheets WHERE proposal_id IN (SELECT id FROM proposals WHERE organization_id = ANY(ARRAY['63aa0dbd-8041-4296-8a05-4c00f59fa15e', 'bf7c21b2-10e4-4034-84a5-8532eb7bc5b5', 'c30f9afd-952f-4ca3-8efe-8611a79dfb8e']::uuid[]));
DELETE FROM proposals WHERE organization_id = ANY(ARRAY['63aa0dbd-8041-4296-8a05-4c00f59fa15e', 'bf7c21b2-10e4-4034-84a5-8532eb7bc5b5', 'c30f9afd-952f-4ca3-8efe-8611a79dfb8e']::uuid[]);
DELETE FROM leads WHERE organization_id = ANY(ARRAY['63aa0dbd-8041-4296-8a05-4c00f59fa15e', 'bf7c21b2-10e4-4034-84a5-8532eb7bc5b5', 'c30f9afd-952f-4ca3-8efe-8611a79dfb8e']::uuid[]);
DELETE FROM clients WHERE organization_id = ANY(ARRAY['63aa0dbd-8041-4296-8a05-4c00f59fa15e', 'bf7c21b2-10e4-4034-84a5-8532eb7bc5b5', 'c30f9afd-952f-4ca3-8efe-8611a79dfb8e']::uuid[]);
COMMIT;
