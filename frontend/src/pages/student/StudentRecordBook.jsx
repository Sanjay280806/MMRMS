import { useCallback, useState } from 'react';
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
  MentorAssessment,
  SelfAssessment,
  SkillAssessment,
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
  ParentInteractionLog,
  ParticipationRecord,
  PlacementReadiness,
  WellbeingReview,
} from '../../components/record/Growth.jsx';
import { MeetingLog } from '../../components/record/MeetingLog.jsx';
import { GoalPanel } from '../../components/record/Goals.jsx';
import { EvidencePanel } from '../../components/record/Evidence.jsx';
import { AddParticipation, AddCertification } from './AddEntry.jsx';
import { ContactMentor } from './ContactMentor.jsx';
import { useResource } from '../../hooks/useResource.js';

const NAV_GROUPS = [
  {
    label: 'My Record Book',
    items: [
      { key: 'profile', label: 'Profile & Background' },
      { key: 'skills', label: 'Skills & Assessment' },
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
    label: 'Support',
    items: [
      { key: 'wellbeing', label: 'Well-being' },
      { key: 'parents', label: 'Parent Interactions' },
    ],
  },
  {
    label: 'Mentoring',
    items: [
      { key: 'meetings', label: 'Meeting Log' },
      { key: 'goals', label: 'SMART Goals' },
      { key: 'contact', label: 'Contact Mentor' },
    ],
  },
];

const TITLES = {
  profile: 'Profile & Academic Background',
  skills: 'Skills & Assessment',
  performance: 'Academic Performance Tracker',
  attendance: 'Attendance Monitoring',
  courses: 'Course Performance',
  arrears: 'Arrear Tracking',
  participation: 'Participation Record',
  certifications: 'Certification Tracker',
  placement: 'Placement Readiness',
  internship: 'Internship & Project',
  wellbeing: 'Student Well-being',
  parents: 'Parent Interaction Log',
  meetings: 'Mentor Meeting Log',
  goals: 'SMART Goals',
  contact: 'Contact Your Mentor',
};

export default function StudentRecordBook() {
  const [section, setSection] = useState('profile');
  const [saving, setSaving] = useState(null);
  const { data, loading, error, reload, setData } = useResource('/student/me/record-book');

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
            { key: 'Parent / Guardian', value: identity.parentName },
            { key: 'Parent Contact', value: identity.parentContact },
            { key: 'Day Scholar / Hosteller', value: identity.hostelOrDayScholar },
            { key: 'Mentor Since', value: identity.mentorSince },
            { key: 'Address', value: identity.address, span: true },
            { key: 'Mentor', value: identity.mentor && `${identity.mentor.name} · ${identity.mentor.email}` },
            { key: 'Year Coordinator', value: identity.yearCoordinator },
          ]}
        />
      }
    >
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

          {section === 'skills' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <SkillAssessment
                skills={data.sectionOne.skillAssessment}
                onRate={(skill, rating) =>
                  mutate(skill, () =>
                    api(`/student/me/skills/${encodeURIComponent(skill)}`, {
                      method: 'PATCH',
                      body: { rating },
                    }),
                  )
                }
              />
              <div className="space-y-5">
                <SelfAssessment
                  assessment={data.sectionOne.selfAssessment}
                  onSave={(patch) =>
                    mutate('self', () =>
                      api('/student/me/self-assessment', { method: 'PATCH', body: patch }),
                    )
                  }
                />
                <MentorAssessment assessment={data.sectionOne.mentorAssessment} />
              </div>
            </div>
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
              <EvidencePanel
                title="Participation Evidence"
                description="Upload certificates, photos, or participation proof for your mentor to review."
                evidence={data.evidence.participation}
                saving={saving === 'evidence-participation'}
                onUpload={(entry) =>
                  mutate('evidence-participation', () =>
                    api('/student/me/evidence/participation', { method: 'POST', body: entry }),
                  )
                }
              />
              <ParticipationRecord participation={data.participation} />
            </>
          )}

          {section === 'certifications' && (
            <>
              <AddCertification
                statuses={data.certifications.statuses}
                onAdd={(entry) =>
                  mutate('certification', () =>
                    api('/student/me/certifications', { method: 'POST', body: entry }),
                  )
                }
                saving={saving === 'certification'}
              />
              <EvidencePanel
                title="Certification Evidence"
                description="Upload the completed certificate or a related proof from your device."
                evidence={data.evidence.certifications}
                saving={saving === 'evidence-certifications'}
                onUpload={(entry) =>
                  mutate('evidence-certifications', () =>
                    api('/student/me/evidence/certifications', { method: 'POST', body: entry }),
                  )
                }
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
              <EvidencePanel
                title="Internship & Project Evidence"
                description="Upload internship certificates, project letters, or progress proof for your mentor."
                evidence={data.evidence.internship}
                saving={saving === 'evidence-internship'}
                onUpload={(entry) =>
                  mutate('evidence-internship', () =>
                    api('/student/me/evidence/internship', { method: 'POST', body: entry }),
                  )
                }
              />
              <InternshipAndProject record={data.internshipAndProject} />
            </>
          )}
          {section === 'wellbeing' && <WellbeingReview wellbeing={data.wellbeing} />}
          {section === 'parents' && <ParentInteractionLog parentInteractions={data.parentInteractions} />}

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

          {section === 'goals' && (
            <GoalPanel
              goals={data.goals}
              acknowledging={saving}
              onAcknowledge={(goalId) =>
                mutate(goalId, () =>
                  api(`/student/me/goals/${goalId}/acknowledge`, { method: 'POST' }),
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
        </div>
      </ErrorBoundary>
    </ConsoleLayout>
  );
}
