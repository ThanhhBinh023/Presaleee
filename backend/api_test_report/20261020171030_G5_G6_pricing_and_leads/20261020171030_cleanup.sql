-- Test data from E2E run 20261020171030. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261020171030@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['1458fd49-88c8-426b-8bcf-6d39d008d3a1', '5e53ab7a-edf0-4752-ba1e-37b0bec3ca9e']::uuid[]);
COMMIT;
