// Shared helpers for the backend HTTP e2e suites: cookie jar, JSON envelope
// assertions, case recorder and report writer. No third-party dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPORT_ROOT = path.join(BACKEND_ROOT, 'api_test_report');

export function argValue(name, fallback) {
  const args = process.argv.slice(2);
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

export function readBackendEnv(name) {
  const file = path.join(BACKEND_ROOT, '.env');
  if (!fs.existsSync(file)) return '';
  const match = fs.readFileSync(file, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^"|"$/g, '') : '';
}

export class AssertionError extends Error {}
export class SkipError extends Error {}

export function expect(condition, message) {
  if (!condition) throw new AssertionError(message);
}

export function runId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

export class CookieJar {
  constructor() { this.store = new Map(); }
  header() { return [...this.store].map(([name, value]) => `${name}=${value}`).join('; '); }
  get(name) { return this.store.get(name); }
  set(name, value) { if (value === null) this.store.delete(name); else this.store.set(name, value); }
  absorb(setCookies) {
    for (const raw of setCookies) {
      const [pair, ...attributes] = raw.split(';');
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const expired = attributes.some(attribute => attribute.trim().toLowerCase() === 'max-age=0');
      if (expired) this.store.delete(name);
      else this.store.set(name, value);
    }
  }
}

export function createHttp(baseUrl) {
  return async function call(jar, method, route, options = {}) {
    const headers = {};
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.origin) headers.origin = options.origin;
    if (options.bearer) headers.authorization = `Bearer ${options.bearer}`;
    if (options.rawCookie !== undefined) headers.cookie = options.rawCookie;
    else if (jar && jar.header()) headers.cookie = jar.header();

    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
    if (jar) jar.absorb(setCookies);

    return {
      method, route, status: response.status, json, text,
      headers: Object.fromEntries(response.headers.entries()),
      setCookies,
      cookieValue(name) {
        const found = setCookies.find(cookie => cookie.trim().startsWith(`${name}=`));
        if (!found) return null;
        const pair = found.split(';')[0];
        return pair.slice(pair.indexOf('=') + 1).trim();
      },
      cookieAttributes(name) {
        const found = setCookies.find(cookie => cookie.trim().startsWith(`${name}=`));
        return found ? found.split(';').slice(1).map(part => part.trim().toLowerCase()) : [];
      }
    };
  }
}

export function isEnvelope(response, statusCode = response.status) {
  return response.status === statusCode
    && response.json
    && response.json.success === false
    && typeof response.json.error === 'string'
    && response.json.error.length > 0
    && response.json.statusCode === statusCode;
}

export function expectEnvelope(response, statusCode) {
  expect(isEnvelope(response, statusCode), `expected {success:false, error, statusCode:${statusCode}} envelope, got ${response.status} ${response.text.slice(0, 200)}`);
  expect(response.json.data === undefined, 'error payload must not carry a data field');
}

export function expectNoInternalLeak(response) {
  const body = response.text || '';
  const forbidden = /stack trace|at\s+\w+\.\w+|SELECT\s|INSERT\s+INTO|pg_|password_hash|token_hash|ER_|\[object Object\]/i;
  expect(!forbidden.test(body), `response leaks internal detail: ${body.slice(0, 160)}`);
}

export function expectNoCredentialLeak(response) {
  const body = response.text || '';
  expect(!/"passwordHash"\s*:/.test(body), 'passwordHash must never be serialized');
  expect(!/"password"\s*:/.test(body), 'password must never be serialized');
  expect(!/"tokenHash"|token_hash/.test(body), 'token hash must never be serialized');
}

export function expectPaginationMeta(response) {
  const meta = response.json?.meta;
  expect(meta && typeof meta.total === 'number', 'meta.total missing');
  expect(typeof meta.page === 'number' && typeof meta.limit === 'number', 'meta.page/limit missing');
  expect(typeof meta.totalPages === 'number', 'meta.totalPages missing');
  return meta;
}

/** Records case results and writes the md/json/cleanup report bundle. */
export class Suite {
  constructor({ code, title, baseUrl, targetNote }) {
    this.code = code;
    this.title = title;
    this.baseUrl = baseUrl;
    this.targetNote = targetNote;
    this.startedAt = new Date();
    this.results = [];
    this.observations = [];
    this.users = [];
    this.organizations = [];
    this.rawRequests = [];
  }

  note(observation) { this.observations.push(observation); }
  trackUser(id) { if (id) this.users.push(id); }
  trackOrganization(id) { if (id) this.organizations.push(id); }

