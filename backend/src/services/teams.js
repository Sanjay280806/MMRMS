import { getMicrosoftOAuthConfig } from './microsoftAuth.js';

/**
 * Microsoft Teams Meeting Service via Microsoft Graph API.
 * Uses Delegated Permissions (OnlineMeetings.ReadWrite, Calendars.ReadWrite)
 * granted by Kumaraguru College of Technology IT Admin.
 */

/**
 * Create a REAL Microsoft Teams online meeting.
 *
 * @param {Object} options
 * @param {string} options.subject - Subject or topic of the meeting
 * @param {string} options.date - Date in YYYY-MM-DD
 * @param {number} [options.durationMinutes=30]
 * @param {string} [options.userToken] - Delegated Microsoft Graph token of the logged-in mentor
 * @param {string} [options.menteeEmail] - Optional mentee email for calendar invite
 * @returns {Promise<{ joinWebUrl: string, meetingId: string } | null>}
 */
export async function createTeamsMeeting({
  subject,
  date,
  durationMinutes = 30,
  userToken = null,
  menteeEmail = null,
}) {
  const start = new Date(date || Date.now());
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  if (!userToken) {
    console.warn(
      '[Teams] No Microsoft delegated token found. The mentor must sign in using "Continue with Microsoft" to create authentic Teams meetings directly on their KCT account.'
    );
    return null;
  }

  // Strategy 1: Create directly via Microsoft Graph onlineMeetings API
  try {
    const meetingPayload = {
      subject: `MMRMS Mentoring: ${subject || 'One-on-One Session'}`,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      lobbyBypassSettings: {
        scope: 'organization',
        isDialInBypassEnabled: true,
      },
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingPayload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.joinWebUrl) {
      console.log('[Teams] Successfully created Teams online meeting:', data.joinWebUrl);
      return {
        joinWebUrl: data.joinWebUrl,
        meetingId: data.id,
      };
    } else {
      console.warn('[Teams] onlineMeetings creation returned status:', res.status, data?.error?.message || data);
    }
  } catch (err) {
    console.warn('[Teams] onlineMeetings endpoint error:', err.message);
  }

  // Strategy 2: Create via Outlook Calendar Event with isOnlineMeeting = true
  try {
    const eventPayload = {
      subject: `MMRMS Mentoring: ${subject || 'One-on-One Session'}`,
      start: {
        dateTime: start.toISOString().replace('Z', ''),
        timeZone: 'India Standard Time',
      },
      end: {
        dateTime: end.toISOString().replace('Z', ''),
        timeZone: 'India Standard Time',
      },
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
    };

    if (menteeEmail) {
      eventPayload.attendees = [
        {
          emailAddress: { address: menteeEmail },
          type: 'required',
        },
      ];
    }

    const eventRes = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    const eventData = await eventRes.json().catch(() => ({}));

    if (eventRes.ok && eventData?.onlineMeeting?.joinUrl) {
      console.log('[Teams] Successfully created Teams meeting via Calendar Event:', eventData.onlineMeeting.joinUrl);
      return {
        joinWebUrl: eventData.onlineMeeting.joinUrl,
        meetingId: eventData.id,
      };
    } else {
      console.warn('[Teams] Calendar event online meeting returned status:', eventRes.status, eventData?.error?.message || eventData);
    }
  } catch (err) {
    console.warn('[Teams] Calendar event creation error:', err.message);
  }

  return null;
}
