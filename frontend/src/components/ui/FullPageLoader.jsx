export function FullPageLoader({ label = 'Loading your workspace…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-500"
        />
        <p className="text-[12.5px] text-muted">{label}</p>
      </div>
    </div>
  );
}
