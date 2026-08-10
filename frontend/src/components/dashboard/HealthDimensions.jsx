import { ProgressBar } from '../ui/ProgressBar.jsx';

/** The five weighted dimensions behind a health index. */
export function HealthDimensions({ dimensions, showWeights = false }) {
  return (
    <ul className="space-y-3.5">
      {dimensions.map((d) => (
        <li key={d.key ?? d.name}>
          <ProgressBar
            percent={d.value}
            tone={d.tone}
            label={
              showWeights ? (
                <>
                  {d.name}
                  <span className="ml-1.5 text-[11px] text-muted-soft">
                    ×{d.weight.toFixed(2)}
                  </span>
                </>
              ) : (
                d.name
              )
            }
            value={d.value}
          />
        </li>
      ))}
    </ul>
  );
}
