/**
 * MMRMS Baseline Verification Script
 * Run: node d:/MMRMS/backend/tests/baseline.js
 */

import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

const app = createApp();
const server = createServer(app);
await new Promise(r => server.listen(0, r));
const port = server.address().port;
const BASE = 'http://localhost:' + port;

let passes = 0;
let failures = 0;

function ok(condition, label) {
  if (condition) { console.log('  PASS  ' + label); passes++; }
  else { console.error('  FAIL  ' + label); failures++; }
}

async function post(path, body, tok) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: Object.assign({'Content-Type': 'application/json'}, tok ? {Authorization: 'Bearer ' + tok} : {}),
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const b = await res.json().catch(() => null);
  return { res, body: b };
}

async function get(path, tok) {
  const res = await fetch(BASE + path, {
    headers: tok ? {Authorization: 'Bearer ' + tok} : {},
    credentials: 'include',
  });
  const b = await res.json().catch(() => null);
  return { res, body: b };
}

function extractToken(b) {
  return b?.token ?? b?.data?.accessToken ?? b?.data?.token ?? null;
}

console.log('\n=== MMRMS Baseline Verification ===\n');

// Health
console.log('[Health]');
const { res: h, body: hb } = await get('/api/health');
ok(h.status === 200, 'GET /api/health => 200');
ok(hb?.ok === true || hb?.data?.ok === true, 'GET /api/health => ok:true');

// Login
console.log('\n[Auth / Login]');
const { res: lr, body: lb } = await post('/api/auth/login', { email: 'bharathi.priya@kct.ac.in', password: 'mmrms@2026' });
ok(lr.status === 200, 'POST /api/auth/login (mentor) => 200');
const mentorToken = extractToken(lb);
ok(!!mentorToken, 'POST /api/auth/login (mentor) => returns token');

const { body: slb } = await post('/api/auth/login', { email: 'abhinav.dinesh@kct.ac.in', password: 'mmrms@2026' });
const studentToken = extractToken(slb);
ok(!!studentToken, 'POST /api/auth/login (student) => returns token');

const { body: alb } = await post('/api/auth/login', { email: 'suganthi@kct.ac.in', password: 'mmrms@2026' });
const advisorToken = extractToken(alb);
ok(!!advisorToken, 'POST /api/auth/login (advisor) => returns token');

const { body: clb } = await post('/api/auth/login', { email: 'anitha.p@kct.ac.in', password: 'mmrms@2026' });
const coordinatorToken = extractToken(clb);
ok(!!coordinatorToken, 'POST /api/auth/login (coordinator) => returns token');

const { res: meRes } = await get('/api/auth/me', mentorToken);
ok(meRes.status === 200, 'GET /api/auth/me => 200');

// Mentor endpoints
console.log('\n[Mentor Endpoints]');
const { res: mov } = await get('/api/mentor/me/overview', mentorToken);
ok(mov.status === 200, 'GET /api/mentor/me/overview => 200');

const { res: mme, body: mmeb } = await get('/api/mentor/me/mentees', mentorToken);
ok(mme.status === 200, 'GET /api/mentor/me/mentees => 200');
const mentees = mmeb?.mentees ?? mmeb?.data?.mentees ?? [];
ok(Array.isArray(mentees), 'GET /api/mentor/me/mentees => mentees is array');
const firstMenteeId = mentees[0]?.id;

if (firstMenteeId) {
  const { res: mmed } = await get('/api/mentor/me/mentees/' + firstMenteeId, mentorToken);
  ok(mmed.status === 200, 'GET /api/mentor/me/mentees/:id => 200');
}

const { res: mg } = await get('/api/mentor/me/goals', mentorToken);
ok(mg.status === 200, 'GET /api/mentor/me/goals => 200');

const { res: mai } = await get('/api/mentor/me/action-items', mentorToken);
ok(mai.status === 200, 'GET /api/mentor/me/action-items => 200');

const { res: mpl } = await get('/api/mentor/me/parent-log', mentorToken);
ok(mpl.status === 200, 'GET /api/mentor/me/parent-log => 200');

const { res: mrep } = await get('/api/mentor/me/reports', mentorToken);
ok(mrep.status === 200, 'GET /api/mentor/me/reports => 200');

const { res: mtl } = await get('/api/mentor/me/timeline', mentorToken);
ok(mtl.status === 200, 'GET /api/mentor/me/timeline => 200');

// Student endpoints
console.log('\n[Student Endpoints]');
const { res: srb } = await get('/api/student/me/record-book', studentToken);
ok(srb.status === 200, 'GET /api/student/me/record-book => 200');

// Advisor endpoints
console.log('\n[Advisor Endpoints]');
const { res: aov } = await get('/api/advisor/me/overview', advisorToken);
ok(aov.status === 200, 'GET /api/advisor/me/overview => 200');

const { res: ast } = await get('/api/advisor/me/students', advisorToken);
ok(ast.status === 200, 'GET /api/advisor/me/students => 200');

// Coordinator endpoints
console.log('\n[Coordinator Endpoints]');
const { res: cov } = await get('/api/coordinator/me/overview', coordinatorToken);
ok(cov.status === 200, 'GET /api/coordinator/me/overview => 200');

const { res: cst } = await get('/api/coordinator/me/students', coordinatorToken);
ok(cst.status === 200, 'GET /api/coordinator/me/students => 200');

// RBAC guards
console.log('\n[RBAC Guards]');
const { res: rb1 } = await get('/api/mentor/me/overview', studentToken);
ok(rb1.status === 403, 'Student token on mentor endpoint => 403');

const { res: rb2 } = await get('/api/student/me/record-book', mentorToken);
ok(rb2.status === 403, 'Mentor token on student endpoint => 403');

const { res: rb3 } = await get('/api/advisor/me/overview', mentorToken);
ok(rb3.status === 403, 'Mentor token on advisor endpoint => 403');

const { res: rb4 } = await get('/api/coordinator/me/overview', advisorToken);
ok(rb4.status === 403, 'Advisor token on coordinator endpoint => 403');

const { res: noauth } = await get('/api/mentor/me/overview');
ok(noauth.status === 401, 'No token => 401');

// Auth edge cases
console.log('\n[Auth Edge Cases]');
const { res: badLogin } = await post('/api/auth/login', { email: 'bharathi.priya@kct.ac.in', password: 'wrong' });
ok(badLogin.status === 401, 'Wrong password => 401');

const { res: noBody } = await post('/api/auth/login', {});
ok(noBody.status === 400, 'Missing credentials => 400');

// Done
server.close();
console.log('\n' + '='.repeat(40));
console.log('Results: ' + passes + ' passed, ' + failures + ' failed');
if (failures > 0) {
  console.error('BASELINE FAILED - do not proceed with phase implementation');
  process.exit(1);
} else {
  console.log('BASELINE PASSED - safe to implement next phase');
  process.exit(0);
}
