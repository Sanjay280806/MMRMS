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
  { value: 'Paper Presentation', label: 'Paper Presentation' },
  { value: 'Arts', label: 'Arts & Extracurricular' },
  { value: 'Others', label: 'Others' },
];

const SEMESTER_OPTIONS = [
  { value: '', label: '— Select Semester (Sem) * —' },
  { value: 'Semester 1 (Odd Sem · 2024)', label: 'Semester 1 (Odd Sem · 2024)' },
  { value: 'Semester 2 (Even Sem · 2025)', label: 'Semester 2 (Even Sem · 2025)' },
  { value: 'Semester 3 (Odd Sem · 2025)', label: 'Semester 3 (Odd Sem · 2025)' },
  { value: 'Semester 4 (Even Sem · 2026)', label: 'Semester 4 (Even Sem · 2026)' },
  { value: 'Semester 5 (Odd Sem · 2026)', label: 'Semester 5 (Odd Sem · 2026)' },
  { value: 'Semester 6 (Even Sem · 2027)', label: 'Semester 6 (Even Sem · 2027)' },
  { value: 'Semester 7 (Odd Sem · 2027)', label: 'Semester 7 (Odd Sem · 2027)' },
  { value: 'Semester 8 (Even Sem · 2028)', label: 'Semester 8 (Even Sem · 2028)' },
  { value: '2026 Odd Sem', label: '2026 Odd Sem' },
  { value: '2026 Even Sem', label: '2026 Even Sem' },
];

const ART_CATEGORIES = [
  { value: '', label: '— Select Art / Extracurricular Type * —' },
  { value: 'Fine Arts (Painting, Drawing, Sculpture)', label: 'Fine Arts (Painting, Drawing, Sculpture)' },
  { value: 'Music & Singing (Vocal, Instrumental)', label: 'Music & Singing (Vocal, Instrumental)' },
  { value: 'Dance (Classical, Western, Folk)', label: 'Dance (Classical, Western, Folk)' },
  { value: 'Theatre & Drama', label: 'Theatre & Drama' },
  { value: 'Sports & Games (Athletics, Football, Cricket, Badminton, Chess, etc.)', label: 'Sports & Games (Athletics, Football, Cricket, Badminton, Chess, etc.)' },
  { value: 'Literary & Debating (Elocution, Quiz, Creative Writing)', label: 'Literary & Debating (Elocution, Quiz, Creative Writing)' },
  { value: 'Photography & Filmmaking', label: 'Photography & Filmmaking' },
  { value: 'Club & Social Service (NSS, NCC, YRC, Rotaract)', label: 'Club & Social Service (NSS, NCC, YRC, Rotaract)' },
  { value: 'Other Extracurricular Activity', label: 'Other Extracurricular Activity' },
];

/**
 * Add an activity entry — dynamic form tailored to each participation type.
 * Every form includes the Semester (Sem) selector.
 */
