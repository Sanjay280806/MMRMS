import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

describe('Microsoft OAuth 2.0 Authentication', () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AZURE_CLIENT_ID = 'test-client-id-123456';
    process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
    process.env.AZURE_TENANT_ID = 'test-tenant-id';
    process.env.AZURE_REDIRECT_URI = 'http://localhost:4000/api/auth/microsoft/callback';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    const app = createApp();
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = 'http://localhost:' + server.address().port;
  });

  after(() => {
    if (server) server.close();
  });

  test('GET /api/auth/microsoft/config returns configuration status', async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/config`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.configured, true);
    assert.equal(body.data.tenantId, 'test-tenant-id');
    assert.ok(body.data.clientId.startsWith('test-cli'));
  });

  test('GET /api/auth/microsoft/login (format=json) generates authorization URL and state cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/login?format=json`);
    const body = await res.json();
    const setCookie = res.headers.get('set-cookie');

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.authUrl);
    assert.ok(body.data.state);

    const authUrl = new URL(body.data.authUrl);
    assert.equal(authUrl.hostname, 'login.microsoftonline.com');
    assert.equal(authUrl.pathname, '/test-tenant-id/oauth2/v2.0/authorize');
    assert.equal(authUrl.searchParams.get('client_id'), 'test-client-id-123456');
    assert.equal(authUrl.searchParams.get('response_type'), 'code');
    assert.equal(authUrl.searchParams.get('redirect_uri'), 'http://localhost:4000/api/auth/microsoft/callback');
    assert.equal(authUrl.searchParams.get('state'), body.data.state);
    assert.ok(authUrl.searchParams.get('scope').includes('User.Read'));

    assert.ok(setCookie, 'Expected Set-Cookie header');
    assert.ok(setCookie.includes('mmrms_oauth_state='), 'Expected mmrms_oauth_state cookie');
  });

  test('GET /api/auth/microsoft/login redirects to Microsoft Entra authorization endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/login`, {
      redirect: 'manual',
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location);
    assert.ok(location.startsWith('https://login.microsoftonline.com/test-tenant-id/oauth2/v2.0/authorize'));
  });

  test('GET /api/auth/microsoft/callback handles error returned by Microsoft', async () => {
    const res = await fetch(
      `${baseUrl}/api/auth/microsoft/callback?error=access_denied&error_description=User%20cancelled%20consent`,
      { redirect: 'manual' }
    );

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location.startsWith('http://localhost:5173/login?error='));
    assert.ok(location.includes('User%20cancelled%20consent') || location.includes('User+cancelled+consent'));
  });

  test('GET /api/auth/microsoft/callback handles CSRF state mismatch', async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/callback?code=some-code&state=forged-state`, {
      redirect: 'manual',
      headers: {
        Cookie: 'mmrms_oauth_state=original-state',
      },
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location.includes('error='));
    assert.ok(location.includes('Invalid') || location.includes('CSRF'));
  });

  test('GET /api/auth/microsoft/callback handles missing code', async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/callback`, {
      redirect: 'manual',
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location.includes('error='));
    assert.ok(location.includes('Authorization%20code%20missing') || location.includes('Authorization+code+missing'));
  });

  test('GET /api/auth/microsoft/callback succeeds for registered institutional user', async () => {
    const state = 'valid-test-state';
    const mockCode = 'mock-code:bharathi.priya@kct.ac.in';

    const res = await fetch(
      `${baseUrl}/api/auth/microsoft/callback?code=${encodeURIComponent(mockCode)}&state=${state}`,
      {
        redirect: 'manual',
        headers: {
          Cookie: `mmrms_oauth_state=${state}`,
        },
      }
    );

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.equal(location, 'http://localhost:5173/login?sso_success=true');

    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
    const joinedCookies = setCookies.join('; ');

    assert.ok(joinedCookies.includes('mmrms_token='), 'Expected mmrms_token cookie');
    assert.ok(joinedCookies.includes('mmrms_refresh='), 'Expected mmrms_refresh cookie');
    assert.ok(joinedCookies.includes('HttpOnly'), 'Expected HttpOnly cookies');
  });

  test('GET /api/auth/microsoft/callback redirects with error when user email is not registered', async () => {
    const state = 'valid-test-state';
    const mockCode = 'mock-code:unregistered.person@gmail.com';

    const res = await fetch(
      `${baseUrl}/api/auth/microsoft/callback?code=${encodeURIComponent(mockCode)}&state=${state}`,
      {
        redirect: 'manual',
        headers: {
          Cookie: `mmrms_oauth_state=${state}`,
        },
      }
    );

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location.includes('error='));
    assert.ok(location.includes('No%20MMRMS%20account') || location.includes('No+MMRMS+account'));
  });

  test('POST /api/auth/microsoft/exchange programmatic exchange succeeds and issues valid tokens', async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'mock-code:bharathi.priya@kct.ac.in',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);
    assert.equal(body.data.user.email, 'bharathi.priya@kct.ac.in');
    assert.equal(body.data.role.key, 'mentor');
    assert.equal(body.data.provider, 'microsoft');

    // Use issued token to access authenticated endpoint
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${body.data.accessToken}` },
    });
    const meBody = await meRes.json();
    assert.equal(meRes.status, 200);
    assert.equal(meBody.data.user.email, 'bharathi.priya@kct.ac.in');
  });

  test('POST /api/auth/microsoft/exchange returns 404 for unknown user', async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'mock-code:nonexistent@kct.ac.in',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'USER_NOT_FOUND');
  });

  test('POST /api/auth/microsoft/exchange rejects missing code with 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.success, false);
  });
});
