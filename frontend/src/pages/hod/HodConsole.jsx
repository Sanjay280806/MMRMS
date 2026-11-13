import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ConsoleLayout } from '../../components/layout/ConsoleLayout.jsx';
import { StatTile } from '../../components/ui/StatTile.jsx';
import { SectionCard, SectionTable } from '../../components/ui/SectionCard.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { ProfileHeader } from '../../components/profile/ProfileHeader.jsx';
import { useResource } from '../../hooks/useResource.js';
import { api } from '../../api/client.js';

/* =========================================================================
 * PRESERVED CODE FOR MENTOR COORDINATOR MIGRATION (Next Phase)
 * The following tools and modals for Mentor Assignment, Mentor Reassignment,
 * and Year Coordinator Reassignment have been removed from HOD's view as HOD
 * does not perform assignment/reassignment. They are preserved intact here
 * to be migrated to the Mentor Coordinator page in the next prompt.
 * =========================================================================
 *
 * import { ReassignYcModal } from '../../components/reassignment/ReassignYcModal.jsx';
 * import { MentorReassignmentTool } from '../../components/reassignment/MentorReassignmentTool.jsx';
 *
 * // States previously in HodConsole:
 * // const [reassigningCohort, setReassigningCohort] = useState(null);
 * // const [preselectedMentorReassignId, setPreselectedMentorReassignId] = useState(null);
 *
 * // Handlers previously in HodConsole:
 * // function handleStartReassignment(mentorId) {
 * //   setReassignMentorId(mentorId);
 * //   setActiveTab('reassignment');
 * // }
 *
 * // Modals previously rendered in HodConsole:
 * // {reassigningCohort && (
 * //   <ReassignYcModal
 * //     cohort={reassigningCohort}
 * //     eligibleFaculty={data.eligibleFaculty || []}
 * //     onClose={() => setReassigningCohort(null)}
 * //     onSuccess={() => {
 * //       setReassigningCohort(null);
 * //       reload();
 * //     }}
 * //   />
 * // )}
 *
 * // {activeTab === 'reassignment' && (
 * //   <MentorReassignmentTool
 * //     role="hod"
 * //     preselectedMentorId={reassignMentorId}
 * //     onCancel={() => {
 * //       setActiveTab('list');
 * //       if (onClearPreselectedMentor) onClearPreselectedMentor();
 * //     }}
 * //     onSuccess={() => {
 * //       if (onSuccessReassign) onSuccessReassign();
 * //     }}
 * //   />
 * // )}
 * ========================================================================= */

