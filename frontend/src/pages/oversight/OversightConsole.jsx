import { useState } from 'react';
import { api } from '../../api/client.js';
import { ConsoleLayout } from '../../components/layout/ConsoleLayout.jsx';
import { ProfileHeader } from '../../components/profile/ProfileHeader.jsx';
import { Badge, HealthBadge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { TextArea, TextField } from '../../components/ui/Field.jsx';
import { SectionCard, SectionTable } from '../../components/ui/SectionCard.jsx';
import { DashboardSkeleton } from '../../components/ui/Skeleton.jsx';
import { StatTile } from '../../components/ui/StatTile.jsx';
import { useResource } from '../../hooks/useResource.js';

const titles = {
  advisor: {
    dashboard: 'Class Advisor Dashboard', students: 'Class Students', attendance: 'Attendance Follow-up',
    academics: 'Academic & Discipline Watch', operations: 'Class Coordination', mentors: 'Mentor Coordination',
  },
  coordinator: {
    dashboard: 'Year Coordinator Dashboard', students: 'Student Dataset', risk: 'At-Risk Students',
    mentors: 'Mentor & Advisor Tracker', operations: 'Events & OD Approvals', audit: 'Audit & Accreditation Readiness',
  },
};

const statusTone = (status) => {
  if (['Completed', 'Resolved', 'Approved'].includes(status)) return 'green';
  if (['Rejected', 'Cancelled'].includes(status)) return 'rose';
  if (['Pending', 'Raised', 'In Progress', 'Referred'].includes(status)) return 'amber';
  return 'indigo';
};

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
      { label: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard' }, { key: 'students', label: 'Student Dataset', badge: stats.students }, { key: 'risk', label: 'At-Risk Students', badge: stats.atRisk, badgeTone: 'rose' }] },
      { label: 'Year Operations', items: [{ key: 'mentors', label: 'Mentor Tracker' }, { key: 'operations', label: 'Events & OD', badge: stats.pendingOd, badgeTone: 'rose' }, { key: 'audit', label: 'Audit & Accreditation' }] },
    ];

  function navigate(next) {
    setSection(next);
    setComposer(null);
  }

  const action = isAdvisor
    ? <Button size="sm" onClick={() => { setSection('operations'); setComposer('meeting'); }}>＋ Plan class meeting</Button>
    : <Button size="sm" onClick={() => { setSection('operations'); setComposer('event'); }}>＋ Plan event</Button>;

  return (
    <ConsoleLayout
      product={isAdvisor ? 'Class Advisor Console' : 'Year Coordinator Console'}
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
        {!isAdvisor && <CoordinatorSections section={section} data={data} reload={reload} composer={composer} setComposer={setComposer} />}
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
      { label: 'At risk', value: stats.atRisk, tone: stats.atRisk ? 'rose' : 'green' },
    ];
}

