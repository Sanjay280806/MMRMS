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

  async function submit(event) {
    event.preventDefault();
    if (!subject.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      onRequestAdded(
        await api('/student/me/support-requests', {
          method: 'POST',
          body: { subject: subject.trim(), category, priority },
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
          <DataTable
            rows={support.requests}
            rowKey={(r) => r.id}
            empty={<EmptyState title="No requests yet" description="Anything you raise appears here." />}
            columns={[
              {
                key: 'subject',
                header: 'Request',
                render: (r) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.subject}</p>
                    <p className="tnum mt-0.5 text-[11.5px] text-muted">
                      {r.id} · {r.category} · {r.raisedOn}
                    </p>
                  </div>
                ),
              },
              {
                key: 'priority',
                header: 'Priority',
                align: 'right',
                render: (r) => <Badge tone={r.priorityTone}>{r.priority}</Badge>,
              },
              {
                key: 'status',
                header: 'Status',
                align: 'right',
                render: (r) => <Badge tone={r.tone}>{r.status}</Badge>,
              },
            ]}
          />
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
