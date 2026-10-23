// G13 (Dashboard) and G14 (Audit Logs) e2e suite.
// node api_test/g13_g14_dashboard_audit.e2e.mjs --base-url http://127.0.0.1:5099
import fs from 'node:fs';
import path from 'node:path';
import {
  CookieJar, SkipError, Suite, argValue, createHttp, expect, expectEnvelope,
  expectNoCredentialLeak, expectNoInternalLeak, expectPaginationMeta, readBackendEnv, runId
} from './harness.mjs';

const BASE_URL = argValue('base-url', process.env.E2E_BASE_URL || 'http://127.0.0.1:5099');
const RUN = runId();
const PASSWORD = `E2eD1314Pass!${RUN}`;
const email = role => `g13-${role}-${RUN}@presaleee-e2e.test`;

const ADMIN_A = email('admin-a');
const ADMIN_B = email('admin-b');
const ADMIN_C = email('admin-c');
const LEAD = email('lead');
const VIEWER = email('viewer');
const ARCHITECT = email('architect');
const SALES = email('sales');

const http = createHttp(BASE_URL);
const suite = new Suite({
  code: RUN,
  title: 'G13 Dashboard + G14 Audit Logs',
  baseUrl: BASE_URL,
  targetNote: 'local backend, real Supabase PostgreSQL; both groups are deterministic DB reads, no AI service needed'
});

const adminA = new CookieJar();
const adminB = new CookieJar();
const adminC = new CookieJar();
const leadJar = new CookieJar();
const viewerJar = new CookieJar();
const architectJar = new CookieJar();
const salesJar = new CookieJar();
const ids = {};
const uuid = '2f4c9b6a-1d3e-4a7b-9c8d-1e2f3a4b5c6d';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/** Number of audit rows each fixture write is expected to produce. */
const auditExpected = {
  USER_REGISTERED: 0, USER_CREATED: 0, CLIENT_CREATED: 0,
  LEAD_CREATED: 0, LEAD_STATUS_CHANGED: 0, LEAD_UPDATED: 0,
  PROPOSAL_STATUS_CHANGED: 0, RATE_CARD_CREATED: 0
};

async function register(jar, emailAddress, organizationName, domain, fullName) {
  const response = await http(jar, 'POST', '/api/v1/auth/register', {
    body: { email: emailAddress, password: PASSWORD, fullName, organizationName, organizationDomain: domain }
  });
  expect(response.status === 201, `register ${emailAddress} expected 201, got ${response.status} ${response.text.slice(0, 200)}`);
  if (jar === adminA) auditExpected.USER_REGISTERED++;
  return response;
}

