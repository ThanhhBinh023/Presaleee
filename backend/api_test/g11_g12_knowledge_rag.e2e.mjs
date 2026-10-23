// G11 (Knowledge Vault) and G12 (Hybrid RAG) e2e suite.
// node api_test/g11_g12_knowledge_rag.e2e.mjs --base-url http://127.0.0.1:5099
import fs from 'node:fs';
import path from 'node:path';
import {
  CookieJar, SkipError, Suite, argValue, createHttp, expect, expectEnvelope,
  expectNoCredentialLeak, expectNoInternalLeak, expectPaginationMeta, readBackendEnv, runId
} from './harness.mjs';

const BASE_URL = argValue('base-url', process.env.E2E_BASE_URL || 'http://127.0.0.1:5099');
const AI_URL = argValue('ai-url', process.env.E2E_AI_URL || 'http://localhost:8000');
const RUN = runId();
const PASSWORD = `E2eK1112Pass!${RUN}`;
const email = role => `g11-${role}-${RUN}@presaleee-e2e.test`;

const ADMIN_A = email('admin-a');
const ADMIN_B = email('admin-b');
const LEAD = email('lead');
const VIEWER = email('viewer');

const ORGANIZATION_A = `E2E G11 Org A ${RUN}`;
const ORGANIZATION_B = `E2E G11 Org B ${RUN}`;

// Unique lexemes. Both start with letters so the PostgreSQL default parser keeps them as one word token.
const RARE_A = `quixotix${RUN}`;
const RARE_B = `bracovex${RUN}`;

const CHUNK_SIZE = 400;
const CHUNK_STEP = CHUNK_SIZE - 50;

const http = createHttp(BASE_URL);
const suite = new Suite({
  code: RUN,
  title: 'G11 Knowledge Vault + G12 Hybrid RAG',
  baseUrl: BASE_URL,
  targetNote: 'local backend, real Supabase PostgreSQL with pgvector + live Gemini embeddings; FastAPI LLM service may be offline'
});

const adminA = new CookieJar();
const adminB = new CookieJar();
const lead = new CookieJar();
const viewer = new CookieJar();
const ids = {};
const docIds = [];
let ragBlocked = null; // set when the embedding provider is unavailable
const uuid = '2f4c9b6a-1d3e-4a7b-9c8d-1e2f3a4b5c6d';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

// -------------------------------------------------------------------- helpers

async function register(jar, emailAddress, organizationName, domain) {
  const response = await http(jar, 'POST', '/api/v1/auth/register', {
    body: { email: emailAddress, password: PASSWORD, fullName: `E2E ${organizationName}`, organizationName, organizationDomain: domain }
  });
  expect(response.status === 201, `register ${emailAddress} expected 201, got ${response.status} ${response.text.slice(0, 200)}`);
  return response;
}

