import { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { TextArea } from '../../../components/ui/Field.jsx';
import { api } from '../../../api/client.js';

export function Announcements() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await api('/announcements');
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setHistory(list);
    } catch {
      // Non-blocking for broadcast history
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await api('/announcements/broadcast', {
        method: 'POST',
        body: { message: trimmed },
      });

      const sentCount = res?.sentCount ?? res?.data?.sentCount;
      const isSuccess =
        res?.success === true ||
        sentCount !== undefined ||
        Boolean(res?.message?.includes?.('Broadcast')) ||
        Boolean(res?.data?.message?.includes?.('Broadcast'));

      if (isSuccess) {
        const count = typeof sentCount === 'number' ? sentCount : 0;
        const feedback =
          count > 0
            ? `Broadcast delivered to ${count} connected mentee${count === 1 ? '' : 's'}.`
            : 'Broadcast saved to announcements history (0 mentees currently connected).';
        setStatus({ type: 'success', text: feedback });
        setMessage('');
        fetchHistory();
      } else {
        const errorText = res?.error?.message || res?.message || res?.error || 'Failed to send broadcast.';
        setStatus({ type: 'error', text: errorText });
      }
    } catch (err) {
      const errText = err?.body?.error?.message || err?.body?.message || err?.message || 'Failed to send broadcast.';
      setStatus({ type: 'error', text: errText });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink mb-2">Broadcast Announcement</h2>
        <p className="text-sm text-muted mb-6">
          Send a real-time notification to all your currently connected mentees.
          They will see a popup and hear a notification sound immediately.
        </p>

        <div className="space-y-4">
          <TextArea
            label="Message"
            placeholder="Type your announcement here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />

          <div className="flex items-center gap-4">
            <Button onClick={handleSend} loading={sending} disabled={!message.trim()}>
              Send Broadcast
            </Button>
            {status && (
              <span className={`text-sm ${status.type === 'success' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}`}>
                {status.text}
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold text-ink mb-4">Broadcast History</h3>
        {loadingHistory ? (
          <p className="text-sm text-muted">Loading broadcast history...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted">No announcements broadcasted yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg border border-line bg-surface-subtle space-y-1"
              >
                <div className="flex justify-between items-center text-xs text-muted">
                  <span className="font-semibold text-ink">{item.mentorName || 'Mentor'}</span>
                  <span>{new Date(item.time).toLocaleString()}</span>
                </div>
                <p className="text-sm text-ink whitespace-pre-wrap">{item.message}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
