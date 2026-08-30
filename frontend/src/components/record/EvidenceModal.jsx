import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatUploadDate, fileSizeLabel } from '../../lib/fileUpload.js';
import { Button } from '../ui/Button.jsx';

function isImage(contentType) {
  return contentType?.startsWith('image/');
}

/** Preview uploaded evidence belonging to a single record. */
export function EvidenceModal({ open, title, files = [], onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-modal-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-line bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id="evidence-modal-title" className="text-[15px] font-semibold text-ink">
              {title}
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">
              {files.length} file{files.length === 1 ? '' : 's'} attached to this record
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {files.map((file) => (
            <div key={file.id ?? file.name} className="rounded-xl border border-line bg-canvas/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{file.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {file.contentType === 'application/pdf' ? 'PDF document' : 'Image'} · {fileSizeLabel(file.size)}
                    {file.uploadedOn ? ` · Uploaded ${formatUploadDate(file.uploadedOn)}` : ''}
                  </p>
                </div>
                <a
                  href={file.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring rounded-lg border border-line-strong bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-muted-soft"
                >
                  Open
                </a>
              </div>

              {isImage(file.contentType) && file.dataUrl && (
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="mt-3 max-h-64 w-full rounded-lg border border-line object-contain"
                />
              )}

              {file.contentType === 'application/pdf' && (
                <p className="mt-3 text-[12px] text-muted">Open the file to preview the PDF document.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
