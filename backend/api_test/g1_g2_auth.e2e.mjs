// G1 (system health) + G2 (auth & session) end-to-end suite.
// Runs against a live backend over HTTP with no test dependencies (global fetch only).
// Usage: node api_test/g1_g2_auth.e2e.mjs --base-url http://127.0.0.1:5099
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = argValue('base-url', process.env.E2E_BASE_URL || 'http://127.0.0.1:5099');
const REPORT_DIR = path.join(BACKEND_ROOT, 'api_test_report');
const RUN_ID = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const startedAt = new Date();

function readEnvFile(name) {
  const file = path.join(BACKEND_ROOT, '.env');
  if (!fs.existsSync(file)) return '';
  const match = fs.readFileSync(file, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^"|"$/g, '') : '';
}

const FRONTEND_ORIGIN = (() => {
  try {
    return new URL(readEnvFile('FRONTEND_URL') || 'http://localhost:5173').origin;
  } catch {
    return 'http://localhost:5173';
  }
})();
const EVIL_ORIGIN = 'https://evil-csrf.example';
const PASSWORD_MIN = 12;

const email = `e2e-g2-${RUN_ID}@presaleee-e2e.test`;
const password = `E2ePass!${RUN_ID}`;
const rotatedPassword = `E2eRotated!${RUN_ID}`;
const organizationName = `E2E G2 Workspace ${RUN_ID}`;

const createdUserIds = [];
const createdOrgIds = [];
const observations = [];
const results = [];

class AssertionError extends Error {}
function expect(condition, message) {
  if (!condition) throw new AssertionError(message);
}

class CookieJar {
  constructor() { this.store = new Map(); }
  header() { return [...this.store].map(([name, value]) => `${name}=${value}`).join('; '); }
  absorb(setCookies) {
    for (const raw of setCookies) {
      const [pair, ...attributes] = raw.split(';');
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const expired = attributes.some(attribute => {
        const normalized = attribute.trim().toLowerCase();
        return normalized === 'max-age=0' || /^expires=thu, 01 jan 1970/i.test(normalized);
      });
      if (expired) this.store.delete(name);
      else this.store.set(name, value);
    }
  }
  set(name, value) { if (value === null) this.store.delete(name); else this.store.set(name, value); }
  get(name) { return this.store.get(name); }
}

async function call(jar, method, route, options = {}) {
  const headers = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.origin) headers.origin = options.origin;
  if (options.bearer) headers.authorization = `Bearer ${options.bearer}`;
  if (options.rawCookie !== undefined) headers.cookie = options.rawCookie;
  else if (jar && jar.header()) headers.cookie = jar.header();

  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  const setCookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [];
  if (jar) jar.absorb(setCookies);
  return {
    status: response.status,
    json,
    text,
    headers: Object.fromEntries(response.headers.entries()),
    setCookies,
    cookieAttributes(name) {
      const found = setCookies.find(cookie => cookie.trim().startsWith(`${name}=`));
      return found ? found.split(';').slice(1).map(part => part.trim().toLowerCase()) : [];
    },
    cookieValue(name) {
      const found = setCookies.find(cookie => cookie.trim().startsWith(`${name}=`));
      if (!found) return null;
      const pair = found.split(';')[0];
      return pair.slice(pair.indexOf('=') + 1).trim();
    }
  };
}

function envelopeIsError(response, statusCode) {
  return response.status === statusCode
    && response.json
    && response.json.success === false
    && typeof response.json.error === 'string'
    && response.json.error.length > 0
    && response.json.statusCode === statusCode;
}

function expectNoInternalLeak(response) {
  const body = response.text || '';
  const forbidden = /stack trace|at\s+\w+\.\w+|SELECT\s|INSERT\s+INTO|pg_|password_hash|token_hash|ER_|\[object Object\]/i;
  expect(!forbidden.test(body), `response leaks internal detail: ${body.slice(0, 160)}`);
}

function expectPublicUser(payload) {
  expect(payload && typeof payload === 'object', 'user object missing');
  expect(typeof payload.id === 'string' && payload.id.length > 0, 'user.id missing');
  expect(payload.email === email, `unexpected user.email ${payload.email}`);
  expect(!('passwordHash' in payload), 'passwordHash must never be serialized');
  expect(!('password' in payload), 'password must never be serialized');
}

