import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';
import { ParentInteractionLog } from '../../../components/record/Growth.jsx';
import { useResource } from '../../../hooks/useResource.js';

/** Section 11 across the roster. */
export function ParentLog() {
  const { data, loading, error } = useResource('/mentor/me/parent-log');

  if (error) return <EmptyState title="Couldn't load the parent log" description={error.message} icon="!" />;
  if (loading && !data) return <Skeleton className="h-80 rounded-card" />;

  return <ParentInteractionLog parentInteractions={data} showStudent />;
}
