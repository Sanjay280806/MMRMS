import { useState } from 'react';
import { api, getToken } from '../../api/client.js';
import { ConsoleLayout } from '../../components/layout/ConsoleLayout.jsx';
import { ProfileHeader } from '../../components/profile/ProfileHeader.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { TextArea, TextField } from '../../components/ui/Field.jsx';
import { SectionCard, SectionTable } from '../../components/ui/SectionCard.jsx';
import { DashboardSkeleton } from '../../components/ui/Skeleton.jsx';
import { StatTile } from '../../components/ui/StatTile.jsx';
import { useResource } from '../../hooks/useResource.js';
import { ExcelUploadSection } from './ExcelUploadSection.jsx';
import { MentorReassignmentTool } from '../../components/reassignment/MentorReassignmentTool.jsx';
import { MentorAssignmentTool } from '../../components/assignment/MentorAssignmentTool.jsx';
import { MentorDashboardModal } from '../../components/oversight/MentorDashboardModal.jsx';
import { downloadConsolidatedReport } from '../../lib/meetingReports.js';

const titles = {
  advisor: {
    dashboard: 'Class Advisor Dashboard', students: 'Class Students', attendance: 'Attendance Follow-up',
    academics: 'Academic & Discipline Watch', operations: 'Class Coordination', mentors: 'Mentor Coordination',
  },
  coordinator: {
    dashboard: 'Mentor Coordinator Dashboard', reports: 'Meeting Reports & Archive', mentors: 'Mentor Tracker',
    upload: 'Excel / ERP Data Upload', assignment: 'Mentor Assignment', reassignment: 'Mentor Reassignment',
    audit: 'Audit & Accreditation Readiness',
  },
};

// Clean CSV export helper
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