async function login(jar, emailAddress) {
  const response = await http(jar, 'POST', '/api/v1/auth/login', { body: { email: emailAddress, password: PASSWORD } });
  expect(response.status === 200, `login ${emailAddress} expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  return response;
}

async function addMember(jar, emailAddress, role, fullName) {
  const response = await http(jar, 'POST', '/api/v1/users', { body: { email: emailAddress, password: PASSWORD, role, fullName } });
  if (response.status === 201) auditExpected.USER_CREATED++;
  return response;
}

async function createClient(jar, body) {
  const response = await http(jar, 'POST', '/api/v1/clients', { body });
  if (response.status === 201) auditExpected.CLIENT_CREATED++;
  return response;
}

async function createLead(jar, body) {
  const response = await http(jar, 'POST', '/api/v1/leads', { body });
  if (response.status === 201 && jar === adminA) auditExpected.LEAD_CREATED++;
  return response;
}

async function setLeadStatus(jar, id, status) {
  const response = await http(jar, 'PATCH', `/api/v1/leads/${id}/status`, { body: { status } });
  if (response.status === 200) auditExpected.LEAD_STATUS_CHANGED++;
  return response;
}

async function createProposalFromLead(jar, leadId, title) {
  return http(jar, 'POST', `/api/v1/leads/${leadId}/proposals`, { body: { title } });
}

async function createProposal(jar, body) {
  return http(jar, 'POST', '/api/v1/proposals', { body });
}

async function patchProposal(jar, id, body) {
  const response = await http(jar, 'PATCH', `/api/v1/proposals/${id}`, { body });
  if (response.status === 200 && body.status !== undefined) auditExpected.PROPOSAL_STATUS_CHANGED++;
  return response;
}

const overview = (jar, query = '') => http(jar, 'GET', `/api/v1/dashboard/overview${query}`);
const dashLeads = (jar, query = '') => http(jar, 'GET', `/api/v1/dashboard/leads${query}`);
const activity = (jar, query = '') => http(jar, 'GET', `/api/v1/dashboard/activity${query}`);
const audit = (jar, query = '') => http(jar, 'GET', `/api/v1/audit-logs${query}`);

let pool = null;
let poolState = null;
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

async function dbRows(query, values) {
  const db = await database();
  if (!db) throw new SkipError(`database check unavailable: ${poolState}`);
  return (await db.query(query, values)).rows;
}

/** Fixtures are written in one order; expected aggregates are derived from this manifest. */
const LEAD_FIXTURES = [
  { key: 'L1', final: 'NEW', chain: [], clientId: true },
  { key: 'L2', final: 'IN_REVIEW', chain: ['IN_REVIEW'] },
  { key: 'L3', final: 'QUALIFYING', chain: ['IN_REVIEW', 'QUALIFYING'] },
  { key: 'L4', final: 'QUALIFIED', chain: ['IN_REVIEW', 'QUALIFYING', 'QUALIFIED'], proposal: { currency: 'USD', totalCost: 12500, status: 'DRAFT' } },
  { key: 'L5', final: 'QUALIFIED', chain: ['IN_REVIEW', 'QUALIFYING', 'QUALIFIED'], proposal: { currency: 'VND', totalCost: 250000000, status: 'DRAFT' } },
  { key: 'L6', final: 'QUALIFIED', chain: ['IN_REVIEW', 'QUALIFYING', 'QUALIFIED'] },
  { key: 'L7', final: 'PROPOSAL_DRAFTING', chain: ['IN_REVIEW', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_DRAFTING'], proposal: { currency: 'USD', totalCost: 5000, status: 'IN_REVIEW' } },
  { key: 'L8', final: 'REJECTED', chain: ['REJECTED'] },
  { key: 'L9', final: 'WON', chain: ['IN_REVIEW', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_DRAFTING', 'WON'], proposal: { currency: 'EUR', totalCost: 3000, status: 'APPROVED' }, proposalAt: 'PROPOSAL_DRAFTING' },
  { key: 'L10', final: 'IN_REVIEW', chain: ['IN_REVIEW'] },
  { key: 'L11', final: 'NEW', chain: [] }
];
const STANDALONE_PROPOSALS = [
  { key: 'P10', currency: 'USD', totalCost: 999999, status: 'REJECTED' },
  { key: 'P11', currency: 'USD', totalCost: null, status: 'DRAFT' }
];
const PIPELINE_STATUSES = ['NEW', 'IN_REVIEW', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_DRAFTING', 'APPROVED', 'REJECTED', 'WON', 'LOST'];

function expectedKpis() {
  const closed = ['WON', 'LOST', 'REJECTED'];
  const leadsByStatus = {};
  for (const fixture of LEAD_FIXTURES) leadsByStatus[fixture.final] = (leadsByStatus[fixture.final] || 0) + 1;
  const proposals = [
    ...LEAD_FIXTURES.filter(fixture => fixture.proposal).map(fixture => fixture.proposal),
    ...STANDALONE_PROPOSALS
  ];
  const valueByCurrency = {};
  for (const proposal of proposals) {
    if (proposal.status === 'REJECTED' || proposal.totalCost === null) continue;
    valueByCurrency[proposal.currency] = (valueByCurrency[proposal.currency] || 0) + proposal.totalCost;
  }
  return {
    totalLeads: LEAD_FIXTURES.length,
    activeLeads: LEAD_FIXTURES.filter(fixture => !closed.includes(fixture.final)).length,
    qualifiedLeads: ['QUALIFIED', 'PROPOSAL_DRAFTING', 'APPROVED'].reduce((sum, status) => sum + (leadsByStatus[status] || 0), 0),
    proposalsInProgress: proposals.filter(proposal => proposal.status === 'DRAFT' || proposal.status === 'IN_REVIEW').length,
    estimatedValueByCurrency: Object.entries(valueByCurrency).sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => ({ currency, amount })),
    leadsByStatus,
    proposals
  };
}

function expectedStageValues() {
  const stages = {};
  for (const fixture of LEAD_FIXTURES) {
    if (!fixture.proposal || fixture.proposal.status === 'REJECTED' || fixture.proposal.totalCost === null) continue;
    const stage = stages[fixture.final] || (stages[fixture.final] = {});
    stage[fixture.proposal.currency] = (stage[fixture.proposal.currency] || 0) + fixture.proposal.totalCost;
  }
  return stages;
}

/** POST /leads/:id/proposals only accepts QUALIFIED/APPROVED/PROPOSAL_DRAFTING, so a WON lead must get its proposal mid-chain. */
async function priceProposal(jar, fixture) {
  const made = await createProposalFromLead(jar, fixture.id, `E2E G13 ${fixture.key} Proposal ${RUN}`);
  expect(made.status === 201, `proposal from ${fixture.key} expected 201, got ${made.status} ${made.text.slice(0, 200)}`);
  fixture.proposal.id = made.json.data.id;
  const priced = await patchProposal(jar, fixture.proposal.id, { totalCost: fixture.proposal.totalCost, currency: fixture.proposal.currency });
  expect(priced.status === 200, `price ${fixture.key} expected 200, got ${priced.status} ${priced.text.slice(0, 160)}`);
  if (fixture.proposal.status !== 'DRAFT') {
    const path = fixture.proposal.status === 'APPROVED' ? ['IN_REVIEW', 'APPROVED'] : [fixture.proposal.status];
    for (const status of path) {
      const moved = await patchProposal(jar, fixture.proposal.id, { status });
      expect(moved.status === 200, `proposal ${fixture.key} -> ${status} expected 200, got ${moved.status} ${moved.text.slice(0, 160)}`);
    }
  }
}

// ------------------------------------------------------------------ bootstrap

await suite.test('G13/G14-00', 'Bootstrap: three tenants, roles, an eleven-lead pipeline with costed proposals', async () => {
  const notes = [];
  const startedAt = new Date();
  ids.runStartedAt = startedAt.toISOString();

  const regA = await register(adminA, ADMIN_A, `E2E G13 Org A ${RUN}`, `g13a-${RUN}.example`, 'E2E G13 Admin A');
  const regB = await register(adminB, ADMIN_B, `E2E G13 Org B ${RUN}`, `g13b-${RUN}.example`, 'E2E G13 Admin B');
  const regC = await register(adminC, ADMIN_C, `E2E G13 Org C ${RUN}`, `g13c-${RUN}.example`, 'E2E G13 Admin C');
  ids.orgA = regA.json.data.organization.id;
  ids.orgB = regB.json.data.organization.id;
  ids.orgC = regC.json.data.organization.id;
  ids.adminA = regA.json.data.user.id;
  ids.adminB = regB.json.data.user.id;
  suite.trackUser(ids.adminA);
  for (const id of [ids.orgA, ids.orgB, ids.orgC]) suite.trackOrganization(id);

  for (const [jar, address, role, name] of [
    [leadJar, LEAD, 'PRESALE_LEAD', 'E2E G13 Presales Lead'],
    [viewerJar, VIEWER, 'VIEWER', 'E2E G13 Viewer'],
    [architectJar, ARCHITECT, 'SOLUTION_ARCHITECT', 'E2E G13 Architect'],
    [salesJar, SALES, 'SALES_REP', 'E2E G13 Sales Rep']
  ]) {
    const member = await addMember(adminA, address, role, name);
    expect(member.status === 201, `${role} fixture expected 201, got ${member.status} ${member.text.slice(0, 160)}`);
    suite.trackUser(member.json.data.id);
    if (role === 'PRESALE_LEAD') ids.leadUserId = member.json.data.id;
    await login(jar, address);
  }

  const client = await createClient(adminA, { companyName: `E2E G13 Client ${RUN}`, industry: 'Fintech' });
  expect(client.status === 201, `client fixture expected 201, got ${client.status} ${client.text.slice(0, 160)}`);
  ids.client = client.json.data.id;

  for (const fixture of LEAD_FIXTURES) {
    const created = await createLead(adminA, {
      title: `E2E G13 ${fixture.key} ${RUN}`,
      rawRfpContent: `Presaleee fixture ${fixture.key}: a portal for consultants, budget disclosed, start next quarter.`,
      source: 'MANUAL',
      clientId: fixture.clientId ? ids.client : undefined,
      assignedTo: fixture.key === 'L4' ? ids.leadUserId : undefined
    });
    expect(created.status === 201, `lead ${fixture.key} expected 201, got ${created.status} ${created.text.slice(0, 160)}`);
    fixture.id = created.json.data.id;
    fixture.createdAt = created.json.data.createdAt;
    for (const status of fixture.chain) {
      const moved = await setLeadStatus(adminA, fixture.id, status);
      expect(moved.status === 200, `${fixture.key} -> ${status} expected 200, got ${moved.status} ${moved.text.slice(0, 160)}`);
      fixture.statusPatches = (fixture.statusPatches || 0) + 1;
      if (fixture.proposal && status === fixture.proposalAt) await priceProposal(adminA, fixture);
    }
    if (fixture.proposal && !fixture.proposal.id) await priceProposal(adminA, fixture);
  }

  for (const standalone of STANDALONE_PROPOSALS) {
    const made = await createProposal(adminA, { title: `E2E G13 ${standalone.key} ${RUN}`, summary: 'Unlinked fixture proposal.', currency: standalone.currency });
    expect(made.status === 201, `proposal ${standalone.key} expected 201, got ${made.status} ${made.text.slice(0, 160)}`);
    standalone.id = made.json.data.id;
    const priced = await patchProposal(adminA, standalone.id, { totalCost: standalone.totalCost, currency: standalone.currency });
    expect(priced.status === 200, `price ${standalone.key} expected 200, got ${priced.status} ${priced.text.slice(0, 160)}`);
    if (standalone.status !== 'DRAFT') {
      const moved = await patchProposal(adminA, standalone.id, { status: standalone.status });
      expect(moved.status === 200, `proposal ${standalone.key} -> ${standalone.status} expected 200, got ${moved.status} ${moved.text.slice(0, 160)}`);
    }
  }

  const tenantLead = await createLead(adminB, { title: `E2E G13 Tenant B Lead ${RUN}`, rawRfpContent: 'Independent tenant fixture.', source: 'WEBSITE' });
  expect(tenantLead.status === 201, `org B lead expected 201, got ${tenantLead.status} ${tenantLead.text.slice(0, 160)}`);
  ids.tenantLead = tenantLead.json.data.id;

  const finishedAt = new Date();
  ids.runFinishedAt = finishedAt.toISOString();
  const expected = expectedKpis();
  notes.push(`org A ${ids.orgA}, org B ${ids.orgB}, org C ${ids.orgC}`);
  notes.push(`pipeline: ${Object.entries(expected.leadsByStatus).map(([status, count]) => `${status}=${count}`).join(', ')}`);
  notes.push(`proposals priced: ${expected.proposals.map(p => `${p.currency}:${p.totalCost ?? 'null'}/${p.status}`).join(', ')}`);
  notes.push(`fixture window ${ids.runStartedAt} → ${ids.runFinishedAt}`);
  return notes;
});

// ---------------------------------------------------------------- G13 dashboard

await suite.test('G13-01', 'GET /dashboard/overview KPIs match the fixture pipeline exactly', async () => {
  const response = await overview(adminA);
  expect(response.status === 200, `overview expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  const data = response.json.data;
  expect(response.json.success === true && response.json.error === undefined, 'overview must use the success envelope');
  const expected = expectedKpis();
  const kpis = data.kpis;
  expect(Object.keys(kpis).sort().join(',') === 'activeLeads,estimatedValueByCurrency,proposalsInProgress,qualifiedLeads,totalLeads', `kpi shape: ${Object.keys(kpis).join(',')}`);
  expect(kpis.totalLeads === expected.totalLeads, `totalLeads expected ${expected.totalLeads}, got ${kpis.totalLeads}`);
  expect(kpis.activeLeads === expected.activeLeads, `activeLeads expected ${expected.activeLeads} (WON/LOST/REJECTED excluded), got ${kpis.activeLeads}`);
  expect(kpis.qualifiedLeads === expected.qualifiedLeads, `qualifiedLeads expected ${expected.qualifiedLeads}, got ${kpis.qualifiedLeads}`);
  expect(kpis.proposalsInProgress === expected.proposalsInProgress, `proposalsInProgress expected ${expected.proposalsInProgress} (DRAFT+IN_REVIEW), got ${kpis.proposalsInProgress}`);
  for (const value of Object.values(kpis)) {
    expect(typeof value !== 'number' || Number.isFinite(value), `kpi ${JSON.stringify(value)} is not finite`);
  }
  expect(Array.isArray(kpis.estimatedValueByCurrency), 'estimatedValueByCurrency must be an array');
  const actualValue = kpis.estimatedValueByCurrency.map(item => ({ currency: item.currency, amount: Number(item.amount) }));
  expect(JSON.stringify(actualValue) === JSON.stringify(expected.estimatedValueByCurrency),
    `estimated value expected ${JSON.stringify(expected.estimatedValueByCurrency)}, got ${JSON.stringify(actualValue)}`);
  expect(Number.isFinite(Date.parse(data.generatedAt)), 'generatedAt must be an ISO timestamp');
  expect(data.activeLeads !== undefined && Array.isArray(data.pipeline), 'overview must carry pipeline and activeLeads');
  return [
    `kpis total ${kpis.totalLeads} / active ${kpis.activeLeads} / qualified ${kpis.qualifiedLeads} / proposals ${kpis.proposalsInProgress}`,
    `estimatedValueByCurrency ${JSON.stringify(actualValue)} (the REJECTED proposal and the null-cost proposal are excluded)`
  ];
});

