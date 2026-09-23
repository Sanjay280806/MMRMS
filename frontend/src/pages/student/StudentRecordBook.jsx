import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client.js';
import { ConsoleLayout } from '../../components/layout/ConsoleLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DashboardSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary.jsx';
import { ProfileHeader } from '../../components/profile/ProfileHeader.jsx';
import {
  AcademicBackground,
  Aspirations,
} from '../../components/record/SectionOne.jsx';
import {
  ArrearTracking,
  AttendanceMonitoring,
  CgpaTarget,
  CoursePerformance,
  PerformanceTracker,
} from '../../components/record/Academics.jsx';
import {
  CertificationTracker,
  InternshipAndProject,
  ParticipationRecord,
  PlacementReadiness,
} from '../../components/record/Growth.jsx';
import { MeetingLog } from '../../components/record/MeetingLog.jsx';
import { EvidencePanel } from '../../components/record/Evidence.jsx';
import { AddParticipation, AddCertification, AddInternshipProject } from './AddEntry.jsx';
import { ContactMentor } from './ContactMentor.jsx';
import { AnnouncementsHistory } from './AnnouncementsHistory.jsx';
import { useResource } from '../../hooks/useResource.js';
import { useAnnouncements } from '../../hooks/useAnnouncements.js';

const NAV_GROUPS = [
  {
    label: 'My Record Book',
    items: [
      { key: 'profile', label: 'Profile & Background' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { key: 'performance', label: 'Performance Tracker' },
      { key: 'attendance', label: 'Attendance Monitoring' },
      { key: 'courses', label: 'Course Performance' },
      { key: 'arrears', label: 'Arrear Tracking' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { key: 'participation', label: 'Participation Record' },
      { key: 'certifications', label: 'Certifications' },
      { key: 'placement', label: 'Placement Readiness' },
      { key: 'internship', label: 'Internship & Project' },
    ],
  },
  {
    label: 'Mentoring',
    items: [
      { key: 'meetings', label: 'Meeting Log' },
      { key: 'contact', label: 'Contact Mentor' },
      { key: 'announcements', label: 'Announcements' },
    ],
  },
];

const TITLES = {
  profile: 'Profile & Academic Background',
  performance: 'Academic Performance Tracker',
  attendance: 'Attendance Monitoring',
  courses: 'Course Performance',
  arrears: 'Arrear Tracking',
  participation: 'Participation Record',
  certifications: 'Certification Tracker',
  placement: 'Placement Readiness',
  internship: 'Internship & Project',
  meetings: 'Mentor Meeting Log',
  contact: 'Contact Your Mentor',
  announcements: 'Announcements',
};

export default function StudentRecordBook() {
  const [section, setSection] = useState('profile');
  const [saving, setSaving] = useState(null);
  const { data, loading, error, reload, setData } = useResource('/student/me/record-book');
  const { announcement, clearAnnouncement } = useAnnouncements();

  /** Every write refetches the book so derived figures stay truthful. */
  const mutate = useCallback(
    async (key, request) => {
      setSaving(key);
      try {
        await request();
        await reload();
      } finally {
        setSaving(null);
      }
    },
    [reload],
  );

  if (error) {
    return (
      <div className="p-8">
        <EmptyState
          title="Couldn't load your record book"
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

  const { identity } = data;
  const openActions = data.meetings.openActionItems.length;
  const awaitingGoals = data.goals.filter((g) => g.needsAcknowledgement).length;

  const navGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      badge:
        item.key === 'meetings' ? openActions
          : item.key === 'goals' ? awaitingGoals
            : item.key === 'arrears' ? data.performance.standingArrears
              : item.key === 'wellbeing' ? data.wellbeing.concerns
                : 0,
      badgeTone: item.key === 'arrears' ? 'rose' : 'indigo',
    })),
  }));

  return (
    <ConsoleLayout
      product="Student Record Book"
      navGroups={navGroups}
      activeNav={section}
      onNavChange={setSection}
      identity={{
        navKey: 'profile',
        initials: identity.initials,
        name: identity.name,
        meta: `${identity.rollNumber} · ${identity.year}`,
        note: identity.mentor ? `Mentor · ${identity.mentor.name}` : undefined,
      }}
      title={TITLES[section]}
      subtitle={`${data.institution.recordBook} · Semester ${identity.semester} · ${data.institution.term}`}
      greet={section === 'profile'}
      actions={
        section !== 'contact' && (
          <Button size="sm" onClick={() => setSection('contact')}>
            Raise a concern
          </Button>
        )
      }
      profile={
        <ProfileHeader
          initials={identity.initials}
          name={identity.name}
          subtitle={`${identity.programme} · ${identity.year} · ${identity.section}`}
          meta={`${identity.rollNumber} · Register No. ${identity.registerNumber} · ${identity.batch}`}
          seed={identity.name.length}
          // Expanded on the profile page, folded away while working in a section.
          defaultOpen={section === 'profile'}
          stats={[
            { label: 'CGPA ', value: data.performance.cgpa, tone: 'indigo' },
            { label: 'Attendance ', value: `${data.attendance.current}%`, tone: data.attendance.tone },
            {
              label: 'Arrears ',
              value: data.performance.standingArrears,
              tone: data.performance.standingArrears ? 'rose' : 'green',
            },
            { label: 'Meetings ', value: data.meetings.total, tone: 'slate' },
          ]}
          fields={[
            { key: 'Roll Number', value: identity.rollNumber },
            { key: 'Register Number', value: identity.registerNumber },
            { key: 'Department', value: identity.department },
            { key: 'Year & Semester', value: `${identity.year} · Semester ${identity.semester}` },
            { key: 'Date of Birth', value: identity.dateOfBirth },
            { key: 'Blood Group', value: identity.bloodGroup },
            { key: 'Mobile Number', value: identity.mobile },
            { key: 'Email ID', value: identity.email },
            { key: 'Day Scholar / Hosteller', value: identity.hostelOrDayScholar },
            { key: 'Mentor Since', value: identity.mentorSince },
            { key: 'Address', value: identity.address, span: true },
            { key: 'Mentor', value: identity.mentor && `${identity.mentor.name} · ${identity.mentor.email}` },
            { key: 'Year Coordinator', value: identity.yearCoordinator },
          ]}
        />
      }
    >
      {announcement && createPortal(
        <div className="fixed top-6 right-6 z-[200] max-w-sm w-full animate-fadeRise">
          <div className="bg-white rounded-xl shadow-xl border border-line-strong overflow-hidden flex flex-col">
            <div className="bg-indigo-600 px-4 py-2 flex justify-between items-center">
              <span className="text-white font-semibold text-sm">Announcement from {announcement.mentorName || 'Mentor'}</span>
              <button 
                onClick={clearAnnouncement}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-4 text-[14px] text-ink leading-relaxed">
              {announcement.message}
            </div>
          </div>
        </div>,
        document.body
      )}

      <ErrorBoundary resetKey={section}>
        <div className="animate-fadeRise space-y-5">
          {section === 'profile' && (
            <>
              <div className="space-y-5">
                <div>
                  <AcademicBackground background={data.sectionOne.academicBackground} />
                  <Aspirations aspirations={data.sectionOne.aspirations} />
                </div>
              </div>
            </>
          )}

          {section === 'performance' && (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PerformanceTracker performance={data.performance} />
              </div>
              <CgpaTarget performance={data.performance} />
            </div>
          )}

          {section === 'attendance' && <AttendanceMonitoring attendance={data.attendance} />}
          {section === 'courses' && <CoursePerformance coursePerformance={data.coursePerformance} />}
          {section === 'arrears' && <ArrearTracking arrears={data.arrears} />}

          {section === 'participation' && (
            <>
              <AddParticipation
                categories={data.participation.categories}
                onAdd={(group, entry) =>
                  mutate('participation', () =>
                    api(`/student/me/participation/${group}`, { method: 'POST', body: entry }),
                  )
                }
                saving={saving === 'participation'}
              />
              <ParticipationRecord participation={data.participation} />
            </>
          )}

          {section === 'certifications' && (
            <>
              <AddCertification
                onAdd={(entry) =>
                  mutate('certification', () =>
                    api('/student/me/certifications', { method: 'POST', body: entry }),
                  )
                }
                saving={saving === 'certification'}
              />
              <CertificationTracker certifications={data.certifications} />
            </>
          )}
          {section === 'placement' && (
            <>
              <EvidencePanel
                title="Placement Evidence"
                description="Upload your resume, profile proof, offer-related document, or another readiness record."
                evidence={data.evidence.placement}
                saving={saving === 'evidence-placement'}
                onUpload={(entry) =>
                  mutate('evidence-placement', () =>
                    api('/student/me/evidence/placement', { method: 'POST', body: entry }),
                  )
                }
              />
              <PlacementReadiness
                placementReadiness={data.placementReadiness}
                saving={saving}
                onUpdate={(item, status) =>
                  mutate(item, () =>
                    api(`/student/me/placement-readiness/${encodeURIComponent(item)}`, {
                      method: 'PATCH',
                      body: { status },
                    }),
                  )
                }
              />
            </>
          )}

          {section === 'internship' && (
            <>
              <AddInternshipProject
                onAdd={(entry) =>
                  mutate('internship', () =>
                    api('/student/me/internship-projects', { method: 'POST', body: entry }),
                  )
                }
                saving={saving === 'internship'}
              />
              <InternshipAndProject internshipAndProject={data.internshipAndProject} />
            </>
          )}


          {section === 'meetings' && (
            <MeetingLog
              meetings={data.meetings}
              savingAction={saving}
              onUpdateAction={(actionId, status) =>
                mutate(actionId, () =>
                  api(`/student/me/action-items/${actionId}`, { method: 'PATCH', body: { status } }),
                )
              }
            />
          )}



          {section === 'contact' && (
            <ContactMentor
              support={data.support}
              mentor={identity.mentor}
              onRequestAdded={(request) =>
                setData((prev) => ({
                  ...prev,
                  support: { ...prev.support, requests: [request, ...prev.support.requests] },
                }))
              }
              onMessageAdded={(message) =>
                setData((prev) => ({
                  ...prev,
                  support: { ...prev.support, messages: [...prev.support.messages, message] },
                }))
              }
            />
          )}

          {section === 'announcements' && <AnnouncementsHistory />}
        </div>
      </ErrorBoundary>
    </ConsoleLayout>
  );
}