function exportMeetingMinutesCsv(meetings, filenamePrefix = 'MMRMS_Meeting_Minutes') {
  if (!meetings || !meetings.length) return;
  const rows = meetings.map((m) => ({
    'Review No': m.meetingNumber,
    'Date': m.date,
    'Mode': m.mode || 'Offline',
    'Duration': m.duration || '30 min',
    'Mentor Name': m.mentorName,
    'Mentor Staff Code': m.mentorStaffCode,
    'Student Name': m.studentName,
    'Roll Number': m.rollNumber,
    'Batch': m.cohort || '2024 BCS',
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
  downloadCsv(rows, `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportMentorComplianceCsv(mentors, filenamePrefix = 'MMRMS_Faculty_Mentor_Compliance') {
  if (!mentors || !mentors.length) return;
  const rows = mentors.map((m) => ({
    'Staff Code': m.staffCode,
    'Mentor Name': m.name,
    'Department': m.department || 'CSE',
    'Cabin': m.cabin || 'CSE Block',
    'Assigned Students': m.assignedMentees ?? m.menteeCount ?? m.assigned ?? 0,
    'Monthly Target Meetings (2 per student)': m.monthlyTarget ?? (((m.assignedMentees ?? m.menteeCount ?? m.assigned ?? 0) * 2)),
    'Monthly Meetings Conducted': m.monthlyHeld ?? 0,
    'Students Below Target (< 2 meetings)': m.menteesBelowTarget ?? 0,
    'Monthly Compliance %': `${m.monthlyCompliancePct ?? 100}%`,
    'Total Meetings Held': m.meetingsHeld ?? 0,
    'Last Review Date': m.lastMeetingDate ?? 'None',
    'Days Since Last Meeting': m.daysSinceLastMeeting ?? 0,
    'Status': m.isInactive ? 'Inactive (>30 days)' : m.meetsMonthlyTarget ? 'Compliant' : 'Behind Schedule (<2 mtgs/mo)',
  }));
  downloadCsv(rows, `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
}

const statusTone = (status) => {
  if (['Completed', 'Resolved', 'Approved'].includes(status)) return 'green';
  if (['Rejected', 'Cancelled'].includes(status)) return 'rose';
  if (['Pending', 'Raised', 'In Progress', 'Referred'].includes(status)) return 'amber';
  return 'indigo';
};

async function downloadDatasetExport() {
  try {
    const token = getToken();
    const res = await fetch('/api/coordinator/me/export/excel', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMRMS_2024_BCS_Students_Export.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export error:', err);
  }
}

export function AdvisorConsole() {
  return <OversightConsole role="advisor" />;
}

export function CoordinatorConsole() {
  return <OversightConsole role="coordinator" />;
}

function OversightConsole({ role }) {
  const [section, setSection] = useState('dashboard');
  const [composer, setComposer] = useState(null);
  const endpoint = `/${role}/me/overview`;
  const { data, loading, error, reload } = useResource(endpoint);

  if (loading && !data) return <div className="p-8"><DashboardSkeleton /></div>;
  if (error) {
    return <div className="p-8"><EmptyState title="Couldn't load this workspace" description={error.message} icon="!" action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>} /></div>;
  }

  const isAdvisor = role === 'advisor';
  const person = isAdvisor ? data.advisor : data.coordinator;
  const stats = data.stats;
  const groups = isAdvisor
    ? [
      { label: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard' }, { key: 'students', label: 'Students', badge: stats.enrolled }] },
      { label: 'Monitoring', items: [{ key: 'attendance', label: 'Attendance', badge: stats.attendanceShortfalls, badgeTone: 'rose' }, { key: 'academics', label: 'Academics & Discipline', badge: stats.academicConcerns, badgeTone: 'rose' }] },
      { label: 'Coordination', items: [{ key: 'operations', label: 'Meetings & Grievances', badge: stats.openGrievances, badgeTone: 'rose' }, { key: 'mentors', label: 'Mentor Coordination' }] },
    ]
    : [
      {
        label: 'Overview',
        items: [
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'reports', label: 'Meeting Reports' },
        ],
      },
      {
        label: 'Data & Operations',
        items: [
          { key: 'upload', label: 'Excel Data Import', badge: 'ERP', badgeTone: 'indigo' },
          { key: 'assignment', label: 'Mentor Assignment' },
          { key: 'reassignment', label: 'Mentor Reassignment' },
          { key: 'audit', label: 'Audit & Accreditation' },
        ],
      },
    ];

  function navigate(next) {
    setSection(next);
    setComposer(null);
  }

  const action = isAdvisor
    ? <Button size="sm" onClick={() => { setSection('operations'); setComposer('meeting'); }}>＋ Plan class meeting</Button>
    : (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setSection('upload')}>
          ⚡ Upload Excel / CSV
        </Button>
      </div>
    );

  return (
    <ConsoleLayout
      product={isAdvisor ? 'Class Advisor Console' : 'Mentor Coordinator Console'}
      navGroups={groups}
      activeNav={section}
      onNavChange={navigate}
      identity={{ navKey: 'dashboard', initials: person.initials, name: person.name, meta: person.designation, note: isAdvisor ? `${person.className} · ${person.year}` : `${person.programme} · ${person.year}` }}
      title={titles[role][section]}
      subtitle={`${data.institution.shortName} · ${data.institution.term} · role-based institutional tracking`}
      greet={section === 'dashboard'}
      actions={action}
      profile={<ProfileHeader initials={person.initials} name={person.name} subtitle={`${person.designation} · ${person.department}`} meta={`${person.email} · ${person.room}`} seed={person.name.length} defaultOpen={false} stats={profileStats(role, stats)} fields={profileFields(role, person, stats)} />}
    >
      <div className="animate-fadeRise space-y-5">
        {isAdvisor && <AdvisorSections section={section} data={data} reload={reload} composer={composer} setComposer={setComposer} />}
        {!isAdvisor && <CoordinatorSections section={section} data={data} reload={reload} composer={composer} setComposer={setComposer} navigate={navigate} />}
      </div>
    </ConsoleLayout>
  );
}

function profileStats(role, stats) {
  return role === 'advisor'
    ? [
      { label: 'Class strength', value: stats.enrolled, tone: 'indigo' },
      { label: 'Average attendance', value: `${stats.averageAttendance}%`, tone: stats.averageAttendance < 75 ? 'rose' : 'green' },
      { label: 'Open grievances', value: stats.openGrievances, tone: stats.openGrievances ? 'rose' : 'green' },
      { label: 'Academic follow-ups', value: stats.academicConcerns, tone: stats.academicConcerns ? 'amber' : 'green' },
    ]
    : [
      { label: 'Students', value: stats.students, tone: 'indigo' },
      { label: 'Mentors', value: stats.mentors, tone: 'indigo' },
      { label: 'Mentor compliance', value: `${stats.mentorCompliance}%`, tone: stats.mentorCompliance >= 80 ? 'green' : 'amber' },
    ];
}

function profileFields(role, person, stats) {
  const classFields = [
    { key: 'Class', value: person.className }, { key: 'Year', value: person.year }, { key: 'Mentor Coordinator', value: person.yearCoordinator },
    { key: 'Email ID', value: person.email }, { key: 'Mobile number', value: person.mobile }, { key: 'Class room', value: person.room },
    { key: 'Students tracked', value: String(stats.enrolled) }, { key: 'Discipline incidents', value: String(stats.disciplineIncidents) },
  ];
  const yearFields = [
    { key: 'Programme', value: person.programme }, { key: 'Year', value: person.year }, { key: 'Email ID', value: person.email },
    { key: 'Mobile number', value: person.mobile }, { key: 'Room', value: person.room }, { key: 'Students tracked', value: String(stats.students) },
    { key: 'Mentors monitored', value: String(stats.mentors) }, /* { key: 'Planned year events', value: String(stats.plannedEvents) }, */
  ];
  return role === 'advisor' ? classFields : yearFields;
}

function AdvisorSections({ section, data, reload, composer, setComposer }) {
  if (section === 'dashboard') return <AdvisorDashboard data={data} />;
  if (section === 'students') return <StudentDirectory role="advisor" />;
  if (section === 'attendance') return <StudentWatch title="Attendance Follow-up" subtitle="Students below the 75% institutional attendance requirement" rows={data.attendanceWatch} metric="attendance" />;
  if (section === 'academics') return <AcademicAndDiscipline data={data} />;
  if (section === 'operations') return <AdvisorOperations data={data} reload={reload} composer={composer} setComposer={setComposer} />;
  return <MentorTracker rows={data.mentorTracker} />;
}

function CoordinatorSections({ section, data, reload, composer, setComposer, navigate }) {
  const [inspectingMentorId, setInspectingMentorId] = useState(null);

  return (
    <>
      {(section === 'dashboard' || section === 'mentors') && (
        <CoordinatorDashboard
          data={data}
          onNavigate={navigate}
          onInspectMentor={setInspectingMentorId}
          onReload={reload}
        />
      )}
      {section === 'reports' && (
        <MeetingReportsSection
          data={data}
          onInspectMentor={setInspectingMentorId}
          onReload={reload}
        />
      )}
      {section === 'upload' && <ExcelUploadSection onUploadSuccess={reload} onNavigate={navigate} />}
      {section === 'assignment' && <MentorAssignmentTool role="coordinator" onSuccess={reload} onCancel={() => navigate('dashboard')} />}
      {section === 'reassignment' && <MentorReassignmentTool role="coordinator" onSuccess={reload} onCancel={() => navigate('dashboard')} />}
      {section === 'audit' && <AuditPanel rows={data.audit} tracker={data.academicTracker} />}

      {inspectingMentorId && (
        <MentorDashboardModal
          mentorId={inspectingMentorId}
          onClose={() => setInspectingMentorId(null)}
          onReload={reload}
        />
      )}
    </>
  );
}

function CoordinatorDashboard({ data, onNavigate, onInspectMentor, onReload }) {
  const mentors = data.mentors || [];
  const inactiveMentors = data.inactiveMentors || [];
  const belowTargetMentors = data.belowTargetMentors || [];
  const monthlyCompliance = data.monthlyCompliance || {};
  const allMeetingMinutes = data.allMeetingMinutes || [];

  return (
    <div className="space-y-6">
      {/* Alert Card: Monthly Meeting Tracker (matching HOD logic and coordinator spec) */}
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
              onClick={() => exportMeetingMinutesCsv(allMeetingMinutes)}
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
              inactiveMentors.length > 0
                ? 'border-bad-border bg-bad-surface/40 text-ink'
                : 'border-gray-200/80 bg-white text-ink'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">
                {inactiveMentors.length > 0
                  ? `Inactive Mentors (${inactiveMentors.length})`
                  : 'Faculty Activity Normal'}
              </h4>
              <Badge tone={inactiveMentors.length > 0 ? 'rose' : 'green'}>
                {inactiveMentors.length > 0 ? 'Over 30 Days Without Meeting' : 'Active'}
              </Badge>
            </div>

            {inactiveMentors.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-[12px] text-bad-ink">
                  The following faculty mentors have not conducted any meetings in the past 30 days:
                </p>
                <div className="divide-y divide-bad-border/40 rounded-xl bg-white p-2 text-[12px] border border-bad-border/40">
                  {inactiveMentors.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onInspectMentor?.(m.id)}
                      className="flex cursor-pointer items-center justify-between py-1.5 hover:text-brand-600 transition-colors"
                    >
                      <div>
                        <span className="font-semibold">{m.name}</span>
                        <span className="ml-2 text-muted text-[11px]">{m.staffCode} · {m.cabin || 'CSE Block'}</span>
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
              belowTargetMentors.length > 0
                ? 'border-amber-200 bg-amber-50/40 text-ink'
                : 'border-gray-200/80 bg-white text-ink'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">
                {belowTargetMentors.length > 0
                  ? `Mentors Behind Schedule (${belowTargetMentors.length})`
                  : 'Monthly Target Met'}
              </h4>
              <Badge tone={belowTargetMentors.length > 0 ? 'amber' : 'green'}>
                {monthlyCompliance.studentsBelowTarget || 0} Students &lt; 2 Meetings
              </Badge>
            </div>

            {belowTargetMentors.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-[12px] text-amber-900">
                  Faculty mentors with students who have had fewer than 2 meetings this month:
                </p>
                <div className="divide-y divide-amber-200/50 rounded-xl bg-white p-2 text-[12px] border border-amber-200/60">
                  {belowTargetMentors.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onInspectMentor?.(m.id)}
                      className="flex cursor-pointer items-center justify-between py-1.5 hover:text-brand-600 transition-colors"
                    >
                      <div>
                        <span className="font-semibold">{m.name}</span>
                        <span className="ml-2 text-muted text-[11px]">{m.staffCode}</span>
                      </div>
                      <span className="font-semibold text-amber-900">
                        {m.menteesBelowTarget} mentee{m.menteesBelowTarget === 1 ? '' : 's'} behind
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-muted">
                All faculty mentors are on track with their monthly meeting requirements.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mentor Tracker with Batch Filter */}
      <MentorTracker
        rows={mentors}
        batches={data.batches || ['All Batches', '2024 BCS']}
        onNavigate={onNavigate}
        onInspectMentor={onInspectMentor}
        onReload={onReload}
      />
    </div>
  );
}

function MentorTracker({ rows = [], batches = ['All Batches', '2024 BCS'], compact = false, onNavigate, onInspectMentor, onReload }) {
  const [filter, setFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('All Batches');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  async function handleToggleSoftDelete(mentor, shouldSoftDelete) {
    setActionLoadingId(mentor.id);
    setStatusMessage(null);
    try {
      await api(`/coordinator/me/mentors/${mentor.id}/soft-delete`, {
        method: 'POST',
        body: {
          softDelete: shouldSoftDelete,
          reason: shouldSoftDelete ? 'Archived by Mentor Coordinator' : 'Restored by Mentor Coordinator',
        },
      });
      setConfirmDeleteId(null);
      setStatusMessage(`${mentor.name} was successfully ${shouldSoftDelete ? 'archived' : 'restored'}.`);
      if (onReload) onReload();
    } catch (err) {
      setStatusMessage(`Error: ${err.message || 'Operation failed'}`);
    } finally {
      setActionLoadingId(null);
    }
  }

  const batchFilteredRows = rows.filter((r) => {
    if (batchFilter === 'All Batches') return true;
    return r.batches?.includes(batchFilter) || r.section === batchFilter;
  });

  const activeCount = batchFilteredRows.filter((r) => !r.archived).length;
  const archivedCount = batchFilteredRows.filter((r) => r.archived).length;

  const filteredRows = batchFilteredRows.filter((r) => {
    if (filter === 'active') return !r.archived;
    if (filter === 'archived') return r.archived;
    return true;
  });

  return (
    <SectionTable
      title="Mentor Tracker"
      subtitle={`${filteredRows.length} faculty (${activeCount} active, ${archivedCount} archived) · ${filteredRows.reduce((sum, r) => sum + (r.assigned || 0), 0)} students assigned`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {/* Batch Selector Dropdown above Mentor Tracker */}
          {!compact && batches.length > 0 && (
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {batches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          {!compact && (
            <div className="flex items-center rounded-xl border border-line bg-surface-subtle p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filter === 'all' ? 'bg-white shadow-xs text-ink font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                All ({batchFilteredRows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('active')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filter === 'active' ? 'bg-white shadow-xs text-ink font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('archived')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filter === 'archived' ? 'bg-white shadow-xs text-bad-ink font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                Archived ({archivedCount})
              </button>
            </div>
          )}
          {!compact && onNavigate && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => onNavigate('assignment')}>
                ＋ Mentor Assignment
              </Button>
              <Button size="sm" onClick={() => onNavigate('reassignment')}>
                ⚡ Mentor Reassignment
              </Button>
            </div>
          )}
        </div>
      }
    >
      {statusMessage && (
        <div className="border-b border-line bg-brand-50/60 px-4 py-2 text-[12px] font-medium text-brand-900 flex justify-between items-center">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-muted hover:text-ink">✕</button>
        </div>
      )}
      <DataTable
        rows={filteredRows}
        rowKey={(row) => row.id}
        onRowClick={(row) => onInspectMentor?.(row.id)}
        empty={<EmptyState title="No mentors found" description="No faculty matching the selected filter." icon="✓" />}
        columns={[
          {
            key: 'mentor',
            header: 'Mentor',
            render: (row) => (
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-brand-700 hover:underline">{row.name}</p>
                  {row.archived && <Badge tone="rose" size="xs">Archived</Badge>}
                </div>
                <p className="text-[11.5px] text-muted">{row.staffCode} · {row.designation}</p>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            align: 'center',
            render: (row) => (
              <Badge tone={row.archived ? 'rose' : 'green'} size="xs">
                {row.archived ? 'Archived' : 'Active'}
              </Badge>
            ),
          },
          { key: 'assigned', header: 'Assigned Students', align: 'right', render: (row) => <span className="font-semibold text-ink">{row.assigned ?? 0}</span> },
          { key: 'compliance', header: 'Compliance', align: 'right', render: (row) => <Badge tone={row.compliance >= 80 ? 'green' : 'amber'}>{row.compliance}%</Badge> },
          { key: 'atRisk', header: compact ? 'At risk' : 'At-risk students', align: 'right', render: (row) => <span className={row.atRisk ? 'font-semibold text-bad-ink' : ''}>{row.atRisk}</span> },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => onInspectMentor?.(row.id)}
                >
                  Inspect
                </Button>
                {confirmDeleteId === row.id ? (
                  <div className="flex items-center gap-1 rounded-lg bg-bad-surface/60 p-1 border border-bad-line">
                    <span className="text-[11px] font-bold text-bad-ink px-1">Archive?</span>
                    <Button
                      size="xs"
                      variant="danger"
                      disabled={actionLoadingId === row.id}
                      onClick={() => handleToggleSoftDelete(row, true)}
                    >
                      Yes
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  row.archived ? (
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={actionLoadingId === row.id}
                      onClick={() => handleToggleSoftDelete(row, false)}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={actionLoadingId === row.id}
                      onClick={() => setConfirmDeleteId(row.id)}
                    >
                      Archive
                    </Button>
                  )
                )}
              </div>
            ),
          },
        ]}
      />
    </SectionTable>
  );
}

function MeetingReportsSection({ data, onInspectMentor, onReload }) {
  const batches = data.batches || ['All Batches', '2024 BCS'];
  const [selectedBatch, setSelectedBatch] = useState(batches[0] || 'All Batches');
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [downloadingStudentId, setDownloadingStudentId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const mentors = data.mentors || [];
  const allMeetingMinutes = data.allMeetingMinutes || [];

  // Filter mentors based on batch
  const filteredMentors = mentors.filter((m) => {
    if (selectedBatch === 'All Batches') return true;
    return m.batches?.includes(selectedBatch) || m.section === selectedBatch;
  });

  // Filter meeting minutes based on batch
  const filteredMinutes = allMeetingMinutes.filter((m) => {
    if (selectedBatch === 'All Batches') return true;
    return m.cohort === selectedBatch || m.cohort?.includes(selectedBatch);
  });

  // Effective selected mentor
  const selectedMentor = filteredMentors.find((m) => m.id === selectedMentorId) || filteredMentors[0] || null;

  // Minutes for selected mentor
  const selectedMentorMinutes = selectedMentor
    ? filteredMinutes.filter((m) => m.mentorId === selectedMentor.id || m.mentorStaffCode === selectedMentor.staffCode)
    : [];

  // Unique students under selected mentor
  const mentorStudentsMap = new Map();
  for (const m of selectedMentorMinutes) {
    if (!mentorStudentsMap.has(m.studentId)) {
      mentorStudentsMap.set(m.studentId, {
        id: m.studentId,
        name: m.studentName,
        rollNumber: m.rollNumber,
        cohort: m.cohort,
        meetingsHeld: 0,
      });
    }
    mentorStudentsMap.get(m.studentId).meetingsHeld += 1;
  }
  const mentorStudents = Array.from(mentorStudentsMap.values());

  const handleDownloadStudentPdf = async (student) => {
    setDownloadingStudentId(student.id);
    setStatusMessage(null);
    try {
      const studentM = selectedMentorMinutes.filter((m) => m.studentId === student.id || m.rollNumber === student.rollNumber);
      if (!studentM || studentM.length === 0) {
        setStatusMessage(`No recorded meeting sessions found for ${student.name}.`);
        return;
      }
      await downloadConsolidatedReport(studentM, {
        menteeName: student.name,
        mentorName: selectedMentor.name,
        filterRangeText: `Batch: ${selectedBatch}`,
        isMentorWide: false,
      });
      setStatusMessage(`Report downloaded for ${student.name}.`);
    } catch (err) {
      setStatusMessage(`Error: ${err.message || 'Failed to generate PDF'}`);
    } finally {
      setDownloadingStudentId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Batch Header & Consolidated Download */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-ink">
              Meetings Report
            </h3>
            <p className="text-[12.5px] text-muted">
              Generate batch-level CSV consolidated minutes, mentor-level meeting logs, or individual student PDF reports.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-nowrap overflow-x-auto">
            {/* Batch Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-muted">Batch:</span>
              <select
                value={selectedBatch}
                onChange={(e) => {
                  setSelectedBatch(e.target.value);
                  setSelectedMentorId('');
                }}
                className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {batches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Batch Level Downloads in same row */}
            <button
              type="button"
              onClick={() => exportMeetingMinutesCsv(filteredMinutes, `MMRMS_${selectedBatch.replace(/\s+/g, '_')}_Minutes`)}
              disabled={filteredMinutes.length === 0}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink shadow-xs transition hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Download Minutes (CSV)
            </button>
            <button
              type="button"
              onClick={() => exportMentorComplianceCsv(filteredMentors, `MMRMS_${selectedBatch.replace(/\s+/g, '_')}_Compliance`)}
              disabled={filteredMentors.length === 0}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink shadow-xs transition hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Download Mentor Report (CSV)
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-xs font-medium text-brand-900 flex justify-between items-center">
            <span>{statusMessage}</span>
            <button type="button" onClick={() => setStatusMessage(null)} className="text-muted hover:text-ink">✕</button>
          </div>
        )}

        {/* Mentor Selector Cards */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-strong mb-3">
            Select Faculty Mentor ({filteredMentors.length} in {selectedBatch})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {filteredMentors.map((m) => {
              const isSelected = selectedMentor?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMentorId(m.id)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/40 shadow-xs ring-2 ring-brand-500/20'
                      : 'border-line bg-white hover:border-brand-300 hover:bg-canvas/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-xs text-ink">{m.name}</p>
                      <p className="text-[11px] text-muted">{m.staffCode} · {m.cabin || 'CSE Block'}</p>
                    </div>
                    {isSelected && <Badge tone="indigo" size="xs">Selected</Badge>}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px]">
                    <span className="text-muted">Students: <strong className="text-ink">{m.assignedMentees ?? m.assigned ?? 0}</strong></span>
                    <span className="text-muted">Meetings: <strong className="text-ink">{m.meetingsHeld ?? 0}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Mentor Details & Student List */}
      {selectedMentor && (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                  Mentor Meeting Records
                </span>
                <Badge tone="indigo" size="sm">{selectedMentor.staffCode}</Badge>
              </div>
              <h3 className="text-base font-bold text-ink mt-0.5">
                {selectedMentor.name} · Assigned Students & Reviews
              </h3>
              <p className="text-[12.5px] text-muted">
                {selectedMentorMinutes.length} total review logs recorded for this mentor.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => exportMeetingMinutesCsv(selectedMentorMinutes, `MMRMS_${selectedMentor.name.replace(/\s+/g, '_')}_Meeting_Records`)}
                disabled={selectedMentorMinutes.length === 0}
              >
                Download Mentor Meeting Records (CSV)
              </Button>
            </div>
          </div>

          {/* Student Table */}
          <div className="rounded-xl border border-line overflow-hidden">
            <div className="bg-canvas/50 px-4 py-2.5 border-b border-line flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-strong">
                Students Assigned to {selectedMentor.name} ({mentorStudents.length})
              </span>
              <span className="text-muted">Click Download PDF to export individual meeting history</span>
            </div>

            {mentorStudents.length === 0 ? (
              <div className="p-8 text-center text-muted text-xs">
                No students or meeting records found for this mentor in the selected batch.
              </div>
            ) : (
              <table className="w-full text-left text-[12.5px]">
                <thead className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Roll Number</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3 text-right">Reviews Held</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {mentorStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-ink">{s.name}</td>
                      <td className="px-4 py-3 font-mono text-muted text-[11.5px]">{s.rollNumber}</td>
                      <td className="px-4 py-3 text-muted">{s.cohort}</td>
                      <td className="px-4 py-3 text-right tnum font-semibold text-ink">{s.meetingsHeld}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="xs"
                          variant="secondary"
                          loading={downloadingStudentId === s.id}
                          disabled={downloadingStudentId !== null}
                          onClick={() => handleDownloadStudentPdf(s)}
                        >
                          Download Meeting Report (PDF)
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StudentDirectory({ role, onNavigate }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), limit: '20' });
  if (search.trim()) query.set('student', search.trim());
  const { data, loading, error } = useResource(`/${role}/me/students?${query}`);

  function updateSearch(value) { setSearch(value); setPage(1); }
  return (
    <SectionTable
      title="Student Directory"
      subtitle="Filter by student name or roll number; server-side pagination keeps the dataset scalable"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52">
            <TextField label="" placeholder="Search student or roll no." value={search} onChange={(event) => updateSearch(event.target.value)} />
          </div>
          {role === 'coordinator' && (
            <>
              <Button size="sm" variant="secondary" onClick={downloadDatasetExport} title="Export all students as Excel spreadsheet">
                📊 Export Excel
              </Button>
              {onNavigate && (
                <Button size="sm" onClick={() => onNavigate('upload')} title="Upload new student list or marks from Excel">
                  ⚡ Upload Excel
                </Button>
              )}
            </>
          )}
        </div>
      }
    >
      {error && <EmptyState title="Couldn't load students" description={error.message} icon="!" />}
      {loading && !data && <div className="p-5 text-sm text-muted">Loading student dataset…</div>}
      {data && <>
        <DataTable rows={data.students} rowKey={(row) => row.id} columns={[
          { key: 'student', header: 'Student', render: (row) => <div><p className="font-medium">{row.name}</p><p className="tnum text-[11.5px] text-muted">{row.rollNumber} · {row.section}</p></div> },
          { key: 'cgpa', header: 'CGPA', align: 'right', render: (row) => row.cgpa.toFixed(1) },
          { key: 'attendance', header: 'Attendance', align: 'right', render: (row) => <span className={row.attendanceBelowRequirement ? 'font-semibold text-bad-ink' : ''}>{row.attendance}%</span> },
          { key: 'mentor', header: 'Mentoring', align: 'right', render: (row) => `${row.meetingsHeld}/${row.meetingsDue}` },
        ]} />
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[12px] text-muted">
          <span>{data.total} students · page {data.page} of {data.totalPages}</span>
          <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={data.page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={data.page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
        </div>
      </>}
    </SectionTable>
  );
}

function AdvisorOperations({ data, reload, composer, setComposer }) {
  return <div className="space-y-5">
    {composer === 'meeting' && <ClassMeetingForm onDone={() => { setComposer(null); reload(); }} onCancel={() => setComposer(null)} />}
    {composer === 'grievance' && <GrievanceForm students={data.attention} onDone={() => { setComposer(null); reload(); }} onCancel={() => setComposer(null)} />}
    <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setComposer('meeting')}>＋ Class meeting</Button><Button size="sm" variant="secondary" onClick={() => setComposer('grievance')}>＋ Raise grievance</Button></div>
    <SectionTable title="Class Committee & Feedback Meetings" subtitle="Meeting dates, agenda, feedback and minutes">
      <DataTable rows={data.classMeetings} rowKey={(row) => row.id} columns={[
        { key: 'title', header: 'Meeting', render: (row) => <div><p className="font-medium">{row.title}</p><p className="text-[11.5px] text-muted">{row.agenda}</p></div> },
        { key: 'date', header: 'Date', align: 'right' }, { key: 'status', header: 'Status', align: 'right', render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
      ]} />
    </SectionTable>
    <SectionTable title="Grievance Register" subtitle="Class advisor owns acknowledgment, referral and closure">
      <DataTable rows={data.grievances} rowKey={(row) => row.id} columns={[
        { key: 'student', header: 'Student / request', render: (row) => <div><p className="font-medium">{row.student}</p><p className="text-[11.5px] text-muted">{row.subject}</p></div> },
        { key: 'priority', header: 'Priority', align: 'right', render: (row) => <Badge tone={row.priority === 'High' ? 'rose' : 'amber'}>{row.priority}</Badge> },
        { key: 'status', header: 'Status', align: 'right', render: (row) => <StatusButton path={`/advisor/me/grievances/${row.id}`} status={row.status} next={row.status === 'Resolved' ? 'Closed' : 'Resolved'} onDone={reload} /> },
      ]} />
    </SectionTable>
  </div>;
}

/*
function CoordinatorOperations({ data, reload, composer, setComposer }) {
  return <div className="space-y-5">
    {composer === 'event' && <EventForm onDone={() => { setComposer(null); reload(); }} onCancel={() => setComposer(null)} />}
    <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setComposer('event')}>＋ Year event</Button></div>
    <SectionTable title="PTM, Orientation & Review Calendar" subtitle="Year-level activities maintained by the coordinator">
      <DataTable rows={data.events} rowKey={(row) => row.id} columns={[
        { key: 'title', header: 'Activity', render: (row) => <div><p className="font-medium">{row.title}</p><p className="text-[11.5px] text-muted">{row.notes}</p></div> },
        { key: 'date', header: 'Date', align: 'right' }, { key: 'type', header: 'Type', align: 'right', render: (row) => <Badge tone="indigo">{row.type}</Badge> }, { key: 'status', header: 'Status', align: 'right', render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
      ]} />
    </SectionTable>
  </div>;
}
*/

function AuditPanel({ rows, tracker }) {
  return <div className="space-y-5">
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Average CGPA" value={tracker.averageCgpa} decimals={1} footer="Year-wide academic tracker" />
      <StatTile label="Attendance shortfalls" value={tracker.attendanceShortfalls} footer="Students below 75%" />
      <StatTile label="Standing arrears" value={tracker.standingArrears} footer="Across the year" />
      <StatTile label="Career-ready learners" value={tracker.certificationsInProgress} footer="At least 3 readiness items complete" />
    </div>
    <SectionTable title="Audit-Ready Evidence" subtitle="Live tracker values that can be exported through the browser's print-to-PDF workflow">
      <DataTable rows={rows} rowKey={(row) => row.label} columns={[
        { key: 'label', header: 'Evidence set' }, { key: 'value', header: 'Coverage', align: 'right' }, { key: 'tone', header: 'Status', align: 'right', render: (row) => <Badge tone={row.tone}>{row.tone === 'green' ? 'Ready' : 'Follow-up'}</Badge> },
      ]} />
    </SectionTable>
  </div>;
}

function MiniList({ title, rows, label, detail }) {
  return <SectionCard title={title}>
    {rows.length === 0 ? <EmptyState title="Nothing pending" description="This list is currently clear." icon="✓" /> : <ul className="space-y-3">{rows.slice(0, 5).map((row) => <li key={row.id} className="border-b border-line pb-3 last:border-0 last:pb-0"><p className="text-[13px] font-medium text-ink">{label(row)}</p><p className="mt-0.5 text-[11.5px] text-muted">{detail(row)}</p></li>)}</ul>}
  </SectionCard>;
}

function StatusButton({ path, status, next, onDone }) {
  const [saving, setSaving] = useState(false);
  async function update() { setSaving(true); try { await api(path, { method: 'PATCH', body: { status: next } }); await onDone(); } finally { setSaving(false); } }
  return <Button size="sm" variant={next === 'Rejected' ? 'secondary' : 'primary'} loading={saving} onClick={update}>{status === 'Pending' ? next : `Mark ${next}`}</Button>;
}

function ClassMeetingForm({ onDone, onCancel }) {
  const [title, setTitle] = useState(''); const [date, setDate] = useState(''); const [agenda, setAgenda] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  async function submit(event) { event.preventDefault(); setSaving(true); setError(''); try { await api('/advisor/me/class-meetings', { method: 'POST', body: { title, date, agenda } }); onDone(); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  return <SectionCard title="Plan Class Meeting" subtitle="Record committee, feedback or parent-bridge meeting details"><form className="space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><TextField label="Meeting title" value={title} onChange={(event) => setTitle(event.target.value)} required /><TextField label="Date" placeholder="12 Aug 2026" value={date} onChange={(event) => setDate(event.target.value)} required /></div><TextArea label="Agenda" value={agenda} onChange={(event) => setAgenda(event.target.value)} required />{error && <p className="text-sm text-bad-ink">{error}</p>}<div className="flex gap-2"><Button type="submit" size="sm" loading={saving}>Save meeting</Button><Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button></div></form></SectionCard>;
}

function GrievanceForm({ students, onDone, onCancel }) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? ''); const [subject, setSubject] = useState(''); const [category, setCategory] = useState('Academic'); const [priority, setPriority] = useState('Medium'); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  async function submit(event) { event.preventDefault(); setSaving(true); setError(''); try { await api('/advisor/me/grievances', { method: 'POST', body: { studentId, subject, category, priority } }); onDone(); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  return <SectionCard title="Raise Grievance" subtitle="Log a concern and route it through the class-advisor workflow"><form className="space-y-4" onSubmit={submit}><label className="block text-[12.5px] font-semibold text-muted-strong">Student<select className="mt-1.5 w-full rounded-field border-[1.5px] border-line-strong bg-white px-3.5 py-3 text-[13.5px] text-ink" value={studentId} onChange={(event) => setStudentId(event.target.value)} required>{students.map((student) => <option key={student.id} value={student.id}>{student.rollNumber} · {student.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-3"><TextField label="Category" value={category} onChange={(event) => setCategory(event.target.value)} /><TextField label="Priority" value={priority} onChange={(event) => setPriority(event.target.value)} /><TextField label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} required /></div>{error && <p className="text-sm text-bad-ink">{error}</p>}<div className="flex gap-2"><Button type="submit" size="sm" loading={saving}>Log grievance</Button><Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button></div></form></SectionCard>;
}

/*
function EventForm({ onDone, onCancel }) {
  const [type, setType] = useState('PTM'); const [title, setTitle] = useState(''); const [date, setDate] = useState(''); const [notes, setNotes] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  async function submit(event) { event.preventDefault(); setSaving(true); setError(''); try { await api('/coordinator/me/events', { method: 'POST', body: { type, title, date, notes } }); onDone(); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  return <SectionCard title="Plan Year Activity" subtitle="Add a PTM, orientation, review meeting or another coordination event"><form className="space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-3"><TextField label="Type" value={type} onChange={(event) => setType(event.target.value)} /><TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required /><TextField label="Date" placeholder="22 Aug 2026" value={date} onChange={(event) => setDate(event.target.value)} required /></div><TextArea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />{error && <p className="text-sm text-bad-ink">{error}</p>}<div className="flex gap-2"><Button type="submit" size="sm" loading={saving}>Save activity</Button><Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button></div></form></SectionCard>;
}
*/
