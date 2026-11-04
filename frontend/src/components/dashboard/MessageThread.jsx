import { useState, useRef, useEffect } from 'react';
import { cx } from '../../lib/tone.js';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

/** Chat thread with a composer. `selfRole` decides which side a bubble sits on. */
export function MessageThread({ messages = [], selfRole, onSend }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  async function send(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await onSend(text);
      setDraft('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-[360px] justify-between">
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[360px] min-h-[220px]">
        {messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Start the conversation below." icon="✉" />
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const mine = m.from === selfRole;
              return (
                <li key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cx(
                      'max-w-[85%] px-3.5 py-2.5',
                      mine
                        ? 'rounded-[14px] rounded-br-[4px] bg-brand-500 text-white shadow-xs'
                        : 'rounded-[14px] rounded-bl-[4px] bg-canvas text-ink border border-line-soft',
                    )}
                  >
                    <p className="text-[12.5px] leading-relaxed">{m.text}</p>
                    <p
                      className={cx(
                        'mt-1 text-[10.5px]',
                        mine ? 'text-white/60' : 'text-muted-soft',
                      )}
                    >
                      {m.time}
                    </p>
                  </div>
                </li>
              );
            })}
            <div ref={bottomRef} />
          </ul>
        )}
      </div>

      <form className="mt-4 pt-3 border-t border-line flex items-center gap-2" onSubmit={send}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          aria-label="Message"
          className="w-full rounded-field border-[1.5px] border-line-strong bg-white px-3.5 py-2.5 text-[13px] text-ink placeholder:text-muted-soft focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
        <Button type="submit" size="md" loading={sending} disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
