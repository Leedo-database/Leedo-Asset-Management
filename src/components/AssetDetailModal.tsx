import React from 'react';
import {
  AlertOctagon,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  MapPin,
  Printer,
  QrCode,
  Tag,
  TrendingDown,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Area, Asset, User } from '../types';
import { calculateDepreciation, formatBDT } from '../utils/depreciation';

interface AssetDetailModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  areas: Area[];
  currentUser: User;
  lang: Language;
  onOpenQuickUpdate: (asset: Asset) => void;
  onOpenDisposalRequest: (asset: Asset) => void;
  onOpenTransfer: (asset: Asset) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  isOpen,
  onClose,
  areas,
  currentUser,
  lang,
  onOpenQuickUpdate,
  onOpenDisposalRequest,
  onOpenTransfer,
}) => {
  if (!isOpen || !asset) return null;

  const t = translations[lang];
  const area = areas.find((a) => a.id === asset.assignedAreaId);
  const dep = calculateDepreciation(asset.purchaseDate, asset.purchaseValueBDT, asset.category);

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Top Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between no-print">
          <div className="flex items-center space-x-2.5">
            <span className="font-mono font-bold text-sm bg-red-600 px-2.5 py-1 rounded-md text-white">
              {asset.id}
            </span>
            <span className="text-xs text-slate-300">
              {lang === 'bn' ? 'সম্পদ বিস্তারিত ও অবচয় মূল্যায়ন' : 'Asset Lifecycle Card'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintCard}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Print Asset Card"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
          {/* Main Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">{asset.titleEn}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  {asset.category.replace('_', ' ')}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">
                  {asset.acquisitionType === 'Donation'
                    ? `${t.donation}: ${asset.donorOrVendor}`
                    : `${t.purchased}: ${asset.donorOrVendor}`}
                </span>
              </div>
            </div>

            {/* Usability Badge */}
            <div className="shrink-0">
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full font-bold text-xs ${
                  asset.usabilityStatus === 'Usable'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : asset.usabilityStatus === 'Repairable'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : asset.usabilityStatus === 'Unusable'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                <span>{asset.usabilityStatus}</span>
              </span>
            </div>
          </div>

          {/* Depreciation & Financial Card (Key Feature) */}
          <div className="bg-gradient-to-br from-red-50/50 via-white to-slate-50 p-4 rounded-xl border border-red-200/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  {t.financialHealth}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">
                {lang === 'bn' ? `সম্পদের বয়স: ${dep.ageFormatted}` : `Age: ${dep.ageFormatted}`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">{t.originalCost}</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{formatBDT(dep.purchaseValue)}</p>
                <p className="text-[9px] text-slate-400">{asset.purchaseDate}</p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-red-200 bg-red-50/30">
                <span className="text-[10px] text-red-700 font-bold uppercase">{t.currentBookValue}</span>
                <p className="text-sm font-black text-red-600 mt-0.5">{formatBDT(dep.currentBookValue)}</p>
                <p className="text-[9px] text-red-600 font-semibold">
                  {100 - dep.depreciationPercent}% {lang === 'bn' ? 'অবশিষ্ট' : 'residual'}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">{t.totalDepreciation}</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">-{formatBDT(dep.totalDepreciation)}</p>
                <p className="text-[9px] text-slate-400">-{dep.depreciationPercent}% total</p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">
                  {lang === 'bn' ? 'বার্ষিক অবচয় হার' : 'Subsequent Rate'}
                </span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {Math.round(dep.rateApplied * 100)}% / yr
                </p>
                <p className="text-[9px] text-slate-400">
                  {lang === 'bn' ? '১ম বছর ৫০% পর' : 'After 50% Yr 1'}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              {lang === 'bn'
                ? `ℹ️ লিডোর আর্থিক নীতি অনুযায়ী ১ম বছর শেষে সম্পদের ৫০% মূল্য অবচয় হিসেবে বাদ দেওয়া হয়। পরবর্তী বছরগুলোতে ${Math.round(
                    dep.rateApplied * 100
                  )}% বার্ষিক অবচয় প্রযোজ্য। ন্যূনতম স্ক্র্যাপ ফ্লোর ৫% (${formatBDT(dep.salvageFloor)})।`
                : `ℹ️ LEEDO policy automatically writes down 50% asset value in Year 1, followed by ${Math.round(
                    dep.rateApplied * 100
                  )}% annual diminishing rate. Residual salvage floor is 5% (${formatBDT(dep.salvageFloor)}).`}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                {lang === 'bn' ? 'স্থান ও অবস্থান' : 'Location & Custody'}
              </h4>
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">
                    {area ? (lang === 'bn' ? area.nameBn : area.nameEn) : 'Unknown'}
                  </span>
                  <p className="text-slate-500 text-[11px]">{area?.type || 'LEEDO Center'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Building className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500">{t.specificRoom}:</span>
                  <p className="font-semibold text-slate-800">{asset.specificRoom || 'Not specified'}</p>
                </div>
              </div>

              {asset.transferStatus === 'in_transit' && (
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{t.statusInTransit}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                {lang === 'bn' ? 'টেকনিক্যাল ও ট্র্যাকিং তথ্য' : 'Technical & Serial Specs'}
              </h4>

              <div>
                <span className="text-slate-500">{t.serialNo}:</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">
                  {asset.serialNumber || 'N/A'}
                </p>
              </div>

              <div>
                <span className="text-slate-500">{t.initialCondition}:</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {asset.initialCondition === 'New' ? t.conditionNew : t.conditionUsed}
                </p>
              </div>

              <div>
                <span className="text-slate-500">{t.remarks}:</span>
                <p className="text-slate-700 mt-0.5">{asset.remarks || 'No notes added.'}</p>
              </div>
            </div>
          </div>

          {/* Asset Barcode / Physical Tag Preview */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                <QrCode className="w-8 h-8 text-slate-800" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs">LEEDO Fixed Asset Tag</p>
                <p className="font-mono text-red-600 font-bold text-[11px]">{asset.id}</p>
                <p className="text-[10px] text-slate-500">Property of LEEDO Bangladesh</p>
              </div>
            </div>
            <button
              onClick={handlePrintCard}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shrink-0 flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'ট্যাগ প্রিন্ট করুন' : 'Print Asset Tag'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center space-x-2">
            {/* Quick condition update for field staff */}
            <button
              onClick={() => {
                onClose();
                onOpenQuickUpdate(asset);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center space-x-1"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.quickUpdateCondition}</span>
            </button>

            {/* Request disposal */}
            {asset.usabilityStatus !== 'Disposed' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDisposalRequest(asset);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs transition-colors flex items-center space-x-1"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
                <span>{t.requestDisposal}</span>
              </button>
            )}

            {/* Transfer Asset */}
            {currentUser.canManageAssets && asset.usabilityStatus !== 'Disposed' && asset.transferStatus !== 'in_transit' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTransfer(asset);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs transition-colors flex items-center space-x-1"
              >
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.initiateTransfer}</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