  async test(id, title, fn) {
    const start = Date.now();
    try {
      const notes = await fn();
      this.results.push({ id, title, status: 'PASS', durationMs: Date.now() - start, notes: notes || [] });
      console.log(`PASS  ${id}  ${title}`);
    } catch (error) {
      const skipped = error instanceof SkipError;
      this.results.push({
        id, title,
        status: skipped ? 'SKIP' : 'FAIL',
        durationMs: Date.now() - start,
        reason: skipped ? error.message : `${error.name}: ${error.message}`
      });
      console.log(`${skipped ? 'SKIP' : 'FAIL'}  ${id}  ${title} -> ${error.message}`);
    }
  }

  writeReport({ reportDirName = this.code, extraSections = [] } = {}) {
    const finishedAt = new Date();
    const reportDir = path.join(REPORT_ROOT, reportDirName);
    fs.mkdirSync(reportDir, { recursive: true });
    const counts = this.results.reduce((accumulator, item) => {
      accumulator[item.status] = (accumulator[item.status] || 0) + 1;
      return accumulator;
    }, {});

    const summary = {
      runId: this.code,
      suite: this.title,
      baseUrl: this.baseUrl,
      startedAt: this.startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt - this.startedAt,
      totals: { cases: this.results.length, ...counts },
      trackedTestData: { userIds: this.users, organizationIds: this.organizations },
      observations: this.observations,
      results: this.results
    };
    fs.writeFileSync(path.join(reportDir, `${this.code}_e2e.json`), JSON.stringify(summary, null, 2));

    const statusLabel = { PASS: 'Pass', FAIL: 'FAIL', SKIP: 'Skip' };
    const rows = this.results.map(item =>
      `| ${item.id} | ${item.title} | ${statusLabel[item.status]} | ${item.durationMs} ms | ${(item.reason || (item.notes || []).join('; ') || '—').replace(/\|/g, '\\|')} |`);

    const markdown = [
      `# E2E test report — ${this.title}`,
      ``,
      `- Run ID: \`${this.code}\``,
      `- Target: \`${this.baseUrl}\` — ${this.targetNote}`,
      `- Executed: ${this.startedAt.toISOString()} → ${finishedAt.toISOString()} (${Math.round((finishedAt - this.startedAt) / 1000)}s)`,
      `- Result: **${counts.PASS || 0} pass / ${counts.FAIL || 0} fail / ${counts.SKIP || 0} skip** of ${this.results.length} cases`,
      `- Generated credentials are namespaced to this run and are not recorded in this report.`,
      ``,
      `| Case | Description | Result | Duration | Evidence |`,
      `| --- | --- | --- | --- | --- |`,
      ...rows,
      ``,
      `## Observations`,
      ...(this.observations.length ? this.observations.map(item => `- ${item}`) : ['- None.']),
      ...extraSections.map(section => ['', section].flat().join('\n')),
      ``,
      `## Test data written to the database`,
      ``,
      `- Users (${this.users.length}): ${this.users.map(id => `\`${id}\``).join(', ') || '—'}`,
      `- Organizations (${this.organizations.length}): ${this.organizations.map(id => `\`${id}\``).join(', ') || '—'}`,
      `- Emails are namespaced with \`${this.code}\`; clients/rate rows are named with the same run id.`,
      ``,
      `\`${this.code}_cleanup.sql\` removes the bootstrap organizations (children cascade). It was not executed automatically.`
    ].join('\n');

    fs.writeFileSync(path.join(reportDir, `${this.code}_e2e.md`), markdown);
    fs.writeFileSync(path.join(reportDir, `${this.code}_cleanup.sql`), [
      `-- Test data from E2E run ${this.code}. Review before executing.`,
      `BEGIN;`,
      `DELETE FROM users WHERE email LIKE '%${this.code}@presaleee-e2e.test';`,
      `DELETE FROM organizations WHERE id = ANY(ARRAY[${this.organizations.map(id => `'${id}'`).join(', ')}]::uuid[]);`,
      `COMMIT;`,
      ``
    ].join('\n'));

    console.log('');
    console.log(`${counts.PASS || 0} pass / ${counts.FAIL || 0} fail / ${counts.SKIP || 0} skip`);
    console.log(`report: ${path.join(reportDir, `${this.code}_e2e.md`)}`);
    process.exitCode = counts.FAIL ? 1 : 0;
    return { reportDir, counts };
  }
}