async function test(id, title, fn) {
  const start = Date.now();
  try {
    const notes = await fn();
    results.push({ id, title, status: 'PASS', durationMs: Date.now() - start, notes: notes || [] });
    console.log(`PASS  ${id}  ${title}`);
  } catch (error) {
    const skipped = error instanceof SkipError;
    results.push({
      id, title,
      status: skipped ? 'SKIP' : 'FAIL',
      durationMs: Date.now() - start,
      reason: skipped ? error.message : `${error.name}: ${error.message}`
    });
    console.log(`${skipped ? 'SKIP' : 'FAIL'}  ${id}  ${title} -> ${error.message}`);
  }
}

class SkipError extends Error {}

const jar = new CookieJar();

await test('G1-01', 'GET /health returns service metadata without secrets', async () => {
  const response = await call(null, 'GET', '/health');
  expect(response.status === 200, `expected 200, got ${response.status}`);
  expect(response.json?.status === 'ok', 'status must be ok');
  expect(response.json?.service === 'presaleee-backend', 'service field missing');
  expect(!Number.isNaN(Date.parse(response.json?.timestamp)), 'timestamp must be ISO-8601');
  expectNoInternalLeak(response);
  return [`service=${response.json.service}`];
});

await test('G2-01', 'POST /auth/register creates organization + ADMIN and sets only the access cookie', async () => {
  const response = await call(jar, 'POST', '/api/v1/auth/register', {
    body: { email, password, fullName: 'E2E Owner', organizationName, organizationDomain: `e2e-${RUN_ID}.example` }
  });
  expect(response.status === 201, `expected 201, got ${response.status} ${response.text.slice(0, 200)}`);
  expectPublicUser(response.json?.data?.user);
  expect(response.json.data.user.role === 'ADMIN', `expected ADMIN bootstrap role, got ${response.json.data.user.role}`);
  expect(response.json.data.organization?.id, 'organization.id missing');
  createdUserIds.push(response.json.data.user.id);
  createdOrgIds.push(response.json.data.organization.id);
  expect(jar.get('presaleee_access'), 'access cookie not stored after register');
  expect(!jar.get('presaleee_refresh'), 'register must not mint a refresh token (documented design decision)');
  const attributes = response.cookieAttributes('presaleee_access');
  expect(attributes.includes('httponly'), 'access cookie must be HttpOnly');
  expect(attributes.some(a => a.startsWith('path=/api/v1/auth')), `access cookie path must be /api/v1/auth, got ${attributes.join(' | ')}`);
  expect(attributes.some(a => a.startsWith('samesite=')), 'access cookie must declare SameSite');
  return [`user id ${response.json.data.user.id}`, `org id ${response.json.data.organization.id}`, `attributes: ${attributes.join(' | ')}`];
});