// Clean CSV export helper without emojis or health metrics
function downloadCsv(data, filename) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const val = row[header] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportMeetingMinutesCsv(meetings) {
  if (!meetings || !meetings.length) return;
  const rows = meetings.map((m) => ({
    'Review No': m.meetingNumber,
    'Date': m.date,
    'Mode': m.mode,
    'Duration': m.duration,
    'Mentor Name': m.mentorName,
    'Mentor Staff Code': m.mentorStaffCode,
    'Student Name': m.studentName,
    'Roll Number': m.rollNumber,
    'Batch': m.cohort,
    'Attendance %': m.attendance,
    'CGPA': m.cgpa,
    'Topics Discussed': m.topicsDiscussed,
    'Student Concerns': m.studentConcerns,
    'Mentor Guidance': m.mentorSuggestions,
    'Support Required': m.supportRequired,
    'Pending Tasks': m.actionItemsText,
    'Mentor Signed': m.mentorSigned ? 'Yes' : 'No',
    'Student Signed': m.studentSigned ? 'Yes' : 'No',
    'Next Review Date': m.nextReviewDate,
  }));
  downloadCsv(rows, `MMRMS_Department_Meeting_Minutes_${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportMentorComplianceCsv(mentors) {
  if (!mentors || !mentors.length) return;
  const rows = mentors.map((m) => ({
    'Staff Code': m.staffCode,
    'Mentor Name': m.name,
    'Department': m.department,
    'Cabin': m.cabin,
    'Assigned Students': m.assignedMentees,
    'Monthly Target Meetings (2 per student)': m.monthlyTarget,
    'Monthly Meetings Conducted': m.monthlyHeld,
    'Students Below Target (< 2 meetings)': m.menteesBelowTarget,
    'Monthly Compliance %': `${m.monthlyCompliancePct}%`,
    'Total Meetings Held': m.meetingsHeld,
    'Last Review Date': m.lastMeetingDate,
    'Days Since Last Meeting': m.daysSinceLastMeeting,
    'Status': m.isInactive ? 'Inactive (>30 days)' : m.meetsMonthlyTarget ? 'Compliant' : 'Behind Schedule (<2 mtgs/mo)',
    'Open Tasks': m.openActionItemsCount,
    'Average Attendance': `${m.avgAttendance || 0}%`,
  }));
  downloadCsv(rows, `MMRMS_Faculty_Mentor_Compliance_${new Date().toISOString().slice(0, 10)}.csv`);
}

export default function HodConsole() {
  const [section, setSection] = useState('overview');
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const { data, loading, error, reload } = useResource('/hod/me/overview');

  if (loading && !data) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl bg-white" />
          <Skeleton className="h-28 rounded-2xl bg-white" />
          <Skeleton className="h-28 rounded-2xl bg-white" />
          <Skeleton className="h-28 rounded-2xl bg-white" />
        </div>
        <Skeleton className="h-96 rounded-2xl bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <EmptyState
          title="Couldn't load HOD workspace"
          description={error.message}
          icon="!"
          action={
            <Button size="sm" variant="secondary" onClick={reload}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const stats = data.stats || {};
  const person = data.hod || {};
  const monthlyCompliance = data.monthlyCompliance || {};
  const academicOverview = data.academicOverview || {};

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { key: 'overview', label: 'Department Overview' },
        {
          key: 'mentors',
          label: 'Faculty Mentors',
          badge:
            monthlyCompliance.belowTargetMentorsCount > 0
              ? `${monthlyCompliance.belowTargetMentorsCount} behind`
              : `${stats.compliancePct || 0}%`,
          badgeTone: monthlyCompliance.belowTargetMentorsCount > 0 ? 'rose' : 'green',
        },
        {
          key: 'meetings',
          label: 'Meeting Reports',
          badge: `${data.allMeetingMinutes?.length || stats.totalMeetingsHeld || 0}`,
          badgeTone: 'indigo',
        },
        {
          key: 'actions',
          label: 'Pending Tasks',
          badge: `${data.longPendingActionItems?.length || 0}`,
          badgeTone: data.longPendingActionItems?.length > 0 ? 'amber' : 'slate',
        },
      ],
    },
    {
      label: 'Students & Batches',
      items: [
        { key: 'students', label: 'Student List', badge: stats.totalStudents },
        { key: 'cohorts', label: 'Batches', badge: stats.totalCohorts },
      ],
    },
  ];

  return (
    <ConsoleLayout
      product="HOD Executive Console"
      navGroups={navGroups}
      activeNav={section}
      onNavChange={(sec) => {
        setSection(sec);
        setSelectedCohort(null);
        setSelectedMentor(null);
      }}
      identity={{
        navKey: 'overview',
        initials: person.initials || 'HOD',
        name: person.name,
        meta: person.designation,
        note: data.department,
      }}
      title={
        section === 'overview'
          ? 'Department Overview'
          : section === 'mentors'
          ? 'Faculty Mentors & Reviews'
          : section === 'meetings'
          ? 'Meeting Reports & Records'
          : section === 'actions'
          ? 'Pending Tasks & Follow-ups'
          : section === 'students'
          ? 'Student List'
          : 'Batches & Performance'
      }
      subtitle={`${data.institution.name} · ${data.department}`}
      greet={section === 'overview'}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={stats.monthlyCompliancePct >= 80 ? 'green' : 'amber'} size="md">
            Monthly Target: {stats.monthlyCompliancePct || 0}%
          </Badge>
          <button
            type="button"
            onClick={() => exportMeetingMinutesCsv(data.allMeetingMinutes || [])}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink shadow-xs transition hover:bg-gray-50 focus:outline-none"
            title="Download complete meeting minutes as CSV"
          >
            Download Minutes (CSV)
          </button>
          <button
            type="button"
            onClick={reload}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink shadow-xs transition hover:bg-gray-50 focus:outline-none"
          >
            Refresh
          </button>
        </div>
      }
      profile={
        <ProfileHeader
          initials={person.initials || 'HOD'}
          name={person.name}
          subtitle={`${person.designation} · ${data.department}`}
          meta={`${person.email} · ${person.cabin}`}
          seed={1}
          defaultOpen={false}
          stats={[
            { label: 'Total Enrolled', value: `${stats.totalStudents || 0} students`, tone: 'brand' },
            { label: 'Faculty Mentors', value: `${stats.totalMentors || 0} faculty`, tone: 'slate' },
            {
              label: 'Monthly Target Met',
              value: `${stats.monthlyCompliancePct || 0}%`,
              tone: stats.monthlyCompliancePct >= 80 ? 'green' : 'amber',
            },
            {
              label: 'Average Attendance',
              value: `${stats.avgAttendance || 0}%`,
              tone: stats.avgAttendance >= 75 ? 'green' : 'amber',
            },
          ]}
          fields={[
            { label: 'Department', value: data.department },
            { label: 'Active Batches', value: `${stats.totalCohorts || 0} batches` },
            { label: 'Average Attendance', value: `${stats.avgAttendance || 0}%` },
            { label: 'Average CGPA', value: `${stats.avgCgpa || 0} / 10.0` },
          ]}
        />
      }
    >
      <div className="animate-fadeRise space-y-6">
        {section === 'overview' && (
          <OverviewSection
            data={data}
            onSelectMentor={(m) => {
              setSelectedMentor(m);
              setSection('mentors');
            }}
            onSelectCohort={(c) => {
              setSelectedCohort(c);
              setSection('cohorts');
            }}
            onViewAllStudents={() => setSection('students')}
            onViewMeetingMinutes={() => setSection('meetings')}
            onViewActionItems={() => setSection('actions')}
          />
        )}

        {section === 'mentors' && (
          <MentorsSection
            mentors={data.mentors || []}
            selectedMentor={selectedMentor}
            onSelectMentor={setSelectedMentor}
            onOpenStudent={setSelectedStudentId}
            archivedMentors={data.archivedStaff?.mentors || []}
          />
        )}

        {section === 'meetings' && (
          <MeetingMinutesSection
            meetings={data.allMeetingMinutes || []}
            onSelectMeeting={setSelectedMeeting}
          />
        )}

        {section === 'actions' && (
          <ActionItemsSection
            actionItems={data.longPendingActionItems || []}
            onOpenStudent={setSelectedStudentId}
          />
        )}

        {section === 'students' && (
          <StudentsSection
            initialStudents={data.allStudents || []}
            onOpenStudent={setSelectedStudentId}
          />
        )}

        {section === 'cohorts' && (
          <CohortsSection
            cohorts={data.cohorts || []}
            selectedCohort={selectedCohort}
            onSelectCohort={setSelectedCohort}
            onOpenStudent={setSelectedStudentId}
          />
        )}
      </div>

      {/* Student Details Modal */}
      {selectedStudentId && (
        <StudentRecordModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}

      {/* Meeting Details Modal */}
      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
        />
      )}
    </ConsoleLayout>
  );
}

/* ── Section: Department Overview ────────────────────────────────────────── */

function OverviewSection({
  data,
  onSelectMentor,
  onSelectCohort,
  onViewAllStudents,
  onViewMeetingMinutes,
  onViewActionItems,
}) {
  const { stats = {}, cohorts = [], mentors = [], academicOverview = {}, monthlyCompliance = {}, inactiveMentors = [], belowTargetMentors = [] } = data;

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Total Students"
          value={stats.totalStudents || 0}
          subtext={`${stats.totalCohorts || 0} active batches`}
          tone="brand"
        />
        <StatTile
          label="Average Attendance"
          value={`${stats.avgAttendance || 0}%`}
          subtext={`${stats.attendanceShortfalls || 0} students < 75%`}
          tone={stats.avgAttendance >= 75 ? 'green' : 'amber'}
        />
        <StatTile
          label="Average CGPA"
          value={`${stats.avgCgpa || 0}`}
          subtext={`${academicOverview.standingArrearsTotal || 0} standing arrears`}
          tone="slate"
        />
        <StatTile
          label="Monthly Target (2/mo)"
          value={`${monthlyCompliance.studentCompliancePct || 0}%`}
          subtext={`${monthlyCompliance.studentsMeetingTarget || 0}/${monthlyCompliance.totalStudents || 0} students on track`}
          tone={monthlyCompliance.studentCompliancePct >= 80 ? 'green' : 'amber'}
        />
        <StatTile
          label="Total Meetings Held"
          value={stats.totalMeetingsHeld || 0}
          subtext={`${stats.compliancePct || 0}% overall compliance`}
          tone={stats.compliancePct >= 80 ? 'green' : 'amber'}
        />
        <StatTile
          label="Inactive Mentors"
          value={inactiveMentors?.length || 0}
          subtext={
            inactiveMentors?.length > 0
              ? 'Over 30 days without review'
              : 'All mentors active'
          }
          tone={inactiveMentors?.length > 0 ? 'rose' : 'green'}
        />
      </div>

      {/* Monthly Target Directives & Attention Cards */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                Monthly Meeting Tracker
              </span>
              <Badge tone="indigo" size="sm">Rule: At Least 2 Meetings / Month</Badge>
            </div>
            <h3 className="text-base font-semibold text-ink mt-0.5">
              Faculty Meeting Progress & Activity
            </h3>
            <p className="text-[12.5px] text-muted">
              Each mentor should conduct at least two meetings per mentee each month. Mentors who need to schedule sessions are listed below.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportMentorComplianceCsv(mentors)}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink shadow-xs transition hover:bg-gray-50 focus:outline-none"
            >
              Download Mentor Report (CSV)
            </button>
            <button
              type="button"
              onClick={() => exportMeetingMinutesCsv(data.allMeetingMinutes || [])}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink shadow-xs transition hover:bg-gray-50 focus:outline-none"
            >
              Download Minutes (CSV)
            </button>
          </div>
        </div>

        {/* Attention Cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Inactive Faculty Alert */}
          <div
            className={`rounded-xl border p-4 transition-all ${
              inactiveMentors?.length > 0
                ? 'border-bad-border bg-bad-surface/40 text-ink'
                : 'border-gray-200/80 bg-white text-ink'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">
                {inactiveMentors?.length > 0
                  ? `Inactive Mentors (${inactiveMentors.length})`
                  : 'Faculty Activity Normal'}
              </h4>
              <Badge tone={inactiveMentors?.length > 0 ? 'rose' : 'green'}>
                {inactiveMentors?.length > 0 ? 'Over 30 Days Without Meeting' : 'Active'}
              </Badge>
            </div>

            {inactiveMentors?.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-[12px] text-bad-ink">
                  The following faculty mentors have not conducted any meetings in the past 30 days:
                </p>
                <div className="divide-y divide-bad-border/40 rounded-xl bg-white p-2 text-[12px] border border-bad-border/40">
                  {inactiveMentors.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onSelectMentor(m)}
                      className="flex cursor-pointer items-center justify-between py-1.5 hover:text-brand-600 transition-colors"
                    >
                      <div>
                        <span className="font-semibold">{m.name}</span>
                        <span className="ml-2 text-muted text-[11px]">{m.staffCode} · {m.cabin}</span>
                      </div>
                      <span className="font-semibold text-bad-ink">
                        {m.lastMeetingDate ? `${m.daysSinceLastMeeting} days ago` : '0 Meetings'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-muted">
                All faculty mentors have conducted mentoring meetings within the past 30 days.
              </p>
            )}
          </div>

          {/* Monthly 2-Meeting Target Deficit */}
          <div
            className={`rounded-xl border p-4 transition-all ${
              belowTargetMentors?.length > 0
                ? 'border-amber-200 bg-amber-50/40 text-ink'
                : 'border-gray-200/80 bg-white text-ink'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">
                {belowTargetMentors?.length > 0
                  ? `Mentors Behind Schedule (${belowTargetMentors.length})`
                  : 'Monthly Target Met'}
              </h4>
              <Badge tone={belowTargetMentors?.length > 0 ? 'amber' : 'green'}>
                {monthlyCompliance.studentsBelowTarget || 0} Students &lt; 2 Meetings
              </Badge>
            </div>

            {belowTargetMentors?.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-[12px] text-amber-900">
                  Faculty mentors with students who have had fewer than 2 meetings this month:
                </p>
                <div className="divide-y divide-amber-200/50 rounded-xl bg-white p-2 text-[12px] border border-amber-200/60">
                  {belowTargetMentors.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onSelectMentor(m)}
                      className="flex cursor-pointer items-center justify-between py-1.5 hover:text-brand-600 transition-colors"
                    >
                      <div>
                        <span className="font-semibold">{m.name}</span>
                        <span className="ml-2 text-muted text-[11px]">
                          {m.menteesBelowTarget} of {m.assignedMentees} students need meetings
                        </span>
                      </div>
                      <span className="font-semibold text-amber-800">
                        {m.monthlyHeld} / {m.monthlyTarget} meetings
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-muted">
                All students across the department have completed at least 2 meetings this month.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Academic & Operations Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Academic & Attendance Overview */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
              Academic & Attendance Status
            </span>
            <Badge tone="indigo">CGPA {stats.avgCgpa || 0}</Badge>
          </div>
          <h4 className="mt-1 text-sm font-semibold text-ink">Department Performance Summary</h4>

          <div className="mt-4 space-y-2.5 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-muted">Average CGPA:</span>
              <span className="font-bold text-ink tnum">{stats.avgCgpa || 0} / 10.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Average Attendance:</span>
              <span className="font-bold text-ink tnum">{stats.avgAttendance || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Attendance Shortfalls (&lt; 75%):</span>
              <span className="font-bold text-bad-ink tnum">{stats.attendanceShortfalls || 0} students</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Standing Arrears Total:</span>
              <span className={`font-bold tnum ${(academicOverview.standingArrearsTotal || 0) > 0 ? 'text-bad-ink' : 'text-good-ink'}`}>
                {academicOverview.standingArrearsTotal || 0} subjects
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[12px]">
            <button
              type="button"
              onClick={onViewAllStudents}
              className="w-full rounded-xl bg-[#464EB8] py-2 text-xs font-medium text-white transition hover:bg-[#3b429f]"
            >
              View Student List
            </button>
          </div>
        </div>

        {/* Review Meetings & Follow-ups */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
              Department Operations
            </span>
            <Badge tone="amber">{data.longPendingActionItems?.length || 0} Pending Tasks</Badge>
          </div>
          <h4 className="mt-1 text-sm font-semibold text-ink">Meetings & Open Follow-ups</h4>

          <div className="mt-4 space-y-2.5 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-muted">Total Reviews Recorded:</span>
              <span className="font-bold text-ink tnum">{data.allMeetingMinutes?.length || stats.totalMeetingsHeld || 0} meetings</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Pending Follow-up Tasks:</span>
              <span className="font-bold text-amber-700 tnum">{data.longPendingActionItems?.length || 0} tasks</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Active Batches Governed:</span>
              <span className="font-bold text-ink tnum">{cohorts.length} batches</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Total Faculty Mentors:</span>
              <span className="font-bold text-ink tnum">{stats.totalMentors || 0} faculty</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={onViewMeetingMinutes}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-xs font-medium text-ink transition hover:bg-gray-50"
            >
              Meeting Reports
            </button>
            <button
              type="button"
              onClick={onViewActionItems}
              className="flex-1 rounded-xl bg-[#464EB8] py-2 text-xs font-medium text-white transition hover:bg-[#3b429f]"
            >
              Pending Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Batch Overview Cards */}
      <SectionCard
        title="Department Batches"
        subtitle="Batch-level performance mapped to Year Coordinators"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cohorts.map((cohort) => (
            <div
              key={cohort.cohortId}
              onClick={() => onSelectCohort(cohort)}
              className="group cursor-pointer rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                    Batch {cohort.cohortId}
                  </span>
                  <h3 className="text-base font-semibold text-ink group-hover:text-brand-700">
                    {cohort.cohortName}
                  </h3>
                  <p className="text-[12px] text-muted">{cohort.year}</p>
                </div>
                <Badge tone={cohort.compliancePct >= 80 ? 'green' : 'amber'}>
                  {cohort.compliancePct}% Meetings
                </Badge>
              </div>

              <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-muted">Coordinator:</span>
                  <span className="font-medium text-ink">{cohort.yearCoordinator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Students:</span>
                  <span className="font-medium text-ink">{cohort.totalStudents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Mentors:</span>
                  <span className="font-medium text-ink">{cohort.totalMentors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Avg Attendance:</span>
                  <span className="font-medium text-ink">{cohort.avgAttendance}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Avg CGPA:</span>
                  <span className="font-medium text-ink">{cohort.avgCgpa}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-muted-soft">
                  <span>Meetings Conducted</span>
                  <span>{cohort.totalHeld}/{cohort.totalDue} ({cohort.compliancePct}%)</span>
                </div>
                <ProgressBar
                  percent={cohort.compliancePct}
                  tone={cohort.compliancePct >= 80 ? 'green' : 'amber'}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Section: Faculty Mentors ────────────────────────────────────────────── */

function MentorsSection({
  mentors = [],
  selectedMentor,
  onSelectMentor,
  onOpenStudent,
  archivedMentors = [],
}) {
  const [filterTab, setFilterTab] = useState('all');
  const [mentorDetail, setMentorDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function openMentorMentees(mentor) {
    onSelectMentor(mentor);
    setLoadingDetail(true);
    try {
      const res = await api(`/hod/me/mentors/${mentor.id}`);
      setMentorDetail(res);
    } catch {
      setMentorDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  const filteredMentors = useMemo(() => {
    if (filterTab === 'below-target') {
      return mentors.filter((m) => m.menteesBelowTarget > 0);
    }
    if (filterTab === 'inactive') {
      return mentors.filter((m) => m.isInactive);
    }
    if (filterTab === 'low-compliance') {
      return mentors.filter((m) => m.compliance < 80);
    }
    return mentors;
  }, [mentors, filterTab]);

  return (
    <div className="space-y-6">
      {/* Tab Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filterTab === 'all'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            All Mentors ({mentors.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('below-target')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filterTab === 'below-target'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            Below Monthly Target ({mentors.filter((m) => m.menteesBelowTarget > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('inactive')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filterTab === 'inactive'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            Inactive (&gt;30 Days) ({mentors.filter((m) => m.isInactive).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('archived')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filterTab === 'archived'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            Previous Mentors ({archivedMentors.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => exportMentorComplianceCsv(mentors)}
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink shadow-xs transition hover:bg-gray-50"
          title="Download full mentor report as CSV"
        >
          Download Mentor Report (CSV)
        </button>
      </div>

      {filterTab === 'archived' ? (
        <SectionTable
          title="Previous Mentors Log"
          subtitle="Faculty mentors previously assigned whose historical meeting records remain saved"
          action={<Badge tone="amber">{archivedMentors.length} Archived</Badge>}
        >
          {archivedMentors.length === 0 ? (
            <EmptyState
              title="No Previous Mentors"
              description="All department faculty mentors are currently active."
            />
          ) : (
            <DataTable
              rows={archivedMentors}
              rowKey={(m) => m.id}
              columns={[
                {
                  key: 'name',
                  header: 'Faculty Member',
                  render: (m) => (
                    <div>
                      <p className="font-semibold text-ink">{m.name}</p>
                      <p className="text-[11px] text-muted">{m.staffCode} · {m.email}</p>
                    </div>
                  ),
                },
                {
                  key: 'dept',
                  header: 'Department & Cabin',
                  render: (m) => (
                    <div>
                      <p className="text-[12px] font-medium text-ink">{m.department || 'CSE'}</p>
                      <p className="text-[11px] text-muted">{m.cabin || 'CSE Block'}</p>
                    </div>
                  ),
                },
                {
                  key: 'archivedAt',
                  header: 'Archived Date',
                  render: (m) => (
                    <span className="text-[12px] text-muted">
                      {m.archivedAt ? new Date(m.archivedAt).toLocaleDateString() : 'Recent'}
                    </span>
                  ),
                },
                {
                  key: 'reason',
                  header: 'Reason',
                  render: (m) => (
                    <span className="text-[12px] text-muted-strong font-medium">
                      {m.archivedReason || 'Reassigned'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  align: 'right',
                  render: () => <Badge tone="amber">Archived</Badge>,
                },
              ]}
            />
          )}
        </SectionTable>
      ) : (
        <SectionTable
          title="Faculty Mentors Directory"
          subtitle="Department mentors, monthly meeting compliance, and student meeting activity"
          action={<Badge tone="indigo">{filteredMentors.length} Mentors</Badge>}
        >
          <DataTable
            rows={filteredMentors}
            rowKey={(m) => m.id}
            onRowClick={openMentorMentees}
            columns={[
              {
                key: 'mentor',
                header: 'Faculty Member',
                render: (m, i) => (
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={m.initials} seed={i} size="sm" />
                    <div>
                      <p className="font-semibold text-ink">{m.name}</p>
                      <p className="text-[11px] text-muted">{m.staffCode} · {m.email}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'cabin',
                header: 'Cabin & Batches',
                render: (m) => (
                  <div>
                    <p className="text-[12px] font-medium text-ink">{m.cabin || 'CSE Block'}</p>
                    <p className="text-[11px] text-muted">{m.batches?.join(', ') || '2024-28 Batch'}</p>
                  </div>
                ),
              },
              {
                key: 'assigned',
                header: 'Assigned Students',
                align: 'right',
                render: (m) => <span className="font-medium tnum">{m.assignedMentees}</span>,
              },
              {
                key: 'monthlyTarget',
                header: 'Monthly 2-Meeting Status',
                align: 'center',
                render: (m) =>
                  m.assignedMentees === 0 ? (
                    <span className="text-[11px] text-muted">No students</span>
                  ) : m.meetsMonthlyTarget ? (
                    <Badge tone="green">Target Met ({m.monthlyHeld} meetings)</Badge>
                  ) : (
                    <Badge tone="rose">
                      {m.menteesBelowTarget} Students Need Meetings ({m.monthlyHeld}/{m.monthlyTarget})
                    </Badge>
                  ),
              },
              {
                key: 'lastMeeting',
                header: 'Last Meeting',
                align: 'right',
                render: (m) => (
                  <div>
                    <p className={`text-[12px] font-semibold ${m.isInactive ? 'text-bad-ink' : 'text-ink'}`}>
                      {m.lastMeetingDate || 'None recorded'}
                    </p>
                    <p className={`text-[10.5px] ${m.isInactive ? 'text-bad-ink font-bold' : 'text-muted'}`}>
                      {m.lastMeetingDate
                        ? `${m.daysSinceLastMeeting} days ago${m.isInactive ? ' (Inactive)' : ''}`
                        : '0 meetings'}
                    </p>
                  </div>
                ),
              },
              {
                key: 'compliance',
                header: 'Compliance',
                align: 'right',
                render: (m) => (
                  <Badge
                    tone={m.compliance >= 80 ? 'green' : m.compliance >= 50 ? 'amber' : 'rose'}
                    className="font-bold text-[12px] tnum"
                  >
                    {m.compliance}%
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Open Tasks',
                align: 'right',
                render: (m) => (
                  <span className={`tnum text-[12px] ${m.openActionItemsCount > 0 ? 'font-semibold text-amber-700' : 'text-muted'}`}>
                    {m.openActionItemsCount} tasks
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                align: 'right',
                render: (m) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMentorMentees(m);
                    }}
                    className={`rounded-xl px-3 py-1 text-xs font-medium transition ${
                      selectedMentor?.id === m.id
                        ? 'bg-[#464EB8] text-white'
                        : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
                    }`}
                  >
                    {selectedMentor?.id === m.id ? 'Active' : 'View Students'}
                  </button>
                ),
              },
            ]}
          />
        </SectionTable>
      )}

      {/* Selected Mentor Detail: Students & What the Mentor Did */}
      {selectedMentor && (
        <SectionTable
          title={`Students Assigned to ${selectedMentor.name}`}
          subtitle={`Showing ${selectedMentor.assignedMentees || 0} students · Staff Code: ${selectedMentor.staffCode} · Cabin: ${selectedMentor.cabin}`}
          action={
            <button
              type="button"
              onClick={() => onSelectMentor(null)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50 transition"
            >
              Close Details
            </button>
          }
        >
          {loadingDetail ? (
            <div className="p-8 text-center text-muted">Loading assigned students…</div>
          ) : (
            <DataTable
              rows={mentorDetail?.mentees || selectedMentor.mentees || []}
              rowKey={(s) => s.id}
              onRowClick={(s) => onOpenStudent(s.id)}
              columns={[
                {
                  key: 'roll',
                  header: 'Roll No',
                  render: (s) => <span className="font-mono font-medium">{s.rollNumber}</span>,
                },
                {
                  key: 'name',
                  header: 'Student Name',
                  render: (s) => (
                    <div>
                      <p className="font-semibold text-ink">{s.name}</p>
                      <p className="text-[11px] text-muted">{s.section || '2024 BCS'}</p>
                    </div>
                  ),
                },
                {
                  key: 'monthlyStatus',
                  header: 'Monthly 2-Meeting Status',
                  render: (s) =>
                    s.meetsMonthlyTarget ? (
                      <Badge tone="green">Target Met (2/2)</Badge>
                    ) : s.meetingsThisMonth === 1 ? (
                      <Badge tone="amber">Needs 1 Meeting (1/2)</Badge>
                    ) : (
                      <Badge tone="rose">0 Meetings Held (0/2)</Badge>
                    ),
                },
                {
                  key: 'meetingsHeld',
                  header: 'Meetings Held',
                  align: 'right',
                  render: (s) => <span className="font-medium tnum">{s.meetingsHeld} meetings</span>,
                },
                {
                  key: 'lastReview',
                  header: 'Last Meeting',
                  align: 'right',
                  render: (s) => (
                    <div>
                      <span className="text-[12px] font-medium text-ink">{s.lastMeetingDate || 'None'}</span>
                      {s.daysSinceLastMeeting !== undefined && s.lastMeetingDate && (
                        <p className={`text-[10px] ${s.daysSinceLastMeeting > 30 ? 'text-bad-ink font-bold' : 'text-muted'}`}>
                          {s.daysSinceLastMeeting} days ago
                        </p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'activity',
                  header: 'What the Mentor Did / Guidance Given',
                  render: (s) => (
                    <div className="max-w-md py-1">
                      <p className="text-[12px] font-medium text-ink line-clamp-1">
                        Topic: <span className="text-muted-strong">{s.recentTopic || 'Academic review'}</span>
                      </p>
                      <p className="text-[11.5px] text-muted-strong line-clamp-1 mt-0.5">
                        Guidance: {s.recentGuidance || 'Continue regular study plan'}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'attendance',
                  header: 'Attendance',
                  align: 'right',
                  render: (s) => (
                    <span className={`tnum ${s.attendance < 75 ? 'font-semibold text-bad-ink' : 'text-ink'}`}>
                      {s.attendance}%
                    </span>
                  ),
                },
                {
                  key: 'cgpa',
                  header: 'CGPA',
                  align: 'right',
                  render: (s) => <span className="tnum font-medium">{s.cgpa?.toFixed(2)}</span>,
                },
                {
                  key: 'arrears',
                  header: 'Arrears',
                  align: 'right',
                  render: (s) => (
                    <span className={`tnum ${s.standingArrears ? 'font-semibold text-bad-ink' : 'text-muted'}`}>
                      {s.standingArrears || 0}
                    </span>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  align: 'right',
                  render: (s) => (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStudent(s.id);
                      }}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50 transition"
                    >
                      View Details
                    </button>
                  ),
                },
              ]}
            />
          )}
        </SectionTable>
      )}
    </div>
  );
}

/* ── Section: Meeting Reports ────────────────────────────────────────────── */

function MeetingMinutesSection({ meetings = [], onSelectMeeting }) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all');

  const filtered = useMemo(() => {
    return meetings.filter((m) => {
      const matchSearch =
        !search ||
        m.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        m.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
        m.mentorName?.toLowerCase().includes(search.toLowerCase()) ||
        m.topicsDiscussed?.toLowerCase().includes(search.toLowerCase());
      const matchMode = filterMode === 'all' || m.mode === filterMode;
      return matchSearch && matchMode;
    });
  }, [meetings, search, filterMode]);

  return (
    <div className="space-y-6">
      <SectionTable
        title="Department Meeting Reports"
        subtitle={`Total of ${meetings.length} review sessions recorded across the department`}
        action={
          <button
            type="button"
            onClick={() => exportMeetingMinutesCsv(filtered)}
            className="rounded-xl bg-[#464EB8] px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#3b429f]"
          >
            Download Minutes (CSV)
          </button>
        }
      >
        {/* Search & Mode Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50/50">
          <div className="w-full sm:w-80">
            <input
              type="text"
              placeholder="Search student, roll no, mentor, topic…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[12px] text-muted">Mode:</span>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-ink focus:outline-none"
            >
              <option value="all">All Modes</option>
              <option value="Offline">Offline</option>
              <option value="Online">Online</option>
            </select>
            <Badge tone="indigo">{filtered.length} Meetings</Badge>
          </div>
        </div>

        <DataTable
          rows={filtered}
          rowKey={(m) => m.id}
          onRowClick={onSelectMeeting}
          empty={<EmptyState title="No meetings found" description="Try clearing your search terms." />}
          columns={[
            {
              key: 'number',
              header: 'Meeting #',
              render: (m) => <span className="font-mono font-bold text-ink">#{m.meetingNumber}</span>,
            },
            {
              key: 'date',
              header: 'Date & Mode',
              render: (m) => (
                <div>
                  <p className="font-medium text-ink">{m.date}</p>
                  <p className="text-[11px] text-muted">{m.mode} · {m.duration}</p>
                </div>
              ),
            },
            {
              key: 'mentor',
              header: 'Faculty Mentor',
              render: (m) => (
                <div>
                  <p className="font-semibold text-ink">{m.mentorName}</p>
                  <p className="text-[11px] text-muted">{m.mentorStaffCode}</p>
                </div>
              ),
            },
            {
              key: 'student',
              header: 'Student',
              render: (m) => (
                <div>
                  <p className="font-semibold text-ink">{m.studentName}</p>
                  <p className="text-[11px] text-muted">{m.rollNumber} · {m.cohort}</p>
                </div>
              ),
            },
            {
              key: 'topics',
              header: 'Topics Discussed & Guidance',
              render: (m) => (
                <div className="max-w-md py-1">
                  <p className="text-[12px] font-medium text-ink line-clamp-1">{m.topicsDiscussed}</p>
                  <p className="text-[11px] text-muted-strong line-clamp-1 mt-0.5">
                    Guidance: {m.mentorSuggestions}
                  </p>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Tasks Assigned',
              render: (m) => (
                <div className="max-w-xs">
                  {m.actionItems?.length > 0 ? (
                    <span className="text-[11.5px] text-muted-strong line-clamp-1">
                      {m.actionItemsText}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted">None</span>
                  )}
                </div>
              ),
            },
            {
              key: 'action',
              header: 'Action',
              align: 'right',
              render: (m) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMeeting(m);
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50 transition"
                >
                  View Details
                </button>
              ),
            },
          ]}
        />
      </SectionTable>
    </div>
  );
}

/* ── Section: Pending Tasks ──────────────────────────────────────────────── */

function ActionItemsSection({ actionItems = [], onOpenStudent }) {
  const [filterTab, setFilterTab] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return actionItems.filter((item) => {
      const matchSearch =
        !search ||
        item.task?.toLowerCase().includes(search.toLowerCase()) ||
        item.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        item.mentorName?.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (filterTab === 'overdue') return item.isOverdue;
      if (filterTab === 'Student') return item.responsible === 'Student';
      if (filterTab === 'Mentor') return item.responsible === 'Mentor';
      return true;
    });
  }, [actionItems, filterTab, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filterTab === 'all'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            All Pending Tasks ({actionItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('overdue')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filterTab === 'overdue'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            Overdue Tasks ({actionItems.filter((a) => a.isOverdue).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('Student')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filterTab === 'Student'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            Assigned to Student
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('Mentor')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filterTab === 'Mentor'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            Assigned to Mentor
          </button>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search task, student, mentor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <SectionTable
        title="Pending Follow-up Tasks"
        subtitle="Tasks created during mentoring reviews that are awaiting completion"
        action={<Badge tone="amber">{filtered.length} Pending</Badge>}
      >
        <DataTable
          rows={filtered}
          rowKey={(item) => item.id}
          columns={[
            {
              key: 'task',
              header: 'Task Description',
              render: (item) => (
                <div className="max-w-md">
                  <p className="font-semibold text-ink text-[12.5px]">{item.task}</p>
                  <p className="text-[11px] text-muted">
                    Assigned in Review #{item.meetingNumber} on {item.meetingDate}
                  </p>
                </div>
              ),
            },
            {
              key: 'responsible',
              header: 'Assigned To',
              render: (item) => (
                <Badge tone={item.responsible === 'Student' ? 'indigo' : 'brand'}>
                  {item.responsible}
                </Badge>
              ),
            },
            {
              key: 'student',
              header: 'Student',
              render: (item) => (
                <div>
                  <p className="font-semibold text-ink">{item.studentName}</p>
                  <p className="text-[11px] text-muted">{item.rollNumber}</p>
                </div>
              ),
            },
            {
              key: 'mentor',
              header: 'Faculty Mentor',
              render: (item) => (
                <div>
                  <p className="font-medium text-ink">{item.mentorName}</p>
                  <p className="text-[11px] text-muted">{item.mentorStaffCode}</p>
                </div>
              ),
            },
            {
              key: 'targetDate',
              header: 'Target Date',
              render: (item) => (
                <div>
                  <p className={`text-[12px] font-medium ${item.isOverdue ? 'text-bad-ink font-semibold' : 'text-ink'}`}>
                    {item.targetDate}
                  </p>
                  <p className={`text-[10.5px] ${item.isOverdue ? 'text-bad-ink font-bold' : 'text-muted'}`}>
                    {item.isOverdue ? 'Overdue' : `Open for ${item.daysOpen} days`}
                  </p>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (item) => (
                <Badge tone={item.status === 'In Progress' ? 'indigo' : 'amber'}>
                  {item.status}
                </Badge>
              ),
            },
            {
              key: 'action',
              header: 'Action',
              align: 'right',
              render: (item) => (
                <button
                  type="button"
                  onClick={() => onOpenStudent(item.studentId)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50 transition"
                >
                  View Details
                </button>
              ),
            },
          ]}
        />
      </SectionTable>
    </div>
  );
}

/* ── Section: Full Student List (Bug Fixed) ───────────────────────────────── */

function StudentsSection({ initialStudents = [], onOpenStudent }) {
  const { data: rawStudents, loading } = useResource('/hod/me/students');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Safely fallback to initialStudents or empty array to avoid null pointer crashes
  const students = useMemo(() => {
    if (Array.isArray(rawStudents)) return rawStudents;
    if (Array.isArray(initialStudents) && initialStudents.length > 0) return initialStudents;
    return [];
  }, [rawStudents, initialStudents]);

  const filtered = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter((s) => {
      const matchSearch =
        !search ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
        s.mentorName?.toLowerCase().includes(search.toLowerCase()) ||
        s.section?.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (filter === 'below-target') return !s.meetsMonthlyTarget;
      if (filter === 'low-attendance') return s.attendance < 75;
      if (filter === 'arrears') return s.standingArrears > 0;
      return true;
    });
  }, [students, search, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            All Students ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('below-target')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filter === 'below-target'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            Below Monthly Target (&lt; 2 Meetings)
          </button>
          <button
            type="button"
            onClick={() => setFilter('low-attendance')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filter === 'low-attendance'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            Attendance &lt; 75%
          </button>
          <button
            type="button"
            onClick={() => setFilter('arrears')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filter === 'arrears'
                ? 'bg-[#464EB8] text-white'
                : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
            }`}
          >
            Standing Arrears
          </button>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search student, roll no, mentor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <SectionTable
        title="Department Student List"
        subtitle="Students across all batches, assigned mentors, review status, attendance, and academics"
        action={<Badge tone="indigo">{filtered.length} Students</Badge>}
      >
        {loading && students.length === 0 ? (
          <div className="p-8 text-center text-muted">Loading student directory…</div>
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(s) => s.id}
            onRowClick={(s) => onOpenStudent(s.id)}
            columns={[
              {
                key: 'roll',
                header: 'Roll No',
                render: (s) => <span className="font-mono font-medium">{s.rollNumber}</span>,
              },
              {
                key: 'name',
                header: 'Student Name',
                render: (s) => (
                  <div>
                    <p className="font-semibold text-ink">{s.name}</p>
                    <p className="text-[11px] text-muted">{s.section || '2024 BCS'}</p>
                  </div>
                ),
              },
              {
                key: 'mentor',
                header: 'Assigned Mentor',
                render: (s) => (
                  <div>
                    <p className="font-medium text-ink">{s.mentorName}</p>
                    <p className="text-[11px] text-muted">{s.mentorStaffCode}</p>
                  </div>
                ),
              },
              {
                key: 'monthlyCompliance',
                header: 'Monthly 2-Meeting Status',
                render: (s) =>
                  s.meetsMonthlyTarget ? (
                    <Badge tone="green">Target Met (2/2)</Badge>
                  ) : s.meetingsThisMonth === 1 ? (
                    <Badge tone="amber">Needs 1 Meeting (1/2)</Badge>
                  ) : (
                    <Badge tone="rose">0 Meetings Held (0/2)</Badge>
                  ),
              },
              {
                key: 'attendance',
                header: 'Attendance',
                align: 'right',
                render: (s) => (
                  <span className={`tnum ${s.attendance < 75 ? 'font-semibold text-bad-ink' : 'text-ink'}`}>
                    {s.attendance}%
                  </span>
                ),
              },
              {
                key: 'cgpa',
                header: 'CGPA',
                align: 'right',
                render: (s) => <span className="tnum font-medium">{s.cgpa?.toFixed(2)}</span>,
              },
              {
                key: 'arrears',
                header: 'Arrears',
                align: 'right',
                render: (s) => (
                  <span className={`tnum ${s.standingArrears ? 'font-semibold text-bad-ink' : 'text-muted'}`}>
                    {s.standingArrears || 0}
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                align: 'right',
                render: (s) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStudent(s.id);
                    }}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50 transition"
                  >
                    View Details
                  </button>
                ),
              },
            ]}
          />
        )}
      </SectionTable>
    </div>
  );
}

