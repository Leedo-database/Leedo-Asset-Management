import React, { useEffect, useRef, useState } from 'react';
import { AlertOctagon, Boxes, PackageCheck, Truck, X } from 'lucide-react';
import { Language } from '../i18n/translations';
import { AppNotification, AssetTransfer, User } from '../types';

interface NotificationToastProps {
  currentUser: User;
  notifications: AppNotification[];
  transfers: AssetTransfer[];
  lang: Language;
  onMarkRead: (notificationId: string) => void;
  onNavigateNotification: (notification: AppNotification) => void;
  onConfirmGoodsReceived: (transfer: AssetTransfer, notificationId?: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  currentUser,
  notifications,
  transfers,
  lang,
  onMarkRead,
  onNavigateNotification,
  onConfirmGoodsReceived,
}) => {
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  // Reset seen tracking on user switch so historical backlog doesn't flood on login
  useEffect(() => {
    seenIdsRef.current = new Set(notifications.map((n) => n.id));
    isInitializedRef.current = true;
    setActiveToast(null);
  }, [currentUser.id]);

  // Detect brand-new incoming notifications for current user
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const myNew = notifications.find(
      (n) =>
        !seenIdsRef.current.has(n.id) &&
        n.recipientUserIds?.includes(currentUser.id) &&
        !n.readByUserIds?.includes(currentUser.id)
    );

    notifications.forEach((n) => seenIdsRef.current.add(n.id));

    if (myNew) {
      setActiveToast(myNew);

      // Fire optional native OS notification if granted
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        try {
          new window.Notification(lang === 'bn' ? myNew.titleBn : myNew.titleEn, {
            body: lang === 'bn' ? myNew.messageBn : myNew.messageEn,
          });
        } catch {
          // ignore if blocked by iframe sandbox
        }
      }
    }
  }, [notifications, currentUser.id, lang]);

  // Auto-dismiss after 7.5s
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 7500);
    return () => clearTimeout(timer);
  }, [activeToast]);

  if (!activeToast) return null;

  const isGlobal = currentUser.assignedAreaIds.includes('ALL');
  const linkedTransfer =
    activeToast.type === 'transfer_dispatched' && activeToast.relatedTransferId
      ? transfers.find((tr) => tr.id === activeToast.relatedTransferId)
      : undefined;
  const canConfirmReceive =
    linkedTransfer &&
    linkedTransfer.status === 'In-Transit' &&
    (isGlobal || currentUser.assignedAreaIds.includes(linkedTransfer.destinationAreaId));

  const getIcon = () => {
    switch (activeToast.type) {
      case 'transfer_dispatched':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'transfer_received':
        return <PackageCheck className="w-5 h-5 text-emerald-600" />;
      case 'disposal_requested':
      case 'disposal_approved':
      case 'disposal_rejected':
        return <AlertOctagon className="w-5 h-5 text-amber-600" />;
      default:
        return <Boxes className="w-5 h-5 text-slate-700" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border-2 border-red-200 p-4 animate-in fade-in slide-in-from-bottom-4 duration-200 no-print">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-600">
              {lang === 'bn' ? 'নতুন নোটিফিকেশন' : 'Live Notification'}
            </span>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="text-xs font-bold text-slate-900 mt-0.5">
            {lang === 'bn' ? activeToast.titleBn : activeToast.titleEn}
          </h4>
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-3">
            {lang === 'bn' ? activeToast.messageBn : activeToast.messageEn}
          </p>

          <div className="mt-2.5 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                onMarkRead(activeToast.id);
                onNavigateNotification(activeToast);
                setActiveToast(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer"
            >
              {lang === 'bn' ? 'বিস্তারিত দেখুন' : 'View'}
            </button>

            {canConfirmReceive && linkedTransfer && (
              <button
                type="button"
                onClick={() => {
                  onMarkRead(activeToast.id);
                  onConfirmGoodsReceived(linkedTransfer, activeToast.id);
                  setActiveToast(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'Goods Received' : 'Goods Received'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
