import { useState } from 'react';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DashboardSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { HealthDial, ProfileHeader } from '../../components/profile/ProfileHeader.jsx';
import { HealthPanel } from '../../components/record/HealthPanel.jsx';
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
import { useResource } from '../../hooks/useResource.js';

const TABS = [
  { value: 'profile', label: 'Profile & Background' },
  { value: 'skills', label: 'Skills & Assessment' },
  { value: 'academics', label: 'Academics' },
  { value: 'growth', label: 'Growth & Career' },
  { value: 'support', label: 'Well-being & Parents' },
  { value: 'meetings', label: 'Meetings & Goals' },
];

/**
 * The mentor's copy of a mentee's record book. Every panel is the same
 * component the student sees — read-only here, since the student owns their
 * own entries and the mentor records theirs during a meeting.
 */
export function MenteeRecordBook({ menteeId, onBack }) {
  const [tab, setTab] = useState('profile');
  const { data, loading, error } = useResource(`/mentor/me/mentees/${menteeId}`);

  if (error) {
    return (
      <EmptyState
        title="Couldn't load this record book"
        description={error.message}
        icon="!"
        action={
          <Button size="sm" variant="secondary" onClick={onBack}>
            ← Back to mentees
          </Button>
        }
      />
    );
  }

  if (loading && !data) return <DashboardSkeleton tiles={3} />;

  const { identity, health, roster } = data;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="focus-ring rounded text-[12.5px] font-semibold text-muted transition hover:text-brand-500"
      >
        ← My Mentees
      </button>

      <ProfileHeader
        initials={identity.initials}
        name={identity.name}
        subtitle={`${identity.programme} · ${identity.year} · ${identity.section}`}
        meta={`${identity.rollNumber} · Register No. ${identity.registerNumber} · ${identity.batch}`}
        seed={identity.name.length}
        defaultOpen={false}
        aside={<HealthDial index={health.index} tone={health.tone} label={health.label} />}
        stats={[
          { label: 'CGPA ', value: data.performance.cgpa, tone: 'indigo' },
          { label: 'Attendance ', value: `${data.attendance.current}%`, tone: data.attendance.tone },
          {
            label: 'Arrears ',
            value: data.performance.standingArrears,
            tone: data.performance.standingArrears ? 'rose' : 'green',
          },
          {
            label: 'Meetings ',
            value: `${roster.meetingsHeld}/${roster.meetingsDue}`,
            tone: roster.meetingsHeld < roster.meetingsDue ? 'rose' : 'green',
          },
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
          { key: 'Year Coordinator', value: identity.yearCoordinator },
          { key: 'Last Meeting', value: roster.lastMeeting },
        ]}
      />

      {roster.flagReason && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-bad/25 bg-bad/[0.06] px-5 py-3.5">
          <Badge tone="rose" size="md">
            {roster.flagReason}
          </Badge>
          <p className="flex-1 text-[12.5px] text-bad-ink">
            Suggested action: <strong className="font-semibold">{roster.suggestedAction}</strong>
          </p>
        </div>
      )}

      <Card className="px-5 py-3">
        <Tabs items={TABS} value={tab} onChange={setTab} size="sm" />
      </Card>

      {tab === 'profile' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <AcademicBackground background={data.sectionOne.academicBackground} />
            <Aspirations aspirations={data.sectionOne.aspirations} />
          </div>
          <HealthPanel health={health} />
        </div>
      )}

      {tab === 'skills' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <SkillAssessment skills={data.sectionOne.skillAssessment} />
          <div className="space-y-5">
            <SelfAssessment assessment={data.sectionOne.selfAssessment} />
            <MentorAssessment assessment={data.sectionOne.mentorAssessment} />
          </div>
        </div>
      )}

      {tab === 'academics' && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PerformanceTracker performance={data.performance} />
            </div>
            <CgpaTarget performance={data.performance} />
          </div>
          <AttendanceMonitoring attendance={data.attendance} />
          <CoursePerformance coursePerformance={data.coursePerformance} />
          <ArrearTracking arrears={data.arrears} />
        </div>
      )}

      {tab === 'growth' && (
        <div className="space-y-5">
          <ParticipationRecord participation={data.participation} />
          <EvidencePanel
            title="Participation Evidence"
            description="Certificates and proof submitted by the student."
            evidence={data.evidence.participation}
          />
          <CertificationTracker certifications={data.certifications} />
          <EvidencePanel
            title="Certification Evidence"
            description="Certificates and proof submitted by the student."
            evidence={data.evidence.certifications}
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <PlacementReadiness placementReadiness={data.placementReadiness} />
            <InternshipAndProject record={data.internshipAndProject} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <EvidencePanel
              title="Placement Evidence"
              description="Documents submitted by the student for placement readiness."
              evidence={data.evidence.placement}
            />
            <EvidencePanel
              title="Internship & Project Evidence"
              description="Documents submitted by the student for internship and project work."
              evidence={data.evidence.internship}
            />
          </div>
        </div>
      )}

      {tab === 'support' && (
        <div className="space-y-5">
          <WellbeingReview wellbeing={data.wellbeing} />
          <ParentInteractionLog parentInteractions={data.parentInteractions} />
        </div>
      )}

      {tab === 'meetings' && (
        <div className="space-y-5">
          <MeetingLog meetings={data.meetings} />
          <GoalPanel goals={data.goals} />
        </div>
      )}
    </div>
  );
}