async function login(jar, emailAddress) {
  const response = await http(jar, 'POST', '/api/v1/auth/login', { body: { email: emailAddress, password: PASSWORD } });
  expect(response.status === 200, `login ${emailAddress} expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  return response;
}

async function addMember(jar, emailAddress, role, fullName) {
  return http(jar, 'POST', '/api/v1/users', { body: { email: emailAddress, password: PASSWORD, role, fullName } });
}

const kDoc = (jar, body) => http(jar, 'POST', '/api/v1/knowledge/documents', { body });
const kList = (jar, query = '') => http(jar, 'GET', `/api/v1/knowledge/documents${query}`);
const kGet = (jar, id) => http(jar, 'GET', `/api/v1/knowledge/documents/${id}`);
const kDelete = (jar, id) => http(jar, 'DELETE', `/api/v1/knowledge/documents/${id}`);
const kAsk = (jar, body) => http(jar, 'POST', '/api/v1/knowledge/ask', { body });
const rIngest = (jar, body) => http(jar, 'POST', '/api/v1/rag/ingest', { body });
const rSearch = (jar, body) => http(jar, 'POST', '/api/v1/rag/search', { body });
const rProposal = (jar, body) => http(jar, 'POST', '/api/v1/rag/generate-proposal', { body });

function requireRag() {
  if (ragBlocked) throw new SkipError(ragBlocked);
}

/** Ingest through the vault endpoint and remember the id for teardown. */
async function ingest(jar, body) {
  const response = await kDoc(jar, body);
  if (response.status === 201 && response.json?.data?.docId) docIds.push(response.json.data.docId);
  return response;
}

function untrack(id) {
  const index = docIds.indexOf(id);
  if (index >= 0) docIds.splice(index, 1);
}

const VOCAB = 'the platform routes microservices behind an api gateway with event driven billing and auditable ledger workflows for enterprise sales teams'.split(' ');
/** Exactly `count` words, with a unique segment marker every 100 words so sliding windows never repeat. */
function makeWords(count) {
  const words = [];
  for (let index = 0; index < count; index++) {
    words.push(index > 0 && index % 100 === 0 ? `segment${index / 100}` : VOCAB[index % VOCAB.length]);
  }
  return words.join(' ');
}

/** Mirrors TextSplitterService.splitIntoChunks(text, 400 words, 50 overlap). */
function expectedChunks(wordCount) {
  if (wordCount <= 0) return 0;
  if (wordCount <= CHUNK_SIZE) return 1;
  return Math.ceil((wordCount - CHUNK_SIZE) / CHUNK_STEP) + 1;
}

let pool = null;
let poolState = null; // 'ok' | 'blocked: ...'
async function database() {
  if (poolState === null) {
    try {
      const connectionString = readBackendEnv('DATABASE_URL');
      expect(connectionString, 'DATABASE_URL missing from backend/.env');
      const { Pool } = await import('pg');
      pool = new Pool({ connectionString, max: 1 });
      await pool.query('SELECT 1');
      poolState = 'ok';
    } catch (error) {
      poolState = `blocked: ${error.message}`;
    }
  }
  return poolState === 'ok' ? pool : null;
}

/** Returns a note string, or a skip note when the harness has no database access. */
async function dbNote(query, values, format) {
  const db = await database();
  if (!db) return `database check skipped (${poolState})`;
  const result = await db.query(query, values);
  return format(result.rows);
}

async function aiAvailable() {
  try {
    const response = await fetch(`${AI_URL}/health`, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ bootstrap

await suite.test('G11/G12-00', 'Bootstrap: two tenants, vault roles, fixture documents indexed with real embeddings', async () => {
  const notes = [];
  const regA = await register(adminA, ADMIN_A, ORGANIZATION_A, `g11a-${RUN}.example`);
  const regB = await register(adminB, ADMIN_B, ORGANIZATION_B, `g11b-${RUN}.example`);
  ids.orgA = regA.json.data.organization.id;
  ids.orgB = regB.json.data.organization.id;
  ids.adminA = regA.json.data.user.id;
  ids.adminB = regB.json.data.user.id;
  suite.trackUser(ids.adminA); suite.trackUser(ids.adminB);
  suite.trackOrganization(ids.orgA); suite.trackOrganization(ids.orgB);

  for (const [jar, address, role, name] of [
    [lead, LEAD, 'PRESALE_LEAD', 'E2E G11 Presales Lead'],
    [viewer, VIEWER, 'VIEWER', 'E2E G11 Viewer']
  ]) {
    const member = await addMember(adminA, address, role, name);
    expect(member.status === 201, `${role} fixture expected 201, got ${member.status} ${member.text.slice(0, 160)}`);
    suite.trackUser(member.json.data.id);
    await login(jar, address);
  }

  // Gate the whole suite on the embedding provider: every vault and RAG write path needs it.
  const first = await ingest(adminA, {
    title: `E2E G11 Rare Token Doc ${RUN}`,
    category: 'CASE_STUDY',
    domain: 'PAYMENTS',
    content: `Settlement note ${RUN}. The ${RARE_A} protocol governs how the auditable ledger drains a nightly reconciliation sweep without touching raw card data.`
  });
  if (first.status !== 201) {
    ragBlocked = `embedding provider unavailable, the knowledge ingest path answers ${first.status} ${first.text.slice(0, 120)}`;
    notes.push(ragBlocked);
    return notes;
  }
  ids.ftsDoc = first.json.data.docId;
  expect(first.json.data.totalChunks === 1, `fixture doc expected 1 chunk, got ${first.json.data.totalChunks}`);

  const semantic = await ingest(adminA, {
    title: `E2E G12 Hospital Billing Doc ${RUN}`,
    category: 'WHITEPAPER',
    domain: 'HEALTH',
    content: 'A hospital billing integration keeps patient invoices inside a secure settlement bridge so clinical staff never handle payment credentials during care accounting.'
  });
  expect(semantic.status === 201, `semantic fixture expected 201, got ${semantic.status} ${semantic.text.slice(0, 160)}`);
  ids.semDoc = semantic.json.data.docId;

  const big = await ingest(adminA, {
    title: `E2E G12 Large Architecture Doc ${RUN}`,
    category: 'WHITEPAPER',
    domain: 'ARCH',
    content: makeWords(1500)
  });
  expect(big.status === 201, `large fixture expected 201, got ${big.status} ${big.text.slice(0, 160)}`);
  ids.bigDoc = big.json.data.docId;
  expect(big.json.data.totalChunks === expectedChunks(1500), `1500-word doc expected ${expectedChunks(1500)} chunks, got ${big.json.data.totalChunks}`);

  const foreign = await ingest(adminB, {
    title: `E2E G11 Foreign Org Doc ${RUN}`,
    category: 'CASE_STUDY',
    domain: 'PAYMENTS',
    content: `Tenant B owns this text: the ${RARE_B} settlement ledger is only reachable from organization B. No other tenant may read it.`
  });
  expect(foreign.status === 201, `foreign fixture expected 201, got ${foreign.status} ${foreign.text.slice(0, 160)}`);
  ids.foreignDoc = foreign.json.data.docId;

  notes.push(`org A ${ids.orgA}, org B ${ids.orgB}`);
  notes.push(`fixtures: fts ${ids.ftsDoc} (1 chunk), semantic ${ids.semDoc}, large ${ids.bigDoc} (${big.json.data.totalChunks} chunks), foreign ${ids.foreignDoc}`);
  return notes;
});

// --------------------------------------------------------------- G11 knowledge

await suite.test('G11-01', 'POST /knowledge/documents contract: 201, docId plus chunk count, row and metadata written', async () => {
  requireRag();
  const notes = [];
  const title = `   E2E G11 Trimmed Title ${RUN}   `;
  const content = makeWords(432);
  const created = await ingest(adminA, { title, category: 'ANNEX', domain: 'LEGAL', content });
  expect(created.status === 201, `ingest expected 201, got ${created.status} ${created.text.slice(0, 200)}`);
  const data = created.json.data;
  expect(typeof data.docId === 'string' && data.docId.length > 0, 'data.docId missing');
  expect(Object.keys(data).sort().join(',') === 'docId,totalChunks', `unexpected response fields: ${Object.keys(data).join(',')}`);
  expect(data.totalChunks === expectedChunks(432), `432 words expected ${expectedChunks(432)} chunks, got ${data.totalChunks}`);
  ids.annexDoc = data.docId;

  const fetched = await kGet(adminA, data.docId);
  expect(fetched.status === 200, `read back expected 200, got ${fetched.status} ${fetched.text.slice(0, 160)}`);
  expect(fetched.json.data.title === `E2E G11 Trimmed Title ${RUN}`, `title must be trimmed, got "${fetched.json.data.title}"`);
  expect(fetched.json.data.category === 'ANNEX' && fetched.json.data.domain === 'LEGAL', 'category/domain not persisted');
  expect(fetched.json.data.totalTokens === 432, `totalTokens expected 432, got ${fetched.json.data.totalTokens}`);
  expect(fetched.json.data.totalChunks === data.totalChunks, `list count expected ${data.totalChunks}, got ${fetched.json.data.totalChunks}`);
  expect(fetched.json.data.fileType === 'TEXT', `fileType expected TEXT, got ${fetched.json.data.fileType}`);
  expect(fetched.json.data.uploadedBy === ids.adminA, 'uploadedBy must be the authenticated staff user');

  const db = await database();
  if (db) {
    const stored = (await db.query(
      `SELECT COUNT(*)::int AS chunks, MAX(vector_dims(embedding)) AS dims_max, MIN(vector_dims(embedding)) AS dims_min,
              MAX(metadata->>'title') AS meta_title, COUNT(*) FILTER (WHERE fts IS NULL)::int AS null_fts
       FROM document_chunks WHERE doc_id = $1;`,
      [data.docId]
    )).rows[0];
    expect(stored.chunks === data.totalChunks, `database holds ${stored.chunks} chunks, API reported ${data.totalChunks}`);
    expect(stored.dims_max === 768 && stored.dims_min === 768, `embeddings must be vector(768), got ${stored.dims_min}-${stored.dims_max}`);
    expect(stored.null_fts === 0, `${stored.null_fts} chunks have no tsvector`);
    expect(stored.meta_title === `E2E G11 Trimmed Title ${RUN}`, `chunk metadata title "${stored.meta_title}"`);
    notes.push(`stored ${stored.chunks} windows, all vector(768), tsvector populated, chunk metadata.title = "${stored.meta_title}"`);
  } else {
    notes.push(`database check skipped (${poolState})`);
  }
  notes.push(`the ingest DTO carries the full "content" string but knowledge_docs has no content column: only the chunked text is stored`);
  return notes;
});

await suite.test('G11-02', 'Ingest guards: title and content must be non-empty text, malformed bodies rejected with 400', async () => {
  requireRag();
  const notes = [];
  const cases = [
    ['missing title', { content: 'body text' }, 'Document title is required.'],
    ['blank title', { title: '   ', content: 'body text' }, 'Document title is required.'],
    ['numeric title', { title: 42, content: 'body text' }, 'Document title is required.'],
    ['object title', { title: { a: 1 }, content: 'body text' }, 'Document title is required.'],
    ['missing content', { title: `E2E G11 guard ${RUN}` }, 'Document content is required.'],
    ['blank content', { title: `E2E G11 guard ${RUN}`, content: '  \n ' }, 'Document content is required.'],
    ['numeric content', { title: `E2E G11 guard ${RUN}`, content: 42 }, 'Document content is required.'],
    ['array content', { title: `E2E G11 guard ${RUN}`, content: ['a', 'b'] }, 'Document content is required.']
  ];
  for (const [label, body, message] of cases) {
    const response = await kDoc(adminA, body);
    expect(response.status === 400, `${label} expected 400, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 400);
    expect(response.json.error === message, `${label} expected "${message}", got "${response.json.error}"`);
    expectNoInternalLeak(response);
  }

  const scalar = await http(adminA, 'POST', '/api/v1/knowledge/documents', { body: 'not-an-object' });
  expect(scalar.status === 400, `scalar body expected 400, got ${scalar.status} ${scalar.text.slice(0, 160)}`);
  expectEnvelope(scalar, 400);
  expect(scalar.json.error === 'Request body must be valid JSON.', `scalar body message: ${scalar.json.error}`);
  expectNoInternalLeak(scalar);

  const arrayBody = await http(adminA, 'POST', '/api/v1/knowledge/documents', { body: ['a', 'b'] });
  expect(arrayBody.status === 400 && arrayBody.json.error === 'Request body must be a JSON object.', `array body: ${arrayBody.status} ${arrayBody.text.slice(0, 160)}`);

  const emptyBody = await http(adminA, 'POST', '/api/v1/knowledge/documents', { body: null });
  expect(emptyBody.status === 400, `null body expected 400, got ${emptyBody.status} ${emptyBody.text.slice(0, 160)}`);
  expectNoInternalLeak(emptyBody);

  const empty = await kDoc(adminA, {});
  expect(empty.status === 400 && empty.json.error === 'Document title is required.', `empty body expected title guard, got ${empty.status} ${empty.text.slice(0, 160)}`);

  notes.push('these payloads used to raise unhandled 500s: the DTO fields are now unknown-typed and validated in IngestDocumentUseCase');
  notes.push('a JSON scalar body is rejected by the parser (express strict mode) and surfaced as a 500 until errorHandler.ts mapped entity.parse.failed to 400');
  notes.push(await dbNote(
    `SELECT COUNT(*)::int AS c FROM knowledge_docs WHERE organization_id = $1 AND title LIKE 'E2E G11 guard%';`,
    [ids.orgA], rows => `guard attempts left ${rows[0].c} document rows`
  ));
  return notes;
});

