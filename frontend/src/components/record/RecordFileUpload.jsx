import { useId } from 'react';
import { ACCEPTED_FILE_LABEL, fileSizeLabel } from '../../lib/fileUpload.js';
import { Label } from '../ui/Field.jsx';

/** Compact multi-file picker integrated into record forms. */
export function RecordFileUpload({ label = 'Supporting Evidence', files, onChange, hint }) {
  const id = useId();

  function addFiles(event) {
    const picked = Array.from(event.target.files ?? []);
    if (!picked.length) return;
    onChange([...files, ...picked]);
    event.target.value = '';
  }

  function removeFile(index) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={addFiles}
        className="block w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[12px] text-ink file:mr-3 file:rounded-md file:border-0 file:bg-brand-500/10 file:px-2.5 file:py-1 file:text-[11.5px] file:font-semibold file:text-brand-600"
      />
      <p className="mt-1.5 text-[11px] text-muted-soft">
        Accepted: {ACCEPTED_FILE_LABEL}
        {hint ? ` · ${hint}` : ''}
      </p>

      {files.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas/60 px-3 py-2"
            >
              <span className="min-w-0 truncate text-[12px] font-medium text-ink">{file.name}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] text-muted">{fileSizeLabel(file.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="focus-ring rounded px-1.5 py-0.5 text-[11px] font-semibold text-bad-ink hover:bg-bad/10"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
