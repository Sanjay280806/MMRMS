import { cx, tone as toneOf } from '../../lib/tone.js';

/** Section 1C's 1–5 skill rating, drawn as filled pips. */
export function RatingMeter({ rating, max = 5, tone = 'indigo', showValue = true, className }) {
  const t = toneOf(tone);

  return (
    <span
      className={cx('inline-flex items-center gap-1.5', className)}
      role="img"
      aria-label={`${rating} out of ${max}`}
    >
      <span className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={cx(
              'h-2 w-5 rounded-full transition',
              i < rating ? t.solid : 'bg-line',
            )}
          />
        ))}
      </span>
      {showValue && (
        <span className="tnum text-[12px] font-semibold text-muted-strong">
          {rating}/{max}
        </span>
      )}
    </span>
  );
}

/** The same scale as a control the student can set. */
export function RatingInput({ value, max = 5, onChange, disabled, label }) {
  return (
    <span className="inline-flex items-center gap-1" role="radiogroup" aria-label={label}>
      {Array.from({ length: max }, (_, i) => {
        const rating = i + 1;
        const active = rating <= value;
        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${rating} of ${max}`}
            disabled={disabled}
            onClick={() => onChange(rating)}
            className={cx(
              'focus-ring h-6 w-7 rounded-md border text-[11px] font-semibold transition',
              active
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-line-strong bg-white text-muted-soft hover:border-brand-300',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {rating}
          </button>
        );
      })}
    </span>
  );
}
