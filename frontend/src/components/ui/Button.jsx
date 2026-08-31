import { cx } from '../../lib/tone.js';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  dark: 'btn-dark',
};

const SIZES = {
  sm: 'px-3.5 py-2 text-xs rounded-xl',
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
      className={cx(VARIANTS[variant], SIZES[size], className)}
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
