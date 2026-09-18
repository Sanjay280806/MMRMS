import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { api } from '../../api/client.js';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

export function AnnouncementsHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const res = await api('/announcements');
        if (res.success) {
          setHistory(res.data);
        } else {
          setError('Failed to fetch announcements.');
        }
      } catch (err) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    fetchAnnouncements();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted">Loading announcements...</div>;
  }

  if (error) {
    return <EmptyState title="Could not load announcements" description={error} icon="!" />;
  }

  if (history.length === 0) {
    return <EmptyState title="No announcements" description="You don't have any announcements yet." icon="📭" />;
  }

  return (
    <div className="space-y-4">
      {history.map((ann) => (
        <Card key={ann.id} className="p-5 flex flex-col space-y-2 border border-line bg-white">
          <div className="flex justify-between items-start">
            <span className="font-semibold text-[14px] text-ink">{ann.mentorName}</span>
            <span className="text-[12px] text-muted">{new Date(ann.time).toLocaleString()}</span>
          </div>
          <p className="text-[13.5px] text-ink leading-relaxed whitespace-pre-wrap">{ann.message}</p>
        </Card>
      ))}
    </div>
  );
}
