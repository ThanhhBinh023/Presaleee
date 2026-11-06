-- Test data from E2E run 20261021034026. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021034026@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['8562431f-2479-40f8-85de-cde69ad3a991', '70c50e5e-5ea3-465c-9599-22e05e4b64c6']::uuid[]);
COMMIT;
