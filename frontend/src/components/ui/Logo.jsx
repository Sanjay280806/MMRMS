import { cx } from '../../lib/tone.js';

/** The MMRMS mark — an indigo tile with the institution's initial. */
export function Logo({ className, size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8 rounded-[9px] text-sm',
    md: 'h-9 w-9 rounded-[10px] text-base',
    lg: 'h-10 w-10 rounded-[11px] text-lg',
  };

  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex items-center justify-center bg-brand-500 font-bold tracking-[-.02em] text-white shadow-raised',
        sizes[size],
        className,
      )}
    >
      M
    </span>
  );
}
