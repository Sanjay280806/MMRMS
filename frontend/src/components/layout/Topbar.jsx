import { useAuth } from '../../auth/AuthContext.jsx';
import { Button } from '../ui/Button.jsx';

function greeting(name) {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${part}, ${name}`;
}

/** Page heading strip: title, contextual subtitle, actions, and sign-out. */
export function Topbar({ title, subtitle, actions, onMenu, greet }) {
  const { logout, user } = useAuth();
  const displayTitle = greet && user?.name ? greeting(user.name) : title;

  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-canvas/90 shadow-topbar backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open navigation"
            className="focus-ring rounded-xl border border-line bg-white px-2.5 py-2 text-ink shadow-inner transition-all duration-300 hover:border-brand-300 hover:shadow-pop lg:hidden"
          >
            <span aria-hidden="true" className="block h-0.5 w-4 bg-current shadow-[0_5px_0_currentColor,0_-5px_0_currentColor]" />
          </button>

          <div className="min-w-0">
            <h1 className="hero-title truncate">{displayTitle}</h1>
            {subtitle && <p className="hero-subtitle truncate">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {actions}
          <Button variant="secondary" size="sm" onClick={logout} title={`Signed in as ${user?.email}`}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
