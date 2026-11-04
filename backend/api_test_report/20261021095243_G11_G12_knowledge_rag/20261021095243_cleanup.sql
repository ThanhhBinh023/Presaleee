-- Test data from E2E run 20261021095243. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021095243@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['f7652868-5de4-43c2-abe2-d706da1499ff', '80e1cbe2-3fb3-4333-b956-db070f08354f']::uuid[]);
COMMIT;
-- Knowledge vault rows for this run. Deleting the organizations above cascades through
-- knowledge_docs, but the statements below are explicit so the vector rows are removable
-- without touching the organizations first. Review before executing.
BEGIN;
DELETE FROM document_chunks WHERE doc_id IN (SELECT id FROM knowledge_docs WHERE organization_id = ANY(ARRAY['f7652868-5de4-43c2-abe2-d706da1499ff', '80e1cbe2-3fb3-4333-b956-db070f08354f']::uuid[]));
DELETE FROM knowledge_docs WHERE organization_id = ANY(ARRAY['f7652868-5de4-43c2-abe2-d706da1499ff', '80e1cbe2-3fb3-4333-b956-db070f08354f']::uuid[]);
COMMIT;
