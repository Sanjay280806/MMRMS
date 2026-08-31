import { useId } from 'react';
import { cx } from '../../lib/tone.js';

export function TextField({ label, hint, trailing, className, ...rest }) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input id={id} className={cx('input-field', trailing && 'pr-16')} {...rest} />
        {trailing && (
          <div className="absolute inset-y-0 right-2.5 flex items-center">{trailing}</div>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[11.5px] text-muted-soft">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, className, rows = 4, ...rest }) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <textarea id={id} rows={rows} className={cx('input-field resize-y')} {...rest} />
    </div>
  );
}

export function Label({ htmlFor, children, className }) {
  if (!children) return null;
  return (
    <label htmlFor={htmlFor} className={cx('input-label', className)}>
      {children}
    </label>
  );
}

/** Single-select chip row — used for role, category and priority pickers. */
export function ChipGroup({ label, options, value, onChange, toneFor, className }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const key = typeof option === 'string' ? option : option.value;
          const text = typeof option === 'string' ? option : option.label;
          const selected = key === value;
          const selectedClass = toneFor?.(key) ?? 'border-transparent bg-brand-gradient text-white shadow-raised';

          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(key)}
              className={cx(
                'focus-ring rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-300',
                selected
                  ? selectedClass
                  : 'border-line bg-white text-muted shadow-inner hover:-translate-y-0.5 hover:border-brand-300 hover:text-ink hover:shadow-pop',
              )}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
