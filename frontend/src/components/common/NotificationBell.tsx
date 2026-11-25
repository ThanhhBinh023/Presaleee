import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, MailCheck, Settings } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import { navigateTo } from '../../navigation';
import { formatDateTime } from '../../utils/format';
import { useToast } from './Toast';
import type { MyPendingInvitation, UserNotificationItem } from '../../types/settings';

export const NotificationBell: React.FC = () => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [invitations, setInvitations] = useState<MyPendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const bundle = await settingsService.getAccountSettings();
      setNotifications(bundle.notificationFeed || []);
      setUnreadCount(bundle.unreadNotificationCount || 0);
      setInvitations(bundle.pendingInvitations || []);
    } catch {
      // silent background fetch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const totalBadge = unreadCount + invitations.length;

  const handleMarkAllRead = async () => {
    try {
      await settingsService.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      toast.error('Không thể cập nhật trạng thái đã đọc.');
    }
  };

  const handleAcceptInvite = async (invitationId: string) => {
    try {
      const res = await settingsService.acceptInvitation(invitationId);
      toast.success(`Đã tham gia dự án với vai trò ${res.projectRole}!`, 'Lời mời Dự án');
      await loadNotifications();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể chấp nhận lời mời.');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void loadNotifications();
        }}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
        title="Thông báo & Lời mời dự án"
        aria-label="Thông báo"
      >
        <Bell className="w-4 h-4" />
        {totalBadge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center shadow-xs">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-900">Thông báo ({totalBadge})</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Đã đọc hết</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigateTo('settings', { tab: 'notifications' });
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
                title="Cài đặt thông báo"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {invitations.length > 0 && (
              <div className="p-3 bg-amber-50/60 space-y-2">
                <div className="text-[10px] font-mono font-bold text-amber-900 uppercase flex items-center gap-1.5">
                  <MailCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Lời mời tham gia dự án ({invitations.length})</span>
                </div>
                {invitations.map((inv) => (
                  <div key={inv.id} className="bg-white rounded-xl border border-amber-200 p-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{inv.projectTitle}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Role: <strong className="text-brand-700">{inv.projectRole}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAcceptInvite(inv.id)}
                      className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                    >
                      Chấp nhận
                    </button>
                  </div>
                ))}
              </div>
            )}

            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-mono">Đang tải thông báo...</div>
            ) : notifications.length === 0 && invitations.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <Bell className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Chưa có thông báo mới</p>
                <p className="text-[11px] text-slate-400">
                  Các phản hồi từ Client Portal, lời mời dự án và cập nhật duyệt Proposal sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 text-xs transition-colors ${n.isRead ? 'bg-white' : 'bg-emerald-50/40'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`font-bold ${n.isRead ? 'text-slate-700' : 'text-slate-900'}`}>{n.title}</span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1" />}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">{n.message}</p>
                  <div className="mt-1.5 text-[10px] font-mono text-slate-400">{formatDateTime(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
