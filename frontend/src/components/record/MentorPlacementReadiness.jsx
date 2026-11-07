import { useMemo } from 'react';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { cx } from '../../lib/tone.js';
import { fileSizeLabel } from '../../lib/fileUpload.js';

const PLATFORM_THEMES = {
  leetcode: {
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-700',
    badge: 'amber',
    icon: '⚡',
  },
  codechef: {
    bg: 'bg-orange-500/10 hover:bg-orange-500/20',
    border: 'border-orange-500/30',
    text: 'text-orange-700',
    badge: 'amber',
    icon: '👨‍🍳',
  },
  hackerrank: {
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-700',
    badge: 'green',
    icon: '💻',
  },
  codeforces: {
    bg: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    border: 'border-indigo-500/30',
    text: 'text-indigo-700',
    badge: 'indigo',
    icon: '🏆',
  },
  geeksforgeeks: {
    bg: 'bg-green-500/10 hover:bg-green-500/20',
    border: 'border-green-500/30',
    text: 'text-green-700',
    badge: 'green',
    icon: '🟢',
  },
};

function getPlatformTheme(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, theme] of Object.entries(PLATFORM_THEMES)) {
    if (key.includes(k)) return theme;
  }
  return {
    bg: 'bg-brand-500/10 hover:bg-brand-500/20',
    border: 'border-brand-500/30',
    text: 'text-brand-700',
    badge: 'brand',
    icon: '🔗',
  };
}

