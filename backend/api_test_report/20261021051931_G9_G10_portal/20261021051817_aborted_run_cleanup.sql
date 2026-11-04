-- Test data written by the ABORTED first attempt of this suite (run id 20261021051817).
-- That folder was replaced by run 20261021051931, but its rows are still in the dev database.
-- Names are namespaced with the run id, so the predicates below only match that run. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021051817@presaleee-e2e.test';
DELETE FROM organizations WHERE name LIKE '%20261021051817%';
COMMIT;
