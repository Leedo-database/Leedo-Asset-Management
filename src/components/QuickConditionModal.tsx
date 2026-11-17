import React, { useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Wrench, X } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Asset, UsabilityStatus, User } from '../types';

interface QuickConditionModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    assetId: string,
    updates: {
      specificRoom: string;
      usabilityStatus: UsabilityStatus;
      remarks: string;
      purchaseDate?: string;
    }
  ) => void;
  currentUser: User;
  lang: Language;
}

function toDateInputValue(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const mmmYy = trimmed.match(/^([A-Za-z]{3})-(\d{2,4})$/);
  if (mmmYy) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const mo = months[mmmYy[1].toLowerCase()];
    const yr = mmmYy[2].length === 2 ? `20${mmmYy[2]}` : mmmYy[2];
    if (mo) return `${yr}-${mo}-01`;
  }
  return new Date().toISOString().split('T')[0];
}

export const QuickConditionModal: React.FC<QuickConditionModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSave,
  currentUser,
  lang,
}) => {
  const t = translations[lang];
  const [specificRoom, setSpecificRoom] = useState(asset?.specificRoom || '');
  const [usabilityStatus, setUsabilityStatus] = useState<UsabilityStatus>(
    asset?.usabilityStatus === 'Disposed' ? 'Usable' : (asset?.usabilityStatus || 'Usable')
  );
  const [remarks, setRemarks] = useState(asset?.remarks || '');
  const [purchaseDate, setPurchaseDate] = useState(() => toDateInputValue(asset?.purchaseDate));

  // Keep form fields synced whenever target asset or modal open state changes
  React.useEffect(() => {
    if (asset && isOpen) {
      setSpecificRoom(asset.specificRoom || '');
      setUsabilityStatus(asset.usabilityStatus === 'Disposed' ? 'Usable' : asset.usabilityStatus);
      setRemarks(asset.remarks || '');
      setPurchaseDate(toDateInputValue(asset.purchaseDate));
    }
  }, [asset, isOpen]);

  if (!isOpen || !asset) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(asset.id, {
      specificRoom: specificRoom.trim(),
      usabilityStatus,
      remarks: remarks.trim(),
      ...(currentUser.canManageAssets && purchaseDate ? { purchaseDate } : {}),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-600 rounded-lg">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{t.quickUpdateCondition}</h3>
              <p className="text-[11px] text-slate-400 font-mono">{asset.id} - {asset.titleEn}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <p className="font-semibold text-slate-800">{asset.titleEn}</p>
            <p className="text-slate-500 text-[11px]">
              {currentUser.canManageAssets
                ? lang === 'bn'
                  ? 'অনুমোদিত এডিটর হিসেবে আপনি রুম, অবস্থা, মন্তব্য এবং ক্রয়/এন্ট্রি তারিখ আপডেট করতে পারবেন।'
                  : 'As an authorized editor, you can update specific room, condition, remarks, and Entry / Purchase Date.'
                : lang === 'bn'
                ? 'এরিয়া ইনচার্জ ও ফিল্ড স্টাফ শুধুমাত্র রুমের অবস্থান ও কার্যকরী অবস্থা আপডেট করতে পারেন।'
                : 'Area Incharge & Field staff can adjust specific room location and usability condition.'}
            </p>
          </div>

          {currentUser.canManageAssets && (
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                <span>{t.purchaseDate}</span>
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t.specificRoom}
            </label>
            <input
              type="text"
              required
              value={specificRoom}
              onChange={(e) => setSpecificRoom(e.target.value)}
              placeholder="e.g. Room 102, Child Counseling Unit, Desk 4"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t.currentCondition}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUsabilityStatus('Usable')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  usabilityStatus === 'Usable'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-center mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <span>{t.statusUsable}</span>
              </button>

              <button
                type="button"
                onClick={() => setUsabilityStatus('Repairable')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  usabilityStatus === 'Repairable'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-center mb-1">
                  <Wrench className="w-4 h-4 text-amber-600" />
                </div>
                <span>{t.statusRepairable}</span>
              </button>

              <button
                type="button"
                onClick={() => setUsabilityStatus('Unusable')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  usabilityStatus === 'Unusable'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-center mb-1">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <span>{t.statusUnusable}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t.remarks}
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="State any damage, wear & tear, or maintenance required..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors"
            >
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