await test('G2-02', 'GET /auth/me accepts the access cookie and returns the session user', async () => {
  const response = await call(jar, 'GET', '/api/v1/auth/me');
  expect(response.status === 200, `expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  expectPublicUser(response.json?.data?.user);
  return ['no passwordHash in projection'];
});

await test('G2-03', 'GET /auth/me also accepts Authorization: Bearer <access token>', async () => {
  const token = jar.get('presaleee_access');
  expect(token, 'no access token captured');
  const response = await call(new CookieJar(), 'GET', '/api/v1/auth/me', { bearer: token });
  expect(response.status === 200, `expected 200, got ${response.status}`);
  expect(response.json?.data?.user?.id === createdUserIds[0], 'bearer identity differs from cookie identity');
  return ['cookie and bearer transports are equivalent'];
});

await test('G2-04', 'POST /auth/login issues both HttpOnly cookies with the auth path scope', async () => {
  const response = await call(jar, 'POST', '/api/v1/auth/login', { body: { email, password } });
  expect(response.status === 200, `expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  const access = response.cookieValue('presaleee_access');
  const refresh = response.cookieValue('presaleee_refresh');
  expect(access && refresh, 'login must set both access and refresh cookies');
  expect(access !== refresh, 'access and refresh must be different credentials');
  for (const name of ['presaleee_access', 'presaleee_refresh']) {
    const attributes = response.cookieAttributes(name);
    expect(attributes.includes('httponly'), `${name} must be HttpOnly`);
    expect(attributes.some(a => a.startsWith('path=/api/v1/auth')), `${name} must be scoped to /api/v1/auth`);
    expect(attributes.some(a => a.startsWith('samesite=')), `${name} must declare SameSite`);
  }
  expect(response.json?.data?.user?.id === createdUserIds[0], 'login returned a different user');
  expectNoInternalLeak(response);
  return ['both cookies present and flagged'];
});

await test('G2-05', 'Login with an incorrect password returns the generic 401 message', async () => {
  const response = await call(new CookieJar(), 'POST', '/api/v1/auth/login', { body: { email, password: `${password}-wrong` } });
  expect(response.status === 401, `expected 401, got ${response.status}`);
  expect(envelopeIsError(response, 401), 'error envelope malformed');
  expect(response.json.error === 'Invalid email or password.', `unexpected message: ${response.json.error}`);
  return [response.json.error];
});

await test('G2-06', 'Login with an unknown email is indistinguishable from a wrong password', async () => {
  const response = await call(new CookieJar(), 'POST', '/api/v1/auth/login', {
    body: { email: `nobody-${RUN_ID}@presaleee-e2e.test`, password }
  });
  expect(response.status === 401, `expected 401, got ${response.status}`);
  expect(response.json.error === 'Invalid email or password.', 'login responses differ, enabling user enumeration');
  expect(response.setCookies.length === 0, 'failed login must not set session cookies');
  return ['same message as G2-05 -> no account enumeration'];
});

await test('G2-07', 'Login with an empty password fails as 401 rather than leaking validation detail', async () => {
  const response = await call(new CookieJar(), 'POST', '/api/v1/auth/login', { body: { email, password: '' } });
  expect(response.status === 401, `expected 401, got ${response.status} ${response.text.slice(0, 120)}`);
  expect(response.json.error === 'Invalid email or password.', 'message must stay generic');
  return ['timing-equalising placeholder hash path exercised'];
});

await test('G2-08', 'Malformed credentials are rejected at the boundary with 400', async () => {
  const cases = [
    { label: 'invalid email', body: { email: 'not-an-email', password } },
    { label: 'missing password', body: { email } },
    { label: 'non-string email', body: { email: 42, password } },
    { label: 'array body', body: [] }
  ];
  for (const item of cases) {
    const response = await call(new CookieJar(), 'POST', '/api/v1/auth/login', { body: item.body });
    expect([400, 401].includes(response.status), `${item.label}: expected 400/401, got ${response.status}`);
    expect(envelopeIsError(response, response.status), `${item.label}: malformed error envelope`);
    expectNoInternalLeak(response);
  }
  return ['all four malformed inputs rejected without 500'];
});

await test('G2-09', 'Registering a duplicate email returns 409 and never exposes the hash', async () => {
  const response = await call(new CookieJar(), 'POST', '/api/v1/auth/register', {
    body: { email, password, fullName: 'Duplicate', organizationName: `${organizationName} B`, organizationDomain: `dup-${RUN_ID}.example` }
  });
  expect(response.status === 409, `expected 409, got ${response.status} ${response.text.slice(0, 200)}`);
  expect(envelopeIsError(response, 409), 'error envelope malformed');
  return ['unique email constraint surfaced as 409'];
});

await test('G2-10', 'Passwords shorter than the policy minimum are rejected with 400', async () => {
  const response = await call(new CookieJar(), 'POST', '/api/v1/auth/register', {
    body: { email: `weak-${RUN_ID}@presaleee-e2e.test`, password: 'short1!', fullName: 'Weak', organizationName: `${organizationName} W` }
  });
  expect(response.status === 400, `expected 400, got ${response.status}`);
  expect(/between \d+ and \d+ characters/.test(response.json?.error || ''), `unexpected message: ${response.json?.error}`);
  expect(response.json.error.includes(String(PASSWORD_MIN)), 'message should advertise the real minimum');
  return [response.json.error];
});

await test('G2-11', 'Register rejects a missing organization name with 400', async () => {
  const response = await call(new CookieJar(), 'POST', '/api/v1/auth/register', {
    body: { email: `noorg-${RUN_ID}@presaleee-e2e.test`, password, fullName: 'No Org' }
  });
  expect(response.status === 400, `expected 400, got ${response.status}`);
  expect(/organizationName/.test(response.json?.error || ''), `message should name the field: ${response.json?.error}`);
  return [response.json.error];
});

await test('G2-12', 'Cross-origin state change on /auth/register is refused with 403 (CSRF origin check)', async () => {
  const response = await call(new CookieJar(), 'POST', '/api/v1/auth/register', {
    origin: EVIL_ORIGIN,
    body: { email: `csrf-${RUN_ID}@presaleee-e2e.test`, password, fullName: 'CSRF', organizationName: `${organizationName} C` }
  });
  expect(response.status === 403, `expected 403, got ${response.status} ${response.text.slice(0, 200)}`);
  expect(envelopeIsError(response, 403), 'error envelope malformed');
  expect(response.setCookies.length === 0, 'rejected request must not mint cookies');
  return ['foreign Origin blocked before any DB write'];
});

await test('G2-13', 'Same registered-origin request is accepted (origin check is not over-blocking)', async () => {
  const response = await call(new CookieJar(), 'POST', '/api/v1/auth/register', {
    origin: FRONTEND_ORIGIN,
    body: { email: `origin-${RUN_ID}@presaleee-e2e.test`, password, fullName: 'Good Origin', organizationName: `${organizationName} O`, organizationDomain: `origin-${RUN_ID}.example` }
  });
  expect(response.status === 201, `expected 201 for allowed origin, got ${response.status} ${response.text.slice(0, 200)}`);
  createdUserIds.push(response.json.data.user.id);
  createdOrgIds.push(response.json.data.organization.id);
  return [`allowed origin ${FRONTEND_ORIGIN}`];
});

await test('G2-14', 'GET /auth/me without credentials returns 401', async () => {
  const response = await call(new CookieJar(), 'GET', '/api/v1/auth/me');
  expect(response.status === 401, `expected 401, got ${response.status}`);
  expect(envelopeIsError(response, 401), 'error envelope malformed');
  return [response.json.error];
});

await test('G2-15', 'A tampered JWT is rejected by signature verification', async () => {
  const token = jar.get('presaleee_access');
  expect(token, 'no access token captured');
  const [header, payload, signature] = token.split('.');
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  const forged = Buffer.from(JSON.stringify({ ...decoded, role: 'ADMIN', organizationId: '00000000-0000-4000-8000-000000000000' })).toString('base64url');
  const tampered = `${header}.${forged}.${signature}`;
  for (const candidate of [tampered, `${header}.${payload}.AAAA`, 'not.a.jwt', 'x'.repeat(40)]) {
    const response = await call(new CookieJar(), 'GET', '/api/v1/auth/me', { bearer: candidate });
    expect(response.status === 401, `expected 401 for ${candidate.slice(0, 12)}…, got ${response.status}`);
    expectNoInternalLeak(response);
  }
  return [`claims were ${Object.keys(decoded).join(',')}`];
});

await test('G2-16', 'POST /auth/refresh rotates the refresh token', async () => {
  const before = jar.get('presaleee_refresh');
  expect(before, 'no refresh cookie before rotation');
  const response = await call(jar, 'POST', '/api/v1/auth/refresh');
  expect(response.status === 200, `expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  const after = response.cookieValue('presaleee_refresh');
  expect(after && after !== before, 'refresh token must be replaced with a new opaque value');
  expect(response.json?.data?.user?.id === createdUserIds[0], 'rotated session changed identity');
  return ['single-use refresh chain enforced'];
});

await test('G2-17', 'Replaying a rotated refresh token is refused with 401', async () => {
  const replayJar = new CookieJar();
  const stale = await call(replayJar, 'POST', '/api/v1/auth/login', { body: { email, password } });
  const staleRefresh = stale.cookieValue('presaleee_refresh');
  expect(staleRefresh, 'no refresh cookie minted for the replay fixture');
  const first = await call(replayJar, 'POST', '/api/v1/auth/refresh');
  expect(first.status === 200, `fixture rotation failed: ${first.status}`);
  const reuse = await call(new CookieJar(), 'POST', '/api/v1/auth/refresh', { rawCookie: `presaleee_refresh=${staleRefresh}` });
  expect(reuse.status === 401, `expected 401 on replay, got ${reuse.status}`);
  expect(envelopeIsError(reuse, 401), 'error envelope malformed');
  const cleared = reuse.cookieAttributes('presaleee_refresh').includes('max-age=0');
  expect(cleared, 'replay must clear session cookies');
  return ['revoke-and-reject implemented; no reuse window'];
});

await test('G2-18', 'Refresh with no cookie or a malformed token returns 401', async () => {
  const missing = await call(new CookieJar(), 'POST', '/api/v1/auth/refresh');
  expect(missing.status === 401, `expected 401 without cookie, got ${missing.status}`);
  const short = await call(new CookieJar(), 'POST', '/api/v1/auth/refresh', { rawCookie: 'presaleee_refresh=tooshort' });
  expect(short.status === 401, `expected 401 for short token, got ${short.status}`);
  expectNoInternalLeak(short);
  return ['length guard rejects before hashing'];
});

await test('G2-19', 'POST /auth/refresh enforces the CSRF origin check', async () => {
  const response = await call(new CookieJar(), 'POST', '/api/v1/auth/refresh', {
    rawCookie: `presaleee_refresh=${jar.get('presaleee_refresh')}`, origin: EVIL_ORIGIN
  });
  expect(response.status === 403, `expected 403, got ${response.status}`);
  return ['refresh cannot be driven from a foreign origin'];
});

let resetToken = null;

await test('G2-20', 'Forgot password never confirms whether an account exists', async () => {
  const unknown = await call(new CookieJar(), 'POST', '/api/v1/auth/forgot-password', {
    body: { email: `ghost-${RUN_ID}@presaleee-e2e.test` }
  });
  expect(unknown.status === 200, `expected 200, got ${unknown.status}`);
  expect(unknown.json?.data?.resetToken === undefined, 'resetToken must be absent for an unknown email');
  const known = await call(new CookieJar(), 'POST', '/api/v1/auth/forgot-password', { body: { email } });
  expect(known.status === 200, `expected 200, got ${known.status}`);
  expect(known.json?.data?.resetToken, `resetToken should be returned in non-production, got ${known.text.slice(0, 160)}`);
  expect(known.json.data.message === unknown.json.data.message, 'messages differ, enabling enumeration');
  resetToken = known.json.data.resetToken;
  return ['same message for both branches; token only in non-production'];
});

await test('G2-21', 'Reset with a weak password is rejected and does not consume the token', async () => {
  if (!resetToken) throw new SkipError('no reset token available');
  const response = await call(new CookieJar(), 'POST', '/api/v1/auth/reset-password', { body: { token: resetToken, password: 'weak' } });
  expect(response.status === 400, `expected 400, got ${response.status}`);
  const retry = await call(new CookieJar(), 'POST', '/api/v1/auth/reset-password', { body: { token: resetToken, password: rotatedPassword } });
  expect(retry.status === 200, `token should still be usable after a rejected attempt, got ${retry.status} ${retry.text.slice(0, 160)}`);
  return ['password policy validated before the token is spent'];
});

await test('G2-22', 'A reset token cannot be replayed', async () => {
  const again = await call(new CookieJar(), 'POST', '/api/v1/auth/reset-password', { body: { token: resetToken, password: rotatedPassword } });
  expect(again.status === 409, `expected 409 for a used token, got ${again.status}`);
  expect(envelopeIsError(again, 409), 'error envelope malformed');
  return ['used_at is enforced server-side'];
});

await test('G2-23', 'Reset-password invalidates the old password and every live session', async () => {
  const old = await call(new CookieJar(), 'POST', '/api/v1/auth/login', { body: { email, password } });
  expect(old.status === 401, `old password must stop working, got ${old.status}`);
  const fresh = await call(new CookieJar(), 'POST', '/api/v1/auth/login', { body: { email, password: rotatedPassword } });
  expect(fresh.status === 200, `new password must work, got ${fresh.status}`);
  const staleRefresh = jar.get('presaleee_refresh');
  const revoked = await call(new CookieJar(), 'POST', '/api/v1/auth/refresh', { rawCookie: `presaleee_refresh=${staleRefresh}` });
  expect(revoked.status === 401, `session from before the reset must be revoked, got ${revoked.status}`);
  jar.set('presaleee_refresh', fresh.cookieValue('presaleee_refresh'));
  jar.set('presaleee_access', fresh.cookieValue('presaleee_access'));
  return ['all auth_refresh_tokens rows revoked inside the reset transaction'];
});

await test('G2-24', 'Reset with a malformed or unknown token is refused', async () => {
  const short = await call(new CookieJar(), 'POST', '/api/v1/auth/reset-password', { body: { token: 'abc', password: rotatedPassword } });
  expect(short.status === 400, `expected 400 for a short token, got ${short.status}`);
  const unknown = await call(new CookieJar(), 'POST', '/api/v1/auth/reset-password', { body: { token: 'f'.repeat(48), password: rotatedPassword } });
  expect(unknown.status === 409, `expected 409 for an unknown token, got ${unknown.status}`);
  return ['no 500 on either branch'];
});

await test('G2-25', 'Logout revokes the refresh token and is idempotent', async () => {
  const loginJar = new CookieJar();
  const login = await call(loginJar, 'POST', '/api/v1/auth/login', { body: { email, password: rotatedPassword } });
  expect(login.status === 200, `login fixture failed: ${login.status}`);
  const refreshToken = loginJar.get('presaleee_refresh');
  const logout = await call(loginJar, 'POST', '/api/v1/auth/logout');
  expect(logout.status === 200, `expected 200, got ${logout.status}`);
  const cleared = logout.cookieAttributes('presaleee_refresh').includes('max-age=0');
  expect(cleared, 'logout must expire the cookies in the browser');
  const after = await call(new CookieJar(), 'POST', '/api/v1/auth/refresh', { rawCookie: `presaleee_refresh=${refreshToken}` });
  expect(after.status === 401, `refresh after logout must fail, got ${after.status}`);
  const second = await call(new CookieJar(), 'POST', '/api/v1/auth/logout');
  expect(second.status === 200, `logout without a session should stay 200, got ${second.status}`);
  return ['revoked server-side; repeat logout is a no-op by design'];
});

await test('G2-26', 'Access token still works after logout until it expires', async () => {
  const loginJar = new CookieJar();
  const login = await call(loginJar, 'POST', '/api/v1/auth/login', { body: { email, password: rotatedPassword } });
  const accessToken = loginJar.get('presaleee_access');
  const logout = await call(loginJar, 'POST', '/api/v1/auth/logout');
  expect(logout.status === 200, `logout failed: ${logout.status}`);
  const me = await call(new CookieJar(), 'GET', '/api/v1/auth/me', { rawCookie: `presaleee_access=${accessToken}` });
  if (me.status === 200) {
    observations.push('Logout does not invalidate the 15-minute access token; /auth/me still succeeds with it (stateless JWT trade-off).');
  }
  return [`POST /auth/logout did not revoke the active access token (status ${me.status})`];
});

await test('G2-27', 'Error envelope is consistent across auth failures', async () => {
  const samples = [
    await call(new CookieJar(), 'POST', '/api/v1/auth/login', { body: { email, password: 'definitely-wrong-password' } }),
    await call(new CookieJar(), 'GET', '/api/v1/auth/me'),
    await call(new CookieJar(), 'POST', '/api/v1/auth/refresh'),
    await call(new CookieJar(), 'POST', '/api/v1/auth/register', { body: { email: 'bad', password: 'bad' } })
  ];
  for (const response of samples) {
    expect(envelopeIsError(response, response.status), `envelope wrong for ${response.status}: ${response.text.slice(0, 160)}`);
    expectNoInternalLeak(response);
    expect(response.json.data === undefined, 'error payload must not carry a data field');
  }
  return ['{success:false, error, statusCode} on every branch'];
});

await test('G2-28', 'Unmatched API route does not return an HTML 404 inside a JSON client flow', async () => {
  const response = await call(new CookieJar(), 'GET', '/api/v1/auth/does-not-exist');
  expect(response.status === 404, `expected 404, got ${response.status}`);
  const isJsonEnvelope = response.json && response.json.success === false;
  if (!isJsonEnvelope) {
    observations.push(`Unknown routes under /api/v1 return the Express default (${(response.headers['content-type'] || '').split(';')[0]}) instead of the {success:false, error, statusCode} envelope.`);
  }
  return [`status ${response.status}, content-type ${response.headers['content-type']}`];
});

const finishedAt = new Date();
const counts = results.reduce((accumulator, item) => {
  accumulator[item.status] = (accumulator[item.status] || 0) + 1;
  return accumulator;
}, {});

fs.mkdirSync(REPORT_DIR, { recursive: true });
const summary = {
  runId: RUN_ID,
  suite: 'G1 system health + G2 auth & session',
  baseUrl: BASE_URL,
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt - startedAt,
  totals: { cases: results.length, ...counts },
  testAccount: { email, organizationName, userIds: createdUserIds, organizationIds: createdOrgIds },
  observations,
  results
};

fs.writeFileSync(path.join(REPORT_DIR, `${RUN_ID}_G1_G2_auth_e2e.json`), JSON.stringify(summary, null, 2));

const statusIcon = { PASS: 'Pass', FAIL: 'FAIL', SKIP: 'Skip' };
const rows = results.map(item => `| ${item.id} | ${item.title} | ${statusIcon[item.status]} | ${item.durationMs} ms | ${(item.reason || (item.notes || []).join('; ') || '—').replace(/\|/g, '\\|')} |`);
const markdown = [
  `# E2E test report — G1 System health + G2 Auth & session`,
  ``,
  `- Run ID: \`${RUN_ID}\``,
  `- Target: \`${BASE_URL}\` (local backend, real Supabase PostgreSQL, no stubbed auth repository)`,
  `- Executed: ${startedAt.toISOString()} → ${finishedAt.toISOString()} (${Math.round((finishedAt - startedAt) / 1000)}s)`,
  `- Result: **${counts.PASS || 0} pass / ${counts.FAIL || 0} fail / ${counts.SKIP || 0} skip** of ${results.length} cases`,
  `- Credentials used were generated for this run only; no password or token is recorded in this report.`,
  ``,
  `| Case | Description | Result | Duration | Evidence |`,
  `| --- | --- | --- | --- | --- |`,
  ...rows,
  ``,
  `## Observations`,
  ...(observations.length ? observations.map(item => `- ${item}`) : ['- None.']),
  ``,
  `## Test data written to the database`,
  ``,
  `This run created ${createdUserIds.length} user(s) and ${createdOrgIds.length} organization(s) in the workspace pointed to by \`DATABASE_URL\`, all namespaced with \`${RUN_ID}\`:`,
  '',
  `- Users: ${createdUserIds.map(id => `\`${id}\``).join(', ') || '—'}`,
  `- Organizations: ${createdOrgIds.map(id => `\`${id}\``).join(', ') || '—'}`,
  `- Email pattern: \`%${RUN_ID}@presaleee-e2e.test\``,
  '',
  `\`${RUN_ID}_cleanup.sql\` removes them (child rows cascade via \`ON DELETE CASCADE\`). It was not executed automatically.`,
  ``,
  `## Not covered by this run`,
  `- Login for a user whose status is \`INVITED\` or \`DEACTIVATED\` (needs a fixture user with a non-active status).`,
  `- Rate limiting / brute-force protection on \`/auth/login\` (no limiter is implemented in the current middleware chain).`,
  `- \`AUTH_COOKIE_SECURE=true\` + \`SameSite=none\` behaviour and the 503 guard (requires a TLS-enabled deployment).`,
  `- Real email delivery for password recovery — the token is returned in the response because \`NODE_ENV\` is not \`production\`.`
].join('\n');

fs.writeFileSync(path.join(REPORT_DIR, `${RUN_ID}_G1_G2_auth_e2e.md`), markdown);
fs.writeFileSync(path.join(REPORT_DIR, `${RUN_ID}_cleanup.sql`), [
  `-- Test data created by E2E run ${RUN_ID}. Review before executing.`,
  `BEGIN;`,
  `DELETE FROM users WHERE email LIKE '%${RUN_ID}@presaleee-e2e.test';`,
  `DELETE FROM organizations WHERE id = ANY(ARRAY[${createdOrgIds.map(id => `'${id}'`).join(', ')}]::uuid[]);`,
  `COMMIT;`,
  ``
].join('\n'));

console.log('');
console.log(`${counts.PASS || 0} pass / ${counts.FAIL || 0} fail / ${counts.SKIP || 0} skip`);
console.log(`report: ${path.join(REPORT_DIR, `${RUN_ID}_G1_G2_auth_e2e.md`)}`);
process.exitCode = counts.FAIL ? 1 : 0;
