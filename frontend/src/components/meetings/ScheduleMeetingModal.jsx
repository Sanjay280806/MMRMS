import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client.js';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { ChipGroup, TextArea, TextField } from '../ui/Field.jsx';
import { AlertBanner } from '../auth/AlertBanner.jsx';

const TOPIC_CATEGORIES = ['Academic', 'Attendance', 'Profile Upgradation', 'Career', 'Others'];
const AGENDA_OPTIONS = [
  'Academic Review',
  'Attendance Review',
  'Placement Preparation',
  'Personal Discussion',
  'Goal Progress',
];
const DURATION_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
];

export function ScheduleMeetingModal({ mentee, onClose, onScheduled }) {
  const today = new Date().toISOString().split('T')[0];
  const [mode, setMode] = useState('Online');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [category, setCategory] = useState('Academic');
  const [agenda, setAgenda] = useState(['Academic Review']);
  const [topicsDiscussed, setTopicsDiscussed] = useState('');
  const [mentorSuggestions, setMentorSuggestions] = useState('');
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');
  const [actionTask, setActionTask] = useState('');
  const [actionTargetDate, setActionTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!mentee) return null;

  function toggleAgenda(item) {
    if (agenda.includes(item)) {
      if (agenda.length > 1) {
        setAgenda(agenda.filter((a) => a !== item));
      }
    } else {
      setAgenda([...agenda, item]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const actionItems = actionTask.trim()
      ? [
          {
            task: actionTask.trim(),
            responsible: 'Student',
            targetDate: actionTargetDate || date,
            status: 'Pending',
          },
        ]
      : [];

    const payload = {
      date,
      durationMinutes,
      mode,
      category,
      agenda,
      topicsDiscussed: topicsDiscussed.trim() || `${category} Mentoring Session`,
      mentorSuggestions: mentorSuggestions.trim() || 'Attend review and work on agreed points.',
      studentConcerns: 'None recorded.',
      supportRequired: 'None.',
      mentorSigned: true,
      studentSigned: false,
      customMeetingUrl: customMeetingUrl.trim() || undefined,
      actionItems,
    };

    try {
      const res = await api(`/mentor/me/mentees/${mentee.id}/meetings`, {
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
      <Card className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="border-b border-line bg-canvas/40 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-indigo-600">
                  Section 12 · Mentoring Session
                </span>
                <Badge tone={mode === 'Online' ? 'indigo' : 'neutral'} size="sm">
                  {mode === 'Online' ? 'Microsoft Teams' : 'In-Person'}
                </Badge>
              </div>
              <h2 className="mt-1 text-base font-bold text-ink sm:text-lg">
                Schedule Meeting with {mentee.name}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Roll No: <strong className="text-ink">{mentee.rollNumber || mentee.id}</strong>
              </p>
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

            {/* Mode Selector */}
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
                  Online (Teams Automated)
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
                  🏢 Offline (Cabin / In-Person)
                </button>
              </div>

              {mode === 'Online' && (
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-indigo-900 font-semibold">
                    <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.5 7.5h-5v5h5v-5zm0-4.5h-5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V5.5A2.5 2.5 0 0 0 19.5 3zM9.5 5.5h-5a2.5 2.5 0 0 0-2.5 2.5v8a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 9.5 5.5z" />
                    </svg>
                    Microsoft Teams Online Meeting
                  </div>
                  <p className="text-[11.5px] text-indigo-700 leading-relaxed">
                    MMRMS automatically schedules the meeting on your KCT Teams calendar. You can also paste an existing Teams room link below if you have a recurring link:
                  </p>
                  <TextField
                    placeholder="https://teams.microsoft.com/... (Leave empty for auto-generated)"
                    value={customMeetingUrl}
                    onChange={(e) => setCustomMeetingUrl(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Date *"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <TextField
                label="Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Duration
              </label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDurationMinutes(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      durationMinutes === opt.value
                        ? 'bg-ink text-white shadow-xs'
                        : 'border border-line bg-white text-muted hover:border-line-strong'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <ChipGroup
              label="Topic Category"
              options={TOPIC_CATEGORIES}
              value={category}
              onChange={setCategory}
            />

            {/* Agenda Checklist */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Agenda Checklist
              </label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {AGENDA_OPTIONS.map((item) => {
                  const selected = agenda.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleAgenda(item)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        selected
                          ? 'bg-indigo-600 text-white'
                          : 'border border-line bg-white text-ink hover:bg-canvas'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topics Discussed / Subject */}
            <TextField
              label="Meeting Subject / Objective *"
              placeholder="e.g. Semester 5 Performance Review & Arrear Clearance"
              value={topicsDiscussed}
              onChange={(e) => setTopicsDiscussed(e.target.value)}
            />

            {/* Mentor Advice / Suggestions */}
            <TextArea
              label="Mentor Suggestions / Discussion Points"
              placeholder="Advice given to student, targets discussed..."
              rows={2}
              value={mentorSuggestions}
              onChange={(e) => setMentorSuggestions(e.target.value)}
            />

            {/* Action Item */}
            <div className="rounded-xl border border-line bg-canvas/30 p-3.5 space-y-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Follow-up Action Item (Optional)
              </span>
              <TextField
                placeholder="e.g. Submit attendance proof to department coordinator"
                value={actionTask}
                onChange={(e) => setActionTask(e.target.value)}
              />
              <TextField
                label="Target Date"
                type="date"
                value={actionTargetDate}
                onChange={(e) => setActionTargetDate(e.target.value)}
              />
            </div>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-line bg-canvas/40 px-6 py-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="md" loading={submitting}>
              {mode === 'Online' ? '📅 Schedule & Generate Teams Link' : 'Save Meeting'}
            </Button>
          </footer>
        </form>
      </Card>
    </div>,
    document.body
  );
}
