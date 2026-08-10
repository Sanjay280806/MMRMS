import { useMemo, useState } from 'react';
import { SectionCard } from '../../../components/ui/SectionCard.jsx';
import { Tabs } from '../../../components/ui/Tabs.jsx';
import { Timeline } from '../../../components/dashboard/Timeline.jsx';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'arrear', label: 'Arrears' },
  { value: 'wellbeing', label: 'Well-being' },
  { value: 'parent', label: 'Parents' },
  { value: 'goal', label: 'Goals' },
];

export function ActivityTimeline({ events }) {
  const [filter, setFilter] = useState('all');

  const visible = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.type === filter)),
    [events, filter],
  );

  return (
    <SectionCard
      title="Activity Timeline"
      subtitle="Everything recorded across your mentees this term"
      action={<Tabs size="sm" items={FILTERS} value={filter} onChange={setFilter} />}
    >
      <Timeline events={visible} />
    </SectionCard>
  );
}