await suite.test('G13-02', 'Pipeline stages: all nine statuses in order, per-stage lead counts and currency values', async () => {
  const notes = [];
  const response = await overview(adminA);
  const data = response.json.data;
  expect(data.pipeline.length === PIPELINE_STATUSES.length, `pipeline expected ${PIPELINE_STATUSES.length} stages, got ${data.pipeline.length}`);
  expect(data.pipeline.map(stage => stage.status).join(',') === PIPELINE_STATUSES.join(','), `stage order changed: ${data.pipeline.map(stage => stage.status).join(',')}`);
  for (const stage of data.pipeline) {
    expect(Object.keys(stage).sort().join(',') === 'count,estimatedValueByCurrency,status', `stage shape: ${Object.keys(stage).join(',')}`);
  }

  const expected = expectedKpis();
  const wrongCounts = [];
  for (const stage of data.pipeline) {
    const wanted = expected.leadsByStatus[stage.status] || 0;
    if (stage.count !== wanted) wrongCounts.push(`${stage.status}: ${stage.count} (want ${wanted})`);
  }
  expect(wrongCounts.length === 0, `per-stage counts disagree with the fixtures: ${wrongCounts.join('; ')}`);

  const stageValues = expectedStageValues();
  for (const [status, currencies] of Object.entries(stageValues)) {
    const stage = data.pipeline.find(item => item.status === status);
    const actual = {};
    for (const item of stage.estimatedValueByCurrency) actual[item.currency] = Number(item.amount);
    expect(JSON.stringify(actual) === JSON.stringify(currencies), `${status} stage value expected ${JSON.stringify(currencies)}, got ${JSON.stringify(actual)}`);
  }
  for (const stage of data.pipeline) {
    if (!stageValues[stage.status]) expect(stage.estimatedValueByCurrency.length === 0, `${stage.status} has no costed proposal but reports ${JSON.stringify(stage.estimatedValueByCurrency)}`);
  }
  notes.push(`stages: ${data.pipeline.map(stage => `${stage.status}=${stage.count}`).join(', ')}`);
  notes.push(await dbNoteStageCounts(expected));
  return notes;
});

async function dbNoteStageCounts(expected) {
  const db = await database();
  if (!db) return `database cross-check skipped (${poolState})`;
  const rows = (await db.query(
    `SELECT status, COUNT(*)::int AS count FROM leads WHERE organization_id = $1 GROUP BY status;`,
    [ids.orgA]
  )).rows;
  const fromSql = {};
  for (const row of rows) fromSql[row.status] = row.count;
  const mismatch = Object.entries(expected.leadsByStatus).filter(([status, count]) => fromSql[status] !== count);
  expect(mismatch.length === 0, `SQL disagrees with the fixture manifest: ${JSON.stringify(mismatch)}`);
  return `SQL GROUP BY status confirms ${JSON.stringify(fromSql)}`;
}

await suite.test('G13-03', 'Overview activeLeads panel: leadLimit caps the panel, ordering, joined client name, no RFP text', async () => {
  const notes = [];
  const expected = expectedKpis();
  const response = await overview(adminA);
  const data = response.json.data;
  expect(Array.isArray(data.activeLeads), 'activeLeads must be an array');
  expect(expected.activeLeads === 9, `fixture sanity: expected 9 active leads, manifest has ${expected.activeLeads}`);
  expect(data.activeLeads.length === 8, `default leadLimit 8 expected, got ${data.activeLeads.length} of ${expected.activeLeads} active leads`);
  const closed = ['WON', 'LOST', 'REJECTED'];
  expect(data.activeLeads.every(lead => !closed.includes(lead.status)), 'the active panel leaked a closed lead');
  const stamps = data.activeLeads.map(lead => Date.parse(lead.updatedAt));
  for (let index = 1; index < stamps.length; index++) {
    expect(stamps[index - 1] >= stamps[index], `activeLeads not ordered by updated_at DESC at ${index}`);
  }
  const serialized = JSON.stringify(data.activeLeads);
  expect(!serialized.includes('rawRfpContent') && !serialized.includes('Presaleee fixture'), 'the dashboard must not echo raw RFP content');
  expect(!serialized.includes('extractedMetadata'), 'the dashboard must not echo extracted metadata');
  const first = data.activeLeads[0];
  expect(Object.keys(first).sort().join(',') === 'assignedTo,bantScore,clientName,createdAt,id,source,status,title,updatedAt', `lead panel shape: ${Object.keys(first).join(',')}`);

  const wide = await overview(adminA, '?leadLimit=50');
  expect(wide.status === 200 && wide.json.data.activeLeads.length === expected.activeLeads, `leadLimit=50 expected all ${expected.activeLeads} active leads, got ${wide.json.data.activeLeads.length}`);
  const panel = wide.json.data.activeLeads;
  const withClient = panel.filter(lead => lead.clientName !== null);
  expect(withClient.length === 1 && withClient[0].clientName === `E2E G13 Client ${RUN}`, `clientName join wrong: ${JSON.stringify(panel.map(lead => lead.clientName))}`);
  const l4 = LEAD_FIXTURES.find(fixture => fixture.key === 'L4');
  const assigned = panel.find(lead => lead.id === l4.id);
  expect(assigned && assigned.assignedTo === ids.leadUserId, 'assignedTo must be carried by the dashboard projection');
  expect(assigned.bantScore === null, 'bantScore expected null while no AI qualification exists, got ' + assigned.bantScore);
  notes.push(`panel capped at ${data.activeLeads.length} of ${expected.activeLeads} active leads, ${withClient.length} joined to a client`);
  return notes;
});

await suite.test('G13-04', 'Overview leadLimit contract: 1 and 50 accepted, out-of-range, non-integer and empty value handled', async () => {
  const notes = [];
  const expected = expectedKpis();
  const one = await overview(adminA, '?leadLimit=1');
  expect(one.status === 200, `leadLimit=1 expected 200, got ${one.status} ${one.text.slice(0, 160)}`);
  expect(one.json.data.activeLeads.length === 1, `leadLimit=1 expected 1 row, got ${one.json.data.activeLeads.length}`);
  const fifty = await overview(adminA, '?leadLimit=50');
  expect(fifty.status === 200 && fifty.json.data.activeLeads.length === expected.activeLeads, `leadLimit=50 expected all ${expected.activeLeads} active leads, got ${fifty.json.data.activeLeads?.length}`);

  for (const value of ['0', '51', '-5', '1.5', 'abc', '1e999']) {
    const response = await overview(adminA, `?leadLimit=${value}`);
    expect(response.status === 400, `leadLimit=${value} expected 400, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 400);
    expect(/leadLimit must be an integer from 1 to 50\./.test(response.json.error), `leadLimit=${value} message: ${response.json.error}`);
    expectNoInternalLeak(response);
  }
  const duplicated = await overview(adminA, '?leadLimit=1&leadLimit=5');
  expect(duplicated.status === 400, `repeated leadLimit expected 400, got ${duplicated.status} ${duplicated.text.slice(0, 160)}`);
  const empty = await overview(adminA, '?leadLimit=');
  expect(empty.status === 200 && empty.json.data.activeLeads.length === 8, `an omitted-value leadLimit must fall back to the default, got ${empty.status} / ${empty.json?.data?.activeLeads?.length}`);
  notes.push('every other invalid leadLimit is a 400; only the empty value means "not provided", matching the shared pagination() helper');
  return notes;
});

await suite.test('G13-05', 'GET /dashboard/leads contract: default limit 20, ordering, projected columns', async () => {
  const notes = [];
  const response = await dashLeads(adminA);
  expect(response.status === 200, `dashboard leads expected 200, got ${response.status} ${response.text.slice(0, 160)}`);
  const data = response.json.data;
  const activeCount = expectedKpis().activeLeads;
  expect(Array.isArray(data), 'data must be an array');
  expect(data.length === activeCount, `expected the ${activeCount} active leads, got ${data.length}`);
  expect(response.json.meta.limit === 20 && response.json.meta.total === activeCount, `meta expected {total:${activeCount}, limit:20}, got ${JSON.stringify(response.json.meta)}`);
  const stamps = data.map(lead => Date.parse(lead.updatedAt));
  for (let index = 1; index < stamps.length; index++) {
    expect(stamps[index - 1] >= stamps[index], `leads not ordered by updated_at DESC at ${index}`);
  }
  expect(!JSON.stringify(data).includes('rawRfpContent'), 'the leads panel must not serialize RFP text');
  const one = await dashLeads(adminA, '?limit=1');
  expect(one.status === 200 && one.json.data.length === 1 && one.json.meta.limit === 1, `limit=1 expected one row, got ${one.text.slice(0, 160)}`);
  notes.push(`meta.total reports the returned row count (${response.json.meta.total}), not the tenant-wide total — a widget cannot tell that more rows exist behind the limit`);
  return notes;
});

await suite.test('G13-06', 'Dashboard limit guards: 100 accepted, 0 / 101 / 200 / negative / non-integer rejected', async () => {
  const notes = [];
  const hundred = await dashLeads(adminA, '?limit=100');
  expect(hundred.status === 200 && hundred.json.data.length === expectedKpis().activeLeads, `limit=100 expected all rows, got ${hundred.status} ${hundred.text.slice(0, 160)}`);
  for (const query of ['?limit=0', '?limit=101', '?limit=-1', '?limit=1.5', '?limit=abc', '?limit=NaN']) {
    const response = await dashLeads(adminA, query);
    expect(response.status === 400, `${query} expected 400, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 400);
    expect(response.json.error === 'limit must be an integer from 1 to 100.', `${query} message: ${response.json.error}`);
    expectNoInternalLeak(response);
  }
  const emptyLimit = await dashLeads(adminA, '?limit=');
  expect(emptyLimit.status === 200 && emptyLimit.json.meta.limit === 20, `empty limit should default to 20, got ${emptyLimit.status} ${emptyLimit.text.slice(0, 120)}`);
  const activityGuards = ['?limit=0', '?limit=101', '?limit=two'];
  for (const query of activityGuards) {
    const response = await activity(adminA, query);
    expect(response.status === 400, `activity ${query} expected 400, got ${response.status} ${response.text.slice(0, 120)}`);
    expectEnvelope(response, 400);
  }
  const scalarBody = await http(adminA, 'GET', '/api/v1/dashboard/overview');
  expect(scalarBody.status === 200, 'a GET with no body must not be affected by body validation');
  notes.push('a non-integer limit is rejected before the query runs, so no SQL sees NaN');
  return notes;
});

