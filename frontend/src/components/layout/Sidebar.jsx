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
          className="fixed inset-0 z-30 bg-ink-deep/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
        />
      )}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-ink text-white shadow-[4px_0_24px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-smooth',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-sidebar-glow"
        />

        <div className="relative flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-5 py-5">
          <Logo />
          <div className="leading-tight">
            <div className="font-display text-[16px] font-semibold tracking-[.01em]">MMRMS</div>
            <div className="text-[10.5px] tracking-[.06em] text-white/40">{product}</div>
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
              'relative mx-4 mb-4 mt-4 shrink-0 rounded-xl p-3.5 text-left transition-all duration-300',
              value === identity.navKey
                ? 'bg-brand-gradient-subtle ring-1 ring-brand-500/25 shadow-inner'
                : 'bg-white/[0.04] hover:bg-white/[0.07] hover:shadow-inner',
            )}
          >
            <div className="flex items-center gap-3">
              <Avatar initials={identity.initials} size="md" variant="bg-brand-gradient text-white shadow-glow" />
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

        <nav className="sidebar-scroll relative min-h-0 flex-1 overflow-y-auto px-3 pb-5" aria-label="Record book sections">
          {groups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="px-3 pb-1.5 pt-2 text-[9.5px] font-bold uppercase tracking-[.14em] text-white/28">
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
                      className={cx('nav-item', active ? 'nav-item-active' : 'nav-item-inactive')}
                    >
                      {active && <span aria-hidden="true" className="nav-indicator" />}
                      <span
                        aria-hidden="true"
                        className={cx(
                          'ml-1 h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300',
                          active ? 'bg-brand-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]' : 'bg-white/15',
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge > 0 && (
                        <span
                          className={cx(
                            'tnum shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-pop animate-badgePop',
                            item.badgeTone === 'rose'
                              ? 'bg-bad text-white'
                              : 'bg-brand-gradient text-white',
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
