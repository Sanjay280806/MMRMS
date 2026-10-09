import { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { SelectField, TextField } from '../ui/Field.jsx';
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
  const [archiveDepartingMentor, setArchiveDepartingMentor] = useState(true);
  const [reason, setReason] = useState('Mentor Discontinued / Faculty Succession');
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
        // Only active mentors for reassignment
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
        // By default, select all mentees of departing mentor for bulk reassignment
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

  const filteredMentees = mentees.filter((m) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.rollNumber?.toLowerCase().includes(q) ||
      m.section?.toLowerCase().includes(q)
    );
  });

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
      setSelectedMenteeIds(new Set(mentees.map((m) => m.id)));
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
          archiveDepartingMentor,
          reason,
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
      {/* Header Banner */}
      <SectionCard
        title="Mentor Reassignment & Succession Tool"
        subtitle="Bulk-select and transfer mentees when faculty discontinue. All Section 12 meeting logs, goals, and history are seamlessly preserved."
        action={
          onCancel && (
            <Button size="xs" variant="secondary" onClick={onCancel}>
              ✕ Close Tool
            </Button>
          )
        }
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
              Reassigned <strong>{successInfo.transferredCount}</strong> mentees from{' '}
              <strong>{successInfo.departingMentor?.name}</strong> to{' '}
              <strong>{successInfo.targetMentor?.name}</strong>.
            </p>
            {successInfo.departingMentor?.archived && (
              <p className="mt-1 text-[12px] text-muted">
                Departing mentor account for {successInfo.departingMentor?.name} has been{' '}
                <span className="font-semibold text-bad-ink">Archived (soft-deleted)</span>. Historical records remain intact for audits.
              </p>
            )}

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

            {/* Step 1 & Step 3 Mentor Pickers */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Departing Mentor */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    Step 1 · Departing Mentor
                  </span>
                  <Badge tone="amber">Departing Faculty</Badge>
                </div>

                <SelectField
                  label="Select Departing Mentor"
                  value={departingMentorId}
                  onChange={(e) => setDepartingMentorId(e.target.value)}
                  hint="Faculty member who is discontinuing or being relieved of mentoring"
                >
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.staffCode}) — {m.assignedMentees || m.menteeCount || 0} mentees
                    </option>
                  ))}
                </SelectField>

                {departingMentor && (
                  <div className="rounded-xl bg-white p-3 border border-amber-200/80 text-[12px] space-y-1">
                    <div className="flex justify-between font-semibold text-ink">
                      <span>{departingMentor.name}</span>
                      <span className="font-mono text-muted">{departingMentor.staffCode}</span>
                    </div>
                    <p className="text-muted">{departingMentor.email} · {departingMentor.cabin || 'CSE Block'}</p>
                    <div className="pt-1 flex items-center justify-between text-amber-900 font-medium">
                      <span>Mentees to Reassign:</span>
                      <span className="text-sm font-bold">{mentees.length} students</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Target New Mentor */}
              <div className="rounded-2xl border border-good-line bg-good-surface/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-good-ink">
                    Step 2 · Target New Mentor
                  </span>
                  <Badge tone="green">Successor Faculty</Badge>
                </div>

                <SelectField
                  label="Select Target New Mentor"
                  value={targetMentorId}
                  onChange={(e) => setTargetMentorId(e.target.value)}
                  hint="Active faculty member who will take over the selected mentees"
                >
                  {mentors
                    .filter((m) => m.id !== departingMentorId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.staffCode}) — Currently {m.assignedMentees || m.menteeCount || 0} mentees
                      </option>
                    ))}
                </SelectField>

                {targetMentor && (
                  <div className="rounded-xl bg-white p-3 border border-good-line/60 text-[12px] space-y-1">
                    <div className="flex justify-between font-semibold text-ink">
                      <span>{targetMentor.name}</span>
                      <span className="font-mono text-muted">{targetMentor.staffCode}</span>
                    </div>
                    <p className="text-muted">{targetMentor.email} · {targetMentor.cabin || 'CSE Block'}</p>
                    <div className="pt-1 flex items-center justify-between text-good-ink font-medium">
                      <span>Projected Load After Transfer:</span>
                      <span className="text-sm font-bold">
                        {(targetMentor.assignedMentees || targetMentor.menteeCount || 0) + selectedMenteeIds.size} mentees
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seamless Preservation Highlight */}
            <div className="rounded-2xl border border-indigo-200 bg-brand-50/60 p-4 text-[12.5px] text-indigo-950">
              <div className="flex items-start gap-2.5">
                <span className="text-lg">🛡️</span>
                <div>
                  <h4 className="font-semibold text-brand-900">Seamless Historical Data & Progress Preservation</h4>
                  <p className="mt-0.5 text-indigo-800 leading-relaxed text-[12px]">
                    Only the mentor link is updated on the selected students. All <strong>Section 12 meeting logs</strong>,
                    SMART goals, student concerns, recommendations, attendance records, and previous action items
                    remain <strong>100% intact</strong> and instantly accessible to the incoming mentor for ongoing guidance.
                  </p>
                </div>
              </div>
            </div>

            {/* Mentees Bulk Selection Table */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-ink text-[14px]">
                    Select Mentees to Transfer ({selectedMenteeIds.size} of {mentees.length} selected)
                  </h4>
                  <p className="text-[11.5px] text-muted">
                    Bulk-select all students or fine-tune individual mentee assignments
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => handleSelectAll(selectedMenteeIds.size < mentees.length)}
                  >
                    {selectedMenteeIds.size === mentees.length ? 'Deselect All' : 'Select All Mentees'}
                  </Button>
                  <input
                    type="text"
                    placeholder="Search mentees…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-lg border border-line px-3 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {loadingMentees ? (
                <div className="p-8 text-center text-muted">Loading assigned mentees…</div>
              ) : mentees.length === 0 ? (
                <EmptyState
                  title="No Mentees Assigned"
                  description="The selected mentor does not currently have any mentees assigned."
                  icon="ⓘ"
                />
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-2xl border border-line bg-surface">
                  <table className="w-full text-left text-[12.5px]">
                    <thead className="sticky top-0 border-b border-line bg-surface-subtle text-[11px] font-semibold uppercase tracking-wider text-muted-soft">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMenteeIds.size === mentees.length && mentees.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-line"
                          />
                        </th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Roll No</th>
                        <th className="p-3">Cohort</th>
                        <th className="p-3 text-right">Attendance</th>
                        <th className="p-3 text-right">CGPA</th>
                        <th className="p-3 text-right">Meetings</th>
                        <th className="p-3 text-right">Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredMentees.map((s, idx) => {
                        const isSelected = selectedMenteeIds.has(s.id);
                        return (
                          <tr
                            key={s.id}
                            onClick={() => toggleMentee(s.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-brand-50/50 hover:bg-brand-50' : 'hover:bg-surface-subtle'
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleMentee(s.id)}
                                className="rounded border-line text-brand-600 focus:ring-brand-500"
                              />
                            </td>
                            <td className="p-3 font-semibold text-ink flex items-center gap-2">
                              <Avatar initials={s.initials} seed={idx} size="xs" />
                              {s.name}
                            </td>
                            <td className="p-3 font-mono text-muted text-[11.5px]">{s.rollNumber}</td>
                            <td className="p-3 text-muted">{s.section}</td>
                            <td className="p-3 text-right tnum">
                              <span className={s.attendance < 75 ? 'font-semibold text-bad-ink' : 'text-ink'}>
                                {s.attendance}%
                              </span>
                            </td>
                            <td className="p-3 text-right tnum font-medium">{s.cgpa?.toFixed(2)}</td>
                            <td className="p-3 text-right tnum">{s.meetingsHeld} / {s.meetingsDue}</td>
                            <td className="p-3 text-right">
                              <Badge tone={s.health < 60 ? 'rose' : s.health < 75 ? 'amber' : 'green'} size="xs">
                                {s.health}/100
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Options: Archiving and Reason */}
            <div className="rounded-2xl border border-line bg-surface-subtle p-4 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={archiveDepartingMentor}
                  onChange={(e) => setArchiveDepartingMentor(e.target.checked)}
                  className="mt-0.5 rounded border-line text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-[13px] font-semibold text-ink block">
                    Archive Departing Mentor Account (Soft-Delete)
                  </span>
                  <span className="text-[11.5px] text-muted block leading-relaxed">
                    Disables sign-in access for the departing mentor while permanently retaining their name on past
                    signed meeting minutes, attendance logs, and institutional accreditation records.
                  </span>
                </div>
              </label>

              <TextField
                label="Reassignment Justification / Succession Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Faculty resignation, study leave, departmental load balancing…"
              />
            </div>

            {/* Submission Button */}
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
                  ? 'Reassigning Mentees…'
                  : `Reassign ${selectedMenteeIds.size} Mentees to ${targetMentor?.name || 'New Mentor'}`}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
