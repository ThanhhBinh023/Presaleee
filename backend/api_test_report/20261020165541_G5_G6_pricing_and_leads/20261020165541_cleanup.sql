-- Test data from E2E run 20261020165541. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261020165541@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['6a03a6b6-6298-46a9-a4a7-de30109c42e4', '05700583-b9ff-448e-bf45-917b7f38a6a2']::uuid[]);
COMMIT;