await suite.test('G11-03', 'Ingest length limits: title 255, category/domain 100, content 1,000,000 characters', async () => {
  requireRag();
  const notes = [];
  const limits = [
    ['title 256 chars', { title: 'T'.repeat(256), content: 'short body' }, 'Document title must not exceed 255 characters.'],
    ['category 101 chars', { title: `E2E G11 limit ${RUN}`, category: 'c'.repeat(101), content: 'short body' }, 'category must not exceed 100 characters.'],
    ['domain 101 chars', { title: `E2E G11 limit ${RUN}`, domain: 'd'.repeat(101), content: 'short body' }, 'domain must not exceed 100 characters.'],
    ['content 1,000,001 chars', { title: `E2E G11 limit ${RUN}`, content: 'x'.repeat(1_000_001) }, 'Text content must not exceed 1,000,000 characters.']
  ];
  for (const [label, body, message] of limits) {
    const response = await kDoc(adminA, body);
    expect(response.status === 400, `${label} expected 400, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 400);
    expect(response.json.error === message, `${label} expected "${message}", got "${response.json.error}"`);
  }

  const boundaryTitle = await ingest(adminA, { title: 'T'.repeat(255), content: 'boundary title' });
  expect(boundaryTitle.status === 201, `255-char title expected 201, got ${boundaryTitle.status} ${boundaryTitle.text.slice(0, 160)}`);
  const boundaryCategory = await ingest(adminA, { title: `E2E G11 boundary ${RUN}`, category: 'c'.repeat(100), domain: 'd'.repeat(100), content: 'boundary label' });
  expect(boundaryCategory.status === 201, `100-char labels expected 201, got ${boundaryCategory.status} ${boundaryCategory.text.slice(0, 160)}`);

  const db = await database();
  if (db) {
    const rows = (await db.query(
      `SELECT COUNT(*) FILTER (WHERE title LIKE 'TTTT%')::int AS kept,
              COUNT(*) FILTER (WHERE title = $2)::int AS rejected
       FROM knowledge_docs WHERE organization_id = $1;`,
      [ids.orgA, `E2E G11 limit ${RUN}`]
    )).rows[0];
    expect(rows.kept === 1, `expected the single 255-character boundary title, found ${rows.kept}`);
    expect(rows.rejected === 0, `${rows.rejected} oversize payloads wrote a document row`);
    notes.push('an oversize body is rejected before any row is created, so no orphan document or chunk is written');
  } else {
    notes.push(`database check skipped (${poolState})`);
  }
  return notes;
});

await suite.test('G11-04', 'Ingest label defaults: category and domain default to GENERAL when omitted or null, reject empty strings', async () => {
  requireRag();
  const notes = [];
  const omitted = await ingest(adminA, { title: `E2E G11 Defaults ${RUN}`, content: 'no category and no domain supplied by this client' });
  expect(omitted.status === 201, `defaults ingest expected 201, got ${omitted.status} ${omitted.text.slice(0, 160)}`);
  const got = await kGet(adminA, omitted.json.data.docId);
  expect(got.json.data.category === 'GENERAL' && got.json.data.domain === 'GENERAL', `expected GENERAL defaults, got ${got.json.data.category}/${got.json.data.domain}`);

  const nulled = await ingest(adminA, { title: `E2E G11 Nulls ${RUN}`, category: null, domain: null, content: 'explicit null labels fall back to GENERAL' });
  expect(nulled.status === 201, `null labels expected 201, got ${nulled.status} ${nulled.text.slice(0, 160)}`);
  const gotNull = await kGet(adminB, nulled.json.data.docId);
  expect(gotNull.status === 404, `a null-label document must still be tenant-scoped, got ${gotNull.status}`);

  const blank = await kDoc(adminA, { title: `E2E G11 Blank Label ${RUN}`, category: '', content: 'blank label' });
  expect(blank.status === 400, `empty category expected 400, got ${blank.status} ${blank.text.slice(0, 160)}`);
  expectEnvelope(blank, 400);
  const numeric = await kDoc(adminA, { title: `E2E G11 Numeric Label ${RUN}`, domain: 7, content: 'numeric label' });
  expect(numeric.status === 400 && numeric.json.error === 'domain is required.', `numeric domain guard: ${numeric.status} ${numeric.text.slice(0, 160)}`);
  notes.push('omitted or null category/domain become GENERAL, but an empty-string or non-string label is a 400 — the fallback is only triggered by undefined/null');
  return notes;
});

await suite.test('G11-05', 'GET /knowledge/documents list envelope: pagination meta, ordering, serialized columns', async () => {
  requireRag();
  const notes = [];
  const response = await kList(adminA);
  expect(response.status === 200, `list expected 200, got ${response.status} ${response.text.slice(0, 160)}`);
  const meta = expectPaginationMeta(response);
  expect(Array.isArray(response.json.data), 'list data must be an array');
  expect(meta.page === 1 && meta.limit === 20, `defaults expected page 1 limit 20, got ${meta.page}/${meta.limit}`);
  expect(response.json.data.length <= meta.limit, 'page overflows limit');
  expect(meta.total >= 5, `expected the fixture documents in total, got ${meta.total}`);
  expect(meta.totalPages === Math.ceil(meta.total / meta.limit), `totalPages ${meta.totalPages} vs total ${meta.total}`);

  const first = response.json.data[0];
  for (const field of ['id', 'organizationId', 'title', 'category', 'domain', 'totalTokens', 'totalChunks', 'createdAt', 'updatedAt']) {
    expect(field in first, `list item missing "${field}"`);
  }
  expect(first.organizationId === ids.orgA, 'list leaked another organization row');
  expect(!('content' in first), 'list must not serialize document content');

  const stamps = response.json.data.map(item => Date.parse(item.updatedAt));
  for (let index = 1; index < stamps.length; index++) {
    expect(stamps[index - 1] >= stamps[index], `rows are not ordered by updated_at DESC at index ${index}`);
  }
  notes.push(`total ${meta.total}, totalPages ${meta.totalPages}, first page ${response.json.data.length} rows, newest "${first.title}"`);
  return notes;
});

await suite.test('G11-06', 'List filters: category, domain, title search and combinations', async () => {
  requireRag();
  const notes = [];
  const byCategory = await kList(adminA, `?category=WHITEPAPER`);
  expect(byCategory.status === 200, `category filter expected 200, got ${byCategory.status}`);
  expect(byCategory.json.data.every(item => item.category === 'WHITEPAPER'), 'category filter returned other categories');
  expect(byCategory.json.data.map(item => item.id).sort().join() === [ids.semDoc, ids.bigDoc].sort().join(), `expected both WHITEPAPER fixtures, got ${byCategory.json.data.map(i => i.title).join(' | ')}`);

  const byDomain = await kList(adminA, `?domain=PAYMENTS`);
  expect(byDomain.json.data.every(item => item.domain === 'PAYMENTS'), 'domain filter leaked');
  expect(byDomain.json.data.some(item => item.id === ids.ftsDoc), 'PAYMENTS fixture missing');

  const searched = await kList(adminA, `?search=${encodeURIComponent('Trimmed Title')}`);
  expect(searched.status === 200 && searched.json.data.length === 1 && searched.json.data[0].id === ids.annexDoc, `title search expected the trimmed-title fixture, got ${searched.text.slice(0, 200)}`);
  const caseInsensitive = await kList(adminA, `?search=trimmed%20title`);
  expect(caseInsensitive.json.data.length === 1, 'title ILIKE must be case-insensitive');

  const combo = await kList(adminA, `?category=WHITEPAPER&domain=HEALTH`);
  expect(combo.json.data.length === 1 && combo.json.data[0].id === ids.semDoc, `combined filter expected the HEALTH whitepaper, got ${combo.text.slice(0, 200)}`);

  const none = await kList(adminA, `?category=NO_SUCH_CATEGORY_${RUN}`);
  expect(none.status === 200 && none.json.data.length === 0 && none.json.meta.total === 0, `unknown filter expected an empty page, got ${none.text.slice(0, 160)}`);
  expect(none.json.meta.totalPages === 1, `empty result totalPages expected 1, got ${none.json.meta.totalPages}`);

  const wildcard = await kList(adminA, `?search=%25`);
  expect(wildcard.status === 200, 'a percent sign in the search term must be escaped as literal text');

  const badCategory = await kList(adminA, `?category=${'c'.repeat(101)}`);
  expect(badCategory.status === 400 && badCategory.json.error === 'category must be text up to 100 characters.', `oversize category: ${badCategory.status} ${badCategory.text.slice(0, 120)}`);
  const badSearch = await kList(adminA, `?search=${'s'.repeat(201)}`);
  expect(badSearch.status === 400 && badSearch.json.error === 'search must be text up to 200 characters.', `oversize search: ${badSearch.status} ${badSearch.text.slice(0, 120)}`);
  const blankFilter = await kList(adminA, `?category=%20%20`);
  expect(blankFilter.status === 200 && blankFilter.json.meta.total >= 5, 'a whitespace-only filter must be ignored, not applied');
  notes.push(`filters: category ${byCategory.json.meta.total}, domain ${byDomain.json.meta.total}, search 1, combo 1, unknown 0`);
  return notes;
});

await suite.test('G11-07', 'List pagination: page and limit boundaries, invalid values rejected', async () => {
  requireRag();
  const notes = [];
  const page1 = await kList(adminA, '?limit=2&page=1');
  const page2 = await kList(adminA, '?limit=2&page=2');
  expect(page1.status === 200 && page2.status === 200, `paged requests expected 200, got ${page1.status}/${page2.status}`);
  expect(page1.json.data.length === 2 && page2.json.data.length === 2, 'limit=2 pages must each hold 2 rows');
  const overlap = page1.json.data.map(i => i.id).filter(id => page2.json.data.map(i => i.id).includes(id));
  expect(overlap.length === 0, `pages must not overlap, shared ${overlap.join(',')}`);
  expect(page1.json.meta.total === page2.json.meta.total, 'total must be stable across pages');

  const last = await kList(adminA, `?limit=100&page=${Math.ceil(page1.json.meta.total / 100) || 1}`);
  expect(last.status === 200, 'limit=100 boundary expected 200');
  const beyond = await kList(adminA, '?limit=2&page=9999');
  expect(beyond.status === 200 && beyond.json.data.length === 0, `page past the end expected an empty array, got ${beyond.text.slice(0, 160)}`);

  for (const query of ['?limit=0', '?limit=101', '?limit=abc', '?page=0', '?page=1.5', '?page=%20']) {
    const response = await kList(adminA, query);
    expect(response.status === 400, `${query} expected 400, got ${response.status} ${response.text.slice(0, 120)}`);
    expectEnvelope(response, 400);
    expect(response.json.error === 'page must be >= 1 and limit must be from 1 to 100.', `${query} message: ${response.json.error}`);
  }
  notes.push('an empty page value falls back to the default, every other non-integer value is a 400');
  return notes;
});

await suite.test('G11-08', 'Vault isolation: organization B cannot list, read or search organization A documents', async () => {
  requireRag();
  const notes = [];
  const list = await kList(adminB);
  expect(list.status === 200, `org B list expected 200, got ${list.status}`);
  expect(list.json.meta.total === 1 && list.json.data[0].id === ids.foreignDoc, `org B should only see its own document, got ${JSON.stringify(list.json.data.map(i => i.title))}`);

  const read = await kGet(adminB, ids.ftsDoc);
  expect(read.status === 404, `cross-tenant read expected 404, got ${read.status} ${read.text.slice(0, 160)}`);
  expectEnvelope(read, 404);
  expect(read.json.error === 'Knowledge document not found.', `cross-tenant message: ${read.json.error}`);
  expectNoInternalLeak(read);

  const search = await kList(adminB, `?search=${encodeURIComponent('Rare Token')}`);
  expect(search.json.data.length === 0, 'title search must not cross tenants');

  const deleteAttempt = await kDelete(adminB, ids.semDoc);
  expect(deleteAttempt.status === 404, `cross-tenant delete expected 404, got ${deleteAttempt.status}`);
  const stillThere = await kGet(adminA, ids.semDoc);
  expect(stillThere.status === 200, 'the foreign delete attempt must leave the row untouched');

  const ask = await kAsk(adminB, { question: RARE_A, topK: 3 });
  if (ask.status === 200) {
    expect(!JSON.stringify(ask.json.data).includes(RARE_A), 'organization B retrieval leaked organization A content');
  } else {
    expect(ask.status === 502, `ask against the offline AI service expected 502, got ${ask.status} ${ask.text.slice(0, 160)}`);
  }
  notes.push('cross-tenant access answers 404 rather than 403, so the vault does not confirm that an id exists in another tenant');
  return notes;
});

await suite.test('G11-09', 'GET /knowledge/documents/:id contract: full row shape, no content or embedding leakage', async () => {
  requireRag();
  const notes = [];
  const response = await kGet(adminA, ids.bigDoc);
  expect(response.status === 200, `get expected 200, got ${response.status} ${response.text.slice(0, 160)}`);
  const doc = response.json.data;
  expect(doc.id === ids.bigDoc && doc.title === `E2E G12 Large Architecture Doc ${RUN}`, 'wrong document returned');
  expect(doc.totalChunks === expectedChunks(1500), `stored chunks expected ${expectedChunks(1500)}, got ${doc.totalChunks}`);
  expect(doc.totalTokens === 1500, `totalTokens expected 1500, got ${doc.totalTokens}`);
  expect(doc.fileUrl === null || typeof doc.fileUrl === 'string', `fileUrl shape: ${doc.fileUrl}`);
  expect(!('content' in doc), 'the vault must not serialize raw content');
  expect(!JSON.stringify(doc).includes('embedding'), 'a document row must never carry vectors');
  expect(Number.isFinite(Date.parse(doc.createdAt)) && Number.isFinite(Date.parse(doc.updatedAt)), 'timestamps must serialize as ISO dates');
  notes.push(`row shape: ${Object.keys(doc).join(',')}`);
  notes.push(await dbNote(
    `SELECT COUNT(*)::int AS c FROM information_schema.columns WHERE table_name = 'knowledge_docs' AND column_name = 'content';`,
    [], rows => `knowledge_docs content columns: ${rows[0].c} (the raw text only survives inside document_chunks)`
  ));
  return notes;
});

await suite.test('G11-10', 'GET /knowledge/documents/:id guards: unknown id 404, malformed UUID 400, anonymous 401', async () => {
  requireRag();
  const notes = [];
  const unknown = await kGet(adminA, uuid);
  expect(unknown.status === 404, `unknown id expected 404, got ${unknown.status}`);
  expectEnvelope(unknown, 404);

  for (const bad of ['not-a-uuid', uuid.slice(0, 35), NIL_UUID, `${uuid}extra`, '1', encodeURIComponent(uuid).slice(0, 20)]) {
    const response = await kGet(adminA, encodeURIComponent(bad));
    expect(response.status === 400, `"${bad}" expected 400, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 400);
    expect(/must be a valid UUID/.test(response.json.error), `UUID guard message: ${response.json.error}`);
    expectNoInternalLeak(response);
  }

  const anonymous = await http(null, 'GET', `/api/v1/knowledge/documents/${ids.bigDoc}`);
  expect(anonymous.status === 401, `anonymous get expected 401, got ${anonymous.status}`);
  expectEnvelope(anonymous, 401);

  const bearer = await http(null, 'GET', `/api/v1/knowledge/documents/${ids.bigDoc}`, { bearer: 'eyJhbGciOi.user.signature' });
  expect(bearer.status === 401, `forged bearer expected 401, got ${bearer.status}`);
  notes.push('a malformed id is now a 400 from the shared UUID validator; it used to reach PostgreSQL and raise a 500');
  return notes;
});

