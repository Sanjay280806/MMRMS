import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

describe('Mentor Messages Endpoint Verification', () => {
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
    mentorToken = body.token ?? body.data?.token;
  });

  after(() => server.close());

  test('GET /api/mentor/me/messages returns conversation list with lastSent and lastDelivered', async () => {
    const res = await fetch(baseUrl + '/api/mentor/me/messages', {
      headers: { Authorization: 'Bearer ' + mentorToken },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.conversations));
    assert.ok(body.data.conversations.length > 0);

    const s101 = body.data.conversations.find((c) => c.menteeId === 's-101');
    assert.ok(s101, 'Mentee s-101 should exist in conversations');
    assert.equal(s101.menteeName, 'ABHINAV DINESH');
    assert.ok(s101.lastSentMessage, 's-101 should have a lastSentMessage');
    assert.equal(s101.lastSentMessage.from, 'mentor');
    assert.ok(s101.lastDeliveredMessage, 's-101 should have a lastDeliveredMessage');
    assert.equal(s101.lastDeliveredMessage.from, 'student');
  });

  test('POST /api/mentor/me/mentees/:id/messages adds a mentor message', async () => {
    const testText = 'Checking in on your progress for the capstone project.';
    const res = await fetch(baseUrl + '/api/mentor/me/mentees/s-101/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + mentorToken,
      },
      body: JSON.stringify({ text: testText }),
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.from, 'mentor');
    assert.equal(body.data.text, testText);

    // Verify it updates lastSentMessage in GET /me/messages
    const listRes = await fetch(baseUrl + '/api/mentor/me/messages', {
      headers: { Authorization: 'Bearer ' + mentorToken },
    });
    const listBody = await listRes.json();
    const s101 = listBody.data.conversations.find((c) => c.menteeId === 's-101');
    assert.equal(s101.lastSentMessage.text, testText);
  });

  test('POST /api/mentor/me/teams/broadcast broadcasts to 5 students via Teams & MMRMS', async () => {
    const studentIds = ['s-101', 's-102', 's-103', 's-104', 's-105'];
    const broadcastText = 'Reminder: Tomorrow review meeting is scheduled at 10:00 AM via Teams.';

    const res = await fetch(baseUrl + '/api/mentor/me/teams/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + mentorToken,
      },
      body: JSON.stringify({
        studentIds,
        text: broadcastText,
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.recipientCount, 5);
    assert.ok(body.data.recipients.length === 5);
    assert.ok(body.data.teamsDeepLink.includes('teams.microsoft.com'));
    assert.equal(body.data.mentorTeamsEmail, 'bharathi.priya@kct.ac.in');

    // Verify each recipient received the message in their MMRMS message thread
    for (const sId of studentIds) {
      const msgRes = await fetch(baseUrl + `/api/mentor/me/mentees/${sId}/messages`, {
        headers: { Authorization: 'Bearer ' + mentorToken },
      });
      const msgBody = await msgRes.json();
      const lastMsg = msgBody.data.messages[msgBody.data.messages.length - 1];
      assert.equal(lastMsg.text, broadcastText);
      assert.equal(lastMsg.from, 'mentor');
      assert.equal(lastMsg.viaTeams, true);
    }
  });

  test('Broadcast to all 33 students creates a Teams group first time and reuses it on subsequent times', async () => {
    // Get all 33 mentees
    const listRes = await fetch(baseUrl + '/api/mentor/me/messages', {
      headers: { Authorization: 'Bearer ' + mentorToken },
    });
    const listBody = await listRes.json();
    const all33Ids = listBody.data.conversations.map((c) => c.menteeId);
    assert.equal(all33Ids.length, 33, 'Mentor should have 33 mentees');

    // First broadcast to all 33: creates new Teams group
    const firstRes = await fetch(baseUrl + '/api/mentor/me/teams/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + mentorToken,
      },
      body: JSON.stringify({
        studentIds: all33Ids,
        text: 'Initial message to all 33 students: Welcome to Semester Mentoring cohort!',
      }),
    });
    const firstBody = await firstRes.json();
    assert.equal(firstRes.status, 201);
    assert.equal(firstBody.data.isAllStudents, true);
    assert.equal(firstBody.data.isFirstTimeGroup, true);
    assert.ok(firstBody.data.teamsGroup?.id);
    const initialGroupId = firstBody.data.teamsGroup.id;
    assert.equal(firstBody.data.teamsGroup.messageCount, 1);

    // Second broadcast to all 33: reuses the EXACT SAME Teams group (no duplicate)
    const secondRes = await fetch(baseUrl + '/api/mentor/me/teams/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + mentorToken,
      },
      body: JSON.stringify({
        studentIds: all33Ids,
        text: 'Second broadcast: Please submit your placement preference sheets by Friday.',
      }),
    });
    const secondBody = await secondRes.json();
    assert.equal(secondRes.status, 201);
    assert.equal(secondBody.data.isAllStudents, true);
    assert.equal(secondBody.data.isFirstTimeGroup, false);
    assert.equal(secondBody.data.teamsGroup.id, initialGroupId, 'Must reuse the exact same group ID');
    assert.equal(secondBody.data.teamsGroup.messageCount, 2);

    // Verify GET /me/teams/group also returns this persistent group
    const groupCheckRes = await fetch(baseUrl + '/api/mentor/me/teams/group', {
      headers: { Authorization: 'Bearer ' + mentorToken },
    });
    const groupCheckBody = await groupCheckRes.json();
    assert.equal(groupCheckBody.data.exists, true);
    assert.equal(groupCheckBody.data.group.id, initialGroupId);
    assert.equal(groupCheckBody.data.group.messageCount, 2);
  });
});
