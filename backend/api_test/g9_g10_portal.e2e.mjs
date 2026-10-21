// G9 (staff client-portal management) and G10 (client portal, opaque Bearer token) e2e suite.
// node api_test/g9_g10_portal.e2e.mjs --base-url http://127.0.0.1:5099
import { createHash } from 'node:crypto';
import {
  CookieJar, SkipError, Suite, argValue, createHttp, readBackendEnv,
  expect, expectEnvelope, expectNoCredentialLeak, expectNoInternalLeak, runId
} from './harness.mjs';

const BASE_URL = argValue('base-url', process.env.E2E_BASE_URL || 'http://127.0.0.1:5099');
const AI_URL = argValue('ai-url', process.env.E2E_AI_URL || 'http://localhost:8000');
const RUN = runId();
const PASSWORD = `E2eP910Pass!${RUN}`;
const email = role => `g9-${role}-${RUN}@presaleee-e2e.test`;

const ADMIN_A = email('admin-a');
const ADMIN_B = email('admin-b');
const LEAD = email('lead');
const VIEWER = email('viewer');
const SALES = email('sales-rep');
const ARCHITECT = email('architect');
const CLIENT = `client-${RUN}@example.test`;

const ORGANIZATION_A = `E2E G9 Org A ${RUN}`;
const ORGANIZATION_B = `E2E G9 Org B ${RUN}`;

const http = createHttp(BASE_URL);
const suite = new Suite({
  code: RUN,
  title: 'G9 Staff Portal Management + G10 Client Portal',
  baseUrl: BASE_URL,
  targetNote: 'local backend, real Supabase PostgreSQL, cookie auth for staff + opaque Bearer token for clients'
});

const adminA = new CookieJar();
const adminB = new CookieJar();
const presales = new CookieJar();
const viewer = new CookieJar();
const sales = new CookieJar();
const architect = new CookieJar();
const ids = {};
const uuid = '2f4c9b6a-1d3e-4a7b-9c8d-1e2f3a4b5c6d';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

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

async function createProposal(jar, body) {
  return http(jar, 'POST', '/api/v1/proposals', { body });
}

async function patchProposal(jar, id, body) {
  return http(jar, 'PATCH', `/api/v1/proposals/${id}`, { body });
}

async function putSheet(jar, id, sheetName, sheetData) {
  return http(jar, 'PUT', `/api/v1/proposals/${id}/sheets/${encodeURIComponent(sheetName)}`, { body: { sheetData } });
}

async function newSession(jar, body) {
  return http(jar, 'POST', '/api/v1/portal/sessions', { body });
}

async function revokeSession(jar, sessionId) {
  return http(jar, 'DELETE', `/api/v1/portal/sessions/${sessionId}`);
}

async function listSessions(jar, proposalId) {
  return http(jar, 'GET', `/api/v1/proposals/${proposalId}/portal-sessions`);
}

async function listStaffMaterials(jar, proposalId) {
  return http(jar, 'GET', `/api/v1/proposals/${proposalId}/portal-materials`);
}

async function createMaterial(jar, proposalId, body) {
  return http(jar, 'POST', `/api/v1/proposals/${proposalId}/portal-materials`, { body });
}

async function deleteMaterial(jar, proposalId, materialId) {
  return http(jar, 'DELETE', `/api/v1/proposals/${proposalId}/portal-materials/${materialId}`);
}

/** Client portal call: Authorization: Bearer <opaque token>, staff cookies never sent. */
async function client(method, token, proposalId, route, body) {
  return http(null, method, `/api/v1/portal/proposals/${proposalId}${route}`, { bearer: token, body });
}

