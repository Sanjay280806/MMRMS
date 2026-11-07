import { useState, useRef, useEffect } from 'react';
import { cx } from '../../lib/tone.js';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

/**
 * Microsoft Teams-styled chat component for Mentoring communication.
 * Provides clear visualization, left/right alignment, sender names,
 * message delivery/sent indicators, and real-time messaging.
 */
export function TeamsChat({
  messages = [],
  selfRole = 'mentor',
  mentorName = 'Dr. Bharathi Priya',
  menteeName = 'Mentee',
  menteeRoll = '',
  menteeInitials = '',
  onSend,
  showHeader = true,
  height = '520px',
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  async function handleSend(e) {
    e?.preventDefault?.();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await onSend?.(text);
      setDraft('');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const initials = (name = '') =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  const effectiveMenteeInitials = menteeInitials || initials(menteeName) || 'ST';
  const effectiveMentorInitials = initials(mentorName) || 'BP';

  return (
    <div
      className="flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
      style={{ height }}
    >
      {/* Teams Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#5B5FC7]/15 text-[#5B5FC7] font-semibold text-sm flex items-center justify-center border border-[#5B5FC7]/25 shadow-xs">
                {effectiveMenteeInitials}
              </div>
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white"
                title="Active"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-slate-900 leading-tight">
                  {menteeName}
                </h3>
                {menteeRoll && (
                  <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60">
                    {menteeRoll}
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Direct Mentoring Channel · <span className="font-medium text-slate-700">{mentorName}</span> (Mentor)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4 bg-[#F5F6F8]/60">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#5B5FC7]/10 text-[#5B5FC7] flex items-center justify-center text-2xl mb-3 shadow-xs">
              💬
            </div>
            <h4 className="text-[14px] font-semibold text-slate-800">
              No messages with {menteeName} yet
            </h4>
            <p className="text-[12.5px] text-slate-500 max-w-sm mt-1">
              Start the mentoring dialogue below. You can share guidance, discuss semester progress, or schedule reviews.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-md">
              <button
                type="button"
                onClick={() => setDraft('Hello! Please review your recent internal marks and let me know if you need help.')}
                className="text-[11.5px] px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-full border border-slate-200 shadow-xs transition"
              >
                👋 Check internal marks
              </button>
              <button
                type="button"
                onClick={() => setDraft('Let’s schedule our regular mentoring review meeting this week.')}
                className="text-[11.5px] px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-full border border-slate-200 shadow-xs transition"
              >
                📅 Schedule mentoring review
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Conversation Date Divider */}
            <div className="flex items-center justify-center my-2">
              <span className="text-[11px] font-medium text-slate-400 bg-white/90 border border-slate-200/80 px-3 py-0.5 rounded-full shadow-2xs">
                Mentoring Conversation History
              </span>
            </div>

            {messages.map((m) => {
              const isMine = m.from === selfRole;
              const senderDisplayName = isMine
                ? `${mentorName} (Mentor)`
                : `${menteeName} (Student)`;

              return (
                <div
                  key={m.id}
                  className={cx(
                    'flex items-end gap-2.5 transition-all',
                    isMine ? 'justify-end' : 'justify-start',
                  )}
                >
                  {/* Student Avatar (Left side) */}
                  {!isMine && (
                    <div
                      className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center shrink-0 mb-1 border border-slate-300/80 shadow-2xs"
                      title={menteeName}
                    >
                      {effectiveMenteeInitials}
                    </div>
                  )}

                  <div className={cx('flex flex-col max-w-[85%] sm:max-w-[72%]', isMine ? 'items-end' : 'items-start')}>
                    {/* Sender Name Header */}
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-medium text-slate-600">
                        {isMine ? 'You (Mentor)' : menteeName}
                      </span>
                      <span className="text-[10px] text-slate-400">·</span>
                      <span className="text-[10.5px] text-slate-400">
                        {m.time}
                      </span>
                    </div>

                    {/* Chat Bubble */}
                    <div
                      className={cx(
                        'px-4 py-2.5 text-[13px] leading-relaxed shadow-xs transition-shadow',
                        isMine
                          ? 'bg-[#5B5FC7] text-white rounded-2xl rounded-br-[4px]'
                          : 'bg-white text-slate-900 border border-slate-200/90 rounded-2xl rounded-bl-[4px]',
                      )}
                    >
                      <p className="whitespace-pre-wrap select-text break-words font-normal">
                        {m.text}
                      </p>

                      {/* Bubble Footer Status */}
                      <div
                        className={cx(
                          'mt-1.5 flex items-center gap-1 text-[10px]',
                          isMine ? 'justify-end text-white/70' : 'justify-start text-slate-400',
                        )}
                      >
                        {isMine ? (
                          <>
                            <span>Sent by Mentor</span>
                            <span className="text-white font-bold text-[11px]" title="Delivered">✓✓</span>
                          </>
                        ) : (
                          <>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-0.5" />
                            <span>Delivered by Mentee</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mentor Avatar (Right side) */}
                  {isMine && (
                    <div
                      className="w-7 h-7 rounded-full bg-[#5B5FC7] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mb-1 shadow-2xs"
                      title={mentorName}
                    >
                      {effectiveMentorInitials}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Teams Composer */}
      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 bg-white border-t border-slate-200"
      >
        <div className="rounded-xl border border-slate-300 focus-within:border-[#5B5FC7] focus-within:ring-2 focus-within:ring-[#5B5FC7]/20 transition-all bg-white p-2.5">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type a message to ${menteeName}… (Press Enter to send)`}
            aria-label="Message"
            className="w-full resize-none text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono text-[10px]">Enter ↵</kbd> to send</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono text-[10px]">Shift + Enter</kbd> for new line</span>
            </div>

            <Button
              type="submit"
              size="sm"
              loading={sending}
              disabled={!draft.trim()}
              className="bg-[#5B5FC7] hover:bg-[#4d51ab] text-white text-[12.5px] font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition"
            >
              <svg className="w-3.5 h-3.5 rotate-90" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
