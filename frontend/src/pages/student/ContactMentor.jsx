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
import { useResource } from '../../hooks/useResource.js';
import { AcknowledgeConcernModal } from '../../components/concerns/AcknowledgeConcernModal.jsx';
import { formatUploadDate } from '../../lib/fileUpload.js';

const PRIORITY_SELECTED = {
  Low: 'border-neutral bg-neutral text-white',
  Medium: 'border-brand-500 bg-brand-500 text-white',
  High: 'border-bad-ink bg-bad-ink text-white',
};

const DEFAULT_CATEGORIES = ['Academic', 'Personal', 'Administrative', 'Financial', 'Infrastructure', 'Career', 'Others'];
const DEFAULT_PRIORITIES = ['Low', 'Medium', 'High'];

/**
 * Student Concern Management and Communication Hub (Q6).
 * Enables students to raise concerns, monitor mentor resolution,
 * examine attached evidence, and formally acknowledge closure.
 */
export function ContactMentor({ support, mentor, onMessageAdded }) {
  const { data: concernsData, loading: concernsLoading, reload: reloadConcerns } = useResource('/student/me/concerns');

  const categories = concernsData?.categories || support?.categories || DEFAULT_CATEGORIES;
  const priorities = concernsData?.priorities || support?.priorities || DEFAULT_PRIORITIES;

  const [category, setCategory] = useState(categories[0] || 'Academic');
  const [priority, setPriority] = useState('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const [acknowledgingConcern, setAcknowledgingConcern] = useState(null);

  const concerns = concernsData?.concerns ?? [];
  const pendingAcknowledgment = concerns.filter((c) => c.status === 'RESOLVED');

  async function submit(event) {
    event.preventDefault();
    if (!subject.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      await api('/student/me/concerns', {
        method: 'POST',
        body: {
          subject: subject.trim(),
          category,
          priority,
          description: description.trim(),
        },
      });

      setSubject('');
      setDescription('');
      setSent(true);
      reloadConcerns();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Pending Acknowledgment Alert Banner */}
      {pendingAcknowledgment.length > 0 && (
        <div className="rounded-xl border border-brand-300 bg-brand-500/10 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                !
              </span>
              <div>
                <p className="text-[13px] font-bold text-brand-900">
                  {pendingAcknowledgment.length === 1
                    ? '1 Concern Resolved — Acknowledgment Required'
                    : `${pendingAcknowledgment.length} Concerns Resolved — Acknowledgment Required`}
                </p>
                <p className="text-xs text-brand-700">
                  Your mentor has addressed: &quot;{pendingAcknowledgment[0].subject}&quot;. Please review the resolution and attached evidence to confirm closure.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setAcknowledgingConcern(pendingAcknowledgment[0])}
            >
              Review & Acknowledge
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Raise a Concern Form */}
        <SectionCard
          title="Raise a Concern"
          subtitle={
            mentor
              ? `Directly sent to ${mentor.name}. Enters your mentor's action queue with tracking.`
              : 'Directly enters your mentor’s action queue.'
          }
        >
          <form className="space-y-4" onSubmit={submit}>
            <ChipGroup label="Category" options={categories} value={category} onChange={setCategory} />
            <ChipGroup
              label="Priority"
              options={priorities}
              value={priority}
              onChange={setPriority}
              toneFor={(key) => PRIORITY_SELECTED[key]}
            />

            <TextField
              label="Subject *"
              placeholder="e.g. Remedial support request for Digital Systems"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setSent(false);
              }}
              required
            />

            <TextArea
              label="Details / Description"
              placeholder="Explain the background, specific difficulty, or required assistance..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {error && <AlertBanner tone="rose" title={error} />}

            <div className="flex items-center gap-3">
              <Button type="submit" loading={sending} disabled={!subject.trim()}>
                Submit to Mentor
              </Button>
              {sent && (
                <span className="text-[12.5px] font-medium text-good-ink">
                  ✓ Concern raised — logged with status OPEN in your mentor's queue.
                </span>
              )}
            </div>
          </form>
        </SectionCard>

        {/* Message Thread */}
        <SectionCard title="Direct Messages" subtitle={mentor?.name}>
          <MessageThread
            messages={support?.messages || []}
            selfRole="student"
            onSend={async (text) => {
              if (onMessageAdded) {
                onMessageAdded(await api('/student/me/messages', { method: 'POST', body: { text } }));
              }
            }}
          />
        </SectionCard>
      </div>

      {/* Concerns & Grievances Table */}
      <SectionTable
        title="My Concerns & Resolution Lifecycle"
        subtitle={`${concerns.length} logged · ${pendingAcknowledgment.length} awaiting acknowledgment`}
        action={
          <Badge tone={concerns.some((c) => c.status === 'OPEN') ? 'amber' : 'green'} size="md">
            {concerns.filter((c) => c.status === 'OPEN').length} active open
          </Badge>
        }
      >
        <DataTable
          rows={concerns}
          rowKey={(r) => r.id}
          loading={concernsLoading}
          empty={<EmptyState title="No concerns raised yet" description="Any questions or support concerns you raise will appear here." />}
          columns={[
            {
              key: 'subject',
              header: 'Concern Details',
              render: (r) => (
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{r.subject}</p>
                  <p className="tnum mt-0.5 text-[11.5px] text-muted">
                    {r.id} · {r.category} · Raised {formatUploadDate(r.raisedAt)}
                  </p>
                  {r.resolution && (
                    <p className="mt-1 line-clamp-1 text-[11.5px] text-good-ink">
                      Resolution: {r.resolution}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: 'priority',
              header: 'Priority',
              align: 'right',
              render: (r) => (
                <Badge tone={r.priority === 'High' ? 'rose' : r.priority === 'Medium' ? 'amber' : 'neutral'}>
                  {r.priority}
                </Badge>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              align: 'right',
              render: (r) => {
                if (r.status === 'OPEN') {
                  return <Badge tone="amber">OPEN</Badge>;
                }
                if (r.status === 'RESOLVED') {
                  return (
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone="indigo">Pending Acknowledgment</Badge>
                      <Button
                        type="button"
                        size="xs"
                        tone="good"
                        onClick={() => setAcknowledgingConcern(r)}
                      >
                        Review & Acknowledge
                      </Button>
                    </div>
                  );
                }
                return <Badge tone="green">CLOSED</Badge>;
              },
            },
          ]}
        />
      </SectionTable>

      {/* Acknowledge Concern Modal */}
      {acknowledgingConcern && (
        <AcknowledgeConcernModal
          concern={acknowledgingConcern}
          onClose={() => setAcknowledgingConcern(null)}
          onAcknowledged={() => {
            setAcknowledgingConcern(null);
            reloadConcerns();
          }}
        />
      )}
    </div>
  );
}
