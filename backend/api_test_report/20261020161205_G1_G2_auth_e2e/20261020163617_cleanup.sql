-- Test data created by E2E run 20261020163617. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261020163617@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['2685d80b-a8ad-48c9-ac88-10e24543b391', '1b95331a-f5d5-4c9e-9abf-aa1499dbc280']::uuid[]);
COMMIT;