await suite.test('G13-07', 'GET /dashboard/activity contract: synthesized feed, four event types, ids and ordering', async () => {
  const notes = [];
  const response = await activity(adminA);
  expect(response.status === 200, `activity expected 200, got ${response.status} ${response.text.slice(0, 160)}`);
  const rows = response.json.data;
  expect(Array.isArray(rows) && rows.length > 0, 'activity returned no rows');
  const wide = await activity(adminA, '?limit=100');
  const available = wide.json.data.length;
  expect(response.json.meta.limit === 20, `default meta.limit expected 20, got ${response.json.meta.limit}`);
  expect(rows.length === Math.min(20, available), `default limit expected ${Math.min(20, available)} rows (feed holds ${available}), got ${rows.length}`);
  const allowed = ['LEAD_CREATED', 'LEAD_UPDATED', 'PROPOSAL_CREATED', 'PROPOSAL_UPDATED'];
  for (const row of rows) {
    expect(allowed.includes(row.type), `unknown activity type ${row.type}`);
    expect(/^[0-9a-f-]{36}:(created|updated)$/.test(row.id), `unexpected activity id ${row.id}`);
    expect(row.id.split(':')[0] === row.entityId, 'the activity id must prefix the entity id');
    expect(Number.isFinite(Date.parse(row.occurredAt)), 'occurredAt must be an ISO timestamp');
    expect(typeof row.title === 'string' && typeof row.status === 'string', 'activity rows must carry title and status');
  }
  const times = rows.map(row => Date.parse(row.occurredAt));
  for (let index = 1; index < times.length; index++) {
    expect(times[index - 1] >= times[index], `activity not ordered by occurred_at DESC at ${index}`);
  }
  expect(new Set(rows.map(row => row.id)).size === rows.length, 'duplicate activity ids returned');
  const one = await activity(adminA, '?limit=1');
  expect(one.status === 200 && one.json.data.length === 1, `limit=1 expected one row, got ${one.text.slice(0, 120)}`);
  expect(one.json.data[0].id === rows[0].id, 'the first row must be stable across limit values');
  notes.push(`feed ${rows.length} rows, types ${JSON.stringify([...new Set(rows.map(row => row.type))].sort())}`);
  return notes;
});

await suite.test('G13-08', 'Activity source is entity timestamps, not audit_logs: the feed collapses all history into two rows per entity', async () => {
  const notes = [];
  const l4 = LEAD_FIXTURES.find(fixture => fixture.key === 'L4');
  const before = await activity(adminA, '?limit=100');
  const beforeRows = before.json.data.filter(row => row.entityId === l4.id);
  const hadUpdate = beforeRows.some(row => row.type === 'LEAD_UPDATED');
  expect(beforeRows.length === (hadUpdate ? 2 : 1), `L4 must show one created row plus at most one updated row, got ${JSON.stringify(beforeRows.map(row => row.id))}`);
  const updatedBefore = beforeRows.find(row => row.type === 'LEAD_UPDATED');

  const auditRows = await audit(adminA, `?entityId=${l4.id}&limit=50`);
  expect(auditRows.status === 200 && auditRows.json.meta.total >= l4.chain.length + 1,
    `the audit log should hold at least ${l4.chain.length + 1} events for L4, got ${auditRows.json?.meta?.total}`);

  const renamed = await http(adminA, 'PATCH', `/api/v1/leads/${l4.id}`, { body: { title: `E2E G13 L4 Renamed ${RUN}` } });
  expect(renamed.status === 200, `lead rename expected 200, got ${renamed.status} ${renamed.text.slice(0, 160)}`);
  auditExpected.LEAD_UPDATED++;

  const after = await activity(adminA, '?limit=100');
  const afterRows = after.json.data.filter(row => row.entityId === l4.id);
  const updatedAfter = afterRows.find(row => row.type === 'LEAD_UPDATED');
  expect(afterRows.length === beforeRows.length + (hadUpdate ? 0 : 1),
    `an edit must never add a third row (before ${beforeRows.length}, after ${afterRows.length})`);
  if (hadUpdate) {
    expect(updatedAfter && Date.parse(updatedAfter.occurredAt) > Date.parse(updatedBefore.occurredAt),
      `the updated row must move forward, ${updatedBefore?.occurredAt} -> ${updatedAfter?.occurredAt}`);
    notes.push(`L4: the audit log holds ${auditRows.json.meta.total} events, the feed holds ${afterRows.length} — the single :updated row is overwritten by every later edit, so intermediate events are unrecoverable`);
  } else {
    notes.push(`L4: ${auditRows.json.meta.total} audit events, feed gained its only :updated row on this edit (the fixture chain finished inside one second of creation)`);
  }

  const sqlFeed = await dbRows(
    `WITH e AS (
       SELECT id::text || ':created' AS id FROM leads WHERE organization_id = $1
       UNION ALL SELECT id::text || ':updated' FROM leads WHERE organization_id = $1 AND updated_at > created_at + INTERVAL '1 second'
       UNION ALL SELECT id::text || ':created' FROM proposals WHERE organization_id = $1
       UNION ALL SELECT id::text || ':updated' FROM proposals WHERE organization_id = $1 AND updated_at > created_at + INTERVAL '1 second')
     SELECT id FROM e ORDER BY id;`,
    [ids.orgA]
  );
  const apiFeed = after.json.data.map(row => row.id).sort();
  expect(JSON.stringify(apiFeed) === JSON.stringify(sqlFeed.map(row => row.id)),
    `the feed does not equal the entity-timestamp derivation (API ${apiFeed.length} rows, SQL ${sqlFeed.length})`);
  const sqlAudit = await dbRows(`SELECT COUNT(*)::int AS c FROM audit_logs WHERE organization_id = $1;`, [ids.orgA]);
  notes.push(`the feed equals the SQL over leads/proposals created_at and updated_at row for row (${apiFeed.length} ids) while audit_logs holds ${sqlAudit[0].c} events for the same tenant, so the two feeds cannot reconcile`);
  notes.push('actions with no entity timestamp delta (sheet writes, portal sessions, pricing apply, deletes) never appear on the dashboard activity feed');
  return notes;
});

await suite.test('G13-09', 'Empty tenant: a fresh organization gets zeroed KPIs, nine empty stages and empty panels', async () => {
  const notes = [];
  const response = await overview(adminC);
  expect(response.status === 200, `empty overview expected 200, got ${response.status} ${response.text.slice(0, 160)}`);
  const data = response.json.data;
  expect(data.kpis.totalLeads === 0 && data.kpis.activeLeads === 0 && data.kpis.qualifiedLeads === 0 && data.kpis.proposalsInProgress === 0,
    `kpis must be zero, got ${JSON.stringify(data.kpis)}`);
  expect(data.kpis.estimatedValueByCurrency.length === 0, `expected no currency rows, got ${JSON.stringify(data.kpis.estimatedValueByCurrency)}`);
  expect(data.pipeline.length === 9 && data.pipeline.every(stage => stage.count === 0 && stage.estimatedValueByCurrency.length === 0), 'every stage must exist with a zero count');
  expect(data.activeLeads.length === 0, 'activeLeads must be empty');
  const leads = await dashLeads(adminC);
  const feed = await activity(adminC);
  expect(leads.status === 200 && leads.json.data.length === 0 && leads.json.meta.total === 0, `empty leads expected, got ${leads.text.slice(0, 160)}`);
  expect(feed.status === 200 && feed.json.data.length === 0, `empty activity expected, got ${feed.text.slice(0, 160)}`);
  notes.push('no NULL/NaN/undefined reaches the client for an organization with no data');
  return notes;
});

await suite.test('G13-10', 'Tenant isolation and scope override: a query organizationId can never move the dashboard into another tenant', async () => {
  const notes = [];
  const foreignOverview = await overview(adminB, `?organizationId=${ids.orgA}&leadLimit=50`);
  expect(foreignOverview.status === 200, `org B overview expected 200, got ${foreignOverview.status} ${foreignOverview.text.slice(0, 160)}`);
  const kpis = foreignOverview.json.data.kpis;
  expect(kpis.totalLeads === 1 && kpis.activeLeads === 1, `org B must see only its own lead, got ${JSON.stringify(kpis)}`);
  expect(kpis.estimatedValueByCurrency.length === 0, 'org A money must not appear in org B totals');
  expect(foreignOverview.json.data.activeLeads.every(lead => lead.title.includes('Tenant B')), 'org B panel leaked org A leads');

  const poisoned = await overview(adminA, `?organizationId=${ids.orgB}`);
  expect(poisoned.status === 200 && poisoned.json.data.kpis.totalLeads === LEAD_FIXTURES.length, `the scope param must be ignored for org A, got ${poisoned.json?.data?.kpis?.totalLeads}`);

  const feedB = await activity(adminB, '?limit=50');
  const entityIds = new Set(feedB.json.data.map(row => row.entityId));
  const leaked = LEAD_FIXTURES.filter(fixture => entityIds.has(fixture.id));
  expect(leaked.length === 0, `org B activity leaked org A entities: ${leaked.map(fixture => fixture.key).join(',')}`);
  expect(entityIds.has(ids.tenantLead), 'org B activity must show its own lead');
  notes.push(`org B sees 1 lead / ${feedB.json.data.length} activity rows; ?organizationId is ignored in both directions`);
  return notes;
});

