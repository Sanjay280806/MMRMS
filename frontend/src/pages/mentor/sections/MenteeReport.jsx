import { useState, useMemo } from 'react';
import { useResource } from '../../../hooks/useResource.js';
import { Card, CardBody } from '../../../components/ui/Card.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { cx } from '../../../lib/tone.js';

export function MenteeReport({ onOpenMentee, onNavigateToMessages }) {
  const { data, loading, error, reload } = useResource('/mentor/me/mentee-analytics');

  // Shortlisting state for top analytics cards: 'all' | 'hackathons' | 'placement' | 'certifications' | 'cgpa'
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Attention needed filter: 'all' | 'no-hackathons' | 'incomplete-placement' | 'inactive-meetings' | 'no-projects'
  const [attentionFilter, setAttentionFilter] = useState('all');
  const [attentionSearch, setAttentionSearch] = useState('');

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

    if (attentionSearch.trim()) {
      const q = attentionSearch.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.rollNumber.toLowerCase().includes(q)
      );
    }

    return list;
  }, [mentees, attentionFilter, attentionSearch]);

  if (error) {
    return (
      <Card>
        <CardBody className="p-8">
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
        </CardBody>
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const filterLabels = {
    all: 'All Mentees',
    hackathons: 'Hackathon Attendees',
    placement: 'Placement Profile Complete',
    certifications: '5+ Certifications Completed',
    cgpa: 'CGPA > 8.0 (Distinction)',
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Mentee Analytical Report
            </h1>
            <Badge tone="indigo">{summary.totalMentees} Assigned Mentees</Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            Cohort health analysis, skill achievements, and shortlisting metrics. Click any card below to filter the roster.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFilter !== 'all' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setActiveFilter('all')}
              className="text-xs"
            >
              ✕ Clear Shortlist Filter
            </Button>
          )}
        </div>
      </div>

      {/* TOP SECTION: 4 Key Analytical Metric Cards (Clickable for Shortlisting) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Key Achievement Metrics & Shortlisting
          </h2>
          <span className="text-xs text-muted">Click a card to filter students below</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Hackathon Attendees */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'hackathons' ? 'all' : 'hackathons')}
            className={cx(
              'group relative flex flex-col text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer',
              'hover:shadow-md hover:-translate-y-0.5',
              activeFilter === 'hackathons'
                ? 'bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/20 border-indigo-500 shadow-md ring-2 ring-indigo-500/30'
                : 'bg-card border-border/70 hover:border-indigo-300 dark:hover:border-indigo-800'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xl font-bold">
                🚀
              </span>
              <Badge tone={activeFilter === 'hackathons' ? 'indigo' : 'slate'} size="sm">
                {Math.round((summary.hackathonAttendeesCount / (summary.totalMentees || 1)) * 100)}%
              </Badge>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {summary.hackathonAttendeesCount}
                <span className="text-xs font-normal text-muted ml-1.5">/ {summary.totalMentees}</span>
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Attended Hackathons
              </div>
              <p className="text-[11.5px] text-muted mt-1 leading-snug">
                Participated in departmental, national, or collegiate hackathons
              </p>
            </div>
            {activeFilter === 'hackathons' && (
              <span className="mt-3 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                ✓ Currently Shortlisting
              </span>
            )}
          </button>

          {/* Card 2: Placement Profile Complete */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'placement' ? 'all' : 'placement')}
            className={cx(
              'group relative flex flex-col text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer',
              'hover:shadow-md hover:-translate-y-0.5',
              activeFilter === 'placement'
                ? 'bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                : 'bg-card border-border/70 hover:border-emerald-300 dark:hover:border-emerald-800'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xl font-bold">
                💼
              </span>
              <Badge tone={activeFilter === 'placement' ? 'green' : 'slate'} size="sm">
                {Math.round((summary.placementCompleteCount / (summary.totalMentees || 1)) * 100)}%
              </Badge>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {summary.placementCompleteCount}
                <span className="text-xs font-normal text-muted ml-1.5">/ {summary.totalMentees}</span>
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Placement Profile Complete
              </div>
              <p className="text-[11.5px] text-muted mt-1 leading-snug">
                Completed Resume, GitHub, LinkedIn & Coding profiles
              </p>
            </div>
            {activeFilter === 'placement' && (
              <span className="mt-3 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                ✓ Currently Shortlisting
              </span>
            )}
          </button>

          {/* Card 3: 5+ Certifications Completed */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'certifications' ? 'all' : 'certifications')}
            className={cx(
              'group relative flex flex-col text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer',
              'hover:shadow-md hover:-translate-y-0.5',
              activeFilter === 'certifications'
                ? 'bg-gradient-to-br from-blue-50/80 to-cyan-50/50 dark:from-blue-950/40 dark:to-cyan-950/20 border-blue-500 shadow-md ring-2 ring-blue-500/30'
                : 'bg-card border-border/70 hover:border-blue-300 dark:hover:border-blue-800'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xl font-bold">
                📜
              </span>
              <Badge tone={activeFilter === 'certifications' ? 'blue' : 'slate'} size="sm">
                {Math.round((summary.certified5PlusCount / (summary.totalMentees || 1)) * 100)}%
              </Badge>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {summary.certified5PlusCount}
                <span className="text-xs font-normal text-muted ml-1.5">/ {summary.totalMentees}</span>
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                ≥ 5 Certifications Completed
              </div>
              <p className="text-[11.5px] text-muted mt-1 leading-snug">
                Completed 5+ courses (NPTEL, Coursera, AWS, Cisco)
              </p>
            </div>
            {activeFilter === 'certifications' && (
              <span className="mt-3 text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                ✓ Currently Shortlisting
              </span>
            )}
          </button>

          {/* Card 4: > 8 CGPA */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'cgpa' ? 'all' : 'cgpa')}
            className={cx(
              'group relative flex flex-col text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer',
              'hover:shadow-md hover:-translate-y-0.5',
              activeFilter === 'cgpa'
                ? 'bg-gradient-to-br from-amber-50/80 to-yellow-50/50 dark:from-amber-950/40 dark:to-yellow-950/20 border-amber-500 shadow-md ring-2 ring-amber-500/30'
                : 'bg-card border-border/70 hover:border-amber-300 dark:hover:border-amber-800'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xl font-bold">
                🌟
              </span>
              <Badge tone={activeFilter === 'cgpa' ? 'amber' : 'slate'} size="sm">
                {Math.round((summary.cgpaAbove8Count / (summary.totalMentees || 1)) * 100)}%
              </Badge>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {summary.cgpaAbove8Count}
                <span className="text-xs font-normal text-muted ml-1.5">/ {summary.totalMentees}</span>
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                CGPA &gt; 8.0 Distinction
              </div>
              <p className="text-[11.5px] text-muted mt-1 leading-snug">
                Consistently high academic performance across semesters
              </p>
            </div>
            {activeFilter === 'cgpa' && (
              <span className="mt-3 text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                ✓ Currently Shortlisting
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SHORTLISTED ROSTER TABLE */}
      <Card className="overflow-hidden border border-border/70 shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground">
                {filterLabels[activeFilter]}
              </h3>
              <Badge tone={activeFilter === 'all' ? 'slate' : 'indigo'}>
                {shortlistedMentees.length} {shortlistedMentees.length === 1 ? 'Student' : 'Students'}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {activeFilter === 'all'
                ? 'Displaying all assigned mentees. Click an achievement card above to shortlist.'
                : `Filtered by ${filterLabels[activeFilter].toLowerCase()}. Click any student to open full record book.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search shortlisted students…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-60 rounded-lg border border-border bg-background px-3 text-xs placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-xs text-muted hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {shortlistedMentees.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No students match this shortlist filter"
                description="Try selecting a different filter or clearing search."
                action={
                  <Button size="sm" variant="secondary" onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}>
                    Show All Students
                  </Button>
                }
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/40 font-semibold text-muted uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">CGPA</th>
                  <th className="px-4 py-3">Hackathons</th>
                  <th className="px-4 py-3">Placement Readiness (4 Items)</th>
                  <th className="px-4 py-3">Certificates</th>
                  <th className="px-4 py-3">Projects</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {shortlistedMentees.map((m, i) => {
                  const initials = m.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  const { hasResume, hasGithub, hasLinkedin, hasCoding, isComplete } = m.placementProfile;

                  return (
                    <tr
                      key={m.id}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onOpenMentee(m.id, 'growth')}
                    >
                      {/* Student Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} seed={i} size="sm" />
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground group-hover:text-brand-600 transition-colors">
                              {m.name}
                            </div>
                            <div className="text-[11px] text-muted">
                              {m.rollNumber} · Year {m.year} ({m.section})
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CGPA */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground">{m.cgpa.toFixed(1)}</span>
                          {m.isHighCgpa && (
                            <Badge tone="green" size="sm">
                              &gt; 8.0
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Hackathons */}
                      <td className="px-4 py-3">
                        {m.hasAttendedHackathon ? (
                          <div className="space-y-1">
                            <Badge tone="indigo" size="sm">
                              🚀 {m.hackathons.length} {m.hackathons.length === 1 ? 'Hackathon' : 'Hackathons'}
                            </Badge>
                            <div className="text-[11px] text-muted truncate max-w-xs" title={m.hackathons.map((h) => h.activity).join(', ')}>
                              {m.hackathons[0]?.activity}
                              {m.hackathons.length > 1 && ` +${m.hackathons.length - 1} more`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted text-[11px]">No hackathons</span>
                        )}
                      </td>

                      {/* Placement Readiness */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <Badge tone={isComplete ? 'green' : 'amber'} size="sm">
                              {isComplete ? '✓ Profile Complete' : `${[hasResume, hasGithub, hasLinkedin, hasCoding].filter(Boolean).length}/4 Complete`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10.5px]">
                            <span
                              title="Resume"
                              className={cx(
                                'px-1.5 py-0.5 rounded font-mono',
                                hasResume ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'
                              )}
                            >
                              {hasResume ? '✓ Resume' : '✕ Resume'}
                            </span>
                            <span
                              title="GitHub Profile"
                              className={cx(
                                'px-1.5 py-0.5 rounded font-mono',
                                hasGithub ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'
                              )}
                            >
                              {hasGithub ? '✓ GitHub' : '✕ GitHub'}
                            </span>
                            <span
                              title="LinkedIn Profile"
                              className={cx(
                                'px-1.5 py-0.5 rounded font-mono',
                                hasLinkedin ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'
                              )}
                            >
                              {hasLinkedin ? '✓ LinkedIn' : '✕ LinkedIn'}
                            </span>
                            <span
                              title="Coding Profile"
                              className={cx(
                                'px-1.5 py-0.5 rounded font-mono',
                                hasCoding ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'
                              )}
                            >
                              {hasCoding ? '✓ Coding' : '✕ Coding'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Certifications */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <Badge tone={m.has5PlusCertifications ? 'blue' : 'slate'} size="sm">
                            📜 {m.certificationsCount} Courses
                          </Badge>
                          {m.certifications.length > 0 && (
                            <div className="text-[11px] text-muted truncate max-w-[180px]" title={m.certifications.map((c) => c.certification).join(', ')}>
                              {m.certifications[0]?.certification}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Projects */}
                      <td className="px-4 py-3">
                        {m.projectsCount > 0 ? (
                          <div className="space-y-0.5">
                            <span className="font-medium text-foreground">{m.projectsCount} Project{m.projectsCount > 1 ? 's' : ''}</span>
                            <div className="text-[11px] text-muted truncate max-w-[160px]" title={m.projects[0]?.title}>
                              {m.projects[0]?.title}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">No projects yet</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMentee(m.id, 'profile');
                          }}
                        >
                          Open Book →
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* BOTTOM SECTION: Attention Needed Students */}
      <div className="pt-4 border-t border-border/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>⚠️ Attention Needed Students</span>
              </h2>
              <Badge tone="rose">{summary.attentionNeededCount} Flagged</Badge>
            </div>
            <p className="text-xs text-muted mt-1">
              Students identified with missing placement profiles, zero hackathons, incomplete projects, or low meeting attendance.
            </p>
          </div>

          {/* Attention Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'All Attention', count: summary.attentionNeededCount },
              { key: 'incomplete-placement', label: 'Incomplete Placement', count: summary.incompletePlacementCount },
              { key: 'no-hackathons', label: 'No Hackathons', count: summary.noHackathonsCount },
              { key: 'inactive-meetings', label: 'Inactive Meetings', count: summary.inactiveMeetingsCount },
              { key: 'no-projects', label: 'No Projects', count: summary.noProjectsCount },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAttentionFilter(tab.key)}
                className={cx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5',
                  attentionFilter === tab.key
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold ring-1 ring-rose-500/30'
                    : 'bg-muted/40 text-muted hover:bg-muted/80 hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/80 font-mono">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Attention Students Grid / List */}
        {attentionMentees.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm font-medium text-foreground">No students in this attention category</p>
            <p className="text-xs text-muted mt-1">All students currently meet the required criteria.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {attentionMentees.map((m, i) => {
              const initials = m.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <Card
                  key={m.id}
                  className="border border-border/70 hover:border-rose-300 dark:hover:border-rose-900 transition-all hover:shadow-sm"
                >
                  <CardBody className="p-4 space-y-3">
                    {/* Header: Student Name + Roll Number */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={initials} seed={i} size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-foreground truncate max-w-[160px]">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-muted">
                            {m.rollNumber} · CGPA {m.cgpa.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      <Badge tone={m.attendance < 75 ? 'rose' : 'slate'} size="sm">
                        {m.attendance}% Attn
                      </Badge>
                    </div>

                    {/* Attention Tags */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        Intervention Needed:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.attentionFlags.map((flag, idx) => (
                          <Badge key={idx} tone={flag.tone} size="sm">
                            {flag.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Specific Missing Placement details if any */}
                    {!m.placementProfile.isComplete && (
                      <div className="rounded-md bg-rose-50/60 dark:bg-rose-950/20 p-2 text-[11px] text-rose-700 dark:text-rose-300">
                        <span className="font-medium">Missing Placement Profile:</span>{' '}
                        {m.placementProfile.missingItems.join(', ')}
                      </div>
                    )}

                    {/* Quick Action Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                      <button
                        type="button"
                        onClick={() => onOpenMentee(m.id, 'growth')}
                        className="text-brand-600 dark:text-brand-400 hover:underline font-medium text-[11.5px]"
                      >
                        Open Workbook →
                      </button>

                      {onNavigateToMessages && (
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => onNavigateToMessages(m.id)}
                          className="text-[11px]"
                        >
                          💬 Message
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
