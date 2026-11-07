-- Test data from E2E run 20261020171259. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261020171259@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['8cafb203-1288-4b07-a515-2b2861e2c693', 'a999b336-78c6-43e3-949d-d89db04d03f9']::uuid[]);
COMMIT;
