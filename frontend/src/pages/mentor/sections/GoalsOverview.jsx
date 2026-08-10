import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { ProgressBar } from '../../../components/ui/ProgressBar.jsx';
import { SectionCard } from '../../../components/ui/SectionCard.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { DonutChart } from '../../../components/charts/DonutChart.jsx';
import { useResource } from '../../../hooks/useResource.js';

/** SMART goals across the roster. */
export function GoalsOverview({ onOpenMentee }) {
  const { data, loading, error } = useResource('/mentor/me/goals');

  if (error) return <EmptyState title="Couldn't load goals" description={error.message} icon="!" />;
  if (loading && !data) return <Skeleton className="h-80 rounded-card" />;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <SectionCard
        section="Section 12 · Goals"
        title="Goal Mix"
        subtitle={`${data.total} goals across your mentees`}
      >
        {data.total ? (
          <DonutChart segments={data.summary} total={data.total} caption="goals" />
        ) : (
          <EmptyState title="No goals set" description="Agree SMART goals at the next meeting." />
        )}

        {data.awaitingAcknowledgement > 0 && (
          <p className="mt-5 rounded-xl bg-warn/[0.1] px-4 py-3 text-[12.5px] leading-relaxed text-warn-ink">
            <strong className="font-semibold">{data.awaitingAcknowledgement}</strong> assigned goal
            {data.awaitingAcknowledgement === 1 ? ' is' : 's are'} still waiting for the student to
            acknowledge.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Goals In Flight" subtitle="Every active goal, by student" className="lg:col-span-2">
        {data.items.length === 0 ? (
          <EmptyState title="Nothing in flight" description="Assigned goals appear here." />
        ) : (
          <ul className="space-y-3">
            {data.items.map((goal, i) => (
              <li key={goal.id} className="rounded-xl border border-line bg-canvas/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenMentee(goal.studentId)}
                    className="focus-ring flex min-w-0 items-center gap-2.5 rounded text-left"
                  >
                    <Avatar initials={goal.initials} seed={i} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">{goal.text}</p>
                      <p className="truncate text-[11.5px] text-muted">
                        {goal.student} · due {goal.deadline}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {goal.needsAcknowledgement && <Badge tone="amber">Not acknowledged</Badge>}
                    <Badge tone={goal.tone}>{goal.status}</Badge>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar className="flex-1" percent={goal.percent} tone={goal.tone} height="h-1.5" />
                  <span className="tnum text-[12px] font-semibold text-muted-strong">{goal.percent}%</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
