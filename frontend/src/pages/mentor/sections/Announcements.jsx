import { useState } from 'react';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { TextArea } from '../../../components/ui/Field.jsx';
import { api } from '../../../api/client.js';

export function Announcements() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await api('/announcements/broadcast', {
        method: 'POST',
        body: { message },
      });
      if (res.success) {
        setStatus({ type: 'success', text: 'Broadcast sent.' });
        setMessage('');
      } else {
        setStatus({ type: 'error', text: 'Failed to send broadcast.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'An error occurred' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-ink mb-2">Broadcast Announcement</h2>
      <p className="text-sm text-muted mb-6">
        Send a real-time notification to all your currently connected mentees.
        They will see a popup and hear a notification sound.
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
            <span className={`text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {status.text}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
