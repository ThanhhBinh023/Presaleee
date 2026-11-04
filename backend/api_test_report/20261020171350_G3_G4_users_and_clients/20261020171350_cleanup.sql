-- Test data from E2E run 20261020171350. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261020171350@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['8e8713d6-5842-44be-9550-149e5902eee3', '099de73e-7112-4ddb-8762-0c964ac51f18']::uuid[]);
COMMIT;
