import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client.js';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { TextArea } from '../ui/Field.jsx';
import { AlertBanner } from '../auth/AlertBanner.jsx';
import { fileSizeLabel, formatUploadDate } from '../../lib/fileUpload.js';

export function AcknowledgeConcernModal({ concern, onClose, onAcknowledged }) {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!concern) return null;

  async function handleAcknowledge() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api(`/student/me/concerns/${concern.id}/acknowledge`, {
        method: 'POST',
        body: { feedback: feedback.trim() },
      });
      onAcknowledged?.(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const evidenceList = concern.evidence ?? [];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <Card className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="border-b border-line bg-canvas/40 px-6 py-4.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-good-ink">
                  Resolution Review & Formal Acknowledgment
                </span>
                <Badge tone="green" size="sm">
                  Resolved by Mentor
                </Badge>
              </div>
              <h2 className="mt-1 text-base font-bold text-ink sm:text-lg">{concern.subject}</h2>
              <p className="mt-0.5 text-xs text-muted">
                Category: <strong className="text-ink">{concern.category}</strong> · Mentor:{' '}
                <strong className="text-ink">{concern.mentorName}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg p-1.5 text-muted hover:bg-neutral/10 hover:text-ink focus-ring"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4.5 overflow-y-auto px-6 py-5">
          {/* Your original concern */}
          <div className="rounded-xl border border-line bg-canvas/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.05em] text-muted-soft">
              Your Concern Raised
            </p>
            <p className="mt-1 text-[13px] text-ink">{concern.description || concern.subject}</p>
          </div>

          {/* Mentor's Resolution */}
          <div className="rounded-xl border border-good-300/60 bg-good-500/5 p-4.5">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold text-good-ink uppercase tracking-wide">
                Mentor's Resolution
              </span>
              <span className="text-[11px] text-muted">
                Resolved on {formatUploadDate(concern.resolvedAt)} by {concern.resolvedBy || concern.mentorName}
              </span>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink whitespace-pre-wrap">
              {concern.resolution || 'Resolution recorded by mentor.'}
            </p>
          </div>

          {/* Supporting Evidence Attachments */}
          {evidenceList.length > 0 && (
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="text-[11.5px] font-bold uppercase tracking-[.05em] text-muted-strong">
                Attached Evidence & Proof ({evidenceList.length})
              </p>
              <ul className="mt-2.5 space-y-2">
                {evidenceList.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-canvas/40 px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-ink">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {item.contentType === 'application/pdf' ? 'PDF document' : 'Image proof'} ·{' '}
                        {fileSizeLabel(item.size)}
                      </p>
                    </div>
                    {item.dataUrl && (
                      <a
                        href={item.dataUrl}
                        download={item.name}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring rounded-lg border border-line-strong bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:border-brand-500"
                      >
                        View / Download proof
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Student Feedback (Optional) */}
          <div className="space-y-1.5">
            <TextArea
              label="Student Note / Remarks (Optional)"
              placeholder="Add any feedback or confirmation (e.g. 'Issue resolved, thank you ma\'am')..."
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          {error && <AlertBanner tone="rose" title={error} />}
        </div>

        <footer className="flex items-center justify-between border-t border-line bg-canvas/30 px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Review Later
          </Button>
          <Button type="button" size="sm" tone="good" loading={submitting} onClick={handleAcknowledge}>
            ✓ Acknowledge Resolution & Close Concern
          </Button>
        </footer>
      </Card>
    </div>,
    document.body,
  );
}
