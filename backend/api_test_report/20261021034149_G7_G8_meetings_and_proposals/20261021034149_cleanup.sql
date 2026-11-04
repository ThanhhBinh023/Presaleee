-- Test data from E2E run 20261021034149. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021034149@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['99df1ae6-41f4-4f0a-93f2-2971b78b6cf3', '8c035b33-01a1-45e5-a1cc-844013f4e206']::uuid[]);
COMMIT;
