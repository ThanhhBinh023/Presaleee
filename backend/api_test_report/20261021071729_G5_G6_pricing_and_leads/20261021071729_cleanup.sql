-- Test data from E2E run 20261021071729. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021071729@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['9cc78065-0a4b-4950-9437-5db2424cce2b', 'f7226da9-c58a-43fa-acbc-402fe7b1a38d']::uuid[]);
COMMIT;
