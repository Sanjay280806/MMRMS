import { ProgressBar } from '../ui/ProgressBar.jsx';
import { SectionCard } from '../ui/SectionCard.jsx';
import { cx, tone as toneOf } from '../../lib/tone.js';

/**
 * The derived health index. Each dimension names the record-book section it
 * is computed from, so the number is auditable rather than magical.
 */
export function HealthPanel({ health, className }) {
  return (
    <SectionCard
      title="Health Index"
      subtitle="Derived from the record book — not a separate assessment"
      action={
        <span className={cx('tnum font-display text-[26px] font-semibold', toneOf(health.tone).text)}>
          {health.index}
        </span>
      }
      className={className}
    >
      <ul className="space-y-4">
        {health.dimensions.map((d) => (
          <li key={d.key}>
            <ProgressBar
              percent={d.value}
              tone={d.tone}
              value={d.value}
              label={
                <>
                  {d.name}
                  <span className="ml-1.5 text-[11px] text-muted-soft">×{d.weight.toFixed(2)}</span>
                </>
              }
            />
            <p className="mt-1 text-[11px] text-muted-soft">{d.source}</p>
          </li>
        ))}
      </ul>

      <p className="mt-5 rounded-xl bg-warn/[0.09] px-4 py-3 text-[12.5px] leading-relaxed text-warn-ink">
        {health.weakest.explanation}
      </p>
    </SectionCard>
  );
}
