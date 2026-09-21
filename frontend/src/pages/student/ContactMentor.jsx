import { useState } from 'react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ChipGroup, TextArea, TextField } from '../../components/ui/Field.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SectionCard, SectionTable } from '../../components/ui/SectionCard.jsx';
import { AlertBanner } from '../../components/auth/AlertBanner.jsx';
import { MessageThread } from '../../components/dashboard/MessageThread.jsx';

const PRIORITY_SELECTED = {
  Low: 'border-neutral bg-neutral text-white',
  Medium: 'border-brand-500 bg-brand-500 text-white',
  High: 'border-bad-ink bg-bad-ink text-white',
};

/**
 * Concerns raised between meetings. They surface at the next review as the
 * meeting's "Student Concerns" and "Support Required" (Section 12).
 */
export function ContactMentor({ support, mentor, onRequestAdded, onMessageAdded }) {
  const [category, setCategory] = useState(support.categories[0]);
  const [priority, setPriority] = useState('Medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const [expandedRequestId, setExpandedRequestId] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (!subject.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      onRequestAdded(
        await api('/student/me/support-requests', {
          method: 'POST',
          body: { subject: subject.trim(), category, priority, details: message.trim() },
        }),
      );

      if (message.trim()) {
        onMessageAdded(
          await api('/student/me/messages', { method: 'POST', body: { text: message.trim() } }),
        );
      }

      setSubject('');
      setMessage('');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard
        title="Raise a Concern"
        subtitle={
          mentor
            ? `Goes to ${mentor.name} and appears at your next review as a student concern.`
            : undefined
        }
      >
        <form className="space-y-4" onSubmit={submit}>
          <ChipGroup label="Type" options={support.categories} value={category} onChange={setCategory} />
          <ChipGroup
            label="Priority"
            options={support.priorities}
            value={priority}
            onChange={setPriority}
            toneFor={(key) => PRIORITY_SELECTED[key]}
          />

          <TextField
            label="Subject"
            placeholder="Briefly, what is this about?"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setSent(false);
            }}
          />

          <TextArea
            label="Details"
            placeholder="Add any context your mentor should know…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {error && <AlertBanner tone="rose" title={error} />}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={sending} disabled={!subject.trim()}>
              Send to mentor
            </Button>
            {sent && (
              <span className="text-[12.5px] font-medium text-good-ink">
                ✓ Raised — your mentor has been notified.
              </span>
            )}
          </div>
        </form>
      </SectionCard>

      <div className="space-y-5">
        <SectionTable title="My Requests" subtitle={`${support.requests.length} raised this term`}>
          <div className="divide-y divide-line">
            {support.requests.length === 0 ? (
              <EmptyState title="No requests yet" description="Anything you raise appears here." />
            ) : (
              support.requests.map((r) => {
                const isExpanded = expandedRequestId === r.id;
                const comments = r.comments ?? [];
                const hasComments = comments.length > 0;

                return (
                  <div key={r.id} className="p-4 space-y-3 transition-colors hover:bg-surface/50">
                    <div
                      className="flex items-start justify-between gap-3 cursor-pointer"
                      onClick={() => setExpandedRequestId(isExpanded ? null : r.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="tnum font-mono text-xs font-semibold text-brand-600">{r.id}</span>
                          <span className="text-xs font-semibold text-muted-strong">{r.category}</span>
                          <Badge tone={r.priorityTone ?? 'slate'} size="sm">{r.priority}</Badge>
                        </div>
                        <p className="mt-1 font-semibold text-ink text-sm">{r.subject}</p>
                        <p className="tnum mt-0.5 text-[11.5px] text-muted">Created {r.raisedOn}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <Badge tone={r.tone}>{r.status}</Badge>
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-brand-600 hover:underline"
                        >
                          {isExpanded ? 'Hide details ▲' : 'View responses ▼'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details & comment thread */}
                    {isExpanded && (
                      <div className="rounded-card border border-line bg-surface/70 p-3.5 space-y-3 mt-2 text-xs">
                        {r.details && (
                          <div className="border-b border-line/60 pb-2.5">
                            <span className="font-bold text-muted uppercase text-[10px] tracking-wider block mb-1">Original Request Context</span>
                            <p className="text-ink font-medium leading-relaxed whitespace-pre-wrap">{r.details}</p>
                          </div>
                        )}

                        <div>
                          <span className="font-bold text-muted uppercase text-[10px] tracking-wider block mb-2">Mentor Responses & Activity</span>
                          
                          {!hasComments && !r.response && (
                            <p className="text-muted italic">No responses from mentor yet.</p>
                          )}

                          {!hasComments && r.response && (
                            <div className="rounded border border-indigo-200 bg-indigo-50/50 p-2.5">
                              <span className="font-bold text-indigo-900 block mb-1">Mentor Response</span>
                              <p className="text-ink leading-relaxed whitespace-pre-wrap">{r.response}</p>
                            </div>
                          )}

                          {hasComments && (
                            <div className="space-y-2">
                              {comments.map((cmt) => (
                                <div
                                  key={cmt.id}
                                  className={`rounded border p-2.5 space-y-1 ${
                                    cmt.authorRole === 'mentor'
                                      ? 'border-indigo-200 bg-indigo-50/50'
                                      : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-ink">{cmt.authorName} ({cmt.authorRole})</span>
                                    <span className="tnum text-muted">{cmt.createdAt}</span>
                                  </div>
                                  <p className="text-ink leading-relaxed whitespace-pre-wrap">{cmt.message}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </SectionTable>

        <SectionCard title="Messages" subtitle={mentor?.name}>
          <MessageThread
            messages={support.messages}
            selfRole="student"
            onSend={async (text) =>
              onMessageAdded(await api('/student/me/messages', { method: 'POST', body: { text } }))
            }
          />
        </SectionCard>
      </div>
    </div>
  );
}
