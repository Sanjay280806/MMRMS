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

console.log('\n=== Phase 0 Auth Tests ===\n');

// 1. POST /api/auth/login -> 200, body.data.accessToken exists
const res1 = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'bharathi.priya@kct.ac.in', password: 'mmrms@2026' }),
});
const body1 = await res1.json();
ok(res1.status === 200, 'POST /api/auth/login => 200');
ok(!!body1?.data?.accessToken, 'body.data.accessToken exists');

// 2. Set-Cookie header contains mmrms_refresh; HttpOnly
const cookieHeader = res1.headers.get('set-cookie') || '';
ok(cookieHeader.includes('mmrms_refresh') && cookieHeader.includes('HttpOnly'), 'Set-Cookie contains mmrms_refresh and HttpOnly');

// Extract cookie value for subsequent tests
const refreshCookieMatch = cookieHeader.match(/mmrms_refresh=([^;]+)/);
const refreshCookie = refreshCookieMatch ? refreshCookieMatch[1] : '';

// 3. Wrong password -> 401, body.success === false, body.error.code exists
const res2 = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'bharathi.priya@kct.ac.in', password: 'wrongpassword' }),
});
const body2 = await res2.json();
ok(res2.status === 401, 'Wrong password => 401');
ok(body2?.success === false, 'body.success === false');
ok(!!body2?.error?.code, 'body.error.code exists');

// 4. 5 consecutive wrong passwords -> 423
for (let i = 0; i < 4; i++) {
  await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bharathi.priya@kct.ac.in', password: 'wrongpassword' }),
  });
}
const resLock = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'bharathi.priya@kct.ac.in', password: 'wrongpassword' }),
});
const bodyLock = await resLock.json();
ok(resLock.status === 423, '5 consecutive wrong passwords => 423');
ok(bodyLock?.error?.code === 'ACCOUNT_LOCKED', 'body.error.code === ACCOUNT_LOCKED');

// 5. POST /api/auth/refresh with valid cookie -> 200, new accessToken
const resRef = await fetch(`${BASE}/api/auth/refresh`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: `mmrms_refresh=${refreshCookie}`,
  },
});
const bodyRef = await resRef.json();
ok(resRef.status === 200, 'POST /api/auth/refresh with valid cookie => 200');
ok(!!bodyRef?.data?.accessToken, 'POST /api/auth/refresh returns new accessToken');

// 6. POST /api/auth/refresh with no cookie -> 401
const resRefNo = await fetch(`${BASE}/api/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
ok(resRefNo.status === 401, 'POST /api/auth/refresh with no cookie => 401');

// 7. POST /api/auth/logout -> 200, Set-Cookie clears mmrms_refresh
const resLogout = await fetch(`${BASE}/api/auth/logout`, {
  method: 'POST',
});
const logoutCookie = resLogout.headers.get('set-cookie') || '';
ok(resLogout.status === 200, 'POST /api/auth/logout => 200');
ok(logoutCookie.includes('mmrms_refresh=;') || logoutCookie.includes('Expires=Thu, 01 Jan 1970'), 'Logout clears mmrms_refresh cookie');

// 8. All success responses match envelope { success: true, data, meta: { timestamp, requestId } }
ok(body1?.success === true && body1?.meta?.timestamp && body1?.meta?.requestId !== undefined, 'Success envelope structure verified');

// 9. All error responses match { success: false, error: { code, message } }
ok(body2?.success === false && !!body2?.error?.message && !!body2?.error?.code, 'Error envelope structure verified');

server.close();
console.log(`\nPhase 0 Auth Tests: ${passes} passed, ${failures} failed\n`);
if (failures > 0) process.exit(1);