await suite.test('G11-11', 'DELETE /knowledge/documents/:id: 204, chunks and embeddings cascade away with the document', async () => {
  requireRag();
  const notes = [];
  const created = await ingest(adminA, { title: `E2E G11 Deletable ${RUN}`, domain: 'SCRATCH', content: makeWords(760) });
  expect(created.status === 201, `deletable fixture expected 201, got ${created.status} ${created.text.slice(0, 160)}`);
  const id = created.json.data.docId;
  expect(created.json.data.totalChunks === expectedChunks(760), 'fixture chunk count');
  ids.deleteDoc = id;

  const removed = await kDelete(adminA, id);
  expect(removed.status === 204, `delete expected 204, got ${removed.status} ${removed.text.slice(0, 160)}`);
  expect(removed.text === '', 'a 204 must not carry a body');
  untrack(id);

  const after = await kGet(adminA, id);
  expect(after.status === 404, `read after delete expected 404, got ${after.status}`);
  notes.push(await dbNote(
    `SELECT (SELECT COUNT(*)::int FROM knowledge_docs WHERE id = $1) AS docs,
            (SELECT COUNT(*)::int FROM document_chunks WHERE doc_id = $1) AS chunks;`,
    [id], rows => `after delete: knowledge_docs=${rows[0].docs} document_chunks=${rows[0].chunks} (FK ON DELETE CASCADE verified)`
  ));
  const db = await database();
  if (db) {
    const orphan = await db.query('SELECT COUNT(*)::int AS c FROM document_chunks WHERE doc_id = $1;', [id]);
    expect(orphan.rows[0].c === 0, `delete left ${orphan.rows[0].c} orphan chunks with embeddings`);
  } else {
    notes.push(`database check skipped (${poolState})`);
  }
  return notes;
});

