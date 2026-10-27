-- Test data created by E2E run 20261021100333. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021100333@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['5d1ccb62-bee0-48a2-9739-b69e561f902f', 'da72a364-c9e1-426d-b304-8b47a42c8c0a']::uuid[]);
COMMIT;
