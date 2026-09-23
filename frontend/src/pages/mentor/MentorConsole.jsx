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
import { ParentLog } from './sections/ParentLog.jsx';
import { Reports } from './sections/Reports.jsx';
import { ActivityTimeline } from './sections/ActivityTimeline.jsx';
import { Announcements } from './sections/Announcements.jsx';
import { MenteeRecordBook } from './MenteeRecordBook.jsx';
import { ChipGroup, TextArea, TextField } from '../../components/ui/Field.jsx';
import { api } from '../../api/client.js';

const TITLES = {
  dashboard: 'Mentor Dashboard',
  mentees: 'My Mentees',
  attendance: 'Attendance Watch',
  arrears: 'Arrear Watch',
  overdue: 'Overdue Meetings',
  actions: 'Action Items',
  parents: 'Parent Interaction Log',
  reports: 'Term Reports',
  timeline: 'Activity Timeline',
  announcements: 'Announcements',
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
        { key: 'overdue', label: 'Overdue Meetings', badge: stats.overdueMeetings, badgeTone: 'rose' },
      ],
    },
    {
      label: 'Mentoring',
      items: [
        { key: 'actions', label: 'Action Items', badge: stats.openActionItems },
        { key: 'parents', label: 'Parent Log' },
        { key: 'announcements', label: 'Announcements' },
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

          {section === 'parents' && <ParentLog />}
          {section === 'announcements' && <Announcements />}
          {section === 'reports' && <Reports />}
          {section === 'timeline' && <ActivityTimeline events={data.timeline} />}
        </div>
      </ErrorBoundary>
    </ConsoleLayout>
  );
}