await suite.test('G11-12', 'DELETE guards: replay 404, foreign 404 leaves the row, malformed UUID 400, anonymous 401', async () => {
  requireRag();
  const notes = [];
  const replay = await kDelete(adminA, ids.deleteDoc);
  expect(replay.status === 404, `second delete expected 404, got ${replay.status} ${replay.text.slice(0, 160)}`);
  expectEnvelope(replay, 404);
  expect(replay.json.error === 'Knowledge document not found.', `replay message: ${replay.json.error}`);

  const foreign = await kDelete(adminB, ids.bigDoc);
  expect(foreign.status === 404, `cross-tenant delete expected 404, got ${foreign.status}`);
  const survived = await kGet(adminA, ids.bigDoc);
  expect(survived.status === 200, 'the foreign delete must not remove the row');

  for (const bad of ['not-a-uuid', NIL_UUID]) {
    const response = await kDelete(adminA, encodeURIComponent(bad));
    expect(response.status === 400, `"${bad}" expected 400, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 400);
  }
  const anonymous = await http(null, 'DELETE', `/api/v1/knowledge/documents/${ids.foreignDoc}`);
  expect(anonymous.status === 401, `anonymous delete expected 401, got ${anonymous.status}`);
  const stillOwned = await kGet(adminB, ids.foreignDoc);
  expect(stillOwned.status === 200, 'the anonymous delete attempt must not have removed the row');
  return notes;
});

await suite.test('G11-13', 'Role coverage: a VIEWER can ingest and delete knowledge because the vault routes have no role guard', async () => {
  requireRag();
  const notes = [];
  const created = await ingest(viewer, { title: `E2E G11 Viewer Ingest ${RUN}`, content: 'written by the read-only role to probe the guard' });
  expect(created.status === 201, `VIEWER ingest expected 201 under the current routes, got ${created.status} ${created.text.slice(0, 160)}`);
  ids.viewerDoc = created.json.data.docId;

  const listed = await kList(viewer, '?limit=1');
  expect(listed.status === 200, `VIEWER list expected 200, got ${listed.status}`);
  const removed = await kDelete(viewer, ids.viewerDoc);
  expect(removed.status === 204, `VIEWER delete expected 204 under the current routes, got ${removed.status}`);
  untrack(ids.viewerDoc);
  notes.push('knowledgeRoutes.ts applies requireAuth + requireOrganization only: POST /documents and DELETE /documents/:id are writable by VIEWER, unlike the proposal and portal write routes which are role-checked');
  notes.push('the same gap covers POST /rag/ingest, POST /rag/search and POST /knowledge/ask');
  return notes;
});

await suite.test('G11-14', 'POST /knowledge/ask guards: question, domain and topK validated before any provider call', async () => {
  const notes = [];
  const cases = [
    ['missing question', { }, 'question is required.'],
    ['blank question', { question: '   ' }, 'question is required.'],
    ['numeric question', { question: 42 }, 'question is required.'],
    ['oversize question', { question: 'q'.repeat(20001) }, 'question must not exceed 20,000 characters.'],
    ['oversize domain', { question: 'ok', domain: 'd'.repeat(101) }, 'domain must be text up to 100 characters.'],
    ['numeric domain', { question: 'ok', domain: 9 }, 'domain must be text up to 100 characters.'],
    ['topK zero', { question: 'ok', topK: 0 }, 'topK must be an integer from 1 to 10.'],
    ['topK eleven', { question: 'ok', topK: 11 }, 'topK must be an integer from 1 to 10.'],
    ['topK fractional', { question: 'ok', topK: 2.5 }, 'topK must be an integer from 1 to 10.'],
    ['topK text', { question: 'ok', topK: 'abc' }, 'topK must be an integer from 1 to 10.']
  ];
  for (const [label, body, message] of cases) {
    const response = await kAsk(adminA, body);
    expect(response.status === 400, `${label} expected 400, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 400);
    expect(response.json.error === message, `${label} expected "${message}", got "${response.json.error}"`);
    expectNoInternalLeak(response);
  }
  const scalar = await http(adminA, 'POST', '/api/v1/knowledge/ask', { body: 'why' });
  expect(scalar.status === 400 && scalar.json.error === 'Request body must be valid JSON.', `scalar ask body: ${scalar.status} ${scalar.text.slice(0, 120)}`);
  notes.push('guards run before the embedding and LLM calls, so they answer 400 even while the AI service is offline');
  return notes;
});

