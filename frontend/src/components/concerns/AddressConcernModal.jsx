import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client.js';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { TextArea } from '../ui/Field.jsx';
import { AlertBanner } from '../auth/AlertBanner.jsx';
import { RecordFileUpload } from '../record/RecordFileUpload.jsx';
import { filesToEvidencePayload } from '../../lib/fileUpload.js';

export function AddressConcernModal({ concern, onClose, onResolved }) {
  const [resolution, setResolution] = useState('');
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!concern) return null;

  const priorityTone =
    concern.priority === 'High' ? 'rose' : concern.priority === 'Medium' ? 'amber' : 'neutral';

  async function handleSubmit(event) {
    event.preventDefault();
    if (!resolution.trim() || saving) return;

    setSaving(true);
    setError(null);
    try {
      const evidence = files.length ? await filesToEvidencePayload(files) : [];
      const updated = await api(`/mentor/me/concerns/${concern.id}/resolve`, {
        method: 'PATCH',
        body: {
          resolution: resolution.trim(),
          evidence,
        },
      });
      onResolved?.(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <Card className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="border-b border-line bg-canvas/40 px-6 py-4.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-brand-600">
                  Student Concern Resolution
                </span>
                <Badge tone={priorityTone} size="sm">
                  {concern.priority} Priority
                </Badge>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {concern.category}
                </span>
              </div>
              <h2 className="mt-1 text-base font-bold text-ink sm:text-lg">{concern.subject}</h2>
              <p className="mt-0.5 text-xs text-muted">
                Raised by <strong className="font-semibold text-ink">{concern.studentName}</strong> ({concern.rollNumber}) · {new Date(concern.raisedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg p-1.5 text-muted hover:bg-neutral/10 hover:text-ink focus-ring"
            >
              ✕
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4.5 overflow-y-auto px-6 py-5">
            {/* Concern Details Card */}
            <div className="rounded-xl border border-line bg-canvas/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[.05em] text-muted-soft">
                Student Concern Description
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink whitespace-pre-wrap">
                {concern.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Mentor Resolution */}
            <div className="space-y-1.5">
              <TextArea
                label="Resolution & Actions Taken *"
                placeholder="Explain how this concern was investigated and resolved (e.g., meeting held, approval granted, referral coordinated, attendance condoned)..."
                rows={4}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted">
                This resolution note will be shared directly with {concern.studentName} for their review and formal acknowledgment.
              </p>
            </div>

            {/* Supporting Evidence File Upload */}
            <div className="rounded-xl border border-dashed border-line-strong bg-canvas/20 p-4">
              <RecordFileUpload
                label="Attach Supporting Evidence (Optional)"
                hint="Upload approval letters, fee vouchers, attendance slips, or email threads"
                files={files}
                onChange={setFiles}
              />
            </div>

            {error && <AlertBanner tone="rose" title={error} />}
          </div>

          <footer className="flex items-center justify-between border-t border-line bg-canvas/30 px-6 py-4">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" loading={saving} disabled={!resolution.trim() || saving}>
                Submit Resolution & Notify Student
              </Button>
            </div>
          </footer>
        </form>
      </Card>
    </div>,
    document.body,
  );
}
