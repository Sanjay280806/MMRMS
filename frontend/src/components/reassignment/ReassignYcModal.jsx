import { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { TextField, SelectField, TextArea } from '../ui/Field.jsx';

export function ReassignYcModal({ cohort, eligibleFaculty = [], onClose, onSuccess }) {
  const [facultyList, setFacultyList] = useState(eligibleFaculty || []);
  const [selectedFacultyMode, setSelectedFacultyMode] = useState('existing'); // 'existing' | 'new'
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [customFaculty, setCustomFaculty] = useState({
    name: '',
    email: '',
    mobile: '+91 98430 00000',
    room: 'CSE Block · Faculty Cabin',
    designation: 'Year Coordinator',
    department: 'Computer Science and Engineering',
  });
  const [reasonCategory, setReasonCategory] = useState('Departmental Administrative Rotation');
  const [reasonNotes, setReasonNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  useEffect(() => {
    if ((!facultyList || facultyList.length === 0)) {
      api('/hod/me/faculty/eligible')
        .then((res) => {
          if (Array.isArray(res)) {
            setFacultyList(res);
            if (res.length > 0 && !selectedFacultyId) {
              setSelectedFacultyId(res[0].id || res[0].staffCode);
            }
          }
        })
        .catch(() => {});
    } else if (!selectedFacultyId && facultyList.length > 0) {
      setSelectedFacultyId(facultyList[0].id || facultyList[0].staffCode);
    }
  }, [facultyList, selectedFacultyId]);

  const selectedFacultyObj = facultyList.find(
    (f) => String(f.id) === String(selectedFacultyId) || String(f.staffCode) === String(selectedFacultyId)
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    let newFacultyData = null;
    if (selectedFacultyMode === 'existing') {
      if (!selectedFacultyObj) {
        setError('Please select an eligible faculty member from the dropdown.');
        setSubmitting(false);
        return;
      }
      newFacultyData = {
        name: selectedFacultyObj.name,
        email: selectedFacultyObj.email,
        mobile: selectedFacultyObj.mobile,
        room: selectedFacultyObj.cabin || selectedFacultyObj.room || 'CSE Block · Room 210',
        designation: 'Year Coordinator',
        department: selectedFacultyObj.department || 'Computer Science and Engineering',
      };
    } else {
      if (!customFaculty.name.trim() || !customFaculty.email.trim()) {
        setError('Full Name and Institutional Email are required for the new faculty member.');
        setSubmitting(false);
        return;
      }
      newFacultyData = {
        name: customFaculty.name.trim(),
        email: customFaculty.email.trim(),
        mobile: customFaculty.mobile.trim(),
        room: customFaculty.room.trim(),
        designation: customFaculty.designation.trim(),
        department: customFaculty.department.trim(),
      };
    }

    const fullReason = reasonNotes.trim()
      ? `${reasonCategory}: ${reasonNotes.trim()}`
      : reasonCategory;

    try {
      const res = await api(`/hod/me/cohorts/${cohort.cohortId}/reassign-yc`, {
        method: 'POST',
        body: {
          newFaculty: newFacultyData,
          reason: fullReason,
        },
      });

      setSuccessResult(res);
      setTimeout(() => {
        if (onSuccess) onSuccess(res);
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to reassign Year Coordinator.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeRise">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-700">
                Cohort Governance
              </span>
              <Badge tone="indigo">Cohort {cohort.cohortId}</Badge>
            </div>
            <h2 className="mt-1.5 text-xl font-bold text-ink">
              Reassign Year Coordinator
            </h2>
            <p className="text-[12.5px] text-muted">
              {cohort.cohortName} ({cohort.year}) · Seamless succession with permanent audit preservation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-surface-subtle hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Success View */}
        {successResult ? (
          <div className="my-8 rounded-2xl border border-good-line bg-good-surface/30 p-6 text-center animate-badgePop">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-good-surface text-2xl font-bold text-good-ink">
              ✓
            </div>
            <h3 className="text-base font-bold text-ink">
              Year Coordinator Reassigned Successfully!
            </h3>
            <p className="mt-1 text-[13px] text-muted-strong">
              <strong>{successResult.newCoordinator?.name}</strong> is now the active Year Coordinator for {cohort.cohortName}.
            </p>
            <div className="mt-4 rounded-xl border border-good-line/60 bg-white p-3.5 text-left text-[12px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted">Previous Coordinator:</span>
                <span className="font-semibold text-ink">{successResult.oldCoordinator?.name || cohort.yearCoordinator} (Archived)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">New Coordinator:</span>
                <span className="font-semibold text-brand-600">{successResult.newCoordinator?.name} (Active)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Auditing Trail:</span>
                <span className="font-medium text-good-ink">100% historical logs and events preserved</span>
              </div>
            </div>
            <div className="mt-5">
              <Button size="sm" variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {error && (
              <div className="rounded-xl border border-bad-line bg-bad-surface/40 p-3.5 text-[12.5px] font-medium text-bad-ink">
                ⚠️ {error}
              </div>
            )}

            {/* Current YC Status Box */}
            <div className="rounded-2xl border border-line bg-surface-subtle p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-soft">
                  Current Year Coordinator
                </span>
                <Badge tone="amber">Will be Archived</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-ink">{cohort.yearCoordinator}</h4>
                  <p className="text-[12px] text-muted">
                    {cohort.coordinatorEmail || 'coordinator@kct.ac.in'} · {cohort.coordinatorRoom || 'CSE Block'}
                  </p>
                </div>
                <div className="text-right text-[11px] text-muted">
                  <span>Enrolled Cohort</span>
                  <p className="font-semibold text-ink">{cohort.totalStudents || 0} students</p>
                </div>
              </div>
            </div>

            {/* Mandatory Accreditation Policy Notice */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-[12px] text-indigo-950">
              <div className="flex items-start gap-2.5">
                <span className="text-base">🛡️</span>
                <div className="space-y-1">
                  <p className="font-semibold">Institutional Audit & Accreditation Integrity</p>
                  <p className="leading-relaxed text-indigo-800">
                    When the coordinator departs, their login account is marked as <strong>Archived (soft-deleted)</strong>.
                    All historical events, MyCamu/Excel uploads, and review logs created by this coordinator remain
                    <strong> permanently intact</strong> for NBA/NAAC audit compliance. The new Year Coordinator gains
                    instant access to the cohort dataset upon assignment.
                  </p>
                </div>
              </div>
            </div>

            {/* Selection Mode Toggle */}
            <div className="space-y-2">
              <label className="text-[12.5px] font-semibold text-muted-strong block">
                Select Succession Mode
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFacultyMode('existing')}
                  className={`flex-1 rounded-xl border p-3 text-left transition-all ${
                    selectedFacultyMode === 'existing'
                      ? 'border-brand-500 bg-brand-50/60 shadow-inner ring-2 ring-brand-500/20'
                      : 'border-line bg-white hover:border-brand-200'
                  }`}
                >
                  <span className="text-[12.5px] font-bold text-ink block">
                    Choose from Department Faculty
                  </span>
                  <span className="text-[11px] text-muted block mt-0.5">
                    Select an active professor, mentor, or advisor
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFacultyMode('new')}
                  className={`flex-1 rounded-xl border p-3 text-left transition-all ${
                    selectedFacultyMode === 'new'
                      ? 'border-brand-500 bg-brand-50/60 shadow-inner ring-2 ring-brand-500/20'
                      : 'border-line bg-white hover:border-brand-200'
                  }`}
                >
                  <span className="text-[12.5px] font-bold text-ink block">
                    Enter New Faculty Member
                  </span>
                  <span className="text-[11px] text-muted block mt-0.5">
                    Onboard incoming faculty or transferred staff
                  </span>
                </button>
              </div>
            </div>

            {/* Existing Faculty Dropdown */}
            {selectedFacultyMode === 'existing' && (
              <div className="space-y-3">
                <SelectField
                  label="Select New Faculty Member"
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  hint="Faculty members from CSE department eligible for Year Coordinator leadership"
                >
                  {facultyList.map((f) => (
                    <option key={f.id || f.staffCode} value={f.id || f.staffCode}>
                      {f.name} ({f.staffCode || f.id}) — {f.designation} [{f.email}]
                    </option>
                  ))}
                </SelectField>

                {selectedFacultyObj && (
                  <div className="rounded-xl border border-line bg-surface-subtle p-3 text-[12px] space-y-1">
                    <p className="font-semibold text-ink">Preview Assigned Profile:</p>
                    <div className="grid grid-cols-2 gap-2 text-muted">
                      <div>Name: <span className="font-medium text-ink">{selectedFacultyObj.name}</span></div>
                      <div>Staff Code: <span className="font-mono text-ink">{selectedFacultyObj.staffCode}</span></div>
                      <div>Email: <span className="text-ink">{selectedFacultyObj.email}</span></div>
                      <div>Cabin: <span className="text-ink">{selectedFacultyObj.cabin || 'CSE Block'}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual New Faculty Fields */}
            {selectedFacultyMode === 'new' && (
              <div className="grid gap-3 sm:grid-cols-2 rounded-2xl border border-line p-4 bg-surface-subtle/50">
                <TextField
                  label="Faculty Full Name"
                  required
                  placeholder="e.g. Dr. Kavitha Sundaram"
                  value={customFaculty.name}
                  onChange={(e) => setCustomFaculty({ ...customFaculty, name: e.target.value })}
                />
                <TextField
                  label="Institutional Email"
                  required
                  type="email"
                  placeholder="kavitha.s@kct.ac.in"
                  value={customFaculty.email}
                  onChange={(e) => setCustomFaculty({ ...customFaculty, email: e.target.value })}
                />
                <TextField
                  label="Contact Mobile"
                  placeholder="+91 98430 00000"
                  value={customFaculty.mobile}
                  onChange={(e) => setCustomFaculty({ ...customFaculty, mobile: e.target.value })}
                />
                <TextField
                  label="Cabin / Room"
                  placeholder="CSE Block · Room 210"
                  value={customFaculty.room}
                  onChange={(e) => setCustomFaculty({ ...customFaculty, room: e.target.value })}
                />
              </div>
            )}

            {/* Reassignment Reason & Audit Notes */}
            <div className="space-y-3">
              <SelectField
                label="Reassignment Category / Justification"
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
              >
                <option value="Departmental Administrative Rotation">Departmental Administrative Rotation</option>
                <option value="Faculty Resignation / Superannuation">Faculty Resignation / Superannuation</option>
                <option value="Faculty Sabbatical / Extended Leave">Faculty Sabbatical / Extended Leave</option>
                <option value="Administrative Reallocation of Duties">Administrative Reallocation of Duties</option>
                <option value="Other Institutional Reason">Other Institutional Reason</option>
              </SelectField>

              <TextArea
                label="Audit Remarks & Succession Notes (Optional)"
                rows={2}
                placeholder="Institutional notes on cohort handover and responsibilities…"
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Reassigning & Archiving…' : 'Confirm Reassignment & Archive Old YC'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
