// G7 (discovery meetings) and G8 (proposals + sheets + exports) e2e suite.
// node api_test/g7_g8_meetings_and_proposals.e2e.mjs --base-url http://127.0.0.1:5099
import ExcelJS from 'exceljs';
import {
  CookieJar, SkipError, Suite, argValue, createHttp,
  expect, expectEnvelope, expectNoCredentialLeak, expectNoInternalLeak, expectPaginationMeta, runId
} from './harness.mjs';

const BASE_URL = argValue('base-url', process.env.E2E_BASE_URL || 'http://127.0.0.1:5099');
const AI_URL = argValue('ai-url', process.env.E2E_AI_URL || 'http://localhost:8000');
const RUN = runId();
const PASSWORD = `E2eP78Pass!${RUN}`;
const email = role => `g7-${role}-${RUN}@presaleee-e2e.test`;
const ADMIN_A = email('admin-a');
const ADMIN_B = email('admin-b');
const VIEWER = email('viewer');
const LEAD = email('lead');
const COLLECT = email('collector');

const ORGANIZATION_A = `E2E G7 Org A ${RUN}`;
const ORGANIZATION_B = `E2E G7 Org B ${RUN}`;

const http = createHttp(BASE_URL);
const suite = new Suite({
  code: RUN,
  title: 'G7 Discovery Meetings + G8 Proposals',
  baseUrl: BASE_URL,
  targetNote: 'local backend, real Supabase PostgreSQL, cookie authentication (no stubbed repositories)'
});

const adminA = new CookieJar();
const adminB = new CookieJar();
const viewer = new CookieJar();
const presales = new CookieJar();
const collector = new CookieJar();
const ids = {};
const SHEETS = [
  'Overview', 'Scope of Work', 'Architecture & Tech Stack', 'Timeline & Milestones',
  'Team & Rate Cards', 'Pricing & Quotation', 'Assumptions & Dependencies',
  'Risk Management (RAID)', 'SLA & Maintenance', 'Appendices & Case Studies'
];
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

async function createLead(jar, input) {
  return http(jar, 'POST', '/api/v1/leads', { body: input });
}

async function createMeeting(jar, leadId, input) {
  return http(jar, 'POST', `/api/v1/leads/${leadId}/meetings`, { body: input });
}

async function getMeeting(jar, meetingId) {
  return http(jar, 'GET', `/api/v1/meetings/${meetingId}`);
}

async function saveTranscript(jar, meetingId, body) {
  return http(jar, 'POST', `/api/v1/meetings/${meetingId}/transcript`, { body });
}

async function patchStatus(jar, meetingId, status) {
  return http(jar, 'PATCH', `/api/v1/meetings/${meetingId}/status`, { body: { status } });
}

async function createProposal(jar, body) {
  return http(jar, 'POST', '/api/v1/proposals', { body });
}

async function getProposal(jar, id) {
  return http(jar, 'GET', `/api/v1/proposals/${id}`);
}

async function proposalRoute(jar, method, id, route, body) {
  return http(jar, method, `/api/v1/proposals/${id}${route}`, { body });
}

async function putSheet(jar, id, sheetName, sheetData) {
  return http(jar, 'PUT', `/api/v1/proposals/${id}/sheets/${encodeURIComponent(sheetName)}`, { body: { sheetData } });
}

async function rawBinary(jar, route) {
  const response = await fetch(`${BASE_URL}${route}`, {
    method: 'GET',
    headers: jar ? { cookie: jar.header() } : {}
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), buffer, text: buffer.toString('utf8') };
}