/* ── Section: Batches ────────────────────────────────────────────────────── */

function CohortsSection({
  cohorts = [],
  selectedCohort,
  onSelectCohort,
  onOpenStudent,
}) {
  const [cohortStudents, setCohortStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  async function loadCohortDetail(cohort) {
    onSelectCohort(cohort);
    setLoadingStudents(true);
    try {
      const res = await api(`/hod/me/cohorts/${cohort.cohortId}`);
      setCohortStudents(res.students || []);
      if (res.cohort) {
        onSelectCohort(res.cohort);
      }
    } catch {
      setCohortStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionTable
        title="Department Batches Directory"
        subtitle="Batches, assigned Year Coordinators, and student progress"
        action={<Badge tone="indigo">{cohorts.length} Batches</Badge>}
      >
        <DataTable
          rows={cohorts}
          rowKey={(c) => c.cohortId}
          onRowClick={loadCohortDetail}
          columns={[
            {
              key: 'cohort',
              header: 'Batch',
              render: (c) => (
                <div>
                  <p className="font-semibold text-ink">{c.cohortName}</p>
                  <p className="text-[11px] text-muted">ID: {c.cohortId} · {c.year}</p>
                </div>
              ),
            },
            {
              key: 'yc',
              header: 'Year Coordinator',
              render: (c) => (
                <div>
                  <p className="font-medium text-ink">{c.yearCoordinator}</p>
                  <p className="text-[11px] text-muted">{c.coordinatorEmail} · {c.coordinatorRoom}</p>
                </div>
              ),
            },
            {
              key: 'students',
              header: 'Students',
              align: 'right',
              render: (c) => <span className="font-medium tnum">{c.totalStudents}</span>,
            },
            {
              key: 'attendance',
              header: 'Avg Attendance',
              align: 'right',
              render: (c) => <span className="font-medium tnum">{c.avgAttendance}%</span>,
            },
            {
              key: 'cgpa',
              header: 'Avg CGPA',
              align: 'right',
              render: (c) => <span className="font-medium tnum">{c.avgCgpa}</span>,
            },
            {
              key: 'compliance',
              header: 'Meeting Compliance',
              align: 'right',
              render: (c) => (
                <Badge
                  tone={c.compliancePct >= 80 ? 'green' : c.compliancePct >= 50 ? 'amber' : 'rose'}
                  className="font-bold text-[12px] tnum"
                >
                  {c.compliancePct}%
                </Badge>
              ),
            },
            {
              key: 'action',
              header: 'Action',
              align: 'right',
              render: (c) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadCohortDetail(c);
                  }}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition ${
                    selectedCohort?.cohortId === c.cohortId
                      ? 'bg-[#464EB8] text-white'
                      : 'border border-gray-200 bg-white text-ink hover:bg-gray-50'
                  }`}
                >
                  {selectedCohort?.cohortId === c.cohortId ? 'Active' : 'View Batch'}
                </button>
              ),
            },
          ]}
        />
      </SectionTable>

      {/* Cohort Detail Student List */}
      {selectedCohort && (
        <SectionTable
          title={`Students in ${selectedCohort.cohortName} (${selectedCohort.cohortId})`}
          subtitle={`Year Coordinator: ${selectedCohort.yearCoordinator} · ${cohortStudents.length} enrolled students`}
          action={
            <button
              type="button"
              onClick={() => onSelectCohort(null)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50 transition"
            >
              Close Batch View
            </button>
          }
        >
          {loadingStudents ? (
            <div className="p-8 text-center text-muted">Loading batch students…</div>
          ) : (
            <DataTable
              rows={cohortStudents}
              rowKey={(s) => s.id}
              onRowClick={(s) => onOpenStudent(s.id)}
              columns={[
                {
                  key: 'roll',
                  header: 'Roll No',
                  render: (s) => <span className="font-mono font-medium">{s.rollNumber}</span>,
                },
                {
                  key: 'name',
                  header: 'Student Name',
                  render: (s) => <span className="font-semibold text-ink">{s.name}</span>,
                },
                {
                  key: 'mentor',
                  header: 'Mentor',
                  render: (s) => <span className="text-muted-strong">{s.mentor || s.mentorName || '—'}</span>,
                },
                {
                  key: 'attendance',
                  header: 'Attendance',
                  align: 'right',
                  render: (s) => (
                    <span className={`tnum ${s.attendance < 75 ? 'font-semibold text-bad-ink' : 'text-ink'}`}>
                      {s.attendance}%
                    </span>
                  ),
                },
                {
                  key: 'cgpa',
                  header: 'CGPA',
                  align: 'right',
                  render: (s) => <span className="tnum font-medium">{s.cgpa?.toFixed(2)}</span>,
                },
                {
                  key: 'arrears',
                  header: 'Arrears',
                  align: 'right',
                  render: (s) => (
                    <span className={`tnum ${s.standingArrears ? 'font-semibold text-bad-ink' : 'text-muted-soft'}`}>
                      {s.standingArrears || 0}
                    </span>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  align: 'right',
                  render: (s) => (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStudent(s.id);
                      }}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-gray-50 transition"
                    >
                      View Details
                    </button>
                  ),
                },
              ]}
            />
          )}
        </SectionTable>
      )}
    </div>
  );
}

/* ── Modal: Meeting Details Modal ─────────────────────────────────────────── */

function MeetingDetailModal({ meeting, onClose }) {
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{ backgroundColor: '#ffffff', color: '#12131A' }}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-slideUp text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="indigo">Meeting #{meeting.meetingNumber}</Badge>
              <Badge tone={meeting.mode === 'Online' ? 'indigo' : 'slate'}>{meeting.mode}</Badge>
            </div>
            <h2 className="text-xl font-bold text-ink mt-1">
              Mentoring Meeting #{meeting.meetingNumber}
            </h2>
            <p className="text-[12px] text-muted">
              Conducted on {meeting.date} · Duration: {meeting.duration}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm">
          {/* Key Parties */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <span className="text-[11px] text-muted font-semibold uppercase">Faculty Mentor</span>
              <p className="text-base font-bold text-ink">{meeting.mentorName}</p>
              <p className="text-[12px] text-muted">{meeting.mentorStaffCode} · {meeting.mentorCabin}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <span className="text-[11px] text-muted font-semibold uppercase">Student</span>
              <p className="text-base font-bold text-ink">{meeting.studentName}</p>
              <p className="text-[12px] text-muted">{meeting.rollNumber} · {meeting.cohort}</p>
            </div>
          </div>

          {/* Topics Discussed */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-2 bg-white">
            <h4 className="font-semibold text-ink text-sm">Topics Discussed</h4>
            <p className="text-[13px] text-muted-strong leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
              {meeting.topicsDiscussed}
            </p>
          </div>

          {/* Student Concerns & Mentor Guidance */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4 space-y-1.5 bg-white">
              <h4 className="font-semibold text-ink text-xs uppercase tracking-wide text-amber-800">
                Student Concerns
              </h4>
              <p className="text-[12.5px] text-muted-strong bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                {meeting.studentConcerns || 'None recorded'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 space-y-1.5 bg-white">
              <h4 className="font-semibold text-ink text-xs uppercase tracking-wide text-brand-700">
                Mentor Guidance
              </h4>
              <p className="text-[12.5px] text-muted-strong bg-brand-50/40 p-2.5 rounded-xl border border-brand-100">
                {meeting.mentorSuggestions || 'Continue academic routine'}
              </p>
            </div>
          </div>

          {/* Action Items */}
          {meeting.actionItems?.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-4 space-y-2 bg-white">
              <h4 className="font-semibold text-ink text-sm">Action Items</h4>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 text-[12px]">
                {meeting.actionItems.map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white">
                    <div>
                      <span className="font-semibold text-ink">{a.task}</span>
                      <p className="text-[11px] text-muted">
                        Responsible: <span className="font-medium text-brand-600">{a.responsible}</span> · Target: {a.targetDate}
                      </p>
                    </div>
                    <Badge tone={a.status === 'Completed' ? 'green' : 'amber'}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-3 text-[12px] text-muted">
            <div className="flex items-center gap-3">
              <span>Mentor: {meeting.mentorSigned ? 'Signed' : 'Pending'}</span>
              <span>Student: {meeting.studentSigned ? 'Signed' : 'Pending'}</span>
            </div>
            {meeting.nextReviewDate && (
              <span className="font-medium text-ink">Next Review: {meeting.nextReviewDate}</span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Modal: Student Record Read-Only View ─────────────────────────────────── */

function StudentRecordModal({ studentId, onClose }) {
  const { data: record, loading, error } = useResource(`/hod/me/students/${studentId}`);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const name =
    record?.identity?.name ||
    record?.profile?.personal?.name ||
    record?.name ||
    'Student Details';

  const rollNumber =
    record?.identity?.rollNumber ||
    record?.profile?.personal?.rollNumber ||
    record?.rollNumber ||
    '—';

  const registerNumber =
    record?.identity?.registerNumber ||
    record?.registerNumber ||
    '—';

  const programme =
    record?.identity?.programme ||
    record?.profile?.personal?.programme ||
    record?.programme ||
    'B.E. Computer Science and Engineering';

  const batch =
    record?.identity?.batch ||
    record?.profile?.personal?.batch ||
    record?.batch ||
    '';

  const section =
    record?.identity?.section ||
    record?.profile?.personal?.section ||
    record?.section ||
    '';

  const attendance =
    record?.attendance?.currentPercentage ??
    record?.attendance?.current ??
    record?.attendance ??
    0;

  const cgpaRaw =
    record?.academics?.cgpa ??
    record?.sectionOne?.academicBackground?.currentCgpa ??
    record?.performance?.cgpa ??
    record?.cgpa;
  const cgpa = typeof cgpaRaw === 'number' ? cgpaRaw.toFixed(2) : (cgpaRaw || '—');

  const standingArrears =
    record?.academics?.standingArrears ??
    record?.sectionOne?.academicBackground?.standingArrears ??
    record?.performance?.standingArrears ??
    record?.standingArrears ??
    0;

  const mentorName =
    record?.identity?.mentor?.name ||
    record?.profile?.mentor?.name ||
    record?.mentorName ||
    '—';

  const mentorCabin =
    record?.identity?.mentor?.cabin ||
    record?.profile?.mentor?.cabin ||
    '';

  const mentorEmail =
    record?.identity?.mentor?.email ||
    record?.profile?.mentor?.email ||
    '';

  const studentEmail =
    record?.identity?.email ||
    record?.profile?.personal?.email ||
    '—';

  const studentMobile =
    record?.identity?.mobile ||
    record?.profile?.personal?.mobile ||
    '—';

  const parentName =
    record?.identity?.parentName ||
    '—';

  const parentContact =
    record?.identity?.parentContact ||
    '—';

  const hostelOrDayScholar =
    record?.identity?.hostelOrDayScholar ||
    '—';

  const meetingList = Array.isArray(record?.meetings)
    ? record.meetings
    : Array.isArray(record?.meetings?.rows)
    ? record.meetings.rows
    : [];

  const goalsList = Array.isArray(record?.goals)
    ? record.goals
    : [];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{ backgroundColor: '#ffffff', color: '#12131A' }}
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-slideUp text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
              Student Record (Read-Only)
            </span>
            <h2 className="text-xl font-bold text-ink mt-0.5">
              {name}
            </h2>
            <p className="text-[12px] text-muted">
              Roll No: <span className="font-mono font-semibold text-ink">{rollNumber}</span> · Register No: <span className="font-mono">{registerNumber}</span> · {programme} {batch ? `· ${batch}` : ''} {section ? `(${section})` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>

        {loading && <div className="p-8 text-center text-muted">Loading student record…</div>}
        {error && <div className="p-8 text-center text-bad-ink">{error.message}</div>}

        {record && (
          <div className="mt-5 space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 text-center">
                <span className="text-[11px] text-muted font-medium">Attendance</span>
                <p className={`text-xl font-bold tnum mt-0.5 ${attendance < 75 ? 'text-bad-ink' : 'text-ink'}`}>
                  {attendance}%
                </p>
                <span className="text-[10px] text-muted">
                  {attendance >= 75 ? 'Satisfactory' : 'Attendance Shortage'}
                </span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 text-center">
                <span className="text-[11px] text-muted font-medium">Cumulative GPA</span>
                <p className="text-xl font-bold text-ink tnum mt-0.5">{cgpa}</p>
                <span className="text-[10px] text-muted">Out of 10.0 scale</span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 text-center">
                <span className="text-[11px] text-muted font-medium">Standing Arrears</span>
                <p className={`text-xl font-bold tnum mt-0.5 ${standingArrears > 0 ? 'text-bad-ink' : 'text-emerald-700'}`}>
                  {standingArrears}
                </p>
                <span className="text-[10px] text-muted">
                  {standingArrears === 0 ? 'Clean academic record' : 'Pending exams'}
                </span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 text-center">
                <span className="text-[11px] text-muted font-medium">Assigned Mentor</span>
                <p className="text-sm font-bold text-ink mt-0.5 line-clamp-1">{mentorName}</p>
                <span className="text-[10px] text-muted line-clamp-1">
                  {mentorCabin || mentorEmail || 'Faculty Advisor'}
                </span>
              </div>
            </div>

            {/* Profile & Contact Details */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h4 className="font-semibold text-ink text-sm border-b border-gray-100 pb-2">Student & Family Information</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-[12px]">
                <div>
                  <span className="text-muted block text-[11px]">Email Address</span>
                  <span className="font-medium text-ink break-all">{studentEmail}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Contact Mobile</span>
                  <span className="font-medium text-ink">{studentMobile}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Accommodation</span>
                  <span className="font-medium text-ink">{hostelOrDayScholar}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Parent / Guardian</span>
                  <span className="font-medium text-ink">{parentName}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Parent Contact</span>
                  <span className="font-medium text-ink">{parentContact}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Assigned Mentor</span>
                  <span className="font-medium text-ink">{mentorName} {mentorCabin ? `(${mentorCabin})` : ''}</span>
                </div>
              </div>
            </div>

            {/* Active Goals */}
            {goalsList.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="font-semibold text-ink text-sm">Academic & Career Goals</h4>
                  <Badge tone="indigo">{goalsList.length} Goals Defined</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {goalsList.map((g, idx) => (
                    <div key={g.id || idx} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 p-2.5 text-[12px] border border-gray-100">
                      <div>
                        <span className="font-semibold text-ink">{g.text || g.title}</span>
                        {g.deadline && <span className="ml-2 text-muted text-[11px]">Target: {g.deadline}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium tnum text-muted text-[11px]">{g.percent || 0}%</span>
                        <Badge tone={g.status === 'Completed' ? 'green' : 'amber'}>{g.status || 'In Progress'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meetings History */}
            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div>
                  <h4 className="font-semibold text-ink text-sm">Mentoring Review History</h4>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Total recorded mentoring sessions: {meetingList.length} reviews
                  </p>
                </div>
                <Badge tone="indigo">{meetingList.length} Meetings</Badge>
              </div>

              {meetingList.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {meetingList.map((m, idx) => {
                    const meetingNum = m.meetingNumber ?? m.number ?? (idx + 1);
                    return (
                      <div key={m.id || idx} className="rounded-xl bg-gray-50/80 p-3.5 text-[12px] border border-gray-100">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-medium text-ink">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink">Meeting #{meetingNum}</span>
                            <span className="text-muted">· {m.date}</span>
                            {m.duration && <span className="text-muted">({m.duration})</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={m.mode === 'Online' ? 'indigo' : 'slate'}>{m.mode || 'In-Person'}</Badge>
                            <Badge tone={m.mentorSigned && m.studentSigned ? 'green' : 'amber'}>
                              {m.mentorSigned && m.studentSigned ? 'Signed' : 'Pending Signature'}
                            </Badge>
                          </div>
                        </div>

                        {m.topicsDiscussed && (
                          <div className="mt-2.5 text-muted-strong bg-white p-2.5 rounded-lg border border-gray-100">
                            <span className="font-semibold text-ink">Topics Discussed:</span> {m.topicsDiscussed}
                          </div>
                        )}

                        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-lg bg-amber-50/50 p-2.5 border border-amber-100/60">
                            <p className="font-semibold text-[11px] uppercase tracking-wide text-amber-900">Student Concerns</p>
                            <p className="mt-0.5 text-ink leading-relaxed">{m.studentConcerns || 'None recorded'}</p>
                          </div>
                          <div className="rounded-lg bg-indigo-50/40 p-2.5 border border-indigo-100/60">
                            <p className="font-semibold text-[11px] uppercase tracking-wide text-brand-700">Mentor Guidance & Suggestions</p>
                            <p className="mt-0.5 text-ink leading-relaxed">{m.mentorSuggestions || 'Continue academic routine'}</p>
                          </div>
                        </div>

                        {m.actionItems?.length > 0 && (
                          <div className="mt-2.5">
                            <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Action Items:</span>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {m.actionItems.map((a, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-ink border border-gray-200">
                                  <span className="text-muted">[{a.responsible || 'Student'}]</span>
                                  <span>{a.task}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                    a.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {a.status}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {m.nextReviewDate && m.nextReviewDate !== '—' && (
                          <p className="mt-2 text-[11px] text-muted">
                            Next Scheduled Review: <span className="font-medium text-ink">{m.nextReviewDate}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 p-6 text-center text-muted text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No mentoring meetings have been recorded yet for this student.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
