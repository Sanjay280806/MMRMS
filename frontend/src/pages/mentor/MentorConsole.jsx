import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConsoleLayout } from '../../components/layout/ConsoleLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { DashboardSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary.jsx';
import { ProfileHeader } from '../../components/profile/ProfileHeader.jsx';
import { useResource } from '../../hooks/useResource.js';
import { MentorDashboard } from './sections/MentorDashboard.jsx';
import { Roster } from './sections/Roster.jsx';
import { WatchList } from './sections/WatchList.jsx';
import { ActionItemQueue } from './sections/ActionItemQueue.jsx';
import { GoalsOverview } from './sections/GoalsOverview.jsx';
import { ParentLog } from './sections/ParentLog.jsx';
import { Reports } from './sections/Reports.jsx';
import { ActivityTimeline } from './sections/ActivityTimeline.jsx';
import { MenteeRecordBook } from './MenteeRecordBook.jsx';
import { ChipGroup, TextArea, TextField } from '../../components/ui/Field.jsx';
import { api } from '../../api/client.js';

const TITLES = {
  dashboard: 'Mentor Dashboard',
  mentees: 'My Mentees',
  attendance: 'Attendance Watch',
  arrears: 'Arrear Watch',
  wellbeing: 'Well-being Watch',
  overdue: 'Overdue Meetings',
  actions: 'Action Items',
  goals: 'SMART Goals',
  parents: 'Parent Interaction Log',
  reports: 'Term Reports',
  timeline: 'Activity Timeline',
};

const MEETING_CATEGORIES = ['Attendance', 'Academic', 'Profile Upgradation', 'Career', 'Others'];
const MEETING_AGENDA_ITEMS = [
  'Academic Review',
  'Attendance Review',
  'Placement Preparation',
  'Personal Discussion',
  'Goal Progress',
  'Other',
];
const MEETING_MODES = ['Offline', 'Online'];
const ACTION_STATUSES = ['Pending', 'In Progress', 'Completed'];
const MAX_MEETING_PHOTO_BYTES = 1024 * 1024;

