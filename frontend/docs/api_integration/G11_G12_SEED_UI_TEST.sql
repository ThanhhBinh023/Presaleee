-- ==============================================================================
-- G11 + G12 UI TEST SEED — knowledge_docs + document_chunks (vector 768, FTS)
-- Prerequisite: G4 (org Northwind a1...0001, Omega a1...0002).
-- Embeddings are zero vectors so list/get/delete work without Gemini.
-- Hybrid search still needs a live embedding for the *query*; FTS tokens below
-- help the lexical branch: healthfhirzxq, bankingsoc2zxq, retailposzxq, ratecardzxq.
-- UUID: e6 documents, e61 chunks.
-- ==============================================================================

BEGIN;

INSERT INTO knowledge_docs (id, organization_id, uploaded_by, title, category, domain, file_url, file_type, total_tokens) VALUES
  (
    'e6000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'HealthFirst FHIR clinic architecture',
    'TECH_SPEC',
    'HEALTHCARE',
    NULL,
    'TEXT',
    86
  ),
  (
    'e6000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000003',
    'Acme SOC-2 evidence policy',
    'POLICY',
    'BANKING',
    NULL,
    'TEXT',
    42
  ),
  (
    'e6000000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000004',
    'Beta POS offline case study',
    'CASE_STUDY',
    'RETAIL',
    NULL,
    'TEXT',
    38
  ),
  (
    'e6000000-0000-4000-8000-000000000004',
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'Northwind senior backend rate card note',
    'RATE_CARD',
    'GENERAL',
    NULL,
    'TEXT',
    28
  ),
  (
    'e6000000-0000-4000-8000-000000000101',
    'a1000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000101',
    'Omega isolation ledger spec',
    'TECH_SPEC',
    'PAYMENTS',
    NULL,
    'TEXT',
    22
  )
ON CONFLICT DO NOTHING;

INSERT INTO document_chunks (id, doc_id, chunk_index, chunk_content, metadata, embedding) VALUES
  (
    'e6100000-0000-4000-8000-000000000001',
    'e6000000-0000-4000-8000-000000000001',
    0,
    'healthfhirzxq Offline clinic HIS. Appointments sync through HL7 FHIR R4. Dual-write for eight weeks. The hospital sandbox must expose Patient and Encounter resources.',
    '{"title":"HealthFirst FHIR clinic architecture","category":"TECH_SPEC","domain":"HEALTHCARE","section":"Architecture"}'::jsonb,
    ('[' || array_to_string(array_fill(0::float8, ARRAY[768]), ',') || ']')::vector
  ),
  (
    'e6100000-0000-4000-8000-000000000002',
    'e6000000-0000-4000-8000-000000000001',
    1,
    'healthfhirzxq Security: mTLS between the clinic suite and the hospital HIS. Audit pack export is a P1 for the CIO. No PHI leaves the tenant boundary.',
    '{"title":"HealthFirst FHIR clinic architecture","category":"TECH_SPEC","domain":"HEALTHCARE","section":"Security"}'::jsonb,
    ('[' || array_to_string(array_fill(0::float8, ARRAY[768]), ',') || ']')::vector
  ),
  (
    'e6100000-0000-4000-8000-000000000003',
    'e6000000-0000-4000-8000-000000000002',
    0,
    'bankingsoc2zxq Access management uses FIDO2 keys and a 90-day access review. Evidence packs export as PDF for the SOC-2 Type II matrix. mTLS is mandatory for the evidence portal.',
    '{"title":"Acme SOC-2 evidence policy","category":"POLICY","domain":"BANKING","section":"Controls"}'::jsonb,
    ('[' || array_to_string(array_fill(0::float8, ARRAY[768]), ',') || ']')::vector
  ),
  (
    'e6100000-0000-4000-8000-000000000004',
    'e6000000-0000-4000-8000-000000000003',
    0,
    'retailposzxq Offline-first Android POS for 120 stores. Local ticket cache lasts 24 hours. Inventory sync resumes when the store Wi-Fi returns.',
    '{"title":"Beta POS offline case study","category":"CASE_STUDY","domain":"RETAIL","section":"Overview"}'::jsonb,
    ('[' || array_to_string(array_fill(0::float8, ARRAY[768]), ',') || ']')::vector
  ),
  (
    'e6100000-0000-4000-8000-000000000005',
    'e6000000-0000-4000-8000-000000000004',
    0,
    'ratecardzxq Senior Backend Developer monthly rate is 9240 USD when monthly is not negotiated, using daily 440 times 21 working days.',
    '{"title":"Northwind senior backend rate card note","category":"RATE_CARD","domain":"GENERAL","section":"Pricing"}'::jsonb,
    ('[' || array_to_string(array_fill(0::float8, ARRAY[768]), ',') || ']')::vector
  ),
  (
    'e6100000-0000-4000-8000-000000000101',
    'e6000000-0000-4000-8000-000000000101',
    0,
    'omegaisolationzxq This ledger spec belongs to Omega and must never appear in Northwind hybrid search results.',
    '{"title":"Omega isolation ledger spec","category":"TECH_SPEC","domain":"PAYMENTS","section":"Isolation"}'::jsonb,
    ('[' || array_to_string(array_fill(0::float8, ARRAY[768]), ',') || ']')::vector
  )
ON CONFLICT DO NOTHING;

COMMIT;

SELECT 'knowledge org A' AS tbl, COUNT(*)::int AS n FROM knowledge_docs WHERE organization_id = 'a1000000-0000-4000-8000-000000000001' AND id::text LIKE 'e6%'
UNION ALL SELECT 'chunks org A', COUNT(*)::int FROM document_chunks WHERE id::text LIKE 'e61%' AND id::text NOT LIKE '%000101'
UNION ALL SELECT 'knowledge org B seed', COUNT(*)::int FROM knowledge_docs WHERE id = 'e6000000-0000-4000-8000-000000000101';

-- DELETE FROM document_chunks WHERE id::text LIKE 'e61%';
-- DELETE FROM knowledge_docs WHERE id::text LIKE 'e6%';
