import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  Bell,
  BellRing,
  Boxes,
  Check,
  CheckCheck,
  PackageCheck,
  Truck,
  X,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { AppNotification, AssetTransfer, User } from '../types';

interface NotificationBellProps {
  currentUser: User;
  notifications: AppNotification[];
  transfers: AssetTransfer[];
  lang: Language;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onNavigateNotification: (notification: AppNotification) => void;
  onConfirmGoodsReceived: (transfer: AssetTransfer, notificationId?: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  notifications,
  transfers,
  lang,
  onMarkRead,
  onMarkAllRead,
  onNavigateNotification,
  onConfirmGoodsReceived,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const [browserPerm, setBrowserPerm] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter notifications belonging to this user
  const myNotifications = useMemo(() => {
    return notifications.filter((n) => n.recipientUserIds?.includes(currentUser.id));
  }, [notifications, currentUser.id]);

  const unreadCount = useMemo(() => {
    return myNotifications.filter((n) => !n.readByUserIds?.includes(currentUser.id)).length;
  }, [myNotifications, currentUser.id]);

  const visibleNotifications = useMemo(() => {
    if (filterMode === 'unread') {
      return myNotifications.filter((n) => !n.readByUserIds?.includes(currentUser.id));
    }
    return myNotifications;
  }, [myNotifications, filterMode, currentUser.id]);

  const isGlobal = currentUser.assignedAreaIds.includes('ALL');

  const handleRequestBrowserAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const res = await window.Notification.requestPermission();
      setBrowserPerm(res);
    } catch {
      // ignore permission request errors
    }
  };

  const formatTimeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (isNaN(diffMs) || diffMs < 60_000) return lang === 'bn' ? 'এইমাত্র' : 'Just now';
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 60) return lang === 'bn' ? `${mins} মি. আগে` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return lang === 'bn' ? `${hrs} ঘ. আগে` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return lang === 'bn' ? `${days} দিন আগে` : `${days}d ago`;
  };

  const getTypeVisual = (type: AppNotification['type']) => {
    switch (type) {
      case 'transfer_dispatched':
        return { icon: <Truck className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-100 border-blue-200' };
      case 'transfer_received':
        return { icon: <PackageCheck className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-100 border-emerald-200' };
      case 'disposal_requested':
        return { icon: <AlertOctagon className="w-4 h-4 text-amber-600" />, bg: 'bg-amber-100 border-amber-200' };
      case 'disposal_approved':
      case 'disposal_rejected':
        return { icon: <AlertOctagon className="w-4 h-4 text-rose-600" />, bg: 'bg-rose-100 border-rose-200' };
      default:
        return { icon: <Boxes className="w-4 h-4 text-slate-700" />, bg: 'bg-slate-100 border-slate-200' };
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
          unreadCount > 0
            ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
        title={lang === 'bn' ? 'নোটিফিকেশন দেখুন' : 'Notifications'}
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-red-600 animate-pulse" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold">
                {lang === 'bn' ? 'নোটিফিকেশন সেন্টার' : 'Notifications'}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {unreadCount} {lang === 'bn' ? 'নতুন' : 'new'}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                  title={lang === 'bn' ? 'সব পঠিত চিহ্নিত করুন' : 'Mark all as read'}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'সব পঠিত' : 'Read all'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter & Browser Alert Bar */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px]">
            <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  filterMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {lang === 'bn' ? `সব (${myNotifications.length})` : `All (${myNotifications.length})`}
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unread')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  filterMode === 'unread' ? 'bg-white text-red-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {lang === 'bn' ? `অপঠিত (${unreadCount})` : `Unread (${unreadCount})`}
              </button>
            </div>

            {browserPerm === 'default' && (
              <button
                type="button"
                onClick={handleRequestBrowserAlerts}
                className="text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg cursor-pointer"
              >
                {lang === 'bn' ? '🔔 ডেস্কটপ অ্যালার্ট চালু' : '🔔 Enable Alerts'}
              </button>
            )}
            {browserPerm === 'granted' && (
              <span className="text-[10px] font-semibold text-emerald-700 flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>{lang === 'bn' ? 'অ্যালার্ট চালু' : 'Alerts On'}</span>
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100">
            {visibleNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-slate-400">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">
                  {filterMode === 'unread'
                    ? lang === 'bn'
                      ? 'কোনো অপঠিত নোটিফিকেশন নেই'
                      : 'No unread notifications'
                    : lang === 'bn'
                    ? 'এখনো কোনো নোটিফিকেশন আসেনি'
                    : 'No notifications yet'}
                </p>
              </div>
            ) : (
              visibleNotifications.map((notif) => {
                const isRead = notif.readByUserIds?.includes(currentUser.id);
                const visual = getTypeVisual(notif.type);
                const linkedTransfer =
                  notif.type === 'transfer_dispatched' && notif.relatedTransferId
                    ? transfers.find((tr) => tr.id === notif.relatedTransferId)
                    : undefined;
                const canConfirmReceive =
                  linkedTransfer &&
                  linkedTransfer.status === 'In-Transit' &&
                  (isGlobal || currentUser.assignedAreaIds.includes(linkedTransfer.destinationAreaId));

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      onMarkRead(notif.id);
                      onNavigateNotification(notif);
                      setIsOpen(false);
                    }}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 ${
                      isRead ? 'bg-white hover:bg-slate-50' : 'bg-red-50/40 hover:bg-red-50/70'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${visual.bg}`}>
                      {visual.icon}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs leading-snug ${isRead ? 'font-semibold text-slate-800' : 'font-black text-slate-950'}`}>
                          {lang === 'bn' ? notif.titleBn : notif.titleEn}
                        </p>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 mt-1" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {lang === 'bn' ? notif.messageBn : notif.messageEn}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] font-medium text-slate-400">
                          {formatTimeAgo(notif.createdAt)}
                        </span>

                        {canConfirmReceive && linkedTransfer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkRead(notif.id);
                              onConfirmGoodsReceived(linkedTransfer, notif.id);
                              setIsOpen(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                          >
                            <PackageCheck className="w-3 h-3" />
                            <span>{lang === 'bn' ? 'Goods Received নিশ্চিত করুন' : 'Goods Received'}</span>
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
};