const newActionItem = () => ({ task: '', responsible: 'Student', targetDate: '', status: 'Pending' });
const newGoalProgress = () => ({ goalId: '', currentStatus: '', progress: 0 });

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function MentorConsole() {
  const [section, setSection] = useState('dashboard');
  const [menteeId, setMenteeId] = useState(null);
  const [recordingMeeting, setRecordingMeeting] = useState(false);
  const { data, loading, error, reload } = useResource('/mentor/me/overview');

  function openMentee(id) {
    setMenteeId(id);
    setSection('mentees');
  }

  function navigate(key) {
    setSection(key);
    setMenteeId(null);
  }

  if (error) {
    return (
      <div className="p-8">
        <EmptyState
          title="Couldn't load the console"
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

  if (loading && !data) {
    return (
      <div className="p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  const { mentor, stats } = data;

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'mentees', label: 'My Mentees', badge: stats.assignedMentees },
      ],
    },
    {
      label: 'Watch Lists',
      items: [
        { key: 'attendance', label: 'Attendance', badge: stats.attendanceShortfalls, badgeTone: 'rose' },
        { key: 'arrears', label: 'Arrears', badge: stats.standingArrears },
        { key: 'wellbeing', label: 'Well-being', badge: stats.wellbeingConcerns, badgeTone: 'rose' },
        { key: 'overdue', label: 'Overdue Meetings', badge: stats.overdueMeetings, badgeTone: 'rose' },
      ],
    },
    {
      label: 'Mentoring',
      items: [
        { key: 'actions', label: 'Action Items', badge: stats.openActionItems },
        { key: 'goals', label: 'SMART Goals' },
        { key: 'parents', label: 'Parent Log' },
      ],
    },
    {
      label: 'Reports',
      items: [
        { key: 'reports', label: 'Term Reports' },
        { key: 'timeline', label: 'Activity Timeline' },
      ],
    },
  ];

  return (
    <ConsoleLayout
      product="Mentor Console"
      navGroups={navGroups}
      activeNav={section}
      onNavChange={navigate}
      identity={{
        navKey: 'dashboard',
        initials: mentor.initials,
        name: mentor.name,
        meta: mentor.designation,
        note: `${stats.assignedMentees} mentees · ${stats.batchCount} batches`,
      }}
      title={menteeId ? 'Mentee Record Book' : TITLES[section]}
      subtitle={`${data.institution.recordBook} · ${data.institution.term} · ${stats.reviewCycle} review cycle`}
      greet={!menteeId && section === 'dashboard'}
      actions={<Button size="sm" onClick={() => setRecordingMeeting(true)}>＋ Record a Meeting</Button>}
      profile={
        <ProfileHeader
          initials={mentor.initials}
          name={mentor.name}
          subtitle={`${mentor.designation} · ${mentor.department}`}
          meta={`${mentor.email} · ${mentor.cabin}`}
          seed={mentor.name.length}
          defaultOpen={false}
          stats={[
            { label: 'Mentees ', value: stats.assignedMentees, tone: 'indigo' },
            { label: 'Compliance ', value: `${stats.compliance}%`, tone: stats.compliance >= 80 ? 'green' : 'amber' },
            { label: 'Flagged ', value: stats.flaggedCount, tone: stats.flaggedCount ? 'rose' : 'green' },
          ]}
          fields={[
            { key: 'Designation', value: mentor.designation },
            { key: 'Department', value: mentor.department },
            { key: 'Email ID', value: mentor.email },
            { key: 'Mobile Number', value: mentor.mobile },
            { key: 'Cabin', value: mentor.cabin },
            { key: 'Year Coordinator', value: mentor.yearCoordinator },
            { key: 'Batches Mentored', value: mentor.batches?.join(', ') },
            { key: 'Review Cycle', value: stats.reviewCycle },
            { key: 'Record Books Complete', value: `${stats.recordBooksComplete} of ${stats.recordBooksTotal}` },
            { key: 'Parent Contacts This Term', value: String(stats.parentContactsThisTerm) },
          ]}
        />
      }
    >
      <ErrorBoundary resetKey={`${section}:${menteeId}`}>
        <div className="animate-fadeRise space-y-5">
          {recordingMeeting && (
            <MeetingComposer
              onClose={() => setRecordingMeeting(false)}
              onRecorded={() => {
                setRecordingMeeting(false);
                reload();
              }}
            />
          )}
          {section === 'dashboard' && <MentorDashboard data={data} onOpenMentee={openMentee} />}

          {section === 'mentees' &&
            (menteeId ? (
              <MenteeRecordBook menteeId={menteeId} onBack={() => setMenteeId(null)} />
            ) : (
              <Roster onOpenMentee={setMenteeId} />
            ))}

          {section === 'attendance' && (
            <WatchList
              section="Section 3"
              title="Attendance Watch"
              subtitle={`Mentees below the ${75}% requirement, lowest first`}
              mentees={data.attendanceWatch}
              onOpen={openMentee}
              showHealth={false}
              metric={(m) => ({ label: 'Attendance', value: `${m.attendance}%`, tone: m.health < 50 ? 'rose' : 'amber' })}
              detail={(m) => `${m.shortageCount} subject${m.shortageCount === 1 ? '' : 's'} below requirement`}
              emptyTitle="No attendance shortfalls"
            />
          )}

          {section === 'arrears' && (
            <WatchList
              section="Section 5"
              title="Arrear Watch"
              subtitle="Mentees carrying standing arrears"
              mentees={data.arrearWatch}
              onOpen={openMentee}
              metric={(m) => ({ label: 'Arrears', value: m.standingArrears, tone: 'rose' })}
              detail={(m) => `CGPA ${m.cgpa} · ${m.meetingsHeld} of ${m.meetingsDue} meetings held`}
              emptyTitle="No standing arrears"
            />
          )}

          {section === 'wellbeing' && (
            <WatchList
              section="Section 10"
              title="Well-being Watch"
              subtitle="Mentees with a flagged well-being aspect"
              mentees={data.wellbeingWatch}
              onOpen={openMentee}
              metric={(m) => ({ label: 'Concerns', value: m.wellbeingConcerns, tone: m.wellbeingConcerns > 2 ? 'rose' : 'amber' })}
              detail={(m) => `Last met ${m.lastMeeting}`}
              emptyTitle="No well-being concerns flagged"
            />
          )}

          {section === 'overdue' && (
            <WatchList
              section="Section 12"
              title="Overdue Meetings"
              subtitle="Mentees whose review cycle has slipped"
              mentees={data.meetingWatch}
              onOpen={openMentee}
              metric={(m) => ({ label: 'Overdue', value: m.meetingsOverdue, tone: 'rose' })}
              detail={(m) => `${m.meetingsHeld} of ${m.meetingsDue} held · last met ${m.lastMeeting}`}
              emptyTitle="Every review is up to date"
            />
          )}

          {section === 'actions' && <ActionItemQueue onOpenMentee={openMentee} />}
          {section === 'goals' && <GoalsOverview onOpenMentee={openMentee} />}
          {section === 'parents' && <ParentLog />}
          {section === 'reports' && <Reports />}
          {section === 'timeline' && <ActivityTimeline events={data.timeline} />}
        </div>
      </ErrorBoundary>
    </ConsoleLayout>
  );
}

