import { useState, useMemo } from 'react';
import { useResource } from '../../../hooks/useResource.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { SectionTable } from '../../../components/ui/SectionCard.jsx';
import { DataTable } from '../../../components/ui/DataTable.jsx';
import { Tabs } from '../../../components/ui/Tabs.jsx';
import { cx } from '../../../lib/tone.js';

export function MenteeReport({ onOpenMentee, onNavigateToMessages }) {
  const { data, loading, error, reload } = useResource('/mentor/me/mentee-analytics');

  // Shortlisting state for top 4 analytics cards: 'all' | 'hackathons' | 'placement' | 'certifications' | 'cgpa'
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Attention needed category filter: 'all' | 'incomplete-placement' | 'no-hackathons' | 'inactive-meetings' | 'no-projects'
  const [attentionFilter, setAttentionFilter] = useState('all');

  const summary = data?.summary || {
    totalMentees: 0,
    hackathonAttendeesCount: 0,
    placementCompleteCount: 0,
    certified5PlusCount: 0,
    cgpaAbove8Count: 0,
    attentionNeededCount: 0,
    noHackathonsCount: 0,
    incompletePlacementCount: 0,
    inactiveMeetingsCount: 0,
    noProjectsCount: 0,
  };

  const mentees = data?.mentees || [];

  // Filtered mentees for the shortlisted table
  const shortlistedMentees = useMemo(() => {
    let list = mentees;
    if (activeFilter === 'hackathons') {
      list = list.filter((m) => m.hasAttendedHackathon);
    } else if (activeFilter === 'placement') {
      list = list.filter((m) => m.placementProfile.isComplete);
    } else if (activeFilter === 'certifications') {
      list = list.filter((m) => m.has5PlusCertifications);
    } else if (activeFilter === 'cgpa') {
      list = list.filter((m) => m.isHighCgpa);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.rollNumber.toLowerCase().includes(q) ||
          m.section?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [mentees, activeFilter, searchQuery]);

  // Filtered mentees for the Attention Needed section
  const attentionMentees = useMemo(() => {
    let list = mentees.filter((m) => m.needsAttention);

    if (attentionFilter === 'no-hackathons') {
      list = list.filter((m) => !m.hasAttendedHackathon);
    } else if (attentionFilter === 'incomplete-placement') {
      list = list.filter((m) => !m.placementProfile.isComplete);
    } else if (attentionFilter === 'inactive-meetings') {
      list = list.filter((m) => m.isInactiveMeetings);
    } else if (attentionFilter === 'no-projects') {
      list = list.filter((m) => m.hasNoProjects);
    }

    return list;
  }, [mentees, attentionFilter]);

  if (error) {
    return (
      <div className="p-8">
        <EmptyState
          title="Couldn't load mentee analytics"
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
      <div className="space-y-4 sm:space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  const filterTitles = {
    all: 'All Mentees',
    hackathons: 'Hackathon Attendees',
    placement: 'Placement Profile Complete',
    certifications: '5+ Certifications Completed',
    cgpa: 'CGPA > 8.0 Distinction',
  };

  const filterSubtitles = {
    all: `${shortlistedMentees.length} mentees · select any card above to shortlist by criteria`,
    hackathons: `Showing ${shortlistedMentees.length} students who attended hackathons or codeathons`,
    placement: `Showing ${shortlistedMentees.length} students with all 4 placement profiles verified`,
    certifications: `Showing ${shortlistedMentees.length} students with 5 or more course certifications`,
    cgpa: `Showing ${shortlistedMentees.length} students maintaining CGPA above 8.0`,
  };

  const ATTENTION_TABS = [
    { value: 'all', label: `All Flagged (${summary.attentionNeededCount})` },
    { value: 'incomplete-placement', label: `Placement Pending (${summary.incompletePlacementCount})` },
    { value: 'no-hackathons', label: `No Hackathons (${summary.noHackathonsCount})` },
    { value: 'inactive-meetings', label: `Overdue Meetings (${summary.inactiveMeetingsCount})` },
    { value: 'no-projects', label: `No Projects (${summary.noProjectsCount})` },
  ];

  const total = summary.totalMentees || 1;
  const hackathonPct = Math.round((summary.hackathonAttendeesCount / total) * 100);
  const placementPct = Math.round((summary.placementCompleteCount / total) * 100);
  const certPct = Math.round((summary.certified5PlusCount / total) * 100);
  const cgpaPct = Math.round((summary.cgpaAbove8Count / total) * 100);

  return (
    <div className="space-y-5">
      {/* 4 Standard Stat Cards matching the website design */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {/* Card 1: Hackathon Attendees */}
        <Card
          as="button"
          type="button"
          interactive
          onClick={() => setActiveFilter(activeFilter === 'hackathons' ? 'all' : 'hackathons')}
          className={cx(
            'flex flex-col justify-between p-4 sm:p-6 text-left transition-all',
            activeFilter === 'hackathons'
              ? 'ring-2 ring-brand-500 border-brand-500 bg-brand-50/20 dark:bg-brand-950/20'
              : ''
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-[12px] font-medium text-muted sm:text-[12.5px]">
              Attended Hackathons
            </span>
            <Badge tone={activeFilter === 'hackathons' ? 'brand' : 'slate'} size="sm">
              {hackathonPct}%
            </Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-1 sm:mt-4">
            <span className="tnum font-display text-[28px] font-medium leading-none tracking-[-0.02em] text-ink sm:text-[34px]">
              {summary.hackathonAttendeesCount}
            </span>
            <span className="text-sm font-medium text-muted-soft">/ {summary.totalMentees}</span>
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-muted sm:mt-3 sm:text-[12px]">
            {activeFilter === 'hackathons' ? 'Active shortlist filter' : 'Departmental, national, or collegiate events'}
          </div>
        </Card>

        {/* Card 2: Placement Profile Complete */}
        <Card
          as="button"
          type="button"
          interactive
          onClick={() => setActiveFilter(activeFilter === 'placement' ? 'all' : 'placement')}
          className={cx(
            'flex flex-col justify-between p-4 sm:p-6 text-left transition-all',
            activeFilter === 'placement'
              ? 'ring-2 ring-brand-500 border-brand-500 bg-brand-50/20 dark:bg-brand-950/20'
              : ''
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-[12px] font-medium text-muted sm:text-[12.5px]">
              Placement Profile Complete
            </span>
            <Badge tone={activeFilter === 'placement' ? 'brand' : 'slate'} size="sm">
              {placementPct}%
            </Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-1 sm:mt-4">
            <span className="tnum font-display text-[28px] font-medium leading-none tracking-[-0.02em] text-ink sm:text-[34px]">
              {summary.placementCompleteCount}
            </span>
            <span className="text-sm font-medium text-muted-soft">/ {summary.totalMentees}</span>
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-muted sm:mt-3 sm:text-[12px]">
            {activeFilter === 'placement' ? 'Active shortlist filter' : 'Resume, GitHub, LinkedIn & Coding profiles complete'}
          </div>
        </Card>

        {/* Card 3: 5+ Certifications Completed */}
        <Card
          as="button"
          type="button"
          interactive
          onClick={() => setActiveFilter(activeFilter === 'certifications' ? 'all' : 'certifications')}
          className={cx(
            'flex flex-col justify-between p-4 sm:p-6 text-left transition-all',
            activeFilter === 'certifications'
              ? 'ring-2 ring-brand-500 border-brand-500 bg-brand-50/20 dark:bg-brand-950/20'
              : ''
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-[12px] font-medium text-muted sm:text-[12.5px]">
              ≥ 5 Certifications Completed
            </span>
            <Badge tone={activeFilter === 'certifications' ? 'brand' : 'slate'} size="sm">
              {certPct}%
            </Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-1 sm:mt-4">
            <span className="tnum font-display text-[28px] font-medium leading-none tracking-[-0.02em] text-ink sm:text-[34px]">
              {summary.certified5PlusCount}
            </span>
            <span className="text-sm font-medium text-muted-soft">/ {summary.totalMentees}</span>
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-muted sm:mt-3 sm:text-[12px]">
            {activeFilter === 'certifications' ? 'Active shortlist filter' : 'Completed 5+ recognized technical certifications'}
          </div>
        </Card>

        {/* Card 4: > 8 CGPA */}
        <Card
          as="button"
          type="button"
          interactive
          onClick={() => setActiveFilter(activeFilter === 'cgpa' ? 'all' : 'cgpa')}
          className={cx(
            'flex flex-col justify-between p-4 sm:p-6 text-left transition-all',
            activeFilter === 'cgpa'
              ? 'ring-2 ring-brand-500 border-brand-500 bg-brand-50/20 dark:bg-brand-950/20'
              : ''
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-[12px] font-medium text-muted sm:text-[12.5px]">
              CGPA &gt; 8.0 Distinction
            </span>
            <Badge tone={activeFilter === 'cgpa' ? 'brand' : 'slate'} size="sm">
              {cgpaPct}%
            </Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-1 sm:mt-4">
            <span className="tnum font-display text-[28px] font-medium leading-none tracking-[-0.02em] text-ink sm:text-[34px]">
              {summary.cgpaAbove8Count}
            </span>
            <span className="text-sm font-medium text-muted-soft">/ {summary.totalMentees}</span>
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-muted sm:mt-3 sm:text-[12px]">
            {activeFilter === 'cgpa' ? 'Active shortlist filter' : 'Consistent academic distinction performance'}
          </div>
        </Card>
      </div>

      {/* SHORTLISTED ROSTER TABLE */}
      <SectionTable
        title={filterTitles[activeFilter]}
        subtitle={filterSubtitles[activeFilter]}
        action={
          <div className="flex items-center gap-2">
            {activeFilter !== 'all' && (
              <Button size="xs" variant="ghost" onClick={() => setActiveFilter('all')}>
                Show all mentees
              </Button>
            )}
            <input
              type="text"
              placeholder="Filter by name or roll number…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-56 rounded-lg border border-border bg-card px-2.5 text-xs placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        }
      >
        <DataTable
          rows={shortlistedMentees}
          rowKey={(m) => m.id}
          onRowClick={(m) => onOpenMentee(m.id, 'growth')}
          empty={
            <EmptyState
              title="No students match this criteria"
              description="Try clearing search or picking another metric above."
              action={
                <Button size="sm" variant="secondary" onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}>
                  View All Mentees
                </Button>
              }
            />
          }
          columns={[
            {
              key: 'student',
              header: 'Student',
              render: (m, i) => {
                const initials = m.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <div className="flex items-center gap-3">
                    <Avatar initials={initials} seed={i} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{m.name}</p>
                      <p className="tnum truncate text-[11.5px] text-muted">
                        {m.rollNumber} · Year {m.year} ({m.section})
                      </p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'cgpa',
              header: 'CGPA',
              align: 'right',
              render: (m) => (
                <div className="flex items-center justify-end gap-1.5">
                  <span className="tnum font-medium text-ink">{m.cgpa.toFixed(1)}</span>
                  {m.isHighCgpa && (
                    <Badge tone="green" size="sm">
                      &gt; 8.0
                    </Badge>
                  )}
                </div>
              ),
            },
            {
              key: 'hackathons',
              header: 'Hackathons',
              render: (m) => {
                if (!m.hasAttendedHackathon) {
                  return <span className="text-[12px] text-muted">—</span>;
                }
                return (
                  <div>
                    <Badge tone="indigo" size="sm">
                      {m.hackathons.length} {m.hackathons.length === 1 ? 'Hackathon' : 'Hackathons'}
                    </Badge>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted max-w-[200px]" title={m.hackathons[0]?.activity}>
                      {m.hackathons[0]?.activity}
                    </p>
                  </div>
                );
              },
            },
            {
              key: 'placement',
              header: 'Placement Readiness',
              render: (m) => {
                const { isComplete, missingItems, hasResume, hasGithub, hasLinkedin, hasCoding } = m.placementProfile;
                const completedCount = [hasResume, hasGithub, hasLinkedin, hasCoding].filter(Boolean).length;

                if (isComplete) {
                  return (
                    <div>
                      <Badge tone="green" size="sm">
                        Complete
                      </Badge>
                      <p className="mt-0.5 text-[11.5px] text-muted">All 4 profiles verified</p>
                    </div>
                  );
                }

                return (
                  <div>
                    <Badge tone="amber" size="sm">
                      {completedCount} of 4 Complete
                    </Badge>
                    <p className="mt-0.5 text-[11.5px] text-rose-600 dark:text-rose-400">
                      Pending: {missingItems.join(', ')}
                    </p>
                  </div>
                );
              },
            },
            {
              key: 'certifications',
              header: 'Certificates',
              render: (m) => {
                if (!m.certificationsCount) {
                  return <span className="text-[12px] text-muted">—</span>;
                }
                return (
                  <div>
                    <Badge tone={m.has5PlusCertifications ? 'green' : 'slate'} size="sm">
                      {m.certificationsCount} {m.certificationsCount === 1 ? 'Course' : 'Courses'}
                    </Badge>
                    {m.certifications[0] && (
                      <p className="mt-0.5 truncate text-[11.5px] text-muted max-w-[170px]" title={m.certifications[0]?.certification}>
                        {m.certifications[0]?.certification}
                      </p>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'projects',
              header: 'Projects',
              render: (m) => {
                if (!m.projectsCount) {
                  return <span className="text-[12px] text-muted">No projects</span>;
                }
                return (
                  <div>
                    <span className="font-medium text-ink text-xs">
                      {m.projectsCount} Project{m.projectsCount > 1 ? 's' : ''}
                    </span>
                    {m.projects[0] && (
                      <p className="mt-0.5 truncate text-[11.5px] text-muted max-w-[160px]" title={m.projects[0]?.title}>
                        {m.projects[0]?.title}
                      </p>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (m) => (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMentee(m.id, 'growth');
                  }}
                >
                  Open record
                </Button>
              ),
            },
          ]}
        />
      </SectionTable>

      {/* BOTTOM SECTION: Students Needing Attention */}
      <SectionTable
        title="Students Needing Attention"
        subtitle="Mentees requiring mentor intervention for missing placement profiles, zero hackathons, or overdue meetings"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Tabs size="sm" items={ATTENTION_TABS} value={attentionFilter} onChange={setAttentionFilter} />
          </div>
        }
      >
        <DataTable
          rows={attentionMentees}
          rowKey={(m) => m.id}
          onRowClick={(m) => onOpenMentee(m.id, 'growth')}
          empty={
            <EmptyState
              title="No students flagged in this category"
              description="All mentees meet the required criteria."
              icon="✓"
            />
          }
          columns={[
            {
              key: 'student',
              header: 'Student',
              render: (m, i) => {
                const initials = m.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <div className="flex items-center gap-3">
                    <Avatar initials={initials} seed={i} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{m.name}</p>
                      <p className="tnum truncate text-[11.5px] text-muted">
                        {m.rollNumber} · Year {m.year} ({m.section})
                      </p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'flags',
              header: 'Intervention Required',
              render: (m) => (
                <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                  {m.attentionFlags.map((flag, idx) => (
                    <Badge key={idx} tone={flag.tone} size="sm">
                      {flag.label}
                    </Badge>
                  ))}
                </div>
              ),
            },
            {
              key: 'standing',
              header: 'Academic Standing',
              render: (m) => (
                <div className="text-xs">
                  <span className="font-medium text-ink">CGPA {m.cgpa.toFixed(1)}</span>
                  <span className="text-muted ml-2">· {m.attendance}% Attendance</span>
                </div>
              ),
            },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (m) => (
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMentee(m.id, 'growth');
                    }}
                  >
                    Open record
                  </Button>
                  {onNavigateToMessages && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToMessages(m.id);
                      }}
                    >
                      Message
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </SectionTable>
    </div>
  );
}
