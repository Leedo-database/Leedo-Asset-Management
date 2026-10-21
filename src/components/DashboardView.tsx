import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building,
  CheckCircle2,
  Clock,
  Coins,
  FileSpreadsheet,
  Layers,
  MapPin,
  MoveRight,
  PlusCircle,
  Shield,
  TrendingDown,
  Truck,
  Wrench,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Area, Asset, AssetTransfer, DisposalRequest, User } from '../types';
import { calculateDepreciation, formatBDT } from '../utils/depreciation';

interface DashboardViewProps {
  currentUser: User;
  assets: Asset[];
  areas: Area[];
  transfers: AssetTransfer[];
  disposals: DisposalRequest[];
  lang: Language;
  onNavigateTab: (tab: string) => void;
  onOpenAddAsset: () => void;
  onOpenInitiateTransfer: () => void;
  onOpenRequestDisposal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  assets,
  areas,
  transfers,
  disposals,
  lang,
  onNavigateTab,
  onOpenAddAsset,
  onOpenInitiateTransfer,
  onOpenRequestDisposal,
}) => {
  const t = translations[lang];

  // Tenant / Area scoping
  const isGlobal = currentUser.assignedAreaIds.includes('ALL');
  const scopedAssets = isGlobal
    ? assets
    : assets.filter((a) => currentUser.assignedAreaIds.includes(a.assignedAreaId));

  const scopedAreas = isGlobal
    ? areas
    : areas.filter((ar) => currentUser.assignedAreaIds.includes(ar.id));

  // Pending items
  const pendingDisposals = disposals.filter((d) => {
    if (d.status !== 'Pending HO Approval') return false;
    return isGlobal || currentUser.assignedAreaIds.includes(d.assignedAreaId);
  });

  const inTransitTransfers = transfers.filter((tr) => {
    if (tr.status !== 'In-Transit') return false;
    return (
      isGlobal ||
      currentUser.assignedAreaIds.includes(tr.sourceAreaId) ||
      currentUser.assignedAreaIds.includes(tr.destinationAreaId)
    );
  });

  // Incoming shipments specifically destined for the user's center
  const incomingShipments = transfers.filter(
    (tr) =>
      tr.status === 'In-Transit' &&
      !isGlobal &&
      currentUser.assignedAreaIds.includes(tr.destinationAreaId)
  );

  // Financial & Condition Aggregates
  let totalPurchaseValue = 0;
  let totalCurrentBookValue = 0;
  let countUsable = 0;
  let countRepairable = 0;
  let countUnusable = 0;
  let countDisposed = 0;

  scopedAssets.forEach((asset) => {
    totalPurchaseValue += asset.purchaseValueBDT || 0;
    const dep = calculateDepreciation(asset.purchaseDate, asset.purchaseValueBDT, asset.category);
    totalCurrentBookValue += dep.currentBookValue;

    if (asset.usabilityStatus === 'Usable') countUsable++;
    else if (asset.usabilityStatus === 'Repairable') countRepairable++;
    else if (asset.usabilityStatus === 'Unusable') countUnusable++;
    else if (asset.usabilityStatus === 'Disposed') countDisposed++;
  });

  const overallDepreciation = Math.max(0, totalPurchaseValue - totalCurrentBookValue);
  const overallDepreciationPercent = totalPurchaseValue > 0
    ? Math.round((overallDepreciation / totalPurchaseValue) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Scope / Jurisdiction Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100 shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">
                {isGlobal ? t.allAreasScope : t.restrictedScope}
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isGlobal
                ? lang === 'bn'
                  ? 'আপনি হেড অফিস পর্যায়ের পূর্ণ নিয়ন্ত্রণ ও ১৩টি কেন্দ্রের ডেটা দেখছেন।'
                  : 'You have central organization-wide oversight across all 13 LEEDO operating locations.'
                : `${lang === 'bn' ? 'আপনার নির্ধারিত কেন্দ্রসমূহ:' : 'Your assigned facilities:'} ${scopedAreas
                    .map((a) => (lang === 'bn' ? a.nameBn : a.nameEn))
                    .join(', ')}`}
            </p>
          </div>
        </div>

        {/* Action Buttons based on permissions */}
        <div className="flex flex-wrap items-center gap-2">
          {currentUser.canManageAssets && (
            <button
              onClick={onOpenAddAsset}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.addNewAsset}</span>
            </button>
          )}

          {currentUser.canManageAssets && (
            <button
              onClick={onOpenInitiateTransfer}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-900 shadow-xs transition-colors"
            >
              <Truck className="w-4 h-4" />
              <span>{t.initiateTransfer}</span>
            </button>
          )}

          <button
            onClick={onOpenRequestDisposal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 shadow-xs transition-colors"
          >
            <AlertOctagon className="w-4 h-4 text-amber-700" />
            <span>{t.requestDisposal}</span>
          </button>
        </div>
      </div>

      {/* Urgent Alert Banner if Incoming Shipments pending for receiver */}
      {incomingShipments.length > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800 animate-pulse">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                {lang === 'bn' ? '🚨 আগত চালান প্রাপ্তি নিশ্চিতকরণ অপেক্ষা করছে' : '🚨 Incoming Asset Shipment Awaiting Your Confirmation'}
              </p>
              <p className="text-xs text-emerald-800">
                {lang === 'bn'
                  ? `আপনার কেন্দ্রে ${incomingShipments.length} টি সম্পদ পৌঁছানোর অপেক্ষায় আছে। গেট পাস যাচাই করে গ্রহণ নিশ্চিত করুন।`
                  : `There are ${incomingShipments.length} asset shipment(s) currently arriving at your center. Please inspect condition and confirm.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('transfers')}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs transition-colors shrink-0 flex items-center space-x-1"
          >
            <span>{t.receiveAndConfirm}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.totalAssets}</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 tracking-tight">{scopedAssets.length}</p>
          <div className="mt-2 flex items-center text-xs text-slate-500 space-x-2">
            <span className="font-semibold text-emerald-600">{countUsable} {t.statusUsable}</span>
            <span>•</span>
            <span className="font-semibold text-amber-600">{countRepairable} {t.statusRepairable}</span>
          </div>
        </div>

        {/* Original Purchase Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.totalPurchaseValue}</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{formatBDT(totalPurchaseValue)}</p>
          <p className="mt-2 text-xs text-slate-500">
            {lang === 'bn' ? 'সর্বমোট প্রারম্ভিক অধিগ্রহণ ও ক্রয় ব্যয়' : 'Historical initial acquisition capital'}
          </p>
        </div>

        {/* Current Depreciated Book Value */}
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs bg-gradient-to-br from-white to-red-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">{t.currentBookValue}</span>
            <div className="p-2 rounded-xl bg-red-100 text-red-700">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-red-600 tracking-tight">{formatBDT(totalCurrentBookValue)}</p>
          <div className="mt-2 flex items-center text-xs text-red-700 font-medium">
            <span>{overallDepreciationPercent}% {lang === 'bn' ? 'অবচয়কৃত' : 'depreciated'}</span>
            <span className="mx-1">•</span>
            <span className="text-slate-500">(-{formatBDT(overallDepreciation)})</span>
          </div>
        </div>

        {/* Action Queues (Disposals & Transfers) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {lang === 'bn' ? 'অ্যাকশন কিউ' : 'Action Queues'}
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <AlertOctagon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              <div
                onClick={() => onNavigateTab('disposals')}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
              >
                <span className="text-slate-600 font-medium">{t.pendingDisposals}:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${
                  pendingDisposals.length > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {pendingDisposals.length}
                </span>
              </div>
              <div
                onClick={() => onNavigateTab('transfers')}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
              >
                <span className="text-slate-600 font-medium">{t.pendingTransfers}:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${
                  inTransitTransfers.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {inTransitTransfers.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Lifecycle Analysis Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t.financialHealth}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'bn'
                ? '১ম বছরে ৫০% অবচয় এবং পরবর্তী বছরগুলোতে ১০%-২০% হারে হিসাবকৃত'
                : 'Automated 50% Year 1 write-down + 10%-20% category annual diminishing model'}
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded-xs bg-slate-300"></div>
              <span className="text-slate-600 font-medium">{t.originalCost}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded-xs bg-red-600"></div>
              <span className="text-red-700 font-bold">{t.currentBookValue}</span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-700">
            <span>{lang === 'bn' ? 'বর্তমান অবশিষ্ট সম্পদ মূল্য অনুপাত' : 'Residual Asset Value Ratio'}</span>
            <span>
              {totalPurchaseValue > 0
                ? `${Math.round((totalCurrentBookValue / totalPurchaseValue) * 100)}% (${formatBDT(totalCurrentBookValue)})`
                : '0%'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
            <div
              className="bg-red-600 h-full transition-all duration-500 rounded-l-full"
              style={{
                width: `${totalPurchaseValue > 0 ? (totalCurrentBookValue / totalPurchaseValue) * 100 : 0}%`,
              }}
            ></div>
            <div
              className="bg-slate-300 h-full transition-all duration-500"
              style={{
                width: `${totalPurchaseValue > 0 ? (overallDepreciation / totalPurchaseValue) * 100 : 0}%`,
              }}
              title="Depreciated Amount"
            ></div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0 BDT</span>
            <span>{lang === 'bn' ? 'অবচয়:' : 'Accumulated Depreciation:'} {formatBDT(overallDepreciation)}</span>
            <span>{formatBDT(totalPurchaseValue)}</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Usability Breakdown & Area Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usability Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">{t.assetsByCondition}</h3>
          <div className="space-y-3">
            {/* Usable */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>{t.usableAssets}</span>
                </span>
                <span className="text-slate-800">{countUsable} ({scopedAssets.length > 0 ? Math.round((countUsable / scopedAssets.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${scopedAssets.length > 0 ? (countUsable / scopedAssets.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Repairable */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span>{t.repairableAssets}</span>
                </span>
                <span className="text-slate-800">{countRepairable} ({scopedAssets.length > 0 ? Math.round((countRepairable / scopedAssets.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${scopedAssets.length > 0 ? (countRepairable / scopedAssets.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Unusable */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                  <span>{t.unusableAssets}</span>
                </span>
                <span className="text-slate-800">{countUnusable} ({scopedAssets.length > 0 ? Math.round((countUnusable / scopedAssets.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${scopedAssets.length > 0 ? (countUnusable / scopedAssets.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Disposed */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                  <span>{t.disposedAssets}</span>
                </span>
                <span className="text-slate-800">{countDisposed} ({scopedAssets.length > 0 ? Math.round((countDisposed / scopedAssets.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full"
                  style={{ width: `${scopedAssets.length > 0 ? (countDisposed / scopedAssets.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Center / Area Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">{t.assetsByArea}</h3>
            <button
              onClick={() => onNavigateTab('locations')}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center space-x-1"
            >
              <span>{lang === 'bn' ? 'সব কেন্দ্র দেখুন' : 'View All'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {scopedAreas.map((area) => {
              const areaAssets = assets.filter((a) => a.assignedAreaId === area.id);
              const activeCount = areaAssets.filter((a) => a.usabilityStatus !== 'Disposed').length;
              return (
                <div
                  key={area.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center space-x-2 truncate mr-2">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">
                      {lang === 'bn' ? area.nameBn : area.nameEn}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      {activeCount} {lang === 'bn' ? 'সম্পদ' : 'assets'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
