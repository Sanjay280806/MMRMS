import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Card, CardBody } from '../ui/Card.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { cx } from '../../lib/tone.js';
import { fileSizeLabel } from '../../lib/fileUpload.js';

function formatUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const PRESET_PLATFORMS = [
  { name: 'LeetCode', placeholder: 'https://leetcode.com/u/username', tone: 'amber' },
  { name: 'CodeChef', placeholder: 'https://www.codechef.com/users/username', tone: 'amber' },
  { name: 'HackerRank', placeholder: 'https://www.hackerrank.com/profile/username', tone: 'green' },
  { name: 'Codeforces', placeholder: 'https://codeforces.com/profile/username', tone: 'indigo' },
  { name: 'GeeksforGeeks', placeholder: 'https://auth.geeksforgeeks.org/user/username', tone: 'green' },
  { name: 'Other', placeholder: 'https://platform.com/profile/username', tone: 'slate' },
];

function platformTone(platformName) {
  const match = PRESET_PLATFORMS.find(
    (p) => p.name.toLowerCase() === (platformName || '').toLowerCase()
  );
  return match ? match.tone : 'brand';
}

export function StudentPlacementReadiness({ studentId = 'default' }) {
  const storageKey = `mmrms_placement_readiness_${studentId}`;

  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          resume: parsed.resume ?? null,
          linkedinUrl: parsed.linkedinUrl ?? '',
          githubUrl: parsed.githubUrl ?? '',
          codingPlatforms: Array.isArray(parsed.codingPlatforms) ? parsed.codingPlatforms : [],
        };
      }
    } catch (e) {
      console.error('Failed to load placement readiness from localStorage:', e);
    }
    // Initially there should be nothing
    return {
      resume: null,
      linkedinUrl: '',
      githubUrl: '',
      codingPlatforms: [],
    };
  });

  // Local component states for input editing
  const [linkedinInput, setLinkedinInput] = useState('');
  const [isEditingLinkedIn, setIsEditingLinkedIn] = useState(false);

  const [githubInput, setGithubInput] = useState('');
  const [isEditingGithub, setIsEditingGithub] = useState(false);

  // Coding platform input states
  const [selectedPlatform, setSelectedPlatform] = useState('LeetCode');
  const [customPlatform, setCustomPlatform] = useState('');
  const [platformUrlInput, setPlatformUrlInput] = useState('');
  const [codingError, setCodingError] = useState('');

  const [resumeError, setResumeError] = useState('');
  const fileInputRef = useRef(null);

  // Hydrate from backend if local storage was empty
  useEffect(() => {
    const hasData =
      state.resume ||
      state.linkedinUrl ||
      state.githubUrl ||
      (state.codingPlatforms && state.codingPlatforms.length > 0);
    if (!hasData) {
      api('/student/me/placement-profile')
        .then((profile) => {
          if (
            profile &&
            (profile.resume ||
              profile.linkedinUrl ||
              profile.githubUrl ||
              (Array.isArray(profile.codingPlatforms) && profile.codingPlatforms.length > 0))
          ) {
            setState({
              resume: profile.resume ?? null,
              linkedinUrl: profile.linkedinUrl ?? '',
              githubUrl: profile.githubUrl ?? '',
              codingPlatforms: Array.isArray(profile.codingPlatforms)
                ? profile.codingPlatforms
                : [],
            });
          }
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage and sync to backend API
  useEffect(() => {
    try {
      const payload = JSON.stringify(state);
      localStorage.setItem(storageKey, payload);
      localStorage.setItem('mmrms_placement_readiness_default', payload);
      if (studentId) {
        localStorage.setItem(`mmrms_placement_readiness_${studentId}`, payload);
      }
    } catch (e) {
      console.error('Failed to save placement readiness to localStorage:', e);
    }

    // Sync to backend so mentor can access across sessions/devices
    api('/student/me/placement-profile', {
      method: 'PUT',
      body: state,
    }).catch(() => {
      // quiet fallback
    });
  }, [state, storageKey, studentId]);

  // Track completion of the 4 rows
  const isResumeDone = Boolean(state.resume?.name);
  const isLinkedInDone = Boolean(state.linkedinUrl?.trim());
  const isGithubDone = Boolean(state.githubUrl?.trim());
  const isCodingDone = Boolean(state.codingPlatforms && state.codingPlatforms.length > 0);

  const completedCount =
    (isResumeDone ? 1 : 0) +
    (isLinkedInDone ? 1 : 0) +
    (isGithubDone ? 1 : 0) +
    (isCodingDone ? 1 : 0);

  const totalTasks = 4;
  const progressPercent = Math.round((completedCount / totalTasks) * 100);

  // Resume handlers
  function handleResumeUpload(e) {
    const file = e.target.files?.[0];
    setResumeError('');
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setResumeError('File size exceeds the 5 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setState((prev) => ({
        ...prev,
        resume: {
          name: file.name,
          size: file.size,
          type: file.type || 'application/pdf',
          dataUrl: reader.result,
          uploadedAt: new Date().toISOString(),
        },
      }));
    };
    reader.onerror = () => {
      setResumeError('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleRemoveResume() {
    setState((prev) => ({ ...prev, resume: null }));
    setResumeError('');
  }

  function handleViewResume() {
    if (!state.resume?.dataUrl) return;
    try {
      const parts = state.resume.dataUrl.split(',');
      const byteCharacters = atob(parts[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: state.resume.type || 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      window.open(state.resume.dataUrl, '_blank');
    }
  }

  function handleDownloadResume() {
    if (!state.resume?.dataUrl) return;
    const a = document.createElement('a');
    a.href = state.resume.dataUrl;
    a.download = state.resume.name || 'resume.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // LinkedIn handlers
  function handleSaveLinkedIn(e) {
    e?.preventDefault();
    if (!linkedinInput.trim()) return;
    const formatted = formatUrl(linkedinInput);
    setState((prev) => ({ ...prev, linkedinUrl: formatted }));
    setIsEditingLinkedIn(false);
  }

  function handleRemoveLinkedIn() {
    setState((prev) => ({ ...prev, linkedinUrl: '' }));
    setLinkedinInput('');
    setIsEditingLinkedIn(false);
  }

  // GitHub handlers
  function handleSaveGithub(e) {
    e?.preventDefault();
    if (!githubInput.trim()) return;
    const formatted = formatUrl(githubInput);
    setState((prev) => ({ ...prev, githubUrl: formatted }));
    setIsEditingGithub(false);
  }

  function handleRemoveGithub() {
    setState((prev) => ({ ...prev, githubUrl: '' }));
    setGithubInput('');
    setIsEditingGithub(false);
  }

  // Coding platforms handlers (supports multiple links)
  function handleAddCodingPlatform(e) {
    e?.preventDefault();
    setCodingError('');

    const platformName = (selectedPlatform === 'Other' ? customPlatform : selectedPlatform).trim();
    if (!platformName) {
      setCodingError('Please specify the platform name.');
      return;
    }

    const url = platformUrlInput.trim();
    if (!url) {
      setCodingError('Please provide a profile link.');
      return;
    }

    const formattedUrl = formatUrl(url);

    const newEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      platform: platformName,
      url: formattedUrl,
      addedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      codingPlatforms: [...prev.codingPlatforms, newEntry],
    }));

    setPlatformUrlInput('');
    if (selectedPlatform === 'Other') {
      setCustomPlatform('');
    }
  }

  function handleRemoveCodingPlatform(id) {
    setState((prev) => ({
      ...prev,
      codingPlatforms: prev.codingPlatforms.filter((item) => item.id !== id),
    }));
  }

  const currentPreset = PRESET_PLATFORMS.find((p) => p.name === selectedPlatform);

  return (
    <Card className="overflow-hidden">
      {/* ── Card Header ─────────────────────────────────────────────── */}
      <header className="card-header bg-gradient-to-r from-canvas via-white to-canvas">
        <div>
          <h2 className="section-title text-[17px] font-bold text-ink">Placement Readiness</h2>
          <p className="mt-0.5 text-xs text-muted">
            Complete the 4 essential readiness requirements for campus placements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone={completedCount === 4 ? 'green' : completedCount > 0 ? 'brand' : 'slate'}>
            {completedCount} of 4 Complete
          </Badge>
          <span className="tnum text-xs font-semibold text-ink">{progressPercent}%</span>
        </div>
      </header>

      {/* ── Completion Bar Above Tasks ──────────────────────────────── */}
      <div className="border-b border-line bg-canvas/40 px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink">Readiness Completion</span>
          <span className="font-medium text-muted">
            {completedCount === 4
              ? 'All requirements satisfied'
              : `${4 - completedCount} requirement${4 - completedCount === 1 ? '' : 's'} remaining`}
          </span>
        </div>
        <div className="mt-2.5">
          <ProgressBar
            percent={progressPercent}
            tone={completedCount === 4 ? 'green' : completedCount > 0 ? 'indigo' : 'slate'}
            height="h-2.5"
          />
        </div>
        {completedCount === 4 && (
          <p className="mt-2 text-xs font-medium text-good-ink">
            ✓ Excellent! You have completed all 4 placement readiness tasks.
          </p>
        )}
      </div>

      <CardBody className="divide-y divide-line p-0">
        {/* ── Row 1: Resume ────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  isResumeDone
                    ? 'bg-good text-white'
                    : 'border-[1.5px] border-line-strong bg-canvas text-muted-strong'
                )}
              >
                {isResumeDone ? '✓' : '1'}
              </span>
              <div>
                {isResumeDone ? (
                  <button
                    type="button"
                    onClick={handleViewResume}
                    className="group flex items-center gap-1.5 text-left text-sm font-semibold text-brand-600 hover:text-brand-violet hover:underline focus:outline-none"
                    title="Click to open Resume"
                  >
                    <span>Resume</span>
                    <span className="text-xs transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      ↗
                    </span>
                  </button>
                ) : (
                  <h3 className="text-sm font-semibold text-ink">Resume</h3>
                )}
                <p className="text-xs text-muted">Upload your ATS-compliant resume (PDF, DOC, DOCX up to 5 MB)</p>
              </div>
            </div>

            <Badge tone={isResumeDone ? 'green' : 'slate'}>
              {isResumeDone ? 'Completed' : 'Not Uploaded'}
            </Badge>
          </div>

          <div className="mt-4 pl-10">
            {isResumeDone ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas/50 p-3.5">
                <button
                  type="button"
                  onClick={handleViewResume}
                  className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity focus:outline-none"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 font-bold text-xs uppercase shadow-sm">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-brand-600 hover:underline">
                      {state.resume.name} ↗
                    </p>
                    <p className="text-[11px] text-muted">
                      {fileSizeLabel(state.resume.size)}
                      {state.resume.uploadedAt &&
                        ` · Uploaded ${new Date(state.resume.uploadedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}`}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={handleViewResume}>
                    View ↗
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleDownloadResume}>
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Replace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-bad-ink hover:bg-bad/10"
                    onClick={handleRemoveResume}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Choose Resume File
                </Button>
                <span className="text-xs text-muted-soft">No file selected yet</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeUpload}
              className="hidden"
            />
            {resumeError && <p className="mt-2 text-xs font-medium text-bad-ink">{resumeError}</p>}
          </div>
        </div>

        {/* ── Row 2: LinkedIn Profile ──────────────────────────────────── */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  isLinkedInDone
                    ? 'bg-good text-white'
                    : 'border-[1.5px] border-line-strong bg-canvas text-muted-strong'
                )}
              >
                {isLinkedInDone ? '✓' : '2'}
              </span>
              <div>
                {isLinkedInDone ? (
                  <a
                    href={state.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-violet hover:underline focus:outline-none"
                    title="Click to open LinkedIn Profile"
                  >
                    <span>LinkedIn Profile</span>
                    <span className="text-xs transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      ↗
                    </span>
                  </a>
                ) : (
                  <h3 className="text-sm font-semibold text-ink">LinkedIn Profile</h3>
                )}
                <p className="text-xs text-muted">Paste your public professional LinkedIn profile link</p>
              </div>
            </div>

            <Badge tone={isLinkedInDone ? 'green' : 'slate'}>
              {isLinkedInDone ? 'Completed' : 'Not Added'}
            </Badge>
          </div>

          <div className="mt-4 pl-10">
            {isLinkedInDone && !isEditingLinkedIn ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas/50 p-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0077b5]/10 text-[#0077b5] font-bold text-xs">
                    in
                  </span>
                  <a
                    href={state.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-[13px] font-semibold text-brand-600 hover:underline"
                  >
                    {state.linkedinUrl} ↗
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setLinkedinInput(state.linkedinUrl);
                      setIsEditingLinkedIn(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-bad-ink hover:bg-bad/10"
                    onClick={handleRemoveLinkedIn}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveLinkedIn} className="flex flex-wrap items-center gap-2.5">
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/your-profile"
                  value={linkedinInput}
                  onChange={(e) => setLinkedinInput(e.target.value)}
                  className="input-field max-w-md py-2 text-xs"
                />
                <Button size="sm" variant="primary" type="submit" disabled={!linkedinInput.trim()}>
                  Save Link
                </Button>
                {isEditingLinkedIn && (
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() => setIsEditingLinkedIn(false)}
                  >
                    Cancel
                  </Button>
                )}
              </form>
            )}
          </div>
        </div>

        {/* ── Row 3: Github Profile ────────────────────────────────────── */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  isGithubDone
                    ? 'bg-good text-white'
                    : 'border-[1.5px] border-line-strong bg-canvas text-muted-strong'
                )}
              >
                {isGithubDone ? '✓' : '3'}
              </span>
              <div>
                {isGithubDone ? (
                  <a
                    href={state.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-violet hover:underline focus:outline-none"
                    title="Click to open Github Profile"
                  >
                    <span>Github Profile</span>
                    <span className="text-xs transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      ↗
                    </span>
                  </a>
                ) : (
                  <h3 className="text-sm font-semibold text-ink">Github Profile</h3>
                )}
                <p className="text-xs text-muted">Paste your GitHub developer profile link</p>
              </div>
            </div>

            <Badge tone={isGithubDone ? 'green' : 'slate'}>
              {isGithubDone ? 'Completed' : 'Not Added'}
            </Badge>
          </div>

          <div className="mt-4 pl-10">
            {isGithubDone && !isEditingGithub ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas/50 p-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-xs">
                    gh
                  </span>
                  <a
                    href={state.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-[13px] font-semibold text-brand-600 hover:underline"
                  >
                    {state.githubUrl} ↗
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setGithubInput(state.githubUrl);
                      setIsEditingGithub(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-bad-ink hover:bg-bad/10"
                    onClick={handleRemoveGithub}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveGithub} className="flex flex-wrap items-center gap-2.5">
                <input
                  type="text"
                  placeholder="https://github.com/your-username"
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                  className="input-field max-w-md py-2 text-xs"
                />
                <Button size="sm" variant="primary" type="submit" disabled={!githubInput.trim()}>
                  Save Link
                </Button>
                {isEditingGithub && (
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() => setIsEditingGithub(false)}
                  >
                    Cancel
                  </Button>
                )}
              </form>
            )}
          </div>
        </div>

        {/* ── Row 4: Coding Platform ───────────────────────────────────── */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  isCodingDone
                    ? 'bg-good text-white'
                    : 'border-[1.5px] border-line-strong bg-canvas text-muted-strong'
                )}
              >
                {isCodingDone ? '✓' : '4'}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">Coding Platform</h3>
                <p className="text-xs text-muted">
                  Add links to your competitive programming profiles (multiple links supported: LeetCode, CodeChef, HackerRank, etc.)
                </p>
              </div>
            </div>

            <Badge tone={isCodingDone ? 'green' : 'slate'}>
              {isCodingDone
                ? `${state.codingPlatforms.length} Added`
                : 'Not Added'}
            </Badge>
          </div>

          <div className="mt-4 pl-10 space-y-3.5">
            {/* Added platforms list */}
            {state.codingPlatforms.length > 0 ? (
              <div className="space-y-2">
                {state.codingPlatforms.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas/50 px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-1.5 focus:outline-none"
                        title={`Click to open ${item.platform}`}
                      >
                        <Badge
                          tone={platformTone(item.platform)}
                          className="cursor-pointer hover:opacity-85 text-xs py-1"
                        >
                          {item.platform} ↗
                        </Badge>
                      </a>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-[13px] font-semibold text-brand-600 hover:underline"
                      >
                        {item.url} ↗
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCodingPlatform(item.id)}
                      className="text-muted-soft hover:text-bad-ink p-1 transition-colors text-xs font-semibold"
                      title="Remove platform"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-soft">No coding platforms linked yet.</p>
            )}

            {/* Form to add a new coding platform link */}
            <form onSubmit={handleAddCodingPlatform} className="rounded-xl border border-line bg-canvas/30 p-4">
              <p className="text-xs font-semibold text-muted-strong mb-2.5">
                + Add a Coding Profile
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_PLATFORMS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setSelectedPlatform(p.name);
                      setCodingError('');
                    }}
                    className={cx(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                      selectedPlatform === p.name
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'border border-line bg-white text-muted hover:border-line-strong hover:text-ink'
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {selectedPlatform === 'Other' && (
                  <input
                    type="text"
                    placeholder="Platform Name (e.g. Codeforces)"
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                    className="input-field w-44 py-2 text-xs"
                  />
                )}
                <input
                  type="text"
                  placeholder={currentPreset?.placeholder || 'https://...'}
                  value={platformUrlInput}
                  onChange={(e) => setPlatformUrlInput(e.target.value)}
                  className="input-field flex-1 min-w-[220px] py-2 text-xs"
                />
                <Button size="sm" variant="primary" type="submit">
                  Add Link
                </Button>
              </div>

              {codingError && (
                <p className="mt-2 text-xs font-medium text-bad-ink">{codingError}</p>
              )}
            </form>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