await suite.test('G11-15', 'POST /knowledge/ask live path: grounded citations, or a sanitized 502 while the AI service is offline', async () => {
  requireRag();
  const notes = [];
  const online = await aiAvailable();
  const started = Date.now();
  const response = await kAsk(adminA, { question: `What does the ${RARE_A} protocol govern?`, domain: 'PAYMENTS', topK: 3 });
  const elapsed = Date.now() - started;
  expect(elapsed < 90000, `ask must not hang indefinitely, took ${elapsed} ms`);
  if (!online) {
    expect(response.status === 502, `offline AI service expected 502, got ${response.status} ${response.text.slice(0, 200)}`);
    expectEnvelope(response, 502);
    expect(response.json.error === 'AI Service is unreachable. Please retry in a moment.', `502 message leaked detail: ${response.json.error}`);
    expectNoInternalLeak(response);
    expectNoCredentialLeak(response);
    notes.push(`answer path skipped with the 502: the FastAPI LLM service on ${AI_URL} is offline, retrieval guards are covered by G11-14`);
    return notes;
  }
  expect(response.status === 200, `ask expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  const data = response.json.data;
  expect(typeof data.answer === 'string' && data.answer.length > 0, 'answer missing');
  expect(Array.isArray(data.citations), 'citations array missing');
  const citation = data.citations[0];
  expect(citation && citation.documentId && citation.label === '[1]' && typeof citation.excerpt === 'string', `citation shape: ${JSON.stringify(citation)}`);
  expect(citation.excerpt.length <= 1200, 'excerpt must be capped at 1200 characters');
  notes.push(`answer ${data.answer.length} chars, ${data.citations.length} citations in ${elapsed} ms`);
  return notes;
});

// ------------------------------------------------------------------- G12 RAG

await suite.test('G12-01', 'POST /rag/search hybrid ranking: the rare-token document wins, chunk shape is safe', async () => {
  requireRag();
  const notes = [];
  const response = await rSearch(adminA, { query: `${RARE_A} reconciliation sweep`, topK: 5 });
  expect(response.status === 200, `search expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  const chunks = response.json.data;
  expect(Array.isArray(chunks) && chunks.length > 0, 'search returned no chunks');
  expect(response.json.meta.total === chunks.length, `meta.total ${response.json.meta.total} vs ${chunks.length} chunks`);

  for (const chunk of chunks) {
    for (const field of ['id', 'docId', 'chunkContent', 'metadata', 'combinedScore']) {
      expect(field in chunk, `chunk missing "${field}"`);
    }
    expect(chunk.docId !== undefined, 'chunk must expose docId');
  }
  const serialized = JSON.stringify(chunks);
  expect(!serialized.includes('"embedding"'), 'search must never serialize vectors');
  for (let index = 1; index < chunks.length; index++) {
    expect(chunks[index - 1].combinedScore >= chunks[index].combinedScore, `combinedScore must descend, broke at index ${index}`);
  }
  const lexical = chunks.filter(chunk => chunk.chunkContent.includes(RARE_A));
  expect(lexical.length >= 1, 'the FTS branch did not surface the rare-token chunk');
  expect(chunks[0].chunkContent.includes(RARE_A), `the rare-token chunk must rank first, got doc ${chunks[0].docId} "${chunks[0].chunkContent.slice(0, 60)}"`);
  expect(chunks[0].docId === ids.ftsDoc, `the top hit should be the rare-token fixture, got ${chunks[0].docId}`);
  expect(chunks[0].ftsRank !== null && chunks[0].ftsRank !== undefined, `the lexical branch should rank the hit, got ftsRank ${chunks[0].ftsRank}`);
  expect(typeof chunks[0].metadata?.title === 'string' && chunks[0].metadata.title.length > 0, `chunk metadata lost the document title: ${JSON.stringify(chunks[0].metadata)}`);
  notes.push(`hits ${chunks.length}, top "${chunks[0].metadata.title}" score ${chunks[0].combinedScore} semanticRank ${chunks[0].semanticRank} ftsRank ${chunks[0].ftsRank}`);
  const missingIndex = chunks.filter(chunk => chunk.chunkIndex === 0).length;
  if (missingIndex === chunks.length) {
    notes.push('every chunk reports chunkIndex 0: hybrid_search_chunks does not select chunk_index, so consumers cannot show which part of a document matched');
  }
  return notes;
});

await suite.test('G12-02', 'Search topK: default 3, boundary 1 and 20 honored, invalid values rejected', async () => {
  requireRag();
  const notes = [];
  const wide = await rSearch(adminA, { query: 'billing gateway ledger' });
  expect(wide.status === 200, `default search expected 200, got ${wide.status} ${wide.text.slice(0, 160)}`);
  expect(wide.json.data.length <= 3, `default topK expected at most 3 chunks, got ${wide.json.data.length}`);

  const one = await rSearch(adminA, { query: 'billing gateway ledger', topK: 1 });
  expect(one.status === 200 && one.json.data.length === 1, `topK=1 expected 1 chunk, got ${one.text.slice(0, 160)}`);

  const twenty = await rSearch(adminA, { query: 'billing gateway ledger', topK: 20 });
  expect(twenty.status === 200 && twenty.json.data.length <= 20, `topK=20 expected at most 20, got ${twenty.json.data.length}`);
  expect(twenty.json.data.length >= one.json.data.length, 'a wider topK must not return fewer chunks');

  for (const topK of [0, 21, -1, 2.5, 'abc', null]) {
    const response = await rSearch(adminA, { query: 'billing', topK });
    expect(response.status === 400, `topK=${JSON.stringify(topK)} expected 400, got ${response.status} ${response.text.slice(0, 120)}`);
    expectEnvelope(response, 400);
    expect(response.json.error === 'topK must be an integer from 1 to 20.', `topK message: ${response.json.error}`);
  }
  notes.push(`widths: default ${wide.json.data.length}, topK=1 ${one.json.data.length}, topK=20 ${twenty.json.data.length}`);
  return notes;
});

await suite.test('G12-03', 'Search guards: query type, blank, oversize and domain validation', async () => {
  const notes = [];
  const cases = [
    ['missing query', {}, 'Search query must not be empty.'],
    ['blank query', { query: '   ' }, 'Search query must not be empty.'],
    ['numeric query', { query: 42 }, 'Search query must not be empty.'],
    ['array query', { query: ['a'] }, 'Search query must not be empty.'],
    ['oversize query', { query: 'q'.repeat(20001) }, 'query must not exceed 20,000 characters.'],
    ['blank domain', { query: 'ok', domain: '   ' }, 'domain must be text up to 100 characters.'],
    ['oversize domain', { query: 'ok', domain: 'd'.repeat(101) }, 'domain must be text up to 100 characters.'],
    ['numeric domain', { query: 'ok', domain: 5 }, 'domain must be text up to 100 characters.']
  ];
  for (const [label, body, message] of cases) {
    const response = await rSearch(adminA, body);
    expect(response.status === 400, `${label} expected 400, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 400);
    expect(response.json.error === message, `${label} expected "${message}", got "${response.json.error}"`);
    expectNoInternalLeak(response);
  }
  const boundary = await rSearch(adminA, { query: 'x'.repeat(20000) });
  if (ragBlocked) {
    expect(boundary.status === 502, `with the embedding provider down a valid query expected 502, got ${boundary.status} ${boundary.text.slice(0, 120)}`);
    notes.push(`live retrieval checks skipped: ${ragBlocked}`);
    return notes;
  }
  expect(boundary.status === 200, `20,000-char query must pass validation, got ${boundary.status} ${boundary.text.slice(0, 120)}`);
  const nullDomain = await rSearch(adminA, { query: 'ledger', domain: null });
  expect(nullDomain.status === 200, `an explicit null domain must mean "no filter", got ${nullDomain.status} ${nullDomain.text.slice(0, 120)}`);
  const anonymous = await http(null, 'POST', '/api/v1/rag/search', { body: { query: 'ledger' } });
  expect(anonymous.status === 401, `anonymous search expected 401, got ${anonymous.status}`);
  notes.push('a numeric query used to reach the embedding gateway and raise a 500; it is now a 400');
  return notes;
});

await suite.test('G12-04', 'Search domain filter and semantic-only recall across the fixture corpus', async () => {
  requireRag();
  const notes = [];
  const health = await rSearch(adminA, { query: 'patient invoices and care accounting', domain: 'HEALTH', topK: 10 });
  expect(health.status === 200, `HEALTH search expected 200, got ${health.status} ${health.text.slice(0, 160)}`);
  expect(health.json.data.length > 0, 'the HEALTH domain query returned nothing');
  expect(health.json.data.every(chunk => chunk.metadata?.domain === 'HEALTH'), `the domain filter leaked other domains: ${[...new Set(health.json.data.map(c => c.metadata?.domain))].join(',')}`);
  expect(health.json.data.some(chunk => chunk.docId === ids.semDoc), 'the HEALTH fixture must be retrievable by a paraphrased query');

  const payments = await rSearch(adminA, { query: 'patient invoices and care accounting', domain: 'PAYMENTS', topK: 10 });
  expect(payments.json.data.every(chunk => chunk.metadata?.domain === 'PAYMENTS'), 'PAYMENTS filter leaked');
  const disjoint = health.json.data.map(c => c.id).filter(id => payments.json.data.map(c => c.id).includes(id));
  expect(disjoint.length === 0, `domain branches must return disjoint sets, shared ${disjoint.length} chunks`);

  const emptyDomain = await rSearch(adminA, { query: 'ledger', domain: `NO_DOMAIN_${RUN}`.slice(0, 100), topK: 10 });
  expect(emptyDomain.status === 200 && emptyDomain.json.data.length === 0 && emptyDomain.json.meta.total === 0, `unknown domain expected 0 hits, got ${emptyDomain.text.slice(0, 160)}`);
  notes.push(`HEALTH ${health.json.data.length} hits, PAYMENTS ${payments.json.data.length} hits, unknown domain 0 hits`);
  return notes;
});

await suite.test('G12-05', 'Search isolation: organization B cannot retrieve organization A vectors and vice versa', async () => {
  requireRag();
  const notes = [];
  const leaked = await rSearch(adminB, { query: `${RARE_A} reconciliation sweep`, topK: 20 });
  expect(leaked.status === 200, `org B search expected 200, got ${leaked.status}`);
  expect(!JSON.stringify(leaked.json.data).includes(RARE_A), 'organization B retrieved organization A content');
  expect(leaked.json.data.every(chunk => chunk.docId !== ids.ftsDoc && chunk.docId !== ids.dupDoc), 'cross-tenant chunk id leaked into the result set');

  const own = await rSearch(adminB, { query: RARE_B, topK: 5 });
  expect(own.json.data.length >= 1 && own.json.data[0].docId === ids.foreignDoc, `organization B must find its own document, got ${own.text.slice(0, 160)}`);

  const reverse = await rSearch(adminA, { query: RARE_B, topK: 20 });
  expect(!JSON.stringify(reverse.json.data).includes(RARE_B), 'organization A retrieved organization B content');

  const proposalLeak = await rSearch(adminA, { query: 'settlement ledger', topK: 20 });
  expect(proposalLeak.json.data.every(chunk => chunk.docId !== ids.foreignDoc), 'the tenant filter on searchHybrid must hold for a generic query');
  notes.push(`org B rare-token search returned ${leaked.json.data.length} rows (none from org A), own-token search returned ${own.json.data.length}`);
  return notes;
});

await suite.test('G12-06', 'POST /rag/ingest parity with the vault endpoint: same validation, same rows, plus a message', async () => {
  requireRag();
  const notes = [];
  const created = await rIngest(adminA, {
    title: `E2E G12 Rag Ingest ${RUN}`,
    content: `${makeWords(500)} settlement annex text`
  });
  expect(created.status === 201, `rag ingest expected 201, got ${created.status} ${created.text.slice(0, 200)}`);
  const data = created.json.data;
  expect(typeof data.docId === 'string' && data.totalChunks === expectedChunks(503), `503 words expected ${expectedChunks(503)} chunks, got ${JSON.stringify(data)}`);
  expect(created.json.message === 'Document successfully ingested and indexed with vector embeddings.', `rag ingest message: ${created.json.message}`);
  docIds.push(data.docId);
  ids.ragDoc = data.docId;

  const fetched = await kGet(adminA, data.docId);
  expect(fetched.status === 200 && fetched.json.data.category === 'GENERAL' && fetched.json.data.domain === 'GENERAL', 'rag ingest must apply the same GENERAL defaults');

  const guards = [
    [{ title: 42, content: 'body' }, 'Document title is required.'],
    [{ title: `E2E G12 guard ${RUN}`, content: 42 }, 'Document content is required.'],
    [{ title: `E2E G12 guard ${RUN}`, content: 'body', category: 'c'.repeat(101) }, 'category must not exceed 100 characters.'],
    [{ title: `E2E G12 guard ${RUN}`, content: 'body', domain: 7 }, 'domain is required.']
  ];
  for (const [body, message] of guards) {
    const response = await rIngest(adminA, body);
    expect(response.status === 400, `${JSON.stringify(body).slice(0, 60)} expected 400, got ${response.status} ${response.text.slice(0, 120)}`);
    expectEnvelope(response, 400);
    expect(response.json.error === message, `rag ingest expected "${message}", got "${response.json.error}"`);
  }
  const anonymous = await http(null, 'POST', '/api/v1/rag/ingest', { body: { title: 'x', content: 'y' } });
  expect(anonymous.status === 401, `anonymous ingest expected 401, got ${anonymous.status}`);
  notes.push('this endpoint used to raise unhandled 500s for a numeric title, numeric content and numeric domain — the shared IngestDocumentUseCase now rejects all three with 400');
  return notes;
});

await suite.test('G12-07', 'Duplicate content: the same text ingested twice yields two documents and no deduplication', async () => {
  requireRag();
  const notes = [];
  const content = `Duplicate settlement paragraph ${RUN}: the ${RARE_A} ledger sweep repeats nightly and is fully idempotent.`;
  const second = await ingest(adminA, { title: `E2E G11 Rare Token Doc ${RUN}`, category: 'CASE_STUDY', domain: 'PAYMENTS', content });
  expect(second.status === 201, `duplicate ingest expected 201, got ${second.status} ${second.text.slice(0, 160)}`);
  ids.dupDoc = second.json.data.docId;
  expect(ids.dupDoc !== ids.ftsDoc, 'the vault must not reuse a document id');

  const list = await kList(adminA, `?search=${encodeURIComponent('Rare Token Doc')}`);
  expect(list.json.data.length === 2, `two same-title documents expected, got ${list.json.data.length}`);
  const hits = await rSearch(adminA, { query: RARE_A, topK: 10 });
  const documents = new Set(hits.json.data.map(chunk => chunk.docId));
  expect(documents.has(ids.ftsDoc) && documents.has(ids.dupDoc), `both copies must be searchable, got ${[...documents].join(',')}`);
  notes.push('there is no content hash or uniqueness constraint: identical text is embedded, stored and re-ranked twice');
  return notes;
});

await suite.test('G12-08', 'Large document: 1500-word sliding windows are all searchable and capped by topK', async () => {
  requireRag();
  const notes = [];
  const list = await kGet(adminA, ids.bigDoc);
  expect(list.json.data.totalChunks === expectedChunks(1500), `expected ${expectedChunks(1500)} windows, got ${list.json.data.totalChunks}`);

  const hits = await rSearch(adminA, { query: 'microservices gateway event driven billing ledger workflows', domain: 'ARCH', topK: 20 });
  expect(hits.status === 200, `large search expected 200, got ${hits.status} ${hits.text.slice(0, 160)}`);
  const own = hits.json.data.filter(chunk => chunk.docId === ids.bigDoc);
  expect(own.length >= 2, `a 1500-word document should surface several windows, got ${own.length}`);
  for (const chunk of own) {
    expect(chunk.chunkContent.length > 1, 'empty window returned');
    expect(chunk.metadata?.domain === 'ARCH', 'window metadata lost the domain label');
  }
  const overlap = own.map(chunk => chunk.chunkContent);
  expect(new Set(overlap).size === overlap.length, 'the same window was returned twice');
  const openings = own.map(chunk => chunk.chunkContent.slice(0, 24));
  notes.push(`window openings: ${openings.map(text => `"${text.trim().slice(0, 18)}…"`).join(', ')}`);
  notes.push(`${own.length}/${hits.json.data.length} returned windows belong to the 1500-word document`);
  notes.push(await dbNote(
    `SELECT MIN(char_length(chunk_content)) AS shortest, MAX(char_length(chunk_content)) AS longest,
            COUNT(*) FILTER (WHERE embedding IS NULL)::int AS null_vectors
     FROM document_chunks WHERE doc_id = $1;`,
    [ids.bigDoc], rows => `window lengths ${rows[0].shortest}-${rows[0].longest} chars, null vectors ${rows[0].null_vectors}`
  ));
  return notes;
});

await suite.test('G12-09', 'Ingest rollback invariant: no knowledge_docs row survives without its chunks in either tenant', async () => {
  const db = await database();
  if (!db) throw new SkipError(`database check unavailable: ${poolState}`);
  const notes = [];
  const orphans = await db.query(
    `SELECT kd.id, kd.title FROM knowledge_docs kd
     LEFT JOIN document_chunks dc ON dc.doc_id = kd.id
     WHERE kd.organization_id = ANY(ARRAY[$1, $2]::uuid[]) AND dc.id IS NULL;`,
    [ids.orgA, ids.orgB]
  );
  expect(orphans.rowCount === 0, `found ${orphans.rowCount} chunk-less documents: ${orphans.rows.map(r => r.title).join(', ')}`);
  const dimCheck = await db.query(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE vector_dims(embedding) = 768)::int AS dims768
     FROM document_chunks dc JOIN knowledge_docs kd ON kd.id = dc.doc_id
     WHERE kd.organization_id = ANY(ARRAY[$1, $2]::uuid[]);`,
    [ids.orgA, ids.orgB]
  );
  expect(dimCheck.rows[0].total === dimCheck.rows[0].dims768, `some chunks are not 768-dimensional: ${JSON.stringify(dimCheck.rows[0])}`);
  const ftsCheck = await db.query(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE fts IS NULL)::int AS null_fts
     FROM document_chunks dc JOIN knowledge_docs kd ON kd.id = dc.doc_id
     WHERE kd.organization_id = ANY(ARRAY[$1, $2]::uuid[]);`,
    [ids.orgA, ids.orgB]
  );
  expect(ftsCheck.rows[0].null_fts === 0, `${ftsCheck.rows[0].null_fts} chunks have no tsvector, the lexical branch cannot see them`);
  notes.push(`${dimCheck.rows[0].total} chunks across both tenants, all vector(768) and all tsvector-populated, zero chunk-less documents`);
  notes.push('the embedding-failure rollback itself could not be forced: the provider is Gemini, so a synthetic 502 cannot be injected against it');
  return notes;
});

await suite.test('G12-10', 'POST /rag/generate-proposal guards: rfpText and maxTokens validated before any provider call', async () => {
  const notes = [];
  const cases = [
    ['missing rfpText', {}, 'RFP text is required to generate a proposal.'],
    ['blank rfpText', { rfpText: '  \t ' }, 'RFP text is required to generate a proposal.'],
    ['numeric rfpText', { rfpText: 42 }, 'RFP text is required to generate a proposal.'],
    ['oversize rfpText', { rfpText: 'r'.repeat(20001) }, 'rfpText must not exceed 20,000 characters.'],
    ['maxTokens zero', { rfpText: 'build us a portal', maxTokens: 0 }, 'maxTokens must be an integer from 1 to 8,000.'],
    ['maxTokens 8001', { rfpText: 'build us a portal', maxTokens: 8001 }, 'maxTokens must be an integer from 1 to 8,000.'],
    ['maxTokens fractional', { rfpText: 'build us a portal', maxTokens: 2.5 }, 'maxTokens must be an integer from 1 to 8,000.'],
    ['maxTokens text', { rfpText: 'build us a portal', maxTokens: 'lots' }, 'maxTokens must be an integer from 1 to 8,000.']
  ];
  for (const [label, body, message] of cases) {
    const response = await rProposal(adminA, body);
    expect(response.status === 400, `${label} expected 400, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 400);
    expect(response.json.error === message, `${label} expected "${message}", got "${response.json.error}"`);
    expectNoInternalLeak(response);
  }
  const domain = await rProposal(adminA, { rfpText: 'build us a portal', domain: 'd'.repeat(101) });
  expect(domain.status === 400, `oversize domain expected 400, got ${domain.status} ${domain.text.slice(0, 120)}`);
  const anonymous = await http(null, 'POST', '/api/v1/rag/generate-proposal', { body: { rfpText: 'hello' } });
  expect(anonymous.status === 401, `anonymous expected 401, got ${anonymous.status}`);
  notes.push('maxTokens arrives through Number(), so "lots" becomes NaN and is rejected as a non-integer rather than reaching the LLM');
  return notes;
});

