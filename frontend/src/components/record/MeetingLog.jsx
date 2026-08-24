import { useState } from 'react';
import { Badge } from '../ui/Badge.jsx';
import { Card } from '../ui/Card.jsx';
import { DefinitionList } from '../ui/DefinitionList.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { SectionCard } from '../ui/SectionCard.jsx';
import { cx, tone as toneOf } from '../../lib/tone.js';

/**
 * Section 12 — the Mentor Meeting Log. Each meeting renders as the printed
 * minutes: header, agenda, discussion, action items, progress, goal progress,
 * remarks, next review and the signature line.
 */
export function MeetingLog({ meetings, onUpdateAction, savingAction }) {
  const [openId, setOpenId] = useState(meetings.rows[0]?.id ?? null);

  if (!meetings.rows.length) {
    return (
      <SectionCard section="Section 12" title="Mentor Meeting Log">
        <EmptyState
          title="No meetings recorded"
          description="Minutes of each mentoring meeting are recorded here."
          icon="◷"
        />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-5">
      <SectionCard
        section="Section 12"
        title="Mentor Meeting Log"
        subtitle={`${meetings.total} meeting${meetings.total === 1 ? '' : 's'} recorded${
          meetings.nextReviewDate ? ` · next review ${meetings.nextReviewDate}` : ''
        }`}
        action={
          meetings.openActionItems.length > 0 && (
            <Badge tone="amber" size="md">
              {meetings.openActionItems.length} open action item
              {meetings.openActionItems.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      >
        <ol className="space-y-2.5">
          {meetings.rows.map((meeting) => (
            <li key={meeting.id}>
              <MeetingEntry
                meeting={meeting}
                open={openId === meeting.id}
                onToggle={() => setOpenId(openId === meeting.id ? null : meeting.id)}
                onUpdateAction={onUpdateAction}
                savingAction={savingAction}
              />
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}

function MeetingEntry({ meeting, open, onToggle, onUpdateAction, savingAction }) {
  return (
    <Card as="article" className={cx('overflow-hidden', open && 'ring-1 ring-brand-200')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left transition hover:bg-canvas/60"
      >
        <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-ink text-white">
          <span className="text-[8.5px] uppercase tracking-[.08em] opacity-60">Mtg</span>
          <span className="tnum text-[13px] font-bold leading-none">{meeting.number}</span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tnum text-[13px] font-semibold text-ink">{meeting.date}</span>
            <Badge tone={meeting.modeTone}>{meeting.mode}</Badge>
            {meeting.category && <Badge tone="indigo">{meeting.category}</Badge>}
            <span className="text-[11.5px] text-muted">{meeting.duration}</span>
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-muted">{meeting.agenda.join(' · ')}</p>
        </div>

        <div className="flex items-center gap-2">
          {meeting.actionSummary.total > 0 && (
            <Badge tone={meeting.actionSummary.closed === meeting.actionSummary.total ? 'green' : 'amber'}>
              {meeting.actionSummary.closed}/{meeting.actionSummary.total} actions
            </Badge>
          )}
          {meeting.signed && <Badge tone="green">Signed</Badge>}
          <span aria-hidden="true" className={cx('text-[10px] text-muted-soft transition', open && 'rotate-180')}>
            ▼
          </span>
        </div>
      </button>

      {open && (
        <div className="space-y-5 border-t border-line bg-canvas/40 px-5 py-5">
          <AgendaChecklist agenda={meeting.agenda} />

          <DefinitionList
            columns={1}
            items={[
              { key: 'Topics Discussed', value: meeting.topicsDiscussed },
              { key: 'Student Concerns', value: meeting.studentConcerns },
              { key: 'Mentor Suggestions', value: meeting.mentorSuggestions },
              { key: 'Support Required', value: meeting.supportRequired },
            ]}
          />

          <MeetingEvidence photoProofs={meeting.photoProofs} geotag={meeting.geotag} />

          <ActionItems
            items={meeting.actionItems}
            onUpdate={onUpdateAction}
            saving={savingAction}
          />

          <div>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
              Progress Since Last Meeting
            </p>
            <DefinitionList
              columns={3}
              items={[
                { key: 'Achievements', value: meeting.progressSinceLastMeeting.achievements },
                { key: 'Pending Tasks', value: meeting.progressSinceLastMeeting.pendingTasks },
                { key: 'Improvement Observed', value: meeting.progressSinceLastMeeting.improvementObserved },
              ]}
            />
          </div>

          {meeting.goalProgress.length > 0 && (
            <div>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
                SMART Goal Progress
              </p>
              <ul className="space-y-3">
                {meeting.goalProgress.map((gp) => (
                  <li key={gp.goalId} className="rounded-xl border border-line bg-white p-3.5">
                    <p className="text-[12.5px] font-semibold text-ink">{gp.goal}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">{gp.currentStatus}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <ProgressBar className="flex-1" percent={gp.progress} tone="indigo" height="h-1.5" />
                      <span className="tnum text-[11.5px] font-semibold text-muted-strong">
                        {gp.progress}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Remark label="Mentor Remarks" text={meeting.mentorRemarks} tone="indigo" />
            <Remark label="Student Remarks" text={meeting.studentRemarks} tone="slate" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[12px] text-muted">
              Next review date:{' '}
              <strong className="tnum font-semibold text-ink">{meeting.nextReviewDate}</strong>
            </p>
            <div className="flex gap-2">
              <SignatureChip label="Mentor" signed={meeting.mentorSigned} />
              <SignatureChip label="Student" signed={meeting.studentSigned} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function AgendaChecklist({ agenda }) {
  const ALL = [
    'Academic Review',
    'Attendance Review',
    'Placement Preparation',
    'Personal Discussion',
    'Goal Progress',
    'Other',
  ];

  return (
    <div>
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
        Agenda
      </p>
      <ul className="flex flex-wrap gap-2">
        {ALL.map((item) => {
          const covered = agenda.includes(item);
          return (
            <li
              key={item}
              className={cx(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px]',
                covered
                  ? 'border-brand-500/25 bg-brand-500/10 font-semibold text-brand-500'
                  : 'border-line text-muted-faint',
              )}
            >
              <span aria-hidden="true">{covered ? '✓' : '○'}</span>
              {item}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MeetingEvidence({ photoProofs = [], geotag }) {
  if (!photoProofs.length && !geotag) return null;

  const locationUrl = geotag
    ? `https://www.google.com/maps?q=${geotag.latitude},${geotag.longitude}`
    : null;

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Meeting Evidence</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {photoProofs.map((photo, index) => (
          <a
            key={`${photo.name}-${index}`}
            href={photo.dataUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-[11.5px] font-semibold text-ink hover:border-muted-soft"
          >
            View photo: {photo.name}
          </a>
        ))}
        {locationUrl && (
          <a
            href={locationUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-[11.5px] font-semibold text-ink hover:border-muted-soft"
          >
            View captured location
          </a>
        )}
      </div>
    </div>
  );
}

function ActionItems({ items, onUpdate, saving }) {
  if (!items.length) {
    return (
      <p className="text-[12.5px] text-muted-soft">No action items were recorded for this meeting.</p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
        Action Items
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              {['Task', 'Responsible', 'Target Date', 'Status'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[.06em] text-muted-soft"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-line/70 last:border-0">
                <td className="px-3.5 py-2.5 text-[12.5px] text-ink">{item.task}</td>
                <td className="px-3.5 py-2.5 text-[12.5px] text-muted-strong">{item.responsible}</td>
                <td className="tnum px-3.5 py-2.5 text-[12.5px] text-muted-strong">{item.targetDate}</td>
                <td className="px-3.5 py-2.5 text-right">
                  {onUpdate && item.responsible === 'Student' ? (
                    <select
                      aria-label={`${item.task} status`}
                      value={item.status}
                      disabled={saving === item.id}
                      onChange={(e) => onUpdate(item.id, e.target.value)}
                      className="focus-ring rounded-lg border border-line-strong bg-white px-2 py-1 text-[11.5px] font-semibold text-ink disabled:opacity-60"
                    >
                      {['Pending', 'In Progress', 'Completed'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge tone={item.tone}>{item.status}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Remark({ label, text, tone }) {
  const t = toneOf(tone);
  return (
    <div className={cx('rounded-xl px-4 py-3.5', t.bg)}>
      <p className={cx('text-[10.5px] font-semibold uppercase tracking-[.07em]', t.text)}>{label}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{text}</p>
    </div>
  );
}

function SignatureChip({ label, signed }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        signed ? 'bg-good/[0.14] text-good-ink' : 'border border-dashed border-line-strong text-muted-soft',
      )}
    >
      <span aria-hidden="true">{signed ? '✓' : '○'}</span>
      {label} signature
    </span>
  );
}