export function MentorPlacementReadiness({ mentee, menteeId }) {
  // Resolve placement data from backend API or local storage
  const placement = useMemo(() => {
    if (
      mentee?.placementProfile &&
      (mentee.placementProfile.resume ||
        mentee.placementProfile.linkedinUrl ||
        mentee.placementProfile.githubUrl ||
        mentee.placementProfile.codingPlatforms?.length)
    ) {
      return mentee.placementProfile;
    }

    const rollNumber = mentee?.identity?.rollNumber || mentee?.rollNumber;
    const email = mentee?.identity?.email || mentee?.email;

    const keysToTry = [
      `mmrms_placement_readiness_${menteeId}`,
      rollNumber && `mmrms_placement_readiness_${rollNumber}`,
      email && `mmrms_placement_readiness_${email}`,
      'mmrms_placement_readiness_24BCS001',
      'mmrms_placement_readiness_student',
      'mmrms_placement_readiness_default',
    ].filter(Boolean);

    for (const key of keysToTry) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            (parsed.resume ||
              parsed.linkedinUrl ||
              parsed.githubUrl ||
              (Array.isArray(parsed.codingPlatforms) && parsed.codingPlatforms.length > 0))
          ) {
            return parsed;
          }
        }
      } catch (err) {
        console.error('Error reading placement from localStorage:', err);
      }
    }

    return {
      resume: null,
      linkedinUrl: '',
      githubUrl: '',
      codingPlatforms: [],
    };
  }, [mentee, menteeId]);

  const isResumeDone = Boolean(placement.resume?.name);
  const isLinkedInDone = Boolean(placement.linkedinUrl?.trim());
  const isGithubDone = Boolean(placement.githubUrl?.trim());
  const isCodingDone = Boolean(
    Array.isArray(placement.codingPlatforms) && placement.codingPlatforms.length > 0
  );

  const completedCount =
    (isResumeDone ? 1 : 0) +
    (isLinkedInDone ? 1 : 0) +
    (isGithubDone ? 1 : 0) +
    (isCodingDone ? 1 : 0);

  const progressPercent = Math.round((completedCount / 4) * 100);
  const studentName = mentee?.identity?.name || mentee?.name || 'Mentee';
  const rollNumber = mentee?.identity?.rollNumber || mentee?.rollNumber || '';

  function handleOpenResume() {
    if (!placement.resume?.dataUrl) return;
    try {
      const parts = placement.resume.dataUrl.split(',');
      const byteCharacters = atob(parts[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: placement.resume.type || 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      window.open(placement.resume.dataUrl, '_blank');
    }
  }

  function handleDownloadResume() {
    if (!placement.resume?.dataUrl) return;
    const a = document.createElement('a');
    a.href = placement.resume.dataUrl;
    a.download = placement.resume.name || 'resume.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-5 animate-fadeRise">
      {/* ── 1. Mentor Oversight Executive Banner (Unique Mentor UI) ───── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#11131F] via-[#1A1D2E] to-[#201F38] p-5 sm:p-6 text-white shadow-xl border border-white/10">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-300 border border-brand-500/30">
                Mentor Oversight · Section 8
              </span>
              {completedCount === 4 ? (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                  ✓ Placement Ready
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                  {4 - completedCount} Incomplete
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Placement Readiness Verification
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Audit {studentName}&apos;s ({rollNumber || 'Mentee'}) placement prerequisites and profile proofs. Click any item name to inspect.
            </p>
          </div>

          {/* Readiness Score Metric */}
          <div className="flex items-center gap-3 rounded-xl bg-white/5 backdrop-blur-md px-4 py-3 border border-white/10">
            <div className="text-right">
              <div className="text-2xl font-extrabold tracking-tight tnum text-white">
                {completedCount} <span className="text-sm font-normal text-slate-400">/ 4</span>
              </div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Readiness Score
              </div>
            </div>
            <div className="h-10 w-[2px] bg-white/15" />
            <div className="text-center font-bold text-lg tnum text-brand-300">
              {progressPercent}%
            </div>
          </div>
        </div>

        {/* 4-Step Verification Stepper */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {
                name: 'Resume',
                done: isResumeDone,
                action: handleOpenResume,
                label: isResumeDone ? placement.resume.name : 'Missing',
              },
              {
                name: 'LinkedIn Profile',
                done: isLinkedInDone,
                href: placement.linkedinUrl,
                label: isLinkedInDone ? 'Linked' : 'Missing',
              },
              {
                name: 'Github Profile',
                done: isGithubDone,
                href: placement.githubUrl,
                label: isGithubDone ? 'Linked' : 'Missing',
              },
              {
                name: 'Coding Platform',
                done: isCodingDone,
                label: isCodingDone
                  ? `${placement.codingPlatforms.length} Profiles`
                  : 'Missing',
              },
            ].map((step, idx) => (
              <div
                key={step.name}
                className={cx(
                  'flex items-center gap-2 rounded-xl p-2.5 text-xs transition-colors',
                  step.done
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                    : 'bg-white/5 border border-white/10 text-slate-400'
                )}
              >
                <span
                  className={cx(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    step.done
                      ? 'bg-emerald-500 text-white'
                      : 'border border-slate-500 text-slate-400'
                  )}
                >
                  {step.done ? '✓' : idx + 1}
                </span>
                <div className="min-w-0 flex-1 truncate">
                  <div className="font-semibold truncate text-[11.5px] text-white">
                    {step.name}
                  </div>
                  <div className="text-[10px] truncate opacity-80">{step.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Bento Grid Oversight Cards (Distinct 2x2 + Full Width Layout) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* ── Card 1: Resume Verification Card ── */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card transition-all hover:shadow-card-hover flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 text-base shadow-xs">
                📄
              </span>
              <Badge tone={isResumeDone ? 'green' : 'slate'} size="sm">
                {isResumeDone ? 'Verified Upload' : 'Awaiting Upload'}
              </Badge>
            </div>

            {/* Clickable Name to Open */}
            <div className="mb-2">
              {isResumeDone ? (
                <button
                  type="button"
                  onClick={handleOpenResume}
                  className="group inline-flex items-center gap-1.5 text-base font-bold text-ink hover:text-brand-600 transition-colors focus:outline-none text-left"
                  title="Click to open Resume"
                >
                  <span>Resume</span>
                  <span className="text-brand-500 text-sm transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    ↗
                  </span>
                </button>
              ) : (
                <h3 className="text-base font-bold text-ink">Resume</h3>
              )}
              <p className="text-xs text-muted mt-0.5">
                ATS-compatible resume document uploaded by mentee.
              </p>
            </div>

            {isResumeDone ? (
              <div className="mt-3 rounded-xl bg-canvas p-3 border border-line">
                <button
                  type="button"
                  onClick={handleOpenResume}
                  className="w-full text-left font-medium text-xs text-brand-600 hover:underline truncate block"
                  title={placement.resume.name}
                >
                  {placement.resume.name} ↗
                </button>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>{fileSizeLabel(placement.resume.size)}</span>
                  <span>
                    {placement.resume.uploadedAt &&
                      new Date(placement.resume.uploadedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-line-strong p-4 text-center">
                <p className="text-xs text-muted-soft italic">No resume uploaded yet.</p>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-line flex items-center gap-2">
            {isResumeDone ? (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  onClick={handleOpenResume}
                >
                  Open Resume ↗
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDownloadResume}
                  title="Download file"
                >
                  Download
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" className="w-full opacity-60" disabled>
                Resume Not Available
              </Button>
            )}
          </div>
        </div>

        {/* ── Card 2: LinkedIn Profile Card ── */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card transition-all hover:shadow-card-hover flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0077b5]/10 text-[#0077b5] font-bold text-sm shadow-xs">
                in
              </span>
              <Badge tone={isLinkedInDone ? 'green' : 'slate'} size="sm">
                {isLinkedInDone ? 'Profile Verified' : 'Not Provided'}
              </Badge>
            </div>

            {/* Clickable Name to Open */}
            <div className="mb-2">
              {isLinkedInDone ? (
                <a
                  href={placement.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-base font-bold text-ink hover:text-[#0077b5] transition-colors focus:outline-none"
                  title="Click to open LinkedIn Profile"
                >
                  <span>LinkedIn Profile</span>
                  <span className="text-[#0077b5] text-sm transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    ↗
                  </span>
                </a>
              ) : (
                <h3 className="text-base font-bold text-ink">LinkedIn Profile</h3>
              )}
              <p className="text-xs text-muted mt-0.5">
                Mentee&apos;s public professional identity and recommendations.
              </p>
            </div>

            {isLinkedInDone ? (
              <div className="mt-3 rounded-xl bg-canvas p-3 border border-line">
                <a
                  href={placement.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-[#0077b5] hover:underline truncate block"
                >
                  {placement.linkedinUrl} ↗
                </a>
                <span className="mt-1 block text-[11px] text-muted">
                  Professional public URL
                </span>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-line-strong p-4 text-center">
                <p className="text-xs text-muted-soft italic">No LinkedIn profile link provided.</p>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-line">
            {isLinkedInDone ? (
              <a
                href={placement.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-[#0077b5] text-white shadow-sm hover:bg-[#006097] transition-colors"
              >
                Open LinkedIn ↗
              </a>
            ) : (
              <Button size="sm" variant="secondary" className="w-full opacity-60" disabled>
                Link Not Available
              </Button>
            )}
          </div>
        </div>

        {/* ── Card 3: GitHub Developer Card ── */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card transition-all hover:shadow-card-hover flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white font-bold text-sm shadow-xs">
                gh
              </span>
              <Badge tone={isGithubDone ? 'green' : 'slate'} size="sm">
                {isGithubDone ? 'Repository Verified' : 'Not Provided'}
              </Badge>
            </div>

            {/* Clickable Name to Open */}
            <div className="mb-2">
              {isGithubDone ? (
                <a
                  href={placement.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-base font-bold text-ink hover:text-brand-600 transition-colors focus:outline-none"
                  title="Click to open Github Profile"
                >
                  <span>Github Profile</span>
                  <span className="text-brand-500 text-sm transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    ↗
                  </span>
                </a>
              ) : (
                <h3 className="text-base font-bold text-ink">Github Profile</h3>
              )}
              <p className="text-xs text-muted mt-0.5">
                Open-source repositories, commit history, and code samples.
              </p>
            </div>

            {isGithubDone ? (
              <div className="mt-3 rounded-xl bg-canvas p-3 border border-line">
                <a
                  href={placement.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-neutral-900 hover:underline truncate block"
                >
                  {placement.githubUrl} ↗
                </a>
                <span className="mt-1 block text-[11px] text-muted">
                  Developer account URL
                </span>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-line-strong p-4 text-center">
                <p className="text-xs text-muted-soft italic">No GitHub profile link provided.</p>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-line">
            {isGithubDone ? (
              <a
                href={placement.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 transition-colors"
              >
                Open GitHub ↗
              </a>
            ) : (
              <Button size="sm" variant="secondary" className="w-full opacity-60" disabled>
                Link Not Available
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Coding Platforms Showcase Card (Full Width Showcase) ──── */}
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 text-lg shadow-xs">
              💻
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink">Coding Platforms</h3>
                <Badge tone={isCodingDone ? 'green' : 'slate'} size="sm">
                  {isCodingDone
                    ? `${placement.codingPlatforms.length} Platform${
                        placement.codingPlatforms.length === 1 ? '' : 's'
                      } Active`
                    : 'None Added'}
                </Badge>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Competitive programming handles. Click any platform name below to open and review problems solved.
              </p>
            </div>
          </div>

          <div className="text-xs font-semibold text-muted">
            {isCodingDone ? 'Click platform badge or name to launch' : 'Awaiting entries'}
          </div>
        </div>

        <div className="mt-5">
          {isCodingDone ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {placement.codingPlatforms.map((item) => {
                const theme = getPlatformTheme(item.platform);
                return (
                  <div
                    key={item.id || item.url}
                    className={cx(
                      'group relative rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md bg-canvas/40',
                      theme.border
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {/* Clickable Platform Name to Open */}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link inline-flex items-center gap-1.5 focus:outline-none"
                        title={`Click to open ${item.platform}`}
                      >
                        <span className="text-sm font-bold text-ink group-hover/link:text-brand-600 transition-colors">
                          {theme.icon} {item.platform}
                        </span>
                        <span className="text-xs text-brand-500 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5">
                          ↗
                        </span>
                      </a>

                      <Badge tone={theme.badge} size="sm">
                        Verified
                      </Badge>
                    </div>

                    <p className="text-[11.5px] text-muted truncate mt-1">
                      {item.url}
                    </p>

                    <div className="mt-3.5 pt-2.5 border-t border-line/60 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-soft">
                        Competitive Profile
                      </span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-violet hover:underline"
                      >
                        Launch Profile ↗
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong p-8 text-center bg-canvas/30">
              <span className="text-2xl mb-1 block">⌨️</span>
              <p className="text-sm font-semibold text-ink">No coding platforms linked yet</p>
              <p className="text-xs text-muted-soft mt-1">
                The mentee has not added LeetCode, CodeChef, HackerRank, or other platform profiles yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
