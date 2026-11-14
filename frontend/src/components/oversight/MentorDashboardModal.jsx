import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { DataTable } from '../ui/DataTable.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { StatTile } from '../ui/StatTile.jsx';
import { useResource } from '../../hooks/useResource.js';
import { api } from '../../api/client.js';

export function MentorDashboardModal({ mentorId, onClose, onOpenMentee, onReload }) {
  const { data, loading, error, reload } = useResource(`/coordinator/me/mentors/${mentorId}`);
  const [menteesList, setMenteesList] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => {
    if (data?.mentees) {
      setMenteesList(data.mentees);
    }
  }, [data]);

  if (!mentorId) return null;

  const mentor = data?.mentor;
  const dashboard = data?.dashboard;
  const stats = dashboard?.stats;

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (select) => {
    if (select) {
      setSelectedStudentIds(new Set(menteesList.map((m) => m.id)));
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const handleBulkUnassign = async () => {
    if (selectedStudentIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete / remove ${selectedStudentIds.size} student(s) from ${mentor?.name || 'this mentor'}?`)) {
      return;
    }

    setDeletingId('bulk');
    setActionError(null);
    setActionSuccess(null);

    try {
      for (const sId of selectedStudentIds) {
        await api(`/coordinator/me/mentors/${mentorId}/unassign-student`, {
          method: 'POST',
          body: { studentId: sId },
        });
      }
      setMenteesList((prev) => prev.filter((m) => !selectedStudentIds.has(m.id)));
      setActionSuccess(`Successfully deleted ${selectedStudentIds.size} student(s) from ${mentor?.name || 'mentor'}.`);
      setSelectedStudentIds(new Set());
      setDeleteMode(false);
      if (onReload) onReload();
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to remove students');
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    ...(deleteMode
      ? [
          {
            key: 'select',
            header: '',
            align: 'center',
            render: (m) => (
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedStudentIds.has(m.id)}
                  onChange={() => toggleSelectStudent(m.id)}
                  className="rounded border-line text-brand-600 focus:ring-brand-500"
                />
              </div>
            ),
          },
        ]
      : []),
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
        <Badge tone={m.flagTone ?? (m.attendanceBelowRequirement || m.standingArrears > 0 ? 'rose' : 'green')}>
          {m.flagReason ?? 'On Track'}
        </Badge>
      ),
    },
  ];

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
                  Mentor Coordinator · Mentor Read-Only Oversight
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
          {actionSuccess && (
            <div className="rounded-xl border border-good-line bg-good-surface/30 p-3 text-xs font-semibold text-good-ink flex justify-between items-center">
              <span>✓ {actionSuccess}</span>
              <button type="button" onClick={() => setActionSuccess(null)} className="text-muted hover:text-ink">✕</button>
            </div>
          )}

          {actionError && (
            <div className="rounded-xl border border-bad-line bg-bad-surface/40 p-3 text-xs font-semibold text-bad-ink flex justify-between items-center">
              <span>⚠️ {actionError}</span>
              <button type="button" onClick={() => setActionError(null)} className="text-muted hover:text-ink">✕</button>
            </div>
          )}

          {deleteMode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs font-medium text-amber-900 flex justify-between items-center">
              <span>Select the students you want to delete from this mentor, then click <strong>Confirm Delete</strong> below.</span>
              <button
                type="button"
                onClick={() => {
                  setDeleteMode(false);
                  setSelectedStudentIds(new Set());
                }}
                className="text-amber-700 hover:text-amber-900 font-semibold ml-2"
              >
                Cancel
              </button>
            </div>
          )}

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
                    value={menteesList.length}
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
                    label="Average Attendance"
                    value={`${stats.averageAttendance ?? 84}%`}
                    caption="Assigned students attendance"
                    tone="green"
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
                  <div className="flex items-center gap-3">
                    {deleteMode && (
                      <input
                        type="checkbox"
                        checked={menteesList.length > 0 && selectedStudentIds.size === menteesList.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                    )}
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-strong">
                      Assigned Mentees in Cohort ({menteesList.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted">Click student row to inspect record book</span>
                </div>

                <DataTable
                  rows={menteesList}
                  rowKey={(m) => m.id}
                  onRowClick={(m) => {
                    if (deleteMode) {
                      toggleSelectStudent(m.id);
                    } else if (onOpenMentee) {
                      onClose();
                      onOpenMentee(m.id);
                    }
                  }}
                  empty={<EmptyState title="No mentees found" description="No mentees in this cohort." icon="✓" />}
                  columns={columns}
                />
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2.5 border-t border-line bg-canvas/30 px-6 py-3.5">
          {!deleteMode ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteMode(true)}
              disabled={menteesList.length === 0}
            >
              Delete
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={selectedStudentIds.size === 0 || deletingId !== null}
                loading={deletingId !== null}
                onClick={handleBulkUnassign}
              >
                Confirm Delete {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDeleteMode(false);
                  setSelectedStudentIds(new Set());
                }}
              >
                Cancel
              </Button>
            </>
          )}

          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </footer>
      </Card>
    </div>,
    document.body,
  );
}
