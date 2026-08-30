export const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_FILE_LABEL = 'PDF, JPG, JPEG, PNG';
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function fileSizeLabel(size) {
  return `${Math.max(1, Math.ceil(size / 1024))} KB`;
}

export function formatUploadDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function filesToEvidencePayload(files) {
  const payload = [];
  for (const file of files) {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      throw new Error(`${file.name}: choose a PDF, JPG, JPEG, or PNG file.`);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`${file.name}: must be smaller than 4 MB.`);
    }
    payload.push({
      name: file.name,
      contentType: file.type,
      size: file.size,
      dataUrl: await fileToDataUrl(file),
    });
  }
  return payload;
}
