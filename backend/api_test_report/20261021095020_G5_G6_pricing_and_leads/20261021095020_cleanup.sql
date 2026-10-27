-- Test data from E2E run 20261021095020. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021095020@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['8631ba3b-fe82-432b-9330-acd80686e234', 'c950bebf-18c6-4e97-9dee-6ab7657ef06e']::uuid[]);
COMMIT;
