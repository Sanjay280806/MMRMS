import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Logo } from '../components/ui/Logo.jsx';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas px-6 text-center animate-fadeRise">
      <Logo size="lg" />
      <h1 className="hero-title">Page not found</h1>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted">
        That route isn’t part of MMRMS. Head back to your workspace.
      </p>
      <Link to="/">
        <Button>Go home</Button>
      </Link>
    </div>
  );
}