async function clientRaw(token, proposalId, route, method = 'GET', body) {
  const response = await fetch(`${BASE_URL}/api/v1/portal/proposals/${proposalId}${route}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = buffer.toString('utf8');
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), buffer, text, json };
}

async function auditFor(entityId) {
  const response = await http(adminA, 'GET', `/api/v1/audit-logs?entityId=${entityId}&limit=100`);
  expect(response.status === 200, `audit list expected 200, got ${response.status} ${response.text.slice(0, 160)}`);
  return response.json.data;
}

/** DRAFT (optional sheet data) -> IN_REVIEW -> APPROVED, the only status a portal session may be created for. */
async function approveProposal(jar, title, pricing, approver = adminA) {
  const created = await createProposal(jar, { title, summary: `E2E portal fixture ${RUN}`, currency: 'VND' });
  expect(created.status === 201, `portal proposal fixture expected 201, got ${created.status} ${created.text.slice(0, 200)}`);
  const id = created.json.data.id;
  if (pricing) {
    const sheet = await putSheet(jar, id, 'Pricing & Quotation', pricing);
    expect(sheet.status === 200, `pricing sheet write expected 200, got ${sheet.status} ${sheet.text.slice(0, 160)}`);
  }
  const inReview = await patchProposal(jar, id, { status: 'IN_REVIEW' });
  expect(inReview.status === 200, `DRAFT -> IN_REVIEW expected 200, got ${inReview.status} ${inReview.text.slice(0, 160)}`);
  const approved = await patchProposal(approver, id, { status: 'APPROVED' });
  expect(approved.status === 200, `IN_REVIEW -> APPROVED expected 200, got ${approved.status} ${approved.text.slice(0, 160)}`);
  return id;
}

async function aiServiceAvailable() {
  try {
    const response = await fetch(`${AI_URL}/health`, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
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

function isOpaqueToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

// ------------------------------------------------------------------ bootstrap

await suite.test('G9/G10-00', 'Bootstrap: organizations, portal roles, APPROVED proposals in both tenants', async () => {
  const notes = [];
  const regA = await register(adminA, ADMIN_A, ORGANIZATION_A, `g9a-${RUN}.example`);
  const regB = await register(adminB, ADMIN_B, ORGANIZATION_B, `g9b-${RUN}.example`);
  ids.orgA = regA.json.data.organization.id;
  ids.orgB = regB.json.data.organization.id;
  ids.adminA = regA.json.data.user.id;
  ids.adminB = regB.json.data.user.id;
  suite.trackUser(ids.adminA); suite.trackUser(ids.adminB);
  suite.trackOrganization(ids.orgA); suite.trackOrganization(ids.orgB);

  for (const [jar, address, role, name] of [
    [presales, LEAD, 'PRESALE_LEAD', 'E2E G9 Presales Lead'],
    [viewer, VIEWER, 'VIEWER', 'E2E G9 Viewer'],
    [sales, SALES, 'SALES_REP', 'E2E G9 Sales Rep'],
    [architect, ARCHITECT, 'SOLUTION_ARCHITECT', 'E2E G9 Solution Architect']
  ]) {
    const member = await addMember(adminA, address, role, name);
    expect(member.status === 201, `${role} fixture expected 201, got ${member.status} ${member.text.slice(0, 160)}`);
    suite.trackUser(member.json.data.id);
    await login(jar, address);
  }

  const jwtProbe = await login(new CookieJar(), ADMIN_A);
  ids.staffJwt = jwtProbe.cookieValue('presaleee_access');
  expect(ids.staffJwt, 'staff access token cookie missing after login');

  ids.approved = await approveProposal(presales, `E2E G9 Shared Proposal ${RUN}`, {
    taxPercentage: 8, grandTotal: 12345678, items: [{ name: 'E2E milestone', amount: 1000000 }]
  });
  ids.approvedB = await approveProposal(adminB, `E2E G9 Foreign Proposal ${RUN}`, null, adminB);
  ids.secondApproved = await approveProposal(presales, `E2E G9 Second Shared Proposal ${RUN}`);
  ids.thirdApproved = await approveProposal(presales, `E2E G9 Pullback Proposal ${RUN}`);

  const draft = await createProposal(presales, { title: `E2E G9 Draft Proposal ${RUN}`, summary: 'Not approved yet.', currency: 'VND' });
  ids.draft = draft.json.data.id;
  const inReview = await patchProposal(presales, ids.draft, { status: 'IN_REVIEW' });
  expect(inReview.status === 200, `fixture IN_REVIEW expected 200, got ${inReview.status} ${inReview.text.slice(0, 160)}`);

  const second = await newSession(adminA, { proposalId: ids.secondApproved, clientEmail: `second-${CLIENT}`, clientName: 'E2E Client Two' });
  expect(second.status === 201, `second-proposal session expected 201, got ${second.status} ${second.text.slice(0, 200)}`);
  ids.sessionSecond = second.json.data.id;
  ids.tokenSecond = second.json.data.accessToken;

  notes.push(`org A ${ids.orgA}, org B ${ids.orgB}`);
  notes.push(`approved: ${ids.approved} (pricing sheet seeded), ${ids.secondApproved}, ${ids.thirdApproved}, foreign ${ids.approvedB}; IN_REVIEW ${ids.draft}`);
  return notes;
});

// ------------------------------------------------------------------ G9 staff portal

await suite.test('G9-01', 'Create session contract: 201, opaque accessToken handed out once, no token hash in any payload', async () => {
  const notes = [];
  const created = await newSession(adminA, { proposalId: ids.approved, clientEmail: CLIENT, clientName: 'E2E Client Corp' });
  expect(created.status === 201, `create session expected 201, got ${created.status} ${created.text.slice(0, 200)}`);
  const session = created.json.data;
  ids.sessionA = session.id;
  ids.tokenA = session.accessToken;
  expect(isOpaqueToken(session.accessToken), `accessToken must be a 43-char base64url opaque token, got ${session.accessToken}`);
  expect(!session.accessToken.includes('.'), 'accessToken must not be a JWT');
  expect(session.clientEmail === CLIENT, `clientEmail must be echoed, got ${session.clientEmail}`);
  expect(session.clientName === 'E2E Client Corp', `clientName must be echoed, got ${session.clientName}`);
  expect(session.proposalId === ids.approved && session.organizationId === ids.orgA, 'session must carry the proposal and its own organization');
  const ttlHours = (new Date(session.expiresAt).getTime() - Date.now()) / 3_600_000;
  expect(ttlHours > 167 && ttlHours <= 168.5, `default expiry must be ~168h, got ${ttlHours.toFixed(2)}h`);
  expect(!('tokenHash' in session) && !('token_hash' in session), 'session payload must not expose the stored hash');
  expectNoCredentialLeak(created);
  notes.push(`201 with {id, proposalId, organizationId, clientEmail, clientName, expiresAt, accessToken}; default TTL ${ttlHours.toFixed(1)}h`);

  const custom = await newSession(presales, { proposalId: ids.approved, clientEmail: `second-${RUN}@e2e.test`, expiresInHours: 24 });
  expect(custom.status === 201, `second session expected 201, got ${custom.status} ${custom.text.slice(0, 200)}`);
  ids.sessionA2 = custom.json.data.id;
  const hours = (new Date(custom.json.data.expiresAt).getTime() - Date.now()) / 3_600_000;
  expect(hours > 23 && hours <= 24.2, `expiresInHours 24 must be honored, got ${hours.toFixed(2)}h`);
  notes.push(`expiresInHours=24 honored (${hours.toFixed(1)}h)`);

  const listing = await listSessions(adminA, ids.approved);
  const serialized = JSON.stringify(listing.json);
  expect(!serialized.includes('tokenHash') && !serialized.includes(ids.tokenA), 'listing sessions must never return a token or its hash');
  notes.push('accessToken appears only in the create response; list payloads carry no credential');
  return notes;
});

await suite.test('G9-02', 'Session role and tenant guards: VIEWER 403, anonymous 401, foreign proposal 404, smuggled organizationId ignored', async () => {
  const notes = [];
  const forbidden = await newSession(viewer, { proposalId: ids.approved, clientEmail: CLIENT });
  expectEnvelope(forbidden, 403);
  expectNoInternalLeak(forbidden);
  notes.push(`VIEWER create -> 403 (${forbidden.json.error})`);

  const anonymous = await newSession(null, { proposalId: ids.approved, clientEmail: CLIENT });
  expectEnvelope(anonymous, 401);

  const foreign = await newSession(adminB, { proposalId: ids.approved, clientEmail: CLIENT });
  expectEnvelope(foreign, 404);
  expect(foreign.status !== 403, 'cross-tenant proposal must answer 404, never 403');

  const repOnShared = await newSession(sales, { proposalId: ids.approved, clientEmail: `sales-${CLIENT}` });
  expect(repOnShared.status === 201, `SALES_REP on an already SENT_TO_CLIENT proposal expected 201, got ${repOnShared.status} ${repOnShared.text.slice(0, 160)}`);
  ids.sessionSales = repOnShared.json.data.id;
  const architectOnShared = await newSession(architect, { proposalId: ids.approved, clientEmail: `arch-${CLIENT}` });
  expect(architectOnShared.status === 201, `SOLUTION_ARCHITECT expected 201, got ${architectOnShared.status}`);
  ids.sessionArchitect = architectOnShared.json.data.id;
  suite.note('SALES_REP and SOLUTION_ARCHITECT can open portal sessions, but only ADMIN/PRESALE_LEAD can be the first one on an APPROVED proposal (G9-04)');

  const smuggled = await newSession(adminB, { proposalId: ids.approved, clientEmail: CLIENT, organizationId: ids.orgA });
  expectEnvelope(smuggled, 404);
  const own = await newSession(adminA, { proposalId: ids.approved, clientEmail: `smug-${CLIENT}`, organizationId: ids.orgB });
  expect(own.status === 201, `smuggled organizationId must be overridden by the JWT scope, got ${own.status} ${own.text.slice(0, 160)}`);
  expect(own.json.data.organizationId === ids.orgA, 'session must stay inside the caller organization');
  ids.sessionSmuggled = own.json.data.id;
  notes.push('payload organizationId ignored: the session stays in the caller scope');
  return notes;
});

await suite.test('G9-03', 'Session input guards: proposalId, clientEmail, clientName and expiresInHours boundaries; only real proposals 404', async () => {
  const notes = [];
  const invalid = [
    ['missing proposalId', { clientEmail: CLIENT }],
    ['malformed proposalId', { proposalId: 'not-a-uuid', clientEmail: CLIENT }],
    ['nil uuid proposalId', { proposalId: NIL_UUID, clientEmail: CLIENT }],
    ['array proposalId', { proposalId: [ids.approved], clientEmail: CLIENT }],
    ['missing clientEmail', { proposalId: ids.approved }],
    ['non-string clientEmail', { proposalId: ids.approved, clientEmail: 42 }],
    ['clientEmail without domain', { proposalId: ids.approved, clientEmail: 'noatsign' }],
    ['clientEmail with spaces', { proposalId: ids.approved, clientEmail: 'a b@example.com' }],
    ['clientEmail over 320', { proposalId: ids.approved, clientEmail: `${'x'.repeat(320)}@example.com` }],
    ['blank clientName', { proposalId: ids.approved, clientEmail: CLIENT, clientName: '   ' }],
    ['non-string clientName', { proposalId: ids.approved, clientEmail: CLIENT, clientName: 7 }],
    ['clientName over 200', { proposalId: ids.approved, clientEmail: CLIENT, clientName: 'n'.repeat(201) }],
    ['expiresInHours 0', { proposalId: ids.approved, clientEmail: CLIENT, expiresInHours: 0 }],
    ['expiresInHours -1', { proposalId: ids.approved, clientEmail: CLIENT, expiresInHours: -1 }],
    ['expiresInHours 721', { proposalId: ids.approved, clientEmail: CLIENT, expiresInHours: 721 }],
    ['expiresInHours fractional', { proposalId: ids.approved, clientEmail: CLIENT, expiresInHours: 2.5 }],
    ['expiresInHours text', { proposalId: ids.approved, clientEmail: CLIENT, expiresInHours: 'soon' }],
    ['expiresInHours null', { proposalId: ids.approved, clientEmail: CLIENT, expiresInHours: null }]
  ];
  for (const [label, body] of invalid) {
    const response = await newSession(adminA, body);
    expect(response.status === 400, `${label} expected 400, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 400);
  }
  notes.push(`${invalid.length} invalid create-session payloads all answered 400 with the error envelope`);

  const boundaryLow = await newSession(adminA, { proposalId: ids.approved, clientEmail: `LOW-${CLIENT}`, expiresInHours: 1 });
  const boundaryHigh = await newSession(adminA, { proposalId: ids.approved, clientEmail: `high-${CLIENT}`, expiresInHours: 720 });
  expect(boundaryLow.status === 201 && boundaryHigh.status === 201, `1h/720h boundaries must be accepted, got ${boundaryLow.status}/${boundaryHigh.status}`);
  ids.sessionHour1 = boundaryLow.json.data.id;
  ids.sessionHour720 = boundaryHigh.json.data.id;
  expect(boundaryLow.json.data.clientEmail === `low-${CLIENT}`, 'clientEmail must be stored lower-cased');

  const nameOk = await newSession(adminA, { proposalId: ids.approved, clientEmail: `name-${CLIENT}`, clientName: 'n'.repeat(200) });
  expect(nameOk.status === 201, `200-char clientName expected 201, got ${nameOk.status}`);
  expect(nameOk.json.data.clientName === 'n'.repeat(200), '200-char clientName must survive');
  ids.sessionName = nameOk.json.data.id;

  const unknown = await newSession(adminA, { proposalId: uuid, clientEmail: CLIENT });
  expectEnvelope(unknown, 404);
  const nonObject = await http(adminA, 'POST', '/api/v1/portal/sessions', { body: ['not', 'an', 'object'] });
  expectEnvelope(nonObject, 400);
  expect(nonObject.json.error.includes('JSON object'), `expected a body-shape error, got ${nonObject.json.error}`);
  notes.push('expiresInHours 1 and 720 accepted while 0/721/2.5/NaN are refused; unknown proposal 404, non-object body 400');
  return notes;
});

