-- Test data from E2E run 20261021095046. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021095046@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['8e1146eb-a79b-4e85-aadd-3260422acfc4', 'dacef32b-d65a-4f8e-9cf3-f98fcf84b3b1']::uuid[]);
COMMIT;
