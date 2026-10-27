-- Test data from E2E run 20261021095006. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021095006@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['af003b51-8017-43b7-aafa-885721063b86', '17cc1f93-6d5f-4a6c-8206-f694a8d1742d']::uuid[]);
COMMIT;