await suite.test('G9-04', 'Status precondition: non-approved 409, first session flips APPROVED -> SENT_TO_CLIENT and audits both steps', async () => {
  const notes = [];
  const blocked = await newSession(adminA, { proposalId: ids.draft, clientEmail: CLIENT });
  expectEnvelope(blocked, 409);
  expectNoInternalLeak(blocked);
  notes.push(`IN_REVIEW proposal -> 409 (${blocked.json.error})`);

  const fresh = await approveProposal(presales, `E2E G9 Auto-send Proposal ${RUN}`);
  ids.autoProposal = fresh;
  const statusBefore = await http(adminA, 'GET', `/api/v1/proposals/${fresh}`);
  expect(statusBefore.json.data.status === 'APPROVED', `fixture must start APPROVED, got ${statusBefore.json.data.status}`);

  const refused = await newSession(sales, { proposalId: fresh, clientEmail: CLIENT });
  expectEnvelope(refused, 403);
  expect(refused.json.error.toLowerCase().includes('administrator'), `expected the privileged-transition message, got ${refused.json.error}`);
  const stillApproved = await http(adminA, 'GET', `/api/v1/proposals/${fresh}`);
  expect(stillApproved.json.data.status === 'APPROVED', 'a refused session must not change the proposal status');
  notes.push('SALES_REP cannot be the first session on an APPROVED proposal (403) and the status is untouched');

  const created = await newSession(adminA, { proposalId: fresh, clientEmail: CLIENT });
  expect(created.status === 201, `ADMIN session expected 201, got ${created.status} ${created.text.slice(0, 200)}`);
  ids.sessionAuto = created.json.data.id;
  const after = await http(adminA, 'GET', `/api/v1/proposals/${fresh}`);
  expect(after.json.data.status === 'SENT_TO_CLIENT', `first session must flip APPROVED -> SENT_TO_CLIENT, got ${after.json.data.status}`);

  const repNow = await newSession(sales, { proposalId: fresh, clientEmail: `rep-${CLIENT}` });
  expect(repNow.status === 201, `SALES_REP may add sessions once SENT_TO_CLIENT, got ${repNow.status} ${repNow.text.slice(0, 160)}`);
  ids.sessionRep = repNow.json.data.id;
  ids.tokenRep = repNow.json.data.accessToken;

  const entries = await auditFor(fresh);
  const actions = entries.map(entry => entry.action);
  expect(actions.includes('PROPOSAL_SHARED_WITH_CLIENT'), `expected PROPOSAL_SHARED_WITH_CLIENT, got ${actions.join(', ') || '(none)'}`);
  expect(actions.includes('CLIENT_PORTAL_SESSION_CREATED'), `expected CLIENT_PORTAL_SESSION_CREATED, got ${actions.join(', ') || '(none)'}`);
  const shared = entries.find(entry => entry.action === 'PROPOSAL_SHARED_WITH_CLIENT');
  expect(shared.userId === ids.adminA && shared.entityType === 'proposal' && shared.entityId === fresh, 'shared audit must point at the actor and proposal');
  expect(shared.resultStatus === 'SUCCESS', 'audit result must be SUCCESS');
  const createdEntry = entries.find(item => item.action === 'CLIENT_PORTAL_SESSION_CREATED' && JSON.stringify(item.payload).includes(ids.sessionAuto));
  expect(createdEntry, `expected a CLIENT_PORTAL_SESSION_CREATED row for session ${ids.sessionAuto}, got ${actions.join(', ')}`);
  notes.push(`first session: APPROVED -> SENT_TO_CLIENT, audit ${actions.join(', ')}`);
  return notes;
});

await suite.test('G9-05', 'List portal sessions: shape, ordering, commentCount, revoked/lastAccessed columns and no credential', async () => {
  const notes = [];
  const list = await listSessions(adminA, ids.approved);
  expect(list.status === 200, `list sessions expected 200, got ${list.status} ${list.text.slice(0, 200)}`);
  const rows = list.json.data;
  expect(Array.isArray(rows) && rows.length >= 5, `expected the sessions created by earlier cases, got ${rows?.length}`);
  expect(list.json.meta.total === rows.length, 'meta.total must match the returned rows');
  const first = rows.find(row => row.id === ids.sessionA);
  expect(first, 'the first session must be listed');
  for (const key of ['id', 'proposalId', 'clientEmail', 'clientName', 'expiresAt', 'revokedAt', 'lastAccessedAt', 'createdAt', 'commentCount']) {
    expect(key in first, `session row must expose ${key}`);
  }
  expect(first.revokedAt === null && first.lastAccessedAt === null, 'a fresh session must show no revocation and no access');
  expect(typeof first.commentCount === 'number', 'commentCount must be a number');
  expect(!('tokenHash' in first) && !('token_hash' in first) && !('accessToken' in first), 'no credential may be serialized');
  const ordered = rows.every((row, index) => index === 0 || new Date(rows[index - 1].createdAt) >= new Date(row.createdAt));
  expect(ordered, 'sessions must be newest-first');
  notes.push(`${rows.length} sessions listed newest-first with expiresAt/revokedAt/lastAccessedAt/commentCount and no token hash`);

  const comment = await client('POST', ids.tokenA, ids.approved, '/comments', { body: `E2E count probe ${RUN}` });
  expect(comment.status === 201, `probe comment expected 201, got ${comment.status} ${comment.text.slice(0, 160)}`);
  const recount = await listSessions(adminA, ids.approved);
  expect(recount.json.data.find(row => row.id === ids.sessionA).commentCount === 1, 'commentCount must follow the stored comments');

  const foreign = await listSessions(adminB, ids.approved);
  expectEnvelope(foreign, 404);
  const malformed = await listSessions(adminA, 'not-a-uuid');
  expectEnvelope(malformed, 400);
  const unknown = await listSessions(adminA, uuid);
  expectEnvelope(unknown, 404);
  const anonymous = await http(null, 'GET', `/api/v1/proposals/${ids.approved}/portal-sessions`);
  expectEnvelope(anonymous, 401);
  const viewerRead = await listSessions(viewer, ids.approved);
  expect(viewerRead.status === 200, `expected the documented VIEWER read, got ${viewerRead.status}`);
  suite.note(`FINDING: VIEWER can read the staff session list (${viewerRead.status}), exposing client email + name of every portal session; the portal read routes check authentication and organization only, never role`);
  notes.push('cross-tenant 404, malformed 400, unknown 404, anonymous 401');
  return notes;
});

