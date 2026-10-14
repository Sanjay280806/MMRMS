import { useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { TextArea, TextField } from '../../components/ui/Field.jsx';
import { SectionCard } from '../../components/ui/SectionCard.jsx';
import { AlertBanner } from '../../components/auth/AlertBanner.jsx';
import { RecordFileUpload } from '../../components/record/RecordFileUpload.jsx';
import { filesToEvidencePayload } from '../../lib/fileUpload.js';

const AREA_OPTIONS = [
  { value: '', label: '— Select area of participation —' },
  { value: 'Hackathon', label: 'Hackathon' },
  { value: 'Certification', label: 'Certification' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Events', label: 'Events' },
  { value: 'Paper Presentation', label: 'Paper Presentation' },
  { value: 'Arts', label: 'Arts' },
  { value: 'Others', label: 'Others' },
];

/**
 * Add an activity entry — unified form for all participation types.
 * Replaces the old Participation / Certification / Internship & Project forms.
 */
export function AddActivity({ onAdd, saving }) {
  const [area, setArea] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [activityName, setActivityName] = useState('');
  const [description, setDescription] = useState('');
  const [achievement, setAchievement] = useState('');
  const [date, setDate] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  const isOthers = area === 'Others';
  const canSubmit =
    area.trim() &&
    (!isOthers || customArea.trim()) &&
    activityName.trim();

  function reset() {
    setArea('');
    setCustomArea('');
    setActivityName('');
    setDescription('');
    setAchievement('');
    setDate('');
    setFiles([]);
  }

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || saving) return;

    setError(null);
    try {
      const evidence = files.length ? await filesToEvidencePayload(files) : [];
      await onAdd({
        area,
        customArea: isOthers ? customArea.trim() : undefined,
        activityName: activityName.trim(),
        description: description.trim() || undefined,
        achievement: achievement.trim() || undefined,
        date: date.trim() || undefined,
        evidence,
      });
      reset();
      setAdded(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SectionCard
      section="Activities"
      title="Add an Activity"
      subtitle="Select your area of participation and fill in the details"
    >
      <form className="space-y-4" onSubmit={submit}>
        {error && <AlertBanner tone="rose" title={error} />}

        {/* Area of participation — dropdown */}
        <div>
          <label className="input-label">Area of Participation</label>
          <select
            className="input-field"
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setCustomArea('');
              setAdded(false);
            }}
          >
            {AREA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom area name — shown only when Others is selected */}
        {isOthers && (
          <TextField
            label="Specify Area"
            placeholder="e.g. Social Service, NCC, NSS…"
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Activity Name"
            placeholder="e.g. Smart India Hackathon 2026"
            value={activityName}
            onChange={(e) => {
              setActivityName(e.target.value);
              setAdded(false);
            }}
            className="sm:col-span-2"
          />

          <TextArea
            label="Description"
            placeholder="Brief description of your participation or what you did"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="sm:col-span-2"
          />

          <TextField
            label="Achievement"
            placeholder="e.g. Regional Winner, Runner-up, Completed"
            value={achievement}
            onChange={(e) => setAchievement(e.target.value)}
          />

          <div>
            <label className="input-label">Date</label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <RecordFileUpload
          label="Evidence"
          files={files}
          onChange={setFiles}
          hint="Upload certificate, participation proof, offer letter, or any supporting document (PDF, JPG, PNG)"
        />

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} disabled={!canSubmit}>
            Add
          </Button>
          {added && <span className="text-[12.5px] font-medium text-good-ink">✓ Recorded.</span>}
        </div>
      </form>
    </SectionCard>
  );
}
