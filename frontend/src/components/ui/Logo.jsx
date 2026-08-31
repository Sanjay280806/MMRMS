import { cx } from '../../lib/tone.js';

/** The MMRMS mark — gradient tile with the institution's initial. */
export function Logo({ className, size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8 rounded-[10px] text-sm',
    md: 'h-9 w-9 rounded-[11px] text-base',
    lg: 'h-11 w-11 rounded-xl text-lg',
  };

  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex items-center justify-center bg-brand-gradient font-bold tracking-[-.02em] text-white shadow-glow transition-all duration-300',
        sizes[size],
        className,
      )}
    >
      M
    </span>
  );
}