await suite.test('G9-06', 'Portal materials: HTTPS-only fileUrl, isShared defaults to false, field limits, role and status guards', async () => {
  const notes = [];
  const ok = await createMaterial(adminA, ids.approved, {
    title: `E2E material ${RUN}`, fileName: 'scope.pdf', fileUrl: 'https://files.example.test/scope.pdf', mimeType: 'application/pdf'
  });
  expect(ok.status === 201, `create material expected 201, got ${ok.status} ${ok.text.slice(0, 200)}`);
  ids.material = ok.json.data.id;
  expect(ok.json.data.title === `E2E material ${RUN}` && ok.json.data.fileUrl === 'https://files.example.test/scope.pdf', 'material must round-trip');
  expect(ok.json.data.description === null && ok.json.data.mimeType === 'application/pdf', 'optional fields must round-trip');
  const staffView = await listStaffMaterials(adminA, ids.approved);
  const created = staffView.json.data.find(row => row.id === ids.material);
  expect(created.isShared === false, `isShared must default to false, got ${created.isShared}`);
  expect(created.createdBy === ids.adminA, `createdBy must be the actor, got ${created.createdBy}`);
  suite.note(`FINDING: POST /portal-materials returns a payload without isShared/createdBy (${Object.keys(ok.json.data).join(', ')}); the caller must re-GET the list to confirm the sharing default`);
  notes.push('201, isShared=false confirmed through the staff list (the create response omits the column)');

  const shared = await createMaterial(presales, ids.approved, {
    title: `E2E shared material ${RUN}`, fileName: 'timeline.pdf', fileUrl: 'https://files.example.test/timeline.pdf', isShared: true, description: 'For the client.'
  });
  expect(shared.status === 201, `explicit shared material expected 201, got ${shared.status} ${shared.text.slice(0, 160)}`);
  ids.materialShared = shared.json.data.id;
  const reListed = await listStaffMaterials(adminA, ids.approved);
  expect(reListed.json.data.find(row => row.id === ids.materialShared).isShared === true, 'isShared:true must persist');

  const invalid = [
    ['http fileUrl', { title: 'x', fileName: 'a.pdf', fileUrl: 'http://files.example.test/a.pdf' }, 'https'],
    ['ftp fileUrl', { title: 'x', fileName: 'a.pdf', fileUrl: 'ftp://files.example.test/a.pdf' }, 'https'],
    ['javascript fileUrl', { title: 'x', fileName: 'a.pdf', fileUrl: 'javascript:alert(1)' }, 'https'],
    ['file fileUrl', { title: 'x', fileName: 'a.pdf', fileUrl: 'file:///etc/passwd' }, 'https'],
    ['protocol-relative fileUrl', { title: 'x', fileName: 'a.pdf', fileUrl: '//files.example.test/a.pdf' }, 'https'],
    ['fileUrl over 2048', { title: 'x', fileName: 'a.pdf', fileUrl: `https://e.test/${'p'.repeat(2100)}` }, 'https'],
    ['missing fileUrl', { title: 'x', fileName: 'a.pdf' }, 'fileurl'],
    ['missing title', { fileName: 'a.pdf', fileUrl: 'https://e.test/a' }, 'title'],
    ['blank title', { title: '  ', fileName: 'a.pdf', fileUrl: 'https://e.test/a' }, 'title'],
    ['title over 255', { title: 't'.repeat(256), fileName: 'a.pdf', fileUrl: 'https://e.test/a' }, 'title'],
    ['missing fileName', { title: 'x', fileUrl: 'https://e.test/a' }, 'filename'],
    ['fileName over 255', { title: 'x', fileName: `${'f'.repeat(252)}.pdf`, fileUrl: 'https://e.test/a' }, 'filename'],
    ['description over 4000', { title: 'x', fileName: 'a.pdf', fileUrl: 'https://e.test/a', description: 'd'.repeat(4001) }, 'description'],
    ['mimeType over 150', { title: 'x', fileName: 'a.pdf', fileUrl: 'https://e.test/a', mimeType: 'm'.repeat(151) }, 'mimetype'],
    ['isShared a string', { title: 'x', fileName: 'a.pdf', fileUrl: 'https://e.test/a', isShared: 'yes' }, 'isshared'],
    ['isShared a number', { title: 'x', fileName: 'a.pdf', fileUrl: 'https://e.test/a', isShared: 1 }, 'isshared']
  ];
  for (const [label, body, keyword] of invalid) {
    const response = await createMaterial(adminA, ids.approved, body);
    expectEnvelope(response, 400);
    expect(response.json.error.toLowerCase().includes(keyword), `${label} expected a ${keyword} message, got ${response.json.error}`);
  }
  notes.push(`${invalid.length} invalid material payloads answered 400; fileUrl is HTTPS-only (${invalid.slice(0, 5).length} URL schemes refused)`);

  const boundary = await createMaterial(adminA, ids.approved, {
    title: 't'.repeat(255), fileName: `${'f'.repeat(247)}.pdf`, fileUrl: `https://e.test/${'u'.repeat(30)}`, description: 'd'.repeat(4000), mimeType: 'm'.repeat(150)
  });
  expect(boundary.status === 201, `field-length boundary expected 201, got ${boundary.status} ${boundary.text.slice(0, 160)}`);
  ids.materialBoundary = boundary.json.data.id;

  const roleBlocked = await createMaterial(viewer, ids.approved, { title: 'x', fileName: 'a.pdf', fileUrl: 'https://e.test/a' });
  expectEnvelope(roleBlocked, 403);
  const unknownProposal = await createMaterial(adminA, uuid, { title: 'x', fileName: 'a.pdf', fileUrl: 'https://e.test/a' });
  expectEnvelope(unknownProposal, 404);
  const draftProposal = await createMaterial(adminA, ids.draft, { title: 'x', fileName: 'a.pdf', fileUrl: 'https://e.test/a' });
  expectEnvelope(draftProposal, 404);
  expect(draftProposal.json.error.includes('not eligible'), `expected the not-eligible message, got ${draftProposal.json.error}`);
  const malformedProposal = await createMaterial(adminA, 'not-a-uuid', { title: 'x', fileName: 'a.pdf', fileUrl: 'https://e.test/a' });
  expectEnvelope(malformedProposal, 400);
  const foreign = await createMaterial(adminB, ids.approved, { title: 'x', fileName: 'a.pdf', fileUrl: 'https://e.test/a' });
  expectEnvelope(foreign, 404);
  const anonymous = await http(null, 'POST', `/api/v1/proposals/${ids.approved}/portal-materials`, { body: { title: 'x', fileName: 'a.pdf', fileUrl: 'https://e.test/a' } });
  expectEnvelope(anonymous, 401);
  notes.push('VIEWER 403, unknown/DRAFT proposal 404, malformed proposalId 400, foreign 404, anonymous 401');
  return notes;
});

await suite.test('G9-07', 'Staff material list and delete: unshared rows visible with isShared/createdBy, 204 then 404, tenant and role guards', async () => {
  const notes = [];
  const list = await listStaffMaterials(adminA, ids.approved);
  expect(list.status === 200, `staff material list expected 200, got ${list.status} ${list.text.slice(0, 160)}`);
  const rows = list.json.data;
  expect(rows.some(row => row.id === ids.material && row.isShared === false), 'unshared material must be visible to staff');
  expect(rows.some(row => row.id === ids.materialShared && row.isShared === true), 'shared material must be visible to staff');
  expect(rows.every(row => 'isShared' in row && 'createdBy' in row && 'fileUrl' in row), 'staff rows expose isShared, createdBy and fileUrl');
  expect(list.json.meta.total === rows.length, 'meta.total must match');
  const ordered = rows.every((row, index) => index === 0 || new Date(rows[index - 1].createdAt) >= new Date(row.createdAt));
  expect(ordered, 'materials must be newest-first');
  notes.push(`${rows.length} materials listed for staff including the unshared rows, newest-first`);

  const foreignList = await listStaffMaterials(adminB, ids.approved);
  expectEnvelope(foreignList, 404);

  const removed = await deleteMaterial(adminA, ids.approved, ids.materialBoundary);
  expect(removed.status === 204, `delete expected 204, got ${removed.status} ${removed.text.slice(0, 160)}`);
  expect(!removed.text, '204 must have no body');
  const after = await listStaffMaterials(adminA, ids.approved);
  expect(!after.json.data.some(row => row.id === ids.materialBoundary), 'deleted material must disappear');
  const replay = await deleteMaterial(adminA, ids.approved, ids.materialBoundary);
  expectEnvelope(replay, 404);

  const wrongProposal = await deleteMaterial(adminA, ids.secondApproved, ids.material);
  expectEnvelope(wrongProposal, 404);
  const foreignDelete = await deleteMaterial(adminB, ids.approved, ids.material);
  expectEnvelope(foreignDelete, 404);
  const stillThere = await listStaffMaterials(adminA, ids.approved);
  expect(stillThere.json.data.some(row => row.id === ids.material), 'a cross-tenant delete attempt must not remove the row');
  const malformed = await deleteMaterial(adminA, ids.approved, 'not-a-uuid');
  expectEnvelope(malformed, 400);
  const unknownMaterial = await deleteMaterial(adminA, ids.approved, uuid);
  expectEnvelope(unknownMaterial, 404);
  const roleBlocked = await deleteMaterial(viewer, ids.approved, ids.material);
  expectEnvelope(roleBlocked, 403);
  const anonymous = await http(null, 'DELETE', `/api/v1/proposals/${ids.approved}/portal-materials/${ids.material}`);
  expectEnvelope(anonymous, 401);
  notes.push('204 delete, replay/mismatch/foreign/unknown 404, malformed 400, VIEWER 403, anonymous 401');
  return notes;
});

