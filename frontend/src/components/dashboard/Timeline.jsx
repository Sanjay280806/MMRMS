import { EmptyState } from '../ui/EmptyState.jsx';
import { EVENT_TONE, tone as toneOf } from '../../lib/tone.js';

/** Vertical activity feed shared by both consoles. */
export function Timeline({ events }) {
  if (!events?.length) {
    return (
      <EmptyState
        title="Nothing in this view"
        description="Try a different filter to see more activity."
      />
    );
  }

  return (
    <ol className="relative">
      {events.map((event, i) => {
        const t = toneOf(EVENT_TONE[event.type] ?? 'slate');
        const isLast = i === events.length - 1;

        return (
          <li key={event.id ?? `${event.date}-${event.title}`} className="flex gap-4 pb-5 last:pb-0">
            <div className="relative flex flex-col items-center">
              <span
                aria-hidden="true"
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${t.bg}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${t.solid}`} />
              </span>
              {!isLast && <span aria-hidden="true" className="mt-1 w-px flex-1 bg-line" />}
            </div>

            <div className="-mt-0.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="tnum text-[11.5px] font-semibold text-muted-soft">
                  {event.date}
                </span>
                <span className={`text-[10.5px] font-semibold uppercase tracking-[.06em] ${t.text}`}>
                  {event.type}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-ink">{event.title}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
