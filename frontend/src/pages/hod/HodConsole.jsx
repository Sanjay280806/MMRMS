import { useState } from 'react';
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

export default function HodConsole() {
  const [section, setSection] = useState('overview');
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const { data, loading, error, reload } = useResource('/hod/me/overview');

  if (loading && !data) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
        </div>
        <Skeleton className="h-96 rounded-card" />
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

  const stats = data.stats;
  const person = data.hod;

  const navGroups = [
    {
      label: 'Executive Oversight',
      items: [
        { key: 'overview', label: 'Department Overview' },
        { key: 'cohorts', label: 'Cohort Management', badge: stats.totalCohorts },
      ],
    },
    {
      label: 'Staff & Interventions',
      items: [
        {
          key: 'mentors',
          label: 'Faculty Mentors',
          badge: `${stats.compliancePct}%`,
          badgeTone: stats.compliancePct >= 80 ? 'green' : 'amber',
        },
        {
          key: 'atrisk',
          label: 'At-Risk Watchlist',
          badge: stats.atRiskCount,
          badgeTone: stats.atRiskCount ? 'rose' : 'green',
        },
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
          : section === 'cohorts'
          ? 'Cohort Management & YC Oversight'
          : section === 'mentors'
          ? 'Faculty Mentors & Compliance Matrix'
          : 'Department-Wide At-Risk Interventions'
      }
      subtitle={`${data.institution.name} · ${data.department} · Multi-Cohort Governance`}
      greet={section === 'overview'}
      actions={
        <div className="flex items-center gap-2">
          <Badge tone={stats.compliancePct >= 80 ? 'green' : 'amber'} size="md">
            Department Compliance: {stats.compliancePct}%
          </Badge>
          <Button size="sm" variant="secondary" onClick={reload}>
            ↻ Refresh Metrics
          </Button>
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
            { label: 'Total Enrolled', value: `${stats.totalStudents} students`, tone: 'brand' },
            { label: 'Faculty Mentors', value: `${stats.totalMentors} faculty`, tone: 'slate' },
            { label: 'Mentoring Compliance', value: `${stats.compliancePct}%`, tone: stats.compliancePct >= 80 ? 'green' : 'amber' },
            { label: 'Department Health', value: `${stats.avgHealth}/100`, tone: stats.avgHealth >= 75 ? 'green' : 'amber' },
          ]}
          fields={[
            { label: 'Department', value: data.department },
            { label: 'Active Cohorts', value: `${stats.totalCohorts} batches` },
            { label: 'Average Attendance', value: `${stats.avgAttendance}%` },
            { label: 'Department Avg CGPA', value: `${stats.avgCgpa} / 10.0` },
          ]}
        />
      }
    >
      <div className="animate-fadeRise space-y-6">
        {section === 'overview' && (
          <OverviewSection
            data={data}
            onSelectCohort={(c) => {
              setSelectedCohort(c);
              setSection('cohorts');
            }}
            onSelectMentor={(m) => {
              setSelectedMentor(m);
              setSection('mentors');
            }}
            onOpenStudent={setSelectedStudentId}
          />
        )}

        {section === 'cohorts' && (
          <CohortsSection
            cohorts={data.cohorts}
            selectedCohort={selectedCohort}
            onSelectCohort={setSelectedCohort}
            onOpenStudent={setSelectedStudentId}
          />
        )}

        {section === 'mentors' && (
          <MentorsSection
            mentors={data.mentors}
            selectedMentor={selectedMentor}
            onSelectMentor={setSelectedMentor}
            onOpenStudent={setSelectedStudentId}
          />
        )}

        {section === 'atrisk' && (
          <AtRiskSection
            atRisk={data.atRisk}
            onOpenStudent={setSelectedStudentId}
          />
        )}
      </div>

      {/* Student Record Book Modal */}
      {selectedStudentId && (
        <StudentRecordModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </ConsoleLayout>
  );
}

/* ── Section: Executive Overview ────────────────────────────────────────── */

function OverviewSection({ data, onSelectCohort, onSelectMentor, onOpenStudent }) {
  const { stats, cohorts, atRisk } = data;

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Students"
          value={stats.totalStudents}
          subtext={`${stats.totalCohorts} active cohorts`}
          tone="brand"
        />
        <StatTile
          label="Mentoring Compliance"
          value={`${stats.compliancePct}%`}
          subtext={`${stats.totalMeetingsHeld} of ${stats.totalMeetingsDue} meetings`}
          tone={stats.compliancePct >= 80 ? 'green' : 'amber'}
        />
        <StatTile
          label="Average Department Health"
          value={`${stats.avgHealth}/100`}
          subtext={`Avg CGPA ${stats.avgCgpa} · ${stats.avgAttendance}% Attendance`}
          tone={stats.avgHealth >= 75 ? 'green' : 'amber'}
        />
        <StatTile
          label="At-Risk Interventions"
          value={stats.atRiskCount}
          subtext={`${stats.attendanceShortfalls} attendance shortfalls`}
          tone={stats.atRiskCount ? 'rose' : 'green'}
        />
      </div>

      {/* Cohort Comparison Cards */}
      <SectionCard
        title="Active Cohort Governance"
        subtitle="Cross-cohort performance overview mapped to Year Coordinators"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cohorts.map((cohort) => (
            <div
              key={cohort.cohortId}
              onClick={() => onSelectCohort(cohort)}
              className="group cursor-pointer rounded-2xl border border-line bg-surface p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                    Cohort {cohort.cohortId}
                  </span>
                  <h3 className="text-base font-semibold text-ink group-hover:text-brand-700">
                    {cohort.cohortName}
                  </h3>
                  <p className="text-[12px] text-muted">{cohort.year}</p>
                </div>
                <Badge tone={cohort.compliancePct >= 80 ? 'green' : 'amber'}>
                  {cohort.compliancePct}% Mtg
                </Badge>
              </div>

              <div className="mt-4 space-y-2 border-t border-line/60 pt-3 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-muted">Year Coordinator:</span>
                  <span className="font-medium text-ink">{cohort.yearCoordinator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Enrolled Students:</span>
                  <span className="font-medium text-ink">{cohort.totalStudents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Avg Attendance:</span>
                  <span className="font-medium text-ink">{cohort.avgAttendance}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Avg CGPA:</span>
                  <span className="font-medium text-ink">{cohort.avgCgpa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">At-Risk Count:</span>
                  <span className={`font-semibold ${cohort.atRiskCount ? 'text-bad-ink' : 'text-good-ink'}`}>
                    {cohort.atRiskCount}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-muted-soft">
                  <span>Mentoring Progress</span>
                  <span>{cohort.totalHeld}/{cohort.totalDue}</span>
                </div>
                <ProgressBar
                  value={cohort.compliancePct}
                  tone={cohort.compliancePct >= 80 ? 'green' : 'amber'}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Critical Watchlist Preview */}
      <SectionTable
        title="Immediate Student Attention Watchlist"
        subtitle="Students across all cohorts requiring academic or attendance intervention"
        action={
          <Badge tone={atRisk.length ? 'rose' : 'green'} size="md">
            {atRisk.length} flagged
          </Badge>
        }
      >
        <DataTable
          rows={atRisk.slice(0, 8)}
          rowKey={(s) => s.id}
          onRowClick={(s) => onOpenStudent(s.id)}
          empty={<EmptyState title="No high-risk students" description="All students are currently performing well." icon="✓" />}
          columns={[
            {
              key: 'student',
              header: 'Student',
              render: (s, i) => (
                <div className="flex items-center gap-2.5">
                  <Avatar initials={s.initials} seed={i} size="sm" />
                  <div>
                    <p className="font-semibold text-ink leading-tight">{s.name}</p>
                    <p className="text-[11px] text-muted">{s.rollNumber} · {s.section}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'mentor',
              header: 'Assigned Mentor',
              render: (s) => <span className="text-[12.5px] text-muted-strong">{s.mentor || s.mentorName || '—'}</span>,
            },
            {
              key: 'attendance',
              header: 'Attendance',
              align: 'right',
              render: (s) => (
                <span className={`font-semibold tnum ${s.attendance < 75 ? 'text-bad-ink' : 'text-ink'}`}>
                  {s.attendance}%
                </span>
              ),
            },
            {
              key: 'cgpa',
              header: 'CGPA',
              align: 'right',
              render: (s) => <span className="font-medium tnum">{s.cgpa?.toFixed(2)}</span>,
            },
            {
              key: 'arrears',
              header: 'Arrears',
              align: 'right',
              render: (s) => (
                <span className={`tnum ${s.standingArrears ? 'font-semibold text-bad-ink' : 'text-muted-soft'}`}>
                  {s.standingArrears}
                </span>
              ),
            },
            {
              key: 'health',
              header: 'Health Index',
              align: 'right',
              render: (s) => (
                <Badge tone={s.health < 60 ? 'rose' : s.health < 75 ? 'amber' : 'green'}>
                  {s.health}/100
                </Badge>
              ),
            },
          ]}
        />
      </SectionTable>
    </div>
  );
}

/* ── Section: Cohorts & Year Coordinators ────────────────────────────────── */

function CohortsSection({ cohorts, selectedCohort, onSelectCohort, onOpenStudent }) {
  const [cohortStudents, setCohortStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  async function loadCohortDetail(cohort) {
    onSelectCohort(cohort);
    setLoadingStudents(true);
    try {
      const res = await api(`/hod/me/cohorts/${cohort.cohortId}`);
      setCohortStudents(res.students || []);
    } catch {
      setCohortStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionTable
        title="Departmental Cohorts Directory"
        subtitle="Manage cohorts, assigned Year Coordinators, and batch-level metrics"
        action={<Badge tone="indigo">{cohorts.length} Cohorts Active</Badge>}
      >
        <DataTable
          rows={cohorts}
          rowKey={(c) => c.cohortId}
          onRowClick={loadCohortDetail}
          columns={[
            {
              key: 'cohort',
              header: 'Cohort',
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
              header: 'Mentoring Compliance',
              align: 'right',
              render: (c) => (
                <div className="flex items-center justify-end gap-2">
                  <ProgressBar value={c.compliancePct} className="w-16" tone={c.compliancePct >= 80 ? 'green' : 'amber'} />
                  <span className="font-semibold tnum text-[12px]">{c.compliancePct}%</span>
                </div>
              ),
            },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (c) => (
                <Button size="xs" variant={selectedCohort?.cohortId === c.cohortId ? 'primary' : 'secondary'}>
                  {selectedCohort?.cohortId === c.cohortId ? 'Active' : 'Inspect Roster'}
                </Button>
              ),
            },
          ]}
        />
      </SectionTable>

      {/* Cohort Detail Student Roster */}
      {selectedCohort && (
        <SectionTable
          title={`Students in ${selectedCohort.cohortName} (${selectedCohort.cohortId})`}
          subtitle={`Year Coordinator: ${selectedCohort.yearCoordinator} · Showing ${cohortStudents.length} enrolled students`}
          action={
            <Button size="xs" variant="secondary" onClick={() => onSelectCohort(null)}>
              ✕ Close Roster
            </Button>
          }
        >
          {loadingStudents ? (
            <div className="p-8 text-center text-muted">Loading cohort roster…</div>
          ) : (
            <DataTable
              rows={cohortStudents}
              rowKey={(s) => s.id}
              onRowClick={(s) => onOpenStudent(s.id)}
              empty={<EmptyState title="No students found" description="No students currently mapped to this cohort." />}
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
                      {s.standingArrears}
                    </span>
                  ),
                },
                {
                  key: 'health',
                  header: 'Health Score',
                  align: 'right',
                  render: (s) => (
                    <Badge tone={s.health < 60 ? 'rose' : s.health < 75 ? 'amber' : 'green'}>
                      {s.health}/100
                    </Badge>
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

/* ── Section: Mentors & Compliance Matrix ────────────────────────────────── */

function MentorsSection({ mentors, selectedMentor, onSelectMentor, onOpenStudent }) {
  const [activeTab, setActiveTab] = useState('list');
  const [mentorDetail, setMentorDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { data: complianceData } = useResource('/hod/me/compliance');

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

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-line pb-3">
        <Button
          size="sm"
          variant={activeTab === 'list' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('list')}
        >
          Faculty Mentor Roster
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'matrix' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('matrix')}
        >
          Weekly Compliance Matrix
        </Button>
      </div>

      {activeTab === 'list' && (
        <SectionTable
          title="Faculty Mentors Directory"
          subtitle="Department mentors, assigned mentee counts, and review compliance"
          action={<Badge tone="indigo">{mentors.length} Faculty Mentors</Badge>}
        >
          <DataTable
            rows={mentors}
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
                header: 'Assigned Mentees',
                align: 'right',
                render: (m) => <span className="font-medium tnum">{m.assignedMentees}</span>,
              },
              {
                key: 'meetings',
                header: 'Meetings Held / Due',
                align: 'right',
                render: (m) => <span className="font-medium tnum">{m.meetingsHeld} / {m.meetingsDue}</span>,
              },
              {
                key: 'compliance',
                header: 'Compliance',
                align: 'right',
                render: (m) => (
                  <Badge tone={m.compliance >= 80 ? 'green' : 'amber'}>
                    {m.compliance}%
                  </Badge>
                ),
              },
              {
                key: 'health',
                header: 'Avg Mentee Health',
                align: 'right',
                render: (m) => <span className="font-medium tnum">{m.averageHealth}/100</span>,
              },
              {
                key: 'action',
                header: '',
                align: 'right',
                render: (m) => (
                  <Button size="xs" variant={selectedMentor?.id === m.id ? 'primary' : 'secondary'}>
                    View Mentees
                  </Button>
                ),
              },
            ]}
          />
        </SectionTable>
      )}

      {activeTab === 'matrix' && complianceData && (
        <SectionTable
          title="Department-Wide Weekly Compliance Matrix"
          subtitle="Real-time audit log of mentor review sessions across academic weeks"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-line bg-surface-subtle text-[11px] uppercase tracking-wider text-muted-soft">
                <tr>
                  <th className="p-3.5">Mentor</th>
                  <th className="p-3.5 text-center">Assigned</th>
                  <th className="p-3.5 text-center">Compliance</th>
                  {complianceData.weeks.map((w) => (
                    <th key={w} className="p-3.5 text-center">{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {complianceData.mentors.map((m) => (
                  <tr key={m.mentorId} className="hover:bg-surface-subtle/50">
                    <td className="p-3.5 font-medium text-ink">
                      {m.name} <span className="text-[11px] text-muted">({m.staffCode})</span>
                    </td>
                    <td className="p-3.5 text-center tnum">{m.assignedCount}</td>
                    <td className="p-3.5 text-center">
                      <Badge tone={m.compliance >= 80 ? 'green' : 'amber'}>
                        {m.compliance}%
                      </Badge>
                    </td>
                    {m.weeklyStatus.map((ws, wIdx) => (
                      <td key={wIdx} className="p-3.5 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            ws.status === 'Completed'
                              ? 'bg-good-surface text-good-ink'
                              : ws.status === 'Partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {ws.status}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionTable>
      )}

      {/* Mentor Mentees Drawer */}
      {selectedMentor && (
        <SectionTable
          title={`Mentees assigned to ${selectedMentor.name}`}
          subtitle={`Showing mentees across all active cohorts · Staff Code: ${selectedMentor.staffCode}`}
          action={
            <Button size="xs" variant="secondary" onClick={() => onSelectMentor(null)}>
              ✕ Close List
            </Button>
          }
        >
          {loadingDetail ? (
            <div className="p-8 text-center text-muted">Loading assigned mentees…</div>
          ) : (
            <DataTable
              rows={mentorDetail?.mentees || []}
              rowKey={(s) => s.id}
              onRowClick={(s) => onOpenStudent(s.id)}
              columns={[
                { key: 'roll', header: 'Roll No', render: (s) => <span className="font-mono">{s.rollNumber}</span> },
                { key: 'name', header: 'Student Name', render: (s) => <span className="font-semibold text-ink">{s.name}</span> },
                { key: 'cohort', header: 'Cohort', render: (s) => <span className="text-muted">{s.section}</span> },
                { key: 'attendance', header: 'Attendance', align: 'right', render: (s) => <span className="tnum">{s.attendance}%</span> },
                { key: 'cgpa', header: 'CGPA', align: 'right', render: (s) => <span className="tnum font-medium">{s.cgpa?.toFixed(2)}</span> },
                { key: 'arrears', header: 'Arrears', align: 'right', render: (s) => <span className="tnum">{s.standingArrears}</span> },
                {
                  key: 'health',
                  header: 'Health Score',
                  align: 'right',
                  render: (s) => (
                    <Badge tone={s.health < 60 ? 'rose' : s.health < 75 ? 'amber' : 'green'}>
                      {s.health}/100
                    </Badge>
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

/* ── Section: At-Risk Watchlist ──────────────────────────────────────────── */

function AtRiskSection({ atRisk, onOpenStudent }) {
  return (
    <SectionTable
      title="Department-Wide At-Risk Interventions"
      subtitle="Comprehensive list of students with health score < 70, attendance < 75%, or standing arrears"
      action={<Badge tone="rose">{atRisk.length} flagged students</Badge>}
    >
      <DataTable
        rows={atRisk}
        rowKey={(s) => s.id}
        onRowClick={(s) => onOpenStudent(s.id)}
        columns={[
          {
            key: 'student',
            header: 'Student',
            render: (s, i) => (
              <div className="flex items-center gap-2.5">
                <Avatar initials={s.initials} seed={i} size="sm" />
                <div>
                  <p className="font-semibold text-ink">{s.name}</p>
                  <p className="text-[11px] text-muted">{s.rollNumber} · {s.section}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'mentor',
            header: 'Assigned Mentor',
            render: (s) => <span className="text-[12.5px] text-muted-strong">{s.mentorName || s.mentor || '—'}</span>,
          },
          {
            key: 'attendance',
            header: 'Attendance',
            align: 'right',
            render: (s) => (
              <span className={`font-semibold tnum ${s.attendance < 75 ? 'text-bad-ink' : 'text-ink'}`}>
                {s.attendance}%
              </span>
            ),
          },
          {
            key: 'cgpa',
            header: 'CGPA',
            align: 'right',
            render: (s) => <span className="font-medium tnum">{s.cgpa?.toFixed(2)}</span>,
          },
          {
            key: 'arrears',
            header: 'Standing Arrears',
            align: 'right',
            render: (s) => (
              <span className={`tnum ${s.standingArrears ? 'font-semibold text-bad-ink' : 'text-muted-soft'}`}>
                {s.standingArrears}
              </span>
            ),
          },
          {
            key: 'health',
            header: 'Health Score',
            align: 'right',
            render: (s) => (
              <Badge tone={s.health < 60 ? 'rose' : 'amber'}>
                {s.health}/100
              </Badge>
            ),
          },
          {
            key: 'flag',
            header: 'Flag Reason',
            render: (s) => (
              <span className="text-[11.5px] text-bad-ink font-medium">
                {s.flagReason || (s.attendance < 75 ? 'Attendance Shortage' : s.standingArrears ? 'Standing Arrears' : 'Well-being Concern')}
              </span>
            ),
          },
        ]}
      />
    </SectionTable>
  );
}

/* ── Modal: Student Record Book Read-Only View ───────────────────────────── */

function StudentRecordModal({ studentId, onClose }) {
  const { data: record, loading, error } = useResource(`/hod/me/students/${studentId}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
              Institutional Student Audit (Read-Only)
            </span>
            <h2 className="text-xl font-bold text-ink">
              {record?.profile?.personal?.name || 'Student Record Book'}
            </h2>
            <p className="text-[12px] text-muted">
              {record?.profile?.personal?.rollNumber} · {record?.profile?.personal?.programme}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onClose}>
            ✕ Close
          </Button>
        </div>

        {loading && <div className="p-8 text-center text-muted">Loading record book…</div>}
        {error && <div className="p-8 text-center text-bad-ink">{error.message}</div>}

        {record && (
          <div className="mt-5 space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-line bg-surface-subtle p-3 text-center">
                <span className="text-[11px] text-muted">Attendance</span>
                <p className="text-lg font-bold text-ink">{record.attendance?.currentPercentage || 0}%</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-3 text-center">
                <span className="text-[11px] text-muted">CGPA</span>
                <p className="text-lg font-bold text-ink">{record.academics?.cgpa || '—'}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-3 text-center">
                <span className="text-[11px] text-muted">Standing Arrears</span>
                <p className="text-lg font-bold text-ink">{record.academics?.standingArrears || 0}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-3 text-center">
                <span className="text-[11px] text-muted">Assigned Mentor</span>
                <p className="text-sm font-semibold text-ink">{record.profile?.mentor?.name || '—'}</p>
              </div>
            </div>

            {/* Overview Sections */}
            <div className="rounded-2xl border border-line p-4">
              <h4 className="font-semibold text-ink text-sm">Mentoring Summary</h4>
              <p className="mt-1 text-[12.5px] text-muted-strong">
                Meetings Held: {record.meetings?.length || 0} reviews recorded.
              </p>
              {record.meetings?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {record.meetings.map((m) => (
                    <div key={m.id} className="rounded-lg bg-surface-subtle p-2.5 text-[12px]">
                      <div className="flex justify-between font-medium text-ink">
                        <span>Review #{m.meetingNumber} · {m.date}</span>
                        <span className="text-muted">{m.mode}</span>
                      </div>
                      <p className="mt-1 text-muted-strong">
                        <span className="font-semibold">Concerns:</span> {m.studentConcerns || 'None recorded'}
                      </p>
                      <p className="text-muted-strong">
                        <span className="font-semibold">Guidance:</span> {m.mentorSuggestions || 'None recorded'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