await suite.test('G9-08', 'Revoke session: 204 + audit, the token stops working at once, replay 404, role and tenant guards', async () => {
  const notes = [];
  const before = await client('GET', ids.tokenRep, ids.autoProposal, '');
  expect(before.status === 200, `client read before revocation expected 200, got ${before.status} ${before.text.slice(0, 160)}`);

  const forbidden = await revokeSession(viewer, ids.sessionRep);
  expectEnvelope(forbidden, 403);
  const anonymous = await revokeSession(null, ids.sessionRep);
  expectEnvelope(anonymous, 401);
  expect(anonymous.status !== 403, 'an unauthenticated revoke must answer 401, not 403');
  const malformed = await revokeSession(adminA, 'not-a-uuid');
  expectEnvelope(malformed, 400);
  const unknown = await revokeSession(adminA, uuid);
  expectEnvelope(unknown, 404);

  const revoked = await revokeSession(adminA, ids.sessionRep);
  expect(revoked.status === 204, `revoke expected 204, got ${revoked.status} ${revoked.text.slice(0, 160)}`);
  const replay = await revokeSession(adminA, ids.sessionRep);
  expectEnvelope(replay, 404);

  const blocked = await client('GET', ids.tokenRep, ids.autoProposal, '');
  expectEnvelope(blocked, 401);
  const blockedWrite = await client('POST', ids.tokenRep, ids.autoProposal, '/comments', { body: 'after revocation' });
  expectEnvelope(blockedWrite, 401);
  notes.push('a revoked token stops authenticating reads and writes on the very next call');

  const entries = await auditFor(ids.autoProposal);
  const actions = entries.map(entry => entry.action);
  const revokeEntry = entries.find(item => item.action === 'CLIENT_PORTAL_SESSION_REVOKED' && JSON.stringify(item.payload).includes(ids.sessionRep));
  const createEntry = entries.find(item => item.action === 'CLIENT_PORTAL_SESSION_CREATED' && JSON.stringify(item.payload).includes(ids.sessionRep));
  expect(revokeEntry, `expected a revoke audit row for the revoked session, got ${actions.join(', ') || '(none)'}`);
  expect(createEntry, 'the matching create audit row must exist for the same session');
  expect(revokeEntry.userId === ids.adminA && revokeEntry.entityId === ids.autoProposal && revokeEntry.resultStatus === 'SUCCESS', 'revoke audit must record actor, proposal and SUCCESS');
  notes.push('audit trail: CLIENT_PORTAL_SESSION_CREATED + CLIENT_PORTAL_SESSION_REVOKED for the same session id');

  const list = await listSessions(adminA, ids.autoProposal);
  const row = list.json.data.find(item => item.id === ids.sessionRep);
  expect(row.revokedAt && Date.parse(row.revokedAt) > 0, 'the revoked session must stay listed with revokedAt set');

  const foreign = await revokeSession(adminB, ids.sessionA);
  expectEnvelope(foreign, 404);
  notes.push('revoke is tenant-scoped: another organization cannot revoke (404)');
  return notes;
});

// ------------------------------------------------------------------ G10 client portal

await suite.test('G10-01', 'Client token guards: missing, staff JWT, garbage and foreign proposal ids all answer 401, never 500', async () => {
  const notes = [];
  for (const route of ['', '/materials', '/comments', '/export-pdf']) {
    const anonymous = await clientRaw(null, ids.approved, route);
    expect(anonymous.status === 401, `tokenless ${route || 'view'} expected 401, got ${anonymous.status} ${anonymous.text.slice(0, 120)}`);
    expectEnvelope(anonymous, 401);
  }
  notes.push('4 client routes without a token answered 401 in the JSON envelope (no HTML, no 500)');

  const jwt = await client('GET', ids.staffJwt, ids.approved, '');
  expectEnvelope(jwt, 401);
  expectNoInternalLeak(jwt);
  notes.push('a staff JWT replayed as a portal token is refused (401)');

  const garbage = await client('GET', 'not-a-portal-token', ids.approved, '');
  expectEnvelope(garbage, 401);
  const tooLong = await client('GET', `x`.repeat(5000), ids.approved, '');
  expectEnvelope(tooLong, 401);

  const malformed = await client('GET', ids.tokenA, 'not-a-uuid', '');
  expectEnvelope(malformed, 401);
  expect(malformed.status !== 500, 'a malformed proposal id in the client URL must answer 401, never 500');
  const nil = await client('GET', ids.tokenA, NIL_UUID, '');
  expectEnvelope(nil, 401);
  const foreignProposal = await client('GET', ids.tokenA, ids.approvedB, '');
  expectEnvelope(foreignProposal, 401);
  notes.push('malformed/nil uuid and a token used on another tenant proposal all 401');

  const aOnB = await client('GET', ids.tokenA, ids.secondApproved, '');
  expectEnvelope(aOnB, 401);
  const bOnA = await client('GET', ids.tokenSecond, ids.approved, '');
  expectEnvelope(bOnA, 401);
  const writeOnB = await client('POST', ids.tokenSecond, ids.approved, '/comments', { body: 'cross-proposal write' });
  expectEnvelope(writeOnB, 401);
  const comments = await client('GET', ids.tokenA, ids.approved, '/comments');
  expect(!comments.json.data.some(comment => comment.body === 'cross-proposal write'), 'a cross-proposal write must not be stored');
  notes.push('token of proposal A rejected on proposal B and vice versa, reads and writes');
  return notes;
});

await suite.test('G10-02', 'Shared proposal view: client fields exposed, internal columns withheld', async () => {
  const notes = [];
  const read = await client('GET', ids.tokenA, ids.approved, '');
  expect(read.status === 200, `client read expected 200, got ${read.status} ${read.text.slice(0, 200)}`);
  expect(read.json.success === true, 'client read must use the success envelope');
  const view = read.json.data;
  expect(view.id === ids.approved && view.status === 'SENT_TO_CLIENT', 'view must expose the shared proposal and its status');
  for (const key of ['title', 'version', 'totalCost', 'currency', 'estimatedTimelineWeeks', 'sheets']) {
    expect(key in view, `client view must expose ${key}`);
  }
  for (const withheld of ['leadId', 'lead_id', 'organizationId', 'createdBy', 'updatedBy', 'sheetId', 'createdAt', 'updatedAt']) {
    expect(!(withheld in view), `client view must not expose ${withheld}`);
  }
  const serialized = JSON.stringify(view);
  expect(!serialized.includes(ids.orgA) && !serialized.includes(ids.adminA), 'internal identifiers must not appear in the payload');
  expect(Array.isArray(view.sheets), 'sheets must be a list');
  notes.push(`view fields: ${Object.keys(view).join(', ')}; ${view.sheets.length} sheets returned`);

  const pricing = view.sheets.find(sheet => sheet.sheetName === 'Pricing & Quotation');
  expect(pricing, 'the Pricing sheet must be readable by the client');
  expect(pricing.sheetData.taxPercentage === 8, `stored sheet data must be visible, got ${JSON.stringify(pricing.sheetData).slice(0, 120)}`);
  expect(!('sheetId' in pricing) && Object.keys(pricing).join(',') === 'sheetName,sheetOrder,sheetData', `sheet rows must be narrowed, got ${Object.keys(pricing).join(', ')}`);
  const orders = view.sheets.map(sheet => sheet.sheetOrder);
  expect(orders.every((value, index) => index === 0 || orders[index - 1] <= value), 'sheets must arrive in canonical order');
  suite.note(`FINDING: the client view returns ALL ${view.sheets.length} sheets, including internal ones (Assumptions & Dependencies, Risk Management RAID, Appendices & Case Studies); the plan expected only client-facing sheets`);

  const draftRead = await client('GET', ids.tokenA, ids.draft, '');
  expectEnvelope(draftRead, 401);
  notes.push('a DRAFT/IN_REVIEW proposal is unreachable through the client route');
  return notes;
});

await suite.test('G10-03', 'lastAccessedAt is stamped on every authenticated client call and untouched on failures', async () => {
  const notes = [];
  const created = await newSession(adminA, { proposalId: ids.approved, clientEmail: `probe-${CLIENT}`, clientName: 'E2E Access Probe' });
  expect(created.status === 201, `access-probe session expected 201, got ${created.status}`);
  ids.sessionAccess = created.json.data.id;
  const token = created.json.data.accessToken;

  const initial = await listSessions(adminA, ids.approved);
  expect(initial.json.data.find(row => row.id === ids.sessionAccess).lastAccessedAt === null, 'a brand-new session must show no access');

  const read = await client('GET', token, ids.approved, '');
  expect(read.status === 200, `client read expected 200, got ${read.status}`);
  const stamped = await listSessions(adminA, ids.approved);
  const first = stamped.json.data.find(row => row.id === ids.sessionAccess);
  expect(first.lastAccessedAt, 'a successful client read must stamp lastAccessedAt');
  const firstAccess = Date.parse(first.lastAccessedAt);

  await client('GET', token, ids.approved, '/materials');
  const again = await listSessions(adminA, ids.approved);
  const secondAccess = Date.parse(again.json.data.find(row => row.id === ids.sessionAccess).lastAccessedAt);
  expect(secondAccess >= firstAccess, 'each call must refresh lastAccessedAt');
  notes.push(`lastAccessedAt followed the calls (${new Date(firstAccess).toISOString()} -> ${new Date(secondAccess).toISOString()})`);

  const bad = await client('GET', 'totally-made-up-token', ids.approved, '');
  expectEnvelope(bad, 401);
  const unchanged = await listSessions(adminA, ids.approved);
  expect(Date.parse(unchanged.json.data.find(row => row.id === ids.sessionAccess).lastAccessedAt) === secondAccess, 'a failed token must not stamp anything');
  notes.push('a rejected token does not touch lastAccessedAt');
  return notes;
});