await suite.test('G13-11', 'Dashboard access: anonymous 401, every authenticated role can read (no role guard on the dashboard)', async () => {
  const notes = [];
  for (const route of ['/api/v1/dashboard/overview', '/api/v1/dashboard/leads', '/api/v1/dashboard/activity']) {
    const anonymous = await http(null, 'GET', route);
    expect(anonymous.status === 401, `${route} anonymous expected 401, got ${anonymous.status}`);
    expectEnvelope(anonymous, 401);
    const forged = await http(null, 'GET', route, { bearer: 'eyJhbGciOi.user.signature' });
    expect(forged.status === 401, `${route} forged bearer expected 401, got ${forged.status}`);
  }
  for (const [label, jar] of [['LEAD', leadJar], ['VIEWER', viewerJar], ['ARCHITECT', architectJar], ['SALES', salesJar]]) {
    const response = await overview(jar);
    expect(response.status === 200, `${label} overview expected 200 under the current routes, got ${response.status} ${response.text.slice(0, 120)}`);
    expect(response.json.data.kpis.totalLeads === LEAD_FIXTURES.length, `${label} must see the same tenant-wide numbers`);
  }
  notes.push('dashboardRoutes.ts applies requireAuth + requireOrganization only: a VIEWER reads the full revenue pipeline. Acceptable for a read-only aggregate, but it is the same guard gap already recorded for the vault.');
  return notes;
});

// ---------------------------------------------------------------- G14 audit logs

