import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

const app = createApp();
const server = createServer(app);
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const BASE = `http://localhost:${port}`;

let passes = 0;
let failures = 0;

function ok(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passes++;
  } else {
    console.error(`  FAIL  ${label}`);
    failures++;
  }
}

async function post(path, body, tok) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: `Bearer ${tok}` } : {}),
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const b = await res.json().catch(() => null);
  return { res, body: b };
}

async function patch(path, body, tok) {
  const res = await fetch(BASE + path, {
    method: 'PATCH',
    headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: `Bearer ${tok}` } : {}),
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const b = await res.json().catch(() => null);
  return { res, body: b };
}

async function get(path, tok) {
  const res = await fetch(BASE + path, {
    headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    credentials: 'include',
  });
  const b = await res.json().catch(() => null);
  return { res, body: b };
}

function extractToken(b) {
  return b?.token ?? b?.data?.accessToken ?? b?.data?.token ?? null;
}

console.log('\n=== Sprint 1: Concerns Lifecycle & YC Access Tests ===\n');

// 1. Authenticate users
const { body: slb } = await post('/api/auth/login', { email: 'abhinav.dinesh@kct.ac.in', password: 'mmrms@2026' });
const studentToken = extractToken(slb);
ok(!!studentToken, 'Student login succeeds');

const { body: mlb } = await post('/api/auth/login', { email: 'bharathi.priya@kct.ac.in', password: 'mmrms@2026' });
const mentorToken = extractToken(mlb);
ok(!!mentorToken, 'Mentor login succeeds');

const { body: clb } = await post('/api/auth/login', { email: 'anitha.p@kct.ac.in', password: 'mmrms@2026' });
const coordinatorToken = extractToken(clb);
ok(!!coordinatorToken, 'Year Coordinator login succeeds');

// 2. Student retrieves concerns
console.log('\n[Student Concerns: List]');
const { res: scRes, body: scBody } = await get('/api/student/me/concerns', studentToken);
ok(scRes.status === 200, 'GET /api/student/me/concerns => 200');
const studentConcerns = scBody?.data?.concerns ?? scBody?.concerns ?? [];
ok(Array.isArray(studentConcerns), 'Returns concerns array');
const resolvedPending = studentConcerns.find((c) => c.status === 'RESOLVED');
ok(!!resolvedPending, 'Found seeded concern with status RESOLVED (Pending Acknowledgment)');

// 3. Student raises a concern
console.log('\n[Student Concerns: Raise OPEN]');
const { res: rcRes, body: rcBody } = await post(
  '/api/student/me/concerns',
  {
    category: 'Academic',
    priority: 'High',
    subject: 'Request for special revision class in Digital Systems',
    description: 'Need assistance with Karnaugh maps and sequential logic timing diagrams before internals.',
  },
  studentToken,
);
ok(rcRes.status === 201, 'POST /api/student/me/concerns => 201 Created');
const newConcern = rcBody?.data ?? rcBody;
ok(newConcern?.status === 'OPEN', 'New concern has status OPEN');
ok(newConcern?.subject === 'Request for special revision class in Digital Systems', 'Subject preserved');
const newConcernId = newConcern?.id;

// 4. Mentor views concerns and action item queue
console.log('\n[Mentor: Action Item Queue & Address Concern]');
const { res: mcRes, body: mcBody } = await get('/api/mentor/me/concerns', mentorToken);
ok(mcRes.status === 200, 'GET /api/mentor/me/concerns => 200');
const mentorConcerns = mcBody?.data?.concerns ?? mcBody?.concerns ?? [];
const openInMentor = mentorConcerns.find((c) => c.id === newConcernId);
ok(!!openInMentor, 'Mentor sees the newly raised concern in list');

const { res: maiRes, body: maiBody } = await get('/api/mentor/me/action-items', mentorToken);
ok(maiRes.status === 200, 'GET /api/mentor/me/action-items => 200');
const actionItems = maiBody?.data ?? maiBody ?? [];
const concernInActionItems = actionItems.find((item) => item.concernId === newConcernId || item.id === newConcernId);
ok(!!concernInActionItems, 'Open student concern appears directly in mentor Action Item Queue');

// 5. Mentor addresses concern with resolution & evidence (transitions to RESOLVED)
console.log('\n[Mentor: Address Concern -> RESOLVED]');
const { res: resRes, body: resBody } = await patch(
  `/api/mentor/me/concerns/${newConcernId}/resolve`,
  {
    resolution: 'Arranged peer-tutoring session with subject topper and shared supplementary problem sets with solutions.',
    evidence: [
      {
        name: 'Revision_Session_Schedule.pdf',
        contentType: 'application/pdf',
        size: 54300,
        dataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoK...',
      },
    ],
  },
  mentorToken,
);
ok(resRes.status === 200, 'PATCH /api/mentor/me/concerns/:id/resolve => 200');
const resolvedConcern = resBody?.data ?? resBody;
ok(resolvedConcern?.status === 'RESOLVED', 'Concern status updated to RESOLVED');
ok(resolvedConcern?.resolution?.includes('peer-tutoring'), 'Resolution recorded');
ok(Array.isArray(resolvedConcern?.evidence) && resolvedConcern.evidence.length === 1, 'Evidence attached');

// 6. Student acknowledges resolution (transitions to CLOSED)
console.log('\n[Student: Acknowledge Resolution -> CLOSED]');
const { res: ackRes, body: ackBody } = await post(
  `/api/student/me/concerns/${newConcernId}/acknowledge`,
  { feedback: 'Attended session, concepts are clear now. Thank you!' },
  studentToken,
);
ok(ackRes.status === 200, 'POST /api/student/me/concerns/:id/acknowledge => 200');
const closedConcern = ackBody?.data ?? ackBody;
ok(closedConcern?.status === 'CLOSED', 'Concern status transitioned to CLOSED');
ok(!!closedConcern?.acknowledgedAt, 'acknowledgedAt timestamp set');

// 7. Year Coordinator read-only mentor dashboard
console.log('\n[Year Coordinator: Read-Only Mentor Dashboard]');
const { res: ycdRes, body: ycdBody } = await get('/api/coordinator/me/mentors/m-1/dashboard', coordinatorToken);
ok(ycdRes.status === 200, 'GET /api/coordinator/me/mentors/m-1/dashboard => 200');
const ycDashboard = ycdBody?.data ?? ycdBody;
ok(!!ycDashboard?.stats && !!ycDashboard?.mentor, 'YC can inspect mentor dashboard overview');

console.log('\n========================================');
console.log(`Results: ${passes} passed, ${failures} failed`);

if (failures > 0) {
  process.exit(1);
} else {
  console.log('SPRINT 1 BACKEND VERIFICATION PASSED\n');
  process.exit(0);
}
