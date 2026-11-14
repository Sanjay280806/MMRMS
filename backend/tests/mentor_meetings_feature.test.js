import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

describe('Mentor Meetings Management & Reporting API', () => {
  let server;
  let baseUrl;
  let mentorToken;
  let studentToken;

  before(async () => {
    const app = createApp();
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${server.address().port}`;

    // Login as mentor
    const mRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bharathi.priya@kct.ac.in', password: 'mmrms@2026' }),
    });
    const mData = await mRes.json();
    mentorToken = mData.token ?? mData.data?.token;

    // Login as student
    const sRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'abhinav.dinesh@kct.ac.in', password: 'mmrms@2026' }),
    });
    const sData = await sRes.json();
    studentToken = sData.token ?? sData.data?.token;
  });

  after(() => server.close());

  test('GET /api/mentor/me/meetings returns full list of meetings across all mentees', async () => {
    const res = await fetch(`${baseUrl}/api/mentor/me/meetings`, {
      headers: { Authorization: `Bearer ${mentorToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const data = body.data || body;

    assert.ok(Array.isArray(data.meetings));
    assert.ok(data.meetings.length > 0);
    assert.ok(typeof data.total === 'number');
    assert.ok(typeof data.menteesCount === 'number');

    const sample = data.meetings[0];
    assert.ok(sample.menteeName);
    assert.ok(sample.number);
    assert.ok(sample.date);
    assert.ok(sample.mode);
    assert.ok(sample.duration);
  });

  test('GET /api/mentor/me/meetings enforces RBAC (student rejected with 403)', async () => {
    const res = await fetch(`${baseUrl}/api/mentor/me/meetings`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('POST /api/mentor/me/mentees/:id/meetings rejects offline meeting without location (mandatory location)', async () => {
    const res = await fetch(`${baseUrl}/api/mentor/me/mentees/s-101/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mentorToken}` },
      body: JSON.stringify({
        mode: 'Offline',
        topicsDiscussed: 'Review without location',
        actionItems: [{ task: 'Complete task', responsible: 'Student', targetDate: '', status: 'Pending' }],
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    const message = body.message || body.error?.message;
    assert.ok(message.includes('location is mandatory'));
  });

  test('POST /api/mentor/me/mentees/:id/meetings succeeds for offline meeting with location, startTime, endTime', async () => {
    const res = await fetch(`${baseUrl}/api/mentor/me/mentees/s-101/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mentorToken}` },
      body: JSON.stringify({
        mode: 'Offline',
        location: 'Department Seminar Hall 3',
        startTime: '10:00 AM',
        endTime: '10:45 AM',
        durationMinutes: 45,
        topicsDiscussed: 'Placement readiness in Seminar Hall 3',
        actionItems: [{ task: 'Submit mock resume', responsible: 'Student', targetDate: '2026-12-01', status: 'Pending' }],
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    const data = body.data || body;

    assert.equal(data.mode, 'Offline');
    assert.equal(data.location, 'Department Seminar Hall 3');
    assert.equal(data.startTime, '10:00 AM');
    assert.equal(data.endTime, '10:45 AM');
    assert.equal(data.duration, '45 min');
  });

  test('POST /api/mentor/me/meetings/batch records meetings for multiple mentees with location and timing', async () => {
    const res = await fetch(`${baseUrl}/api/mentor/me/meetings/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mentorToken}` },
      body: JSON.stringify({
        menteeIds: ['s-102', 's-103'],
        mode: 'Offline',
        location: 'Innovation Lab Cabin 101',
        startTime: '02:00 PM',
        endTime: '02:40 PM',
        durationMinutes: 40,
        topicsDiscussed: 'Group briefing on project reviews',
        actionItems: [{ task: 'Form groups', responsible: 'Student', targetDate: '2026-12-05', status: 'Pending' }],
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    const data = body.data || body;

    assert.equal(data.count, 2);
    assert.equal(data.meetings.length, 2);
    assert.equal(data.meetings[0].location, 'Innovation Lab Cabin 101');
    assert.equal(data.meetings[0].startTime, '02:00 PM');
    assert.equal(data.meetings[0].endTime, '02:40 PM');
  });

  test('POST /api/student/me/meetings/:meetingId/sign allows student to acknowledge and sign minutes', async () => {
    // 1. Mentor records a meeting for student s-101 with studentSigned = false
    const createRes = await fetch(`${baseUrl}/api/mentor/me/mentees/s-101/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mentorToken}` },
      body: JSON.stringify({
        mode: 'Online',
        date: '2026-11-15',
        startTime: '11:00 AM',
        endTime: '11:30 AM',
        durationMinutes: 30,
        topicsDiscussed: 'Academic and Attendance Review',
        mentorSigned: true,
        studentSigned: false,
        actionItems: [{ task: 'Complete lab exercise', responsible: 'Student', targetDate: '2026-11-20', status: 'Pending' }],
      }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()).data || (await createRes.json());
    assert.equal(created.studentSigned, false);

    // 2. Student signs the meeting
    const signRes = await fetch(`${baseUrl}/api/student/me/meetings/${created.id}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(signRes.status, 200);
    const signBody = await signRes.json();
    const updated = signBody.data || signBody;
    assert.equal(updated.studentSigned, true);
    assert.equal(updated.signed, true);
    assert.ok(updated.studentSignedAt);
  });
});
