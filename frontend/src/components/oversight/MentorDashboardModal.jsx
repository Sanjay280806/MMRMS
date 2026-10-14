import { createPortal } from 'react-dom';
import { Badge, HealthBadge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { DataTable } from '../ui/DataTable.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { StatTile } from '../ui/StatTile.jsx';
import { useResource } from '../../hooks/useResource.js';

export function MentorDashboardModal({ mentorId, onClose, onOpenMentee }) {
  const { data, loading, error } = useResource(`/coordinator/me/mentors/${mentorId}`);

  if (!mentorId) return null;

  const mentor = data?.mentor;
  const mentees = data?.mentees ?? [];
  const dashboard = data?.dashboard;
  const stats = dashboard?.stats;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="border-b border-line bg-canvas/40 px-6 py-4.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-brand-600">
                  Year Coordinator · Mentor Read-Only Oversight
                </span>
                {data?.cohortId && (
                  <Badge tone="indigo" size="sm">
                    Cohort {data.cohortId}
                  </Badge>
                )}
              </div>
              <h2 className="mt-1 text-lg font-bold text-ink sm:text-xl">
                {mentor?.name || 'Faculty Mentor Dashboard'}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {mentor?.designation} · {mentor?.staffCode} · {mentor?.email} · Cabin: {mentor?.cabin || '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-neutral/10 hover:text-ink focus-ring"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading && !data && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Skeleton className="h-24 rounded-card" />
                <Skeleton className="h-24 rounded-card" />
                <Skeleton className="h-24 rounded-card" />
                <Skeleton className="h-24 rounded-card" />
              </div>
              <Skeleton className="h-64 rounded-card" />
            </div>
          )}

          {error && <EmptyState title="Couldn't load mentor dashboard" description={error.message} icon="!" />}

          {data && (
            <>
              {/* Stat tiles */}
              {stats && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatTile
                    label="Assigned Mentees"
                    value={mentees.length}
                    caption={`Cohort ${data.cohortId}`}
                    tone="slate"
                  />
                  <StatTile
                    label="Review Compliance"
                    value={`${stats.compliance}%`}
                    caption={`${stats.meetingsHeld} of ${stats.meetingsPlanned} reviews`}
                    tone={stats.compliance >= 80 ? 'green' : 'amber'}
                  />
                  <StatTile
                    label="Average Health"
                    value={stats.averageHealth}
                    caption="Composite health index"
                    tone={stats.averageHealth >= 70 ? 'green' : 'amber'}
                  />
                  <StatTile
                    label="At-Risk Learners"
                    value={stats.flaggedCount}
                    caption={`${stats.attendanceShortfalls} att. · ${stats.standingArrears} arr.`}
                    tone={stats.flaggedCount ? 'rose' : 'green'}
                  />
                </div>
              )}

              {/* Mentees within Cohort Table */}
              <div className="rounded-xl border border-line bg-white">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-strong">
                    Assigned Mentees in Cohort ({mentees.length})
                  </h3>
                  <span className="text-[11px] text-muted">Click student row to inspect record book</span>
                </div>

                <DataTable
                  rows={mentees}
                  rowKey={(m) => m.id}
                  onRowClick={(m) => {
                    if (onOpenMentee) {
                      onClose();
                      onOpenMentee(m.id);
                    }
                  }}
                  empty={<EmptyState title="No mentees found" description="No mentees in this cohort." icon="✓" />}
                  columns={[
                    {
                      key: 'student',
                      header: 'Student',
                      render: (m) => (
                        <div>
                          <p className="font-semibold text-ink">{m.name}</p>
                          <p className="tnum text-[11px] text-muted">{m.rollNumber} · {m.section}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'health',
                      header: 'Health',
                      align: 'right',
                      render: (m) => <HealthBadge value={m.health} tone={m.healthTone} />,
                    },
                    {
                      key: 'cgpa',
                      header: 'CGPA',
                      align: 'right',
                      render: (m) => <span className="tnum font-medium">{m.cgpa.toFixed(1)}</span>,
                    },
                    {
                      key: 'attendance',
                      header: 'Attendance',
                      align: 'right',
                      render: (m) => (
                        <span className={`tnum ${m.attendanceBelowRequirement ? 'font-semibold text-bad-ink' : ''}`}>
                          {m.attendance}%
                        </span>
                      ),
                    },
                    {
                      key: 'reviews',
                      header: 'Reviews Held',
                      align: 'right',
                      render: (m) => (
                        <span className="tnum text-muted">
                          {m.meetingsHeld} / {m.meetingsDue}
                        </span>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      align: 'right',
                      render: (m) => (
                        <Badge tone={m.flagTone ?? (m.health < 70 ? 'rose' : 'green')}>
                          {m.flagReason ?? 'On Track'}
                        </Badge>
                      ),
                    },
                  ]}
                />
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center justify-end border-t border-line bg-canvas/30 px-6 py-3.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close Oversight View
          </Button>
        </footer>
      </Card>
    </div>,
    document.body,
  );
}
