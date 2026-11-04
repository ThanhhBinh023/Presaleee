-- Test data from E2E run 20261021071338. Review before executing.
BEGIN;
DELETE FROM users WHERE email LIKE '%20261021071338@presaleee-e2e.test';
DELETE FROM organizations WHERE id = ANY(ARRAY['d54438aa-f64d-4131-8902-e7ac65297582', '4d3275e6-6489-415e-8809-31a59a7797a2']::uuid[]);
COMMIT;
-- Knowledge vault rows for this run. Deleting the organizations above cascades through
-- knowledge_docs, but the statements below are explicit so the vector rows are removable
-- without touching the organizations first. Review before executing.
BEGIN;
DELETE FROM document_chunks WHERE doc_id IN (SELECT id FROM knowledge_docs WHERE organization_id = ANY(ARRAY['d54438aa-f64d-4131-8902-e7ac65297582', '4d3275e6-6489-415e-8809-31a59a7797a2']::uuid[]));
DELETE FROM knowledge_docs WHERE organization_id = ANY(ARRAY['d54438aa-f64d-4131-8902-e7ac65297582', '4d3275e6-6489-415e-8809-31a59a7797a2']::uuid[]);
COMMIT;
