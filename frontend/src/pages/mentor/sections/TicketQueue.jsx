import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { DataTable } from '../../../components/ui/DataTable.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { ChipGroup, Label, TextArea, TextField } from '../../../components/ui/Field.jsx';
import { SectionTable } from '../../../components/ui/SectionCard.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { StatTile } from '../../../components/ui/StatTile.jsx';
import { useResource } from '../../../hooks/useResource.js';
import { api } from '../../../api/client.js';

const STATUS_OPTIONS = ['All', 'Raised', 'In Progress', 'Replied', 'Resolved'];
const PRIORITY_OPTIONS = ['All', 'High', 'Medium', 'Low'];
const CATEGORY_OPTIONS = ['All', 'Academic', 'Personal', 'Career', 'Administrative'];

export function TicketQueue({ onOpenMentee }) {
  const { data: tickets, loading, error, reload } = useResource('/mentor/me/support-requests');
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');

  const list = tickets ?? [];

  const total = list.length;
  const raisedCount = list.filter((t) => t.status === 'Raised').length;
  const inProgressCount = list.filter((t) => t.status === 'In Progress').length;
  const repliedCount = list.filter((t) => t.status === 'Replied').length;
  const resolvedCount = list.filter((t) => t.status === 'Resolved').length;

  const filteredTickets = list.filter((t) => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const studentNameStr = String(t.studentName ?? t.student ?? t.name ?? t.menteeName ?? '').toLowerCase();
      const rollNumberStr = String(t.rollNumber ?? '').toLowerCase();
      const subjectStr = String(t.subject ?? '').toLowerCase();
      const detailsStr = String(t.details ?? '').toLowerCase();
      const idStr = String(t.id ?? '').toLowerCase();

      const matchStudent = studentNameStr.includes(q);
      const matchRoll = rollNumberStr.includes(q);
      const matchSubject = subjectStr.includes(q);
      const matchDetails = detailsStr.includes(q);
      const matchId = idStr.includes(q);

      if (!matchStudent && !matchRoll && !matchSubject && !matchDetails && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {error && <EmptyState title="Couldn't load ticket queue" description={error.message} icon="!" />}
      {loading && !tickets && <Skeleton className="h-64 rounded-card" />}

      {tickets && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5">
            <StatTile label="Total Tickets" value={total} tone="slate" hint="Across all mentees" />
            <StatTile label="Raised" value={raisedCount} tone={raisedCount ? 'amber' : 'slate'} hint="Awaiting mentor response" />
            <StatTile label="In Progress" value={inProgressCount} tone={inProgressCount ? 'indigo' : 'slate'} hint="Under investigation" />
            <StatTile label="Replied" value={repliedCount} tone={repliedCount ? 'indigo' : 'slate'} hint="Mentor replied" />
            <StatTile label="Resolved" value={resolvedCount} tone={resolvedCount ? 'green' : 'slate'} hint="Closed requests" />
          </div>

          {/* Filters & Queue */}
          <SectionTable
            section="Support System"
            title="Mentee Ticket Queue"
            subtitle="View, reply, and update support requests raised by your assigned mentees"
            action={<Badge tone={raisedCount ? 'amber' : 'green'} size="md">{raisedCount} Raised</Badge>}
          >
            <div className="border-b border-line bg-surface/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-64">
                  <TextField
                    placeholder="Search by student, ID, or subject..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-muted">Status:</span>
                  <select
                    className="input-field py-1 text-xs"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>

                  <span className="font-semibold text-muted ml-2">Priority:</span>
                  <select
                    className="input-field py-1 text-xs"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>

                  <span className="font-semibold text-muted ml-2">Category:</span>
                  <select
                    className="input-field py-1 text-xs"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <DataTable
              rows={filteredTickets}
              rowKey={(t) => t.id}
              onRowClick={(t) => setSelectedTicket(t)}
              empty={<EmptyState title="No tickets match filters" description="Try adjusting search or status filters." icon="✓" />}
              columns={[
                {
                  key: 'id',
                  header: 'Request ID',
                  render: (t) => <span className="tnum font-mono text-xs font-semibold text-brand-600">{t.id}</span>,
                },
                {
                  key: 'student',
                  header: 'Student',
                  render: (t, i) => (
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={t.studentName ? t.studentName.split(' ').map((n) => n[0]).join('') : 'ST'} seed={i} size="sm" />
                      <div>
                        <div className="font-medium text-ink truncate">{t.studentName}</div>
                        <div className="text-[11px] text-muted-soft">{t.rollNumber} · {t.department}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'category',
                  header: 'Category',
                  render: (t) => <span className="text-xs text-muted-strong font-medium">{t.category}</span>,
                },
                {
                  key: 'priority',
                  header: 'Priority',
                  render: (t) => (
                    <Badge tone={t.priorityTone ?? (t.priority === 'High' ? 'rose' : t.priority === 'Medium' ? 'indigo' : 'slate')}>
                      {t.priority}
                    </Badge>
                  ),
                },
                {
                  key: 'subject',
                  header: 'Subject',
                  className: 'max-w-xs',
                  render: (t) => (
                    <div>
                      <div className="truncate font-medium text-ink">{t.subject}</div>
                      {t.details && <div className="truncate text-[11px] text-muted-soft">{t.details}</div>}
                    </div>
                  ),
                },
                {
                  key: 'raisedOn',
                  header: 'Created',
                  align: 'right',
                  render: (t) => <span className="tnum text-xs text-muted">{t.raisedOn}</span>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  align: 'right',
                  render: (t) => (
                    <Badge tone={t.tone ?? (t.status === 'Resolved' ? 'green' : t.status === 'Raised' ? 'amber' : 'indigo')}>
                      {t.status}
                    </Badge>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  align: 'right',
                  render: (t) => (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicket(t);
                      }}
                    >
                      View & Respond
                    </Button>
                  ),
                },
              ]}
            />
          </SectionTable>
        </>
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdated={() => {
            setSelectedTicket(null);
            reload();
          }}
          onOpenMentee={onOpenMentee}
        />
      )}
    </div>
  );
}

