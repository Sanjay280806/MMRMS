import { cx } from '../../lib/tone.js';
import { Avatar } from '../ui/Avatar.jsx';
import { Logo } from '../ui/Logo.jsx';

/**
 * Dark navigation rail. `groups` is `[{ label, items: [{ key, label, badge }] }]`
 * so every record-book section is reachable in one click, grouped the way the
 * printed book is ordered.
 */
export function Sidebar({ product, groups, value, onChange, identity, open, onClose }) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
        />
      )}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-ink text-white transition-transform',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex shrink-0 items-center gap-3 px-5 py-5">
          <Logo />
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-[.02em]">MMRMS</div>
            <div className="text-[10.5px] tracking-[.05em] text-white/45">{product}</div>
          </div>
        </div>

        {identity && (
          <button
            type="button"
            onClick={() => {
              onChange(identity.navKey);
              onClose?.();
            }}
            className={cx(
              'mx-4 mb-4 shrink-0 rounded-xl p-3.5 text-left transition',
              value === identity.navKey
                ? 'bg-white/[0.09] ring-1 ring-white/15'
                : 'bg-white/[0.05] hover:bg-white/[0.08]',
            )}
          >
            <div className="flex items-center gap-3">
              <Avatar initials={identity.initials} size="md" variant="bg-brand-500 text-white" />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">{identity.name}</div>
                <div className="truncate text-[11px] text-white/45">{identity.meta}</div>
              </div>
            </div>
            {identity.note && (
              <div className="mt-3 border-t border-white/10 pt-2.5 text-[11px] text-white/50">
                {identity.note}
              </div>
            )}
          </button>
        )}

        <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-5" aria-label="Record book sections">
          {groups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="px-3 pb-1.5 pt-2 text-[9.5px] font-bold uppercase tracking-[.12em] text-white/30">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.key === value;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => {
                        onChange(item.key);
                        onClose?.();
                      }}
                      className={cx(
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] transition',
                        active
                          ? 'bg-white/[0.08] font-semibold text-white'
                          : 'text-white/55 hover:bg-white/[0.04] hover:text-white',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          'h-1.5 w-1.5 shrink-0 rounded-full transition',
                          active ? 'bg-brand-500' : 'bg-white/15',
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge > 0 && (
                        <span
                          className={cx(
                            'tnum shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                            item.badgeTone === 'rose' ? 'bg-bad text-white' : 'bg-brand-500 text-white',
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