function profileFields(role, person, stats) {
  const classFields = [
    { key: 'Class', value: person.className }, { key: 'Year', value: person.year }, { key: 'Year Coordinator', value: person.yearCoordinator },
    { key: 'Email ID', value: person.email }, { key: 'Mobile number', value: person.mobile }, { key: 'Class room', value: person.room },
    { key: 'Students tracked', value: String(stats.enrolled) }, { key: 'Discipline incidents', value: String(stats.disciplineIncidents) },
  ];
  const yearFields = [
    { key: 'Programme', value: person.programme }, { key: 'Year', value: person.year }, { key: 'Email ID', value: person.email },
    { key: 'Mobile number', value: person.mobile }, { key: 'Room', value: person.room }, { key: 'Students tracked', value: String(stats.students) },
    { key: 'Mentors monitored', value: String(stats.mentors) }, { key: 'Pending OD approvals', value: String(stats.pendingOd) },
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

function CoordinatorSections({ section, data, reload, composer, setComposer }) {
  if (section === 'dashboard') return <CoordinatorDashboard data={data} />;
  if (section === 'students') return <StudentDirectory role="coordinator" />;
  if (section === 'risk') return <StudentWatch title="At-Risk Students" subtitle="Prioritised from attendance, academic, mentoring and well-being evidence" rows={data.atRisk} metric="health" />;
  if (section === 'mentors') return <MentorTracker rows={data.mentors} />;
  if (section === 'operations') return <CoordinatorOperations data={data} reload={reload} composer={composer} setComposer={setComposer} />;
  return <AuditPanel rows={data.audit} tracker={data.academicTracker} />;
}

function AdvisorDashboard({ data }) {
  const { stats } = data;
  return <>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Class strength" value={stats.enrolled} footer="2024 BCS student dataset" />
      <StatTile label="Average attendance" value={stats.averageAttendance} suffix="%" footer={`${stats.attendanceShortfalls} students below 75%`} />
      <StatTile label="Academic follow-ups" value={stats.academicConcerns} footer="Low CGPA or standing arrears" />
      <StatTile label="Open grievances" value={stats.openGrievances} footer={`${stats.meetingsScheduled} class meeting(s) upcoming`} />
    </div>
    <StudentWatch title="Priority Students" subtitle="Attendance, academic and mentoring signals combined" rows={data.attention.slice(0, 8)} metric="health" />
    <div className="grid gap-5 xl:grid-cols-2">
      <MiniList title="Upcoming class coordination" rows={data.classMeetings.filter((meeting) => meeting.status !== 'Completed')} label={(meeting) => meeting.title} detail={(meeting) => `${meeting.date} · ${meeting.status}`} />
      <MiniList title="Open grievances" rows={data.grievances.filter((item) => !['Resolved', 'Closed'].includes(item.status))} label={(item) => `${item.student} — ${item.subject}`} detail={(item) => `${item.priority} priority · ${item.status}`} />
    </div>
  </>;
}

function CoordinatorDashboard({ data }) {
  const { stats } = data;
  return <>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Students tracked" value={stats.students} footer="2024 BCS consolidated dataset" />
      <StatTile label="Mentor compliance" value={stats.mentorCompliance} suffix="%" footer="Recorded mentoring sessions vs due" />
      <StatTile label="Students at risk" value={stats.atRisk} footer="Needs attendance or academic follow-up" />
      <StatTile label="Pending OD approvals" value={stats.pendingOd} footer={`${stats.plannedEvents} planned year activity(s)`} />
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <MentorTracker rows={data.mentors} compact />
      <MiniList title="Year calendar" rows={data.events} label={(event) => event.title} detail={(event) => `${event.date} · ${event.type} · ${event.status}`} />
    </div>
    <StudentWatch title="Immediate attention" subtitle="Lowest health index across the year" rows={data.atRisk.slice(0, 8)} metric="health" />
  </>;
}

function StudentWatch({ title, subtitle, rows, metric }) {
  return <SectionTable title={title} subtitle={subtitle} action={<Badge tone={rows.length ? 'rose' : 'green'}>{rows.length} student{rows.length === 1 ? '' : 's'}</Badge>}>
    <DataTable rows={rows} rowKey={(row) => row.id} empty={<EmptyState title="No follow-up needed" description="There are no students in this watch list." icon="✓" />} columns={[
      { key: 'student', header: 'Student', render: (row) => <div><p className="font-medium">{row.name}</p><p className="tnum text-[11.5px] text-muted">{row.rollNumber}</p></div> },
      { key: 'health', header: 'Health', align: 'right', render: (row) => <HealthBadge value={row.health} tone={row.healthTone} /> },
      { key: 'cgpa', header: 'CGPA', align: 'right', render: (row) => row.cgpa.toFixed(1) },
      { key: 'attendance', header: 'Attendance', align: 'right', render: (row) => <span className={row.attendanceBelowRequirement ? 'font-semibold text-bad-ink' : ''}>{row.attendance}%</span> },
      { key: 'metric', header: metric === 'health' ? 'Follow-up' : 'Status', align: 'right', render: (row) => <Badge tone={row.flagTone ?? (row.attendanceBelowRequirement ? 'rose' : 'amber')}>{row.flagReason ?? (metric === 'health' ? 'Review' : 'Attendance')}</Badge> },
    ]} />
  </SectionTable>;
}

function AcademicAndDiscipline({ data }) {
  return <>
    <StudentWatch title="Academic Follow-up" subtitle="CGPA below 7.0 or standing arrears" rows={data.academicWatch} metric="academic" />
    <SectionCard title="Discipline Register" subtitle="A transparent log for class-advisor follow-up">
      <EmptyState title="No discipline incidents recorded" description="This class currently has no discipline entries. New entries can be introduced through the grievance workflow when needed." icon="✓" />
    </SectionCard>
  </>;
}

function MentorTracker({ rows, compact = false }) {
  return <SectionTable title="Mentor Tracker" subtitle="Assigned learners, mentoring compliance, health and follow-up load">
    <DataTable rows={rows} rowKey={(row) => row.id} columns={[
      { key: 'mentor', header: 'Mentor', render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-[11.5px] text-muted">{row.staffCode}</p></div> },
      { key: 'assigned', header: 'Assigned', align: 'right' },
      { key: 'compliance', header: 'Compliance', align: 'right', render: (row) => <Badge tone={row.compliance >= 80 ? 'green' : 'amber'}>{row.compliance}%</Badge> },
      { key: 'atRisk', header: compact ? 'At risk' : 'At-risk students', align: 'right', render: (row) => <span className={row.atRisk ? 'font-semibold text-bad-ink' : ''}>{row.atRisk}</span> },
      { key: 'averageHealth', header: 'Avg. health', align: 'right', render: (row) => <HealthBadge value={row.averageHealth} tone={row.averageHealth >= 70 ? 'green' : 'amber'} /> },
    ]} />
  </SectionTable>;
}

function StudentDirectory({ role }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), limit: '20' });
  if (search.trim()) query.set('student', search.trim());
  const { data, loading, error } = useResource(`/${role}/me/students?${query}`);

  function updateSearch(value) { setSearch(value); setPage(1); }
  return <SectionTable title="Student Directory" subtitle="Filter by student name or roll number; server-side pagination keeps the dataset scalable" action={<div className="w-56"><TextField label="" placeholder="Search student or roll no." value={search} onChange={(event) => updateSearch(event.target.value)} /></div>}>
    {error && <EmptyState title="Couldn't load students" description={error.message} icon="!" />}
    {loading && !data && <div className="p-5 text-sm text-muted">Loading student dataset…</div>}
    {data && <>
      <DataTable rows={data.students} rowKey={(row) => row.id} columns={[
        { key: 'student', header: 'Student', render: (row) => <div><p className="font-medium">{row.name}</p><p className="tnum text-[11.5px] text-muted">{row.rollNumber} · {row.section}</p></div> },
        { key: 'cgpa', header: 'CGPA', align: 'right', render: (row) => row.cgpa.toFixed(1) },
        { key: 'attendance', header: 'Attendance', align: 'right', render: (row) => <span className={row.attendanceBelowRequirement ? 'font-semibold text-bad-ink' : ''}>{row.attendance}%</span> },
        { key: 'mentor', header: 'Mentoring', align: 'right', render: (row) => `${row.meetingsHeld}/${row.meetingsDue}` },
        { key: 'health', header: 'Health', align: 'right', render: (row) => <HealthBadge value={row.health} tone={row.healthTone} /> },
      ]} />
      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[12px] text-muted">
        <span>{data.total} students · page {data.page} of {data.totalPages}</span>
        <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={data.page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={data.page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
      </div>
    </>}
  </SectionTable>;
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
    <SectionTable title="External Event / OD Approvals" subtitle="Approve or reject pending on-duty requests">
      <DataTable rows={data.odRequests} rowKey={(row) => row.id} columns={[
        { key: 'student', header: 'Student / event', render: (row) => <div><p className="font-medium">{row.student}</p><p className="text-[11.5px] text-muted">{row.rollNumber} · {row.event}</p></div> },
        { key: 'dates', header: 'Dates', align: 'right', render: (row) => `${row.from} – ${row.to}` },
        { key: 'status', header: 'Decision', align: 'right', render: (row) => row.status === 'Pending' ? <div className="flex justify-end gap-2"><StatusButton path={`/coordinator/me/od-requests/${row.id}`} status={row.status} next="Approved" onDone={reload} /><StatusButton path={`/coordinator/me/od-requests/${row.id}`} status={row.status} next="Rejected" onDone={reload} /></div> : <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
      ]} />
    </SectionTable>
  </div>;
}

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

function EventForm({ onDone, onCancel }) {
  const [type, setType] = useState('PTM'); const [title, setTitle] = useState(''); const [date, setDate] = useState(''); const [notes, setNotes] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  async function submit(event) { event.preventDefault(); setSaving(true); setError(''); try { await api('/coordinator/me/events', { method: 'POST', body: { type, title, date, notes } }); onDone(); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  return <SectionCard title="Plan Year Activity" subtitle="Add a PTM, orientation, review meeting or another coordination event"><form className="space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-3"><TextField label="Type" value={type} onChange={(event) => setType(event.target.value)} /><TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required /><TextField label="Date" placeholder="22 Aug 2026" value={date} onChange={(event) => setDate(event.target.value)} required /></div><TextArea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />{error && <p className="text-sm text-bad-ink">{error}</p>}<div className="flex gap-2"><Button type="submit" size="sm" loading={saving}>Save activity</Button><Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button></div></form></SectionCard>;
}
