import { useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { ChipGroup, TextField } from '../../components/ui/Field.jsx';
import { SectionCard } from '../../components/ui/SectionCard.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { AlertBanner } from '../../components/auth/AlertBanner.jsx';

const GROUPS = [
  { value: 'technical', label: 'Technical' },
  { value: 'co-curricular', label: 'Co-Curricular' },
  { value: 'extra-curricular', label: 'Extra-Curricular' },
];

/** Section 6 — add an activity to any of the three participation groups. */
export function AddParticipation({ categories, onAdd, saving }) {
  const [group, setGroup] = useState('technical');
  const [activity, setActivity] = useState('');
  const [date, setDate] = useState('');
  const [role, setRole] = useState('');
  const [achievement, setAchievement] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  const isExtra = group === 'extra-curricular';
  const canSubmit = isExtra ? detail.trim() : activity.trim();

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || saving) return;

    setError(null);
    try {
      await onAdd(
        group,
        isExtra
          ? { category, detail: detail.trim(), date: date.trim() }
          : {
              activity: activity.trim(),
              date: date.trim(),
              achievement: achievement.trim(),
              ...(group === 'technical' ? { role: role.trim() } : {}),
            },
      );
      setActivity('');
      setDetail('');
      setDate('');
      setRole('');
      setAchievement('');
      setAdded(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SectionCard
      section="Section 6"
      title="Record an Activity"
      subtitle="Technical, co-curricular and extra-curricular participation — your mentor sees these too."
      action={<Tabs size="sm" items={GROUPS} value={group} onChange={setGroup} />}
    >
      <form className="space-y-4" onSubmit={submit}>
        {error && <AlertBanner tone="rose" title={error} />}

        {isExtra ? (
          <>
            <ChipGroup label="Category" options={categories} value={category} onChange={setCategory} />
            <TextField
              label="Detail"
              placeholder="e.g. District-level badminton — Runner-up"
              value={detail}
              onChange={(e) => {
                setDetail(e.target.value);
                setAdded(false);
              }}
            />
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Activity"
              placeholder="e.g. Smart India Hackathon"
              value={activity}
              onChange={(e) => {
                setActivity(e.target.value);
                setAdded(false);
              }}
            />
            {group === 'technical' && (
              <TextField
                label="Role"
                placeholder="e.g. Team Lead"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            )}
            <TextField
              label="Achievement"
              placeholder="e.g. Regional Winner"
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Date"
            placeholder="e.g. Jul 2026"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} disabled={!canSubmit}>
            + Add to record book
          </Button>
          {added && <span className="text-[12.5px] font-medium text-good-ink">✓ Recorded.</span>}
        </div>
      </form>
    </SectionCard>
  );
}

/** Section 7 — add a certification. */
export function AddCertification({ statuses, onAdd, saving }) {
  const [certification, setCertification] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('Planned');
  const [completionDate, setCompletionDate] = useState('');
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  const canSubmit = certification.trim() && platform.trim();

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || saving) return;

    setError(null);
    try {
      await onAdd({
        certification: certification.trim(),
        platform: platform.trim(),
        status,
        completionDate: completionDate.trim(),
      });
      setCertification('');
      setPlatform('');
      setCompletionDate('');
      setAdded(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SectionCard section="Section 7" title="Add a Certification">
      <form className="space-y-4" onSubmit={submit}>
        {error && <AlertBanner tone="rose" title={error} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Certification"
            placeholder="e.g. AWS Solutions Architect"
            value={certification}
            onChange={(e) => {
              setCertification(e.target.value);
              setAdded(false);
            }}
          />
          <TextField
            label="Platform"
            placeholder="e.g. NPTEL, Coursera, AWS"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          />
        </div>

        <ChipGroup label="Status" options={statuses} value={status} onChange={setStatus} />

        {status === 'Completed' && (
          <TextField
            label="Completion Date"
            placeholder="e.g. Aug 2026"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
          />
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} disabled={!canSubmit}>
            + Add certification
          </Button>
          {added && <span className="text-[12.5px] font-medium text-good-ink">✓ Recorded.</span>}
        </div>
      </form>
    </SectionCard>
  );
}