await suite.test('G12-11', 'POST /rag/generate-proposal live path: overview plus sources, or a sanitized 502 while the AI service is offline', async () => {
  requireRag();
  const notes = [];
  const online = await aiAvailable();
  const started = Date.now();
  const response = await rProposal(adminA, {
    rfpText: `We need an auditable settlement ledger that sweeps a reconciliation queue nightly for ${RARE_A} style workflows.`,
    domain: 'PAYMENTS',
    maxTokens: 400
  });
  const elapsed = Date.now() - started;
  expect(elapsed < 90000, `generate-proposal must not hang indefinitely, took ${elapsed} ms`);
  if (!online) {
    expect(response.status === 502, `offline AI service expected 502, got ${response.status} ${response.text.slice(0, 200)}`);
    expectEnvelope(response, 502);
    expect(response.json.error === 'AI Service is unreachable. Please retry in a moment.', `502 message leaked detail: ${response.json.error}`);
    expectNoInternalLeak(response);
    expectNoCredentialLeak(response);
    expect(!response.text.includes('localhost'), 'the upstream host must not appear in the error payload');
    notes.push(`generation skipped with the 502 after ${elapsed} ms: retrieval ran first (topK is fixed at 3 inside the use case) and only the LLM call failed`);
    return notes;
  }
  expect(response.status === 200, `generate-proposal expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  expect(typeof response.json.data.overview === 'string' && response.json.data.overview.length > 0, 'overview missing');
  expect(Array.isArray(response.json.data.sources) && response.json.data.sources.length <= 3, `sources must be capped at 3, got ${response.json.data.sources?.length}`);
  notes.push(`overview ${response.json.data.overview.length} chars, ${response.json.data.sources.length} sources in ${elapsed} ms`);
  return notes;
});

await suite.test('G11/G12-99', 'Teardown: every document removed through the API, zero rows left for both tenants', async () => {
  requireRag();
  const notes = [];
  const tracked = [...new Set([...docIds, ids.foreignDoc].filter(Boolean))];
  let removed = 0;
  for (const id of tracked) {
    const jar = id === ids.foreignDoc ? adminB : adminA;
    const response = await kDelete(jar, id);
    expect(response.status === 204, `delete ${id} expected 204, got ${response.status} ${response.text.slice(0, 120)}`);
    removed++;
  }
  const listA = await kList(adminA, '?limit=100');
  const listB = await kList(adminB, '?limit=100');
  expect(listA.json.meta.total === 0, `org A still lists ${listA.json.meta.total} documents`);
  expect(listB.json.meta.total === 0, `org B still lists ${listB.json.meta.total} documents`);

  const db = await database();
  if (db) {
    const left = await db.query(
      `SELECT (SELECT COUNT(*)::int FROM knowledge_docs WHERE organization_id = ANY(ARRAY[$1,$2]::uuid[])) AS docs,
              (SELECT COUNT(*)::int FROM document_chunks dc JOIN knowledge_docs kd ON kd.id = dc.doc_id
               WHERE kd.organization_id = ANY(ARRAY[$1,$2]::uuid[])) AS chunks;`,
      [ids.orgA, ids.orgB]
    );
    expect(left.rows[0].docs === 0 && left.rows[0].chunks === 0, `rows survived: ${JSON.stringify(left.rows[0])}`);
    notes.push(`${removed} documents deleted, PostgreSQL confirms 0 knowledge_docs and 0 document_chunks for both tenants`);
  } else {
    notes.push(`database check skipped (${poolState})`);
  }
  pool?.end();
  pool = null; poolState = null;
  return notes;
});

// --------------------------------------------------------------------- report

const failing = suite.results.filter(item => item.status !== 'PASS');
const findings = [
  ['G11-13 / code', '`knowledgeRoutes.ts` and `ragRoutes.ts` apply `requireAuth` + `requireOrganization` only, so a VIEWER can ingest, delete and query the whole knowledge vault. Every other write surface in the API is role-checked.'],
  ['G11-01 / G11-09', '`IngestDocumentUseCase` passes the raw `content` to `createDocument`, but `knowledge_docs` has no content column and the repository INSERT ignores the field — the original text only survives as sliding-window chunks, so a document can never be shown or re-exported verbatim.'],
  ['G12-01', '`hybrid_search_chunks` selects id, doc_id, chunk_content, metadata and the ranks but not `chunk_index`, and `PostgresKnowledgeRepository.searchHybrid` then defaults it to 0 — every returned chunk reports window 0, so a UI cannot highlight or de-duplicate matches inside a long document.'],
  ['G12-07', 'Ingesting identical text twice creates two documents and two sets of 768-dimensional vectors: there is no content hash or unique constraint, so a re-upload silently doubles recall noise and storage.'],
  ['G11-04', 'The GENERAL fallback for category/domain fires only for an omitted or null value; an empty string is a 400 "category is required." A form that clears the field and submits "" therefore fails where omitting it succeeds.'],
  ['G12-04 / code', 'The domain filter is applied to both the semantic and the lexical branch of `hybrid_search_chunks`, so a filtered query can return fewer than topK chunks with no signal that the corpus was narrower than requested.'],
  ['G11-15 / G12-11', 'The answer and overview success paths are only covered as guards plus the sanitized 502: the FastAPI LLM service on http://localhost:8000 is offline, and the RRF fusion itself is asserted through ranking rather than through generated prose.'],
  ['G12-09', 'The ingest rollback (embedding failure deletes the document row) cannot be exercised against the live Gemini provider, so only its post-condition invariant is proven — no chunk-less document exists.']
];

const defectsSection = [
  '## Defects and behaviour findings recorded by this run',
  '',
  '| # | Area | Finding |',
  '| --- | --- | --- |',
  ...findings.map(([area, text], index) => `| F${index + 1} | ${area} | ${text} |`),
  '',
  '## Cases that did not pass',
  '',
  ...(failing.length
    ? ['', '| Case | Status | Reason |', '| --- | --- | --- |',
       ...failing.map(item => `| ${item.id} | ${item.status} | ${(item.reason || '').replace(/\|/g, '\\|')} |`)]
    : ['- All cases passed.']),
  '',
  '## Behaviour notes',
  '',
  ...suite.observations.map(item => `- ${item}`)
].join('\n');

const coverageSection = [
  '## G11 / G12 endpoint coverage',
  '',
  '| Endpoint | Case | Status |',
  '| --- | --- | --- |',
  '| POST /knowledge/ask | G11-14, G11-15 | guards + AI-offline path |',
  '| POST /knowledge/documents | G11-01, G11-02, G11-03, G11-04, G11-13 | covered |',
  '| GET /knowledge/documents | G11-05, G11-06, G11-07, G11-08, G11-13 | covered |',
  '| GET /knowledge/documents/:id | G11-01, G11-08, G11-09, G11-10 | covered |',
  '| DELETE /knowledge/documents/:id | G11-08, G11-11, G11-12, G11-13, G11/G12-99 | covered |',
  '| POST /rag/search | G12-01, G12-02, G12-03, G12-04, G12-05, G12-07, G12-08 | covered |',
  '| POST /rag/ingest | G12-06 | covered |',
  '| POST /rag/generate-proposal | G12-10, G12-11 | guards + AI-offline path |'
].join('\n');

const codeSection = [
  '## Backend defects found and fixed before this run',
  '',
  'Four classes of unhandled 500 were reproduced against this surface, fixed, rebuilt and re-probed:',
  '',
  '| Location | Before | After |',
  '| --- | --- | --- |',
  '| `application/use-cases/IngestDocumentUseCase.ts` | a numeric or array `title`/`content` reached PostgreSQL and crashed; `category`/`domain` were cast with `as string` | unknown-typed DTO fields, `requiredText`/`optionalLabel` guards, 1,000,000-character content cap, GENERAL defaults |',
  '| `application/use-cases/SearchHybridRAGUseCase.ts` | `{query: 42}` threw a TypeError inside the embedding gateway | 400 "Search query must not be empty.", 20,000-character cap, domain and topK (1-20) validation |',
  '| `application/use-cases/GenerateProposalUseCase.ts` | `{rfpText: 42}` threw inside `.trim()` | 400 guard, 20,000-character cap, maxTokens integer 1-8,000 |',
  '| `application/use-cases/KnowledgeVaultUseCases.ts` | a malformed `:id` was passed straight to PostgreSQL (`invalid input syntax for type uuid`, 500) | `requiredUuid` validation → 400 before the query |',
  '| `presentation/controllers/KnowledgeController.ts` | `body.category as string` casts | passes unknown values, validation lives in the use case |',
  '| `presentation/middlewares/errorHandler.ts` | a JSON scalar body (rejected by express strict mode) or an oversized payload reached the generic branch and answered 500 | `entity.parse.failed` → 400 "Request body must be valid JSON.", `entity.too.large` → 413, `encoding.unsupported` → 415 |'
].join('\n');

const { reportDir } = suite.writeReport({
  reportDirName: argValue('report-dir', `${RUN}_G11_G12_knowledge_rag`),
  extraSections: [defectsSection, codeSection, coverageSection]
});

const cleanupFile = path.join(reportDir, `${RUN}_cleanup.sql`);
fs.appendFileSync(cleanupFile, [
  `-- Knowledge vault rows for this run. Deleting the organizations above cascades through`,
  `-- knowledge_docs, but the statements below are explicit so the vector rows are removable`,
  `-- without touching the organizations first. Review before executing.`,
  `BEGIN;`,
  `DELETE FROM document_chunks WHERE doc_id IN (SELECT id FROM knowledge_docs WHERE organization_id = ANY(ARRAY[${[ids.orgA, ids.orgB].filter(Boolean).map(id => `'${id}'`).join(', ')}]::uuid[]));`,
  `DELETE FROM knowledge_docs WHERE organization_id = ANY(ARRAY[${[ids.orgA, ids.orgB].filter(Boolean).map(id => `'${id}'`).join(', ')}]::uuid[]);`,
  `COMMIT;`,
  ``
].join('\n'));

console.log(`report directory: ${reportDir}`);
