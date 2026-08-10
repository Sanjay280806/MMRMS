import { conicStops } from '../../lib/chart.js';
import { tone as toneOf } from '../../lib/tone.js';

/** Proportion donut with a centred total. Segments: [{ name, count, tone }]. */
export function DonutChart({ segments, total, caption, size = 168 }) {
  const stops = conicStops(
    segments.map((s) => ({ count: s.count, stroke: toneOf(s.tone).stroke })),
  );

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative shrink-0 rounded-full"
        style={{ width: size, height: size, background: `conic-gradient(${stops})` }}
        role="img"
        aria-label={segments.map((s) => `${s.name}: ${s.count}`).join(', ')}
      >
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white">
          <span className="tnum font-display text-[26px] font-semibold leading-none text-ink">
            {total}
          </span>
          {caption && <span className="mt-1 text-[11px] text-muted-soft">{caption}</span>}
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2.5">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: toneOf(s.tone).stroke }}
            />
            <span className="flex-1 truncate text-[12.5px] text-muted-strong">{s.name}</span>
            <span className="tnum text-[12.5px] font-semibold text-ink">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
