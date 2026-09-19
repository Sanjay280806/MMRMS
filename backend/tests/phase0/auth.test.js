/**
 * Phase 0 — Auth & Token Verification Tests
 * Run: node tests/phase0/auth.test.js
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

function isValidSuccessEnvelope(body) {
  return (
    body &&
    body.success === true &&
    body.data !== undefined &&
    typeof body.meta?.timestamp === 'string' &&
    typeof body.meta?.requestId === 'string'
  );
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

async function post(path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const b = await res.json().catch(() => null);
  return { res, body: b };
}

console.log('\n=== Phase 0: Auth & Security Tests ===\n');

// 1. Successful login
console.log('[Login & Token Lifecycle]');
const { res: loginRes, body: loginBody } = await post('/api/auth/login', {
  email: 'bharathi.priya@kct.ac.in',
  password: 'mmrms@2026',
});
ok(loginRes.status === 200, 'POST /api/auth/login => 200');
ok(!!loginBody?.data?.accessToken, 'POST /api/auth/login => body.data.accessToken exists');
ok(isValidSuccessEnvelope(loginBody), 'POST /api/auth/login => matches success envelope shape');

// 2. Cookie verification
const setCookie = loginRes.headers.get('set-cookie') || '';
ok(
  setCookie.includes('mmrms_refresh') && setCookie.toLowerCase().includes('httponly'),
  'POST /api/auth/login => Set-Cookie contains mmrms_refresh; HttpOnly'
);

// Extract cookie value for refresh test
const cookieMatch = setCookie.match(/mmrms_refresh=[^;]+/);
const refreshCookie = cookieMatch ? cookieMatch[0] : '';

// 3. Wrong password error
console.log('\n[Password Verification & Lockout]');
const { res: wrongRes, body: wrongBody } = await post('/api/auth/login', {
  email: 'asmitha.shree@kct.ac.in',
  password: 'wrongpassword',
});
ok(wrongRes.status === 401, 'Wrong password => 401');
ok(wrongBody?.success === false, 'Wrong password => body.success === false');
ok(!!wrongBody?.error?.code, 'Wrong password => body.error.code exists');
ok(isValidErrorEnvelope(wrongBody), 'Wrong password => matches error envelope shape');

// 4. 5 consecutive wrong passwords => 423 lockout
let lockoutRes, lockoutBody;
for (let i = 0; i < 4; i++) {
  const res = await post('/api/auth/login', {
    email: 'asmitha.shree@kct.ac.in',
    password: 'wrongpassword',
  });
  lockoutRes = res.res;
  lockoutBody = res.body;
}
ok(lockoutRes.status === 423, '5 consecutive wrong passwords => 423');
ok(lockoutBody?.success === false, 'Locked response => body.success === false');
ok(lockoutBody?.error?.code === 'ACCOUNT_LOCKED', 'Locked response => body.error.code === ACCOUNT_LOCKED');
ok(isValidErrorEnvelope(lockoutBody), 'Locked response => matches error envelope shape');

// 5. POST /api/auth/refresh with valid cookie
console.log('\n[Token Refresh & Logout]');
const { res: refreshRes, body: refreshBody } = await post(
  '/api/auth/refresh',
  {},
  { Cookie: refreshCookie }
);
ok(refreshRes.status === 200, 'POST /api/auth/refresh with valid cookie => 200');
ok(!!refreshBody?.data?.accessToken, 'POST /api/auth/refresh => new accessToken issued');
ok(isValidSuccessEnvelope(refreshBody), 'POST /api/auth/refresh => matches success envelope shape');

// 6. POST /api/auth/refresh with no cookie => 401
const { res: noCookieRes, body: noCookieBody } = await post('/api/auth/refresh', {});
ok(noCookieRes.status === 401, 'POST /api/auth/refresh with no cookie => 401');
ok(noCookieBody?.success === false, 'POST /api/auth/refresh no cookie => body.success === false');
ok(isValidErrorEnvelope(noCookieBody), 'POST /api/auth/refresh no cookie => matches error envelope shape');

// 7. POST /api/auth/logout => 200, Set-Cookie clears mmrms_refresh
const { res: logoutRes, body: logoutBody } = await post('/api/auth/logout', {});
ok(logoutRes.status === 200, 'POST /api/auth/logout => 200');
ok(isValidSuccessEnvelope(logoutBody), 'POST /api/auth/logout => matches success envelope shape');

const logoutCookie = logoutRes.headers.get('set-cookie') || '';
ok(
  logoutCookie.includes('mmrms_refresh') &&
    (logoutCookie.includes('Max-Age=0') || logoutCookie.includes('Expires=Thu, 01 Jan 1970')),
  'POST /api/auth/logout => Set-Cookie clears mmrms_refresh'
);

server.close();

console.log('\n' + '='.repeat(40));
console.log(`Results: ${passes} passed, ${failures} failed`);
if (failures > 0) {
  console.error('PHASE 0 AUTH TESTS FAILED');
  process.exit(1);
} else {
  console.log('PHASE 0 AUTH TESTS PASSED');
  process.exit(0);
}
