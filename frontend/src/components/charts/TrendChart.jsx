import { useId } from 'react';
import { linePoints } from '../../lib/chart.js';
import { tone as toneOf } from '../../lib/tone.js';

/**
 * Line + area trend with dots and an x-axis label row. Scales to its container
 * via a viewBox, so the same component serves both dashboards' 8-week charts.
 */
export function TrendChart({
  series,
  tone = 'indigo',
  height = 220,
  width = 1000,
  min,
  max,
  ariaLabel,
}) {
  const gradientId = useId();
  const stroke = toneOf(tone).stroke;
  const values = series.map((d) => d.value);

  const pad = (Math.max(...values) - Math.min(...values)) * 0.35 || 4;
  const { points, line, area } = linePoints(values, {
    width,
    height,
    min: min ?? Math.min(...values) - pad,
    max: max ?? Math.max(...values) + pad,
  });

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-[180px] w-full"
        role="img"
        aria-label={ariaLabel ?? `Trend from ${values[0]} to ${values.at(-1)}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 6 : 4}
            fill="#fff"
            stroke={stroke}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <figcaption className="mt-2 flex justify-between text-[11px] text-muted-soft">
        {series.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </figcaption>
    </figure>
  );
}
