import { useCountUp } from '../../hooks/useCountUp.js';
import { tone as toneOf } from '../../lib/tone.js';

/** Circular progress ring with a value in the middle. */
export function GaugeRing({
  value,
  max = 100,
  tone = 'indigo',
  size = 120,
  thickness = 10,
  label,
  ariaLabel,
}) {
  const animated = useCountUp(value);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, animated / max));
  const stroke = toneOf(tone).stroke;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={ariaLabel ?? `${Math.round(value)} out of ${max}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ECECEF"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum font-display text-[24px] font-semibold leading-none text-ink">
          {Math.round(animated)}
        </span>
        {label && (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[.08em] text-muted-soft">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
