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
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open navigation"
            className="focus-ring rounded-lg border border-line bg-white px-2.5 py-2 text-ink lg:hidden"
          >
            <span aria-hidden="true" className="block h-0.5 w-4 bg-current shadow-[0_5px_0_currentColor,0_-5px_0_currentColor]" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">
              {displayTitle}
            </h1>
            {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-muted">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <Button variant="secondary" size="sm" onClick={logout} title={`Signed in as ${user?.email}`}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
