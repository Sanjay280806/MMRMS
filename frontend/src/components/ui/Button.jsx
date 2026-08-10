import { cx } from '../../lib/tone.js';

const VARIANTS = {
  primary:
    'bg-brand-500 text-white shadow-raised hover:bg-brand-600 disabled:bg-brand-300 disabled:shadow-none',
  secondary:
    'border border-line-strong bg-white text-ink hover:border-muted-soft hover:bg-canvas disabled:text-muted-soft',
  ghost: 'text-muted hover:text-brand-500 disabled:text-muted-soft',
  dark: 'bg-ink text-white hover:bg-ink-soft disabled:bg-muted-soft',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-[13px] rounded-field',
  lg: 'w-full px-4 py-3.5 text-sm rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        'focus-ring inline-flex items-center justify-center gap-2 font-semibold transition',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-[2.5px] border-white/40 border-t-white"
    />
  );
}
