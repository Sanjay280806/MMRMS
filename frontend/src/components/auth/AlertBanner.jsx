import { cx, tone as toneOf } from '../../lib/tone.js';

/** Inline form banner for errors and lockout notices. */
export function AlertBanner({ tone = 'rose', title, description, className }) {
  const t = toneOf(tone);

  return (
    <div
      role="alert"
      className={cx('alert-banner animate-badgePop', t.bg, t.border, className)}
    >
      <span
        aria-hidden="true"
        className={cx(
          'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-pop',
          t.solid,
        )}
      >
        !
      </span>
      <div className="min-w-0 leading-snug">
        <p className={cx('text-[12.5px] font-semibold', t.text)}>{title}</p>
        {description && <p className={cx('mt-0.5 text-[12px]', t.text, 'opacity-80')}>{description}</p>}
      </div>
    </div>
  );
}
