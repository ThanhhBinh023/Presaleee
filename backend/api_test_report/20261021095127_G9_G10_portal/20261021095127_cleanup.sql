-- Test data from E2E run 20261021095127. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021095127@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['54103f2c-5e3b-4ace-86d5-49a88626b397', 'aa0793e0-1ebd-4e82-a157-8ab85c75f5ef']::uuid[]);
COMMIT;
