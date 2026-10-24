import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  ArrowUpDown,
  Building,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  MapPin,
  PlusCircle,
  QrCode,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  TrendingDown,
  Truck,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { storage } from '../services/storage';
import { Area, Asset, AssetCategory, UsabilityStatus, User } from '../types';
import { calculateDepreciation, formatBDT } from '../utils/depreciation';
import { BulkImportAssetsModal } from './BulkImportAssetsModal';

interface AssetRegistryViewProps {
  currentUser: User;
  assets: Asset[];
  areas: Area[];
  lang: Language;
  onOpenAddModal: () => void;
  onSelectAsset: (asset: Asset) => void;
  onOpenQuickUpdate: (asset: Asset) => void;
  onOpenDisposalRequest: (asset: Asset) => void;
  onOpenTransfer: (asset: Asset) => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
}

export const AssetRegistryView: React.FC<AssetRegistryViewProps> = ({
  currentUser,
  assets,
  areas,
  lang,
  onOpenAddModal,
  onSelectAsset,
  onOpenQuickUpdate,
  onOpenDisposalRequest,
  onOpenTransfer,
  onEditAsset,
  onDeleteAsset,
}) => {
  const t = translations[lang];

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isConfirmClearDemoOpen, setIsConfirmClearDemoOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  // Tenant / Area scoping
  const isGlobal = currentUser.assignedAreaIds.includes('ALL');
  const scopedAssets = useMemo(() => {
    return isGlobal
      ? assets
      : assets.filter((a) => currentUser.assignedAreaIds.includes(a.assignedAreaId));
  }, [assets, currentUser, isGlobal]);

  // Available areas for the user in dropdown
  const availableAreas = useMemo(() => {
    return isGlobal
      ? areas
      : areas.filter((ar) => currentUser.assignedAreaIds.includes(ar.id));
  }, [areas, currentUser, isGlobal]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return scopedAssets.filter((asset) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (asset.titleEn || '').toLowerCase().includes(q) ||
          (asset.titleBn || '').toLowerCase().includes(q);
        const matchId = (asset.id || '').toLowerCase().includes(q);
        const matchSerial = (asset.serialNumber || '').toLowerCase().includes(q);
        const matchVendor = (asset.donorOrVendor || '').toLowerCase().includes(q);
        const matchRoom = (asset.specificRoom || '').toLowerCase().includes(q);

        if (!matchTitle && !matchId && !matchSerial && !matchVendor && !matchRoom) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'ALL' && asset.category !== selectedCategory) {
        return false;
      }

      // Status
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'in_transit') {
          if (asset.transferStatus !== 'in_transit') return false;
        } else if (asset.usabilityStatus !== selectedStatus) {
          return false;
        }
      }

      // Area
      if (selectedArea !== 'ALL' && asset.assignedAreaId !== selectedArea) {
        return false;
      }

      return true;
    });
  }, [scopedAssets, searchQuery, selectedCategory, selectedStatus, selectedArea]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Asset ID',
      'Asset Title (En)',
      'Category',
      'Acquisition Type',
      'Donor / Vendor',
      'Purchase Date',
      'Purchase Value (BDT)',
      'Current Book Value (BDT)',
      'Depreciation %',
      'Initial Condition',
      'Usability Status',
      'Area Code',
      'Area Name',
      'Specific Room',
      'Serial Number',
      'Remarks',
    ];

    const rows = filteredAssets.map((a) => {
      const area = areas.find((ar) => ar.id === a.assignedAreaId);
      const dep = calculateDepreciation(a.purchaseDate, a.purchaseValueBDT, a.category);
      return [
        `"${a.id}"`,
        `"${a.titleEn}"`,
        `"${a.category}"`,
        `"${a.acquisitionType}"`,
        `"${a.donorOrVendor || ''}"`,
        `"${a.purchaseDate}"`,
        a.purchaseValueBDT,
        dep.currentBookValue,
        `${dep.depreciationPercent}%`,
        `"${a.initialCondition}"`,
        `"${a.usabilityStatus}"`,
        `"${area?.code || ''}"`,
        `"${area?.nameEn || ''}"`,
        `"${a.specificRoom || ''}"`,
        `"${a.serialNumber || ''}"`,
        `"${(a.remarks || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `LEEDO_Asset_Registry_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: UsabilityStatus, transferStatus?: string) => {
    if (transferStatus === 'in_transit') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <Truck className="w-3 h-3" />
          <span>{t.statusInTransit}</span>
        </span>
      );
    }
    switch (status) {
      case 'Usable':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{t.statusUsable}</span>
          </span>
        );
      case 'Repairable':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Wrench className="w-3 h-3 text-amber-600" />
            <span>{t.statusRepairable}</span>
          </span>
        );
      case 'Unusable':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            <span>{t.statusUnusable}</span>
          </span>
        );
      case 'Disposed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
            <span>{t.statusDisposed}</span>
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: AssetCategory) => {
    const key = `cat_${cat}` as keyof typeof t;
    return t[key] || cat;
  };

  return (
    <div className="space-y-5">
      {/* Scope Notice Banner */}
      {!isGlobal && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{t.areaScope}:</strong> {availableAreas.map((a) => (lang === 'bn' ? a.nameBn : a.nameEn)).join(', ')} (
              {scopedAssets.length} {lang === 'bn' ? 'সম্পদ বরাদ্দকৃত' : 'assets assigned to your centers'})
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
            {lang === 'bn' ? 'কঠোর এলাকা আইসোলেশন সক্রিয়' : 'Strict Area Scoping Enforced'}
          </span>
        </div>
      )}

      {/* Top Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-medium"
            />
          </div>

          {/* Action Buttons: Add Asset, Bulk Import, CSV Export, Table/Card Toggle */}
          <div className="flex items-center space-x-2 shrink-0">
            {currentUser.canManageAssets && (
              <>
                <button
                  onClick={onOpenAddModal}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t.addNewAsset}</span>
                </button>

                <button
                  onClick={() => setIsBulkImportOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-900 shadow-xs transition-colors cursor-pointer"
                  title="Bulk Import / Replace Assets"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'bn' ? 'বাল্ক আমদানি / প্রতিস্থাপন' : 'Bulk Import'}</span>
                </button>

                <button
                  onClick={() => setIsConfirmClearDemoOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
                  title={lang === 'bn' ? 'ডেমো সম্পদ বাদ দিয়ে নতুন শুরু করুন' : 'Clear Demo Assets & Start Fresh'}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{lang === 'bn' ? 'ডেমো সম্পদ বাদ দিন' : 'Clear Demo Assets'}</span>
                </button>
              </>
            )}

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
              title="Export as Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === 'bn' ? 'এক্সেল (Excel / CSV)' : 'Export Excel'}</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-white font-medium outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="ALL">{t.allCategories}</option>
              <option value="IT_Electronics">{t.cat_IT_Electronics}</option>
              <option value="Furniture">{t.cat_Furniture}</option>
              <option value="Vehicle">{t.cat_Vehicle}</option>
              <option value="Kitchenware">{t.cat_Kitchenware}</option>
              <option value="Educational">{t.cat_Educational}</option>
              <option value="Appliances">{t.cat_Appliances}</option>
              <option value="Medical">{t.cat_Medical}</option>
              <option value="Facility">{t.cat_Facility}</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-white font-medium outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="ALL">{t.allStatuses}</option>
              <option value="Usable">{t.statusUsable}</option>
              <option value="Repairable">{t.statusRepairable}</option>
              <option value="Unusable">{t.statusUnusable}</option>
              <option value="in_transit">{t.statusInTransit}</option>
              <option value="Disposed">{t.statusDisposed}</option>
            </select>
          </div>

          {/* Area Dropdown */}
          <div>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-white font-medium outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="ALL">{t.allAreas}</option>
              {availableAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {lang === 'bn' ? a.nameBn : a.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-center justify-end">
            {(searchQuery || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedArea !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedStatus('ALL');
                  setSelectedArea('ALL');
                }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t.resetFilters}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Asset Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            {lang === 'bn'
              ? `সম্পদ প্রদর্শিত হচ্ছে: ${filteredAssets.length} টি`
              : `Showing ${filteredAssets.length} asset${filteredAssets.length !== 1 ? 's' : ''}`}
          </span>
          <div className="text-xs text-slate-400">
            {lang === 'bn' ? 'ক্লিক করে সম্পূর্ণ ডিটেইলস ও অবচয় দেখুন' : 'Click any row for lifecycle card'}
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">{lang === 'bn' ? 'কোনো সম্পদ পাওয়া যায়নি' : 'No assets found'}</p>
            <p className="text-slate-400 mt-1">{lang === 'bn' ? 'ফিল্টার পরিবর্তন করে চেষ্টা করুন।' : 'Try adjusting your search filters.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-left">{t.assetId}</th>
                  <th className="px-4 py-3 text-left">{t.assetTitle}</th>
                  <th className="px-4 py-3 text-left">{t.assignedArea}</th>
                  <th className="px-4 py-3 text-left">{t.purchaseDate}</th>
                  <th className="px-4 py-3 text-right">{t.purchaseValue}</th>
                  <th className="px-4 py-3 text-right">{t.estimatedCurrentValue}</th>
                  <th className="px-4 py-3 text-center">{t.currentCondition}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {filteredAssets.map((asset) => {
                  const area = areas.find((ar) => ar.id === asset.assignedAreaId);
                  const dep = calculateDepreciation(asset.purchaseDate, asset.purchaseValueBDT, asset.category);

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectAsset(asset)}
                    >
                      {/* Asset ID */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                          {asset.id}
                        </span>
                      </td>

                      {/* Title & Category */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                          {asset.titleEn}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                            {getCategoryLabel(asset.category)}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500">
                            {asset.acquisitionType === 'Donation'
                              ? `${t.donation} (${asset.donorOrVendor})`
                              : `${t.purchased}`}
                          </span>
                          {asset.serialNumber && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-slate-400">S/N: {asset.serialNumber}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Assigned Center & Room */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>{area ? (lang === 'bn' ? area.nameBn : area.nameEn) : 'Unknown'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 pl-4">
                          {asset.specificRoom || 'General Area'}
                        </div>
                      </td>

                      {/* Purchase Date & Age */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                        <div>{asset.purchaseDate}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {dep.ageFormatted}
                        </div>
                      </td>

                      {/* Original Cost */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-semibold text-slate-700">
                        {formatBDT(asset.purchaseValueBDT)}
                      </td>

                      {/* Current Book Value */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="font-bold text-red-600">
                          {formatBDT(dep.currentBookValue)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          -{dep.depreciationPercent}% ({formatBDT(dep.totalDepreciation)})
                        </div>
                      </td>

                      {/* Usability Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        {getStatusBadge(asset.usabilityStatus, asset.transferStatus)}
                      </td>

                      {/* Action Menu Buttons */}
                      <td
                        className="px-4 py-3.5 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()} // Prevent row click
                      >
                        <div className="flex items-center justify-end space-x-1">
                          {/* Quick Location / Condition Update for Field Staff & Incharges */}
                          <button
                            onClick={() => onOpenQuickUpdate(asset)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={t.quickUpdateCondition}
                          >
                            <Wrench className="w-4 h-4" />
                          </button>

                          {/* Request Disposal (Area Incharges & HO) */}
                          {asset.usabilityStatus !== 'Disposed' && (
                            <button
                              onClick={() => onOpenDisposalRequest(asset)}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title={t.requestDisposal}
                            >
                              <AlertOctagon className="w-4 h-4" />
                            </button>
                          )}

                          {/* Initiate Transfer (Asset Managers & HO) */}
                          {currentUser.canManageAssets && asset.usabilityStatus !== 'Disposed' && asset.transferStatus !== 'in_transit' && (
                            <button
                              onClick={() => onOpenTransfer(asset)}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t.initiateTransfer}
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Asset details (Asset Managers & HO) */}
                          {currentUser.canManageAssets && (
                            <button
                              onClick={() => onEditAsset(asset)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title={t.editAsset}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Asset (HO only) */}
                          {currentUser.role === 'hr_admin' && (
                            <button
                              onClick={() => setAssetToDelete(asset)}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title={t.deleteAsset}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clear Demo Assets Confirmation Modal */}
      {isConfirmClearDemoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-rose-700 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold">
                  {lang === 'bn' ? 'ডেমো সম্পদ মুছে খালি করবেন?' : 'Clear All Demo Assets?'}
                </h3>
              </div>
              <button
                onClick={() => setIsConfirmClearDemoOpen(false)}
                className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-rose-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p className="leading-relaxed">
                {lang === 'bn'
                  ? 'গুগল ফায়ারবেস ক্লাউড ডেটাবেজ ও লোকাল স্টোরেজ থেকে পূর্ববর্তী সমস্ত নমুনা বা ডেমো অ্যাসেট মুছে ফেলা হবে। এটি অপরিবর্তনযোগ্য।'
                  : 'All previous sample or mock assets will be permanently removed from Google Firebase Cloud Firestore and local storage.'}
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                <span className="font-bold block">
                  {lang === 'bn' ? 'মুছে ফেলার পর:' : 'After clearing:'}
                </span>
                <p className="text-[11px]">
                  {lang === 'bn'
                    ? 'আপনি আপনার প্রতিষ্ঠানের বাস্তব সম্পদ তালিকা এক এক করে (+ নতুন সম্পদ যোগ) অথবা এক্সেল থেকে পেস্ট করে (বাল্ক আমদানি) যুক্ত করতে পারবেন।'
                    : 'You can insert your official institutional assets individually or bulk-paste from Excel.'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsConfirmClearDemoOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200 rounded-xl font-medium transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  storage.clearAssets();
                  setIsConfirmClearDemoOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {lang === 'bn' ? 'হ্যাঁ, ডেমো সম্পদ মুছে ফেলুন' : 'Yes, Clear All Demo Assets'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Asset Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold">
                  {lang === 'bn' ? 'সম্পদ স্থায়ীভাবে ডিলিট' : 'Permanently Delete Asset'}
                </h3>
              </div>
              <button
                onClick={() => setAssetToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2 text-xs text-slate-700">
              <p>
                {lang === 'bn'
                  ? 'আপনি কি নিশ্চিত যে এই সম্পদটি ফায়ারবেস ক্লাউড ডেটাবেজ থেকে স্থায়ীভাবে মুছে ফেলতে চান?'
                  : 'Are you sure you want to permanently delete this asset from the Firebase Cloud database?'}
              </p>
              <div className="p-2.5 bg-slate-100 rounded-lg font-mono text-[11px] text-slate-800">
                <span className="font-bold block text-slate-900">{assetToDelete.titleEn}</span>
                <span className="text-slate-500">ID: {assetToDelete.id}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setAssetToDelete(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-100 cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  onDeleteAsset(assetToDelete);
                  setAssetToDelete(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer"
              >
                {lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import & Demo Asset Replacement Modal */}
      <BulkImportAssetsModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        areas={areas}
        currentUser={currentUser}
        lang={lang}
        onImportComplete={() => {
          setIsBulkImportOpen(false);
        }}
      />
    </div>
  );
};
