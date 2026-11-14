import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client.js';
import { useResource } from '../../hooks/useResource.js';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { TextField } from '../ui/Field.jsx';
import { AlertBanner } from '../auth/AlertBanner.jsx';

export function ScheduleMeetingModal({ mentee, onClose, onScheduled }) {
  const today = new Date().toISOString().split('T')[0];
  const { data: roster } = useResource(mentee ? '' : '/mentor/me/mentees?limit=100', { enabled: !mentee });
  const [selectedMenteeId, setSelectedMenteeId] = useState(mentee?.id || '');
  const [mode, setMode] = useState('Online');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [objective, setObjective] = useState('');
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const activeMentee = mentee || (roster?.mentees ?? []).find((m) => m.id === selectedMenteeId);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const targetMenteeId = mentee?.id || selectedMenteeId;
    if (!targetMenteeId) {
      setError('Please select a student for this meeting.');
      return;
    }

    if (!date?.trim()) {
      setError('Meeting date is required.');
      return;
    }

    if (!objective.trim()) {
      setError('Please enter the one-line meeting objective.');
      return;
    }

    if (mode === 'Offline' && !location.trim()) {
      setError('Meeting location / venue is mandatory for offline meetings.');
      return;
    }

    setSubmitting(true);

    const [sh, sm] = (time || '10:00').split(':').map(Number);
    const totalMin = (sh || 0) * 60 + (sm || 0) + 30; // standard 30 min duration
    const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const endM = String(totalMin % 60).padStart(2, '0');
    const endTime = `${endH}:${endM}`;

    const cleanObjective = objective.trim();

    const payload = {
      date,
      startTime: time || '10:00',
      endTime,
      durationMinutes: 30,
      mode,
      location: mode === 'Online' ? 'Microsoft Teams' : location.trim() || 'Campus',
      category: 'Academic',
      agenda: [cleanObjective],
      agendaNotes: cleanObjective,
      topicsDiscussed: cleanObjective,
      mentorSuggestions: 'Scheduled session. Guidance and minutes will be recorded during review.',
      studentConcerns: 'None recorded.',
      supportRequired: 'None.',
      mentorSigned: true,
      studentSigned: false,
      customMeetingUrl: customMeetingUrl.trim() || undefined,
    };

    try {
      const res = await api(`/mentor/me/mentees/${targetMenteeId}/meetings`, {
        method: 'POST',
        body: payload,
      });
      onScheduled?.(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule meeting');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <Card className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl rounded-2xl border border-line">
        <header className="border-b border-line bg-canvas/40 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-indigo-600">
                  Mentoring Session
                </span>
                <Badge tone={mode === 'Online' ? 'indigo' : 'neutral'} size="sm">
                  {mode === 'Online' ? 'Microsoft Teams' : 'In-Person'}
                </Badge>
              </div>
              <h2 className="mt-1 text-base font-bold text-ink sm:text-lg">
                {activeMentee ? `Schedule Meeting with ${activeMentee.name}` : 'Schedule Mentoring Session'}
              </h2>
              {activeMentee ? (
                <p className="mt-0.5 text-xs text-muted">
                  Roll No: <strong className="text-ink">{activeMentee.rollNumber || activeMentee.id}</strong>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted">
                  Quickly schedule an online or offline mentoring session.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg p-1.5 text-muted hover:bg-neutral/10 hover:text-ink focus-ring"
            >
              ✕
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && <AlertBanner tone="rose" title={error} />}

            {/* 1. Mentee Selection (if not pre-selected) */}
            {!mentee && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Select Student <span className="text-bad-ink">*</span>
                </label>
                <select
                  value={selectedMenteeId}
                  onChange={(e) => setSelectedMenteeId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-medium text-ink focus-ring"
                  required
                >
                  <option value="">-- Choose Mentee --</option>
                  {(roster?.mentees ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.rollNumber || m.id}) {m.department ? `· ${m.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Mode Selector */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Meeting Mode
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('Online')}
                  className={`flex items-center justify-center gap-2.5 rounded-xl border p-3 text-xs font-semibold transition ${
                    mode === 'Online'
                      ? 'border-[#464EB8] bg-[#464EB8]/10 text-[#464EB8] shadow-xs'
                      : 'border-line bg-white text-muted hover:border-line-strong'
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.5 7.5h-5v5h5v-5zm0-4.5h-5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V5.5A2.5 2.5 0 0 0 19.5 3zM9.5 5.5h-5a2.5 2.5 0 0 0-2.5 2.5v8a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 9.5 5.5z" />
                  </svg>
                  Online (Teams)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('Offline')}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition ${
                    mode === 'Offline'
                      ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-xs'
                      : 'border-line bg-white text-muted hover:border-line-strong'
                  }`}
                >
                  🏢 Offline (In-Person)
                </button>
              </div>

              {mode === 'Online' && (
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-indigo-900 font-semibold">
                    <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.5 7.5h-5v5h5v-5zm0-4.5h-5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V5.5A2.5 2.5 0 0 0 19.5 3zM9.5 5.5h-5a2.5 2.5 0 0 0-2.5 2.5v8a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 9.5 5.5z" />
                    </svg>
                    Microsoft Teams Online Session
                  </div>
                  <p className="text-[11.5px] text-indigo-700 leading-relaxed">
                    Automatically schedules the meeting on your KCT Teams calendar. Optionally provide a custom room link:
                  </p>
                  <TextField
                    placeholder="https://teams.microsoft.com/... (Optional)"
                    value={customMeetingUrl}
                    onChange={(e) => setCustomMeetingUrl(e.target.value)}
                  />
                </div>
              )}

              {mode === 'Offline' && (
                <div className="mt-3 rounded-xl border border-line bg-canvas/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink font-semibold">
                      Meeting Location / Venue <span className="text-bad-ink">*</span>
                    </span>
                    <span className="text-[11px] font-semibold text-bad-ink">Mandatory for offline</span>
                  </div>
                  <TextField
                    placeholder="e.g. Cabin 204, Seminar Hall 2, Academic Block A"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required={mode === 'Offline'}
                  />
                </div>
              )}
            </div>

            {/* 3. Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Date *"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <TextField
                label="Time *"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            {/* 4. One-line Meeting Objective */}
            <div>
              <TextField
                label="One-line Meeting Objective *"
                placeholder="e.g. Semester 5 Performance Review & Career Mentoring"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                required
              />
              <p className="mt-1 text-[11px] text-muted">
                A brief one-line description of the purpose of this mentoring session.
              </p>
            </div>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-line bg-canvas/40 px-6 py-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={submitting} className="rounded-xl px-4 py-2 font-semibold">
              {mode === 'Online' ? '📅 Schedule Teams Meeting' : 'Schedule Meeting'}
            </Button>
          </footer>
        </form>
      </Card>
    </div>,
    document.body
  );
}