function MeetingComposer({ onClose, onRecorded }) {
  const { data: roster, loading } = useResource('/mentor/me/mentees?sort=name&limit=100');
  const [selectedMenteeIds, setSelectedMenteeIds] = useState([]);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const menteesList = roster?.mentees ?? [];
  const isAllSelected = menteesList.length > 0 && selectedMenteeIds.length === menteesList.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMenteeIds([]);
    } else {
      setSelectedMenteeIds(menteesList.map((m) => m.id));
    }
  };

  const toggleMentee = (id) => {
    setSelectedMenteeIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const primaryMenteeId = selectedMenteeIds[0] || '';
  const { data: selectedMentee, loading: loadingMentee } = useResource(
    primaryMenteeId ? '/mentor/me/mentees/' + primaryMenteeId : '',
    { enabled: Boolean(primaryMenteeId) },
  );

  const getTomorrowDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getTodayDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const minReviewDate = getTomorrowDateStr();
  const todayDateStr = getTodayDateStr();

  const [date, setDate] = useState(getTodayDateStr());
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [mode, setMode] = useState('Offline');
  const [category, setCategory] = useState('Academic');
  const [agenda, setAgenda] = useState(['Academic Review']);
  const [agendaNotes, setAgendaNotes] = useState('');
  const [topicsDiscussed, setTopicsDiscussed] = useState('');
  const [studentConcerns, setStudentConcerns] = useState('');
  const [mentorSuggestions, setMentorSuggestions] = useState('');
  const [supportRequired, setSupportRequired] = useState('');
  const [actionItems, setActionItems] = useState([newActionItem()]);
  const [progressSinceLastMeeting, setProgressSinceLastMeeting] = useState({
    achievements: '',
    pendingTasks: '',
    improvementObserved: '',
  });
  const [mentorRemarks, setMentorRemarks] = useState('');
  const [studentRemarks, setStudentRemarks] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [reviewDateError, setReviewDateError] = useState(null);
  const [mentorSigned, setMentorSigned] = useState(true);
  const [studentSigned, setStudentSigned] = useState(false);
  const [photoProofs, setPhotoProofs] = useState([]);
  const [geotag, setGeotag] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const hasValidActionItem = actionItems.some((item) => item.task?.trim().length > 0);

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
    setError(null);

    if (selectedMenteeIds.length === 0) {
      setError('Please select at least one student for this meeting.');
      return;
    }

    if (!hasValidActionItem) {
      setError('An action item is required. Please enter at least one action item task before saving the meeting.');
      return;
    }

    if (nextReviewDate && nextReviewDate <= todayDateStr) {
      setError('Next review date must be a future date (cannot be today or a past date).');
      return;
    }

    setSaving(true);
    try {
      const validActionItemsList = actionItems.filter((item) => item.task?.trim());
      const payload = {
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
        actionItems: validActionItemsList,
        progressSinceLastMeeting,
        goalProgress,
        mentorRemarks,
        studentRemarks,
        nextReviewDate,
        mentorSigned,
        studentSigned,
        photoProofs,
        geotag,
      };

      if (selectedMenteeIds.length === 1) {
        await api(`/mentor/me/mentees/${selectedMenteeIds[0]}/meetings`, {
          method: 'POST',
          body: payload,
        });
      } else {
        try {
          await api('/mentor/me/meetings/batch', {
            method: 'POST',
            body: {
              menteeIds: selectedMenteeIds,
              ...payload,
            },
          });
        } catch {
          await Promise.all(
            selectedMenteeIds.map((id) =>
              api(`/mentor/me/mentees/${id}/meetings`, {
                method: 'POST',
                body: payload,
              }),
            ),
          );
        }
      }

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

              {/* Student / Mentee Multi-Select with Checkboxes and Select All */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[12.5px] font-semibold text-muted-strong">
                    Select Students / Mentees <span className="text-bad-ink">*</span>
                  </label>
                  <span className="text-[11.5px] font-medium text-muted">
                    {selectedMenteeIds.length} of {menteesList.length} selected
                  </span>
                </div>

                {/* Dropdown trigger */}
                <div className="relative">
                  <button
                    type="button"
                    id="select-students-trigger"
                    onClick={() => setStudentPickerOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-field border-[1.5px] border-line-strong bg-white px-3.5 py-2.5 text-left text-[13px] text-ink shadow-sm transition hover:border-brand-400 focus:border-brand-500 focus:outline-none"
                    disabled={loading}
                  >
                    <span className="truncate">
                      {selectedMenteeIds.length === 0 && (
                        <span className="text-muted">Click to select students...</span>
                      )}
                      {selectedMenteeIds.length > 0 && isAllSelected && (
                        <span className="font-semibold text-brand-700">
                          ✓ All {menteesList.length} students selected
                        </span>
                      )}
                      {selectedMenteeIds.length > 0 && !isAllSelected && (
                        <span className="font-semibold text-ink">
                          {selectedMenteeIds.length} student{selectedMenteeIds.length === 1 ? '' : 's'} selected
                        </span>
                      )}
                    </span>
                    <span className="ml-2 text-xs text-muted">
                      {studentPickerOpen ? '▲ Close' : '▼ Select'}
                    </span>
                  </button>

                  {/* Dropdown selection panel */}
                  {studentPickerOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-line-strong bg-white p-3 shadow-xl">
                      {/* Search box */}
                      <input
                        type="text"
                        placeholder="Search student by name or roll number..."
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        className="w-full rounded-lg border border-line bg-canvas/60 px-3 py-1.5 text-[12px] text-ink placeholder-muted focus:border-brand-500 focus:bg-white focus:outline-none"
                      />

                      {/* Select all option */}
                      <div className="mt-2 flex items-center justify-between border-b border-line pb-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-[12.5px] font-semibold text-ink hover:text-brand-700">
                          <input
                            type="checkbox"
                            id="select-all-students-checkbox"
                            checked={isAllSelected}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                          <span>Select all ({menteesList.length} students)</span>
                        </label>
                        {selectedMenteeIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedMenteeIds([])}
                            className="text-[11.5px] font-medium text-muted hover:text-bad-ink"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Student list with checkboxes */}
                      <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto pr-1">
                        {menteesList
                          .filter((m) =>
                            !studentSearch ||
                            `${m.name} ${m.rollNumber}`.toLowerCase().includes(studentSearch.toLowerCase()),
                          )
                          .map((mentee) => {
                            const isChecked = selectedMenteeIds.includes(mentee.id);
                            return (
                              <label
                                key={mentee.id}
                                htmlFor={`student-checkbox-${mentee.id}`}
                                className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 cursor-pointer select-none transition-colors ${
                                  isChecked ? 'bg-brand-50 text-brand-900 font-medium' : 'hover:bg-canvas text-ink'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  id={`student-checkbox-${mentee.id}`}
                                  checked={isChecked}
                                  onChange={() => toggleMentee(mentee.id)}
                                  className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-500 cursor-pointer"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[12px] font-semibold text-ink">
                                      {mentee.rollNumber}
                                    </span>
                                    <span className="truncate text-[12.5px]">
                                      {mentee.name}
                                    </span>
                                  </div>
                                  <div className="text-[10.5px] text-muted">
                                    {mentee.batch} · Attendance {mentee.attendance}%
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        {menteesList.filter((m) =>
                          !studentSearch ||
                          `${m.name} ${m.rollNumber}`.toLowerCase().includes(studentSearch.toLowerCase()),
                        ).length === 0 && (
                          <p className="py-3 text-center text-xs text-muted">
                            No students match "{studentSearch}".
                          </p>
                        )}
                      </div>

                      <div className="mt-2 flex justify-end border-t border-line pt-2">
                        <button
                          type="button"
                          onClick={() => setStudentPickerOpen(false)}
                          className="rounded-lg bg-ink px-3.5 py-1 text-xs font-semibold text-white hover:bg-ink-soft"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected summary badges */}
                {selectedMenteeIds.length > 0 && (
                  <div className="pt-0.5">
                    {isAllSelected ? (
                      <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50/80 px-3 py-1.5 text-[11.5px] text-brand-800">
                        <span className="font-medium">
                          All {menteesList.length} students selected for this session.
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedMenteeIds([])}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          Deselect all
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {menteesList
                          .filter((m) => selectedMenteeIds.includes(m.id))
                          .slice(0, 5)
                          .map((m) => (
                            <span
                              key={m.id}
                              className="inline-flex items-center gap-1 rounded-md border border-line bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink"
                            >
                              <span>{m.rollNumber} ({m.name.split(' ')[0]})</span>
                              <button
                                type="button"
                                onClick={() => toggleMentee(m.id)}
                                className="text-muted hover:text-bad-ink"
                                title="Remove student"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        {selectedMenteeIds.length > 5 && (
                          <span className="text-[11px] font-medium text-muted">
                            +{selectedMenteeIds.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
                  <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
                    Action items <span className="text-bad-ink font-bold">*</span>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted">
                    At least one action item task is required before the meeting can be saved.
                  </p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setActionItems((items) => [...items, newActionItem()])}>
                  Add action item
                </Button>
              </div>

              {!hasValidActionItem && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-800">
                  ⚠️ <strong>Action item required:</strong> Please enter at least one task description below. The meeting cannot be saved without an action item.
                </div>
              )}

              {actionItems.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-line bg-canvas/40 p-3 sm:grid-cols-6">
                  <TextField
                    className="sm:col-span-2"
                    label={`Task #${index + 1} *`}
                    placeholder="e.g. Complete review assignment"
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
                    {actionItems.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setActionItems((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!actionItems.length && (
                <p className="text-[12px] text-amber-700 font-medium">No action items added yet. Click &quot;Add action item&quot; above.</p>
              )}
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
                  disabled={!primaryMenteeId || loadingMentee || !selectedMentee?.goals?.length}
                  onClick={() => setGoalProgress((items) => [...items, newGoalProgress()])}
                >
                  Add goal update
                </Button>
              </div>
              {!selectedMenteeIds.length && <p className="text-[12px] text-muted">Select students above to add their SMART-goal updates.</p>}
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
              <div>
                <TextField
                  label="Next review date"
                  hint="Only future dates can be entered (cannot be today or a past date)."
                  type="date"
                  min={minReviewDate}
                  value={nextReviewDate}
                  onChange={(event) => {
                    const val = event.target.value;
                    setNextReviewDate(val);
                    if (val && val <= todayDateStr) {
                      setReviewDateError('Next review date must be a future date (cannot be today or a past date).');
                    } else {
                      setReviewDateError(null);
                    }
                  }}
                />
                {reviewDateError && (
                  <p className="mt-1 text-[11.5px] font-semibold text-bad-ink">{reviewDateError}</p>
                )}
              </div>
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

          <div className="flex shrink-0 items-center justify-between border-t border-line bg-white px-5 py-4">
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                loading={saving}
                disabled={saving || !hasValidActionItem || selectedMenteeIds.length === 0}
              >
                Save meeting
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
            {(!hasValidActionItem || selectedMenteeIds.length === 0) && (
              <p className="text-[11.5px] font-medium text-amber-700">
                {selectedMenteeIds.length === 0
                  ? 'Select at least one student'
                  : 'Action item required to save'}
              </p>
            )}
          </div>
        </form>
      </Card>
    </div>,
    document.body,
  );
}