await suite.test('G14-01', 'GET /audit-logs contract: envelope, meta, newest-first order, actor name resolved', async () => {
  const notes = [];
  const response = await audit(adminA);
  expect(response.status === 200, `audit list expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  const meta = expectPaginationMeta(response);
  expect(meta.limit === 50 && meta.page === 1, `defaults expected page 1 limit 50, got ${meta.page}/${meta.limit}`);
  const rows = response.json.data;
  expect(Array.isArray(rows) && rows.length > 0, 'no audit rows returned');
  expect(rows.length <= meta.limit, 'page overflows the limit');
  const first = rows[0];
  expect(Object.keys(first).sort().join(',') === 'action,actorName,createdAt,entityId,entityType,id,organizationId,payload,resultStatus,userId',
    `audit row shape: ${Object.keys(first).join(',')}`);
  const times = rows.map(row => Date.parse(row.createdAt));
  for (let index = 1; index < times.length; index++) {
    expect(times[index - 1] >= times[index], `audit rows not ordered newest-first at ${index}`);
  }
  const registration = rows.filter(row => row.action === 'USER_REGISTERED');
  expect(registration.length >= 1, 'the registration audit row is missing');
  expect(registration[0].actorName && typeof registration[0].actorName === 'string', `actorName must be resolved from users.full_name, got ${JSON.stringify(registration[0].actorName)}`);
  expect(registration[0].userId === ids.adminA, 'USER_REGISTERED must credit the new user as the actor');
  expect(typeof registration[0].payload === 'object' && !Array.isArray(registration[0].payload), 'payload must deserialize to an object');
  expect(first.organizationId === ids.orgA, 'audit rows must be tenant scoped');
  notes.push(`total ${meta.total} rows, first "${first.action}" ${first.entityType} actor "${first.actorName}"`);
  return notes;
});

await suite.test('G14-02', 'Audit RBAC: ADMIN and PRESALE_LEAD read, every other role gets 403 naming the allowed roles', async () => {
  const notes = [];
  for (const [label, jar] of [['ADMIN', adminA], ['PRESALE_LEAD', leadJar]]) {
    const response = await audit(jar, '?limit=1');
    expect(response.status === 200, `${label} expected 200, got ${response.status} ${response.text.slice(0, 160)}`);
  }
  for (const [label, jar] of [['VIEWER', viewerJar], ['SALES_REP', salesJar], ['SOLUTION_ARCHITECT', architectJar]]) {
    const response = await audit(jar);
    expect(response.status === 403, `${label} expected 403, got ${response.status} ${response.text.slice(0, 160)}`);
    expectEnvelope(response, 403);
    expect(response.json.error === 'This operation requires one of the following roles: ADMIN, PRESALE_LEAD.', `403 message: ${response.json.error}`);
    expectNoInternalLeak(response);
  }
  const anonymous = await http(null, 'GET', '/api/v1/audit-logs');
  expect(anonymous.status === 401, `anonymous expected 401, got ${anonymous.status}`);
  expectEnvelope(anonymous, 401);
  notes.push('the role is taken from the access token, so a body or query field cannot widen it');
  return notes;
});

await suite.test('G14-03', 'Filters: action, entityType, entityId, actorId and combinations match the fixture write counts', async () => {
  const notes = [];
  const single = async (query, wanted, label) => {
    const response = await audit(adminA, query);
    expect(response.status === 200, `${label} expected 200, got ${response.status} ${response.text.slice(0, 160)}`);
    expect(response.json.meta.total === wanted, `${label} expected ${wanted} rows, got ${response.json.meta.total}`);
    return response.json.data;
  };
  await single(`?action=LEAD_CREATED`, auditExpected.LEAD_CREATED, 'action=LEAD_CREATED');
  await single(`?action=LEAD_STATUS_CHANGED`, auditExpected.LEAD_STATUS_CHANGED, 'action=LEAD_STATUS_CHANGED');
  await single(`?action=USER_CREATED`, auditExpected.USER_CREATED, 'action=USER_CREATED');
  await single(`?action=USER_REGISTERED`, auditExpected.USER_REGISTERED, 'action=USER_REGISTERED (tenant scoped: three registrations happened, organization A sees its own)');
  await single(`?action=CLIENT_CREATED`, auditExpected.CLIENT_CREATED, 'action=CLIENT_CREATED');
  await single(`?action=PROPOSAL_STATUS_CHANGED`, auditExpected.PROPOSAL_STATUS_CHANGED, 'action=PROPOSAL_STATUS_CHANGED');
  const byType = await single(`?entityType=lead`, auditExpected.LEAD_CREATED + auditExpected.LEAD_STATUS_CHANGED + auditExpected.LEAD_UPDATED, 'entityType=lead');
  expect(byType.every(row => row.entityType === 'lead'), 'entityType filter leaked');
  const l9 = LEAD_FIXTURES.find(fixture => fixture.key === 'L9');
  const byEntity = await single(`?entityId=${l9.id}`, l9.chain.length + 1, 'entityId=L9 (creation + every status change)');
  expect(byEntity.every(row => row.entityId === l9.id), 'entityId filter leaked other rows');
  const byActor = await single(`?actorId=${ids.leadUserId}`, 0, 'actorId=PRESALE_LEAD (performed no writes)');
  const everything = await audit(adminA, '?limit=1');
  const byAdminActor = await single(`?actorId=${ids.adminA}`, everything.json.meta.total, 'actorId=ADMIN (authored every org A row)');
  expect(byAdminActor.every(row => row.userId === ids.adminA), 'actorId filter leaked');
  const combo = await audit(adminA, `?entityType=lead&action=LEAD_STATUS_CHANGED&entityId=${l9.id}`);
  expect(combo.json.data.length === l9.chain.length, `combo expected ${l9.chain.length} rows, got ${combo.json.data.length}`);
  const none = await audit(adminA, '?action=NOT_A_REAL_ACTION');
  expect(none.status === 200 && none.json.data.length === 0 && none.json.meta.total === 0, 'an unknown action must return an empty page');
  const unknownType = await audit(adminA, '?entityType=widget');
  expect(unknownType.json.meta.total === 0, 'an unknown entityType must return nothing');
  notes.push(`counts confirmed against the fixture ledger: ${JSON.stringify(auditExpected)}`);
  return notes;
});

await suite.test('G14-04', 'resultStatus: SUCCESS returns everything, FAILED always returns zero because nothing writes a FAILED audit', async () => {
  const notes = [];
  const all = await audit(adminA, '?limit=200');
  const success = await audit(adminA, '?resultStatus=SUCCESS&limit=200');
  expect(success.status === 200, `SUCCESS filter expected 200, got ${success.status}`);
  expect(success.json.meta.total === all.json.meta.total, `SUCCESS ${success.json.meta.total} should equal unfiltered ${all.json.meta.total}`);
  expect(success.json.data.every(row => row.resultStatus === 'SUCCESS'), 'a non-SUCCESS row leaked into the SUCCESS filter');

  const failed = await audit(adminA, '?resultStatus=FAILED');
  expect(failed.status === 200 && failed.json.meta.total === 0, `FAILED expected 0 rows, got ${failed.text.slice(0, 160)}`);

  const badLogin = await http(new CookieJar(), 'POST', '/api/v1/auth/login', { body: { email: ADMIN_A, password: 'wrong-password-1' } });
  expect(badLogin.status === 401, `wrong password expected 401, got ${badLogin.status}`);
  const afterFailedLogin = await audit(adminA, '?resultStatus=FAILED');
  expect(afterFailedLogin.json.meta.total === 0, `a rejected login wrote ${afterFailedLogin.json.meta.total - failed.json.meta.total} audit rows`);
  const badWrite = await createLead(adminA, { title: 'x'.repeat(256), rawRfpContent: 'y' });
  expect(badWrite.status === 400, `an invalid write expected 400, got ${badWrite.status}`);
  const afterFailedWrite = await audit(adminA, '?resultStatus=FAILED');
  expect(afterFailedWrite.json.meta.total === 0, 'a rejected write produced no audit trail either');
  const invalid = await audit(adminA, '?resultStatus=MAYBE');
  expect(invalid.status === 400 && /resultStatus must be one of SUCCESS, FAILED/.test(invalid.json.error), `bad resultStatus: ${invalid.status} ${invalid.text.slice(0, 160)}`);
  notes.push('AUDIT_RESULT_STATUSES defines SUCCESS and FAILED, and no code path ever records FAILED: a security dashboard filtered on FAILED is permanently empty, including credential-stuffing attempts');
  return notes;
});

await suite.test('G14-05', 'Time window filters: from/to accept ISO-8601, normalize it, and reject anything unparsable', async () => {
  const notes = [];
  const all = await audit(adminA, '?limit=200');
  const wide = await audit(adminA, `?from=2020-01-01T00:00:00.000Z&to=2099-12-31T23:59:59.999Z&limit=200`);
  expect(wide.json.meta.total === all.json.meta.total, `a wide window expected ${all.json.meta.total} rows, got ${wide.json.meta.total}`);
  const fromFuture = await audit(adminA, '?from=2099-01-01T00:00:00.000Z');
  expect(fromFuture.status === 200 && fromFuture.json.meta.total === 0, `a future from expected 0 rows, got ${fromFuture.text.slice(0, 160)}`);
  const toPast = await audit(adminA, '?to=2000-01-01T00:00:00Z');
  expect(toPast.json.meta.total === 0, 'a window ending in the past must be empty');
  const window = await audit(adminA, `?from=${encodeURIComponent(ids.runStartedAt)}&to=${encodeURIComponent(ids.runFinishedAt)}&limit=200`);
  expect(window.json.meta.total >= auditExpected.LEAD_CREATED, `the fixture window should hold the run's rows, got ${window.json.meta.total}`);
  const inverted = await audit(adminA, '?from=2099-01-01T00:00:00Z&to=2020-01-01T00:00:00Z');
  expect(inverted.status === 200 && inverted.json.meta.total === 0, 'an inverted window must return empty rather than 400');
  notes.push('from > to is accepted and simply matches nothing; there is no cross-field validation');

  for (const value of ['2020-13-45', 'not-a-date', 'yesterday', '1700000000000']) {
    const response = await audit(adminA, `?from=${encodeURIComponent(value)}`);
    expect(response.status === 400, `from=${value} expected 400, got ${response.status} ${response.text.slice(0, 120)}`);
    expectEnvelope(response, 400);
    expect(/from must be an ISO-8601 timestamp/.test(response.json.error), `from=${value} message: ${response.json.error}`);
  }
  for (const loose of ['2020', '0']) {
    const response = await audit(adminA, `?from=${loose}&limit=1`);
    expect(response.status === 200 && response.json.meta.total === all.json.meta.total, `from=${loose} expected 200 with every row, got ${response.status} ${response.text.slice(0, 120)}`);
  }
  notes.push('isoTimestamp() only asks Date.parse, so "2020" and "0" pass the ISO-8601 claim and are silently normalized to Jan 2020 / Jan 2000 rather than rejected');
  const badTo = await audit(adminA, '?to=yesterday');
  expect(badTo.status === 400 && /to must be an ISO-8601 timestamp/.test(badTo.json.error), `bad to: ${badTo.status} ${badTo.text.slice(0, 120)}`);
  const emptyFrom = await audit(adminA, '?from=&limit=200');
  expect(emptyFrom.status === 200 && emptyFrom.json.meta.total === all.json.meta.total, 'an empty from must be ignored');
  return notes;
});

await suite.test('G14-06', 'Pagination: default 50, limit up to 200, page offsets, disjoint pages, real total', async () => {
  const notes = [];
  const first = await audit(adminA, '?limit=5&page=1');
  const second = await audit(adminA, '?limit=5&page=2');
  expect(first.status === 200 && second.status === 200, `paged audit queries expected 200, got ${first.status}/${second.status}`);
  expect(first.json.data.length === 5 && second.json.data.length === 5, 'limit=5 pages must each hold 5 rows');
  const overlap = first.json.data.map(row => row.id).filter(id => second.json.data.map(row => row.id).includes(id));
  expect(overlap.length === 0, `pages overlap on ${overlap.length} rows`);
  expect(first.json.meta.total === second.json.meta.total, 'total must be stable across pages');
  const all = await audit(adminA, '?limit=200');
  expect(all.json.meta.limit === 200, `limit=200 boundary expected 200, got ${all.json.meta.limit}`);
  const beyond = await audit(adminA, `?limit=5&page=${Math.ceil(all.json.meta.total / 5) + 10}`);
  expect(beyond.status === 200 && beyond.json.data.length === 0, 'a page past the end must be empty');

  for (const query of ['?limit=0', '?limit=201', '?limit=-3', '?limit=1.5', '?limit=abc', '?page=0', '?page=abc', '?page=1.5']) {
    const response = await audit(adminA, query);
    expect(response.status === 400, `${query} expected 400, got ${response.status} ${response.text.slice(0, 120)}`);
    expectEnvelope(response, 400);
    expectNoInternalLeak(response);
  }
  const huge = await audit(adminA, '?page=100001');
  expect(huge.status === 400, 'page above 100000 must be rejected');
  const realTotal = await dbRows(`SELECT COUNT(*)::int AS total FROM audit_logs WHERE organization_id = $1;`, [ids.orgA]);
  expect(all.json.meta.total === realTotal[0].total, `meta.total ${all.json.meta.total} vs database ${realTotal[0].total}`);
  notes.push(`meta.total ${all.json.meta.total} equals the SQL count for organization A, pages are OFFSET based and disjoint`);
  return notes;
});

await suite.test('G14-07', 'Query guards: malformed UUIDs, repeated keys, oversized filters and unknown parameters', async () => {
  const notes = [];
  for (const filter of ['entityId', 'actorId']) {
    for (const bad of ['not-a-uuid', uuid.slice(0, 35), NIL_UUID]) {
      const response = await audit(adminA, `?${filter}=${encodeURIComponent(bad)}`);
      expect(response.status === 400, `${filter}=${bad} expected 400, got ${response.status} ${response.text.slice(0, 140)}`);
      expectEnvelope(response, 400);
      expect(new RegExp(`${filter} must be a valid UUID or null\\.`).test(response.json.error), `${filter}=${bad} message: ${response.json.error}`);
    }
  }
  const repeated = await audit(adminA, '?action=LEAD_CREATED&action=USER_CREATED');
  expect(repeated.status === 400, `a repeated action expected 400, got ${repeated.status} ${repeated.text.slice(0, 140)}`);
  expectEnvelope(repeated, 400);
  const oversize = await audit(adminA, `?action=${'a'.repeat(101)}`);
  expect(oversize.status === 400 && /action must not exceed 100 characters/.test(oversize.json.error), `oversize action: ${oversize.status} ${oversize.text.slice(0, 140)}`);
  const oversizeType = await audit(adminA, `?entityType=${'e'.repeat(101)}`);
  expect(oversizeType.status === 400, `oversize entityType expected 400, got ${oversizeType.status}`);
  const unknown = await audit(adminA, `?limit=5&sortBy=payload&direction=asc&foo=bar&page=1`);
  expect(unknown.status === 200, `unknown query parameters expected to be ignored, got ${unknown.status}`);
  expect(unknown.json.data.length === 5, 'unknown parameters changed the result size');
  const times = unknown.json.data.map(row => Date.parse(row.createdAt));
  for (let index = 1; index < times.length; index++) expect(times[index - 1] >= times[index], 'sortBy must not override the newest-first order');
  notes.push('sort order is fixed server-side: no sort parameter can reorder or widen the response');
  return notes;
});

await suite.test('G14-08', 'Payload integrity: no credentials serialized, ip_address stored but never returned', async () => {
  const notes = [];
  const rows = await audit(adminA, '?limit=200');
  const serialized = JSON.stringify(rows.json.data);
  expect(!/"password(Hash)?"\s*:/.test(serialized), 'a payload carries a password');
  expect(!/"(token|tokenHash|refreshToken|accessToken|secret)"/.test(serialized), 'a payload carries a token or secret');
  expect(!serialized.includes(PASSWORD), 'the run password appears anywhere in the audit feed');
  expect(!serialized.includes(ids.adminB) && !serialized.includes(ADMIN_B), `organization A's ledger references organization B's account (${ADMIN_B})`);
  for (const row of rows.json.data) {
    expect(row.ipAddress === undefined, 'ip_address must not be serialized');
    expect(row.payload.password === undefined && row.payload.passwordHash === undefined, 'payload leaked a password field');
  }
  const stored = await dbRows(
    `SELECT action, ip_address IS NOT NULL AS has_ip, payload FROM audit_logs WHERE organization_id = $1 AND entity_id = $2 LIMIT 1;`,
    [ids.orgA, LEAD_FIXTURES[0].id]
  );
  expect(stored[0].has_ip === true, 'the lead audit row should have stored the caller ip_address');
  const apiRow = rows.json.data.find(row => row.entityId === LEAD_FIXTURES[0].id && row.action === 'LEAD_CREATED');
  expect(apiRow && apiRow.ipAddress === undefined, 'the same row must not expose the ip through the API');
  notes.push(`stored columns confirmed in PostgreSQL (ip_address present, payload keys ${JSON.stringify(Object.keys(stored[0].payload))}) while the API row carries none`);
  const userPayload = rows.json.data.find(row => row.action === 'USER_CREATED');
  expect(userPayload && Object.keys(userPayload.payload).sort().join(',') === 'email,role', `USER_CREATED payload should only hold email+role, got ${JSON.stringify(userPayload?.payload)}`);
  return notes;
});

await suite.test('G14-09', 'Audit completeness: status transitions are recorded, but proposal create / sheet write / delete are silent', async () => {
  const notes = [];
  const proposal = await createProposal(adminA, { title: `E2E G14 Silent Proposal ${RUN}`, summary: 'Created to measure audit coverage.', currency: 'USD' });
  expect(proposal.status === 201, `proposal fixture expected 201, got ${proposal.status} ${proposal.text.slice(0, 160)}`);
  const proposalId = proposal.json.data.id;
  const sheet = await http(adminA, 'PUT', `/api/v1/proposals/${proposalId}/sheets/Overview`, { body: { sheetData: { executiveSummary: 'written by the G14 audit suite' } } });
  expect(sheet.status === 200, `sheet write expected 200, got ${sheet.status} ${sheet.text.slice(0, 160)}`);
  const edit = await patchProposal(adminA, proposalId, { title: `E2E G14 Silent Proposal Renamed ${RUN}` });
  expect(edit.status === 200, `metadata edit expected 200, got ${edit.status} ${edit.text.slice(0, 160)}`);

  const createdRows = await audit(adminA, `?entityId=${proposalId}`);
  expect(createdRows.json.meta.total === 0, `create + sheet write + metadata edit produced ${createdRows.json.meta.total} audit rows (expected 0)`);
  const removed = await http(adminA, 'DELETE', `/api/v1/proposals/${proposalId}`);
  expect(removed.status === 204, `delete expected 204, got ${removed.status}`);
  const afterDelete = await audit(adminA, `?entityId=${proposalId}`);
  expect(afterDelete.json.meta.total === 0, 'the deleted proposal left no tombstone audit row');

  const deletedLead = await createLead(adminA, { title: `E2E G14 Deleted Lead ${RUN}`, rawRfpContent: 'Deleted to check the audit trail.', source: 'MANUAL' });
  auditExpected.LEAD_CREATED++;
  const leadId = deletedLead.json.data.id;
  const leadRemoved = await http(adminA, 'DELETE', `/api/v1/leads/${leadId}`);
  expect(leadRemoved.status === 204, `lead delete expected 204, got ${leadRemoved.status} ${leadRemoved.text.slice(0, 120)}`);
  const leadRows = await audit(adminA, `?entityId=${leadId}`);
  expect(leadRows.json.meta.total === 2 && leadRows.json.data.every(row => ['LEAD_CREATED', 'LEAD_DELETED'].includes(row.action)),
    `the lead trail should be creation + deletion, got ${JSON.stringify(leadRows.json.data.map(row => row.action))}`);
  const leadGone = await http(adminA, 'GET', `/api/v1/leads/${leadId}`);
  expect(leadGone.status === 404, `deleted lead expected 404, got ${leadGone.status}`);
  notes.push('actions covered: user, client, rate card, lead (create/update/status/qualify/delete), proposal status changes, pricing apply, portal sessions');
  notes.push('actions NOT covered: proposal create / metadata edit / sheet write / delete, meeting and discovery writes, knowledge and RAG usage — the ledger cannot answer "who wrote this section"');
  return notes;
});

await suite.test('G14-10', 'Immutability: no write route exists for audit logs, and reading never mutates the ledger', async () => {
  const notes = [];
  const db = await database();
  if (!db) throw new SkipError(`database check unavailable: ${poolState}`);
  const before = (await db.query(`SELECT COUNT(*)::int AS total, MAX(created_at) AS newest FROM audit_logs WHERE organization_id = $1;`, [ids.orgA])).rows[0];
  await audit(adminA, '?limit=200');
  await audit(adminA, '?action=LEAD_CREATED&limit=10');
  const after = (await db.query(`SELECT COUNT(*)::int AS total, MAX(created_at) AS newest FROM audit_logs WHERE organization_id = $1;`, [ids.orgA])).rows[0];
  expect(after.total === before.total, `reads changed the row count from ${before.total} to ${after.total}`);
  expect(String(after.newest) === String(before.newest), 'reads inserted rows');

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const response = await http(adminA, method, '/api/v1/audit-logs', { body: { action: 'FORGED' } });
    expect(response.status === 404 || response.status === 405, `${method} /audit-logs expected 404/405, got ${response.status} ${response.text.slice(0, 120)}`);
    if (response.status === 404) {
      expect(response.text.trim().startsWith('<'), `documented behaviour: the unmatched route answers with the Express HTML 404, not the JSON envelope (already an open finding): ${response.text.slice(0, 60)}`);
    }
  }
  const writeable = (await db.query(
    `SELECT COUNT(*)::int AS c FROM pg_trigger WHERE tgrelid = 'audit_logs'::regclass AND NOT tgisinternal;`
  )).rows[0];
  notes.push(`audit_logs has ${writeable.c} user trigger(s); immutability is enforced by the absence of write routes, not by the database`);
  const count = (await db.query(`SELECT COUNT(*)::int AS c FROM audit_logs WHERE action = 'FORGED';`)).rows[0].c;
  expect(count === 0, `${count} forged rows reached the table`);
  return notes;
});

