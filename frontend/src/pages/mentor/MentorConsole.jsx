import { useState } from 'react';
import { ConsoleLayout } from '../../components/layout/ConsoleLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { SectionCard } from '../../components/ui/SectionCard.jsx';
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
const MAX_MEETING_PHOTO_BYTES = 1024 * 1024;

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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('Academic');
  const [agenda, setAgenda] = useState('');
  const [topicsDiscussed, setTopicsDiscussed] = useState('');
  const [actionItem, setActionItem] = useState('');
  const [photoProofs, setPhotoProofs] = useState([]);
  const [geotag, setGeotag] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/mentor/me/mentees/${menteeId}/meetings`, {
        method: 'POST',
        body: { date, category, agenda, topicsDiscussed, actionItem, photoProofs, geotag },
      });
      onRecorded();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Record Mentoring Session"
      subtitle="Save the agenda, discussion category, optional action item, photo proof, and meeting location."
    >
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-[12.5px] font-semibold text-muted-strong">
          Mentee
          <select
            className="mt-1.5 w-full rounded-field border-[1.5px] border-line-strong bg-white px-3.5 py-3 text-[13.5px] text-ink"
            value={menteeId}
            onChange={(event) => setMenteeId(event.target.value)}
            required
            disabled={loading}
          >
            <option value="">Select a mentee</option>
            {roster?.mentees.map((mentee) => <option key={mentee.id} value={mentee.id}>{mentee.rollNumber} - {mentee.name} - {mentee.batch}</option>)}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Meeting date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          <ChipGroup label="Discussion category" options={MEETING_CATEGORIES} value={category} onChange={setCategory} />
        </div>
        <TextField label="Agenda for meeting" placeholder="e.g. Review attendance recovery plan" value={agenda} onChange={(event) => setAgenda(event.target.value)} required />
        <TextArea label="Discussion notes" value={topicsDiscussed} onChange={(event) => setTopicsDiscussed(event.target.value)} required />
        <TextField label="Student action item (optional)" value={actionItem} onChange={(event) => setActionItem(event.target.value)} />
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
            <span className="mt-1 block text-[11px] font-normal text-muted">Up to four JPG, PNG, or WEBP photos, 1 MB each.</span>
          </label>
          <div>
            <p className="text-[12.5px] font-semibold text-muted-strong">Meeting location (optional)</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="secondary" loading={locating} onClick={captureLocation}>
                Capture location
              </Button>
              {geotag && <span className="text-[11.5px] font-medium text-good-ink">Location saved (accuracy {Math.round(geotag.accuracy)} m)</span>}
            </div>
          </div>
          {photoProofs.length > 0 && <p className="text-[11.5px] text-good-ink sm:col-span-2">{photoProofs.length} photo proof{photoProofs.length === 1 ? '' : 's'} ready to save.</p>}
        </div>
        {error && <p className="text-sm text-bad-ink">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={saving}>Save meeting</Button>
          <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </SectionCard>
  );
}
