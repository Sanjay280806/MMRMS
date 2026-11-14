import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

describe('Student Activities & Achievements Dynamic Forms API', () => {
  let server;
  let baseUrl;
  let studentToken;

  before(async () => {
    const app = createApp();
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // Login as student (Abhinav Dinesh)
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'abhinav.dinesh@kct.ac.in', password: 'mmrms@2026' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    studentToken = body.data?.accessToken ?? body.token;
  });

  after(() => server.close());

  test('POST /api/student/me/activities records Hackathon with place and semester', async () => {
    const res = await fetch(`${baseUrl}/api/student/me/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        area: 'Hackathon',
        semester: 'Semester 4 (Even Sem · 2026)',
        activityName: 'Smart India Hackathon 2026',
        place: 'IIT Madras',
        achievement: '1st Prize Winner',
        description: 'Developed an AI-based traffic optimization system',
        date: '2026-03-15',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    const data = body.data || body;
    assert.equal(data.area, 'Hackathon');
    assert.equal(data.semester, 'Semester 4 (Even Sem · 2026)');
    assert.equal(data.activityName, 'Smart India Hackathon 2026');
    assert.equal(data.place, 'IIT Madras');
    assert.equal(data.achievement, '1st Prize Winner');
  });

  test('POST /api/student/me/activities records Certification with platform and duration', async () => {
    const res = await fetch(`${baseUrl}/api/student/me/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        area: 'Certification',
        semester: 'Semester 3 (Odd Sem · 2025)',
        activityName: 'AWS Certified Solutions Architect',
        platform: 'Amazon Web Services / Coursera',
        duration: '3 Months (40 Hours)',
        achievement: 'Passed with 910/1000',
        date: '2025-11-20',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    const data = body.data || body;
    assert.equal(data.area, 'Certification');
    assert.equal(data.platform, 'Amazon Web Services / Coursera');
    assert.equal(data.duration, '3 Months (40 Hours)');
  });

  test('POST /api/student/me/activities records Internship with company, location, and dates', async () => {
    const res = await fetch(`${baseUrl}/api/student/me/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        area: 'Internship',
        semester: '2026 Even Sem',
        company: 'Zoho Corporation',
        activityName: 'Software Engineering Intern',
        location: 'Coimbatore Campus',
        startDate: '2026-01-05',
        endDate: '2026-04-30',
        duration: '4 Months',
        achievement: 'Pre-Placement Offer (PPO)',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    const data = body.data || body;
    assert.equal(data.area, 'Internship');
    assert.equal(data.company, 'Zoho Corporation');
    assert.equal(data.location, 'Coimbatore Campus');
    assert.equal(data.startDate, '2026-01-05');
    assert.equal(data.endDate, '2026-04-30');
  });

  test('POST /api/student/me/activities records Paper Presentation with college name', async () => {
    const res = await fetch(`${baseUrl}/api/student/me/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        area: 'Paper Presentation',
        semester: 'Semester 4 (Even Sem · 2026)',
        activityName: 'Autonomous Drone Navigation Using Computer Vision',
        college: 'Kumaraguru College of Technology',
        place: 'Coimbatore',
        achievement: 'Best Research Paper Award',
        date: '2026-02-18',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    const data = body.data || body;
    assert.equal(data.area, 'Paper Presentation');
    assert.equal(data.college, 'Kumaraguru College of Technology');
    assert.equal(data.achievement, 'Best Research Paper Award');
  });

  test('POST /api/student/me/activities records Arts with art category', async () => {
    const res = await fetch(`${baseUrl}/api/student/me/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        area: 'Arts',
        semester: 'Semester 3 (Odd Sem · 2025)',
        artCategory: 'Sports & Games (Athletics, Football, Cricket, Badminton, Chess, etc.)',
        activityName: 'Anna University Intercollegiate Badminton Tournament',
        place: 'KCT Sports Complex',
        achievement: 'Gold Medal / Winners',
        date: '2025-10-12',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    const data = body.data || body;
    assert.equal(data.area, 'Arts');
    assert.equal(data.artCategory, 'Sports & Games (Athletics, Football, Cricket, Badminton, Chess, etc.)');
    assert.equal(data.achievement, 'Gold Medal / Winners');
  });

  test('POST /api/student/me/activities rejects "Events" as it has been removed', async () => {
    const res = await fetch(`${baseUrl}/api/student/me/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        area: 'Events',
        semester: 'Semester 4',
        activityName: 'Generic College Event',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error?.message || '', /Area must be one of/);
  });
});
