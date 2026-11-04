-- Test data from E2E run 20261021051931. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021051931@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['3c8975be-4ea9-4ee7-aca6-8133de445311', '00d576b1-55ef-4a01-884b-0076aaecf4cb']::uuid[]);
COMMIT;
