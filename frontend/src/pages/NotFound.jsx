import { Link } from 'react-router-dom';
import { Logo } from '../components/ui/Logo.jsx';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <Logo size="lg" />
      <h1 className="font-display text-[28px] font-semibold text-ink">Page not found</h1>
      <p className="max-w-sm text-[13px] text-muted">
        That route isn’t part of MMRMS. Head back to your workspace.
      </p>
      <Link
        to="/"
        className="focus-ring rounded-field bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-raised"
      >
        Go home
      </Link>
    </div>
  );
}
