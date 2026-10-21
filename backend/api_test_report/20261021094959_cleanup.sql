-- Test data created by E2E run 20261021094959. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021094959@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['30949f4a-d26a-4bab-b8e1-80df4ad447de', 'eb1793b4-8cd3-4a3b-b926-ae3517114366']::uuid[]);
COMMIT;
