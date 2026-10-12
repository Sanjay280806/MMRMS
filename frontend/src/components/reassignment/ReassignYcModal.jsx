import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client.js';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { TextField, SelectField, TextArea } from '../ui/Field.jsx';

function getInitials(name) {
  if (!name) return 'YC';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

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

  // Lock body scroll and handle ESC key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, submitting]);

  // Sync eligible faculty list and select first by default
  useEffect(() => {
    if (eligibleFaculty && eligibleFaculty.length > 0 && facultyList.length === 0) {
      setFacultyList(eligibleFaculty);
      if (!selectedFacultyId) {
        setSelectedFacultyId(eligibleFaculty[0].id || eligibleFaculty[0].staffCode);
      }
    }
  }, [eligibleFaculty]);

  useEffect(() => {
    if (!facultyList || facultyList.length === 0) {
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

  if (!cohort) return null;

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
        mobile: selectedFacultyObj.mobile || '+91 98430 00000',
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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reassign-yc-modal-title"
    >
      <div
        style={{ backgroundColor: '#ffffff', color: '#12131A' }}
        className="relative flex flex-col w-full max-w-xl max-h-[90vh] rounded-2xl border border-line-strong shadow-2xl overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div
          style={{ backgroundColor: '#f8f9fc' }}
          className="flex items-start justify-between border-b border-line px-6 py-4 shrink-0"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-brand-700">
                Cohort Governance
              </span>
              <Badge tone="indigo">{cohort.cohortId}</Badge>
            </div>
            <h2 id="reassign-yc-modal-title" className="mt-1 text-lg font-bold text-ink">
              Reassign Year Coordinator
            </h2>
            <p className="text-[12px] text-muted">
              {cohort.cohortName} ({cohort.year})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-1.5 text-muted hover:bg-black/5 hover:text-ink transition-colors"
            title="Close dialog"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Success View */}
        {successResult ? (
          <div style={{ backgroundColor: '#ffffff' }} className="p-6 sm:p-8 text-center animate-badgePop">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-good-tint text-2xl font-bold text-good-ink">
              ✓
            </div>
            <h3 className="text-base font-bold text-ink">
              Year Coordinator Reassigned Successfully!
            </h3>
            <p className="mt-1 text-[13px] text-muted-strong">
              <strong>{successResult.newCoordinator?.name}</strong> is now the active Year Coordinator for {cohort.cohortName}.
            </p>
            <div className="mt-5 rounded-xl border border-good/30 bg-good-tint/60 p-4 text-left text-[12px] space-y-2">
              <div className="flex justify-between">
                <span className="text-muted">Previous Coordinator:</span>
                <span className="font-semibold text-ink">
                  {successResult.oldCoordinator?.name || cohort.yearCoordinator} (Archived)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">New Coordinator:</span>
                <span className="font-semibold text-brand-600">
                  {successResult.newCoordinator?.name} (Active)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Audit Compliance:</span>
                <span className="font-medium text-good-ink">Historical events & uploads preserved</span>
              </div>
            </div>
            <div className="mt-6">
              <Button size="sm" variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ backgroundColor: '#ffffff' }}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Scrollable Form Body */}
            <div
              style={{ backgroundColor: '#ffffff' }}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            >
              {error && (
                <div className="rounded-xl border border-bad/30 bg-bad-tint p-3 text-[12.5px] font-medium text-bad-ink">
                  ⚠️ {error}
                </div>
              )}

              {/* Current Coordinator Summary Card */}
              <div
                style={{ backgroundColor: '#f8f9fc' }}
                className="rounded-xl border border-line p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar initials={getInitials(cohort.yearCoordinator)} size="sm" seed={2} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-soft">
                        Current:
                      </span>
                      <span className="font-bold text-ink text-sm truncate">
                        {cohort.yearCoordinator}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-muted truncate">
                      {cohort.coordinatorEmail || 'coordinator@kct.ac.in'} · {cohort.coordinatorRoom || 'CSE Block'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge tone="amber" size="xs">Will be Archived</Badge>
                  <p className="text-[11px] text-muted-soft mt-0.5">{cohort.totalStudents || 0} students</p>
                </div>
              </div>

              {/* Succession Mode Segmented Switch */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-muted-strong block">
                  Succession Mode
                </label>
                <div
                  style={{ backgroundColor: '#f1f3f8' }}
                  className="flex rounded-xl p-1 border border-line"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFacultyMode('existing')}
                    style={
                      selectedFacultyMode === 'existing'
                        ? { backgroundColor: '#ffffff', color: '#12131A' }
                        : { backgroundColor: 'transparent', color: '#6B7280' }
                    }
                    className={`flex-1 py-1.5 px-3 text-[12px] font-semibold rounded-lg transition-all ${
                      selectedFacultyMode === 'existing'
                        ? 'shadow-sm border border-line-strong'
                        : 'hover:text-ink'
                    }`}
                  >
                    Choose Existing Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFacultyMode('new')}
                    style={
                      selectedFacultyMode === 'new'
                        ? { backgroundColor: '#ffffff', color: '#12131A' }
                        : { backgroundColor: 'transparent', color: '#6B7280' }
                    }
                    className={`flex-1 py-1.5 px-3 text-[12px] font-semibold rounded-lg transition-all ${
                      selectedFacultyMode === 'new'
                        ? 'shadow-sm border border-line-strong'
                        : 'hover:text-ink'
                    }`}
                  >
                    + Enter New Faculty
                  </button>
                </div>
              </div>

              {/* Mode: Existing Faculty */}
              {selectedFacultyMode === 'existing' && (
                <div className="space-y-3">
                  <SelectField
                    label="Select New Faculty Member"
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                    hint="Eligible faculty members from CSE department"
                  >
                    {facultyList.map((f) => (
                      <option key={f.id || f.staffCode} value={f.id || f.staffCode}>
                        {f.name} ({f.staffCode || f.id}) — {f.designation} [{f.email}]
                      </option>
                    ))}
                  </SelectField>

                  {selectedFacultyObj && (
                    <div
                      style={{ backgroundColor: '#eef2ff' }}
                      className="rounded-xl border border-brand-200 p-3.5 text-[12px]"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-brand-900">Preview Assigned Profile</span>
                        <Badge tone="brand" size="xs">Selected YC</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-strong">
                        <div>
                          <span className="text-muted">Name:</span>{' '}
                          <strong className="text-ink">{selectedFacultyObj.name}</strong>
                        </div>
                        <div>
                          <span className="text-muted">Staff Code:</span>{' '}
                          <span className="font-mono font-medium text-ink">{selectedFacultyObj.staffCode}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-muted">Email:</span>{' '}
                          <span className="text-ink">{selectedFacultyObj.email}</span>
                        </div>
                        <div>
                          <span className="text-muted">Cabin:</span>{' '}
                          <span className="text-ink">{selectedFacultyObj.cabin || selectedFacultyObj.room || 'CSE Block'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode: Manual New Faculty Fields */}
              {selectedFacultyMode === 'new' && (
                <div
                  style={{ backgroundColor: '#f8f9fc' }}
                  className="grid gap-3 sm:grid-cols-2 rounded-xl border border-line p-3.5"
                >
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

              {/* Reassignment Reason & Notes */}
              <div className="space-y-3 pt-1">
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
            </div>

            {/* Fixed Footer Actions */}
            <div
              style={{ backgroundColor: '#f8f9fc' }}
              className="flex items-center justify-end gap-3 border-t border-line px-6 py-4 shrink-0"
            >
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Reassigning Coordinator…' : 'Confirm & Assign Coordinator'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
