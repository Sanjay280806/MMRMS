import { useState } from 'react';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { DataTable } from '../../../components/ui/DataTable.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { SectionCard, SectionTable } from '../../../components/ui/SectionCard.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { useResource } from '../../../hooks/useResource.js';
import { AddressConcernModal } from '../../../components/concerns/AddressConcernModal.jsx';
import { fileSizeLabel, formatUploadDate } from '../../../lib/fileUpload.js';

/** Section 12 across the roster — every action item still open and student concerns queue. */
export function ActionItemQueue({ onOpenMentee }) {
  const { data, loading, error, reload: reloadActions } = useResource('/mentor/me/action-items');
  const { data: concernsData, loading: concernsLoading, reload: reloadConcerns } = useResource('/mentor/me/concerns');

  const [addressingConcern, setAddressingConcern] = useState(null);
  const [showResolvedHistory, setShowResolvedHistory] = useState(false);

  const reloadAll = () => {
    reloadActions();
    reloadConcerns();
  };

  const concernsList = concernsData?.concerns ?? [];
  const openConcerns = concernsList.filter((c) => c.status === 'OPEN');
  const resolvedConcerns = concernsList.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED');

  // Filter regular meeting action items (exclude concern type if already displayed separately)
  const meetingItems = (data ?? []).filter((a) => a.itemType !== 'concern');
  const mine = meetingItems.filter((a) => a.responsible === 'Mentor');
  const theirs = meetingItems.filter((a) => a.responsible !== 'Mentor');

  return (
    <div className="space-y-6">
      {/* 1. Student Concerns Section */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink sm:text-lg">Student Concerns Requiring Action</h3>
              <Badge tone={openConcerns.length ? 'rose' : 'green'} size="md">
                {openConcerns.length} pending
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Concerns raised directly by your assigned mentees. Review, resolve, and attach evidence.
            </p>
          </div>
          {resolvedConcerns.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setShowResolvedHistory((v) => !v)}
            >
              {showResolvedHistory ? 'Hide Resolution History' : `View Resolution History (${resolvedConcerns.length})`}
            </Button>
          )}
        </div>

        {concernsLoading && !concernsData && <Skeleton className="h-40 rounded-card" />}

        {openConcerns.length === 0 ? (
          <SectionCard>
            <EmptyState
              title="No open student concerns"
              description="All student grievances and academic concerns have been addressed."
              icon="✓"
            />
          </SectionCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {openConcerns.map((concern) => {
              const priorityTone =
                concern.priority === 'High' ? 'rose' : concern.priority === 'Medium' ? 'amber' : 'neutral';
              return (
                <div
                  key={concern.id}
                  className="flex flex-col justify-between rounded-xl border border-line-strong bg-white p-4 shadow-xs transition hover:border-brand-300"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {concern.category}
                      </span>
                      <Badge tone={priorityTone} size="sm">
                        {concern.priority} Priority
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-[13.5px] font-bold text-ink">{concern.subject}</h4>
                      <p className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed">
                        {concern.description || 'No additional details provided.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-line text-xs text-muted">
                      <Avatar initials={concern.studentName.slice(0, 2)} size="xs" />
                      <span className="font-medium text-ink">{concern.studentName}</span>
                      <span>·</span>
                      <span className="tnum">{concern.rollNumber}</span>
                      <span>·</span>
                      <span className="tnum">{formatUploadDate(concern.raisedAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-line">
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => onOpenMentee(concern.studentId)}
                    >
                      View Student Book
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setAddressingConcern(concern)}
                    >
                      Address Concern
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Resolved Concerns History */}
        {showResolvedHistory && (
          <div className="mt-4 rounded-xl border border-line bg-canvas/30 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-strong">
              Previously Resolved Student Concerns ({resolvedConcerns.length})
            </h4>
            <div className="mt-3 space-y-2.5">
              {resolvedConcerns.map((concern) => (
                <div
                  key={concern.id}
                  className="rounded-lg border border-line bg-white p-3.5 text-xs shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink">{concern.subject}</span>
                      <Badge tone={concern.status === 'CLOSED' ? 'green' : 'indigo'} size="sm">
                        {concern.status === 'CLOSED' ? 'Closed & Acknowledged' : 'Pending Student Acknowledgment'}
                      </Badge>
                    </div>
                    <span className="text-muted">
                      {concern.studentName} ({concern.rollNumber})
                    </span>
                  </div>

                  <div className="mt-2 rounded-md bg-canvas/60 p-2.5 text-[12px] text-muted-strong leading-relaxed">
                    <strong className="text-ink">Resolution:</strong> {concern.resolution}
                  </div>

                  {concern.evidence?.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-muted">Evidence:</span>
                      {concern.evidence.map((ev) => (
                        <a
                          key={ev.id}
                          href={ev.dataUrl}
                          download={ev.name}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-line bg-white px-2 py-0.5 text-[11px] font-medium text-brand-600 hover:underline"
                        >
                          📎 {ev.name} ({fileSizeLabel(ev.size)})
                        </a>
                      ))}
                    </div>
                  )}

                  {concern.studentFeedback && (
                    <p className="mt-2 text-[11.5px] italic text-good-ink">
                      Student acknowledgment note: &quot;{concern.studentFeedback}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. Meeting Action Items Section */}
      {error && <EmptyState title="Couldn't load action items" description={error.message} icon="!" />}
      {loading && !data && <Skeleton className="h-64 rounded-card" />}

      {data && (
        <>
          <Queue
            title="Meeting Actions Owned by you"
            subtitle="Follow-up tasks from mentoring reviews assigned to you"
            rows={mine}
            onOpenMentee={onOpenMentee}
            emptyTitle="Nothing on your plate"
          />
          <Queue
            title="Meeting Actions Owned by students"
            subtitle="Follow these up at the next review"
            rows={theirs}
            onOpenMentee={onOpenMentee}
            emptyTitle="Students have closed all meeting actions"
          />
        </>
      )}

      {/* Address Concern Modal */}
      {addressingConcern && (
        <AddressConcernModal
          concern={addressingConcern}
          onClose={() => setAddressingConcern(null)}
          onResolved={() => {
            setAddressingConcern(null);
            reloadAll();
          }}
        />
      )}
    </div>
  );
}

function Queue({ title, subtitle, rows, onOpenMentee, emptyTitle }) {
  return (
    <SectionTable
      section="Section 12"
      title={title}
      subtitle={subtitle}
      action={<Badge tone={rows.length ? 'amber' : 'green'} size="md">{rows.length} open</Badge>}
    >
      <DataTable
        rows={rows}
        rowKey={(a) => a.id}
        onRowClick={(a) => onOpenMentee(a.studentId)}
        empty={<EmptyState title={emptyTitle} description="Nothing outstanding." icon="✓" />}
        columns={[
          {
            key: 'student',
            header: 'Student',
            render: (a, i) => (
              <div className="flex items-center gap-2.5">
                <Avatar initials={a.initials} seed={i} size="sm" />
                <span className="truncate font-medium">{a.student}</span>
              </div>
            ),
          },
          { key: 'task', header: 'Task', className: 'text-muted-strong' },
          {
            key: 'meeting',
            header: 'From',
            align: 'right',
            render: (a) => (
              <span className="tnum text-[12px] text-muted">
                Mtg {a.meetingNumber} · {a.meetingDate}
              </span>
            ),
          },
          { key: 'targetDate', header: 'Target', align: 'right', render: (a) => <span className="tnum">{a.targetDate}</span> },
          { key: 'status', header: 'Status', align: 'right', render: (a) => <Badge tone={a.tone}>{a.status}</Badge> },
        ]}
      />
    </SectionTable>
  );
}
