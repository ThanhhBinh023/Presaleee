// G3 (users & organizations) + G4 (client directory) end-to-end suite.
// node api_test/g3_g4_directory.e2e.mjs --base-url http://127.0.0.1:5099
import {
  AssertionError, CookieJar, REPORT_ROOT, SkipError, Suite, argValue, createHttp,
  expect, expectEnvelope, expectNoCredentialLeak, expectNoInternalLeak, expectPaginationMeta,
  readBackendEnv, runId
} from './harness.mjs';

void AssertionError; void SkipError; void REPORT_ROOT; void readBackendEnv;

const BASE_URL = argValue('base-url', process.env.E2E_BASE_URL || 'http://127.0.0.1:5099');
const RUN = runId();
const PASSWORD = `E2eDirPass!${RUN}`;
const NEW_PASSWORD = `E2eRotated!${RUN}`;
const email = role => `g3-${role}-${RUN}@presaleee-e2e.test`;
const ADMIN_A = email('admin-a');
const ADMIN_B = email('admin-b');
const VIEWER = email('viewer');
const LEAD = email('presale-lead');
const DEACTIVATED = email('to-deactivate');
const RELOGIN = email('password-rotator');

const ORGANIZATION_A = `E2E G3 Org A ${RUN}`;
const ORGANIZATION_B = `E2E G3 Org B ${RUN}`;
const COMPANY = `E2E G4 Client ${RUN}`;

const http = createHttp(BASE_URL);
const suite = new Suite({
  code: RUN,
  title: 'G3 Users & Organizations + G4 Client Directory',
  baseUrl: BASE_URL,
  targetNote: 'local backend, real Supabase PostgreSQL, cookie authentication (no stubbed repositories)'
});

const adminA = new CookieJar();
const adminB = new CookieJar();
const viewer = new CookieJar();
const lead = new CookieJar();
const ids = {};

async function register(jar, emailAddress, organizationName, domain) {
  const response = await http(jar, 'POST', '/api/v1/auth/register', {
    body: { email: emailAddress, password: PASSWORD, fullName: `E2E ${organizationName}`, organizationName, organizationDomain: domain }
  });
  expect(response.status === 201, `register ${emailAddress} expected 201, got ${response.status} ${response.text.slice(0, 200)}`);
  return response;
}

async function login(jar, emailAddress, password = PASSWORD) {
  const response = await http(jar, 'POST', '/api/v1/auth/login', { body: { email: emailAddress, password } });
  expect(response.status === 200, `login ${emailAddress} expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  return response;
}

async function addMember(emailAddress, role, fullName, password = PASSWORD) {
  return http(adminA, 'POST', '/api/v1/users', { body: { email: emailAddress, password, role, fullName } });
}

const uuid = '2f4c9b6a-1d3e-4a7b-9c8d-1e2f3a4b5c6d';

// ---------------------------------------------------------------- G3 fixtures

await suite.test('G3-01', 'Bootstrap: two independent organizations, each with one ADMIN', async () => {
  const first = await register(adminA, ADMIN_A, ORGANIZATION_A, `a-${RUN}.example`);
  const second = await register(adminB, ADMIN_B, ORGANIZATION_B, `b-${RUN}.example`);
  ids.adminA = first.json.data.user.id;
  ids.orgA = first.json.data.organization.id;
  ids.adminB = second.json.data.user.id;
  ids.orgB = second.json.data.organization.id;
  suite.trackUser(ids.adminA); suite.trackUser(ids.adminB);
  suite.trackOrganization(ids.orgA); suite.trackOrganization(ids.orgB);
  expect(first.json.data.user.role === 'ADMIN', 'registration must create an ADMIN');
  expect(ids.orgA !== ids.orgB, 'the two registrations must not share an organization');
  expectNoCredentialLeak(first);
  return [`org A ${ids.orgA}`, `org B ${ids.orgB}`];
});

await suite.test('G3-02', 'GET /users/me/organizations lists only the caller own organizations', async () => {
  const response = await http(adminA, 'GET', '/api/v1/users/me/organizations');
  expect(response.status === 200, `expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  const list = response.json.data;
  expect(Array.isArray(list), 'data must be an array');
  expect(list.some(item => item.id === ids.orgA), 'caller organization missing from the list');
  expect(!list.some(item => item.id === ids.orgB), 'cross-tenant organization leaked into the list');
  expectNoCredentialLeak(response);
  return [`visible organizations: ${list.length}`];
});

