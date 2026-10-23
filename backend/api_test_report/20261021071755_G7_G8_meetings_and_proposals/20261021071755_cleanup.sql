-- Test data from E2E run 20261021071755. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021071755@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['74feb1cd-f4e3-40e5-886e-d09ad8589cec', '28b7c7a3-ba50-4c85-a5d5-925262dc9329']::uuid[]);
COMMIT;
