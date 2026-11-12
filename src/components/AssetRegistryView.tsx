import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  ArrowUpDown,
  Boxes,
  Building,
  CheckCircle2,
  CheckSquare,
  Clock,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  MapPin,
  PlusCircle,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  Square,
  Tag,
  Trash2,
  TrendingDown,
  Truck,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { deduplicateAssets, inferItemTypeCode, storage } from '../services/storage';
import { Area, Asset, AssetCategory, UsabilityStatus, User } from '../types';
import { calculateDepreciation, formatBDT } from '../utils/depreciation';
import { exportAssetsToExcelCSV, exportAssetsToExcelHTML } from '../utils/exportToExcel';
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
  onPrintTag?: (asset: Asset) => void;
  onOpenPrintTagSheet?: (assets: Asset[]) => void;
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
  onPrintTag,
  onOpenPrintTagSheet,
}) => {
  const t = translations[lang];

  // Filters & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedItemType, setSelectedItemType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isExcelDropdownOpen, setIsExcelDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
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
    const matched = scopedAssets.filter((asset) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle =
          (asset.titleEn || '').toLowerCase().includes(q) ||
          (asset.titleBn || '').toLowerCase().includes(q);
        const matchId = (asset.id || '').toLowerCase().includes(q);
        const matchCategory = (asset.category || '').toLowerCase().includes(q);
        const code = asset.itemTypeCode || inferItemTypeCode(asset.titleEn, asset.category);
        const matchCode = code.toLowerCase().includes(q);
        const matchSerial = (asset.serialNumber || '').toLowerCase().includes(q);
        const matchVendor = (asset.donorOrVendor || '').toLowerCase().includes(q);
        const matchRoom = (asset.specificRoom || '').toLowerCase().includes(q);
        const matchRemarks = (asset.remarks || '').toLowerCase().includes(q);

        if (
          !matchTitle &&
          !matchId &&
          !matchCategory &&
          !matchCode &&
          !matchSerial &&
          !matchVendor &&
          !matchRoom &&
          !matchRemarks
        ) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'ALL' && asset.category !== selectedCategory) {
        return false;
      }

      // Specific Item Tag Code (e.g. PNT, PC, CHR)
      if (selectedItemType !== 'ALL') {
        const code = (asset.itemTypeCode || inferItemTypeCode(asset.titleEn, asset.category)).toUpperCase();
        if (code !== selectedItemType.toUpperCase() && !asset.id.toUpperCase().includes(`-${selectedItemType.toUpperCase()}-`)) {
          return false;
        }
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

    return deduplicateAssets(matched);
  }, [scopedAssets, searchQuery, selectedCategory, selectedItemType, selectedStatus, selectedArea]);

  // Export Handlers
  const handleExportFilteredCSV = () => {
    setIsExcelDropdownOpen(false);
    exportAssetsToExcelCSV(
      filteredAssets,
      areas,
      `LEEDO_Asset_Registry_${selectedCategory}`,
      lang
    );
  };

  const handleExportFullDatabaseCSV = () => {
    setIsExcelDropdownOpen(false);
    exportAssetsToExcelCSV(assets, areas, 'LEEDO_FULL_DATABASE_ALL_ASSETS', lang);
  };

  const handleExportFilteredExcel = () => {
    setIsExcelDropdownOpen(false);
    exportAssetsToExcelHTML(
      filteredAssets,
      areas,
      'LEEDO_Asset_Registry_Filtered',
      'LEEDO Asset Registry - Filtered Export'
    );
  };

  const handleExportFullDatabaseExcel = () => {
    setIsExcelDropdownOpen(false);
    exportAssetsToExcelHTML(
      assets,
      areas,
      'LEEDO_FULL_DATABASE_ALL_ASSETS',
      'LEEDO Complete Master Asset Registry (All 13 Centers)'
    );
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

          {/* Action Buttons: Add Asset, Bulk Import, Print Tag Sheet, Excel Export */}
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
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-900 shadow-xs transition-colors cursor-pointer"
                  title="Bulk Import / Upload from Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'bn' ? 'এক্সেল বাল্ক আপলোড' : 'Excel Bulk Upload'}</span>
                </button>
              </>
            )}

            {/* Batch / Selective Asset Tag Sticker Sheet Print */}
            {onOpenPrintTagSheet && (
              <button
                onClick={() => {
                  const toPrint =
                    selectedAssetIds.size > 0
                      ? assets.filter((a) => selectedAssetIds.has(a.id))
                      : filteredAssets;
                  onOpenPrintTagSheet(toPrint);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors shadow-2xs cursor-pointer"
                title={lang === 'bn' ? 'ট্যাগ স্টিকার শিট প্রিন্ট করুন' : 'Print QR Tag Sticker Sheet'}
              >
                <QrCode className="w-4 h-4 text-red-600" />
                <span>
                  {selectedAssetIds.size > 0
                    ? lang === 'bn'
                      ? `ট্যাগ শিট (${selectedAssetIds.size})`
                      : `Tag Sheet (${selectedAssetIds.size})`
                    : lang === 'bn'
                    ? 'ট্যাগ শিট প্রিন্ট'
                    : 'Print Tag Sheet'}
                </span>
              </button>
            )}

            {/* Excel Export Dropdown (Filtered vs Full Database) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExcelDropdownOpen(!isExcelDropdownOpen)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
                title="Export as Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'bn' ? 'এক্সেল ▾' : 'Excel ▾'}</span>
              </button>

              {isExcelDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1.5 text-xs text-slate-800 animate-in fade-in duration-100">
                  <div className="px-3 py-1 font-bold text-[10px] uppercase text-slate-400 border-b border-slate-100">
                    {lang === 'bn' ? 'এক্সেল এক্সপোর্ট অপশন' : 'Excel Export Options'}
                  </div>

                  <button
                    onClick={handleExportFilteredExcel}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-slate-800 flex items-center space-x-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">
                        {lang === 'bn'
                          ? `বর্তমান ফিল্টার এক্সেল (${filteredAssets.length}টি)`
                          : `Export Filtered List (${filteredAssets.length})`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {lang === 'bn' ? 'স্ক্রিনে প্রদর্শিত তালিকা' : 'Currently active filters'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportFullDatabaseExcel}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-slate-800 flex items-center space-x-2 border-t border-slate-100 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-red-600 shrink-0" />
                    <div>
                      <div className="font-black text-red-700">
                        {lang === 'bn'
                          ? `সম্পূর্ণ ডাটাবেজ এক্সেল (${assets.length}টি)`
                          : `Export Full Database (${assets.length})`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {lang === 'bn'
                          ? 'সমস্ত ১৩টি শাখা ও ক্যাটাগরির ১৭২+ সম্পদ'
                          : 'All centers, all categories full database'}
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={handleExportFullDatabaseCSV}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600 text-[11px] cursor-pointer flex items-center space-x-1.5"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      <span>{lang === 'bn' ? 'CSV ফরম্যাট (UTF-8 BOM)' : 'CSV format (with UTF-8)'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
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

          {/* Item Tag Code Dropdown (e.g. PNT, PC, CHR) */}
          <div>
            <select
              value={selectedItemType}
              onChange={(e) => setSelectedItemType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white font-bold outline-none focus:ring-1 focus:ring-red-500 font-mono"
            >
              <option value="ALL">{lang === 'bn' ? 'সকল ট্যাগ কোড (All Codes)' : 'All Tag Codes'}</option>
              <optgroup label="IT & Electronics">
                <option value="PNT">[PNT] Printer / প্রিন্টার</option>
                <option value="PC">[PC] Desktop PC / কম্পিউটার</option>
                <option value="MON">[MON] Monitor / মনিটর</option>
                <option value="LAP">[LAP] Laptop / ল্যাপটপ</option>
                <option value="CAM">[CAM] CCTV Camera / ক্যামেরা</option>
                <option value="RTR">[RTR] Router / রাউটার</option>
                <option value="TV">[TV] Television / টিভি</option>
                <option value="BIO">[BIO] Biometric / ফিঙ্গারপ্রিন্ট</option>
                <option value="SCN">[SCN] Scanner & Copier</option>
                <option value="UPS">[UPS] UPS / IPS</option>
                <option value="MPG">[MPG] Multiplug / মাল্টিপ্লাগ</option>
              </optgroup>
              <optgroup label="Furniture">
                <option value="TBL">[TBL] Table / টেবিল</option>
                <option value="CHR">[CHR] Chair / চেয়ার</option>
                <option value="ALM">[ALM] Almari / আলমারি</option>
                <option value="CAB">[CAB] File Cabinet / ক্যাবিনেট</option>
                <option value="SFA">[SFA] Sofa / সোফা</option>
                <option value="BED">[BED] Bed & Cot / খাট</option>
                <option value="RCK">[RCK] Rack & Shelf / র‍্যাক</option>
                <option value="TRK">[TRK] Trunk / ট্রাঙ্ক</option>
              </optgroup>
              <optgroup label="Appliances">
                <option value="FAN">[FAN] Ceiling Fan / ফ্যান</option>
                <option value="FRZ">[FRZ] Refrigerator / ফ্রিজ</option>
                <option value="WFL">[WFL] Water Filter / ফিল্টার</option>
                <option value="AC">[AC] Air Conditioner / এসি</option>
                <option value="SWM">[SWM] Sewing Machine / সেলাই</option>
                <option value="IRN">[IRN] Iron Machine / ইস্ত্রি</option>
              </optgroup>
              <optgroup label="Other Categories">
                <option value="WBD">[WBD] White Board / বোর্ড</option>
                <option value="GST">[GST] Gas Stove / চুলা</option>
                <option value="MED">[MED] First Aid / মেডিকেল</option>
                <option value="FIR">[FIR] Fire Extinguisher</option>
                <option value="LGT">[LGT] Light / লাইট</option>
                <option value="VEH">[VEH] Vehicle / গাড়ি</option>
              </optgroup>
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
            {(searchQuery || selectedCategory !== 'ALL' || selectedItemType !== 'ALL' || selectedStatus !== 'ALL' || selectedArea !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedItemType('ALL');
                  setSelectedStatus('ALL');
                  setSelectedArea('ALL');
                }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t.resetFilters}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Select Floating Action Banner */}
      {selectedAssetIds.size > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-black text-sm">
              {lang === 'bn'
                ? `${selectedAssetIds.size}টি সম্পদ নির্বাচিত হয়েছে`
                : `${selectedAssetIds.size} asset(s) selected`}
            </span>
            <span className="text-slate-500">|</span>
            <button
              onClick={() => {
                const next = new Set(assets.map((a) => a.id));
                setSelectedAssetIds(next);
              }}
              className="text-red-400 hover:text-red-300 font-bold underline text-xs cursor-pointer"
            >
              {lang === 'bn' ? `পুরো ডাটাবেজ নির্বাচন (${assets.length}টি)` : `Select All in DB (${assets.length})`}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenPrintTagSheet && (
              <button
                onClick={() => {
                  const toPrint = assets.filter((a) => selectedAssetIds.has(a.id));
                  onOpenPrintTagSheet(toPrint);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>
                  {lang === 'bn'
                    ? `🖨️ নির্বাচিত ট্যাগ শিট প্রিন্ট (${selectedAssetIds.size}টি)`
                    : `Print Tag Sheet (${selectedAssetIds.size})`}
                </span>
              </button>
            )}

            <button
              onClick={() => setSelectedAssetIds(new Set())}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'নির্বাচন বাতিল' : 'Clear'}
            </button>
          </div>
        </div>
      )}

      {/* Asset Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700">
              {lang === 'bn'
                ? `সম্পদ প্রদর্শিত হচ্ছে: ${filteredAssets.length} টি`
                : `Showing ${filteredAssets.length} asset${filteredAssets.length !== 1 ? 's' : ''}`}
            </span>
            {selectedAssetIds.size > 0 && (
              <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full border border-red-200">
                {selectedAssetIds.size} {lang === 'bn' ? 'টি সিলেক্টেড' : 'selected'}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            {lang === 'bn' ? 'চেকবক্সে টিক দিয়ে ট্যাগ প্রিন্ট করুন বা লাইফসাইকেল কার্ড দেখতে ক্লিক করুন' : 'Select checkboxes to print tags or click row for details'}
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs px-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200 shadow-2xs">
              <Boxes className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-bold text-sm text-slate-800">
              {assets.length === 0
                ? (lang === 'bn' ? 'ডাটাবেজ বর্তমানে সম্পূর্ণ খালি ও ফ্রেশ' : 'Asset Registry is Clean & Ready')
                : (lang === 'bn' ? 'কোনো সম্পদ খুঁজে পাওয়া যায়নি' : 'No matching assets found')}
            </p>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {assets.length === 0
                ? (lang === 'bn'
                    ? 'আপনার প্রতিষ্ঠানের নতুন বাস্তব সম্পদ যুক্ত করতে উপরের "+ নতুন সম্পদ যোগ" অথবা "বাল্ক আমদানি" ব্যবহার করুন।'
                    : 'Start fresh by registering your official assets using "+ Add New Asset" or "Bulk Import".')
                : (lang === 'bn' ? 'অনুগ্রহ করে ফিল্টার বা সার্চ কিওয়ার্ড পরিবর্তন করে চেষ্টা করুন।' : 'Try adjusting your search filters.')}
            </p>
            {assets.length === 0 && currentUser.canManageAssets && (
              <div className="mt-5 flex items-center justify-center space-x-2.5">
                <button
                  onClick={onOpenAddModal}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t.addNewAsset}</span>
                </button>
                <button
                  onClick={() => setIsBulkImportOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'bn' ? 'বাল্ক আমদানি' : 'Bulk Import'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={filteredAssets.length > 0 && filteredAssets.every((a) => selectedAssetIds.has(a.id))}
                      onChange={(e) => {
                        const next = new Set(selectedAssetIds);
                        if (e.target.checked) {
                          filteredAssets.forEach((a) => next.add(a.id));
                        } else {
                          filteredAssets.forEach((a) => next.delete(a.id));
                        }
                        setSelectedAssetIds(next);
                      }}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer w-4 h-4"
                      title={lang === 'bn' ? 'সকল ফিল্টারকৃত সম্পদ নির্বাচন করুন' : 'Select all filtered assets'}
                    />
                  </th>
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
                {filteredAssets.map((asset, index) => {
                  const area = areas.find((ar) => ar.id === asset.assignedAreaId);
                  const dep = calculateDepreciation(asset.purchaseDate, asset.purchaseValueBDT, asset.category);

                  return (
                    <tr
                      key={`${asset.id}_${index}`}
                      className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                        selectedAssetIds.has(asset.id) ? 'bg-red-50/40' : ''
                      }`}
                      onClick={() => onSelectAsset(asset)}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3.5 text-center w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.has(asset.id)}
                          onChange={(e) => {
                            const next = new Set(selectedAssetIds);
                            if (e.target.checked) {
                              next.add(asset.id);
                            } else {
                              next.delete(asset.id);
                            }
                            setSelectedAssetIds(next);
                          }}
                          className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer w-4 h-4"
                        />
                      </td>

                      {/* Asset ID */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            {asset.id}
                          </span>
                          {asset.itemTypeCode && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px] border border-slate-200">
                              {asset.itemTypeCode}
                            </span>
                          )}
                        </div>
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
                          {/* Print QR Asset Tag Sticker */}
                          {onPrintTag && (
                            <button
                              onClick={() => onPrintTag(asset)}
                              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title={lang === 'bn' ? 'কিউআর ট্যাগ স্টিকার প্রিন্ট করুন' : 'Print QR Tag Sticker'}
                            >
                              <QrCode className="w-4 h-4 text-red-600" />
                            </button>
                          )}

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
