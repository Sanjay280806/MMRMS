import { useState } from 'react';
import { AlertBanner } from '../auth/AlertBanner.jsx';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { SectionCard } from '../ui/SectionCard.jsx';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function fileSize(size) {
  return `${Math.max(1, Math.ceil(size / 1024))} KB`;
}

/** A student-owned evidence upload that is also visible in the mentor record. */
export function EvidencePanel({ title, description, evidence = [], onUpload, saving }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!file || saving) return;

    setError('');
    setUploaded(false);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Choose a PDF, JPG, PNG, or WEBP file.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Choose a file smaller than 4 MB.');
      return;
    }

    try {
      await onUpload({
        name: file.name,
        contentType: file.type,
        size: file.size,
        dataUrl: await fileToDataUrl(file),
      });
      setFile(null);
      setUploaded(true);
      event.currentTarget.reset();
    } catch (uploadError) {
      setError(uploadError.message);
    }
  }

  return (
    <SectionCard title={title} subtitle={description}>
      {onUpload && (
        <form className="mb-5 flex flex-wrap items-end gap-3 border-b border-line pb-5" onSubmit={submit}>
          <label className="min-w-[220px] flex-1 text-[12.5px] font-semibold text-muted-strong">
            Select a supporting file
            <input
              className="mt-1.5 block w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[12px] text-ink file:mr-3 file:rounded-md file:border-0 file:bg-brand-500/10 file:px-2.5 file:py-1 file:text-[11.5px] file:font-semibold file:text-brand-600"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError('');
                setUploaded(false);
              }}
            />
          </label>
          <Button type="submit" size="sm" loading={saving} disabled={!file}>
            Upload evidence
          </Button>
          {uploaded && <span className="text-[12px] font-medium text-good-ink">Uploaded for mentor review.</span>}
        </form>
      )}

      {error && <div className="mb-4"><AlertBanner tone="rose" title={error} /></div>}

      {evidence.length === 0 ? (
        <EmptyState
          title="No supporting files yet"
          description={onUpload ? 'Upload a certificate, proof, or related document from your device.' : 'The student has not uploaded supporting files yet.'}
        />
      ) : (
        <ul className="space-y-2.5">
          {evidence.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas/60 px-3.5 py-3">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-ink">{item.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {item.contentType === 'application/pdf' ? 'PDF document' : 'Image proof'} · {fileSize(item.size)}
                </p>
              </div>
              <a
                href={item.dataUrl}
                download={item.name}
                target="_blank"
                rel="noreferrer"
                className="focus-ring rounded-lg border border-line-strong bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-muted-soft"
              >
                View / download
              </a>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