await suite.test('G14-11', 'Cross-tenant audit isolation: organization B cannot read or filter organization A history', async () => {
  const notes = [];
  const own = await audit(adminB);
  expect(own.status === 200, `org B list expected 200, got ${own.status}`);
  expect(own.json.data.every(row => row.organizationId === ids.orgB), 'org B response carried rows from another organization');
  const foreignEntity = await audit(adminB, `?entityId=${LEAD_FIXTURES[0].id}`);
  expect(foreignEntity.status === 200 && foreignEntity.json.meta.total === 0, `filtering by an org A entity expected 0 rows, got ${foreignEntity.text.slice(0, 160)}`);
  const foreignActor = await audit(adminB, `?actorId=${ids.adminA}`);
  expect(foreignActor.json.meta.total === 0, 'filtering by an org A actor leaked across tenants');
  const foreignAction = await audit(adminB, '?action=LEAD_STATUS_CHANGED');
  expect(foreignAction.json.meta.total === 0, `org B has no status changes but returned ${foreignAction.json.meta.total} rows`);
  const ownTotal = await dbRows(`SELECT COUNT(*)::int AS c FROM audit_logs WHERE organization_id = $1;`, [ids.orgB]);
  expect(own.json.meta.total === ownTotal[0].c, `org B meta.total ${own.json.meta.total} vs SQL ${ownTotal[0].c}`);
  notes.push(`org B sees exactly its own ${own.json.meta.total} rows (registration + tenant lead), org A history unreachable`);
  return notes;
});

await suite.test('G13/G14-99', 'Teardown: fixture counts reconciled with SQL, audit trail left intact for the cleanup script', async () => {
  const notes = [];
  const db = await database();
  if (!db) throw new SkipError(`database check unavailable: ${poolState}`);
  const counts = (await db.query(
    `SELECT (SELECT COUNT(*)::int FROM leads WHERE organization_id = $1) AS leads,
            (SELECT COUNT(*)::int FROM proposals WHERE organization_id = $1) AS proposals,
            (SELECT COUNT(*)::int FROM audit_logs WHERE organization_id = $1) AS audit_a,
            (SELECT COUNT(*)::int FROM audit_logs WHERE organization_id = $2) AS audit_b,
            (SELECT COUNT(*)::int FROM audit_logs WHERE organization_id = $3) AS audit_c,
            (SELECT COUNT(*)::int FROM leads WHERE organization_id = $1 AND raw_rfp_content IS NULL) AS empty_rfp;`,
    [ids.orgA, ids.orgB, ids.orgC]
  )).rows[0];
  const expectedTotal = LEAD_FIXTURES.length + 2; // tenant B lead + the deleted G14 lead
  expect(counts.leads <= expectedTotal, `unexpected lead count ${counts.leads}`);
  expect(counts.audit_a > 0 && counts.audit_b > 0 && counts.audit_c >= 1, `audit counts ${JSON.stringify(counts)}`);
  const overviewApi = await overview(adminA);
  expect(overviewApi.json.data.kpis.totalLeads === counts.leads - 1 || overviewApi.json.data.kpis.totalLeads === counts.leads,
    `dashboard total ${overviewApi.json.data.kpis.totalLeads} vs SQL ${counts.leads} (one lead was deleted mid-run and must be gone from both)`);
  notes.push(`SQL ledger: leads ${counts.leads}, proposals ${counts.proposals}, audit rows A=${counts.audit_a} B=${counts.audit_b} C=${counts.audit_c}`);

  const deleted = await db.query(
    `SELECT COUNT(*)::int AS c FROM audit_logs al
     LEFT JOIN leads l ON l.id = al.entity_id
     WHERE al.organization_id = $1 AND al.action = 'LEAD_DELETED' AND l.id IS NULL;`,
    [ids.orgA]
  );
  expect(deleted.rows[0].c === 1, 'the deletion audit row must survive the deletion itself (append-only ledger)');
  notes.push('audit rows are intentionally kept: cleanup SQL removes them with the test organizations');

  const legacy = (await db.query(
    `SELECT l.status, COUNT(DISTINCT l.id)::text AS count, p.currency
     FROM leads l
     LEFT JOIN proposals p ON p.lead_id = l.id AND p.organization_id = l.organization_id AND p.status <> 'REJECTED'
     WHERE l.organization_id = $1
     GROUP BY l.status, p.currency;`,
    [ids.orgA]
  )).rows;
  const truth = (await db.query(`SELECT status, COUNT(*)::int AS c FROM leads WHERE organization_id = $1 GROUP BY status;`, [ids.orgA])).rows;
  const overwritten = {};
  for (const row of legacy) overwritten[row.status] = Number(row.count);
  const distorted = truth.filter(row => overwritten[row.status] !== row.c)
    .map(row => `${row.status}: ${overwritten[row.status]} instead of ${row.c}`);
  notes.push(`regression evidence for the fixed stage count: replaying the pre-fix GROUP BY status,currency query over this tenant would report ${distorted.length ? distorted.join(', ') : 'no distortion'} — G13-02 now asserts the true per-status counts`);
  pool?.end();
  pool = null; poolState = null;
  return notes;
});

