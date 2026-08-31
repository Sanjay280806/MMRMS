/**
 * One tone vocabulary for the whole app. The API returns tone names
 * ('green' | 'amber' | 'rose' | 'indigo' | 'slate' | 'ink'); components map
 * them to classes here and nowhere else.
 */
const TONES = {
  green: {
    text: 'text-good-ink',
    bg: 'bg-good-tint',
    solid: 'bg-good',
    stroke: '#10B981',
    border: 'border-good/25',
    tint: 'bg-good-tint',
  },
  amber: {
    text: 'text-warn-ink',
    bg: 'bg-warn-tint',
    solid: 'bg-warn',
    stroke: '#F59E0B',
    border: 'border-warn/25',
    tint: 'bg-warn-tint',
  },
  rose: {
    text: 'text-bad-ink',
    bg: 'bg-bad-tint',
    solid: 'bg-bad',
    stroke: '#F43F5E',
    border: 'border-bad/25',
    tint: 'bg-bad-tint',
  },
  indigo: {
    text: 'text-brand-600',
    bg: 'bg-brand-50',
    solid: 'bg-brand-500',
    stroke: '#6366F1',
    border: 'border-brand-200',
    tint: 'bg-brand-50',
  },
  slate: {
    text: 'text-neutral-ink',
    bg: 'bg-neutral-tint',
    solid: 'bg-neutral',
    stroke: '#64748B',
    border: 'border-neutral/20',
    tint: 'bg-neutral-tint',
  },
  ink: {
    text: 'text-ink',
    bg: 'bg-line-faint',
    solid: 'bg-ink',
    stroke: '#12131A',
    border: 'border-ink/10',
    tint: 'bg-line-faint',
  },
};

export function tone(name) {
  return TONES[name] ?? TONES.slate;
}

/** Mirrors the backend's 50/70 thresholds for client-side scores. */
export function scoreTone(value) {
  if (value < 50) return 'rose';
  if (value < 70) return 'amber';
  return 'green';
}

/** Status label → tone, shared by certifications, projects, goals and tickets. */
export const STATUS_TONE = {
  Completed: 'green',
  'In Progress': 'indigo',
  Ongoing: 'indigo',
  'Just Started': 'amber',
  'Under Review': 'amber',
  'On Track': 'indigo',
  'At Risk': 'amber',
  Overdue: 'rose',
  Strong: 'green',
  Shortage: 'rose',
  Weak: 'rose',
  Raised: 'amber',
  Replied: 'indigo',
  Resolved: 'green',
  Critical: 'rose',
  High: 'amber',
  Medium: 'indigo',
  Low: 'slate',
  Online: 'indigo',
  Offline: 'slate',
  Hybrid: 'green',
};

export function statusTone(status) {
  return STATUS_TONE[status] ?? 'slate';
}

/** Categories used by the achievements list. */
export const CATEGORY_TONE = {
  Competition: 'indigo',
  Club: 'green',
  Sports: 'amber',
  Award: 'rose',
  Cultural: 'indigo',
  Volunteering: 'slate',
};

/** Timeline event types across both consoles. */
export const EVENT_TONE = {
  meeting: 'indigo',
  goal: 'green',
  academic: 'amber',
  attendance: 'amber',
  arrear: 'indigo',
  wellbeing: 'rose',
  parent: 'slate',
  alert: 'amber',
};

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}
