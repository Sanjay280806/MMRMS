import {
  ATTENDANCE_REQUIREMENT,
  GPA_SCALE,
  HEALTH_DIMENSIONS,
} from '../data/seed.js';

const weightSum = HEALTH_DIMENSIONS.reduce((sum, d) => sum + d.weight, 0);
if (Math.abs(weightSum - 1) > 1e-9) {
  throw new Error(`Health dimension weights must sum to 1, got ${weightSum}`);
}

export const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const pct = (n, d) => (d ? (n / d) * 100 : 0);

/* ── the five dimensions, each computed from record-book fields ─────────── */

/** Section 2 — CGPA against the scale, penalised for standing arrears. */
export function academicScore({ cgpa, standingArrears = 0 }) {
  return clamp(Math.round(pct(cgpa, GPA_SCALE) - standingArrears * 8));
}

/** Section 3 — the most recent attendance review. */
export function attendanceScore(reviews) {
  return clamp(Math.round(reviews.at(-1)?.percentage ?? 0));
}

/** Section 12 — meetings actually held, and action items actually closed. */
export function interactionScore({ meetingsHeld, meetingsDue, actionItemsClosed, actionItemsTotal }) {
  const attendance = pct(meetingsHeld, meetingsDue || meetingsHeld || 1);
  const followThrough = actionItemsTotal ? pct(actionItemsClosed, actionItemsTotal) : attendance;
  return clamp(Math.round(attendance * 0.5 + followThrough * 0.5));
}

/** Sections 7 & 8 — placement readiness and certification progress. */
export function careerScore({ readiness, certifications }) {
  const readinessValue = {
    Completed: 100,
    'In Progress': 50,
    'Not Started': 0,
  };
  const readinessAvg = readiness.length
    ? readiness.reduce((s, r) => s + (readinessValue[r.status] ?? 0), 0) / readiness.length
    : 0;

  // Planned certifications are intent, not progress — they don't drag the score.
  const active = certifications.filter((c) => c.status !== 'Planned');
  const certAvg = active.length ? active.reduce((s, c) => s + c.progress, 0) / active.length : 0;

  return clamp(Math.round(readinessAvg * 0.6 + certAvg * 0.4));
}

/**
 * Section 10 — one flagged aspect shouldn't read as a crisis, so concerns
 * scale across a 60-point band rather than the full range.
 */
export function wellbeingScore(aspects) {
  if (!aspects.length) return 100;
  const concerns = aspects.filter((a) => a.concern).length;
  return clamp(Math.round(100 - pct(concerns, aspects.length) * 0.6));
}

/* ── the index itself ───────────────────────────────────────────────────── */

/** Weighted health index, 0–100, from an already-computed dimension map. */
export function healthIndex(dimensions) {
  return Math.round(
    HEALTH_DIMENSIONS.reduce((sum, d) => sum + (dimensions[d.key] ?? 0) * d.weight, 0),
  );
}

/** Expands `{ academic: 73, … }` into labelled, toned, sourced rows. */
export function dimensionList(dimensions) {
  return HEALTH_DIMENSIONS.map((d) => ({
    key: d.key,
    name: d.name,
    weight: d.weight,
    source: d.source,
    value: dimensions[d.key] ?? 0,
    tone: scoreTone(dimensions[d.key] ?? 0),
  }));
}

export function weakestDimension(dimensions) {
  return dimensionList(dimensions).reduce((worst, d) => (d.value < worst.value ? d : worst));
}

/** Shared 50/70 thresholds — every score-coloured element uses this. */
export function scoreTone(value) {
  if (value < 50) return 'rose';
  if (value < 70) return 'amber';
  return 'green';
}

export function healthLabel(index) {
  if (index < 50) return 'Needs attention';
  if (index < 70) return 'Some risk';
  return 'Healthy & steady';
}

export function attendanceTone(percent) {
  if (percent < ATTENDANCE_REQUIREMENT) return 'rose';
  if (percent < 80) return 'amber';
  return 'green';
}

/* ── Sections 2 and 4 helpers ───────────────────────────────────────────── */

/** Cumulative GPA after each semester; the last entry is the current CGPA. */
export function cgpaSeries(performance) {
  let total = 0;
  return performance.map((row, i) => {
    total += row.gpa;
    return { ...row, cgpa: Number((total / (i + 1)).toFixed(2)) };
  });
}

export function currentCgpa(performance) {
  const series = cgpaSeries(performance);
  return series.length ? Number(series.at(-1).cgpa.toFixed(1)) : 0;
}

/** Section 4 — the CIA/Model average that decides a subject's standing. */
export function subjectAverage({ cia1, cia2, model }) {
  const marks = [cia1, cia2, model].filter((m) => typeof m === 'number');
  return marks.length ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : 0;
}

export function subjectStatus(subject) {
  if (subject.attendance != null && subject.attendance < ATTENDANCE_REQUIREMENT) {
    return { label: 'Shortage', tone: 'rose' };
  }
  const avg = subjectAverage(subject);
  if (avg >= 80) return { label: 'Strong', tone: 'green' };
  if (avg >= 55) return { label: 'On Track', tone: 'indigo' };
  return { label: 'Weak', tone: 'rose' };
}
