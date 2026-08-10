import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { DefinitionList } from '../ui/DefinitionList.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { SectionCard } from '../ui/SectionCard.jsx';

/**
 * SMART goals. Progress is reviewed across meetings (Section 12), so goals
 * live alongside the meeting log rather than inside one meeting.
 */
export function GoalPanel({ goals, onAcknowledge, acknowledging, title = 'SMART Goals' }) {
  const completed = goals.filter((g) => g.status === 'Completed').length;
  const awaiting = goals.filter((g) => g.needsAcknowledgement).length;

  return (
    <SectionCard
      section="Section 12 · Goals"
      title={title}
      subtitle={`${completed} of ${goals.length} complete${
        awaiting ? ` · ${awaiting} awaiting acknowledgement` : ''
      }`}
    >
      {goals.length === 0 ? (
        <EmptyState title="No goals set" description="Goals agreed with your mentor appear here." />
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <li key={goal.id} className="rounded-xl border border-line bg-canvas/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink">{goal.text}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">
                    {goal.setBy === 'mentor' ? 'Assigned by mentor' : 'Self-set'} · due {goal.deadline}
                  </p>
                </div>
                <Badge tone={goal.tone}>{goal.status}</Badge>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <ProgressBar className="flex-1" percent={goal.percent} tone={goal.tone} height="h-1.5" />
                <span className="tnum text-[12px] font-semibold text-muted-strong">{goal.percent}%</span>
              </div>

              {(goal.specific || goal.measure) && (
                <div className="mt-3.5 border-t border-line pt-3">
                  <DefinitionList
                    columns={3}
                    items={[
                      { key: 'Specific', value: goal.specific },
                      { key: 'Measured by', value: goal.measure },
                      { key: 'Target', value: goal.target },
                    ]}
                  />
                </div>
              )}

              {goal.needsAcknowledgement && onAcknowledge && (
                <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                  <p className="flex-1 text-[11.5px] text-muted">
                    Your mentor assigned this goal — acknowledge it to confirm you have seen it.
                  </p>
                  <Button size="sm" loading={acknowledging === goal.id} onClick={() => onAcknowledge(goal.id)}>
                    Acknowledge
                  </Button>
                </div>
              )}

              {goal.setBy === 'mentor' && goal.acknowledged && !goal.done && (
                <p className="mt-3 border-t border-line pt-3 text-[11.5px] font-medium text-good-ink">
                  ✓ Acknowledged by student
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
