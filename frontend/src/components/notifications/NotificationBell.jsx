import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client.js';

const TYPE_ICONS = {
  ticket_raised: '🎫',
  ticket_reply: '💬',
  meeting_recorded: '📅',
  goal_assigned: '🎯',
  system: '🔔',
};

export function NotificationBell({ onNavChange }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api('/notifications');
      if (res && Array.isArray(res.notifications)) {
        setData(res);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleMarkRead(id, e) {
    if (e) e.stopPropagation();
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }

  function handleItemClick(notif) {
    if (!notif.read) {
      handleMarkRead(notif.id);
    }
    if (notif.link && onNavChange) {
      onNavChange(notif.link);
    }
    setOpen(false);
  }

  const { notifications, unreadCount } = data;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        title="Notifications"
        className="relative focus-ring rounded-xl border border-line bg-white p-2 text-ink shadow-inner transition-all duration-300 hover:border-brand-300 hover:shadow-pop"
      >
        <span className="text-base leading-none">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-card border border-line bg-white p-4 shadow-lift animate-fadeRise space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-ink text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-brand-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">
                <span className="block text-xl mb-1">🔕</span>
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => {
                const icon = TYPE_ICONS[n.type] ?? TYPE_ICONS.system;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`group relative flex items-start gap-3 rounded-lg border p-3 text-xs transition-colors cursor-pointer ${
                      n.read
                        ? 'border-line/60 bg-white opacity-75 hover:opacity-100 hover:bg-surface/50'
                        : 'border-brand-200 bg-brand-50/40 hover:bg-brand-50/80 font-medium'
                    }`}
                  >
                    <span className="text-base mt-0.5">{icon}</span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-ink truncate">{n.title}</span>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
                      </div>
                      <p className="text-muted-strong leading-snug line-clamp-2">{n.message}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted pt-1">
                        <span>{n.createdAt}</span>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkRead(n.id, e)}
                            className="font-semibold text-brand-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
