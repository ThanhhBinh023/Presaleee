-- Test data from E2E run 20261021071716. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021071716@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['9eaa4192-74de-4c37-ac85-1b5a7f3a5454', '893f4201-d1c7-493a-93c2-1c5e86485fe8']::uuid[]);
COMMIT;
