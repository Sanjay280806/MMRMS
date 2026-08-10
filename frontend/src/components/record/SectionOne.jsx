import { useState } from 'react';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { DefinitionList } from '../ui/DefinitionList.jsx';
import { SectionCard } from '../ui/SectionCard.jsx';
import { TextArea } from '../ui/Field.jsx';
import { RatingInput, RatingMeter } from '../ui/RatingMeter.jsx';
import { AlertBanner } from '../auth/AlertBanner.jsx';
import { tone as toneOf } from '../../lib/tone.js';

/** Section 1A — Academic Background. */
export function AcademicBackground({ background }) {
  return (
    <SectionCard section="Section 1 · A" title="Academic Background">
      <DefinitionList
        columns={3}
        items={[
          { key: '10th Percentage', value: `${background.tenthPercentage}%` },
          {
            key: `${background.qualifyingExam} Percentage`,
            value: `${background.qualifyingPercentage}%`,
          },
          { key: 'Current CGPA', value: `${background.currentCgpa} / ${background.gpaScale}` },
          {
            key: 'Standing Arrears',
            value: (
              <Badge tone={background.standingArrears ? 'rose' : 'green'}>
                {background.standingArrears}
              </Badge>
            ),
          },
          { key: 'History of Arrears', value: String(background.historyOfArrears) },
          { key: 'Latest Semester', value: `Semester ${background.latestSemester}` },
          { key: 'Favourite Subjects', value: background.favouriteSubjects?.join(', ') },
          { key: 'Subjects Finding Difficult', value: background.difficultSubjects?.join(', ') },
          { key: 'Remarks', value: background.remarks },
        ]}
      />
    </SectionCard>
  );
}

/** Section 1B — Career Aspirations. */
export function Aspirations({ aspirations }) {
  return (
    <SectionCard section="Section 1 · B" title="Career Aspirations">
      <DefinitionList
        columns={3}
        items={[
          { key: 'Dream Career', value: aspirations.dreamCareer },
          { key: 'Path', value: <Badge tone="indigo">{aspirations.path}</Badge> },
          { key: 'Preferred Companies', value: aspirations.preferredCompanies?.join(', ') },
          { key: 'Areas of Interest', value: aspirations.areasOfInterest?.join(', ') },
          { key: 'Certifications Completed', value: aspirations.certificationsCompleted?.join(', ') },
          { key: 'Certifications Planned', value: aspirations.certificationsPlanned?.join(', ') },
        ]}
      />
    </SectionCard>
  );
}

/** Section 1C — Skill Assessment. Ratings are editable by the student. */
export function SkillAssessment({ skills, onRate }) {
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  async function rate(skill, rating) {
    setSaving(skill);
    setError(null);
    try {
      await onRate(skill, rating);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <SectionCard
      section="Section 1 · C"
      title="Skill Assessment"
      subtitle={onRate ? 'Rate yourself 1–5. Your mentor records their observation alongside.' : 'Self-rated 1–5, with the mentor’s observation.'}
    >
      {error && <AlertBanner tone="rose" title={error} className="mb-4" />}

      <ul className="divide-y divide-line">
        {skills.map((s) => (
          <li key={s.skill} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13.5px] font-medium text-ink">{s.skill}</span>
              {onRate ? (
                <RatingInput
                  value={s.rating}
                  label={s.skill}
                  disabled={saving === s.skill}
                  onChange={(rating) => rate(s.skill, rating)}
                />
              ) : (
                <RatingMeter rating={s.rating} tone={s.tone} />
              )}
            </div>
            <p className="mt-2 border-l-2 border-line pl-3 text-[12px] italic leading-relaxed text-muted">
              <span className="font-semibold not-italic text-muted-strong">Mentor: </span>
              {s.mentorObservation}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/** Section 1E — Student Self Assessment. Editable by the student. */
export function SelfAssessment({ assessment, onSave }) {
  const [draft, setDraft] = useState(assessment);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const FIELDS = [
    ['strengths', 'Strengths'],
    ['areasForImprovement', 'Areas for Improvement'],
    ['challenges', 'Challenges Currently Facing'],
  ];

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      section="Section 1 · E"
      title="Student Self Assessment"
      action={
        onSave &&
        (editing ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(assessment);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ))
      }
    >
      {error && <AlertBanner tone="rose" title={error} className="mb-4" />}

      {editing ? (
        <div className="space-y-4">
          {FIELDS.map(([key, label]) => (
            <TextArea
              key={key}
              label={label}
              rows={3}
              value={draft[key] ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {FIELDS.map(([key, label]) => (
            <div key={key}>
              <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-muted-soft">
                {label}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink">
                {assessment[key] || <span className="text-muted-soft">Not recorded yet.</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/** Section 1F — Mentor Initial Assessment. Always read-only to the student. */
export function MentorAssessment({ assessment }) {
  const ITEMS = [
    ['academic', 'Academic'],
    ['behaviour', 'Behaviour'],
    ['communication', 'Communication'],
    ['attendance', 'Attendance'],
    ['confidence', 'Confidence'],
    ['learningAbility', 'Learning Ability'],
  ];

  return (
    <SectionCard
      section="Section 1 · F"
      title="Mentor Initial Assessment"
      subtitle={assessment.recordedOn ? `Recorded ${assessment.recordedOn}` : undefined}
    >
      <DefinitionList
        columns={2}
        items={ITEMS.map(([key, label]) => ({ key: label, value: assessment[key] }))}
      />

      <div className={`mt-5 rounded-xl px-4 py-3.5 ${toneOf('indigo').bg}`}>
        <p className="text-[10.5px] font-semibold uppercase tracking-[.07em] text-brand-500">
          Recommendations
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink">{assessment.recommendations}</p>
      </div>
    </SectionCard>
  );
}
