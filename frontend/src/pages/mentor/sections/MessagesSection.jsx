import { useState, useEffect, useMemo } from 'react';
import { api } from '../../../api/client.js';
import { useResource } from '../../../hooks/useResource.js';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { DashboardSkeleton } from '../../../components/ui/Skeleton.jsx';
import { TeamsChat } from '../../../components/dashboard/TeamsChat.jsx';
import { TeamsBroadcastModal } from '../../../components/meetings/TeamsBroadcastModal.jsx';
import { cx } from '../../../lib/tone.js';

export function MessagesSection({ mentor, onOpenMentee }) {
  const { data, loading, error, reload } = useResource('/mentor/me/messages');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'has-messages'
  const [viewTab, setViewTab] = useState('chat'); // 'chat' | 'log'
  const [activeMessages, setActiveMessages] = useState([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const conversations = data?.conversations ?? [];
  const mentorName = data?.mentorName || mentor?.name || 'Dr. Bharathi Priya';
  const mentorEmail = data?.mentorEmail || mentor?.email || 'bharathi.priya@kct.ac.in';

  // Filter conversations by search and presence of messages
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchSearch =
        !search ||
        c.menteeName?.toLowerCase().includes(search.toLowerCase()) ||
        c.rollNumber?.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;
      if (filterMode === 'has-messages') {
        return c.totalCount > 0;
      }
      return true;
    });
  }, [conversations, search, filterMode]);

  // Set default selected conversation
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      const firstWithMsgs = conversations.find((c) => c.totalCount > 0);
      setSelectedId(firstWithMsgs ? firstWithMsgs.menteeId : conversations[0].menteeId);
    }
  }, [conversations, selectedId]);

  // Get active selected conversation
  const selectedConv = useMemo(() => {
    return conversations.find((c) => c.menteeId === selectedId) || null;
  }, [conversations, selectedId]);

  // Sync active messages with selected conversation
  useEffect(() => {
    if (selectedConv) {
      setActiveMessages(selectedConv.messages || []);
    }
  }, [selectedConv]);

  // Periodically poll for updates on the active conversation
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(async () => {
      try {
        const res = await api(`/mentor/me/mentees/${selectedId}/messages`);
        if (Array.isArray(res?.messages)) {
          setActiveMessages(res.messages);
        }
      } catch {
        // silent fallback
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedId]);

  // Send message handler
  async function handleSendMessage(text) {
    if (!selectedId) return;
    const newMsg = await api(`/mentor/me/mentees/${selectedId}/messages`, {
      method: 'POST',
      body: { text },
    });
    setActiveMessages((prev) => [...prev, newMsg]);
    reload();
  }

  // Aggregate stats
  const totalMessagesAcross = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.totalCount || 0), 0);
  }, [conversations]);

  const activeThreadsCount = useMemo(() => {
    return conversations.filter((c) => c.totalCount > 0).length;
  }, [conversations]);

  // Flatten all messages for the unified "All Messages Log" view
  const allFlattenedMessages = useMemo(() => {
    const list = [];
    conversations.forEach((c) => {
      (c.messages || []).forEach((m) => {
        list.push({
          ...m,
          menteeId: c.menteeId,
          menteeName: c.menteeName,
          rollNumber: c.rollNumber,
          mentorName: mentorName,
        });
      });
    });
    return list.reverse();
  }, [conversations, mentorName]);

  if (error) {
    return (
      <EmptyState
        title="Couldn't load messages"
        description={error.message}
        icon="!"
        action={<Button size="sm" onClick={reload}>Retry</Button>}
      />
    );
  }

  if (loading && !data) {
    return <DashboardSkeleton tiles={3} />;
  }

  return (
    <div className="space-y-5 animate-fadeRise">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200">
          <div>
            <p className="text-[11.5px] font-medium text-slate-500 uppercase tracking-wider">Total Mentees</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{conversations.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-lg">
            👥
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200">
          <div>
            <p className="text-[11.5px] font-medium text-slate-500 uppercase tracking-wider">Active Threads</p>
            <p className="text-2xl font-bold text-[#5B5FC7] mt-1">{activeThreadsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#5B5FC7]/10 text-[#5B5FC7] flex items-center justify-center text-lg">
            💬
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200">
          <div>
            <p className="text-[11.5px] font-medium text-slate-500 uppercase tracking-wider">Total Messages</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalMessagesAcross}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            ✉️
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200">
          <div>
            <p className="text-[11.5px] font-medium text-slate-500 uppercase tracking-wider">Mentor Portal</p>
            <p className="text-sm font-semibold text-slate-800 mt-1 truncate" title={mentorName}>{mentorName}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
            🎓
          </div>
        </Card>
      </div>

      {/* Main View Mode Selector + "Message through Teams" Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setViewTab('chat')}
            className={cx(
              'px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-all',
              viewTab === 'chat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            💬 Teams Chat Hub
          </button>
          <button
            type="button"
            onClick={() => setViewTab('log')}
            className={cx(
              'px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-all',
              viewTab === 'log'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            📋 All Messages Log ({allFlattenedMessages.length})
          </button>
        </div>

        {/* Action Button: Message through Teams */}
        <Button
          size="sm"
          onClick={() => setShowBroadcastModal(true)}
          className="bg-[#5B5FC7] hover:bg-[#4d51ab] text-white flex items-center gap-2 shadow-xs font-medium"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.5 7.5h-5v5h5v-5zm0-4.5h-5a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V5.5A2.5 2.5 0 0 0 19.5 3zM9.5 5.5h-5a2.5 2.5 0 0 0-2.5 2.5v8a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 9.5 5.5z" />
          </svg>
          Message through Teams
        </Button>
      </div>

      {/* VIEW 1: Teams Chat Hub (Master-Detail) */}
      {viewTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Mentee Conversation List */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[700px]">
            {/* Header & Search */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[14px] text-slate-900">Conversations</h3>
                <span className="text-[11px] font-medium bg-[#5B5FC7]/10 text-[#5B5FC7] px-2 py-0.5 rounded-full">
                  {filteredConversations.length} Mentees
                </span>
              </div>

              {/* Search box */}
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or roll number…"
                  className="w-full pl-9 pr-3 py-2 text-[12.5px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/20 focus:border-[#5B5FC7] transition"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={cx(
                    'text-[11.5px] font-medium px-3 py-1 rounded-md transition',
                    filterMode === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  All ({conversations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('has-messages')}
                  className={cx(
                    'text-[11.5px] font-medium px-3 py-1 rounded-md transition',
                    filterMode === 'has-messages'
                      ? 'bg-[#5B5FC7] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  Active Chats ({activeThreadsCount})
                </button>
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-[12.5px]">
                  No mentees found matching your search.
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = c.menteeId === selectedId;
                  const hasMsgs = c.totalCount > 0;
                  const initials = c.menteeName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <button
                      key={c.menteeId}
                      type="button"
                      onClick={() => setSelectedId(c.menteeId)}
                      className={cx(
                        'w-full text-left p-3.5 transition-all flex items-center gap-3 border-l-4',
                        isSelected
                          ? 'bg-[#5B5FC7]/[0.06] border-[#5B5FC7]'
                          : 'border-transparent hover:bg-slate-50/80',
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={cx(
                            'w-9 h-9 rounded-full font-semibold text-xs flex items-center justify-center border shadow-2xs',
                            isSelected
                              ? 'bg-[#5B5FC7] text-white border-[#5B5FC7]'
                              : 'bg-slate-100 text-slate-700 border-slate-200',
                          )}
                        >
                          {initials}
                        </div>
                        {hasMsgs && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>

                      {/* Content without red-boxed snippets */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-[13px] font-semibold text-slate-900 truncate">
                            {c.menteeName}
                          </h4>
                          {c.lastMessage && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {c.lastMessage.time?.split(',')[1] || c.lastMessage.time}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {c.rollNumber} · Year {c.year}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Mentee Chat */}
          <div className="lg:col-span-8 space-y-4">
            {selectedConv ? (
              <>
                {/* Mentee & Mentor Info Header with Quick Jump */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#5B5FC7]/15 text-[#5B5FC7] font-bold text-sm flex items-center justify-center border border-[#5B5FC7]/20 shadow-xs">
                      {selectedConv.menteeName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[15px] font-bold text-slate-900">
                          {selectedConv.menteeName}
                        </h2>
                        <span className="text-[11.5px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {selectedConv.rollNumber}
                        </span>
                        <Badge tone="indigo" size="sm">
                          Year {selectedConv.year} · {selectedConv.section}
                        </Badge>
                      </div>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        Assigned Mentor: <strong className="font-semibold text-slate-800">{mentorName}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenMentee && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onOpenMentee(selectedConv.menteeId, 'messages')}
                        className="text-[12px] flex items-center gap-1.5"
                      >
                        <span>Open Full Workbook</span>
                        <span>→</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Teams Chat Component - Full Height without top metadata cards */}
                <TeamsChat
                  messages={activeMessages}
                  selfRole="mentor"
                  mentorName={mentorName}
                  menteeName={selectedConv.menteeName}
                  menteeRoll={selectedConv.rollNumber}
                  onSend={handleSendMessage}
                  height="600px"
                  showHeader={false}
                />
              </>
            ) : (
              <EmptyState
                title="Select a mentee"
                description="Choose a mentee from the list on the left to view messages and chat."
                icon="💬"
              />
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: All Messages Unified Log Table */}
      {viewTab === 'log' && (
        <Card className="p-0 overflow-hidden border-slate-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[14px] text-slate-900">
                Complete Message History Log
              </h3>
              <p className="text-[12px] text-slate-500">
                All delivered messages from mentees and sent messages from mentor across all batches.
              </p>
            </div>
            <span className="text-[11.5px] font-medium bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full">
              {allFlattenedMessages.length} Messages
            </span>
          </div>

          {allFlattenedMessages.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No messages have been logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Mentee</th>
                    <th className="py-3 px-4">Sender Name</th>
                    <th className="py-3 px-4">Message Content</th>
                    <th className="py-3 px-4">Delivered / Sent Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allFlattenedMessages.map((m) => {
                    const isMentor = m.from === 'mentor';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isMentor ? (
                            <Badge tone="indigo" size="sm">Sent</Badge>
                          ) : (
                            <Badge tone="green" size="sm">Delivered</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{m.menteeName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{m.rollNumber}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                          {isMentor ? `${m.mentorName} (Mentor)` : `${m.menteeName} (Student)`}
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <p className="text-slate-800 line-clamp-2 leading-relaxed font-normal">
                            {m.text}
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11.5px]">
                          {m.time}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(m.menteeId);
                              setViewTab('chat');
                            }}
                            className="text-[#5B5FC7] hover:underline font-medium text-[12px]"
                          >
                            Open Chat →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Teams Broadcast Modal */}
      {showBroadcastModal && (
        <TeamsBroadcastModal
          students={conversations}
          mentorName={mentorName}
          mentorEmail={mentorEmail}
          existingGroup={data?.teamsGroup}
          onClose={() => setShowBroadcastModal(false)}
          onSent={() => {
            reload();
          }}
        />
      )}
    </div>
  );
}
