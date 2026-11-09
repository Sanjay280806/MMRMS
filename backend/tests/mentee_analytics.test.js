import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

describe('Mentor Mentee Analytics & Shortlisting API', () => {
  let server;
  let baseUrl;
  let mentorToken;

  before(async () => {
    const app = createApp();
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = 'http://localhost:' + server.address().port;

    const res = await fetch(baseUrl + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bharathi.priya@kct.ac.in', password: 'mmrms@2026' }),
    });
    const body = await res.json();
    mentorToken = body.data?.accessToken || body.token;
  });

  after(() => server.close());

  test('GET /api/mentor/me/mentee-analytics returns summary and analyzed mentees list', async () => {
    const res = await fetch(baseUrl + '/api/mentor/me/mentee-analytics', {
      headers: { Authorization: 'Bearer ' + mentorToken },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data?.summary, 'Summary object present');
    assert.ok(Array.isArray(body.data?.mentees), 'Mentees array present');

    const summary = body.data.summary;
    assert.equal(summary.totalMentees, 33);
    assert.ok(summary.hackathonAttendeesCount >= 0);
    assert.ok(summary.placementCompleteCount >= 0);
    assert.ok(summary.certified5PlusCount >= 0);
    assert.ok(summary.cgpaAbove8Count >= 0);
    assert.ok(summary.attentionNeededCount >= 0);

    const firstMentee = body.data.mentees[0];
    assert.ok(firstMentee.id);
    assert.ok(firstMentee.name);
    assert.ok(firstMentee.rollNumber);
    assert.equal(typeof firstMentee.hasAttendedHackathon, 'boolean');
    assert.equal(typeof firstMentee.placementProfile?.isComplete, 'boolean');
    assert.equal(typeof firstMentee.has5PlusCertifications, 'boolean');
    assert.equal(typeof firstMentee.isHighCgpa, 'boolean');
    assert.equal(typeof firstMentee.needsAttention, 'boolean');
  });

  test('GET /api/mentor/me/mentee-analytics requires mentor authorization', async () => {
    const res = await fetch(baseUrl + '/api/mentor/me/mentee-analytics');
    assert.equal(res.status, 401);
  });
});
