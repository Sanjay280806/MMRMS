import { useState, useMemo, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { cx } from '../../lib/tone.js';

export function TeamsBroadcastModal({
  students = [],
  mentorName = 'Dr. Bharathi Priya',
  mentorEmail = 'bharathi.priya@kct.ac.in',
  existingGroup = null,
  onClose,
  onSent,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentResult, setSentResult] = useState(null);
  const [error, setError] = useState(null);
  const [teamsGroupInfo, setTeamsGroupInfo] = useState(existingGroup);

  // Check if group already exists on load
  useEffect(() => {
    if (!teamsGroupInfo) {
      api('/mentor/me/teams/group')
        .then((res) => {
          if (res?.exists && res?.group) {
            setTeamsGroupInfo(res.group);
          }
        })
        .catch(() => {});
    }
  }, [teamsGroupInfo]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase();
      return (
        !q ||
        s.menteeName?.toLowerCase().includes(q) ||
        s.rollNumber?.toLowerCase().includes(q) ||
        s.teamsEmail?.toLowerCase().includes(q)
      );
    });
  }, [students, search]);

  const isAllSelected = selectedIds.length > 0 && selectedIds.length === students.length;

  function toggleStudent(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    setSelectedIds(students.map((s) => s.menteeId));
  }

  function handleSelectTop5() {
    setSelectedIds(students.slice(0, 5).map((s) => s.menteeId));
  }

  function handleClear() {
    setSelectedIds([]);
  }

  async function handleSend() {
    if (selectedIds.length === 0 || !messageText.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await api('/mentor/me/teams/broadcast', {
        method: 'POST',
        body: {
          studentIds: selectedIds,
          text: messageText.trim(),
        },
      });
      setSentResult(res);
      if (res?.teamsGroup) {
        setTeamsGroupInfo(res.teamsGroup);
      }
      onSent?.(res);
    } catch (err) {
      setError(err.message || 'Failed to send Teams message');
    } finally {
      setSending(false);
    }
  }

  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedIds.includes(s.menteeId));
  }, [students, selectedIds]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#3a3f85] to-[#5B5FC7] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 7.5h-5v5h5v-5zm0-4.5h-5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V5.5A2.5 2.5 0 0 0 19.5 3zM9.5 5.5h-5a2.5 2.5 0 0 0-2.5 2.5v8a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 9.5 5.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[16px] font-bold leading-tight">Message through Teams</h2>
              <p className="text-[12px] text-white/80">
                Broadcast message to multiple students via Microsoft Teams & MMRMS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Sender Info Banner */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-[12px] text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">From Mentor:</span>
            <span className="text-slate-700">{mentorName}</span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-[#5B5FC7] bg-[#5B5FC7]/10 px-2 py-0.5 rounded border border-[#5B5FC7]/20">
              {mentorEmail}
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Teams Connected
          </span>
        </div>

        {/* Success State */}
        {sentResult ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto shadow-xs">
              ✓
            </div>
            <h3 className="text-lg font-bold text-slate-900">Message Delivered Successfully!</h3>
            
            {sentResult.isAllStudents ? (
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 max-w-md mx-auto text-left space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👥</span>
                  <p className="text-[13px] font-bold text-indigo-950">
                    {sentResult.isFirstTimeGroup ? '✨ New Microsoft Teams Group Created' : '🔄 Sent to Existing Teams Group'}
                  </p>
                </div>
                <p className="text-[12px] text-indigo-900 leading-relaxed">
                  {sentResult.isFirstTimeGroup ? (
                    <>
                      Created persistent group <strong>"{sentResult.teamsGroup?.topic}"</strong> with all 33 mentees. Every future message sent to all 33 will use this same group.
                    </>
                  ) : (
                    <>
                      Delivered to existing group <strong>"{sentResult.teamsGroup?.topic}"</strong> (Message #{sentResult.teamsGroup?.messageCount}). No duplicate group was created!
                    </>
                  )}
                </p>
                <div className="text-[11px] font-mono text-indigo-700 bg-white/80 p-2 rounded border border-indigo-100">
                  Group ID: {sentResult.teamsGroup?.id}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your message was sent to{' '}
                <strong className="text-slate-900">{sentResult.recipientCount} students</strong> via
                Microsoft Teams and recorded in MMRMS.
              </p>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-w-md mx-auto text-left space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Recipients ({sentResult.recipientCount} Teams Mail IDs):
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                {sentResult.recipients?.map((r) => (
                  <span
                    key={r.id}
                    className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700"
                  >
                    {r.name} ({r.teamsEmail})
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              {sentResult.teamsDeepLink && (
                <a
                  href={sentResult.teamsDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#5B5FC7] hover:bg-[#4d51ab] text-white text-sm font-medium rounded-xl flex items-center gap-2 shadow-xs transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.5 7.5h-5v5h5v-5zm0-4.5h-5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V5.5A2.5 2.5 0 0 0 19.5 3zM9.5 5.5h-5a2.5 2.5 0 0 0-2.5 2.5v8a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 9.5 5.5z" />
                  </svg>
                  {sentResult.isAllStudents ? 'Open in Teams Group Chat ↗' : 'Open in Microsoft Teams App ↗'}
                </a>
              )}
              <Button size="md" variant="secondary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Search & Actions Bar */}
            <div className="px-6 pt-4 pb-3 space-y-3 bg-white">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by student name, roll number, or Teams email…"
                    className="w-full pl-9 pr-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/20 focus:border-[#5B5FC7] transition"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectTop5}
                    className="text-[11.5px] px-2.5 py-1.5 bg-[#5B5FC7]/10 hover:bg-[#5B5FC7]/20 text-[#5B5FC7] font-medium rounded-lg border border-[#5B5FC7]/20 transition"
                  >
                    Select 5
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={cx(
                      'text-[11.5px] px-2.5 py-1.5 font-medium rounded-lg transition',
                      isAllSelected
                        ? 'bg-[#5B5FC7] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    )}
                  >
                    Select All ({students.length})
                  </button>
                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-[11.5px] px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 font-medium rounded-lg transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Persistent Teams Group Notification when All 33 are Selected */}
              {isAllSelected && (
                <div className="p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-[12px] animate-fadeIn">
                  <div className="text-base shrink-0 mt-0.5">👥</div>
                  <div className="flex-1">
                    {teamsGroupInfo ? (
                      <>
                        <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                          <span>Existing Teams Group Detected:</span>
                          <span className="underline decoration-indigo-400 font-semibold">
                            {teamsGroupInfo.topic}
                          </span>
                        </p>
                        <p className="text-indigo-800 mt-0.5 leading-snug">
                          All 33 students selected. This message will be posted into the <strong>same Teams group</strong> created previously. No duplicate group will be created.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                          <span>First-Time Broadcast to All {students.length} Students:</span>
                        </p>
                        <p className="text-indigo-800 mt-0.5 leading-snug">
                          A dedicated Microsoft Teams Group <strong>"MMRMS Mentoring Group — {mentorName} ({students.length} Mentees)"</strong> will be created. Subsequent messages sent to all {students.length} will automatically reuse this exact group!
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Selection Status Counter */}
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-slate-500">
                  Select students to send a message via Teams:
                </span>
                <span
                  className={cx(
                    'font-semibold px-2 py-0.5 rounded-full text-[11px]',
                    isAllSelected
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                      : selectedIds.length >= 5
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedIds.length > 0
                      ? 'bg-[#5B5FC7]/10 text-[#5B5FC7]'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {selectedIds.length} of {students.length} Selected
                </span>
              </div>
            </div>

            {/* Scrollable Students List */}
            <div className="flex-1 overflow-y-auto px-6 divide-y divide-slate-100 border-t border-slate-100 max-h-56">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-[13px]">
                  No students found matching your search.
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isSelected = selectedIds.includes(s.menteeId);
                  const initials = s.menteeName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={s.menteeId}
                      onClick={() => toggleStudent(s.menteeId)}
                      className={cx(
                        'py-2.5 px-3 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-all my-1',
                        isSelected
                          ? 'bg-[#5B5FC7]/[0.08] border border-[#5B5FC7]/30 shadow-2xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by row click
                          className="w-4 h-4 rounded text-[#5B5FC7] focus:ring-[#5B5FC7] border-slate-300 pointer-events-none"
                        />
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 truncate leading-snug">
                            {s.menteeName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {s.rollNumber} · Year {s.year}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono text-[#5B5FC7] bg-white px-2 py-0.5 rounded border border-[#5B5FC7]/20 shadow-2xs flex items-center gap-1">
                          <svg className="w-3 h-3 text-[#5B5FC7]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.5 7.5h-5v5h5v-5zm0-4.5h-5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V5.5A2.5 2.5 0 0 0 19.5 3z" />
                          </svg>
                          {s.teamsEmail}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Message Space - Shown when students are selected */}
            {selectedIds.length > 0 ? (
              <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3">
                {/* Selected Recipients Chips */}
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-slate-800">
                    Type your message to {selectedIds.length} student{selectedIds.length === 1 ? '' : 's'}:
                  </p>
                  <span className="text-[11px] text-slate-500">
                    {isAllSelected ? (
                      <span className="text-indigo-600 font-semibold">
                        {teamsGroupInfo ? 'Reusing Teams Group' : 'Creating Teams Group'}
                      </span>
                    ) : (
                      'Delivering via Teams and MMRMS'
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {selectedStudents.map((s) => (
                    <span
                      key={s.menteeId}
                      className="text-[11px] bg-white text-slate-700 font-medium px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs flex items-center gap-1"
                    >
                      {s.menteeName.split(' ')[0]}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStudent(s.menteeId);
                        }}
                        className="text-slate-400 hover:text-slate-600 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Message Input Space */}
                <div className="bg-white rounded-xl border border-slate-300 focus-within:border-[#5B5FC7] focus-within:ring-2 focus-within:ring-[#5B5FC7]/20 p-2.5 shadow-2xs">
                  <textarea
                    rows={3}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      isAllSelected
                        ? teamsGroupInfo
                          ? `Type a message to send into existing Teams Group "${teamsGroupInfo.topic}"…`
                          : `Type a message to create Teams Group with all ${students.length} students…`
                        : `Type a message to send to all ${selectedIds.length} selected students via Microsoft Teams…`
                    }
                    className="w-full resize-none text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent leading-relaxed"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    <span>
                      Teams from: <strong className="text-slate-700">{mentorEmail}</strong>
                    </span>
                    <span>{messageText.length} characters</span>
                  </div>
                </div>

                {error && <p className="text-[12px] text-rose-600 font-medium">{error}</p>}

                {/* Send Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <Button size="sm" variant="secondary" onClick={onClose} disabled={sending}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSend}
                    loading={sending}
                    disabled={!messageText.trim() || sending}
                    className="bg-[#5B5FC7] hover:bg-[#4d51ab] text-white text-[12.5px] font-medium px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs transition"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.5 7.5h-5v5h5v-5zm0-4.5h-5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V5.5A2.5 2.5 0 0 0 19.5 3zM9.5 5.5h-5a2.5 2.5 0 0 0-2.5 2.5v8a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 9.5 5.5z" />
                    </svg>
                    {isAllSelected
                      ? teamsGroupInfo
                        ? `Send to Existing Teams Group (${students.length} Mentees)`
                        : `Create Teams Group & Broadcast (${students.length} Mentees)`
                      : `Send to ${selectedIds.length} Student${selectedIds.length === 1 ? '' : 's'} via Teams`}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-[12.5px] text-slate-500">
                Select students above to open the message composer and send a Teams broadcast.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
