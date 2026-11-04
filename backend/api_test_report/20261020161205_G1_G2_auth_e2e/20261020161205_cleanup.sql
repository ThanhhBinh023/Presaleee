-- Test data created by E2E run 20261020161205. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261020161205@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['b2f0d639-3d3c-4c2d-a72c-4ed3ab29a6ca', '2d5810a7-7806-48a3-97c8-207c6b840476']::uuid[]);
COMMIT;