function MeetingComposer({ onClose, onRecorded }) {
  const { data: roster, loading } = useResource('/mentor/me/mentees?sort=name&limit=100');
  const [menteeId, setMenteeId] = useState('');
  const { data: selectedMentee, loading: loadingMentee } = useResource(
    menteeId ? '/mentor/me/mentees/' + menteeId : '',
    { enabled: Boolean(menteeId) },
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [mode, setMode] = useState('Offline');
  const [category, setCategory] = useState('Academic');
  const [agenda, setAgenda] = useState(['Academic Review']);
  const [agendaNotes, setAgendaNotes] = useState('');
  const [topicsDiscussed, setTopicsDiscussed] = useState('');
  const [studentConcerns, setStudentConcerns] = useState('');
  const [mentorSuggestions, setMentorSuggestions] = useState('');
  const [supportRequired, setSupportRequired] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [progressSinceLastMeeting, setProgressSinceLastMeeting] = useState({
    achievements: '',
    pendingTasks: '',
    improvementObserved: '',
  });
  const [goalProgress, setGoalProgress] = useState([]);
  const [mentorRemarks, setMentorRemarks] = useState('');
  const [studentRemarks, setStudentRemarks] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [mentorSigned, setMentorSigned] = useState(true);
  const [studentSigned, setStudentSigned] = useState(false);
  const [photoProofs, setPhotoProofs] = useState([]);
  const [geotag, setGeotag] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function toggleAgenda(item) {
    setAgenda((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  }

  function updateActionItem(index, patch) {
    setActionItems((items) => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  }

  function updateGoalProgress(index, patch) {
    setGoalProgress((items) => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  }

  async function selectPhotos(event) {
    const files = Array.from(event.target.files ?? []);
    setError(null);
    if (files.length > 4) return setError('Choose up to four photo proofs.');
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_MEETING_PHOTO_BYTES)) {
      return setError('Use JPG, PNG, or WEBP photos smaller than 1 MB each.');
    }
    try {
      setPhotoProofs(await Promise.all(files.map(async (file) => ({
        name: file.name,
        contentType: file.type,
        dataUrl: await fileToDataUrl(file),
      }))));
    } catch (photoError) {
      setError(photoError.message);
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) return setError('Location services are not available in this browser.');
    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeotag({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
        setLocating(false);
      },
      () => {
        setError('We could not capture the location. Check your browser permission and try again.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/mentor/me/mentees/${menteeId}/meetings`, {
        method: 'POST',
        body: {
          date,
          durationMinutes: Number(durationMinutes),
          mode,
          category,
          agenda,
          agendaNotes,
          topicsDiscussed,
          studentConcerns,
          mentorSuggestions,
          supportRequired,
          actionItems,
          progressSinceLastMeeting,
          goalProgress,
          mentorRemarks,
          studentRemarks,
          nextReviewDate,
          mentorSigned,
          studentSigned,
          photoProofs,
          geotag,
        },
      });
      onRecorded();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px] sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <Card
        as="div"
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden animate-fadeRise"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-composer-title"
      >
        <header className="shrink-0 border-b border-line px-5 py-4">
          <h3 id="meeting-composer-title" className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">
            Record Mentoring Session
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Record the complete Section 12 minutes, follow-ups, signatures, photo proof, and meeting location.
          </p>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <section className="space-y-4">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Meeting details</p>
                <p className="mt-0.5 text-[11.5px] text-muted">These details appear in the meeting-log header.</p>
              </div>
              <label className="block text-[12.5px] font-semibold text-muted-strong">
                Mentee
                <select
                  className="mt-1.5 w-full rounded-field border-[1.5px] border-line-strong bg-white px-3.5 py-3 text-[13.5px] text-ink"
                  value={menteeId}
                  onChange={(event) => {
                    setMenteeId(event.target.value);
                    setGoalProgress([]);
                  }}
                  required
                  disabled={loading}
                >
                  <option value="">Select a mentee</option>
                  {roster?.mentees.map((mentee) => (
                    <option key={mentee.id} value={mentee.id}>
                      {mentee.rollNumber} - {mentee.name} - {mentee.batch}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label="Meeting date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                <ChipGroup label="Mode" options={MEETING_MODES} value={mode} onChange={setMode} />
                <TextField
                  label="Duration (minutes)"
                  type="number"
                  min="5"
                  max="240"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  required
                />
              </div>
              <ChipGroup label="Discussion category" options={MEETING_CATEGORIES} value={category} onChange={setCategory} />
            </section>

            <section className="space-y-3 border-t border-line pt-4">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Agenda</p>
                <p className="mt-0.5 text-[11.5px] text-muted">Choose every checklist item covered in this meeting.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {MEETING_AGENDA_ITEMS.map((item) => {
                  const selected = agenda.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleAgenda(item)}
                      className={
                        selected
                          ? 'focus-ring rounded-full border border-ink bg-ink px-3.5 py-1.5 text-xs font-semibold text-white'
                          : 'focus-ring rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-muted transition hover:border-muted-soft hover:text-ink'
                      }
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
              <TextField
                label="Agenda details"
                hint="A short purpose or context for the meeting."
                placeholder="e.g. Review attendance recovery plan"
                value={agendaNotes}
                onChange={(event) => setAgendaNotes(event.target.value)}
              />
            </section>

            <section className="space-y-4 border-t border-line pt-4">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Meeting minutes</p>
                <p className="mt-0.5 text-[11.5px] text-muted">Capture the discussion, concerns, guidance, and required support.</p>
              </div>
              <TextArea
                label="Topics discussed"
                value={topicsDiscussed}
                onChange={(event) => setTopicsDiscussed(event.target.value)}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextArea
                  label="Student concerns"
                  rows={3}
                  value={studentConcerns}
                  onChange={(event) => setStudentConcerns(event.target.value)}
                />
                <TextArea
                  label="Mentor suggestions"
                  rows={3}
                  value={mentorSuggestions}
                  onChange={(event) => setMentorSuggestions(event.target.value)}
                />
              </div>
              <TextArea
                label="Support required"
                rows={2}
                value={supportRequired}
                onChange={(event) => setSupportRequired(event.target.value)}
              />
            </section>
            <section className="space-y-3 border-t border-line pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Action items</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">Add each agreed follow-up, including owner, date, and starting status.</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setActionItems((items) => [...items, newActionItem()])}>
                  Add action item
                </Button>
              </div>
              {actionItems.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-line bg-canvas/40 p-3 sm:grid-cols-6">
                  <TextField
                    className="sm:col-span-2"
                    label="Task"
                    value={item.task}
                    onChange={(event) => updateActionItem(index, { task: event.target.value })}
                    required
                  />
                  <label className="block text-[12.5px] font-semibold text-muted-strong">
                    Responsible
                    <select
                      className="mt-1.5 w-full rounded-field border-[1.5px] border-line-strong bg-white px-3 py-3 text-[13px] text-ink"
                      value={item.responsible}
                      onChange={(event) => updateActionItem(index, { responsible: event.target.value })}
                    >
                      <option>Student</option>
                      <option>Mentor</option>
                    </select>
                  </label>
                  <TextField
                    label="Target date"
                    type="date"
                    value={item.targetDate}
                    onChange={(event) => updateActionItem(index, { targetDate: event.target.value })}
                  />
                  <label className="block text-[12.5px] font-semibold text-muted-strong">
                    Status
                    <select
                      className="mt-1.5 w-full rounded-field border-[1.5px] border-line-strong bg-white px-3 py-3 text-[13px] text-ink"
                      value={item.status}
                      onChange={(event) => updateActionItem(index, { status: event.target.value })}
                    >
                      {ACTION_STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                  <div className="flex items-end">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setActionItems((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {!actionItems.length && <p className="text-[12px] text-muted">No action items recorded for this meeting.</p>}
            </section>

            <section className="space-y-4 border-t border-line pt-4">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Progress since last meeting</p>
                <p className="mt-0.5 text-[11.5px] text-muted">Document what changed before this review.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <TextArea
                  label="Achievements"
                  rows={3}
                  value={progressSinceLastMeeting.achievements}
                  onChange={(event) => setProgressSinceLastMeeting((value) => ({ ...value, achievements: event.target.value }))}
                />
                <TextArea
                  label="Pending tasks"
                  rows={3}
                  value={progressSinceLastMeeting.pendingTasks}
                  onChange={(event) => setProgressSinceLastMeeting((value) => ({ ...value, pendingTasks: event.target.value }))}
                />
                <TextArea
                  label="Improvement observed"
                  rows={3}
                  value={progressSinceLastMeeting.improvementObserved}
                  onChange={(event) => setProgressSinceLastMeeting((value) => ({ ...value, improvementObserved: event.target.value }))}
                />
              </div>
            </section>

            <section className="space-y-3 border-t border-line pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">SMART goal progress</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">Optional updates are shown in this meeting's goal-progress section.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!menteeId || loadingMentee || !selectedMentee?.goals?.length}
                  onClick={() => setGoalProgress((items) => [...items, newGoalProgress()])}
                >
                  Add goal update
                </Button>
              </div>
              {!menteeId && <p className="text-[12px] text-muted">Choose a mentee to add their SMART-goal updates.</p>}
              {goalProgress.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-line bg-canvas/40 p-3 sm:grid-cols-6">
                  <label className="block text-[12.5px] font-semibold text-muted-strong sm:col-span-2">
                    Goal
                    <select
                      className="mt-1.5 w-full rounded-field border-[1.5px] border-line-strong bg-white px-3 py-3 text-[13px] text-ink"
                      value={item.goalId}
                      onChange={(event) => updateGoalProgress(index, { goalId: event.target.value })}
                      required
                    >
                      <option value="">Select a goal</option>
                      {selectedMentee?.goals?.map((goal) => <option key={goal.id} value={goal.id}>{goal.text}</option>)}
                    </select>
                  </label>
                  <TextField
                    className="sm:col-span-2"
                    label="Current status"
                    value={item.currentStatus}
                    onChange={(event) => updateGoalProgress(index, { currentStatus: event.target.value })}
                    required
                  />
                  <TextField
                    label="Progress (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={item.progress}
                    onChange={(event) => updateGoalProgress(index, { progress: Number(event.target.value) })}
                    required
                  />
                  <div className="flex items-end">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setGoalProgress((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-4 border-t border-line pt-4">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">Remarks and review</p>
                <p className="mt-0.5 text-[11.5px] text-muted">Save both parties' remarks, the next review date, and acknowledgement state.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextArea
                  label="Mentor remarks"
                  rows={3}
                  value={mentorRemarks}
                  onChange={(event) => setMentorRemarks(event.target.value)}
                />
                <TextArea
                  label="Student remarks"
                  rows={3}
                  value={studentRemarks}
                  onChange={(event) => setStudentRemarks(event.target.value)}
                />
              </div>
              <TextField
                label="Next review date"
                type="date"
                value={nextReviewDate}
                onChange={(event) => setNextReviewDate(event.target.value)}
              />
              <div className="space-y-2 rounded-xl border border-line bg-canvas/50 p-3.5 text-[12px] text-muted-strong">
                <label className="flex items-start gap-2.5">
                  <input className="mt-0.5" type="checkbox" checked={mentorSigned} onChange={(event) => setMentorSigned(event.target.checked)} required />
                  <span><strong className="font-semibold text-ink">Mentor signature</strong> — I confirm these meeting minutes.</span>
                </label>
                <label className="flex items-start gap-2.5">
                  <input className="mt-0.5" type="checkbox" checked={studentSigned} onChange={(event) => setStudentSigned(event.target.checked)} />
                  <span><strong className="font-semibold text-ink">Student signature</strong> — the student has reviewed and acknowledged these minutes.</span>
                </label>
              </div>
            </section>

            <div className="grid gap-4 rounded-xl border border-line bg-canvas/50 p-4 sm:grid-cols-2">
              <label className="text-[12.5px] font-semibold text-muted-strong">
                Photo proofs (optional)
                <input
                  className="mt-1.5 block w-full text-[12px] text-muted"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={selectPhotos}
                />
                <span className="mt-1 block text-[11px] font-normal text-muted">
                  Up to four JPG, PNG, or WEBP photos, 1 MB each.
                </span>
              </label>
              <div>
                <p className="text-[12.5px] font-semibold text-muted-strong">Meeting location (optional)</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="secondary" loading={locating} onClick={captureLocation}>
                    Capture location
                  </Button>
                  {geotag && (
                    <span className="text-[11.5px] font-medium text-good-ink">
                      Location saved (accuracy {Math.round(geotag.accuracy)} m)
                    </span>
                  )}
                </div>
              </div>
              {photoProofs.length > 0 && (
                <p className="text-[11.5px] text-good-ink sm:col-span-2">
                  {photoProofs.length} photo proof{photoProofs.length === 1 ? '' : 's'} ready to save.
                </p>
              )}
            </div>
            {error && <p className="text-sm text-bad-ink">{error}</p>}
          </div>

          <div className="flex shrink-0 gap-2 border-t border-line bg-white px-5 py-4">
            <Button type="submit" size="sm" loading={saving}>
              Save meeting
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>,
    document.body,
  );
}