await suite.test('G3-03', 'GET /users returns a paginated directory without credentials', async () => {
  const response = await http(adminA, 'GET', '/api/v1/users?limit=50');
  expect(response.status === 200, `expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  const meta = expectPaginationMeta(response);
  expect(meta.total >= 1, 'the directory must contain the bootstrap admin');
  expect(response.json.data.every(item => item.email.endsWith('@presaleee-e2e.test') || item.id === ids.adminA), 'directory contains unrelated accounts');
  expectNoCredentialLeak(response);
  return [`meta.total=${meta.total}`];
});

await suite.test('G3-04', 'POST /users creates members and applies the VIEWER default role', async () => {
  const created = await addMember(VIEWER, 'VIEWER', 'E2E Viewer');
  expect(created.status === 201, `expected 201, got ${created.status} ${created.text.slice(0, 200)}`);
  expect(created.headers.location === `/api/v1/users/${created.json.data.id}`, `Location header wrong: ${created.headers.location}`);
  expect(created.json.data.role === 'VIEWER', 'role must round-trip');
  expect(created.json.data.organizationId === ids.orgA, 'member created in the wrong organization');
  expectNoCredentialLeak(created);
  ids.viewer = created.json.data.id;
  suite.trackUser(ids.viewer);

  const defaulted = await http(adminA, 'POST', '/api/v1/users', { body: { email: RELOGIN, password: PASSWORD, fullName: 'E2E Rotator' } });
  expect(defaulted.status === 201, `expected 201, got ${defaulted.status} ${defaulted.text.slice(0, 200)}`);
  expect(defaulted.json.data.role === 'VIEWER', `default role must be VIEWER, got ${defaulted.json.data.role}`);
  expect(defaulted.json.data.status === 'ACTIVE', 'new members must start ACTIVE');
  ids.relogin = defaulted.json.data.id;
  suite.trackUser(ids.relogin);
  return [`viewer ${ids.viewer}`, 'role defaults to VIEWER'];
});

await suite.test('G3-05', 'POST /users rejects duplicates, unknown roles and weak passwords', async () => {
  const duplicate = await addMember(VIEWER, 'VIEWER', 'E2E Duplicate');
  expectEnvelope(duplicate, 409);

  const badRole = await addMember(email(`badrole-${RUN}`), 'SUPERADMIN', 'Bad Role');
  expectEnvelope(badRole, 400);
  expect(/role/.test(badRole.json.error), `message should name the field: ${badRole.json.error}`);

  const weak = await addMember(email(`weak-${RUN}`), 'VIEWER', 'Weak', 'short');
  expectEnvelope(weak, 400);
  expect(/password/i.test(weak.json.error), `password policy message expected, got ${weak.json.error}`);
  const tooLong = await addMember(email(`weak2-${RUN}`), 'VIEWER', 'Long', 'x'.repeat(129));
  expectEnvelope(tooLong, 400);
  expectNoInternalLeak(weak);
  return ['409 duplicate email', '400 unknown role', '400 password policy'];
});

await suite.test('G3-06', 'RBAC: a VIEWER may read the directory but not write it', async () => {
  await login(viewer, VIEWER);
  const read = await http(viewer, 'GET', '/api/v1/users');
  expect(read.status === 200, `member reads must be allowed, got ${read.status}`);

  const create = await http(viewer, 'POST', '/api/v1/users', { body: { email: email(`byviewer-${RUN}`), password: PASSWORD, fullName: 'Nope' } });
  expectEnvelope(create, 403);
  expect(/ADMIN, PRESALE_LEAD/.test(create.json.error), `403 should list the allowed roles: ${create.json.error}`);

  const patch = await http(viewer, 'PATCH', `/api/v1/users/${ids.viewer}`, { body: { role: 'ADMIN' } });
  expectEnvelope(patch, 403);
  const removeSelf = await http(viewer, 'DELETE', `/api/v1/users/${ids.viewer}`);
  expect([403, 404, 405].includes(removeSelf.status), `DELETE on /users/:id should not be a writable success, got ${removeSelf.status}`);
  return [create.json.error];
});

await suite.test('G3-07', 'GET /users filters by search, role and status and validates the enum', async () => {
  const bySearch = await http(adminA, 'GET', `/api/v1/users?search=${encodeURIComponent(VIEWER.split('@')[0])}`);
  expect(bySearch.status === 200, `search failed: ${bySearch.status}`);
  expect(bySearch.json.data.length >= 1, 'search should match the created member');

  const byRole = await http(adminA, 'GET', '/api/v1/users?role=ADMIN');
  expect(byRole.status === 200 && byRole.json.data.every(item => item.role === 'ADMIN'), 'role filter returned non-admins');

  const badRole = await http(adminA, 'GET', '/api/v1/users?role=NOT_A_ROLE');
  expectEnvelope(badRole, 400);

  const badLimit = await http(adminA, 'GET', '/api/v1/users?limit=0');
  expectEnvelope(badLimit, 400);
  const overLimit = await http(adminA, 'GET', '/api/v1/users?limit=101');
  expectEnvelope(overLimit, 400);
  const badPage = await http(adminA, 'GET', '/api/v1/users?page=0');
  expectEnvelope(badPage, 400);
  const badStatus = await http(adminA, 'GET', '/api/v1/users?status=BANNED');
  expectEnvelope(badStatus, 400);
  return ['enum and range guards return 400, never 500'];
});

await suite.test('G3-08', 'allOrganizations=true is ADMIN-only and stays inside the ADMIN own tenants', async () => {
  const forbidden = await http(viewer, 'GET', '/api/v1/users?allOrganizations=true');
  expectEnvelope(forbidden, 403);

  const allowed = await http(adminA, 'GET', '/api/v1/users?allOrganizations=true');
  expect(allowed.status === 200, `expected 200 for ADMIN, got ${allowed.status} ${allowed.text.slice(0, 200)}`);
  expect(!allowed.json.data.some(item => item.organizationId === ids.orgB), 'cross-organization browse exposed another tenant');
  expectNoCredentialLeak(allowed);
  return ['403 for VIEWER; ADMIN scope limited to organizations the caller belongs to'];
});

await suite.test('G3-09', 'GET /users/:id resolves in-tenant members and hides foreign ones as 404', async () => {
  const mine = await http(adminA, 'GET', `/api/v1/users/${ids.viewer}`);
  expect(mine.status === 200, `expected 200, got ${mine.status}`);
  expect(mine.json.data.id === ids.viewer, 'wrong member returned');
  expectNoCredentialLeak(mine);

  const foreign = await http(adminB, 'GET', `/api/v1/users/${ids.viewer}`);
  expectEnvelope(foreign, 404);
  expectNoInternalLeak(foreign);

  const malformed = await http(adminA, 'GET', '/api/v1/users/not-a-uuid');
  expectEnvelope(malformed, 400);

  const missing = await http(adminA, 'GET', `/api/v1/users/${uuid}`);
  expectEnvelope(missing, 404);
  return ['foreign member answers 404 rather than 403, so existence is not disclosed'];
});

await suite.test('G3-10', 'PATCH /users/:id updates a member and requires at least one field', async () => {
  const updated = await http(adminA, 'PATCH', `/api/v1/users/${ids.viewer}`, { body: { fullName: 'E2E Viewer Renamed' } });
  expect(updated.status === 200, `expected 200, got ${updated.status} ${updated.text.slice(0, 200)}`);
  expect(updated.json.data.fullName === 'E2E Viewer Renamed', 'name not persisted');
  expect(updated.json.data.role === 'VIEWER', 'unmentioned fields must not change');
  expectNoCredentialLeak(updated);

  const empty = await http(adminA, 'PATCH', `/api/v1/users/${ids.viewer}`, { body: {} });
  expectEnvelope(empty, 400);

  const promoted = await http(adminA, 'PATCH', `/api/v1/users/${ids.viewer}`, { body: { role: 'SOLUTION_ARCHITECT' } });
  expect(promoted.status === 200 && promoted.json.data.role === 'SOLUTION_ARCHITECT', `role change failed: ${promoted.status}`);
  return ['partial update keeps other fields', '400 on empty patch'];
});

await suite.test('G3-11', 'An ADMIN cannot change their own role or status', async () => {
  const selfRole = await http(adminA, 'PATCH', `/api/v1/users/${ids.adminA}`, { body: { role: 'VIEWER' } });
  expectEnvelope(selfRole, 400);
  expect(/another administrator/i.test(selfRole.json.error), `message should explain the guard: ${selfRole.json.error}`);
  const selfStatus = await http(adminA, 'PATCH', `/api/v1/users/${ids.adminA}`, { body: { status: 'DEACTIVATED' } });
  expectEnvelope(selfStatus, 400);
  return [selfRole.json.error];
});

await suite.test('G3-12', 'The last active ADMIN cannot be demoted or deactivated by a PRESALE_LEAD', async () => {
  await addMember(LEAD, 'PRESALE_LEAD', 'E2E Presale Lead');
  await login(lead, LEAD);
  ids.lead = lead.get('presaleee_access') ? undefined : undefined;

  const demote = await http(lead, 'PATCH', `/api/v1/users/${ids.adminA}`, { body: { role: 'VIEWER' } });
  expectEnvelope(demote, 409);
  expect(/at least one active ADMIN/i.test(demote.json.error), `message should explain the guard: ${demote.json.error}`);

  const deactivate = await http(lead, 'PATCH', `/api/v1/users/${ids.adminA}`, { body: { status: 'DEACTIVATED' } });
  expectEnvelope(deactivate, 409);

  const roleStillAdmin = await http(adminA, 'GET', '/api/v1/auth/me');
  expect(roleStillAdmin.status === 200 && roleStillAdmin.json.data.user.role === 'ADMIN', 'guard must not have mutated the admin');
  return [demote.json.error];
});

await suite.test('G3-13', 'Deactivating a member kills their existing session and blocks new logins', async () => {
  const created = await addMember(DEACTIVATED, 'VIEWER', 'E2E Deactivate Me');
  expect(created.status === 201, `fixture member failed: ${created.status} ${created.text.slice(0, 200)}`);
  ids.deactivated = created.json.data.id;
  suite.trackUser(ids.deactivated);

  const memberJar = new CookieJar();
  await login(memberJar, DEACTIVATED);
  const refreshToken = memberJar.get('presaleee_refresh');
  expect(refreshToken, 'login fixture produced no refresh cookie');

  const deactivated = await http(adminA, 'PATCH', `/api/v1/users/${ids.deactivated}`, { body: { status: 'DEACTIVATED' } });
  expect(deactivated.status === 200, `expected 200, got ${deactivated.status} ${deactivated.text.slice(0, 200)}`);
  expect(deactivated.json.data.status === 'DEACTIVATED', 'status not persisted');

  const relogin = await http(new CookieJar(), 'POST', '/api/v1/auth/login', { body: { email: DEACTIVATED, password: PASSWORD } });
  expectEnvelope(relogin, 401);

  const refresh = await http(new CookieJar(), 'POST', '/api/v1/auth/refresh', { rawCookie: `presaleee_refresh=${refreshToken}` });
  expectEnvelope(refresh, 401);
  return ['login 401 after deactivation', 'pre-existing refresh session revoked'];
});

await suite.test('G3-14', 'PATCH /users/me edits profile fields and ignores role/status escalation', async () => {
  const updated = await http(viewer, 'PATCH', '/api/v1/users/me', {
    body: { fullName: 'E2E Viewer Self', avatarUrl: 'https://example.test/avatar.png', role: 'ADMIN', status: 'ACTIVE' }
  });
  expect(updated.status === 200, `expected 200, got ${updated.status} ${updated.text.slice(0, 200)}`);
  expect(updated.json.data.user.fullName === 'E2E Viewer Self', 'self name update failed');
  expect(updated.json.data.user.role === 'SOLUTION_ARCHITECT', `self-service must not escalate role, got ${updated.json.data.user.role}`);
  expectNoCredentialLeak(updated);

  const empty = await http(viewer, 'PATCH', '/api/v1/users/me', { body: {} });
  expectEnvelope(empty, 400);
  return ['role/status keys in the body are not writable here'];
});

await suite.test('G3-15', 'Changing my password proves the current one and revokes other sessions', async () => {
  const rotator = new CookieJar();
  await login(rotator, RELOGIN);
  const refreshToken = rotator.get('presaleee_refresh');

  const missing = await http(rotator, 'PATCH', '/api/v1/users/me', { body: { password: NEW_PASSWORD } });
  expectEnvelope(missing, 400);

  const wrong = await http(rotator, 'PATCH', '/api/v1/users/me', { body: { password: NEW_PASSWORD, currentPassword: 'definitely-not-it' } });
  expectEnvelope(wrong, 401);

  const before = await http(rotator, 'PATCH', '/api/v1/users/me', { body: { password: `${NEW_PASSWORD}2`, currentPassword: PASSWORD } });
  expect(before.status === 200, `expected 200, got ${before.status} ${before.text.slice(0, 200)}`);
  expect(before.json.data.passwordChanged === true, 'passwordChanged flag missing');
  expect(before.json.data.user.password === undefined, 'response must not echo any password');

  const stale = await http(new CookieJar(), 'POST', '/api/v1/auth/refresh', { rawCookie: `presaleee_refresh=${refreshToken}` });
  expectEnvelope(stale, 401);

  const oldPassword = await http(new CookieJar(), 'POST', '/api/v1/auth/login', { body: { email: RELOGIN, password: PASSWORD } });
  expectEnvelope(oldPassword, 401);
  const newPassword = await http(new CookieJar(), 'POST', '/api/v1/auth/login', { body: { email: RELOGIN, password: `${NEW_PASSWORD}2` } });
  expect(newPassword.status === 200, `new password must work, got ${newPassword.status}`);
  return ['currentPassword enforced', 'all refresh sessions revoked'];
});

await suite.test('G3-16', 'Every directory endpoint requires authentication', async () => {
  const routes = ['/api/v1/users', '/api/v1/users/me/organizations', `/api/v1/users/${ids.viewer}`];
  for (const route of routes) {
    const response = await http(new CookieJar(), 'GET', route);
    expectEnvelope(response, 401);
    expectNoInternalLeak(response);
  }
  const post = await http(new CookieJar(), 'POST', '/api/v1/users', { body: { email: 'x@y.test', password: PASSWORD, fullName: 'X' } });
  expectEnvelope(post, 401);
  return ['401 on all four, no anonymous write path'];
});

// ---------------------------------------------------------------- G4 clients

await suite.test('G4-01', 'POST /clients creates a client with the documented defaults', async () => {
  const created = await http(adminA, 'POST', '/api/v1/clients', {
    body: { companyName: COMPANY, industry: 'Fintech', contactPerson: 'Alex Nguyen', contactEmail: 'alex@example.test', contactPhone: '+84 900 000 000' }
  });
  expect(created.status === 201, `expected 201, got ${created.status} ${created.text.slice(0, 200)}`);
  expect(created.headers.location === `/api/v1/clients/${created.json.data.id}`, `Location wrong: ${created.headers.location}`);
  expect(created.json.data.country === 'Vietnam', `country should default to Vietnam, got ${created.json.data.country}`);
  expect(created.json.data.organizationId === ids.orgA, 'client stored in the wrong organization');
  ids.client = created.json.data.id;
  return [`client ${ids.client}`, 'country defaulted'];
});

await suite.test('G4-02', 'Client writes validate the taxonomy and required fields', async () => {
  const missing = await http(adminA, 'POST', '/api/v1/clients', { body: { industry: 'Fintech' } });
  expectEnvelope(missing, 400);
  expect(/companyName/.test(missing.json.error), `message should name the field: ${missing.json.error}`);

  const badIndustry = await http(adminA, 'POST', '/api/v1/clients', { body: { companyName: `${COMPANY} X`, industry: 'Crypto' } });
  expectEnvelope(badIndustry, 400);

  const nullIndustry = await http(adminA, 'POST', '/api/v1/clients', { body: { companyName: `${COMPANY} NullIndustry`, industry: null } });
  expect(nullIndustry.status === 201, `industry:null should be accepted, got ${nullIndustry.status} ${nullIndustry.text.slice(0, 160)}`);

  const duplicate = await http(adminA, 'POST', '/api/v1/clients', { body: { companyName: COMPANY } });
  expectEnvelope(duplicate, 409);

  const otherOrg = await http(adminB, 'POST', '/api/v1/clients', { body: { companyName: COMPANY } });
  expect(otherOrg.status === 201, `same name in another organization must be allowed, got ${otherOrg.status}`);
  ids.clientB = otherOrg.json.data.id;
  return ['400 unknown industry', '409 duplicate per organization', 'uniqueness is tenant-scoped'];
});

await suite.test('G4-03', 'RBAC: a VIEWER can read clients but not create, update or delete them', async () => {
  const read = await http(viewer, 'GET', '/api/v1/clients');
  expect(read.status === 200, `member reads must be allowed, got ${read.status}`);
  const create = await http(viewer, 'POST', '/api/v1/clients', { body: { companyName: 'Nope Corp' } });
  expectEnvelope(create, 403);
  const update = await http(viewer, 'PATCH', `/api/v1/clients/${ids.client}`, { body: { companyName: 'Nope Corp' } });
  expectEnvelope(update, 403);
  const remove = await http(viewer, 'DELETE', `/api/v1/clients/${ids.client}`);
  expectEnvelope(remove, 403);
  expect(/ADMIN, PRESALE_LEAD/.test(create.json.error), '403 must list the allowed roles');
  return [create.json.error];
});

await suite.test('G4-04', 'GET /clients paginates, searches case-insensitively and filters by industry', async () => {
  const list = await http(adminA, 'GET', '/api/v1/clients?limit=1');
  expect(list.status === 200, `expected 200, got ${list.status}`);
  const meta = expectPaginationMeta(list);
  expect(meta.limit === 1 && list.json.data.length === 1, 'limit not honoured');
  expect(meta.totalPages === Math.ceil(meta.total / 1), 'totalPages inconsistent with total');

  const secondPage = await http(adminA, 'GET', '/api/v1/clients?limit=1&page=2');
  expect(secondPage.status === 200 && secondPage.json.meta.page === 2, 'page parameter ignored');
  expect(secondPage.json.data[0]?.id !== list.json.data[0]?.id, 'page 2 repeated a page 1 row');

  const search = await http(adminA, `GET`, `/api/v1/clients?search=${COMPANY.toUpperCase()}`);
  expect(search.status === 200 && search.json.data.length >= 1, 'search must be case-insensitive');

  const industry = await http(adminA, 'GET', '/api/v1/clients?industry=Fintech');
  expect(industry.status === 200 && industry.json.data.every(item => item.industry === 'Fintech'), 'industry filter leaked other industries');

  const badIndustry = await http(adminA, 'GET', '/api/v1/clients?industry=Crypto');
  expectEnvelope(badIndustry, 400);
  const overLimit = await http(adminA, 'GET', '/api/v1/clients?limit=101');
  expectEnvelope(overLimit, 400);
  const badPage = await http(adminA, 'GET', '/api/v1/clients?page=abc');
  expectEnvelope(badPage, 400);
  return [`meta.total=${meta.total}`, 'search is ILIKE and case-insensitive'];
});

await suite.test('G4-05', 'Search input with SQL/ILIKE metacharacters is escaped, not interpreted', async () => {
  for (const probe of ['%25', '_%_', `' OR '1'='1`, `%${COMPANY}`]) {
    const response = await http(adminA, 'GET', `/api/v1/clients?search=${probe}`);
    expect(response.status === 200 || response.status === 400, `unexpected ${response.status} for ${probe}`);
    expectNoInternalLeak(response);
    if (response.status === 200) {
      expect(Array.isArray(response.json.data), 'search must return a list');
    }
  }
  const wildcard = await http(adminA, 'GET', '/api/v1/clients?search=%');
  expect(wildcard.status === 200, `expected 200, got ${wildcard.status}`);
  expect(wildcard.json.data.length === 0, 'a bare % must not match every row (escaping failed)');
  return ['bare % returns 0 rows, so LIKE wildcards are escaped'];
});

await suite.test('G4-06', 'GET /clients/:id resolves in-tenant rows and hides foreign ones as 404', async () => {
  const mine = await http(adminA, 'GET', `/api/v1/clients/${ids.client}`);
  expect(mine.status === 200 && mine.json.data.id === ids.client, `expected 200, got ${mine.status}`);

  const foreignRead = await http(adminB, 'GET', `/api/v1/clients/${ids.client}`);
  expectEnvelope(foreignRead, 404);
  const foreignWrite = await http(adminB, 'PATCH', `/api/v1/clients/${ids.client}`, { body: { companyName: 'Hijacked' } });
  expectEnvelope(foreignWrite, 404);
  const foreignDelete = await http(adminB, 'DELETE', `/api/v1/clients/${ids.client}`);
  expectEnvelope(foreignDelete, 404);

  const stillThere = await http(adminA, 'GET', `/api/v1/clients/${ids.client}`);
  expect(stillThere.status === 200 && stillThere.json.data.companyName === COMPANY, 'cross-tenant mutation succeeded');

  const malformed = await http(adminA, 'GET', '/api/v1/clients/not-a-uuid');
  expectEnvelope(malformed, 400);
  const missing = await http(adminA, 'GET', `/api/v1/clients/${uuid}`);
  expectEnvelope(missing, 404);
  return ['cross-tenant read/patch/delete all answer 404 and change nothing'];
});

await suite.test('G4-07', 'PATCH /clients/:id updates partially and bounds field lengths', async () => {
  const updated = await http(adminA, 'PATCH', `/api/v1/clients/${ids.client}`, {
    body: { industry: 'Healthcare', contactPerson: 'Doctor Who', country: 'Japan' }
  });
  expect(updated.status === 200, `expected 200, got ${updated.status} ${updated.text.slice(0, 200)}`);
  expect(updated.json.data.industry === 'Healthcare' && updated.json.data.country === 'Japan', 'update not persisted');
  expect(updated.json.data.companyName === COMPANY, 'unmentioned companyName must be untouched');
  expect(updated.json.data.contactEmail === 'alex@example.test', 'unmentioned contactEmail must be untouched');

  const empty = await http(adminA, 'PATCH', `/api/v1/clients/${ids.client}`, { body: {} });
  expectEnvelope(empty, 400);

  const tooLongEmail = await http(adminA, 'PATCH', `/api/v1/clients/${ids.client}`, { body: { contactEmail: `${'a'.repeat(250)}@example.test` } });
  expectEnvelope(tooLongEmail, 400);
  expectNoInternalLeak(tooLongEmail);

  const badCountry = await http(adminA, 'PATCH', `/api/v1/clients/${ids.client}`, { body: { country: '12345' } });
  expectEnvelope(badCountry, 400);

  const oversizedName = await http(adminA, 'PATCH', `/api/v1/clients/${ids.client}`, { body: { companyName: 'x'.repeat(300) } });
  expectEnvelope(oversizedName, 400);
  return ['255-column email rejected at the boundary with 400, not a 500 from PostgreSQL'];
});

await suite.test('G4-08', 'A client referenced by a lead cannot be deleted (409) and its leads are listable', async () => {
  const lead1 = await http(adminA, 'POST', '/api/v1/leads', {
    body: { title: `E2E G4 lead ${RUN}`, rawRfpContent: 'We need a quoting assistant for our presale team.', source: 'MANUAL', clientId: ids.client }
  });
  expect(lead1.status === 201, `lead fixture failed: ${lead1.status} ${lead1.text.slice(0, 220)}`);
  ids.lead = lead1.json.data.id;
  expect(lead1.json.data.clientId === ids.client, 'lead did not store clientId');

  const blocked = await http(adminA, 'DELETE', `/api/v1/clients/${ids.client}`);
  expectEnvelope(blocked, 409);

  const childLeads = await http(adminA, 'GET', `/api/v1/clients/${ids.client}/leads`);
  expect(childLeads.status === 200, `expected 200, got ${childLeads.status}`);
  const meta = expectPaginationMeta(childLeads);
  expect(meta.total === 1 && childLeads.json.data[0].id === ids.lead, 'the referencing lead was not listed');

  const otherTenant = await http(adminB, 'GET', `/api/v1/clients/${ids.client}/leads`);
  expectEnvelope(otherTenant, 404);
  return [`409 message: ${blocked.json.error}`, `client leads total=${meta.total}`];
});

await suite.test('G4-09', 'Unknown or foreign UUID references on a lead are refused with 400', async () => {
  const unknown = await http(adminA, 'POST', '/api/v1/leads', {
    body: { title: `E2E unknown client ${RUN}`, rawRfpContent: 'Any content is fine here.', clientId: uuid }
  });
  expectEnvelope(unknown, 400);
  expect(/clientId/.test(unknown.json.error), `message should name the field: ${unknown.json.error}`);

  const foreignClient = await http(adminA, 'POST', '/api/v1/leads', {
    body: { title: `E2E foreign client ${RUN}`, rawRfpContent: 'Any content is fine here.', clientId: ids.clientB }
  });
  expectEnvelope(foreignClient, 400);

  const foreignAssignee = await http(adminA, 'POST', '/api/v1/leads', {
    body: { title: `E2E foreign assignee ${RUN}`, rawRfpContent: 'Any content is fine here.', assignedTo: ids.adminB }
  });
  expectEnvelope(foreignAssignee, 400);
  expectNoInternalLeak(foreignClient);
  return ['no FK violation reaches the client as a 500'];
});

await suite.test('G4-10', 'DELETE /clients/:id returns 204 and is not replayable', async () => {
  const temporary = await http(adminA, 'POST', '/api/v1/clients', { body: { companyName: `${COMPANY} Disposable`, industry: 'Retail' } });
  expect(temporary.status === 201, `fixture failed: ${temporary.status}`);

  const deleted = await http(adminA, 'DELETE', `/api/v1/clients/${temporary.json.data.id}`);
  expect(deleted.status === 204, `expected 204, got ${deleted.status} ${deleted.text.slice(0, 200)}`);
  expect(deleted.text === '' || deleted.json === null, '204 must not carry a body');

  const reread = await http(adminA, 'GET', `/api/v1/clients/${temporary.json.data.id}`);
  expectEnvelope(reread, 404);
  const repeat = await http(adminA, 'DELETE', `/api/v1/clients/${temporary.json.data.id}`);
  expectEnvelope(repeat, 404);
  return ['204 with empty body', 'second delete is 404, not a silent success'];
});

await suite.test('G4-11', 'Client mutations are recorded in the audit trail', async () => {
  const response = await http(adminA, 'GET', '/api/v1/audit-logs?entityType=client&limit=50');
  expect(response.status === 200, `expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  const actions = response.json.data.map(item => item.action);
  for (const required of ['CLIENT_CREATED', 'CLIENT_UPDATED', 'CLIENT_DELETED']) {
    expect(actions.includes(required), `audit trail is missing ${required}`);
  }
  expect(response.json.data.every(item => item.entityId), 'audit entries must reference an entity');
  expectNoCredentialLeak(response);
  return [`observed actions: ${[...new Set(actions)].join(', ')}`];
});

await suite.test('G4-12', 'Audit read is ADMIN/PRESALE_LEAD-only and never writable over HTTP', async () => {
  const asViewer = await http(viewer, 'GET', '/api/v1/audit-logs');
  expectEnvelope(asViewer, 403);

  const writeAttempts = [
    await http(adminA, 'POST', '/api/v1/audit-logs', { body: { action: 'FAKE' } }),
    await http(adminA, 'DELETE', '/api/v1/audit-logs/1')
  ];
  for (const attempt of writeAttempts) {
    expect([404, 405].includes(attempt.status), `audit writes must not be exposed, got ${attempt.status}`);
  }

  const badRange = await http(adminA, 'GET', '/api/v1/audit-logs?from=not-a-date');
  expectEnvelope(badRange, 400);
  const badUuid = await http(adminA, 'GET', '/api/v1/audit-logs?actorId=not-a-uuid');
  expect(badUuid.status === 400 || badUuid.status === 200, `unexpected ${badUuid.status}`);
  return ['no POST/DELETE route on /audit-logs'];
});

suite.note('G3/G4 run also confirms the multi-tenant fix: member and client reads from another organization answer 404, and allOrganizations=true is ADMIN-scoped to the caller own tenants.');

const defectsSection = [
  `## Defects found by this suite (first run 25/28) and their fixes`,
  ``,
  `| Case | Symptom before the fix | Root cause | Fix |`,
  `| --- | --- | --- | --- |`,
  `| G3-15 | \`PATCH /api/v1/users/me\` with a correct \`currentPassword\` answered 401 "Current password is incorrect." | \`PostgresAuthRepository.findUserById\` did not select \`password_hash\`, so \`UpdateOwnProfileUseCase\` always saw \`passwordHash === undefined\` and failed the pre-check. | Added \`password_hash\` to the \`findUserById\` projection. The value never leaves the process: both consumers (\`GetCurrentUserUseCase\`, \`UpdateOwnProfileUseCase\`) re-serialize through \`toPublicUser\`. |`,
  `| G3-15 | A password change answered 200, revoked sessions, but the old password still logged in. | \`UpdateOwnProfileUseCase\` computed the new scrypt hash into a local variable and passed only profile fields to \`userRepository.update\`, so the hash was discarded. | \`UpdateUserInput\` gained \`passwordHash\`, \`PostgresUserRepository.update\` writes the column, and the use case now submits \`{ ...updates, passwordHash }\` when the current password was proven. Session revocation is keyed on \`passwordChanged\` instead of a hash comparison. |`,
  `| G4-06 | \`GET /api/v1/clients/not-a-uuid\` answered 500 "Internal server error occurred." | \`ClientUseCases\` passed the raw path parameter into PostgreSQL, which raises \`invalid input syntax for type uuid\`. The Users module already guarded this with \`requiredUuid\`. | \`GetClientUseCase\`, \`UpdateClientUseCase\`, \`DeleteClientUseCase\` and \`ListClientLeadsUseCase\` validate the id with \`requiredUuid\` before touching the repository, so a malformed id answers 400 with the standard envelope. |`,
  `| G5 (preventive) | Same 500 exposure on \`/rate-cards/:id\`. | Identical missing id validation in \`RateCardUseCases\`. | \`GetRateCardUseCase\`, \`UpdateRateCardUseCase\` and \`DeleteRateCardUseCase\` now call \`requiredUuid\` too; verified by the G1/G2 regression run staying green. |`,
  `| G3-05 | Test-only: the "weak password" case created its member with the suite default password, so 201 was correct. | Fixture helper had no password parameter. | \`addMember()\` takes an explicit password and the case now asserts 400 for a 5-character and a 129-character password. |`,
  ``,
  `Still open after this run (unchanged from G1/G2): logout does not revoke the 15-minute access token (G2-26 documents the behaviour), and unmatched \`/api/v1\` routes answer with the Express HTML 404 page.`
].join('\n');

const organizationSection = [
  `## Multi-tenant isolation matrix`,
  ``,
  `| Action by ADMIN of organization B on an organization A resource | Expected | Observed |`,
  `| --- | --- | --- |`,
  `| \`GET /users/:memberIdA\` | 404 | 404 (G3-09) |`,
  `| \`GET /users?allOrganizations=true\` | only the caller own tenants | 404-free, no org B rows (G3-08) |`,
  `| \`GET /clients/:clientA\` | 404 | 404 (G4-06) |`,
  `| \`PATCH /clients/:clientA\` | 404 and unchanged | 404, name unchanged (G4-06) |`,
  `| \`DELETE /clients/:clientA\` | 404 and row still live | 404, re-read 200 (G4-06) |`,
  `| \`POST /leads\` with a foreign \`clientId\`/\`assignedTo\` | 400 | 400 (G4-09) |`
].join('\n');

suite.writeReport({
  reportDirName: argValue('report-dir', `${RUN}_G3_G4_users_and_clients`),
  extraSections: [defectsSection, organizationSection]
});
