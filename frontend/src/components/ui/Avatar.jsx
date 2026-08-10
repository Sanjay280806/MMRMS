import { cx } from '../../lib/tone.js';

/** Initials avatar. The palette is deterministic so a person keeps a colour. */
const PALETTE = [
  'bg-brand-50 text-brand-500',
  'bg-bad-tint text-bad-ink',
  'bg-warn-tint text-warn-ink',
  'bg-good-tint text-good-ink',
];

const SIZES = {
  sm: 'h-8 w-8 text-[11px] rounded-[9px]',
  md: 'h-10 w-10 text-[12.5px] rounded-[11px]',
  lg: 'h-14 w-14 text-base rounded-[14px]',
};

export function Avatar({ initials, seed = 0, size = 'md', className, variant }) {
  const palette = variant ?? PALETTE[Math.abs(seed) % PALETTE.length];
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-semibold tracking-[.02em]',
        SIZES[size],
        palette,
        className,
      )}
    >
      {initials}
    </span>
  );
}
