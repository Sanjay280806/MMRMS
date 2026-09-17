/**
 * Phase 0 — Security Headers Tests
 * Run: node --test d:/MMRMS/backend/tests/phase0/security.test.js
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../../src/app.js';

describe('Phase 0 — Security Headers', () => {
  let server;
  let base;

  before(async () => {
    const app = createApp();
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    base = 'http://localhost:' + server.address().port;
  });

  after(() => server.close());

  test('GET /api/health includes X-Frame-Options header', async () => {
    const res = await fetch(base + '/api/health');
    assert.equal(res.status, 200);
    const header = res.headers.get('x-frame-options');
    assert.ok(header, 'X-Frame-Options header must be present (set by helmet)');
  });

  test('GET /api/health includes X-Content-Type-Options header', async () => {
    const res = await fetch(base + '/api/health');
    const header = res.headers.get('x-content-type-options');
    assert.ok(header, 'X-Content-Type-Options header must be present (set by helmet)');
    assert.equal(header.toLowerCase(), 'nosniff');
  });

  test('GET /api/health does not expose X-Powered-By: Express', async () => {
    const res = await fetch(base + '/api/health');
    const header = res.headers.get('x-powered-by');
    assert.equal(header, null, 'X-Powered-By must not be present');
  });

  test('GET /api/health envelope: { success: true, data: { ok, service } }', async () => {
    const res = await fetch(base + '/api/health');
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data?.ok, true);
    assert.equal(json.data?.service, 'mmrms-api');
    assert.ok(json.meta?.timestamp);
    assert.ok(json.meta?.requestId);
  });

  test('Each request gets a unique requestId', async () => {
    const [r1, r2] = await Promise.all([
      fetch(base + '/api/health').then((r) => r.json()),
      fetch(base + '/api/health').then((r) => r.json()),
    ]);
    assert.notEqual(r1.meta.requestId, r2.meta.requestId, 'requestIds must be unique per request');
  });
});