export function AddActivity({ onAdd, saving }) {
  const [area, setArea] = useState('');
  const [semester, setSemester] = useState('');
  const [customArea, setCustomArea] = useState('');

  // Dynamic field states
  const [activityName, setActivityName] = useState('');
  const [place, setPlace] = useState('');
  const [platform, setPlatform] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [college, setCollege] = useState('');
  const [artCategory, setArtCategory] = useState('');
  const [achievement, setAchievement] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');

  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  function resetFormFields() {
    setActivityName('');
    setPlace('');
    setPlatform('');
    setCompany('');
    setLocation('');
    setDuration('');
    setStartDate('');
    setEndDate('');
    setCollege('');
    setArtCategory('');
    setAchievement('');
    setDescription('');
    setDate('');
    setFiles([]);
    setCustomArea('');
  }

  function handleAreaChange(newArea) {
    setArea(newArea);
    resetFormFields();
    setAdded(false);
  }

  const canSubmit = Boolean(
    area.trim() &&
    semester.trim() &&
    (
      (area === 'Hackathon' && activityName.trim() && place.trim()) ||
      (area === 'Certification' && activityName.trim() && platform.trim()) ||
      (area === 'Internship' && company.trim() && activityName.trim() && location.trim() && startDate.trim()) ||
      (area === 'Workshop' && activityName.trim() && startDate.trim()) ||
      (area === 'Paper Presentation' && activityName.trim() && college.trim()) ||
      (area === 'Arts' && artCategory.trim() && activityName.trim()) ||
      (area === 'Others' && customArea.trim() && activityName.trim())
    )
  );

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || saving) return;

    setError(null);
    try {
      const evidence = files.length ? await filesToEvidencePayload(files) : [];
      await onAdd({
        area,
        semester,
        customArea: area === 'Others' ? customArea.trim() : undefined,
        activityName: activityName.trim(),
        place: place.trim() || undefined,
        platform: platform.trim() || undefined,
        company: company.trim() || undefined,
        location: location.trim() || undefined,
        duration: duration.trim() || (startDate && endDate ? `${startDate} to ${endDate}` : undefined),
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        college: college.trim() || undefined,
        artCategory: area === 'Arts' ? artCategory.trim() : undefined,
        description: description.trim() || undefined,
        achievement: achievement.trim() || undefined,
        date: (date || startDate || '').trim() || undefined,
        evidence,
      });

      resetFormFields();
      setArea('');
      setSemester('');
      setAdded(true);
    } catch (err) {
      setError(err.message || 'Failed to record activity.');
    }
  }

  return (
    <SectionCard
      section="Activities"
      title="Add an Activity"
      subtitle="Select your area of participation, semester, and fill in the specific competition or program details"
    >
      <form className="space-y-4" onSubmit={submit}>
        {error && <AlertBanner tone="rose" title={error} />}

        {/* ── Area & Semester Selection ─────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="input-label">
              Area of Participation <span className="text-bad-ink">*</span>
            </label>
            <select
              className="input-field"
              value={area}
              onChange={(e) => handleAreaChange(e.target.value)}
              required
            >
              {AREA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">
              Semester / Term (Sem) <span className="text-bad-ink">*</span>
            </label>
            <select
              className="input-field"
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setAdded(false);
              }}
              required
            >
              {SEMESTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Dynamic Fields by Area ───────────────────────────────── */}

        {/* 1. HACKATHON */}
        {area === 'Hackathon' && (
          <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 uppercase tracking-wider">
              <span>💻 Hackathon Details</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Hackathon Name *"
                placeholder="e.g. Smart India Hackathon 2026, KCT Hackfest, HackNITR"
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value);
                  setAdded(false);
                }}
                className="sm:col-span-2"
                required
              />
              <TextField
                label="Place / Venue / Platform *"
                placeholder="e.g. Kumaraguru Campus, IIT Madras, Virtual / Online"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                required
              />
              <div>
                <label className="input-label">Event Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <TextField
                label="Achievement / Award"
                placeholder="e.g. 1st Place Winner, Runner Up, Finalist, Top 5 Team, Participant"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
                className="sm:col-span-2"
              />
              <TextArea
                label="Problem Statement & Description"
                placeholder="Brief description of the problem addressed, tech stack used, and your contribution"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="sm:col-span-2"
              />
            </div>
          </div>
        )}

        {/* 2. CERTIFICATION */}
        {area === 'Certification' && (
          <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 uppercase tracking-wider">
              <span>📜 Certification Details</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Certificate / Course Name *"
                placeholder="e.g. AWS Certified Solutions Architect, Full Stack Web Development"
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value);
                  setAdded(false);
                }}
                className="sm:col-span-2"
                required
              />
              <TextField
                label="Platform / Issuing Organization *"
                placeholder="e.g. Coursera, NPTEL, Udemy, AWS, edX, LinkedIn Learning"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                required
              />
              <TextField
                label="Duration"
                placeholder="e.g. 4 Weeks, 3 Months, 40 Hours"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <div>
                <label className="input-label">Completion Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <TextField
                label="Grade / Score / Achievement"
                placeholder="e.g. Elite + Gold (92%), Grade A, Completed with Honors"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
              />
              <TextArea
                label="Skills Acquired & Description"
                placeholder="Key concepts, tools, or libraries covered in this certification"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="sm:col-span-2"
              />
            </div>
          </div>
        )}

        {/* 3. INTERNSHIP */}
        {area === 'Internship' && (
          <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/20 p-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 uppercase tracking-wider">
              <span>🏢 Internship Details</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Name of the Company / Organization *"
                placeholder="e.g. Zoho, Bosch, Cognizant, Microsoft, Tech Startup"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
              <TextField
                label="Role / Designation *"
                placeholder="e.g. Software Development Intern, Data Analyst Intern"
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value);
                  setAdded(false);
                }}
                required
              />
              <TextField
                label="Location of the Company *"
                placeholder="e.g. Bengaluru, Coimbatore, Chennai, Remote / Work From Home"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
              <TextField
                label="Stipend / Achievement"
                placeholder="e.g. ₹20,000 / month, PPO Offered, Certificate of Appreciation"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
              />
              <div>
                <label className="input-label">
                  Start Date <span className="text-bad-ink">*</span>
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="input-label">End Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <TextArea
                label="Internship Responsibilities & Description"
                placeholder="Key deliverables, projects worked on, tech stack utilized, and contributions"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="sm:col-span-2"
              />
            </div>
          </div>
        )}

        {/* 4. WORKSHOP */}
        {area === 'Workshop' && (
          <div className="space-y-4 rounded-xl border border-amber-100 bg-amber-50/20 p-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 uppercase tracking-wider">
              <span>🛠️ Workshop Details</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Workshop Title / Topic *"
                placeholder="e.g. Hands-on Generative AI & LLM Workshop, IoT Bootcamp"
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value);
                  setAdded(false);
                }}
                className="sm:col-span-2"
                required
              />
              <TextField
                label="Organizing Body / Platform / Venue"
                placeholder="e.g. KCT IEEE Student Chapter, CDAC, IIT Madras"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              />
              <TextField
                label="Achievement / Participation"
                placeholder="e.g. Participated, Best Hands-on Project, Completed"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
              />
              <div>
                <label className="input-label">
                  Start Date <span className="text-bad-ink">*</span>
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="input-label">End Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <TextArea
                label="Description & Learnings"
                placeholder="Practical tools, sessions, and concepts covered during the workshop"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="sm:col-span-2"
              />
            </div>
          </div>
        )}

        {/* 5. PAPER PRESENTATION */}
        {area === 'Paper Presentation' && (
          <div className="space-y-4 rounded-xl border border-purple-100 bg-purple-50/20 p-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-900 uppercase tracking-wider">
              <span>📄 Paper Presentation Details</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Paper Title *"
                placeholder="e.g. Deep Learning Approaches in Autonomous Drone Navigation"
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value);
                  setAdded(false);
                }}
                className="sm:col-span-2"
                required
              />
              <TextField
                label="College / Platform / Conference Name *"
                placeholder="e.g. Kumaraguru College of Technology, IEEE International Conference, PSG Tech"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                required
              />
              <TextField
                label="Place / City"
                placeholder="e.g. Coimbatore, Chennai, Online / Virtual"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
              />
              <div>
                <label className="input-label">Presentation Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <TextField
                label="Achievement / Recognition"
                placeholder="e.g. Best Paper Award, 2nd Prize, Presented & Published in IEEE Xplore"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
              />
              <TextArea
                label="Paper Abstract / Description"
                placeholder="Brief summary of the paper, problem solved, methodology, and results"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="sm:col-span-2"
              />
            </div>
          </div>
        )}

        {/* 6. ARTS & EXTRACURRICULAR */}
        {area === 'Arts' && (
          <div className="space-y-4 rounded-xl border border-rose-100 bg-rose-50/20 p-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-900 uppercase tracking-wider">
              <span>🎨 Arts, Sports & Extracurricular Activity</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="input-label">
                  Art / Extracurricular Category <span className="text-bad-ink">*</span>
                </label>
                <select
                  className="input-field"
                  value={artCategory}
                  onChange={(e) => setArtCategory(e.target.value)}
                  required
                >
                  {ART_CATEGORIES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <TextField
                label="Activity / Event Name *"
                placeholder="e.g. Anna University Intercollegiate Badminton, Yugam Classical Solo Dance"
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value);
                  setAdded(false);
                }}
                className="sm:col-span-2"
                required
              />
              <TextField
                label="Organizer / College / Venue"
                placeholder="e.g. KCT Sports Complex, PSG College, Tamil Nadu Sports Federation"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
              />
              <div>
                <label className="input-label">Event Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <TextField
                label="Achievement / Award / Medal"
                placeholder="e.g. 1st Place Gold Medal, Runners Up, Special Mention, Participated"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
                className="sm:col-span-2"
              />
              <TextArea
                label="Description"
                placeholder="Details about the performance, sport, or extracurricular activity"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="sm:col-span-2"
              />
            </div>
          </div>
        )}

        {/* 7. OTHERS */}
        {area === 'Others' && (
          <div className="space-y-4 rounded-xl border border-line bg-canvas/30 p-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-strong uppercase tracking-wider">
              <span>✨ Other Activity</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Specify Area / Category *"
                placeholder="e.g. Social Service, Open Source Contribution, Youth Club"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                className="sm:col-span-2"
                required
              />
              <TextField
                label="Activity Name *"
                placeholder="e.g. Green Campus Initiative, Blood Donation Drive"
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value);
                  setAdded(false);
                }}
                className="sm:col-span-2"
                required
              />
              <TextField
                label="Place / Organization / Venue"
                placeholder="e.g. Coimbatore City Municipal Corporation, KCT Rotaract"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
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
              <TextField
                label="Achievement / Role"
                placeholder="e.g. Lead Volunteer, Certificate of Appreciation"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
                className="sm:col-span-2"
              />
              <TextArea
                label="Description"
                placeholder="Brief summary of your activity and contributions"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="sm:col-span-2"
              />
            </div>
          </div>
        )}

        {/* ── Evidence File Upload (Always Present) ───────────────────── */}
        {area && (
          <RecordFileUpload
            label="Evidence"
            files={files}
            onChange={setFiles}
            hint="Upload certificate, participation proof, offer letter, or any supporting document (PDF, JPG, PNG)"
          />
        )}

        {/* ── Submit Button (Rounded design) ─────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            size="sm"
            variant="primary"
            loading={saving}
            disabled={!canSubmit}
            className="rounded-xl px-5 py-2.5 font-semibold shadow-raised hover:shadow-glow"
          >
            Add Activity
          </Button>
          {added && <span className="text-[12.5px] font-medium text-good-ink">✓ Activity recorded successfully.</span>}
        </div>
      </form>
    </SectionCard>
  );
}
