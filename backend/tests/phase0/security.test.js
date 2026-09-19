/**
 * Phase 0 — Security Headers & RBAC Envelope Tests
 * Run: node tests/phase0/security.test.js
 */

import { createServer } from 'node:http';
import { createApp } from '../../src/app.js';

const app = createApp();
const server = createServer(app);
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const BASE = `http://localhost:${port}`;

let passes = 0;
let failures = 0;

function ok(condition, label) {
  if (condition) {
    console.log('  PASS  ' + label);
    passes++;
  } else {
    console.error('  FAIL  ' + label);
    failures++;
  }
}

function isValidErrorEnvelope(body) {
  return (
    body &&
    body.success === false &&
    typeof body.error?.code === 'string' &&
    typeof body.error?.message === 'string' &&
    typeof body.meta?.timestamp === 'string' &&
    typeof body.meta?.requestId === 'string'
  );
}

async function get(path, tok) {
  const res = await fetch(BASE + path, {
    headers: tok ? { Authorization: 'Bearer ' + tok } : {},
    credentials: 'include',
  });
  const b = await res.json().catch(() => null);
  return { res, body: b };
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const b = await res.json().catch(() => null);
  return { res, body: b };
}

console.log('\n=== Phase 0: Security & Header Tests ===\n');

// 1. Security Headers on /api/health
console.log('[Helmet Security Headers]');
const { res: healthRes } = await get('/api/health');
const frameOptions = healthRes.headers.get('x-frame-options');
const contentTypeOptions = healthRes.headers.get('x-content-type-options');

ok(!!frameOptions, 'GET /api/health => has X-Frame-Options header');
ok(
  contentTypeOptions?.toLowerCase() === 'nosniff',
  'GET /api/health => has X-Content-Type-Options: nosniff header'
);

// 2. Unauthenticated access
console.log('\n[RBAC & Error Envelope Shapes]');
const { res: noAuthRes, body: noAuthBody } = await get('/api/mentor/me/overview');
ok(noAuthRes.status === 401, 'GET /api/mentor/me/overview without token => 401');
ok(isValidErrorEnvelope(noAuthBody), 'GET /api/mentor/me/overview without token => standard error envelope shape');

// 3. Unauthorized access (Student accessing Mentor endpoint)
const { body: studentLoginBody } = await post('/api/auth/login', {
  email: 'abhinav.dinesh@kct.ac.in',
  password: 'mmrms@2026',
});
const studentToken = studentLoginBody?.data?.accessToken || studentLoginBody?.data?.token;

const { res: forbiddenRes, body: forbiddenBody } = await get(
  '/api/mentor/me/overview',
  studentToken
);
ok(forbiddenRes.status === 403, 'GET /api/mentor/me/overview with student token => 403');
ok(isValidErrorEnvelope(forbiddenBody), 'GET /api/mentor/me/overview with student token => standard error envelope shape');

server.close();

console.log('\n' + '='.repeat(40));
console.log(`Results: ${passes} passed, ${failures} failed`);
if (failures > 0) {
  console.error('PHASE 0 SECURITY TESTS FAILED');
  process.exit(1);
} else {
  console.log('PHASE 0 SECURITY TESTS PASSED');
  process.exit(0);
}