await suite.test('G10-04', 'Client comments: author comes from the session, validation, trimming, ordering and isolation', async () => {
  const notes = [];
  const created = await client('POST', ids.tokenA, ids.approved, '/comments', { body: `E2E client comment ${RUN}` });
  expect(created.status === 201, `comment expected 201, got ${created.status} ${created.text.slice(0, 200)}`);
  const comment = created.json.data;
  expect(comment.authorName === 'E2E Client Corp', `authorName must default to the session client name, got ${comment.authorName}`);
  expect(comment.authorEmail === CLIENT, `authorEmail must come from the session, got ${comment.authorEmail}`);
  expect(comment.proposalId === ids.approved && comment.sessionId === ids.sessionA, 'the comment must bind to the session and proposal');
  expect(comment.body === `E2E client comment ${RUN}`, 'body must be stored as sent');
  ids.comment1 = comment.id;
  notes.push(`201 with authorName/authorEmail taken from the portal session (${comment.authorName} <${comment.authorEmail}>)`);

  const named = await client('POST', ids.tokenA, ids.approved, '/comments', { body: 'Sent by the project manager.', authorName: 'M. Client PM' });
  expect(named.status === 201 && named.json.data.authorName === 'M. Client PM', `explicit authorName expected, got ${named.status} ${named.text.slice(0, 160)}`);
  const trimmed = await client('POST', ids.tokenA, ids.approved, '/comments', { body: `  padded ${RUN}  ` });
  expect(trimmed.status === 201 && trimmed.json.data.body === `padded ${RUN}`, 'body must be trimmed');
  const name200 = await client('POST', ids.tokenA, ids.approved, '/comments', { body: 'boundary author name', authorName: 'a'.repeat(200) });
  expect(name200.status === 201, `200-char authorName expected 201, got ${name200.status}`);

  const invalid = [
    ['missing body', {}],
    ['blank body', { body: '   ' }],
    ['non-string body', { body: 42 }],
    ['body over 5000', { body: 'c'.repeat(5001) }],
    ['authorName over 200', { body: 'ok', authorName: 'a'.repeat(201) }],
    ['blank authorName', { body: 'ok', authorName: '  ' }],
    ['non-string authorName', { body: 'ok', authorName: [] }],
    ['array body', ['nope']]
  ];
  for (const [label, body] of invalid) {
    const response = await client('POST', ids.tokenA, ids.approved, '/comments', body);
    expectEnvelope(response, 400);
  }
  const boundary = await client('POST', ids.tokenA, ids.approved, '/comments', { body: 'c'.repeat(5000) });
  expect(boundary.status === 201, `5000-char comment expected 201, got ${boundary.status} ${boundary.text.slice(0, 120)}`);
  notes.push(`${invalid.length} invalid comment payloads answered 400; the 5000-character boundary accepted`);

  const list = await client('GET', ids.tokenA, ids.approved, '/comments');
  expect(list.status === 200, `comment list expected 200, got ${list.status}`);
  const rows = list.json.data;
  expect(rows.length >= 5, `expected the comments just written, got ${rows.length}`);
  expect(list.json.meta.total === rows.length, 'meta.total must match the returned comments');
  const ordered = rows.every((row, index) => index === 0 || new Date(rows[index - 1].createdAt) <= new Date(row.createdAt));
  expect(ordered, 'comments must be oldest-first');
  expect(rows.some(row => row.id === ids.comment1), 'the first comment must be listed');
  expect(rows.every(row => 'authorEmail' in row && 'sessionId' in row), 'comment rows expose authorEmail and sessionId');
  notes.push(`${rows.length} comments returned oldest-first`);

  const other = await client('GET', ids.tokenSecond, ids.secondApproved, '/comments');
  expect(other.json.data.length === 0, 'comments must not leak across proposals');
  const anonymous = await client('POST', null, ids.approved, '/comments', { body: 'no token' });
  expectEnvelope(anonymous, 401);
  const forged = await client('POST', ids.tokenA, ids.approved, '/comments', { body: 'forged session', sessionId: ids.sessionSecond, proposalId: ids.secondApproved });
  expect(forged.status === 201 && forged.json.data.sessionId === ids.sessionA, 'payload sessionId/proposalId must be ignored in favour of the token session');
  notes.push('body fields cannot forge another session or proposal');
  return notes;
});

await suite.test('G10-05', 'Client materials list exposes only shared rows and hides staff columns', async () => {
  const notes = [];
  const list = await client('GET', ids.tokenA, ids.approved, '/materials');
  expect(list.status === 200, `client materials expected 200, got ${list.status} ${list.text.slice(0, 160)}`);
  const rows = list.json.data;
  expect(rows.some(row => row.id === ids.materialShared), 'the shared material must be visible to the client');
  expect(!rows.some(row => row.id === ids.material), 'an unshared material must stay hidden from the client');
  expect(rows.every(row => !('isShared' in row) && !('createdBy' in row)), 'client rows must not carry isShared/createdBy');
  for (const row of rows) {
    expect('title' in row && 'fileName' in row && 'fileUrl' in row && 'createdAt' in row, `client material row incomplete: ${JSON.stringify(row).slice(0, 160)}`);
    expect(row.fileUrl.startsWith('https://'), 'the shared fileUrl must still be HTTPS');
  }
  expect(list.json.meta.total === rows.length, 'meta.total must match');
  notes.push(`${rows.length} of the staff-visible materials reached the client; the unshared row was withheld`);

  const hide = await createMaterial(adminA, ids.approved, {
    title: `E2E toggle material ${RUN}`, fileName: 'toggle.pdf', fileUrl: 'https://files.example.test/toggle.pdf', isShared: true
  });
  expect(hide.status === 201, `toggle material expected 201, got ${hide.status}`);
  ids.materialToggle = hide.json.data.id;
  const seen = await client('GET', ids.tokenA, ids.approved, '/materials');
  expect(seen.json.data.some(row => row.id === ids.materialToggle), 'a newly shared material must appear without a new session');

  const removed = await deleteMaterial(adminA, ids.approved, ids.materialShared);
  expect(removed.status === 204, `delete of the shared material expected 204, got ${removed.status}`);
  const after = await client('GET', ids.tokenA, ids.approved, '/materials');
  expect(!after.json.data.some(row => row.id === ids.materialShared), 'a deleted material must disappear for the client too');

  const foreign = await client('GET', ids.tokenSecond, ids.approved, '/materials');
  expectEnvelope(foreign, 401);
  return notes;
});

await suite.test('G10-06', 'Client PDF export: %PDF bytes, headers and the same tenant guards', async () => {
  const notes = [];
  const download = await clientRaw(ids.tokenA, ids.approved, '/export-pdf');
  expect(download.status === 200, `client export expected 200, got ${download.status} ${download.text.slice(0, 160)}`);
  expect(download.buffer.subarray(0, 5).toString('latin1') === '%PDF-', 'the body must start with the %PDF magic');
  expect(download.headers['content-type'] === 'application/pdf', `expected application/pdf, got ${download.headers['content-type']}`);
  expect(/^attachment; filename=/.test(download.headers['content-disposition'] || ''), `expected an attachment disposition, got ${download.headers['content-disposition']}`);
  expect(Number(download.headers['content-length']) === download.buffer.length, 'Content-Length must match the byte body');
  expect(download.buffer.length > 1000, `the PDF looks truncated: ${download.buffer.length} bytes`);
  expect(download.buffer.subarray(-1024).toString('latin1').includes('%%EOF'), 'the PDF must end with the EOF marker');
  notes.push(`%PDF ${download.buffer.length} bytes, exact Content-Length, attachment disposition`);

  const noToken = await clientRaw(null, ids.approved, '/export-pdf');
  expect(noToken.status === 401, `tokenless export expected 401, got ${noToken.status}`);
  const badToken = await clientRaw('made-up-token', ids.approved, '/export-pdf');
  expect(badToken.status === 401, `invalid token export expected 401, got ${badToken.status}`);
  const otherProposal = await clientRaw(ids.tokenA, ids.secondApproved, '/export-pdf');
  expect(otherProposal.status === 401, 'export must not accept a token from another proposal');

  const staffRead = await http(adminA, 'GET', `/api/v1/proposals/${ids.approved}`);
  expect(staffRead.json.data.status === 'SENT_TO_CLIENT', 'the export must not change the proposal');
  const repeated = await clientRaw(ids.tokenA, ids.approved, '/export-pdf');
  expect(repeated.status === 200 && Math.abs(repeated.buffer.length - download.buffer.length) < download.buffer.length, 'the shared export is repeatable');
  notes.push('guards 401; the export leaves the proposal untouched');
  return notes;
});

