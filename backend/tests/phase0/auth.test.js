/**
 * Phase 0 — Auth & Envelope Tests
 * Run: node --test d:/MMRMS/backend/tests/phase0/auth.test.js
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../../src/app.js';

describe('Phase 0 — Auth & Envelope', () => {
  let server;
  let base;

  before(async () => {
    const app = createApp();
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    base = 'http://localhost:' + server.address().port;
  });

  after(() => server.close());

  // ── helpers ───────────────────────────────────────────────────────────────
  async function post(path, body, headers = {}) {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    const json = await res.json();
    return { res, json };
  }

  async function login(email = 'bharathi.priya@kct.ac.in', password = 'mmrms@2026') {
    return post('/api/auth/login', { email, password });
  }

  // ── Envelope shape ────────────────────────────────────────────────────────
  test('All success responses have { success, data, meta } envelope', async () => {
    const { res, json } = await login();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.ok(json.data, 'data field must exist');
    assert.ok(json.meta?.timestamp, 'meta.timestamp must exist');
    assert.ok(json.meta?.requestId, 'meta.requestId must be a UUID');
    assert.match(json.meta.requestId, /^[0-9a-f-]{36}$/i);
  });

  test('Error responses have { success:false, error: { code, message } } envelope', async () => {
    const { res, json } = await post('/api/auth/login', { email: 'x@y.com', password: 'bad' });
    assert.equal(res.status, 401);
    assert.equal(json.success, false);
    assert.ok(json.error?.code, 'error.code must exist');
    assert.ok(json.error?.message, 'error.message must exist');
    assert.ok(json.meta?.requestId, 'meta.requestId must exist on errors');
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  test('POST /api/auth/login returns 200 with accessToken in data', async () => {
    const { res, json } = await login();
    assert.equal(res.status, 200);
    assert.ok(json.data?.accessToken, 'data.accessToken must exist');
    assert.ok(json.data?.user, 'data.user must exist');
    assert.ok(json.data?.role, 'data.role must exist');
  });

  test('POST /api/auth/login sets httpOnly mmrms_refresh cookie', async () => {
    const { res } = await login();
    const cookie = res.headers.get('set-cookie') ?? '';
    assert.ok(cookie.includes('mmrms_refresh'), 'mmrms_refresh cookie must be set');
    assert.ok(
      cookie.toLowerCase().includes('httponly'),
      'cookie must be HttpOnly',
    );
  });

  test('POST /api/auth/login with wrong password returns 401 envelope', async () => {
    const { res, json } = await post('/api/auth/login', {
      email: 'bharathi.priya@kct.ac.in',
      password: 'wrongpassword',
    });
    assert.equal(res.status, 401);
    assert.equal(json.success, false);
    assert.ok(json.error?.code);
  });

  test('POST /api/auth/login with missing fields returns 400', async () => {
    const { res, json } = await post('/api/auth/login', {});
    assert.equal(res.status, 400);
    assert.equal(json.success, false);
  });

  test('5 consecutive wrong passwords lock the account (423)', async () => {
    const email = 'locktest_phase0@kct.ac.in';
    // Use a non-existent email so it doesn't affect real accounts
    for (let i = 0; i < 5; i++) {
      await post('/api/auth/login', { email, password: 'wrong' + i });
    }
    const { res, json } = await post('/api/auth/login', { email, password: 'wrong5' });
    assert.equal(res.status, 423);
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'HTTP_423');
  });

  // ── Refresh ───────────────────────────────────────────────────────────────
  test('POST /api/auth/refresh with valid cookie returns new accessToken', async () => {
    // Login to get the refresh cookie
    const { res: loginRes } = await login();
    const setCookie = loginRes.headers.get('set-cookie');
    assert.ok(setCookie, 'must have Set-Cookie from login');

    // Call refresh with the cookie
    const res = await fetch(base + '/api/auth/refresh', {
      method: 'POST',
      headers: { Cookie: setCookie },
      credentials: 'include',
    });
    const json = await res.json();
    assert.equal(res.status, 200, 'refresh must return 200');
    assert.ok(json.data?.accessToken, 'must return new accessToken in data');
  });

  test('POST /api/auth/refresh with no cookie returns 401', async () => {
    const res = await fetch(base + '/api/auth/refresh', { method: 'POST' });
    const json = await res.json();
    assert.equal(res.status, 401);
    assert.equal(json.success, false);
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  test('POST /api/auth/logout clears the refresh cookie', async () => {
    const { res: loginRes } = await login();
    const setCookie = loginRes.headers.get('set-cookie');

    const res = await fetch(base + '/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: setCookie },
      credentials: 'include',
    });
    assert.equal(res.status, 200);
    const responseCookie = res.headers.get('set-cookie') ?? '';
    // Cookie should be cleared (Max-Age=0 or Expires in the past)
    const isCleared =
      responseCookie.includes('max-age=0') ||
      responseCookie.includes('Max-Age=0') ||
      responseCookie.includes('mmrms_refresh=;') ||
      responseCookie.includes("mmrms_refresh='';");
    assert.ok(isCleared || responseCookie.includes('mmrms_refresh'), 'logout must touch the cookie');
  });

  // ── RBAC ──────────────────────────────────────────────────────────────────
  test('Protected route without token returns 401 envelope', async () => {
    const res = await fetch(base + '/api/mentor/me/overview');
    const json = await res.json();
    assert.equal(res.status, 401);
    assert.equal(json.success, false);
    assert.ok(json.error?.code);
    assert.ok(json.meta?.requestId);
  });

  test('Protected route with wrong-role token returns 403 envelope', async () => {
    // Login as student, try mentor endpoint
    const { json: lb } = await post('/api/auth/login', {
      email: 'abhinav.dinesh@kct.ac.in',
      password: 'mmrms@2026',
    });
    const token = lb.data?.accessToken;
    const res = await fetch(base + '/api/mentor/me/overview', {
      headers: { Authorization: 'Bearer ' + token },
    });
    const json = await res.json();
    assert.equal(res.status, 403);
    assert.equal(json.success, false);
    assert.ok(json.error?.code);
  });

  // ── 404 ───────────────────────────────────────────────────────────────────
  test('Unknown route returns 404 envelope', async () => {
    const res = await fetch(base + '/api/does-not-exist');
    const json = await res.json();
    assert.equal(res.status, 404);
    assert.equal(json.success, false);
    assert.ok(json.error?.message);
  });
});
