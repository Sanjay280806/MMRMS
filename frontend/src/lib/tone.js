/**
 * One tone vocabulary for the whole app. The API returns tone names
 * ('green' | 'amber' | 'rose' | 'indigo' | 'slate' | 'ink'); components map
 * them to classes here and nowhere else.
 */
const TONES = {
  green: {
    text: 'text-good-ink',
    bg: 'bg-good/[0.14]',
    solid: 'bg-good',
    stroke: '#10B981',
    border: 'border-good/30',
    tint: 'bg-good-tint',
  },
  amber: {
    text: 'text-warn-ink',
    bg: 'bg-warn/[0.16]',
    solid: 'bg-warn',
    stroke: '#F59E0B',
    border: 'border-warn/30',
    tint: 'bg-warn-tint',
  },
  rose: {
    text: 'text-bad-ink',
    bg: 'bg-bad/[0.12]',
    solid: 'bg-bad',
    stroke: '#F43F5E',
    border: 'border-bad/30',
    tint: 'bg-bad-tint',
  },
  indigo: {
    text: 'text-brand-500',
    bg: 'bg-brand-500/10',
    solid: 'bg-brand-500',
    stroke: '#4F46E5',
    border: 'border-brand-500/25',
    tint: 'bg-brand-50',
  },
  slate: {
    text: 'text-neutral-ink',
    bg: 'bg-neutral/10',
    solid: 'bg-neutral',
    stroke: '#64748B',
    border: 'border-neutral/25',
    tint: 'bg-neutral-tint',
  },
  ink: {
    text: 'text-ink',
    bg: 'bg-ink/[0.06]',
    solid: 'bg-ink',
    stroke: '#1A1B23',
    border: 'border-ink/15',
    tint: 'bg-line',
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