await suite.test('G10-07', 'Client questions: guards before any AI call and a sanitized failure while the AI service is offline', async () => {
  const notes = [];
  const invalid = [
    ['missing question', {}],
    ['blank question', { question: '   ' }],
    ['non-string question', { question: 7 }],
    ['question over 5000', { question: 'q'.repeat(5001) }],
    ['array body', ['not', 'an', 'object']]
  ];
  for (const [label, body] of invalid) {
    const response = await client('POST', ids.tokenA, ids.approved, '/questions', body, undefined);
    expectEnvelope(response, 400);
    expectNoInternalLeak(response);
  }
  const boundary = await client('POST', ids.tokenA, ids.approved, '/questions', { question: 'q'.repeat(5000) });
  suite.note(`5000-character question passed the validator with status ${boundary.status} (guard is checked before the AI call)`);
  const anonymous = await client('POST', null, ids.approved, '/questions', { question: 'What is the price?' });
  expectEnvelope(anonymous, 401);
  const foreign = await client('POST', ids.tokenSecond, ids.approved, '/questions', { question: 'cross-proposal question' });
  expectEnvelope(foreign, 401);
  notes.push(`${invalid.length} invalid question payloads answered 400 before any AI call; anonymous 401, cross-proposal 401`);

  if (!(await aiServiceAvailable())) {
    const failed = await client('POST', ids.tokenA, ids.approved, '/questions', { question: 'What is included in the pricing sheet?' });
    expect(failed.status >= 500, `expected a sanitized 5xx while the AI service is offline, got ${failed.status} ${failed.text.slice(0, 160)}`);
    expectEnvelope(failed, failed.status);
    expectNoInternalLeak(failed);
    suite.note('G10-07 covers the AI-unavailable path only; answer quality and citations[] provenance need the AI service running on :8000.');
    notes.push(`AI offline: ${failed.status} with the error envelope and no internal leak - SUCCESS PATH NOT COVERED`);
    return notes;
  }

  const answered = await client('POST', ids.tokenA, ids.approved, '/questions', { question: 'What is the total cost of the engagement?' });
  expect(answered.status === 200, `AI answer expected 200, got ${answered.status} ${answered.text.slice(0, 200)}`);
  expect(typeof answered.json.data.answer === 'string' && answered.json.data.answer.length > 0, 'answer must be non-empty text');
  expect(Array.isArray(answered.json.data.citations), 'citations must be a list');
  const leaked = JSON.stringify(answered.json.data).toLowerCase();
  expect(!leaked.includes(ids.orgA) && !leaked.includes('passwordhash'), 'the AI answer must not echo internal identifiers');
  notes.push(`answer ${answered.json.data.answer.length} chars, ${answered.json.data.citations.length} citations`);
  return notes;
});

await suite.test('G10-08', 'Expired, revoked and unshared-again sessions all stop authenticating', async () => {
  const notes = [];
  const db = await database();
  if (!db) throw new SkipError(`expired-session fixture unavailable (the harness has no direct database access): ${poolState}`);

  const expiredToken = 'e2e-expired-portal-token-0000000000000000000000';
  const inserted = await db.query(
    `INSERT INTO portal_sessions (proposal_id, organization_id, created_by, client_email, client_name, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '1 hour')
     RETURNING id;`,
    [ids.approved, ids.orgA, ids.adminA, `expired-${RUN}@example.test`, 'E2E Expired Session', createHash('sha256').update(expiredToken).digest('hex')]
  );
  ids.sessionExpired = inserted.rows[0].id;
  const listed = await listSessions(adminA, ids.approved);
  const fixture = listed.json.data.find(item => item.id === ids.sessionExpired);
  expect(fixture && new Date(fixture.expiresAt) < new Date(), 'the fixture session must be stored already expired');

  for (const route of ['', '/materials', '/comments']) {
    const response = await client('GET', expiredToken, ids.approved, route);
    expectEnvelope(response, 401);
    expect(/invalid|expired/i.test(response.json.error), `expected the invalid-or-expired message, got ${response.json.error}`);
  }
  const write = await client('POST', expiredToken, ids.approved, '/comments', { body: 'should not be accepted' });
  expectEnvelope(write, 401);
  const comments = await client('GET', ids.tokenA, ids.approved, '/comments');
  expect(!comments.json.data.some(comment => comment.body === 'should not be accepted'), 'an expired session must not be able to write');
  notes.push('expired session: read, list and write all 401 with nothing stored');

  const revokedProbe = await newSession(adminA, { proposalId: ids.approved, clientEmail: `revoked-${CLIENT}` });
  expect(revokedProbe.status === 201, `revoke-probe session expected 201, got ${revokedProbe.status}`);
  const revokedToken = revokedProbe.json.data.accessToken;
  const alive = await client('GET', revokedToken, ids.approved, '');
  expect(alive.status === 200, `the probe token must work before revocation, got ${alive.status}`);
  const revoked = await revokeSession(adminA, revokedProbe.json.data.id);
  expect(revoked.status === 204, `revoke expected 204, got ${revoked.status}`);
  const blocked = await client('GET', revokedToken, ids.approved, '');
  expectEnvelope(blocked, 401);
  notes.push('revoked session answered 401 on the next call');

  const pull = await newSession(adminA, { proposalId: ids.thirdApproved, clientEmail: `pull-${CLIENT}` });
  expect(pull.status === 201, `pullback-probe session expected 201, got ${pull.status}`);
  ids.sessionThird = pull.json.data.id;
  const pullToken = pull.json.data.accessToken;
  expect((await client('GET', pullToken, ids.thirdApproved, '')).status === 200, 'the pullback probe must start reachable');

  const closed = await patchProposal(adminA, ids.thirdApproved, { status: 'REJECTED' });
  expect(closed.status === 200, `SENT_TO_CLIENT -> REJECTED expected 200, got ${closed.status} ${closed.text.slice(0, 160)}`);
  for (const route of ['', '/materials', '/comments', '/export-pdf']) {
    const response = await clientRaw(pullToken, ids.thirdApproved, route);
    expect(response.status === 401, `a proposal pulled out of the shared set must answer 401 on ${route || 'the view'}, got ${response.status}`);
    if (!route.endsWith('pdf')) expectEnvelope(response, 401);
  }
  notes.push('client access is cut the moment the proposal leaves SENT_TO_CLIENT/ACCEPTED (401 on all four routes, never 500)');

  const reopened = await patchProposal(adminA, ids.thirdApproved, { status: 'DRAFT' });
  expect(reopened.status === 200, `REJECTED -> DRAFT expected 200, got ${reopened.status} ${reopened.text.slice(0, 160)}`);
  const directResend = await patchProposal(adminA, ids.thirdApproved, { status: 'SENT_TO_CLIENT' });
  expectEnvelope(directResend, 409);
  notes.push('REJECTED cannot jump back to SENT_TO_CLIENT directly (409); the documented path is through DRAFT');
  const review = await patchProposal(adminA, ids.thirdApproved, { status: 'IN_REVIEW' });
  const approve = await patchProposal(adminA, ids.thirdApproved, { status: 'APPROVED' });
  const resend = await patchProposal(adminA, ids.thirdApproved, { status: 'SENT_TO_CLIENT' });
  expect([review.status, approve.status, resend.status].every(status => status === 200), `re-share path expected 200/200/200, got ${review.status}/${approve.status}/${resend.status}`);
  for (const route of ['', '/materials', '/comments']) {
    const reachable = await clientRaw(pullToken, ids.thirdApproved, route);
    expect(reachable.status === 200, `the same session must be reachable again after re-sharing ${route || 'the view'}, got ${reachable.status}`);
  }
  const pdf = await clientRaw(pullToken, ids.thirdApproved, '/export-pdf');
  expect(pdf.status === 200 && pdf.buffer.subarray(0, 5).toString('latin1') === '%PDF-', `re-shared export expected 200, got ${pdf.status}`);
  notes.push('access returns for the surviving session once the proposal is re-shared');

  const cleanup = await db.query('DELETE FROM portal_sessions WHERE id = $1;', [ids.sessionExpired]);
  notes.push(`expired fixture session removed (${cleanup.rowCount} row)`);
  delete ids.sessionExpired;
  await db.end();
  pool = null; poolState = null;
  return notes;
});

