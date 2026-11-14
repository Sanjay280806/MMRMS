import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client.js';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { TextField } from '../ui/Field.jsx';
import { SectionCard } from '../ui/SectionCard.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

export function MentorAssignmentTool({
  role = 'coordinator',
  onSuccess,
  onCancel,
}) {
  const [mentors, setMentors] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unassigned' | 'section'
  const [sectionFilter, setSectionFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Load mentors and students
  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api('/coordinator/me/overview'),
      api('/coordinator/me/students?limit=200'),
    ])
      .then(([overviewRes, studentsRes]) => {
        const mList = overviewRes?.mentors || overviewRes?.data?.mentors || [];
        const activeMentors = mList.filter((m) => !m.archived);
        setMentors(activeMentors);
        if (activeMentors.length > 0 && !selectedMentorId) {
          setSelectedMentorId(activeMentors[0].id);
        }

        const sList = studentsRes?.students || studentsRes?.data?.students || [];
        setStudents(sList);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load mentors and students');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedMentor = useMemo(
    () => mentors.find((m) => m.id === selectedMentorId),
    [mentors, selectedMentorId]
  );

  // Distinct sections for filter
  const distinctSections = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.section) set.add(s.section);
    });
    return Array.from(set);
  }, [students]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          s.name?.toLowerCase().includes(q) ||
          s.rollNumber?.toLowerCase().includes(q) ||
          s.section?.toLowerCase().includes(q) ||
          s.mentorName?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Filter mode
      if (filterMode === 'unassigned') {
        if (s.mentorId && s.mentorId !== 'none') return false;
      } else if (filterMode === 'different') {
        if (s.mentorId === selectedMentorId) return false;
      }

      // Section filter
      if (sectionFilter !== 'all' && s.section !== sectionFilter) {
        return false;
      }

      return true;
    });
  }, [students, searchTerm, filterMode, sectionFilter, selectedMentorId]);

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const handleAssign = async () => {
    if (!selectedMentorId) {
      setError('Please select a mentor to assign students to');
      return;
    }
    if (selectedStudentIds.size === 0) {
      setError('Please select at least one student to assign');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        mentorId: selectedMentorId,
        menteeIds: Array.from(selectedStudentIds),
      };

      const result = await api('/coordinator/me/mentors/assign', {
        method: 'POST',
        body: payload,
      });

      setSuccessInfo(
        `Successfully assigned ${selectedStudentIds.size} student${
          selectedStudentIds.size > 1 ? 's' : ''
        } to ${selectedMentor?.name || 'mentor'}!`
      );
      setSelectedStudentIds(new Set());
      loadData();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to assign students');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && students.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-10 text-center">
        <p className="text-[13px] text-muted">Loading mentors and students dataset…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50/80 via-white to-purple-50/40 p-6 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-[18px] font-bold text-ink">Mentor Assignment</h3>
            <p className="mt-1 text-[13px] text-muted">
              Allocate and assign students to faculty mentors. Select a mentor, choose students using filters, and confirm allocation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button size="sm" variant="secondary" onClick={onCancel}>
                Back to Mentors
              </Button>
            )}
            <Button
              size="sm"
              disabled={selectedStudentIds.size === 0 || !selectedMentorId || submitting}
              loading={submitting}
              onClick={handleAssign}
            >
              Assign {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''} Students
            </Button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successInfo && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50/90 px-5 py-3.5 text-sm text-green-900 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
              ✓
            </span>
            <span className="font-semibold">{successInfo}</span>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-green-700 hover:text-green-900"
            onClick={() => setSuccessInfo(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm text-rose-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-rose-700 hover:text-rose-900"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Step 1: Select Mentor */}
      <SectionCard
        title="Step 1: Select Mentor"
        subtitle="Choose the faculty mentor to allocate students to"
      >
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {mentors.map((mentor) => {
            const isSelected = mentor.id === selectedMentorId;
            return (
              <button
                key={mentor.id}
                type="button"
                onClick={() => setSelectedMentorId(mentor.id)}
                className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/60 shadow-md ring-2 ring-brand-500/20'
                    : 'border-line bg-white hover:border-brand-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={mentor.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-ink">{mentor.name}</p>
                    <p className="text-[11.5px] text-muted">{mentor.staffCode}</p>
                    <p className="mt-1 text-[11px] text-muted-soft">{mentor.designation || 'Faculty Mentor'}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-[12px]">
                  <span className="text-muted">Currently Assigned:</span>
                  <Badge tone={isSelected ? 'indigo' : 'neutral'}>
                    {mentor.assigned ?? mentor.menteeCount ?? 0} students
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Step 2: Select Students to Assign */}
      <SectionCard
        title="Step 2: Select Students to Assign"
        subtitle={`Select students to assign to ${selectedMentor?.name || 'the selected mentor'}`}
        action={
          <div className="flex items-center gap-2">
            <Button size="xs" variant="secondary" onClick={selectAllFiltered}>
              Select All Filtered ({filteredStudents.length})
            </Button>
            {selectedStudentIds.size > 0 && (
              <Button size="xs" variant="secondary" onClick={clearSelection}>
                Clear ({selectedStudentIds.size})
              </Button>
            )}
          </div>
        }
      >
        {/* Filter & Search Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-64">
            <TextField
              placeholder="Search by name, roll no, section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas/40 p-1 text-[12px]">
            <button
              type="button"
              className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
              onClick={() => setFilterMode('all')}
            >
              All ({students.length})
            </button>
            <button
              type="button"
              className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                filterMode === 'unassigned'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
              onClick={() => setFilterMode('unassigned')}
            >
              Unassigned ({students.filter((s) => !s.mentorId || s.mentorId === 'none').length})
            </button>
            <button
              type="button"
              className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                filterMode === 'different'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
              onClick={() => setFilterMode('different')}
            >
              Other Mentors
            </button>
          </div>

          {distinctSections.length > 0 && (
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-field border border-line-strong bg-white px-3 py-2 text-[12.5px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All Sections</option>
              {distinctSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section: {sec}
                </option>
              ))}
            </select>
          )}

          <div className="ml-auto text-[12.5px] font-semibold text-brand-700">
            {selectedStudentIds.size} student{selectedStudentIds.size === 1 ? '' : 's'} selected
          </div>
        </div>

        {/* Student Table */}
        {filteredStudents.length === 0 ? (
          <EmptyState
            title="No students match the criteria"
            description="Try clearing search or changing the filter options above."
            icon="🔍"
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-[12.5px]">
              <thead className="border-b border-line bg-canvas/60 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        filteredStudents.every((s) => selectedStudentIds.has(s.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) selectAllFiltered();
                        else clearSelection();
                      }}
                      className="rounded border-line-strong text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Roll Number</th>
                  <th className="px-4 py-3 font-semibold">Student Name</th>
                  <th className="px-4 py-3 font-semibold">Section</th>
                  <th className="px-4 py-3 font-semibold">Current Mentor</th>
                  <th className="px-4 py-3 font-semibold text-right">CGPA</th>
                  <th className="px-4 py-3 font-semibold text-right">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredStudents.map((student) => {
                  const isChecked = selectedStudentIds.has(student.id);
                  const isAlreadyWithTarget = student.mentorId === selectedMentorId;
                  return (
                    <tr
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-brand-50/50 hover:bg-brand-50/70'
                          : 'hover:bg-canvas/40'
                      }`}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudent(student.id)}
                          className="rounded border-line-strong text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-ink">
                        {student.rollNumber}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        {student.name}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {student.section}
                      </td>
                      <td className="px-4 py-3">
                        {student.mentorName ? (
                          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-800 border border-brand-200">
                            {student.mentorName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            Unassigned
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Floating / Bottom Action Bar */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/40 p-4">
          <div className="text-[13px] text-ink">
            <strong>{selectedStudentIds.size}</strong> student{selectedStudentIds.size === 1 ? '' : 's'} selected for assignment to{' '}
            <strong className="text-brand-700">{selectedMentor?.name || 'selected mentor'}</strong>.
          </div>
          <Button
            size="sm"
            disabled={selectedStudentIds.size === 0 || !selectedMentorId || submitting}
            loading={submitting}
            onClick={handleAssign}
          >
            Confirm & Assign {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
