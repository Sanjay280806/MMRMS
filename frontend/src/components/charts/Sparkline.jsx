import { linePoints } from '../../lib/chart.js';
import { tone as toneOf } from '../../lib/tone.js';

/** Tiny inline trend for stat tiles. */
export function Sparkline({ values, tone = 'indigo', width = 76, height = 32, ariaLabel }) {
  const stroke = toneOf(tone).stroke;
  const { line } = linePoints(values, { width, height, padTop: 4, padBottom: 4 });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      role="img"
      aria-label={ariaLabel ?? `Sparkline ending at ${values.at(-1)}`}
    >
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