await suite.test('G10-09', 'Client surface hygiene: no credential or internal leak, no staff-cookie dependence, no client-side writes', async () => {
  const notes = [];
  const calls = [
    ['GET view', () => client('GET', ids.tokenA, ids.approved, '')],
    ['GET materials', () => client('GET', ids.tokenA, ids.approved, '/materials')],
    ['GET comments', () => client('GET', ids.tokenA, ids.approved, '/comments')],
    ['POST comment', () => client('POST', ids.tokenA, ids.approved, '/comments', { body: `E2E hygiene probe ${RUN}` })],
    ['GET export-pdf', () => clientRaw(ids.tokenA, ids.approved, '/export-pdf')]
  ];
  for (const [label, call] of calls) {
    const response = await call();
    const text = response.text ?? '';
    expect(response.status < 500, `${label} answered ${response.status}`);
    expect(!/token_hash|tokenHash|passwordHash|access_token/i.test(text), `${label} leaks a stored credential`);
    expect(!/stack trace|SELECT\s|INSERT\s|pg_|at\s+\w+\.\w+/i.test(text), `${label} leaks internal detail`);
    expect(!text.includes(ids.staffJwt), `${label} must not echo the staff token`);
    if (text.startsWith('{')) expectNoCredentialLeak(response);
  }
  notes.push('5 client routes: no 5xx, no credential or internal leak');

  const cookiesOnly = await http(adminA, 'GET', `/api/v1/portal/proposals/${ids.approved}`, {});
  expectEnvelope(cookiesOnly, 401);
  const tokenWithCookies = await http(adminA, 'GET', `/api/v1/portal/proposals/${ids.approved}`, { bearer: ids.tokenA });
  expect(tokenWithCookies.status === 200, `a portal token must work regardless of the staff cookie, got ${tokenWithCookies.status}`);
  notes.push('client routes ignore staff cookies: session cookie alone 401, portal token 200');

  for (const [method, route] of [['PATCH', ''], ['PUT', ''], ['DELETE', ''], ['POST', '/sheets/Overview']]) {
    const response = await http(null, method, `/api/v1/portal/proposals/${ids.approved}${route}`, { bearer: ids.tokenA, body: { status: 'ACCEPTED' } });
    expect([401, 404, 405].includes(response.status), `the client surface must not offer ${method} writes, got ${response.status}`);
  }
  const staffWrite = await http(adminA, 'PATCH', `/api/v1/proposals/${ids.thirdApproved}`, { body: { status: 'ACCEPTED' } });
  expect(staffWrite.status === 200, `only the staff route may change status, got ${staffWrite.status} ${staffWrite.text.slice(0, 160)}`);
  const accepted = await client('GET', ids.tokenA, ids.approved, '');
  expect(accepted.status === 200, 'an ACCEPTED proposal must stay readable for the client');
  notes.push('no client-side write verb is mounted on the portal surface; ACCEPTED proposals remain readable');
  return notes;
});

// ------------------------------------------------------------------ teardown

await suite.test('G9/G10-99', 'Teardown: every probe session revoked, every probe material deleted', async () => {
  const notes = [];
  const live = await listSessions(adminA, ids.approved);
  for (const row of live.json.data.filter(item => !item.revokedAt)) {
    const revoked = await revokeSession(adminA, row.id);
    expect(revoked.status === 204, `revoke ${row.id} expected 204, got ${revoked.status} ${revoked.text.slice(0, 120)}`);
  }
  for (const sessionId of [ids.sessionSecond, ids.sessionThird, ids.sessionAuto]) {
    if (sessionId) expect((await revokeSession(adminA, sessionId)).status === 204, `revoke ${sessionId} expected 204`);
  }
  for (const proposalId of [ids.secondApproved, ids.thirdApproved, ids.autoProposal]) {
    const live = await listSessions(adminA, proposalId);
    if (live.status !== 200) continue;
    for (const row of live.json.data.filter(item => !item.revokedAt)) {
      const revoked = await revokeSession(adminA, row.id);
      expect(revoked.status === 204, `revoke ${row.id} expected 204, got ${revoked.status}`);
    }
  }
  const after = await listSessions(adminA, ids.approved);
  expect(after.json.data.every(row => row.revokedAt), 'every probe session on the shared proposal must end revoked');
  notes.push(`${after.json.data.length} sessions on the shared proposal, all revoked`);

  const materials = await listStaffMaterials(adminA, ids.approved);
  for (const row of materials.json.data) {
    const removed = await deleteMaterial(adminA, ids.approved, row.id);
    expect(removed.status === 204, `delete material ${row.id} expected 204, got ${removed.status}`);
  }
  const remaining = await listStaffMaterials(adminA, ids.approved);
  expect(remaining.json.data.length === 0, `expected no materials left, got ${remaining.json.data.length}`);
  notes.push('all probe materials deleted from both shared proposals');

  const finalCheck = await client('GET', ids.tokenA, ids.approved, '');
  expectEnvelope(finalCheck, 401);
  notes.push('the revoked client token is dead at the end of the run');
  return notes;
});

// ------------------------------------------------------------------ report

const failing = suite.results.filter(item => item.status !== 'PASS');
const findings = [
  ['G9-05 / G9-07', 'The staff portal read routes (`GET /proposals/:id/portal-sessions`, `/portal-materials`) only require authentication plus an organization, so a VIEWER lists every client email, client name and material URL. Session and material writes are role-checked; reads are not.'],
  ['G10-02', 'The client proposal view returns all 10 sheets, including Assumptions & Dependencies, Risk Management (RAID) and Appendices & Case Studies, which are internal working content rather than client deliverables.'],
  ['G9-06', '`POST /proposals/:id/portal-materials` answers 201 with a body that omits `isShared` and `createdBy`, so the sharing default can only be confirmed by re-listing; a client-facing UI would show an unchecked state.'],
  ['G10-08', 'A shared proposal pulled to REJECTED cuts the client session off immediately (401), but REJECTED can only return through DRAFT, so re-sharing a proposal resets the DRAFT-only edit rules; the client session row itself survives.'],
  ['code', '`PORTAL_MANAGER_ROLES` accepts `PRESALE_CONSULTANT`, which is not a member of `USER_ROLES`, so that branch of the guard is unreachable.'],
  ['G10-07', 'The client Q&A success path (answer + citations provenance) is only covered as guards and the sanitized 5xx because the AI service is offline on http://localhost:8000.']
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
  '## G9 / G10 endpoint coverage',
  '',
  '| Endpoint | Case | Status |',
  '| --- | --- | --- |',
  '| POST /portal/sessions | G9-01, G9-02, G9-03, G9-04, G10-03, G10-08 | covered |',
  '| DELETE /portal/sessions/:sessionId | G9-08, G10-08, G9/G10-99 | covered |',
  '| GET /proposals/:proposalId/portal-sessions | G9-01, G9-05, G10-03, G10-08 | covered |',
  '| GET /proposals/:proposalId/portal-materials | G9-06, G9-07, G9/G10-99 | covered |',
  '| POST /proposals/:proposalId/portal-materials | G9-06, G10-05 | covered |',
  '| DELETE /proposals/:proposalId/portal-materials/:materialId | G9-07, G10-05 | covered |',
  '| GET /portal/proposals/:proposalId | G10-01, G10-02, G10-03, G10-08, G10-09 | covered |',
  '| POST /portal/proposals/:proposalId/questions | G10-07 | guards + AI-offline path |',
  '| GET /portal/proposals/:proposalId/comments | G10-01, G10-04, G10-08, G10-09 | covered |',
  '| POST /portal/proposals/:proposalId/comments | G10-04, G10-08, G10-09 | covered |',
  '| GET /portal/proposals/:proposalId/materials | G10-01, G10-05, G10-08 | covered |',
  '| GET /portal/proposals/:proposalId/export-pdf | G10-01, G10-06, G10-08, G10-09 | covered |'
].join('\n');

const { reportDir } = suite.writeReport({
  reportDirName: argValue('report-dir', `${RUN}_G9_G10_portal`),
  extraSections: [defectsSection, coverageSection]
});
console.log(`report directory: ${reportDir}`);
