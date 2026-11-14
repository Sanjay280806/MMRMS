import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client.js';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { SelectField } from '../ui/Field.jsx';
import { SectionCard } from '../ui/SectionCard.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

export function MentorReassignmentTool({
  role = 'hod',
  preselectedMentorId = null,
  onSuccess,
  onCancel,
}) {
  const [mentors, setMentors] = useState([]);
  const [departingMentorId, setDepartingMentorId] = useState(preselectedMentorId || '');
  const [targetMentorId, setTargetMentorId] = useState('');
  const [mentees, setMentees] = useState([]);
  const [selectedMenteeIds, setSelectedMenteeIds] = useState(new Set());
  const [loadingMentees, setLoadingMentees] = useState(false);
  const [batchFilter, setBatchFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Fetch mentors list
  useEffect(() => {
    const endpoint = role === 'hod' ? '/hod/me/mentors' : '/coordinator/me/overview';
    api(endpoint)
      .then((res) => {
        const list = role === 'hod' ? res : res.mentors || [];
        const active = list.filter((m) => !m.archived);
        setMentors(active);

        if (!departingMentorId && active.length > 0) {
          setDepartingMentorId(active[0].id);
        }
        if (!targetMentorId && active.length > 1) {
          setTargetMentorId(active[1].id);
        }
      })
      .catch(() => {});
  }, [role]);

  // When departing mentor changes, fetch their assigned mentees
  useEffect(() => {
    if (!departingMentorId) {
      setMentees([]);
      setSelectedMenteeIds(new Set());
      return;
    }

    setLoadingMentees(true);
    const endpoint = role === 'hod'
      ? `/hod/me/mentors/${departingMentorId}`
      : `/coordinator/me/mentors/${departingMentorId}`;

    api(endpoint)
      .then((res) => {
        const menteeList = res.mentees || [];
        setMentees(menteeList);
        setSelectedMenteeIds(new Set(menteeList.map((m) => m.id)));
      })
      .catch(() => {
        setMentees([]);
        setSelectedMenteeIds(new Set());
      })
      .finally(() => {
        setLoadingMentees(false);
      });
  }, [departingMentorId, role]);

  // Adjust target mentor if same as departing
  useEffect(() => {
    if (departingMentorId && targetMentorId === departingMentorId) {
      const alternate = mentors.find((m) => m.id !== departingMentorId);
      if (alternate) setTargetMentorId(alternate.id);
    }
  }, [departingMentorId, targetMentorId, mentors]);

  const departingMentor = mentors.find((m) => m.id === departingMentorId);
  const targetMentor = mentors.find((m) => m.id === targetMentorId);

  // Batches in current mentees
  const distinctBatches = useMemo(() => {
    const set = new Set();
    mentees.forEach((m) => {
      if (m.section) set.add(m.section);
    });
    return Array.from(set);
  }, [mentees]);

  const filteredMentees = useMemo(() => {
    return mentees.filter((m) => {
      if (batchFilter !== 'all' && m.section !== batchFilter) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        m.name?.toLowerCase().includes(q) ||
        m.rollNumber?.toLowerCase().includes(q) ||
        m.section?.toLowerCase().includes(q)
      );
    });
  }, [mentees, batchFilter, searchTerm]);

  function toggleMentee(id) {
    setSelectedMenteeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll(select) {
    if (select) {
      setSelectedMenteeIds(new Set(filteredMentees.map((m) => m.id)));
    } else {
      setSelectedMenteeIds(new Set());
    }
  }

  async function handleExecuteReassignment() {
    setError(null);
    if (!departingMentorId) {
      setError('Please choose a departing mentor.');
      return;
    }
    if (!targetMentorId) {
      setError('Please choose a target new mentor.');
      return;
    }
    if (departingMentorId === targetMentorId) {
      setError('Departing mentor and target mentor cannot be the same person.');
      return;
    }
    if (selectedMenteeIds.size === 0) {
      setError('Please select at least one mentee to reassign.');
      return;
    }

    setSubmitting(true);
    const endpoint = role === 'hod' ? '/hod/me/mentors/reassign' : '/coordinator/me/mentors/reassign';

    try {
      const res = await api(endpoint, {
        method: 'POST',
        body: {
          departingMentorId,
          targetMentorId,
          menteeIds: Array.from(selectedMenteeIds),
          archiveDepartingMentor: false,
          reason: 'Mentor Reassignment by Coordinator',
        },
      });

      setSuccessInfo(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to reassign mentees.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-fadeRise">
      <SectionCard
        title="Mentor Reassignment"
        subtitle="Transfer students between mentors while keeping all meeting logs and history preserved."
      >
        {successInfo ? (
          <div className="rounded-2xl border border-good-line bg-good-surface/30 p-6 text-center animate-badgePop">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-good-surface text-2xl font-bold text-good-ink">
              ✓
            </div>
            <h3 className="text-base font-bold text-ink">
              Mentor Reassignment Successfully Executed!
            </h3>
            <p className="mt-1 text-[13px] text-muted-strong">
              Reassigned <strong>{successInfo.transferredCount}</strong> students from{' '}
              <strong>{successInfo.departingMentor?.name}</strong> to{' '}
              <strong>{successInfo.targetMentor?.name}</strong>.
            </p>

            <div className="mt-5 flex justify-center gap-3">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setSuccessInfo(null);
                  if (onCancel) onCancel();
                }}
              >
                Done
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSuccessInfo(null)}
              >
                Perform Another Reassignment
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="rounded-xl border border-bad-line bg-bad-surface/40 p-3.5 text-[12.5px] font-medium text-bad-ink">
                ⚠️ {error}
              </div>
            )}

            {/* Simplified Departing & Target Mentor Cards */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Departing Mentor Card */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    Departing Mentor
                  </span>
                  <Badge tone="amber">Departing</Badge>
                </div>

                <SelectField
                  label="Select Departing Mentor"
                  value={departingMentorId}
                  onChange={(e) => setDepartingMentorId(e.target.value)}
                >
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.staffCode}) — {m.assignedMentees || m.menteeCount || 0} students
                    </option>
                  ))}
                </SelectField>

                {departingMentor && (
                  <div className="rounded-xl bg-white p-3 border border-amber-200/80 text-[12.5px]">
                    <div className="flex items-center justify-between font-semibold text-ink">
                      <span>{departingMentor.name}</span>
                      <span className="font-mono text-muted text-xs">{departingMentor.staffCode}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-amber-900 font-medium">
                      <span>Assigned Students:</span>
                      <span className="text-sm font-bold">{mentees.length}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Target New Mentor Card */}
              <div className="rounded-2xl border border-good-line bg-good-surface/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-good-ink">
                    Target Mentor
                  </span>
                  <Badge tone="green">Target</Badge>
                </div>

                <SelectField
                  label="Select Target Mentor"
                  value={targetMentorId}
                  onChange={(e) => setTargetMentorId(e.target.value)}
                >
                  {mentors
                    .filter((m) => m.id !== departingMentorId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.staffCode}) — {m.assignedMentees || m.menteeCount || 0} students
                      </option>
                    ))}
                </SelectField>

                {targetMentor && (
                  <div className="rounded-xl bg-white p-3 border border-good-line/60 text-[12.5px]">
                    <div className="flex items-center justify-between font-semibold text-ink">
                      <span>{targetMentor.name}</span>
                      <span className="font-mono text-muted text-xs">{targetMentor.staffCode}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-good-ink font-medium">
                      <span>Current Students:</span>
                      <span className="text-sm font-bold">
                        {targetMentor.assignedMentees || targetMentor.menteeCount || 0}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mentees Transfer Table with Batch Dropdown & Sticky Header */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-ink text-[14px]">
                    Select Students to Transfer ({selectedMenteeIds.size} of {filteredMentees.length} selected)
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Batch Dropdown Filter */}
                  {distinctBatches.length > 0 && (
                    <select
                      value={batchFilter}
                      onChange={(e) => setBatchFilter(e.target.value)}
                      className="rounded-xl border border-line-strong bg-white px-3 py-1.5 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="all">All Batches</option>
                      {distinctBatches.map((b) => (
                        <option key={b} value={b}>Batch: {b}</option>
                      ))}
                    </select>
                  )}

                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => handleSelectAll(selectedMenteeIds.size < filteredMentees.length)}
                  >
                    {selectedMenteeIds.size === filteredMentees.length ? 'Deselect All' : 'Select All'}
                  </Button>

                  <input
                    type="text"
                    placeholder="Search students…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-xl border border-line px-3 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {loadingMentees ? (
                <div className="p-8 text-center text-muted">Loading assigned students…</div>
              ) : filteredMentees.length === 0 ? (
                <EmptyState
                  title="No Students Found"
                  description="No students match the selected batch or search filter."
                  icon="ⓘ"
                />
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-line bg-white shadow-xs">
                  <table className="w-full text-left text-[12.5px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-muted shadow-xs">
                      <tr>
                        <th className="w-12 px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={filteredMentees.length > 0 && filteredMentees.every((m) => selectedMenteeIds.has(m.id))}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-line text-brand-600 focus:ring-brand-500"
                          />
                        </th>
                        <th className="px-4 py-3 font-semibold">Student Name</th>
                        <th className="px-4 py-3 font-semibold">Roll Number</th>
                        <th className="px-4 py-3 font-semibold">Batch</th>
                        <th className="px-4 py-3 font-semibold text-right">Reviews Held</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {filteredMentees.map((s, idx) => {
                        const isSelected = selectedMenteeIds.has(s.id);
                        return (
                          <tr
                            key={s.id}
                            onClick={() => toggleMentee(s.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-brand-50/50 hover:bg-brand-50' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleMentee(s.id)}
                                className="rounded border-line text-brand-600 focus:ring-brand-500"
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold text-ink flex items-center gap-2">
                              <Avatar initials={s.initials} seed={idx} size="xs" />
                              {s.name}
                            </td>
                            <td className="px-4 py-3 font-mono text-muted text-[11.5px]">{s.rollNumber}</td>
                            <td className="px-4 py-3 text-muted">{s.section}</td>
                            <td className="px-4 py-3 text-right tnum">{s.meetingsHeld} / {s.meetingsDue}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Submission Action Bar */}
            <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
              {onCancel && (
                <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                onClick={handleExecuteReassignment}
                disabled={submitting || selectedMenteeIds.size === 0 || !targetMentorId}
              >
                {submitting
                  ? 'Reassigning Students…'
                  : `Transfer ${selectedMenteeIds.size} Student(s) to ${targetMentor?.name || 'Target Mentor'}`}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