function TicketDetailModal({ ticket, onClose, onUpdated, onOpenMentee }) {
  const [status, setStatus] = useState(ticket.status ?? 'Replied');
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const comments = ticket.comments ?? [];
  const hasComments = comments.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!responseText.trim() && status === ticket.status) {
      setErr('Please add a response message or select a new status.');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/mentor/me/mentees/${ticket.studentId}/support-requests/${ticket.id}`, {
        status,
        response: responseText.trim(),
      });
      onUpdated();
    } catch (e) {
      setErr(e.message || 'Failed to update ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card border border-line bg-white shadow-lift animate-fadeRise p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-brand-600">{ticket.id}</span>
              <Badge tone={ticket.priorityTone ?? (ticket.priority === 'High' ? 'rose' : 'indigo')}>
                {ticket.priority} Priority
              </Badge>
              <Badge tone="slate">{ticket.category}</Badge>
              <Badge tone={ticket.tone ?? (ticket.status === 'Resolved' ? 'green' : ticket.status === 'Raised' ? 'amber' : 'indigo')}>
                {ticket.status}
              </Badge>
            </div>
            <h2 className="mt-2 text-lg font-bold text-ink">{ticket.subject}</h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span>Raised by <strong className="text-ink">{ticket.studentName}</strong> ({ticket.rollNumber})</span>
              <span>·</span>
              <span>{ticket.raisedOn}</span>
              {onOpenMentee && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    className="text-brand-600 hover:underline font-semibold"
                    onClick={() => {
                      onClose();
                      onOpenMentee(ticket.studentId);
                    }}
                  >
                    Open Record Book ↗
                  </button>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Activity & Conversation Thread */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Ticket Conversation & Activity</h3>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {/* Original Request Box */}
            <div className="rounded-card border border-brand-200 bg-brand-50/50 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-strong">
                <span className="font-bold text-brand-800">Student Original Request</span>
                <span className="tnum">{ticket.raisedOn}</span>
              </div>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-medium">
                {ticket.details?.trim() || ticket.subject}
              </p>
            </div>

            {/* Mentor legacy single response if present without comments array */}
            {!hasComments && ticket.response && (
              <div className="rounded-card border border-indigo-200 bg-indigo-50/40 p-4 space-y-1.5 ml-4">
                <div className="flex items-center justify-between text-xs text-muted-strong">
                  <span className="font-bold text-indigo-900">Mentor Response</span>
                </div>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{ticket.response}</p>
              </div>
            )}

            {/* Comment Thread */}
            {hasComments &&
              comments.map((cmt) => (
                <div
                  key={cmt.id}
                  className={`rounded-card border p-4 space-y-1.5 ${
                    cmt.authorRole === 'mentor'
                      ? 'border-indigo-200 bg-indigo-50/40 ml-4'
                      : 'border-slate-200 bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-muted-strong">
                    <span className="font-bold text-ink">
                      {cmt.authorName} <span className="font-normal text-muted">({cmt.authorRole})</span>
                    </span>
                    <span className="tnum text-muted">{cmt.createdAt}</span>
                  </div>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{cmt.message}</p>
                </div>
              ))}

            {!hasComments && !ticket.response && (
              <p className="text-xs text-muted italic px-1">No mentor responses yet.</p>
            )}
          </div>
        </div>

        {/* Update Form */}
        <form onSubmit={handleSubmit} className="border-t border-line pt-4 space-y-4">
          {err && <div className="rounded-md bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">{err}</div>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Update Ticket Status</Label>
              <select
                className="input-field text-xs"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Raised">Raised</option>
                <option value="In Progress">In Progress</option>
                <option value="Replied">Replied</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          <TextArea
            label="Mentor Response / Action Note"
            placeholder="Type your reply or resolution note here..."
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={3}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Send Response & Update'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
