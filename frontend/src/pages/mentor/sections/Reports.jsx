import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { StatTile } from '../../../components/ui/StatTile.jsx';
import { useResource } from '../../../hooks/useResource.js';
import { tone as toneOf } from '../../../lib/tone.js';

/** Term-level reporting — the accreditation evidence view. */
export function Reports() {
  const { data, loading, error } = useResource('/mentor/me/reports');

  if (error) return <EmptyState title="Couldn't load reports" description={error.message} icon="!" />;

  if (loading && !data) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {data.map((card) => (
        <StatTile
          key={card.key}
          label={card.key}
          value={card.value}
          footer={<span className={toneOf(card.tone).text}>{card.note}</span>}
        />
      ))}
    </div>
  );
}
