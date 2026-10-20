-- Test data from E2E run 20261020163553. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261020163553@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['9bc7b0a3-01cc-4180-b082-1ae3d5e1035a', '6faa6460-b1aa-45c8-86ac-bd80dcedb3bb']::uuid[]);
COMMIT;
