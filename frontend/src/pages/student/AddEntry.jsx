import { useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { ChipGroup, TextArea, TextField } from '../../components/ui/Field.jsx';
import { SectionCard } from '../../components/ui/SectionCard.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { AlertBanner } from '../../components/auth/AlertBanner.jsx';
import { RecordFileUpload } from '../../components/record/RecordFileUpload.jsx';
import { filesToEvidencePayload } from '../../lib/fileUpload.js';

const GROUPS = [
  { value: 'technical', label: 'Technical' },
  { value: 'co-curricular', label: 'Co-Curricular' },
  { value: 'extra-curricular', label: 'Extra-Curricular' },
];

const INTERNSHIP_TYPES = [
  { value: 'Internship', label: 'Internship' },
  { value: 'Project', label: 'Project' },
  { value: 'Internship + Project', label: 'Internship + Project' },
];

/** Section 6 — add an activity with supporting evidence in one form. */
export function AddParticipation({ categories, onAdd, saving }) {
  const [group, setGroup] = useState('technical');
  const [activity, setActivity] = useState('');
  const [date, setDate] = useState('');
  const [role, setRole] = useState('');
  const [achievement, setAchievement] = useState('');
  const [activityType, setActivityType] = useState(categories[0]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  const canSubmit = activity.trim();

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || saving) return;

    setError(null);
    try {
      const evidence = files.length ? await filesToEvidencePayload(files) : [];
      const body =
        group === 'extra-curricular'
          ? {
              activity: activity.trim(),
              activityType,
              role: role.trim(),
              achievement: achievement.trim(),
              date: date.trim(),
              evidence,
            }
          : {
              activity: activity.trim(),
              date: date.trim(),
              role: role.trim(),
              achievement: achievement.trim(),
              evidence,
            };

      await onAdd(group, body);
      setActivity('');
      setDate('');
      setRole('');
      setAchievement('');
      setFiles([]);
      setAdded(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SectionCard
      section="Section 6"
      title="Add your participation"
      subtitle="Technical, co-curricular and extra-curricular activities"
      action={<Tabs size="sm" items={GROUPS} value={group} onChange={setGroup} />}
    >
      <form className="space-y-4" onSubmit={submit}>
        {error && <AlertBanner tone="rose" title={error} />}

        {group === 'extra-curricular' && (
          <ChipGroup label="Activity Type" options={categories} value={activityType} onChange={setActivityType} />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Activity Name"
            placeholder={
              group === 'extra-curricular'
                ? 'e.g. District-level Badminton'
                : 'e.g. Smart India Hackathon'
            }
            value={activity}
            onChange={(e) => {
              setActivity(e.target.value);
              setAdded(false);
            }}
          />
          <TextField
            label="Role"
            placeholder="e.g. Team Lead / Treasurer / Participant"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <TextField
            label="Achievement"
            placeholder="e.g. Regional Winner / Runner-up"
            value={achievement}
            onChange={(e) => setAchievement(e.target.value)}
          />
          <TextField
            label="Date"
            placeholder="e.g. Mar 2026"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <RecordFileUpload
          files={files}
          onChange={setFiles}
          hint="Optional — certificate, participation proof, or event document"
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

/** Section 7 — add a certification with certificate upload in one form. */
export function AddCertification({ onAdd, saving }) {
  const [certification, setCertification] = useState('');
  const [platform, setPlatform] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  const canSubmit = certification.trim() && platform.trim();

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || saving) return;

    setError(null);
    try {
      const evidence = files.length ? await filesToEvidencePayload(files) : [];
      await onAdd({
        certification: certification.trim(),
        platform: platform.trim(),
        completionDate: completionDate.trim(),
        evidence,
      });
      setCertification('');
      setPlatform('');
      setCompletionDate('');
      setFiles([]);
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
            label="Certification Name"
            placeholder="e.g. Database Management Systems"
            value={certification}
            onChange={(e) => {
              setCertification(e.target.value);
              setAdded(false);
            }}
          />
          <TextField
            label="Platform / Issuing Organization"
            placeholder="e.g. NPTEL / Coursera / AWS"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          />
        </div>

        <TextField
          label="Completion Date"
          placeholder="e.g. Dec 2025"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
        />

        <RecordFileUpload
          label="Certificate / Supporting Evidence"
          files={files}
          onChange={setFiles}
          hint="Upload your certificate or related proof"
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

/** Section 9 — add internship or project with supporting evidence in one form. */
export function AddInternshipProject({ onAdd, saving }) {
  const [type, setType] = useState('Internship');
  const [internshipCompany, setInternshipCompany] = useState('');
  const [internshipRole, setInternshipRole] = useState('');
  const [internshipPeriod, setInternshipPeriod] = useState('');
  const [facultyGuide, setFacultyGuide] = useState('');
  const [description, setDescription] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  const includesInternship = type === 'Internship' || type === 'Internship + Project';
  const includesProject = type === 'Project' || type === 'Internship + Project';

  const canSubmit =
    (!includesInternship || internshipCompany.trim()) && (!includesProject || projectTitle.trim());

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || saving) return;

    setError(null);
    try {
      const evidence = files.length ? await filesToEvidencePayload(files) : [];
      await onAdd({
        type,
        internshipCompany: internshipCompany.trim(),
        internshipRole: internshipRole.trim(),
        internshipPeriod: internshipPeriod.trim(),
        facultyGuide: facultyGuide.trim(),
        description: description.trim(),
        projectTitle: projectTitle.trim(),
        projectDescription: projectDescription.trim(),
        expectedCompletion: expectedCompletion.trim(),
        evidence,
      });

      setInternshipCompany('');
      setInternshipRole('');
      setInternshipPeriod('');
      setFacultyGuide('');
      setDescription('');
      setProjectTitle('');
      setProjectDescription('');
      setExpectedCompletion('');
      setFiles([]);
      setAdded(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SectionCard section="Section 9" title="Add Internship / Project">
      <form className="space-y-4" onSubmit={submit}>
        {error && <AlertBanner tone="rose" title={error} />}

        <ChipGroup label="Type" options={INTERNSHIP_TYPES} value={type} onChange={setType} />

        {includesInternship && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Internship Company"
              placeholder="e.g. Zoho Corporation, Chennai"
              value={internshipCompany}
              onChange={(e) => {
                setInternshipCompany(e.target.value);
                setAdded(false);
              }}
            />
            <TextField
              label="Internship Role"
              placeholder="e.g. Software Intern — Full-stack team"
              value={internshipRole}
              onChange={(e) => setInternshipRole(e.target.value)}
            />
            <TextField
              label="Internship Period"
              placeholder="e.g. May – Jul 2026"
              value={internshipPeriod}
              onChange={(e) => setInternshipPeriod(e.target.value)}
            />
            <TextField
              label="Faculty Guide"
              placeholder="e.g. Prof. R. Ramesh"
              value={facultyGuide}
              onChange={(e) => setFacultyGuide(e.target.value)}
            />
            <TextArea
              className="sm:col-span-2"
              label="Description / Work Details"
              placeholder="Brief summary of your internship work"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {includesProject && (
          <div className="grid gap-4 sm:grid-cols-2">
            {!includesInternship && (
              <TextField
                label="Faculty Guide"
                placeholder="e.g. Prof. R. Ramesh"
                value={facultyGuide}
                onChange={(e) => setFacultyGuide(e.target.value)}
              />
            )}
            <TextField
              label="Project Title"
              placeholder="e.g. Smart Attendance System using Face Recognition"
              value={projectTitle}
              onChange={(e) => {
                setProjectTitle(e.target.value);
                setAdded(false);
              }}
              className={includesInternship ? 'sm:col-span-2' : ''}
            />
            <TextField
              label="Expected Completion Date"
              placeholder="e.g. Apr 2027"
              value={expectedCompletion}
              onChange={(e) => setExpectedCompletion(e.target.value)}
            />
            <TextArea
              className="sm:col-span-2"
              label="Project Description"
              placeholder="Brief description of the project"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <RecordFileUpload
          files={files}
          onChange={setFiles}
          hint="Offer letter, completion certificate, proposal, report, or other proof"
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