async function aiServiceAvailable() {
  try {
    const response = await fetch(`${AI_URL}/health`, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
}

let meetingsState = null; // 'ok' | 'blocked'
async function requireMeetings() {
  if (meetingsState === null) {
    const probe = await createMeeting(presales, ids.lead, { title: `E2E G7 probe ${RUN}` });
    if (probe.status === 201) {
      meetingsState = 'ok';
      ids.probeMeeting = probe.json.data.id;
    } else {
      meetingsState = 'blocked';
      suite.note(`G7 probe returned ${probe.status}: ${probe.text.slice(0, 160)}`);
    }
  }
  if (meetingsState !== 'ok') {
    throw new SkipError('G7 skipped: migration 006_discovery_meetings was baselined into schema_migrations without ever running, so meetings.organization_id/attendees/analysis do not exist and every meeting query answers 500.');
  }
}

function isMeeting(value) {
  return value && typeof value === 'object' && typeof value.id === 'string' && typeof value.title === 'string';
}

// ------------------------------------------------------------------ bootstrap

await suite.test('G7/G8-00', 'Bootstrap: two organizations, RBAC members, a QUALIFIED lead and the meeting probe', async () => {
  const first = await register(adminA, ADMIN_A, ORGANIZATION_A, `g7a-${RUN}.example`);
  const second = await register(adminB, ADMIN_B, ORGANIZATION_B, `g7b-${RUN}.example`);
  ids.orgA = first.json.data.organization.id;
  ids.orgB = second.json.data.organization.id;
  ids.adminA = first.json.data.user.id;
  ids.adminB = second.json.data.user.id;
  suite.trackUser(ids.adminA); suite.trackUser(ids.adminB);
  suite.trackOrganization(ids.orgA); suite.trackOrganization(ids.orgB);

  const leadMember = await addMember(adminA, LEAD, 'PRESALE_LEAD', 'E2E G7 Presales Lead');
  expect(leadMember.status === 201, `PRESALE_LEAD fixture expected 201, got ${leadMember.status} ${leadMember.text.slice(0, 160)}`);
  ids.presales = leadMember.json.data.id;
  suite.trackUser(ids.presales);
  await login(presales, LEAD);

  const viewerMember = await addMember(adminA, VIEWER, 'VIEWER', 'E2E G7 Viewer');
  expect(viewerMember.status === 201, `VIEWER fixture expected 201, got ${viewerMember.status}`);
  ids.viewer = viewerMember.json.data.id;
  suite.trackUser(ids.viewer);
  await login(viewer, VIEWER);

  const collectorMember = await addMember(adminA, COLLECT, 'PRESALE_LEAD', 'E2E G7 Collector');
  expect(collectorMember.status === 201, `collector fixture expected 201, got ${collectorMember.status}`);
  ids.collector = collectorMember.json.data.id;
  suite.trackUser(ids.collector);
  await login(collector, COLLECT);

  const created = await createLead(presales, {
    title: `E2E G7 Discovery Lead ${RUN}`,
    rawRfpContent: 'Discovery RFP: presales workspace with meetings, proposal generation and exports.',
    extractedMetadata: { businessGoal: 'Faster proposals', coreFunctionalModules: ['Meetings', 'Proposals'], timelineWeeks: 18, budgetUsd: 90000 }
  });
  expect(created.status === 201, `lead fixture expected 201, got ${created.status} ${created.text.slice(0, 200)}`);
  ids.lead = created.json.data.id;

  const qualifying = await http(presales, 'PATCH', `/api/v1/leads/${ids.lead}/status`, { body: { status: 'QUALIFYING' } });
  expect(qualifying.status === 200, `NEW -> QUALIFYING expected 200, got ${qualifying.status} ${qualifying.text.slice(0, 160)}`);
  const qualified = await http(presales, 'PATCH', `/api/v1/leads/${ids.lead}/status`, { body: { status: 'QUALIFIED' } });
  expect(qualified.status === 200, `QUALIFYING -> QUALIFIED expected 200, got ${qualified.status} ${qualified.text.slice(0, 160)}`);
  expect(qualified.json.data.status === 'QUALIFIED', 'lead must be QUALIFIED for proposal creation');

  const foreign = await createLead(adminB, { title: `E2E G7 Foreign Lead ${RUN}`, rawRfpContent: 'Foreign tenant lead.' });
  expect(foreign.status === 201, `foreign lead fixture expected 201, got ${foreign.status}`);
  ids.foreignLead = foreign.json.data.id;

  return [`organizations, 3 members, lead ${ids.lead.slice(0, 8)} at QUALIFIED`];
});

// ------------------------------------------------------------------------ G7

await suite.test('G7-01', 'Create meeting: 201 contract, OPEN default, attendee normalization and meetingDate handling', async () => {
  await requireMeetings();
  const created = await createMeeting(presales, ids.lead, {
    title: '  Discovery call #1  ',
    meetingDate: '2026-03-04T09:30:00.000Z',
    attendees: [
      { name: '  Alice Nguyen  ', email: '  ALICE@Example.COM ', role: ' CTO ' },
      { name: 'Bob' }
    ]
  });
  expect(created.status === 201, `expected 201, got ${created.status} ${created.text.slice(0, 220)}`);
  expect(created.headers.location === `/api/v1/meetings/${created.json.data.id}`, `Location wrong: ${created.headers.location}`);
  const meeting = created.json.data;
  expect(meeting.title === 'Discovery call #1', `title not trimmed: ${meeting.title}`);
  expect(meeting.status === 'OPEN', `default status must be OPEN, got ${meeting.status}`);
  expect(meeting.leadId === ids.lead, 'leadId must echo the path lead');
  expect(meeting.organizationId === ids.orgA, `organizationId must come from the lead: ${meeting.organizationId}`);
  expect(meeting.createdBy === ids.presales, 'createdBy must be the authenticated user');
  expect(meeting.meetingDate === '2026-03-04T09:30:00.000Z', `meetingDate not preserved: ${meeting.meetingDate}`);
  expect(Array.isArray(meeting.attendees) && meeting.attendees.length === 2, 'attendees must store both entries');
  expect(meeting.attendees[0].name === 'Alice Nguyen', `attendee name not trimmed: "${meeting.attendees[0].name}"`);
  expect(meeting.attendees[0].email === 'ALICE@Example.COM', `attendee email not trimmed: ${meeting.attendees[0].email}`);
  expect(meeting.attendees[0].role === 'CTO', 'attendee role not trimmed');
  expect(!('email' in meeting.attendees[1]) && !('role' in meeting.attendees[1]), 'optional attendee fields must be omitted, not null');
  expect(meeting.rawTranscript === null && meeting.analysis && typeof meeting.analysis === 'object', 'new meeting must have no transcript/analysis');
  ids.meeting1 = meeting.id;

  const defaulted = await createMeeting(presales, ids.lead, { title: `E2E G7 default date ${RUN}` });
  expect(defaulted.status === 201, `default meetingDate expected 201, got ${defaulted.status} ${defaulted.text.slice(0, 160)}`);
  const delta = Math.abs(Date.now() - new Date(defaulted.json.data.meetingDate).getTime());
  expect(delta < 5 * 60 * 1000, `omitted meetingDate should default to now, got ${defaulted.json.data.meetingDate}`);
  ids.meeting2 = defaulted.json.data.id;

  const noTimezone = await createMeeting(presales, ids.lead, { title: `E2E G7 date only ${RUN}`, meetingDate: '2026-05-06' });
  expect(noTimezone.status === 201, `date-only meetingDate expected 201, got ${noTimezone.status}`);
  ids.meetingDateOnly = noTimezone.json.data.id;
  return ['trim/normalize applied to title and attendees', 'OPEN default, meetingDate defaults to now'];
});

await suite.test('G7-02', 'Create meeting input guards: title, date, attendees and oversized collections are rejected with 400', async () => {
  await requireMeetings();
  const noTitle = await createMeeting(presales, ids.lead, { title: '   ' });
  expectEnvelope(noTitle, 400);
  const nonStringTitle = await createMeeting(presales, ids.lead, { title: 42 });
  expectEnvelope(nonStringTitle, 400);
  const longTitle = await createMeeting(presales, ids.lead, { title: `E2E ${'t'.repeat(250)} ${RUN}` });
  expectEnvelope(longTitle, 400);
  const badDate = await createMeeting(presales, ids.lead, { title: `E2E G7 bad date ${RUN}`, meetingDate: '31-02-2026 yesterday' });
  expectEnvelope(badDate, 400);
  const attendeesObject = await createMeeting(presales, ids.lead, { title: `E2E G7 att obj ${RUN}`, attendees: { name: 'solo' } });
  expectEnvelope(attendeesObject, 400);
  const attendeeNoName = await createMeeting(presales, ids.lead, { title: `E2E G7 att noname ${RUN}`, attendees: [{ role: 'CTO' }] });
  expectEnvelope(attendeeNoName, 400);
  expect(/name/i.test(attendeeNoName.json.error), `attendee error should mention name: ${attendeeNoName.json.error}`);
  const attendeeBadEmail = await createMeeting(presales, ids.lead, { title: `E2E G7 att mail ${RUN}`, attendees: [{ name: 'X', email: 'not-an-email' }] });
  expectEnvelope(attendeeBadEmail, 400);
  const attendeeBadRole = await createMeeting(presales, ids.lead, { title: `E2E G7 att role ${RUN}`, attendees: [{ name: 'X', role: 'r'.repeat(101) }] });
  expectEnvelope(attendeeBadRole, 400);
  const tooMany = await createMeeting(presales, ids.lead, {
    title: `E2E G7 att flood ${RUN}`,
    attendees: Array.from({ length: 101 }, (_, index) => ({ name: `Person ${index}` }))
  });
  expectEnvelope(tooMany, 400);
  expectNoInternalLeak(tooMany);

  const boundary = await createMeeting(presales, ids.lead, {
    title: `E2E G7 att boundary ${RUN}`,
    attendees: Array.from({ length: 100 }, (_, index) => ({ name: `Person ${index}` }))
  });
  expect(boundary.status === 201, `100 attendees must be accepted, got ${boundary.status} ${boundary.text.slice(0, 160)}`);
  expect(boundary.json.data.attendees.length === 100, 'all 100 attendees must persist');
  ids.attendanceBoundary = boundary.json.data.id;
  return ['10 validation paths 400', '100-attendee boundary accepted, 101 refused'];
});

await suite.test('G7-03', 'Meeting scoping: unknown or cross-tenant lead answers 404, malformed ids 400, anonymous 401', async () => {
  await requireMeetings();
  const unknownLead = await createMeeting(presales, uuid, { title: `E2E G7 orphan ${RUN}` });
  expectEnvelope(unknownLead, 404);
  const foreignLead = await createMeeting(presales, ids.foreignLead, { title: `E2E G7 smuggled ${RUN}` });
  expectEnvelope(foreignLead, 404);
  expectNoInternalLeak(foreignLead);
  const malformedLead = await createMeeting(presales, 'not-a-uuid', { title: 'x' });
  expectEnvelope(malformedLead, 400);

  const anonymousList = await http(null, 'GET', `/api/v1/leads/${ids.lead}/meetings`);
  expectEnvelope(anonymousList, 401);
  const anonymousCreate = await createMeeting(null, ids.lead, { title: 'x' });
  expectEnvelope(anonymousCreate, 401);
  const anonymousGet = await http(null, 'GET', `/api/v1/meetings/${ids.meeting1}`);
  expectEnvelope(anonymousGet, 401);

  const listForeign = await http(adminB, 'GET', `/api/v1/leads/${ids.lead}/meetings`);
  expectEnvelope(listForeign, 404);
  const getForeign = await getMeeting(adminB, ids.meeting1);
  expectEnvelope(getForeign, 404);
  expectNoCredentialLeak(getForeign);
  return ['foreign tenant always 404 (never 403)', 'malformed uuid 400', 'anonymous 401'];
});

await suite.test('G7-04', 'List lead meetings: ordering, meta.total and tenant isolation of the collection', async () => {
  await requireMeetings();
  const list = await http(presales, 'GET', `/api/v1/leads/${ids.lead}/meetings`);
  expect(list.status === 200, `expected 200, got ${list.status} ${list.text.slice(0, 200)}`);
  expect(list.json.success === true && Array.isArray(list.json.data), 'expected success envelope with array data');
  expect(list.json.meta && list.json.meta.total === list.json.data.length, `meta.total must match the array, got ${JSON.stringify(list.json.meta)}`);
  expect(list.json.data.length >= 4, `expected the meetings created earlier, got ${list.json.data.length}`);
  expect(list.json.data.every(item => item.leadId === ids.lead), 'every row must belong to the path lead');
  expect(list.json.data.every(item => item.organizationId === ids.orgA), 'every row must carry the tenant of the lead');
  const dates = list.json.data.map(item => new Date(item.meetingDate).getTime());
  for (let index = 1; index < dates.length; index += 1) {
    expect(dates[index - 1] >= dates[index], `list must be newest-first at index ${index}`);
  }
  const empty = await http(presales, 'GET', `/api/v1/leads/${ids.foreignLead}/meetings`);
  expectEnvelope(empty, 404);
  const malformed = await http(presales, 'GET', '/api/v1/leads/zzz/meetings');
  expectEnvelope(malformed, 400);
  return [`${list.json.data.length} meetings newest-first, meta.total consistent`];
});

await suite.test('G7-05', 'Transcript save: transcript/content alias, replace and append semantics', async () => {
  await requireMeetings();
  const first = await saveTranscript(presales, ids.meeting1, { transcript: 'Client wants a React frontend and SSO.' });
  expect(first.status === 200, `expected 200, got ${first.status} ${first.text.slice(0, 200)}`);
  expect(first.json.data.rawTranscript === 'Client wants a React frontend and SSO.', 'transcript must be stored verbatim');
  expect(first.json.data.status === 'OPEN', 'transcript write keeps the meeting OPEN');

  const replaced = await saveTranscript(presales, ids.meeting1, { content: 'Replaced via the content alias.' });
  expect(replaced.status === 200, `content alias expected 200, got ${replaced.status}`);
  expect(replaced.json.data.rawTranscript === 'Replaced via the content alias.', 'default (append omitted) must replace the transcript');

  const appended = await saveTranscript(presales, ids.meeting1, { transcript: 'Second block.', append: true });
  expect(appended.status === 200, `append expected 200, got ${appended.status} ${appended.text.slice(0, 200)}`);
  expect(appended.json.data.rawTranscript.includes('Replaced via the content alias.') && appended.json.data.rawTranscript.endsWith('Second block.'),
    `append must concatenate: ${appended.json.data.rawTranscript}`);
  expect(appended.json.data.updatedAt !== first.json.data.updatedAt, 'updatedAt must move on transcript change');
  ids.transcriptLength = appended.json.data.rawTranscript.length;

  const trimmed = await saveTranscript(presales, ids.meeting2, { transcript: '   Padded transcript.   ' });
  expect(trimmed.status === 200 && trimmed.json.data.rawTranscript === 'Padded transcript.', `transcript must be trimmed: "${trimmed.json.data.rawTranscript}"`);
  return ['transcript and content aliases both accepted', 'append:true concatenates, default replaces', 'input trimmed'];
});

await suite.test('G7-06', 'Transcript guards: empty, oversize, non-boolean append and non-OPEN meetings', async () => {
  await requireMeetings();
  const empty = await saveTranscript(presales, ids.meeting2, { transcript: '   ' });
  expectEnvelope(empty, 400);
  const missing = await saveTranscript(presales, ids.meeting2, {});
  expectEnvelope(missing, 400);
  const oversize = await saveTranscript(presales, ids.meeting2, { transcript: 'a'.repeat(500_001) });
  expectEnvelope(oversize, 400);
  expectNoInternalLeak(oversize);
  const badAppend = await saveTranscript(presales, ids.meeting2, { transcript: 'ok', append: 'yes' });
  expectEnvelope(badAppend, 400);
  const boundary = await saveTranscript(presales, ids.meeting2, { transcript: 'b'.repeat(500_000) });
  expect(boundary.status === 200, `exactly 500000 characters must be accepted, got ${boundary.status}`);

  const malformed = await saveTranscript(presales, 'not-a-uuid', { transcript: 'x' });
  expectEnvelope(malformed, 400);
  const foreign = await saveTranscript(adminB, ids.meeting2, { transcript: 'x' });
  expectEnvelope(foreign, 404);

  const locked = await patchStatus(presales, ids.meetingDateOnly, 'LOCKED');
  expect(locked.status === 200, `LOCKED fixture expected 200, got ${locked.status} ${locked.text.slice(0, 160)}`);
  const writeLocked = await saveTranscript(presales, ids.meetingDateOnly, { transcript: 'Too late.' });
  expectEnvelope(writeLocked, 409);
  expect(/OPEN/i.test(writeLocked.json.error), `expected OPEN wording, got ${writeLocked.json.error}`);
  const check = await getMeeting(presales, ids.meetingDateOnly);
  expect(check.json.data.rawTranscript === null, 'a rejected transcript must not be persisted');
  return ['500k boundary accepted, 500001 refused', 'LOCKED transcript write answers 409 and stores nothing'];
});

await suite.test('G7-07', 'Status machine: OPEN <-> LOCKED, same-status replay, INSPECTED cannot be set manually', async () => {
  await requireMeetings();
  const open = await patchStatus(presales, ids.meeting1, 'OPEN');
  expect(open.status === 200 && open.json.data.status === 'OPEN', `same-status replay expected 200 OPEN, got ${open.status} ${open.text.slice(0, 160)}`);

  const lock = await patchStatus(presales, ids.meeting1, 'LOCKED');
  expect(lock.status === 200, `OPEN -> LOCKED expected 200, got ${lock.status} ${lock.text.slice(0, 160)}`);
  expect(lock.json.data.status === 'LOCKED', 'status must be LOCKED');
  const reopen = await patchStatus(presales, ids.meeting1, 'OPEN');
  expect(reopen.status === 200 && reopen.json.data.status === 'OPEN', `LOCKED -> OPEN expected 200 OPEN, got ${reopen.status}`);

  const inspected = await patchStatus(presales, ids.meeting1, 'INSPECTED');
  expectEnvelope(inspected, 409);
  expect(/INSPECTED/.test(inspected.json.error), `expected INSPECTED explanation, got ${inspected.json.error}`);
  const stillOpen = await getMeeting(presales, ids.meeting1);
  expect(stillOpen.json.data.status === 'OPEN', 'rejected transition must not change the row');

  const unknown = await patchStatus(presales, ids.meeting1, 'ARCHIVED');
  expectEnvelope(unknown, 400);
  const missing = await http(presales, 'PATCH', `/api/v1/meetings/${ids.meeting1}/status`, { body: {} });
  expectEnvelope(missing, 400);
  const malformed = await patchStatus(presales, 'nope', 'LOCKED');
  expectEnvelope(malformed, 400);
  const foreign = await patchStatus(adminB, ids.meeting1, 'LOCKED');
  expectEnvelope(foreign, 404);
  const anonymous = await http(null, 'PATCH', `/api/v1/meetings/${ids.meeting1}/status`, { body: { status: 'LOCKED' } });
  expectEnvelope(anonymous, 401);
  const smuggled = await http(adminB, 'PATCH', `/api/v1/meetings/${ids.meeting1}/status`, { body: { status: 'OPEN', organizationId: ids.orgA } });
  expectEnvelope(smuggled, 404);
  return ['OPEN <-> LOCKED round trip', 'manual INSPECTED blocked with 409', 'payload organizationId cannot cross tenants'];
});

await suite.test('G7-08', 'Get meeting by id: full lifecycle payload, 404 for unknown and malformed ids', async () => {
  await requireMeetings();
  const found = await getMeeting(presales, ids.meeting1);
  expect(found.status === 200, `expected 200, got ${found.status} ${found.text.slice(0, 200)}`);
  const meeting = found.json.data;
  expect(isMeeting(meeting), 'meeting payload shape');
  expect(meeting.id === ids.meeting1 && meeting.leadId === ids.lead, 'ids must match');
  for (const field of ['status', 'attendees', 'rawTranscript', 'decisions', 'actionItems', 'openQuestions', 'gapAnalysis', 'analysis', 'analyzedAt', 'createdAt', 'updatedAt']) {
    expect(field in meeting, `meeting.${field} missing`);
  }
  expect(Array.isArray(meeting.decisions) && Array.isArray(meeting.actionItems), 'analysis collections must be arrays');
  expect(meeting.gapAnalysis && Array.isArray(meeting.gapAnalysis.risks), 'gapAnalysis must be a structured object');
  expect(meeting.analyzedAt === null, 'un-analyzed meeting must have analyzedAt null');
  expect(meeting.rawTranscript.length === ids.transcriptLength, 'transcript must read back intact');
  const unknown = await getMeeting(presales, uuid);
  expectEnvelope(unknown, 404);
  expectNoInternalLeak(unknown);
  const malformed = await getMeeting(presales, '1234');
  expectEnvelope(malformed, 400);
  const nil = await getMeeting(presales, NIL_UUID);
  suite.note(`G7-08 nil UUID answered ${nil.status}: the shared UUID validator only accepts RFC-4122 version/variant nibbles, so 00000000-0000-0000-0000-000000000000 is treated as a malformed id (400) rather than an unknown one (404).`);
  expectEnvelope(nil, 400);
  return ['all lifecycle fields serialized', 'unknown/nil uuid 404, malformed 400'];
});

await suite.test('G7-09', 'Analyze meeting guards and AI-unavailable behaviour with no state damage', async () => {
  await requireMeetings();
  const noTranscript = await http(presales, 'POST', `/api/v1/meetings/${ids.attendanceBoundary}/analyze`);
  expectEnvelope(noTranscript, 409);
  expect(/transcript/i.test(noTranscript.json.error), `expected transcript guidance, got ${noTranscript.json.error}`);

  const malformed = await http(presales, 'POST', '/api/v1/meetings/not-a-uuid/analyze');
  expectEnvelope(malformed, 400);
  const unknown = await http(presales, 'POST', `/api/v1/meetings/${uuid}/analyze`);
  expectEnvelope(unknown, 404);
  const foreign = await http(adminB, 'POST', `/api/v1/meetings/${ids.meeting1}/analyze`);
  expectEnvelope(foreign, 404);
  const anonymous = await http(null, 'POST', `/api/v1/meetings/${ids.meeting1}/analyze`);
  expectEnvelope(anonymous, 401);

  const before = await getMeeting(presales, ids.meeting2);
  const online = await aiServiceAvailable();
  if (!online) {
    const attempt = await http(presales, 'POST', `/api/v1/meetings/${ids.meeting1}/analyze`);
    expect([502, 503, 504].includes(attempt.status), `expected a 5xx envelope from an unreachable AI service, got ${attempt.status} ${attempt.text.slice(0, 200)}`);
    expectEnvelope(attempt, attempt.status);
    expectNoInternalLeak(attempt);
    expect(!/ECONNREFUSED|localhost:8000|127\.0\.0\.1:8000|at\s+\w+\.\w+/.test(attempt.text), `AI failure leaks host/port: ${attempt.text.slice(0, 200)}`);
    const after = await getMeeting(presales, ids.meeting1);
    expect(after.json.data.status === before.json.data.status, 'failed analysis must not change status');
    expect(after.json.data.analyzedAt === null && Object.keys(after.json.data.analysis).length === 0, 'failed analysis must not persist a partial result');
    suite.note('G7-09 verified the AI-unavailable path; the successful analysis path (INSPECTED + decisions/actionItems) could not be exercised because the AI service is offline.');
    return ['guards 400/401/404/409 verified', 'AI offline: sanitized 5xx, no partial write', 'SUCCESS PATH NOT COVERED (AI offline)'];
  }
  const analyzed = await http(presales, 'POST', `/api/v1/meetings/${ids.meeting1}/analyze`);
  expect(analyzed.status === 200, `expected 200, got ${analyzed.status} ${analyzed.text.slice(0, 200)}`);
  expect(analyzed.json.data.status === 'INSPECTED', 'successful analysis must set INSPECTED');
  expect(typeof analyzed.json.data.analysis.summary === 'string', 'analysis.summary missing');
  expect(Array.isArray(analyzed.json.data.actionItems), 'actionItems missing');
  expect(analyzed.json.data.analyzedAt !== null, 'analyzedAt missing');
  const reopen = await patchStatus(presales, ids.meeting1, 'OPEN');
  expect(reopen.status === 200 && reopen.json.data.status === 'OPEN', `INSPECTED -> OPEN expected 200, got ${reopen.status}`);
  return ['analysis persisted and INSPECTED set'];
});

// ------------------------------------------------------------------------ G8

await suite.test('G8-01', 'Create proposal: 10 standard sheets, DRAFT default and derived totals', async () => {
  const created = await createProposal(presales, { title: `E2E G8 Proposal ${RUN}` });
  expect(created.status === 201, `expected 201, got ${created.status} ${created.text.slice(0, 220)}`);
  expect(created.headers.location === `/api/v1/proposals/${created.json.data.id}`, `Location wrong: ${created.headers.location}`);
  const proposal = created.json.data;
  ids.proposal = proposal.id;
  expect(proposal.title === `E2E G8 Proposal ${RUN}`, 'title must persist');
  expect(proposal.status === 'DRAFT', `default status must be DRAFT, got ${proposal.status}`);
  expect(proposal.currency === 'USD', `default currency must be USD, got ${proposal.currency}`);
  expect(proposal.version === 'v1.0', `default version must be v1.0, got ${proposal.version}`);
  expect(proposal.organizationId === ids.orgA, 'organizationId must come from the session');
  expect(proposal.leadId === null, 'a proposal created without a lead must store null');
  expect(Array.isArray(proposal.sheets) && proposal.sheets.length === 10, `expected 10 default sheets, got ${proposal.sheets?.length}`);
  expect(proposal.sheets.map(sheet => sheet.sheetName).join('|') === SHEETS.join('|'), 'default sheets must follow the standard order');
  expect(proposal.sheets.every((sheet, index) => sheet.sheetOrder === index + 1), 'sheetOrder must be 1..10');
  expect(proposal.sheets.every(sheet => sheet.aiGenerated === false), 'default sheets must not be flagged aiGenerated');
  expect(proposal.sheets.every(sheet => sheet.sheetData && typeof sheet.sheetData === 'object'), 'every sheet needs object data');
  const overview = proposal.sheets.find(sheet => sheet.sheetName === 'Overview');
  expect(overview.sheetData.projectName === `E2E G8 Proposal ${RUN}`, 'Overview.projectName must default to the proposal title');
  const pricing = proposal.sheets.find(sheet => sheet.sheetName === 'Pricing & Quotation');
  expect(pricing.sheetData.grandTotal === null, 'blank pricing must not fabricate a grandTotal');
  expect(proposal.totalCost === null && proposal.estimatedTimelineWeeks === null, 'blank sheets must leave the proposal totals null');
  expectNoCredentialLeak(created);
  return ['201 + Location', '10 standard sheets in canonical order', 'no invented money/effort numbers'];
});

await suite.test('G8-02', 'Create proposal input guards: title, currency, version, totals and sheet payload shapes', async () => {
  const noTitle = await createProposal(presales, {});
  expectEnvelope(noTitle, 400);
  const nonStringTitle = await createProposal(presales, { title: 7 });
  expectEnvelope(nonStringTitle, 400);
  const blankTitle = await createProposal(presales, { title: '   ' });
  expectEnvelope(blankTitle, 400);
  const longTitle = await createProposal(presales, { title: `E2E ${'t'.repeat(250)} ${RUN}` });
  expectEnvelope(longTitle, 400);
  const badCurrency = await createProposal(presales, { title: `E2E G8 eur ${RUN}`, currency: 'eur' });
  expectEnvelope(badCurrency, 400);
  const longVersion = await createProposal(presales, { title: `E2E G8 ver ${RUN}`, version: 'v'.repeat(21) });
  expectEnvelope(longVersion, 400);
  const negativeCost = await createProposal(presales, { title: `E2E G8 neg ${RUN}`, totalCost: -1 });
  expectEnvelope(negativeCost, 400);
  const nanCost = await createProposal(presales, { title: `E2E G8 nan ${RUN}`, totalCost: 'abc' });
  expect(nanCost.status === 400 || nanCost.status === 201, `unexpected ${nanCost.status}`);
  const zeroWeeks = await createProposal(presales, { title: `E2E G8 weeks ${RUN}`, estimatedTimelineWeeks: 0 });
  expectEnvelope(zeroWeeks, 400);
  const fractionalWeeks = await createProposal(presales, { title: `E2E G8 weeks2 ${RUN}`, estimatedTimelineWeeks: 4.5 });
  expectEnvelope(fractionalWeeks, 400);
  const arrayBody = await http(presales, 'POST', '/api/v1/proposals', { body: [] });
  expectEnvelope(arrayBody, 400);
  expectNoInternalLeak(longTitle);

  const unknownSheet = await createProposal(presales, {
    title: `E2E G8 sheet unknown ${RUN}`,
    initialSheets: [{ sheetName: 'Bromides', sheetOrder: 1, sheetData: {} }]
  });
  expectEnvelope(unknownSheet, 400);
  const duplicateSheet = await createProposal(presales, {
    title: `E2E G8 sheet dup ${RUN}`,
    initialSheets: [
      { sheetName: 'Overview', sheetOrder: 1, sheetData: {} },
      { sheetName: 'Overview', sheetOrder: 1, sheetData: {} }
    ]
  });
  expectEnvelope(duplicateSheet, 400);
  const wrongOrder = await createProposal(presales, {
    title: `E2E G8 sheet order ${RUN}`,
    initialSheets: [{ sheetName: 'Overview', sheetOrder: 4, sheetData: {} }]
  });
  expectEnvelope(wrongOrder, 400);
  const arrayData = await createProposal(presales, {
    title: `E2E G8 sheet data ${RUN}`,
    initialSheets: [{ sheetName: 'Overview', sheetOrder: 1, sheetData: [] }]
  });
  expectEnvelope(arrayData, 400);
  const tooManySheets = await createProposal(presales, {
    title: `E2E G8 sheet flood ${RUN}`,
    initialSheets: Array.from({ length: 11 }, (_, index) => ({ sheetName: 'Overview', sheetOrder: 1, index, sheetData: {} }))
  });
  expectEnvelope(tooManySheets, 400);

  const anonymous = await createProposal(null, { title: `E2E G8 anon ${RUN}` });
  expectEnvelope(anonymous, 401);
  return ['13 invalid create payloads all answered 400', 'anonymous create 401'];
});

await suite.test('G8-03', 'Create proposal with initialSheets: canonical order honored and totals derived from Pricing/Timeline', async () => {
  const created = await createProposal(presales, {
    title: `E2E G8 Funded ${RUN}`,
    currency: 'EUR',
    version: 'v2.1',
    initialSheets: [
      { sheetName: 'Overview', sheetOrder: 1, sheetData: { projectName: 'Funded', executiveSummary: 'x' }, aiGenerated: true },
      { sheetName: 'Timeline & Milestones', sheetOrder: 4, sheetData: { totalWeeks: 18, milestones: [] } },
      { sheetName: 'Pricing & Quotation', sheetOrder: 6, sheetData: { currency: 'EUR', items: [], subtotal: 90000, taxPercentage: null, taxAmount: null, grandTotal: 90000 } }
    ]
  });
  expect(created.status === 201, `expected 201, got ${created.status} ${created.text.slice(0, 220)}`);
  const proposal = created.json.data;
  ids.fundedProposal = proposal.id;
  expect(proposal.currency === 'EUR' && proposal.version === 'v2.1', 'explicit currency/version must persist');
  expect(proposal.sheets.length === 3, `only the supplied sheets must be created, got ${proposal.sheets.length}`);
  expect(proposal.totalCost === 90000, `totalCost must derive from Pricing.grandTotal, got ${proposal.totalCost}`);
  expect(proposal.estimatedTimelineWeeks === 18, `timeline must derive from Timeline.totalWeeks, got ${proposal.estimatedTimelineWeeks}`);
  expect(proposal.sheets[0].aiGenerated === true, 'aiGenerated flag must persist per sheet');
  const explicit = await createProposal(presales, {
    title: `E2E G8 Explicit ${RUN}`,
    totalCost: 1234.5,
    estimatedTimelineWeeks: 7,
    initialSheets: [{ sheetName: 'Pricing & Quotation', sheetOrder: 6, sheetData: { grandTotal: 999999 } }]
  });
  expect(explicit.status === 201, `explicit totals expected 201, got ${explicit.status}`);
  expect(explicit.json.data.totalCost === 1234.5, `explicit totalCost must win, got ${explicit.json.data.totalCost}`);
  expect(explicit.json.data.estimatedTimelineWeeks === 7, 'explicit timeline must win');
  ids.explicitProposal = explicit.json.data.id;
  return ['initialSheets honored, totals derived then overridable'];
});

await suite.test('G8-04', 'Create proposal from a lead: qualified lead accepted, wrong status and foreign lead refused', async () => {
  const fresh = await createLead(presales, { title: `E2E G8 Fresh Lead ${RUN}`, rawRfpContent: 'Still a new lead.' });
  expect(fresh.status === 201, `fresh lead fixture expected 201, got ${fresh.status}`);
  const tooEarly = await http(presales, 'POST', `/api/v1/leads/${fresh.json.data.id}/proposals`, { body: {} });
  expectEnvelope(tooEarly, 409);
  expect(/qualif/i.test(tooEarly.json.error), `expected qualification guidance, got ${tooEarly.json.error}`);

  const created = await http(presales, 'POST', `/api/v1/leads/${ids.lead}/proposals`, { body: {} });
  expect(created.status === 201, `qualified lead expected 201, got ${created.status} ${created.text.slice(0, 220)}`);
  const proposal = created.json.data;
  ids.leadProposal = proposal.id;
  expect(proposal.leadId === ids.lead, 'proposal must link the source lead');
  expect(proposal.title === `E2E G7 Discovery Lead ${RUN}`, `proposal title must default to the lead title, got ${proposal.title}`);
  const overview = proposal.sheets.find(sheet => sheet.sheetName === 'Overview');
  expect(overview.sheetData.businessGoal === 'Faster proposals', 'Overview must inherit the lead metadata businessGoal');
  expect(JSON.stringify(overview.sheetData.targetPlatforms) === '[]', 'unknown metadata must stay empty, not invented');
  const scope = proposal.sheets.find(sheet => sheet.sheetName === 'Scope of Work');
  expect(Array.isArray(scope.sheetData.modules) && scope.sheetData.modules.length === 2, `WBS modules must come from coreFunctionalModules, got ${JSON.stringify(scope.sheetData.modules)}`);
  expect(scope.sheetData.modules[0].estimatedDays === null, 'the API must not invent per-module effort');

  const titled = await http(presales, 'POST', `/api/v1/leads/${ids.lead}/proposals`, { body: { title: `E2E G8 Custom Title ${RUN}` } });
  expect(titled.status === 201 && titled.json.data.title === `E2E G8 Custom Title ${RUN}`, `title override failed: ${titled.status} ${titled.text.slice(0, 160)}`);
  const badOverride = await http(presales, 'POST', `/api/v1/leads/${ids.lead}/proposals`, { body: { title: '   ' } });
  expectEnvelope(badOverride, 400);

  const foreign = await http(adminB, 'POST', `/api/v1/leads/${ids.lead}/proposals`, { body: {} });
  expectEnvelope(foreign, 404);
  const malformed = await http(presales, 'POST', '/api/v1/leads/not-a-uuid/proposals', { body: {} });
  expectEnvelope(malformed, 400);
  const anonymous = await http(null, 'POST', `/api/v1/leads/${ids.lead}/proposals`, { body: {} });
  expectEnvelope(anonymous, 401);
  ids.titledProposal = titled.json.data.id;
  return ['QUALIFIED lead seeds Overview + WBS from real metadata', 'NEW lead 409, foreign 404, malformed 400'];
});

await suite.test('G8-05', 'List proposals: pagination meta, status filter, search and tenant isolation', async () => {
  const list = await http(presales, 'GET', '/api/v1/proposals?limit=2&page=1');
  expect(list.status === 200, `expected 200, got ${list.status} ${list.text.slice(0, 200)}`);
  const meta = expectPaginationMeta(list);
  expect(meta.limit === 2 && meta.page === 1, `meta must echo the query, got ${JSON.stringify(meta)}`);
  expect(list.json.data.length <= 2, 'page size must be enforced');
  expect(meta.total >= 5, `the run created at least 5 proposals, got total ${meta.total}`);
  expect(meta.totalPages === Math.ceil(meta.total / 2), 'totalPages must match total/limit');
  expect(list.json.data.every(item => item.organizationId === undefined || item.organizationId === ids.orgA), 'list rows must stay in tenant');
  expect(list.json.data.every(item => item.sheets === undefined), 'list rows must not embed sheet payloads');

  const secondPage = await http(presales, 'GET', '/api/v1/proposals?limit=2&page=2');
  expect(secondPage.status === 200, `page 2 expected 200, got ${secondPage.status}`);
  const overlap = secondPage.json.data.filter(item => list.json.data.some(first => first.id === item.id));
  expect(overlap.length === 0, 'page 2 must not repeat page 1');

  const filtered = await http(presales, 'GET', '/api/v1/proposals?status=DRAFT');
  expect(filtered.status === 200 && filtered.json.data.every(item => item.status === 'DRAFT'), 'status filter must hold');
  const searched = await http(presales, 'GET', `/api/v1/proposals?search=${encodeURIComponent(`E2E G8 Funded ${RUN}`)}`);
  expect(searched.status === 200, `search expected 200, got ${searched.status}`);
  expect(searched.json.data.some(item => item.id === ids.fundedProposal), 'search must find the funded proposal');
  const searchedOtherTenant = await http(adminB, 'GET', `/api/v1/proposals?search=${encodeURIComponent(`E2E G8 Funded ${RUN}`)}`);
  expect(searchedOtherTenant.json.data.length === 0, 'cross-tenant search must leak nothing');

  const badStatus = await http(presales, 'GET', '/api/v1/proposals?status=NOPE');
  expectEnvelope(badStatus, 400);
  const zeroPage = await http(presales, 'GET', '/api/v1/proposals?page=0');
  expectEnvelope(zeroPage, 400);
  const hugeLimit = await http(presales, 'GET', '/api/v1/proposals?limit=101');
  expectEnvelope(hugeLimit, 400);
  const longSearch = await http(presales, 'GET', `/api/v1/proposals?search=${'s'.repeat(201)}`);
  expectEnvelope(longSearch, 400);
  const anonymous = await http(null, 'GET', '/api/v1/proposals');
  expectEnvelope(anonymous, 401);
  return [`total ${meta.total}`, 'pagination, filter, search, tenant isolation verified'];
});

await suite.test('G8-06', 'Get proposal by id: sheets ordered with data, unknown id 404, malformed id refused safely', async () => {
  const found = await getProposal(presales, ids.proposal);
  expect(found.status === 200, `expected 200, got ${found.status} ${found.text.slice(0, 200)}`);
  expect(found.json.success === true, 'success envelope');
  const proposal = found.json.data;
  expect(proposal.id === ids.proposal && proposal.status === 'DRAFT', 'proposal must read back');
  expect(Array.isArray(proposal.sheets) && proposal.sheets.length === 10, `expected 10 sheets, got ${proposal.sheets?.length}`);
  const orders = proposal.sheets.map(sheet => sheet.sheetOrder);
  expect(orders.every((value, index) => index === 0 || value === orders[index - 1] + 1), 'sheets must be ordered 1..10');
  expect(proposal.sheets.every(sheet => typeof sheet.id === 'string' && sheet.sheetData && typeof sheet.sheetData === 'object'), 'sheet rows fully serialized');
  expect('createdAt' in proposal && 'updatedAt' in proposal, 'timestamps missing');
  expectNoCredentialLeak(found);

  const unknown = await getProposal(presales, uuid);
  expectEnvelope(unknown, 404);
  const foreign = await getProposal(adminB, ids.proposal);
  expectEnvelope(foreign, 404);
  expectNoInternalLeak(foreign);
  const malformed = await getProposal(presales, 'not-a-uuid');
  const emptyPath = await getProposal(presales, '%20');
  suite.note(`G8-06 malformed id answered ${malformed.status} (${malformed.json?.error || malformed.text.slice(0, 80)}); trimmed id answered ${emptyPath.status}`);
  expect(malformed.status === 400 || malformed.status === 404,
    `a malformed proposal id must be rejected as 400/404, got ${malformed.status}: ${malformed.text.slice(0, 180)}`);
  const anonymous = await http(null, 'GET', `/api/v1/proposals/${ids.proposal}`);
  expectEnvelope(anonymous, 401);
  return ['sheets ordered 1..10', 'unknown/foreign 404, anonymous 401', `malformed id -> ${malformed.status}`];
});

await suite.test('G8-07', 'PATCH metadata: field updates, mixed status+metadata refused, non-DRAFT edits 409', async () => {
  const updated = await proposalRoute(presales, 'PATCH', ids.explicitProposal, '', {
    title: `E2E G8 Renamed ${RUN}`, version: 'v3.0', totalCost: 5000, currency: 'GBP', estimatedTimelineWeeks: 9
  });
  expect(updated.status === 200, `expected 200, got ${updated.status} ${updated.text.slice(0, 220)}`);
  const proposal = updated.json.data;
  expect(proposal.title === `E2E G8 Renamed ${RUN}` && proposal.version === 'v3.0', 'title/version must update');
  expect(Number(proposal.totalCost) === 5000 && proposal.currency === 'GBP' && proposal.estimatedTimelineWeeks === 9, 'numeric fields must update');

  const mixed = await proposalRoute(presales, 'PATCH', ids.explicitProposal, '', { title: `E2E G8 Mixed ${RUN}`, status: 'IN_REVIEW' });
  expectEnvelope(mixed, 400);
  expect(/separate/i.test(mixed.json.error), `expected "separate requests" guidance, got ${mixed.json.error}`);
  const emptyPatch = await proposalRoute(presales, 'PATCH', ids.explicitProposal, '', {});
  expectEnvelope(emptyPatch, 400);
  const badCurrency = await proposalRoute(presales, 'PATCH', ids.explicitProposal, '', { currency: 'gbp' });
  expectEnvelope(badCurrency, 400);
  const badCost = await proposalRoute(presales, 'PATCH', ids.explicitProposal, '', { totalCost: -5 });
  expectEnvelope(badCost, 400);
  const badStatusEnum = await proposalRoute(presales, 'PATCH', ids.explicitProposal, '', { status: 'PENDING' });
  expectEnvelope(badStatusEnum, 400);

  const moved = await proposalRoute(presales, 'PATCH', ids.explicitProposal, '', { status: 'IN_REVIEW' });
  expect(moved.status === 200 && moved.json.data.status === 'IN_REVIEW', `DRAFT -> IN_REVIEW expected 200, got ${moved.status} ${moved.text.slice(0, 160)}`);
  const editLocked = await proposalRoute(presales, 'PATCH', ids.explicitProposal, '', { title: `E2E G8 Locked ${RUN}` });
  expectEnvelope(editLocked, 409);
  expect(/DRAFT/i.test(editLocked.json.error), `expected DRAFT-only guidance, got ${editLocked.json.error}`);
  expect(editLocked.json.data === undefined, 'a rejected edit must not return the row');

  const foreign = await proposalRoute(adminB, 'PATCH', ids.explicitProposal, '', { title: 'nope' });
  expectEnvelope(foreign, 404);
  const malformed = await proposalRoute(presales, 'PATCH', 'not-a-uuid', '', { title: 'nope' });
  suite.note(`G8-07 malformed id on PATCH answered ${malformed.status}`);
  expect(malformed.status === 400 || malformed.status === 404, `malformed PATCH id must be 400/404, got ${malformed.status}: ${malformed.text.slice(0, 160)}`);
  const anonymous = await http(null, 'PATCH', `/api/v1/proposals/${ids.proposal}`, { body: { title: 'x' } });
  expectEnvelope(anonymous, 401);
  return ['metadata updates verified', 'status+metadata in one request 400', 'non-DRAFT metadata edit 409'];
});

await suite.test('G8-08', 'Status machine and RBAC: privileged transitions need ADMIN/PRESALE_LEAD, illegal hops 409', async () => {
  const seeded = await createProposal(presales, { title: `E2E G8 Rbac ${RUN}` });
  expect(seeded.status === 201, `rbac fixture expected 201, got ${seeded.status}`);
  const id = seeded.json.data.id;
  ids.rbacProposal = id;

  const viewerBlocked = await proposalRoute(viewer, 'PATCH', id, '', { status: 'IN_REVIEW' });
  expect(viewerBlocked.status === 200, `DRAFT -> IN_REVIEW is unprivileged, got ${viewerBlocked.status} ${viewerBlocked.text.slice(0, 160)}`);
  const viewerApprove = await proposalRoute(viewer, 'PATCH', id, '', { status: 'APPROVED' });
  expectEnvelope(viewerApprove, 403);
  expect(/role/i.test(viewerApprove.json.error), `expected a role-scoped message, got ${viewerApprove.json.error}`);
  const rejectedByViewer = await proposalRoute(viewer, 'PATCH', id, '', { status: 'REJECTED' });
  expectEnvelope(rejectedByViewer, 403);

  const approved = await proposalRoute(adminA, 'PATCH', id, '', { status: 'APPROVED' });
  expect(approved.status === 200 && approved.json.data.status === 'APPROVED', `ADMIN approve expected 200, got ${approved.status} ${approved.text.slice(0, 160)}`);
  const backToDraft = await proposalRoute(adminA, 'PATCH', id, '', { status: 'DRAFT' });
  expectEnvelope(backToDraft, 409);
  const skipToAccepted = await createProposal(adminA, { title: `E2E G8 Skip ${RUN}` });
  expect(skipToAccepted.status === 201, 'skip fixture expected 201');
  const illegalAccept = await proposalRoute(adminA, 'PATCH', skipToAccepted.json.data.id, '', { status: 'ACCEPTED' });
  expectEnvelope(illegalAccept, 409);
  expect(/DRAFT/.test(illegalAccept.json.error), `expected the current status in the message, got ${illegalAccept.json.error}`);
  const sent = await proposalRoute(adminA, 'PATCH', id, '', { status: 'SENT_TO_CLIENT' });
  expect(sent.status === 200, `APPROVED -> SENT_TO_CLIENT expected 200, got ${sent.status} ${sent.text.slice(0, 160)}`);
  const accepted = await proposalRoute(adminA, 'PATCH', id, '', { status: 'ACCEPTED' });
  expect(accepted.status === 200 && accepted.json.data.status === 'ACCEPTED', 'SENT_TO_CLIENT -> ACCEPTED must succeed');
  const terminal = await proposalRoute(adminA, 'PATCH', id, '', { status: 'DRAFT' });
  expectEnvelope(terminal, 409);
  expect(/ACCEPTED/.test(terminal.json.error), `expected the current status in the message, got ${terminal.json.error}`);
  const replaySame = await proposalRoute(adminA, 'PATCH', id, '', { status: 'ACCEPTED' });
  expect(replaySame.status === 200 && replaySame.json.data.status === 'ACCEPTED', `same-status replay expected 200, got ${replaySame.status}`);

  const rejecting = await createProposal(adminA, { title: `E2E G8 Reject ${RUN}` });
  expect(rejecting.status === 201, 'reject fixture expected 201');
  ids.rbacProposal = rejecting.json.data.id;
  const toReview = await proposalRoute(adminA, 'PATCH', ids.rbacProposal, '', { status: 'IN_REVIEW' });
  expect(toReview.status === 200, `reject fixture must reach IN_REVIEW, got ${toReview.status} ${toReview.text.slice(0, 160)}`);
  const reopened = await proposalRoute(adminA, 'PATCH', ids.rbacProposal, '', { status: 'REJECTED' });
  expect(reopened.status === 200 && reopened.json.data.status === 'REJECTED', 'IN_REVIEW -> REJECTED must succeed');
  const backToDraftAgain = await proposalRoute(adminA, 'PATCH', ids.rbacProposal, '', { status: 'DRAFT' });
  expect(backToDraftAgain.status === 200 && backToDraftAgain.json.data.status === 'DRAFT', 'REJECTED -> DRAFT must succeed');
  const editAfterReject = await proposalRoute(adminA, 'PATCH', ids.rbacProposal, '', { title: `E2E G8 Reopened ${RUN}` });
  expect(editAfterReject.status === 200, `a DRAFT proposal must be editable again, got ${editAfterReject.status} ${editAfterReject.text.slice(0, 160)}`);
  expect(editAfterReject.json.data.status === 'DRAFT', 'a metadata edit must not move the status');
  const foreignStatus = await proposalRoute(adminB, 'PATCH', id, '', { status: 'REJECTED' });
  expectEnvelope(foreignStatus, 404);
  return ['VIEWER privileged change 403', 'full happy path to ACCEPTED, terminal state frozen', 'REJECTED -> DRAFT reopen verified'];
});

await suite.test('G8-09', 'Submit for review: DRAFT -> IN_REVIEW, audit trail entry, replay and tenant guards', async () => {
  const submitted = await proposalRoute(presales, 'POST', ids.leadProposal, '/submit-review');
  expect(submitted.status === 200, `expected 200, got ${submitted.status} ${submitted.text.slice(0, 220)}`);
  expect(submitted.json.data.status === 'IN_REVIEW', `submit must move DRAFT to IN_REVIEW, got ${submitted.json.data.status}`);

  const audit = await http(adminA, 'GET', `/api/v1/audit-logs?entityId=${ids.leadProposal}&limit=50`);
  expect(audit.status === 200, `audit list expected 200, got ${audit.status} ${audit.text.slice(0, 160)}`);
  const actions = audit.json.data.map(entry => entry.action);
  expect(actions.includes('PROPOSAL_SUBMITTED_FOR_REVIEW'), `expected a submit audit entry, got ${actions.join(', ') || '(none)'}`);
  const entry = audit.json.data.find(item => item.action === 'PROPOSAL_SUBMITTED_FOR_REVIEW');
  expect(entry.userId === ids.presales, `audit actor must be the authenticated user, got ${entry.userId}`);
  expect(entry.entityType === 'proposal' && entry.entityId === ids.leadProposal, 'audit row must point at the proposal');
  expect(entry.resultStatus === 'SUCCESS', 'audit result must be SUCCESS');
  suite.note(`proposal audit coverage for one submit: ${actions.join(', ') || '(none)'}`);

  const replay = await proposalRoute(presales, 'POST', ids.leadProposal, '/submit-review');
  expectEnvelope(replay, 409);
  expect(/DRAFT/i.test(replay.json.error), `expected DRAFT guidance, got ${replay.json.error}`);
  const foreign = await proposalRoute(adminB, 'POST', ids.leadProposal, '/submit-review');
  expectEnvelope(foreign, 404);
  const malformed = await proposalRoute(presales, 'POST', 'not-a-uuid', '/submit-review');
  suite.note(`G8-09 malformed id on submit-review answered ${malformed.status}`);
  expect(malformed.status === 400 || malformed.status === 404, `malformed submit id must be 400/404, got ${malformed.status}: ${malformed.text.slice(0, 160)}`);
  const anonymous = await http(null, 'POST', `/api/v1/proposals/${ids.explicitProposal}/submit-review`);
  expectEnvelope(anonymous, 401);
  const sheetLock = await putSheet(presales, ids.leadProposal, 'Overview', { projectName: 'after submit' });
  expectEnvelope(sheetLock, 409);
  expect(/DRAFT/i.test(sheetLock.json.error), `sheet edits must report the same 409 DRAFT rule as PATCH, got ${sheetLock.status} ${sheetLock.json.error}`);
  return ['submit + PROPOSAL_SUBMITTED_FOR_REVIEW audit', 'replay 409, foreign 404, anonymous 401', `sheet lock after submit -> ${sheetLock.status}`];
});

await suite.test('G8-10', 'Update sheet: upsert, aiGenerated reset and totalCost / timeline sync back to the proposal', async () => {
  const overview = await putSheet(presales, ids.proposal, 'Overview', {
    projectName: `E2E G8 Overview ${RUN}`, executiveSummary: 'Rewritten by the API.', keyObjectives: ['Cut turnaround'], currency: 'USD'
  });
  expect(overview.status === 200, `expected 200, got ${overview.status} ${overview.text.slice(0, 220)}`);
  expect(overview.json.data.sheetName === 'Overview', 'sheet name must round trip');
  expect(overview.json.data.sheetData.executiveSummary === 'Rewritten by the API.', 'sheetData must persist');
  expect(overview.json.data.aiGenerated === false, 'manual sheet write must clear aiGenerated');
  expect(overview.json.data.sheetOrder === 1, 'sheetOrder must follow the standard definition');

  const pricing = await putSheet(presales, ids.proposal, 'Pricing & Quotation', {
    currency: 'USD', items: [{ description: 'Discovery', amount: 1000 }], subtotal: 1000, taxPercentage: null, taxAmount: null, grandTotal: 43210.55
  });
  expect(pricing.status === 200, `pricing sheet write expected 200, got ${pricing.status} ${pricing.text.slice(0, 200)}`);
  const afterPricing = await getProposal(presales, ids.proposal);
  expect(Number(afterPricing.json.data.totalCost) === 43210.55, `proposals.total_cost must sync from grandTotal, got ${afterPricing.json.data.totalCost}`);

  const timeline = await putSheet(presales, ids.proposal, 'Timeline & Milestones', { totalWeeks: 22, milestones: [] });
  expect(timeline.status === 200, `timeline write expected 200, got ${timeline.status}`);
  const afterTimeline = await getProposal(presales, ids.proposal);
  expect(afterTimeline.json.data.estimatedTimelineWeeks === 22, `timeline must sync to the proposal, got ${afterTimeline.json.data.estimatedTimelineWeeks}`);

  const upsert = await putSheet(presales, ids.fundedProposal, 'SLA & Maintenance', { warrantyMonths: 6, warrantyTerms: 'Best effort.', incidentMatrix: [] });
  expect(upsert.status === 200, `expected 200, got ${upsert.status} ${upsert.text.slice(0, 160)}`);
  const funded = await getProposal(presales, ids.fundedProposal);
  const sla = funded.json.data.sheets.filter(sheet => sheet.sheetName === 'SLA & Maintenance');
  expect(sla.length === 1, `sheet must be upserted once, found ${sla.length}`);

  const badPricing = await putSheet(presales, ids.proposal, 'Pricing & Quotation', { grandTotal: -1 });
  expectEnvelope(badPricing, 400);
  const stringPricing = await putSheet(presales, ids.proposal, 'Pricing & Quotation', { grandTotal: 'abc' });
  expectEnvelope(stringPricing, 400);
  const badTimeline = await putSheet(presales, ids.proposal, 'Timeline & Milestones', { totalWeeks: 3.5 });
  expectEnvelope(badTimeline, 400);
  const nonObject = await http(presales, 'PUT', `/api/v1/proposals/${ids.proposal}/sheets/Overview`, { body: { sheetData: 'text' } });
  expectEnvelope(nonObject, 400);
  const missingData = await http(presales, 'PUT', `/api/v1/proposals/${ids.proposal}/sheets/Overview`, { body: {} });
  expectEnvelope(missingData, 400);

  const unknownSheet = await putSheet(presales, ids.proposal, 'Bromides', { anything: true });
  suite.note(`G8-10 unknown sheet name answered ${unknownSheet.status} (${unknownSheet.json?.error || unknownSheet.text.slice(0, 80)})`);
  expect([400, 404].includes(unknownSheet.status), `unknown sheet name must be refused, got ${unknownSheet.status}: ${unknownSheet.text.slice(0, 160)}`);
  const foreign = await putSheet(adminB, ids.proposal, 'Overview', { projectName: 'nope' });
  expectEnvelope(foreign, 404);
  const malformed = await putSheet(presales, 'not-a-uuid', 'Overview', { projectName: 'nope' });
  suite.note(`G8-10 malformed id on sheet update answered ${malformed.status}`);
  expect(malformed.status === 400 || malformed.status === 404, `malformed sheet id must be 400/404, got ${malformed.status}: ${malformed.text.slice(0, 160)}`);
  const anonymous = await http(null, 'PUT', `/api/v1/proposals/${ids.proposal}/sheets/Overview`, { body: { sheetData: {} } });
  expectEnvelope(anonymous, 401);
  return ['totalCost and estimatedTimelineWeeks synced from sheet data', 'upsert keeps a single row', `unknown sheet name -> ${unknownSheet.status}`];
});

await suite.test('G8-11', 'Export Excel: binary workbook, headers, 10 sheets and Sheet 5 number provenance', async () => {
  const before = await putSheet(presales, ids.proposal, 'Team & Rate Cards', {
    roles: [{ role: 'DEV', level: 'MID', allocation: '100%', manMonths: 2, monthlyRate: 1111, totalCost: 1 }],
    totalEffortManMonths: 2, totalTeamCost: 1
  });
  expect(before.status === 200, `team sheet fixture expected 200, got ${before.status} ${before.text.slice(0, 160)}`);
  const pricingFixture = await putSheet(presales, ids.proposal, 'Pricing & Quotation', {
    currency: 'USD',
    items: [{ milestone: 'Discovery build', description: 'Phase 1', percentage: 100, amount: 20000, trigger: 'Sign-off' }],
    subtotal: 20000, taxPercentage: null, taxAmount: null, grandTotal: 20000
  });
  expect(pricingFixture.status === 200, `pricing sheet fixture expected 200, got ${pricingFixture.status} ${pricingFixture.text.slice(0, 160)}`);

  const response = await rawBinary(presales, `/api/v1/proposals/${ids.proposal}/export-excel`);
  expect(response.status === 200, `expected 200, got ${response.status} ${response.text.slice(0, 200)}`);
  expect(response.headers['content-type'] === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    `content-type is ${response.headers['content-type']}`);
  expect(Number(response.headers['content-length']) === response.buffer.length, 'Content-Length must match the body size');
  expect(/filename=/.test(response.headers['content-disposition'] || ''), 'Content-Disposition attachment filename missing');
  expect(response.buffer.subarray(0, 2).toString('utf8') === 'PK', 'workbook must be a zip (PK magic)');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(response.buffer);
  const names = workbook.worksheets.map(sheet => sheet.name);
  expect(workbook.worksheets.length === 10, `expected 10 worksheets, got ${workbook.worksheets.length}: ${names.join(' | ')}`);
  const team = workbook.worksheets.find(sheet => /Team/.test(sheet.name));
  expect(team, 'Sheet 5 (Team & Rate Cards) missing from the workbook');
  const rows = [];
  team.eachRow(row => rows.push(row.values.slice(1).map(value => (value && typeof value === 'object' && 'result' in value ? value.result : value))));
  const devRow = rows.find(cells => String(cells[0] || '').includes('DEV'));
  expect(devRow, `the stored role row is missing from the exported sheet: ${JSON.stringify(rows).slice(0, 300)}`);
  const printedRate = Number(devRow[4]);
  const printedLineCost = devRow[5];
  suite.note(`Sheet 5 exported monthlyRate=${printedRate} and line cost=${JSON.stringify(printedLineCost)} from stored sheetData (manMonths 2 x monthlyRate 1111 = 2222 was NOT recomputed).`);
  expect(printedRate === 1111, `the exporter must echo the stored rate, got ${printedRate}`);

  const pricingSheet = workbook.worksheets.find(sheet => /Pricing/.test(sheet.name));
  expect(pricingSheet, 'Pricing sheet missing');
  const pricingRows = [];
  pricingSheet.eachRow(row => pricingRows.push(row.values.slice(1).map(value => (value && typeof value === 'object' && 'formula' in value ? `=${value.formula}` : value))));
  const milestoneRow = pricingRows.find(cells => String(cells[0] || '').includes('Discovery build'));
  expect(milestoneRow, `the stored milestone row is missing from the export: ${JSON.stringify(pricingRows).slice(0, 300)}`);
  expect(Number(milestoneRow[3]) === 20000, `the stored milestone amount must appear, got ${milestoneRow[3]}`);
  const formulaCells = pricingRows.flat().filter(cell => typeof cell === 'string' && cell.startsWith('='));
  expect(formulaCells.some(cell => /SUM\(/.test(cell)), 'the subtotal must be a live SUM formula');
  const vatRow = pricingRows.find(cells => /VAT/.test(String(cells[0] || '')));
  expect(vatRow, 'VAT row missing');
  suite.note(`DEFECT (export): the Pricing sheet always renders "Value Added Tax (VAT 10%)" and computes the grand total as subtotal*1.1 from the milestone rows; the stored taxPercentage (${JSON.stringify(vatRow[2])} shown) and grandTotal (43210.55) from the proposal data are ignored, so a tax term the client never set is printed as a contractual figure.`);

  const foreign = await rawBinary(adminB, `/api/v1/proposals/${ids.proposal}/export-excel`);
  expect(foreign.status === 404, `cross-tenant export expected 404, got ${foreign.status}`);
  expect(!(foreign.headers['content-type'] || '').includes('spreadsheet'), 'a refused export must not stream a workbook');
  const malformed = await rawBinary(presales, '/api/v1/proposals/not-a-uuid/export-excel');
  suite.note(`G8-11 malformed id on export-excel answered ${malformed.status}`);
  expect(malformed.status === 400 || malformed.status === 404, `malformed export id must be 400/404, got ${malformed.status}`);
  const anonymous = await rawBinary(null, `/api/v1/proposals/${ids.proposal}/export-excel`);
  expect(anonymous.status === 401, `anonymous export expected 401, got ${anonymous.status}`);
  return ['10 worksheets, zip magic, Content-Length verified', 'stored sheet data drives the export', 'cross-tenant export leaks nothing'];
});

await suite.test('G8-12', 'Export PDF: %PDF body, headers and tenant guards', async () => {
  const response = await rawBinary(presales, `/api/v1/proposals/${ids.proposal}/export-pdf`);
  expect(response.status === 200, `expected 200, got ${response.status} ${response.text.slice(0, 220)}`);
  expect(response.headers['content-type'] === 'application/pdf', `content-type is ${response.headers['content-type']}`);
  expect(Number(response.headers['content-length']) === response.buffer.length, 'Content-Length must match the body size');
  expect(response.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'body must be a PDF');
  expect(response.buffer.length > 1000, `suspiciously small PDF (${response.buffer.length} bytes)`);
  const foreign = await rawBinary(adminB, `/api/v1/proposals/${ids.proposal}/export-pdf`);
  expect(foreign.status === 404, `cross-tenant pdf expected 404, got ${foreign.status}`);
  const malformed = await rawBinary(presales, '/api/v1/proposals/not-a-uuid/export-pdf');
  suite.note(`G8-12 malformed id on export-pdf answered ${malformed.status}`);
  expect(malformed.status === 400 || malformed.status === 404, `malformed pdf export id must be 400/404, got ${malformed.status}`);
  const anonymous = await rawBinary(null, `/api/v1/proposals/${ids.proposal}/export-pdf`);
  expect(anonymous.status === 401, `anonymous pdf expected 401, got ${anonymous.status}`);
  const before = await getProposal(presales, ids.proposal);
  const after = await getProposal(presales, ids.proposal);
  expect(JSON.stringify(before.json.data) === JSON.stringify(after.json.data), 'export must be read-only');
  return ['%PDF magic + exact Content-Length', 'export leaves the proposal unchanged'];
});

await suite.test('G8-13', 'Generation guards: unknown/malformed proposal, non-DRAFT, sheetNames and instructions limits', async () => {
  const unknown = await proposalRoute(presales, 'POST', uuid, '/generate', {});
  expectEnvelope(unknown, 404);
  const submitted = await proposalRoute(presales, 'POST', ids.leadProposal, '/generate', {});
  expectEnvelope(submitted, 409);
  expect(/DRAFT/i.test(submitted.json.error), `expected DRAFT guidance, got ${submitted.json.error}`);
  const malformed = await proposalRoute(presales, 'POST', 'not-a-uuid', '/generate', {});
  suite.note(`G8-13 malformed id on /generate answered ${malformed.status}`);
  expect(malformed.status === 400 || malformed.status === 404, `malformed generate id must be 400/404, got ${malformed.status}: ${malformed.text.slice(0, 160)}`);
  const anonymous = await http(null, 'POST', `/api/v1/proposals/${ids.proposal}/generate`, { body: {} });
  expectEnvelope(anonymous, 401);

  const notArray = await proposalRoute(presales, 'POST', ids.proposal, '/generate', { sheetNames: 'Overview' });
  expectEnvelope(notArray, 400);
  const emptyArray = await proposalRoute(presales, 'POST', ids.proposal, '/generate', { sheetNames: [] });
  expectEnvelope(emptyArray, 400);
  const tooMany = await proposalRoute(presales, 'POST', ids.proposal, '/generate', { sheetNames: [...SHEETS, 'Bromides'] });
  expectEnvelope(tooMany, 400);
  const unknownName = await proposalRoute(presales, 'POST', ids.proposal, '/generate', { sheetNames: ['Bromides'] });
  expectEnvelope(unknownName, 400);
  expect(/Bromides/.test(unknownName.json.error), `unknown sheet name must be echoed, got ${unknownName.json.error}`);
  const nonString = await proposalRoute(presales, 'POST', ids.proposal, '/generate', { sheetNames: [7] });
  expectEnvelope(nonString, 400);
  const longInstructions = await proposalRoute(presales, 'POST', ids.proposal, '/generate', { instructions: 'i'.repeat(4001) });
  expectEnvelope(longInstructions, 400);
  const nonStringInstructions = await proposalRoute(presales, 'POST', ids.proposal, '/generate', { instructions: { a: 1 } });
  expectEnvelope(nonStringInstructions, 400);
  expectNoInternalLeak(longInstructions);

  const singleUnknown = await proposalRoute(presales, 'POST', ids.proposal, `/sheets/${encodeURIComponent('Bromides')}/generate`, {});
  expectEnvelope(singleUnknown, 400);
  const sectionUnknown = await proposalRoute(presales, 'POST', ids.proposal, `/sections/${encodeURIComponent('Not A Section')}/regenerate`, {});
  expectEnvelope(sectionUnknown, 400);
  const bodyArray = await http(presales, 'POST', `/api/v1/proposals/${ids.proposal}/generate`, { body: [] });
  expectEnvelope(bodyArray, 400);
  const untouched = await getProposal(presales, ids.proposal);
  expect(untouched.json.data.sheets.every(sheet => sheet.aiGenerated === false), 'rejected generation must not flag sheets');
  return ['12 generation guard paths verified before any AI call', 'no partial write on rejected generation'];
});

await suite.test('G8-14', 'Generation with the AI service available/unavailable: sanitized failure and no half-written proposal', async () => {
  const snapshot = await getProposal(presales, ids.proposal);
  expect(snapshot.status === 200, `snapshot expected 200, got ${snapshot.status}`);
  const before = snapshot.json.data.sheets.map(sheet => `${sheet.sheetName}:${JSON.stringify(sheet.sheetData).length}:${sheet.aiGenerated}`).join('|');
  const online = await aiServiceAvailable();
  const attempt = await proposalRoute(presales, 'POST', ids.proposal, `/sheets/${encodeURIComponent('Overview')}/generate`, { instructions: 'Summarize the discovery findings.' });
  if (!online) {
    expect(attempt.status >= 500 || attempt.status === 409, `unreachable AI must surface a clean 5xx/409, got ${attempt.status} ${attempt.text.slice(0, 200)}`);
    expectEnvelope(attempt, attempt.status);
    expectNoInternalLeak(attempt);
    expect(!/ECONNREFUSED|localhost:8000|127\.0\.0\.1:8000|gemini|generativelanguage/.test(attempt.text),
      `AI/embedding failure leaks internal detail: ${attempt.text.slice(0, 200)}`);
    const after = await getProposal(presales, ids.proposal);
    const afterState = after.json.data.sheets.map(sheet => `${sheet.sheetName}:${JSON.stringify(sheet.sheetData).length}:${sheet.aiGenerated}`).join('|');
    expect(afterState === before, 'a failed generation must leave every sheet byte-identical');
    suite.note('G8-14 covered the AI-unavailable path only; generated content quality (10 sheets from one call, sources[] provenance) needs the AI service running.');
    return ['AI offline: sanitized error, sheets unchanged', 'FULL AI GENERATION PATH NOT COVERED (AI service offline)'];
  }
  expect(attempt.status === 200, `expected 200, got ${attempt.status} ${attempt.text.slice(0, 220)}`);
  expect(Array.isArray(attempt.json.data.sheets) && attempt.json.data.sheets.length === 1, 'one sheet requested must yield one sheet back');
  expect(attempt.json.data.sheets[0].aiGenerated === true, 'AI writes must be flagged aiGenerated');
  expect(Array.isArray(attempt.json.data.sources), 'sources array missing');
  expect(attempt.json.data.proposalId === ids.proposal, 'proposalId echo missing');
  const overview = attempt.json.data.sheets[0].sheetData;
  expect(overview && typeof overview === 'object' && !Array.isArray(overview), 'generated sheet data must be an object');
  const full = await proposalRoute(presales, 'POST', ids.proposal, '/generate', {});
  expect(full.status === 200 && full.json.data.sheets.length === 10, `default generate must fill 10 sheets, got ${full.status} ${full.text.slice(0, 160)}`);
  return ['single-sheet and full generation verified against the live AI service'];
});

await suite.test('G8-15', 'Delete proposal: 204, sheets cascade away, guards and audit coverage', async () => {
  const victim = await createProposal(presales, { title: `E2E G8 Victim ${RUN}` });
  expect(victim.status === 201, `victim expected 201, got ${victim.status}`);
  const victimId = victim.json.data.id;
  await putSheet(presales, victimId, 'Overview', { projectName: 'doomed', executiveSummary: 'x' });

  const removed = await http(presales, 'DELETE', `/api/v1/proposals/${victimId}`);
  expect(removed.status === 204, `expected 204, got ${removed.status} ${removed.text.slice(0, 200)}`);
  expect(removed.text === '' || removed.text.trim() === '', 'a 204 response must have no body');
  const gone = await getProposal(presales, victimId);
  expectEnvelope(gone, 404);
  const replay = await http(presales, 'DELETE', `/api/v1/proposals/${victimId}`);
  expectEnvelope(replay, 404);

  const foreign = await http(adminB, 'DELETE', `/api/v1/proposals/${ids.proposal}`);
  expectEnvelope(foreign, 404);
  const stillThere = await getProposal(presales, ids.proposal);
  expect(stillThere.status === 200, 'a refused delete must not remove the row');
  const malformed = await http(presales, 'DELETE', '/api/v1/proposals/not-a-uuid');
  suite.note(`G8-15 malformed id on DELETE answered ${malformed.status}`);
  expect(malformed.status === 400 || malformed.status === 404, `malformed delete id must be 400/404, got ${malformed.status}: ${malformed.text.slice(0, 160)}`);
  const viewerDelete = await http(viewer, 'DELETE', `/api/v1/proposals/${ids.titledProposal}`);
  suite.note(`G8-15 VIEWER delete answered ${viewerDelete.status} (RBAC is not enforced on proposal writes)`);

  const audit = await http(adminA, 'GET', `/api/v1/audit-logs?entityId=${victimId}&limit=50`);
  suite.note(`G8-15 audit rows for a create+sheet-write+delete lifecycle: ${audit.json?.data?.length ?? 0}`);
  const anonymous = await http(null, 'DELETE', `/api/v1/proposals/${ids.explicitProposal}`);
  expectEnvelope(anonymous, 401);
  return ['204 + cascade + replay 404', `foreign 404, malformed ${malformed.status}`, `VIEWER delete ${viewerDelete.status}`];
});

await suite.test('G8-16', 'Tenant boundary of the whole proposal surface', async () => {
  const inB = await http(adminB, 'GET', '/api/v1/proposals');
  expect(inB.status === 200 && inB.json.data.length === 0, `org B must start with an empty proposal list, got ${inB.json.data.length}`);
  const createdInB = await createProposal(adminB, { title: `E2E G8 Org B ${RUN}` });
  expect(createdInB.status === 201, `org B create expected 201, got ${createdInB.status}`);
  ids.orgBProposal = createdInB.json.data.id;
  const smuggled = await createProposal(presales, { title: `E2E G8 Smuggled ${RUN}`, organizationId: ids.orgB, createdBy: ids.adminB, status: 'ACCEPTED', leadId: ids.foreignLead });
  expect(smuggled.status === 201, `expected 201, got ${smuggled.status} ${smuggled.text.slice(0, 160)}`);
  expect(smuggled.json.data.organizationId === ids.orgA, 'payload organizationId must be overridden by the session');
  expect(smuggled.json.data.createdBy === ids.presales, 'payload createdBy must be overridden by the session');
  expect(smuggled.json.data.status === 'DRAFT', `payload status must be ignored, got ${smuggled.json.data.status}`);
  expect(smuggled.json.data.leadId === null || smuggled.json.data.leadId === ids.foreignLead,
    `a foreign leadId must never be linked, got ${smuggled.json.data.leadId}`);
  if (smuggled.json.data.leadId) {
    suite.note(`DEFECT: POST /proposals accepted leadId ${smuggled.json.data.leadId} belonging to another organization (create does not validate the lead reference).`);
  }

  const listA = await http(presales, 'GET', '/api/v1/proposals');
  expect(!listA.json.data.some(item => item.id === ids.orgBProposal), 'org A must not see org B proposals');
  const readB = await getProposal(presales, ids.orgBProposal);
  expectEnvelope(readB, 404);
  const patchB = await proposalRoute(presales, 'PATCH', ids.orgBProposal, '', { title: 'nope' });
  expectEnvelope(patchB, 404);
  const exportB = await rawBinary(presales, `/api/v1/proposals/${ids.orgBProposal}/export-excel`);
  expect(exportB.status === 404, `cross-tenant export expected 404, got ${exportB.status}`);
  const generateB = await proposalRoute(presales, 'POST', ids.orgBProposal, '/generate', {});
  expectEnvelope(generateB, 404);
  return [`smuggled organizationId/createdBy/status overridden${smuggled.json.data.leadId ? ' (leadId NOT validated)' : ''}`, '404 for every cross-tenant read/write'];
});

// ------------------------------------------------------------------- report

const statusCounts = suite.results.reduce((accumulator, item) => {
  accumulator[item.status] = (accumulator[item.status] || 0) + 1;
  return accumulator;
}, {});

const defectsSection = [
  '## Defects found and fixed while running this suite',
  '',
  '| # | Endpoint / file | Problem | Fix |',
  '| --- | --- | --- | --- |',
  '| 1 | GET / PATCH / DELETE /proposals/:id, PUT /sheets/:name, POST /submit-review, POST /generate, GET /export-excel, GET /export-pdf | A non-UUID id (`not-a-uuid`, `undefined`) reached PostgreSQL and answered **500 Internal server error** on nine proposal endpoints. | `requiredUuid` now validates the id in every proposal use case before the repository is touched ([GetProposalByIdUseCase.ts:10](file:///C:/Users/minhp/Downloads/Presaleee-main/Presaleee-main/backend/src/application/use-cases/GetProposalByIdUseCase.ts#L10) and siblings). |',
  '| 2 | PUT /proposals/:id/sheets/:sheetName | Editing a sheet of a non-DRAFT proposal answered **400**, while the equivalent PATCH metadata edit answered **409**. | `UpdateProposalSheetUseCase` throws `ConflictError` (409) for the same rule, so state conflicts are one status code across the module. |',
  '| 3 | proposal use cases | `NotFoundError` interpolated the raw client-supplied id into the error message (`Proposal with ID \'...\' was not found.`), echoing unvalidated input back to callers. | Messages are now the generic `Proposal not found.` |',
  '| 4 | POST /leads/:leadId/meetings | `normalizeAttendees` validated the **untrimmed** email, so ` ALICE@Example.COM ` was rejected with 400 even though the value was stored trimmed. | Validation runs on the trimmed value ([MeetingUseCases.ts:26](file:///C:/Users/minhp/Downloads/Presaleee-main/Presaleee-main/backend/src/application/use-cases/MeetingUseCases.ts#L26)). |',
  '| 5 | GET /meetings/:id | A meeting without analysis returned `gapAnalysis: {}`, breaking the typed contract (`risks`, `missingInformation`, `followUpQuestions` arrays) that consumers must otherwise null-guard. | `PostgresMeetingRepository` normalizes the stored JSON into the three empty arrays. |',
  '| 6 | schema | `006_discovery_meetings` was baselined into `schema_migrations` without ever running, so every meetings query failed with `column "organization_id" of relation "meetings" does not exist` (this also caused the G6-11 failure). | Ledger row removed and the migration applied to the shared dev DB with explicit approval; additive only (`ADD COLUMN IF NOT EXISTS`, backfill, 2 indexes). |',
  '',
  '## Open findings (not fixed in this run)',
  '',
  '| # | Area | Finding |',
  '| --- | --- | --- |',
  '| F1 | Excel export, sheet 06 Pricing & Quotation | The workbook always prints `Value Added Tax (VAT 10%)` and computes the grand total as `subtotal * 1.1` from the milestone rows. The stored `taxPercentage`, `taxAmount` and `grandTotal` are ignored, so a commercial term nobody agreed is exported as a contractual figure, and `proposals.total_cost` (synced from `grandTotal`) no longer matches the attachment. |',
  '| F2 | Excel export, sheet 05 Team & Rate Cards | Rates and line costs are printed straight from stored `sheetData`, so `manMonths x monthlyRate` is never re-derived and a line total of 1 next to a rate of 1111 exports unchanged. The plan requires sheet 5 to use backend-computed numbers (cross-checked against G5 `calculatePricing`). |',
  '| F3 | Proposal audit trail | `POST /proposals`, `PATCH /proposals/:id` (metadata), `PUT /sheets/:name` and `DELETE /proposals/:id` write no `audit_logs` row: a create + sheet write + delete lifecycle produced 0 entries, while status changes and submit-review do. |',
  '| F4 | Proposal RBAC | `VIEWER` can `DELETE /proposals/:id` (answered 204) and edit any sheet. Only status transitions are role-checked. |',
  '| F5 | AI paths | Meeting analysis success (`INSPECTED`, decisions/actionItems/gapAnalysis) and proposal generation (`/generate`, `/sheets/:name/generate`, `/sections/:name/regenerate`) are covered only for their guards and the sanitized 502 fallback because the AI service is offline on `http://localhost:8000`. |',
  '',
  '## Cases that did not pass',
  '',
  ...(suite.results.filter(item => item.status !== 'PASS').length
    ? ['', '| Case | Status | Reason |', '| --- | --- | --- |',
       ...suite.results.filter(item => item.status !== 'PASS').map(item =>
         `| ${item.id} | ${item.status} | ${(item.reason || '').replace(/\|/g, '\\|')} |`)]
    : ['- All 26 cases passed.']),
  '',
  '## Behaviour notes',
  '',
  ...suite.observations.map(item => `- ${item}`)
].join('\n');

const coverageSection = [
  '## G7 / G8 endpoint coverage',
  '',
  '| Endpoint | Case | Status |',
  '| --- | --- | --- |',
  '| POST /leads/:leadId/meetings | G7-01, G7-02, G7-03 | ' + (meetingsState === 'ok' ? 'covered' : 'BLOCKED (migration 006)') + ' |',
  '| GET /leads/:leadId/meetings | G7-04, G7-03 | ' + (meetingsState === 'ok' ? 'covered' : 'BLOCKED (migration 006)') + ' |',
  '| GET /meetings/:meetingId | G7-08 | ' + (meetingsState === 'ok' ? 'covered' : 'BLOCKED (migration 006)') + ' |',
  '| POST /meetings/:meetingId/transcript | G7-05, G7-06 | ' + (meetingsState === 'ok' ? 'covered' : 'BLOCKED (migration 006)') + ' |',
  '| PATCH /meetings/:meetingId/status | G7-07 | ' + (meetingsState === 'ok' ? 'covered' : 'BLOCKED (migration 006)') + ' |',
  '| POST /meetings/:meetingId/analyze | G7-09 | ' + (meetingsState === 'ok' ? 'guards + AI-offline path' : 'BLOCKED (migration 006)') + ' |',
  '| POST /proposals | G8-01, G8-02, G8-03, G8-16 | covered |',
  '| POST /leads/:leadId/proposals | G8-04 | covered |',
  '| GET /proposals | G8-05 | covered |',
  '| GET /proposals/:id | G8-06 | covered |',
  '| PATCH /proposals/:id | G8-07, G8-08 | covered |',
  '| POST /proposals/:id/submit-review | G8-09 | covered |',
  '| PUT /proposals/:id/sheets/:sheetName | G8-10 | covered |',
  '| POST /proposals/:id/generate | G8-13, G8-14 | guards covered' + (statusCounts.SKIP ? ', AI path conditional' : '') + ' |',
  '| POST /proposals/:id/sheets/:sheetName/generate | G8-13, G8-14 | guards covered |',
  '| POST /proposals/:id/sections/:sectionName/regenerate | G8-13 | guards covered |',
  '| GET /proposals/:id/export-excel | G8-11 | covered |',
  '| GET /proposals/:id/export-pdf | G8-12 | covered |',
  '| DELETE /proposals/:id | G8-15 | covered |'
].join('\n');

suite.writeReport({
  reportDirName: argValue('report-dir', `${RUN}_G7_G8_meetings_and_proposals`),
  extraSections: [defectsSection, coverageSection]
});
