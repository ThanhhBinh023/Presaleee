-- Test data from E2E run 20261021071833. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021071833@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['0b01e6fb-c9c0-470f-b44c-d24cc065fd11', '4ed547f0-431b-460c-bd8a-e6fe7b9e2b2a']::uuid[]);
COMMIT;
