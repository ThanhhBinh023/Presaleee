-- Test data created by E2E run 20261020171341. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261020171341@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['6d2bf829-0a8f-4b44-8ae3-19d524ab7ed0', 'cf373766-315d-4774-b644-71529e8285a7']::uuid[]);
COMMIT;