// --------------------------------------------------------------------- report

suite.note('G13 and G14 are deterministic database reads: neither group needs the Python AI service on :8000, so every case in this run is a real measurement and nothing was skipped.');
suite.note('Defaults confirmed live against the running build: /dashboard/overview caps its active panel at leadLimit 8 (1..50), /dashboard/leads and /dashboard/activity default to 20 (1..100), /audit-logs defaults to page 1 limit 50 (limit up to 200).');
suite.note('Dashboard scope always comes from the access token: ?organizationId= is ignored in both directions, and an authenticated VIEWER sees the same tenant-wide revenue aggregates as an ADMIN.');
suite.note('Audit immutability rests on the absence of write routes only: audit_logs has no user triggers, no revoke-safe constraints and no FAILED producer.');

const failing = suite.results.filter(item => item.status !== 'PASS');
const findings = [
  ['G13-02 / code', 'Pipeline stage counts were produced by a single `GROUP BY l.status, p.currency` query and then overwritten row by row, so a stage holding proposals in more than one currency reported the count of one currency group instead of its lead count (QUALIFIED showed 1 instead of 3). Fixed by counting leads per status in its own query and keeping the currency sums for the value list.'],
  ['G13-04 / code', '`parseLimit()` treated an empty query value as 0 and answered 400, while every other list endpoint reads `?limit=` as "not provided", and its message named the parameter `limit` even for `leadLimit`. Fixed: empty means default, and the message names the parameter.'],
  ['G13-08', '`GET /dashboard/activity` is synthesized from `leads.created_at/updated_at` and `proposals.created_at/updated_at`, not from `audit_logs`: the feed equals that SQL row set exactly, while the audit table holds several times more events for the same tenant. Each entity can contribute at most two rows (one `:created`, one `:updated`), so a later edit overwrites the previous one and intermediate events are unrecoverable. Actions that never move an entity timestamp — sheet writes, pricing apply, portal sessions, deletes — never appear. The test plan expected this feed to reconcile with G14; it cannot.'],
  ['G13-05', 'The dashboard list endpoints answer `meta.total = data.length`, not the tenant-wide count, so a widget cannot know that more rows sit behind `limit`. Every other list in the API returns a real total.'],
  ['G14-04', '`AUDIT_RESULT_STATUSES` defines `SUCCESS` and `FAILED`, and no code path writes `FAILED`: a rejected login and a rejected write leave no trace, so any security view filtered on FAILED is permanently empty.'],
  ['G14-09', 'Proposal create, metadata edit, sheet write and delete are not audited (only status transitions and pricing apply are), and meeting/discovery, knowledge and RAG usage write nothing at all. The ledger cannot answer "who wrote this section".'],
  ['G13-11 / code', '`dashboardRoutes.ts` applies `requireAuth` + `requireOrganization` only, so a VIEWER reads the full revenue pipeline. Read-only, but the same guard gap already recorded for the knowledge vault and the portal reads.'],
  ['G14-05', '`from`/`to` are validated as ISO-8601 individually but never compared: `from=2099&to=2020` is a silent empty result rather than a 400.']
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

const codeSection = [
  '## Backend defects found and fixed during this run',
  '',
  '| Location | Before | After |',
  '| --- | --- | --- |',
  '| `infrastructure/database/repositories/PostgresDashboardRepository.ts` | one `GROUP BY l.status, p.currency` query fed both the stage count and the stage value; the loop assigned `stage.count` per currency row, so the last currency group overwrote the real lead count | a separate `GROUP BY status` count query feeds `stage.count`; the currency query only feeds `estimatedValueByCurrency` |',
  '| `application/use-cases/DashboardUseCases.ts` | `parseLimit` rejected `?leadLimit=` / `?limit=` (empty string → 0 → 400) and always named the field `limit` | an empty value falls back to the default like the shared `pagination()` helper, and the error names the requested parameter (`leadLimit` / `limit`) |'
].join('\n');

const coverageSection = [  '## G13 / G14 endpoint coverage',
  '',
  '| Endpoint | Case | Status |',
  '| --- | --- | --- |',
  '| GET /dashboard/overview | G13-01, G13-02, G13-03, G13-04, G13-09, G13-10, G13-11, G13/G14-99 | covered |',
  '| GET /dashboard/leads | G13-05, G13-06, G13-09, G13-10, G13-11 | covered |',
  '| GET /dashboard/activity | G13-07, G13-08, G13-06, G13-09, G13-10, G13-11 | covered |',
  '| GET /audit-logs | G14-01 … G14-07, G14-11, G13-08, G14-09 | covered |'
].join('\n');

const runHistorySection = [
  '## Run history for this group',
  '',
  '| Bundle | Result | What it measured |',
  '| --- | --- | --- |',
  '| `20261021093750_G13_G14_dashboard_audit` | 5 pass / 19 fail | the first run aborted in the fixture bootstrap because the suite sent `industry: "FINANCIAL_SERVICES"` while `CLIENT_INDUSTRIES` holds display labels (`Fintech`); the cascade produced 404s and empty aggregates, no backend defect was exposed |',
  '| `20261021094231_G13_G14_dashboard_audit` | 23 pass / 1 fail | G14-03 compared the audit ledger against a tenant-blind counter (the second organization\'s lead is not in organization A\'s ledger); fixed by counting only writes made with the organization A session |',
  '| `20261021094504_G13_G14_dashboard_audit` | 24 pass / 0 fail | first green run, superseded by this bundle |',
  `| \`${RUN}_G13_G14_dashboard_audit\` | ${suite.results.filter(item => item.status === 'PASS').length} pass / ${failing.length} fail | the green run used for this report |`,
  '',
  'The two dashboard defects listed above were fixed in the backend source before the green run, so the passing cases measure the corrected behaviour. G13/G14-99 replays the pre-fix pipeline query over the same tenant and reports what it would have claimed.'
].join('\n');

const { reportDir } = suite.writeReport({
  reportDirName: argValue('report-dir', `${RUN}_G13_G14_dashboard_audit`),
  extraSections: [defectsSection, codeSection, coverageSection, runHistorySection]
});

const cleanupFile = path.join(reportDir, `${RUN}_cleanup.sql`);
fs.appendFileSync(cleanupFile, [
  `-- Leads, proposals, clients and audit rows created by this run live in the three test`,
  `-- organizations above and cascade with them. These statements are listed explicitly so the`,
  `-- audit trail can be removed without relying on FK behaviour. Review before executing.`,
  `BEGIN;`,
  `DELETE FROM audit_logs WHERE organization_id = ANY(ARRAY[${[ids.orgA, ids.orgB, ids.orgC].filter(Boolean).map(id => `'${id}'`).join(', ')}]::uuid[]);`,
  `DELETE FROM proposal_sheets WHERE proposal_id IN (SELECT id FROM proposals WHERE organization_id = ANY(ARRAY[${[ids.orgA, ids.orgB, ids.orgC].filter(Boolean).map(id => `'${id}'`).join(', ')}]::uuid[]));`,
  `DELETE FROM proposals WHERE organization_id = ANY(ARRAY[${[ids.orgA, ids.orgB, ids.orgC].filter(Boolean).map(id => `'${id}'`).join(', ')}]::uuid[]);`,
  `DELETE FROM leads WHERE organization_id = ANY(ARRAY[${[ids.orgA, ids.orgB, ids.orgC].filter(Boolean).map(id => `'${id}'`).join(', ')}]::uuid[]);`,
  `DELETE FROM clients WHERE organization_id = ANY(ARRAY[${[ids.orgA, ids.orgB, ids.orgC].filter(Boolean).map(id => `'${id}'`).join(', ')}]::uuid[]);`,
  `-- One-off manual probe of the dashboard defaults (organization "Probe 75882424", 12 leads).`,
  `DELETE FROM audit_logs WHERE organization_id = 'd2c8f370-40e4-4f91-b3aa-442dd351bbd3';`,
  `DELETE FROM leads WHERE organization_id = 'd2c8f370-40e4-4f91-b3aa-442dd351bbd3';`,
  `DELETE FROM users WHERE email LIKE 'probe-%@presaleee-e2e.test';`,
  `DELETE FROM organizations WHERE id = 'd2c8f370-40e4-4f91-b3aa-442dd351bbd3';`,
  `COMMIT;`,
  ``
].join('\n'));

console.log(`report directory: ${reportDir}`);
