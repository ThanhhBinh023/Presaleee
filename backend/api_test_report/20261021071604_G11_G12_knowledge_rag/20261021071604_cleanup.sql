-- Test data from E2E run 20261021071604. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021071604@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['25a4176e-9c41-4402-9b32-c9654e638a4d', '211dff0f-802b-48c9-8ea4-108d89b87790']::uuid[]);
COMMIT;
-- Knowledge vault rows for this run. Deleting the organizations above cascades through
-- knowledge_docs, but the statements below are explicit so the vector rows are removable
-- without touching the organizations first. Review before executing.
BEGIN;
DELETE FROM document_chunks WHERE doc_id IN (SELECT id FROM knowledge_docs WHERE organization_id = ANY(ARRAY['25a4176e-9c41-4402-9b32-c9654e638a4d', '211dff0f-802b-48c9-8ea4-108d89b87790']::uuid[]));
DELETE FROM knowledge_docs WHERE organization_id = ANY(ARRAY['25a4176e-9c41-4402-9b32-c9654e638a4d', '211dff0f-802b-48c9-8ea4-108d89b87790']::uuid[]);
COMMIT;
