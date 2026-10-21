-- Test data created by E2E run 20261021071709. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021071709@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['5a1b25b3-0be4-43eb-b24e-d8ebd38b5763', '94207de8-0bb5-4cd4-8f79-ec7c9c4dfd95']::uuid[]);
COMMIT;
