import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Filter,
  Grid,
  Layers,
  List,
  MapPin,
  Printer,
  ShieldCheck,
  Tag,
  TrendingDown,
  Wrench,
  X,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { deduplicateAssets, inferItemTypeCode, storage } from '../services/storage';
import { Area, Asset, AssetCategory, UsabilityStatus, User } from '../types';
import { calculateDepreciation, formatBDT } from '../utils/depreciation';
import { exportAssetsToExcelCSV, exportAssetsToExcelHTML, getCategoryName } from '../utils/exportToExcel';

interface PrintAuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  areas: Area[];
  currentUser: User;
  lang: Language;
}

export const PrintAuditReportModal: React.FC<PrintAuditReportModalProps> = ({
  isOpen,
  onClose,
  assets,
  areas,
  currentUser,
  lang,
}) => {
  const t = translations[lang];
  const orgProfile = storage.getOrgProfile();

  // Check if current user is Head Office / Global
  const isHeadOffice =
    currentUser.role === 'head_office' ||
    currentUser.role === 'hr_admin' ||
    currentUser.assignedAreaIds.includes('ALL');

  // Available areas for filtering
  const availableAreas = useMemo(() => {
    return isHeadOffice
      ? areas
      : areas.filter((a) => currentUser.assignedAreaIds.includes(a.id));
  }, [areas, currentUser, isHeadOffice]);

  // Report Form Filters State
  const [reportMode, setReportMode] = useState<'inventory' | 'disposed'>('inventory');
  const [groupingMode, setGroupingMode] = useState<'category' | 'flat'>('category');
  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    isHeadOffice ? 'ALL' : availableAreas[0]?.id || 'ALL'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [isExcelDropdownOpen, setIsExcelDropdownOpen] = useState(false);

  // Base Scoped Assets (Tenant isolation for field staff, full access for HO)
  const scopedAssets = useMemo(() => {
    if (isHeadOffice) return assets;
    return assets.filter((a) => currentUser.assignedAreaIds.includes(a.assignedAreaId));
  }, [assets, currentUser, isHeadOffice]);

  // Filtered Assets based on user selections
  const filteredAssets = useMemo(() => {
    const list = scopedAssets.filter((asset) => {
      // Disposed mode
      if (reportMode === 'disposed') {
        if (asset.usabilityStatus !== 'Disposed') return false;
      } else {
        if (selectedCondition !== 'ALL' && asset.usabilityStatus !== selectedCondition) {
          return false;
        }
      }

      // Area filter
      if (selectedAreaId !== 'ALL' && asset.assignedAreaId !== selectedAreaId) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && asset.category !== selectedCategory) {
        return false;
      }

      return true;
    });

    return deduplicateAssets(list);
  }, [scopedAssets, reportMode, selectedAreaId, selectedCategory, selectedCondition]);

  // Grouped by Category
  const groupedByCategory = useMemo(() => {
    const groups: { category: AssetCategory; items: Asset[] }[] = [];
    const categoryOrder: AssetCategory[] = [
      'Furniture',
      'IT_Electronics',
      'Appliances',
      'Vehicle',
      'Kitchenware',
      'Educational',
      'Facility',
      'Medical',
    ];

    categoryOrder.forEach((cat) => {
      const items = filteredAssets.filter((a) => a.category === cat);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    });

    // Catch any remaining categories
    const remaining = filteredAssets.filter(
      (a) => !categoryOrder.includes(a.category as AssetCategory)
    );
    if (remaining.length > 0) {
      groups.push({ category: remaining[0].category as AssetCategory, items: remaining });
    }

    return groups;
  }, [filteredAssets]);

  // Human Area Name helper
  const getAreaName = (areaId: string): string => {
    const matched = areas.find((a) => a.id === areaId);
    if (!matched) return lang === 'bn' ? 'সাধারণ এলাকা' : 'General Area';
    return lang === 'bn' ? matched.nameBn : matched.nameEn;
  };

  // Condition translation helper
  const getConditionLabel = (status: UsabilityStatus) => {
    switch (status) {
      case 'Usable':
        return lang === 'bn' ? 'ব্যবহারযোগ্য (Usable)' : 'Usable';
      case 'Repairable':
        return lang === 'bn' ? 'মেরামতযোগ্য (Repairable)' : 'Repairable';
      case 'Unusable':
        return lang === 'bn' ? 'অব্যবহার্য (Unusable)' : 'Unusable';
      case 'Disposed':
        return lang === 'bn' ? 'বাতিলকৃত / অপসারিত (Disposed)' : 'Disposed';
    }
  };

  // Aggregate Financial Statistics
  let totalOriginalCost = 0;
  let totalCurrentBookValue = 0;
  let countUsable = 0;
  let countRepairable = 0;
  let countUnusable = 0;
  let countDisposed = 0;
  let totalSalvageRecovered = 0;

  filteredAssets.forEach((a) => {
    totalOriginalCost += a.purchaseValueBDT || 0;
    const dep = calculateDepreciation(a.purchaseDate, a.purchaseValueBDT, a.category);
    totalCurrentBookValue += dep.currentBookValue;
    if (a.salvageValueBDT) {
      totalSalvageRecovered += a.salvageValueBDT;
    }

    if (a.usabilityStatus === 'Usable') countUsable++;
    else if (a.usabilityStatus === 'Repairable') countRepairable++;
    else if (a.usabilityStatus === 'Unusable') countUnusable++;
    else if (a.usabilityStatus === 'Disposed') countDisposed++;
  });

  const totalDepreciation = Math.max(0, totalOriginalCost - totalCurrentBookValue);

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Export Filtered CSV
  const handleExportFilteredCSV = () => {
    setIsExcelDropdownOpen(false);
    exportAssetsToExcelCSV(
      filteredAssets,
      areas,
      `LEEDO_Asset_Report_${selectedCategory}_${reportMode}`,
      lang
    );
  };

  // Export Full Database CSV
  const handleExportFullDatabaseCSV = () => {
    setIsExcelDropdownOpen(false);
    exportAssetsToExcelCSV(assets, areas, `LEEDO_FULL_DATABASE_ALL_ASSETS`, lang);
  };

  // Export Filtered Excel HTML (.xls)
  const handleExportFilteredExcel = () => {
    setIsExcelDropdownOpen(false);
    exportAssetsToExcelHTML(
      filteredAssets,
      areas,
      `LEEDO_Asset_Report_Filtered`,
      `LEEDO Asset Audit - ${selectedCategory === 'ALL' ? 'All Categories' : selectedCategory}`
    );
  };

  // Export Full Database Excel HTML (.xls)
  const handleExportFullDatabaseExcel = () => {
    setIsExcelDropdownOpen(false);
    exportAssetsToExcelHTML(
      assets,
      areas,
      `LEEDO_FULL_MASTER_DATABASE`,
      'LEEDO Full Organization Asset Database (Consolidated)'
    );
  };

  // Selected Scope Display Title
  const getScopeDescription = () => {
    if (selectedAreaId === 'ALL') {
      return lang === 'bn'
        ? 'সকল ১৩টি কেন্দ্র ও প্রধান কার্যালয় (সার্বজনীন অডিট)'
        : 'All 13 Centers & Head Office (Consolidated Scope)';
    }
    return getAreaName(selectedAreaId);
  };

  const getReportHeaderTitle = () => {
    if (reportMode === 'disposed') {
      return lang === 'bn'
        ? 'বাতিলকৃত মালামালের রেজিস্টার ও নিষ্পত্তির বিবরণী'
        : 'DISPOSED ASSETS REGISTER & DECOMMISSION AUDIT';
    }
    if (selectedCategory !== 'ALL') {
      return `${lang === 'bn' ? 'সম্পদ নিরীক্ষা রেজিস্টার - ' : 'OFFICIAL ASSET AUDIT REPORT - '}${getCategoryName(
        selectedCategory as AssetCategory,
        lang
      ).toUpperCase()}`;
    }
    return lang === 'bn'
      ? 'অফিসিয়াল সম্পদ নিরীক্ষা ও ইনভেন্টরি রেজিস্টার'
      : 'OFFICIAL ASSET AUDIT & INVENTORY REGISTER';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Print isolation stylesheet: ensures multi-page printing is pristine, no overflow cutoff */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 6mm 8mm 6mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-audit-report,
          #printable-audit-report * {
            visibility: visible !important;
          }
          #printable-audit-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .category-group-block {
            break-inside: auto !important;
            page-break-inside: auto !important;
            margin-bottom: 16px !important;
          }
          .audit-signatures-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-top: 24px !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-3 sm:my-6 flex flex-col max-h-[94vh]">
        {/* Top Interactive Configuration Bar (Hidden in Print via no-print) */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3.5 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-wide text-white">
                  {lang === 'bn' ? 'অ্যাসেট রিপোর্ট ফরম্যাট ও প্রিন্ট ভিউ' : 'Asset Report Format & Print View'}
                </span>
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.2 rounded font-semibold uppercase">
                  {reportMode === 'disposed'
                    ? lang === 'bn'
                      ? 'বাতিলকৃত রেজিস্টার'
                      : 'Disposed Register'
                    : lang === 'bn'
                    ? 'সাধারণ রেজিস্টার'
                    : 'Asset Register'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {lang === 'bn'
                  ? `ইউজার: ${currentUser.name} (${currentUser.designation}) • মোট সম্পদ: ${filteredAssets.length}টি`
                  : `User: ${currentUser.name} (${currentUser.designation}) • Count: ${filteredAssets.length} items`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 relative">
            {/* Excel Download Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExcelDropdownOpen(!isExcelDropdownOpen)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 border border-emerald-500 cursor-pointer shadow-xs"
                title="Download Excel / CSV Spreadsheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>{lang === 'bn' ? 'এক্সেল ডাউনলোড ▾' : 'Excel Export ▾'}</span>
              </button>

              {isExcelDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1.5 text-xs text-slate-800 animate-in fade-in duration-100">
                  <div className="px-3 py-1 font-bold text-[10px] uppercase text-slate-400 border-b border-slate-100">
                    {lang === 'bn' ? 'এক্সেল স্প্রেডশীট অপশন' : 'Excel Export Options'}
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
                        {lang === 'bn' ? 'নির্বাচিত ক্যাটাগরি ও এরিয়ার রিপোর্ট' : 'Current active report filter'}
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
                          ? 'সমস্ত ১৩টি শাখা ও ক্যাটাগরির পূর্ণাঙ্গ তথ্য'
                          : 'All 13 centers, all categories, full archive'}
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={handleExportFullDatabaseCSV}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600 text-[11px] cursor-pointer flex items-center space-x-1.5"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      <span>{lang === 'bn' ? 'CSV (UTF-8 BOM সহ)' : 'CSV (with UTF-8 BOM)'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Print / PDF Trigger */}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors flex items-center space-x-1 border border-slate-700 cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'বন্ধ করুন' : 'Close'}</span>
            </button>
          </div>
        </div>

        {/* Filter Configuration Toolbar (Hidden in Print via no-print) */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 no-print shrink-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mode Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-200/80 p-1 rounded-xl">
              <button
                onClick={() => setReportMode('inventory')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportMode === 'inventory'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'bn' ? 'সকল সম্পদ রেজিস্টার' : 'General Asset Register'}
              </button>

              {isHeadOffice && (
                <button
                  onClick={() => setReportMode('disposed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    reportMode === 'disposed'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-red-700 hover:bg-red-50'
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'bn'
                      ? 'বাতিলকৃত মালামাল ও তারিখ'
                      : 'Disposed Assets & Dates'}
                  </span>
                  <span className="text-[9px] bg-white/20 text-white px-1 py-0.2 rounded font-mono">
                    HO
                  </span>
                </button>
              )}
            </div>

            {/* Presentation / Grouping Selector */}
            {reportMode === 'inventory' && (
              <div className="flex items-center space-x-1.5 bg-slate-200/80 p-1 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5">
                  {lang === 'bn' ? 'গ্রুপিং:' : 'Group:'}
                </span>
                <button
                  type="button"
                  onClick={() => setGroupingMode('category')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    groupingMode === 'category'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Group assets under category sub-headers with sub-totals"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'ক্যাটাগরি ভিত্তিক গ্রুপ' : 'Group by Category'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGroupingMode('flat')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    groupingMode === 'flat'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Continuous single table list"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'একক তালিকা' : 'Continuous Table'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-200/60">
            {/* Area / Center Filter */}
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-slate-400 font-semibold">{lang === 'bn' ? 'এলাকা:' : 'Area:'}</span>
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer max-w-[150px] truncate"
              >
                {isHeadOffice && (
                  <option value="ALL">
                    {lang === 'bn' ? 'সকল ১৩টি এলাকা (All Areas)' : 'All 13 Areas (Global)'}
                  </option>
                )}
                {availableAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {lang === 'bn' ? area.nameBn : area.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 font-semibold">{lang === 'bn' ? 'ক্যাটাগরি:' : 'Cat:'}</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">{lang === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
                <option value="Furniture">{lang === 'bn' ? 'আসবাবপত্র (Furniture)' : 'Furniture & Fixtures'}</option>
                <option value="IT_Electronics">
                  {lang === 'bn' ? 'আইটি ও ইলেকট্রনিক্স (IT & Elec)' : 'IT & Electronics'}
                </option>
                <option value="Appliances">{lang === 'bn' ? 'গৃহস্থালি ও সরঞ্জাম' : 'Appliances'}</option>
                <option value="Vehicle">{lang === 'bn' ? 'যানবাহন' : 'Vehicles'}</option>
                <option value="Kitchenware">{lang === 'bn' ? 'রান্নাঘর সামগ্রী' : 'Kitchenware'}</option>
                <option value="Educational">{lang === 'bn' ? 'শিক্ষা উপকরণ' : 'Educational Materials'}</option>
                <option value="Facility">{lang === 'bn' ? 'স্থায়ী সুবিধা ও জেনারেটর' : 'Facility & Generator'}</option>
                <option value="Medical">{lang === 'bn' ? 'চিকিৎসা সামগ্রী' : 'Medical'}</option>
              </select>
            </div>

            {/* Condition Filter */}
            {reportMode === 'inventory' && (
              <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-400 font-semibold">{lang === 'bn' ? 'অবস্থা:' : 'Status:'}</span>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">{lang === 'bn' ? 'সকল অবস্থা (All)' : 'All Conditions'}</option>
                  <option value="Usable">{lang === 'bn' ? 'ব্যবহারযোগ্য (Usable)' : 'Usable'}</option>
                  <option value="Repairable">{lang === 'bn' ? 'মেরামতযোগ্য (Repairable)' : 'Repairable'}</option>
                  <option value="Unusable">{lang === 'bn' ? 'অব্যবহার্য (Unusable)' : 'Unusable'}</option>
                  <option value="Disposed">{lang === 'bn' ? 'বাতিলকৃত (Disposed)' : 'Disposed'}</option>
                </select>
              </div>
            )}

            <div className="ml-auto text-slate-500 font-medium text-[11px]">
              {lang === 'bn' ? 'মোট:' : 'Total:'}{' '}
              <span className="font-bold text-red-600">{filteredAssets.length}টি সম্পদ</span>
            </div>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div
          id="printable-audit-report"
          className="p-6 sm:p-8 space-y-6 text-slate-800 font-sans print-page overflow-y-auto flex-1 bg-white"
        >
          {/* Formal Official LEEDO Letterhead */}
          <div className="border-b-2 border-red-600 pb-4 flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 p-1 rounded-xl border border-red-200 flex items-center justify-center bg-white shadow-xs shrink-0 overflow-hidden">
                <img
                  src={orgProfile.logoUrl || '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png'}
                  alt="LEEDO Logo"
                  className="h-full w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-none">
                  {orgProfile.nameEn}
                </h1>
                <p className="text-xs font-bold text-red-600 mt-1">{orgProfile.nameBn}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {orgProfile.addressEn} • Tel: {orgProfile.phone}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  NGO Affairs Bureau Reg. No: {orgProfile.registrationNo} • Web: {orgProfile.website}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`text-[10px] uppercase font-black tracking-wider block border rounded px-2.5 py-1 ${
                  reportMode === 'disposed'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-50 text-slate-900 border-slate-300'
                }`}
              >
                {getReportHeaderTitle()}
              </span>
              <p className="text-[11px] text-slate-700 mt-1 font-bold">
                {lang === 'bn' ? 'তারিখ: ' : 'Date: '}
                {new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold">
                {lang === 'bn' ? 'প্রতিবেদক: ' : 'Prepared By: '}
                {currentUser.name}
              </p>
              <p className="text-[9px] text-slate-400 font-mono">
                EID: {currentUser.employeeId} ({currentUser.designation})
              </p>
            </div>
          </div>

          {/* Scope and Filter Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {lang === 'bn' ? 'রিপোর্টের আওতাভুক্ত কেন্দ্র / এলাকা' : 'Report Center / Area Scope'}
              </span>
              <p className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                <span>{getScopeDescription()}</span>
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                </span>
                <p className="font-bold text-slate-800">
                  {selectedCategory === 'ALL'
                    ? lang === 'bn'
                      ? 'সকল ক্যাটাগরি'
                      : 'All Categories'
                    : getCategoryName(selectedCategory as AssetCategory, lang)}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {lang === 'bn' ? 'অবস্থা' : 'Condition'}
                </span>
                <p className="font-bold text-slate-800">
                  {reportMode === 'disposed'
                    ? lang === 'bn'
                      ? 'সম্পূর্ণ বাতিলকৃত মালামাল'
                      : 'Disposed Assets Only'
                    : selectedCondition === 'ALL'
                    ? lang === 'bn'
                      ? 'সকল অবস্থা'
                      : 'All Conditions'
                    : getConditionLabel(selectedCondition as UsabilityStatus)}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {lang === 'bn' ? 'মোট সংখ্যা' : 'Total Items'}
                </span>
                <p className="font-extrabold text-red-600 text-sm">
                  {filteredAssets.length} {lang === 'bn' ? 'টি' : 'Items'}
                </p>
              </div>
            </div>
          </div>

          {/* Executive Summary Financial Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                {lang === 'bn' ? 'মোট ক্রয়মূল্য / মূলধন' : 'Original Acquisition Cost'}
              </span>
              <p className="text-base font-black text-slate-900 mt-0.5">
                {formatBDT(totalOriginalCost)}
              </p>
              <p className="text-[9px] text-slate-400">
                {countUsable} {lang === 'bn' ? 'সচল' : 'usable'}, {countRepairable}{' '}
                {lang === 'bn' ? 'মেরামতযোগ্য' : 'repairable'}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-red-700 font-bold uppercase">
                {reportMode === 'disposed'
                  ? lang === 'bn'
                    ? 'স্ক্র্যাপ আদায় মূল্য'
                    : 'Salvage Recovered Value'
                  : lang === 'bn'
                  ? 'বর্তমান অবচিত মূল্য'
                  : 'Current Book Value'}
              </span>
              <p className="text-base font-black text-red-600 mt-0.5">
                {reportMode === 'disposed'
                  ? formatBDT(totalSalvageRecovered)
                  : formatBDT(totalCurrentBookValue)}
              </p>
              <p className="text-[9px] text-red-600 font-medium">
                {reportMode === 'disposed'
                  ? lang === 'bn'
                    ? 'বাতিল থেকে উদ্ধারকৃত'
                    : 'Net Realized Salvage'
                  : lang === 'bn'
                  ? 'বর্তমান আর্থিক মূল্য'
                  : 'Net Present Residual'}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                {lang === 'bn' ? 'মোট অবচয় / ক্ষতি' : 'Total Depreciation'}
              </span>
              <p className="text-base font-black text-slate-700 mt-0.5">
                -{formatBDT(totalDepreciation)}
              </p>
              <p className="text-[9px] text-slate-400">
                {totalOriginalCost > 0
                  ? `${Math.round((totalDepreciation / totalOriginalCost) * 100)}% ${
                      lang === 'bn' ? 'অবচয় সম্পন্ন' : 'written off'
                    }`
                  : '0%'}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                {lang === 'bn' ? 'পরিস্থিতি বিভাজন' : 'Condition Breakdown'}
              </span>
              <p className="text-base font-black text-slate-900 mt-0.5">
                {countDisposed} {lang === 'bn' ? 'বাতিল' : 'Disposed'}
              </p>
              <p className="text-[9px] text-slate-400">
                {countUsable} {lang === 'bn' ? 'সচল' : 'active'}, {countRepairable}{' '}
                {lang === 'bn' ? 'মেরামত' : 'repair'}
              </p>
            </div>
          </div>

          {/* ITEM DETAIL TABLES */}

          {/* Case 1: Head Office Disposed Assets Historical Register */}
          {reportMode === 'disposed' ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
              <div className="bg-red-50/80 px-4 py-2 border-b border-red-200 flex items-center justify-between">
                <span className="font-bold text-red-900 flex items-center space-x-1.5">
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  <span>
                    {lang === 'bn'
                      ? 'বাতিলকৃত মালামালের তালিকা ও নিষ্পত্তির তারিখের বিবরণী'
                      : 'Historical Disposed Assets Register & Decommission Dates'}
                  </span>
                </span>
                <span className="font-semibold text-red-700 text-[10px]">
                  {filteredAssets.length} {lang === 'bn' ? 'টি বাতিলকৃত সম্পদ' : 'Disposed Records'}
                </span>
              </div>

              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-700 uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2 text-left">SL</th>
                    <th className="px-3 py-2 text-left">Asset ID</th>
                    <th className="px-3 py-2 text-left">Asset Title & Category</th>
                    <th className="px-3 py-2 text-left">Former Location</th>
                    <th className="px-3 py-2 text-left">Acquisition Date</th>
                    <th className="px-3 py-2 text-right">Original Cost</th>
                    <th className="px-3 py-2 text-center bg-red-100/60 text-red-900 border-x border-red-200">
                      Disposal Date (নিষ্পত্তির তারিখ)
                    </th>
                    <th className="px-3 py-2 text-center">Disposal Method</th>
                    <th className="px-3 py-2 text-right">Salvage Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        {lang === 'bn'
                          ? 'নির্বাচিত ফিল্টারে কোনো বাতিলকৃত সম্পদ পাওয়া যায়নি।'
                          : 'No disposed assets found matching the selected scope.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset, index) => {
                      const areaName = getAreaName(asset.assignedAreaId);

                      return (
                        <tr key={`${asset.id}_${index}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 text-slate-400 font-mono">{index + 1}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {asset.id}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            <div className="font-bold text-slate-900">{asset.titleEn}</div>
                            <div className="text-[10px] text-slate-500">
                              {getCategoryName(asset.category, lang)} • {asset.titleBn || ''}
                            </div>
                            {asset.disposalReason && (
                              <div className="text-[10px] text-red-600 mt-0.5 italic">
                                Reason: {asset.disposalReason}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 font-semibold whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span>{areaName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-4">{asset.specificRoom}</div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{asset.purchaseDate}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatBDT(asset.purchaseValueBDT)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-red-700 bg-red-50/40 border-x border-red-100 whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-red-100/80 text-red-800">
                              <Calendar className="w-3 h-3 text-red-600" />
                              <span>{asset.disposalDate || '2025-11-20'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center font-medium whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {asset.disposalMethod || 'Scrapped'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-black text-red-600 whitespace-nowrap">
                            {formatBDT(asset.salvageValueBDT || 0)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredAssets.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-right uppercase text-[10px] text-slate-600">
                        Total Sum:
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900 font-black">
                        {formatBDT(totalOriginalCost)}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-400 text-[10px]">
                        {filteredAssets.length} Disposed
                      </td>
                      <td></td>
                      <td className="px-3 py-2 text-right text-red-600 font-black">
                        {formatBDT(totalSalvageRecovered)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : groupingMode === 'category' ? (
            /* Case 2A: Grouped By Category Sub-Tables with Sub-Totals */
            <div className="space-y-6">
              {groupedByCategory.length === 0 ? (
                <div className="border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                  {lang === 'bn'
                    ? 'নির্বাচিত ফিল্টারে কোনো সম্পদ পাওয়া যায়নি।'
                    : 'No assets found matching the selected scope.'}
                </div>
              ) : (
                groupedByCategory.map((group) => {
                  let subtotalCost = 0;
                  let subtotalBookValue = 0;
                  group.items.forEach((item) => {
                    subtotalCost += item.purchaseValueBDT || 0;
                    const dep = calculateDepreciation(
                      item.purchaseDate,
                      item.purchaseValueBDT,
                      item.category
                    );
                    subtotalBookValue += dep.currentBookValue;
                  });

                  return (
                    <div
                      key={group.category}
                      className="category-group-block border border-slate-300 rounded-xl overflow-hidden text-[11px] shadow-2xs"
                    >
                      {/* Category Header Banner */}
                      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center space-x-2 font-black text-xs sm:text-sm">
                          <Tag className="w-4 h-4 text-red-400" />
                          <span>{getCategoryName(group.category, lang)}</span>
                          <span className="text-[10px] font-mono text-red-300 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-700/60">
                            [{group.category}]
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-[11px] font-bold">
                          <span className="text-slate-300">
                            {group.items.length} {lang === 'bn' ? 'টি আইটেম' : 'Items'}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-white">
                            Cost: {formatBDT(subtotalCost)}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-red-400">
                            Book Value: {formatBDT(subtotalBookValue)}
                          </span>
                        </div>
                      </div>

                      {/* Category Table */}
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100 font-bold text-slate-700 uppercase text-[10px]">
                          <tr>
                            <th className="px-3 py-2 text-left w-10">SL</th>
                            <th className="px-3 py-2 text-left">Asset ID</th>
                            <th className="px-3 py-2 text-left">Tag</th>
                            <th className="px-3 py-2 text-left">Item Name</th>
                            <th className="px-3 py-2 text-left">Center & Room</th>
                            <th className="px-3 py-2 text-left">Acq. Date</th>
                            <th className="px-3 py-2 text-right">Cost (BDT)</th>
                            <th className="px-3 py-2 text-right">Book Value</th>
                            <th className="px-3 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {group.items.map((asset, idx) => {
                            const areaName = getAreaName(asset.assignedAreaId);
                            const dep = calculateDepreciation(
                              asset.purchaseDate,
                              asset.purchaseValueBDT,
                              asset.category
                            );
                            const code =
                              asset.itemTypeCode ||
                              inferItemTypeCode(asset.titleEn, asset.category);

                            return (
                              <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-3 py-2 font-mono font-black text-slate-950 whitespace-nowrap">
                                  {asset.id}
                                </td>
                                <td className="px-3 py-2 font-mono font-bold text-red-600 text-[10px]">
                                  {code}
                                </td>
                                <td className="px-3 py-2 font-medium text-slate-900">
                                  <div className="font-bold text-slate-900">{asset.titleEn}</div>
                                  {asset.titleBn && (
                                    <div className="text-[10px] text-slate-500">{asset.titleBn}</div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                                  <div className="font-semibold flex items-center space-x-1">
                                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                    <span>{areaName}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 pl-4">{asset.specificRoom}</div>
                                </td>
                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                                  {asset.purchaseDate}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-800 whitespace-nowrap">
                                  {formatBDT(asset.purchaseValueBDT)}
                                </td>
                                <td className="px-3 py-2 text-right font-black text-red-600 whitespace-nowrap">
                                  {formatBDT(dep.currentBookValue)}
                                </td>
                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      asset.usabilityStatus === 'Usable'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : asset.usabilityStatus === 'Repairable'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
                                    }`}
                                  >
                                    {getConditionLabel(asset.usabilityStatus)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-100/80 font-bold border-t border-slate-300">
                          <tr>
                            <td colSpan={6} className="px-3 py-1.5 text-right uppercase text-[10px] text-slate-700">
                              Subtotal ({getCategoryName(group.category, lang)} - {group.items.length} items):
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-900 font-black">
                              {formatBDT(subtotalCost)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-red-600 font-black">
                              {formatBDT(subtotalBookValue)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })
              )}

              {/* Grand Total Row */}
              {filteredAssets.length > 0 && (
                <div className="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between font-bold text-xs">
                  <div className="uppercase tracking-wider">
                    {lang === 'bn' ? 'সর্বমোট সারসংক্ষেপ (Grand Total):' : 'Grand Total Summary:'}{' '}
                    <span className="text-red-400 font-extrabold">{filteredAssets.length} Assets</span>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Original Cost:</span>
                      <span className="text-base font-black text-white">{formatBDT(totalOriginalCost)}</span>
                    </div>
                    <div>
                      <span className="text-red-300 text-[10px] uppercase block">Current Book Value:</span>
                      <span className="text-base font-black text-red-400">{formatBDT(totalCurrentBookValue)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Case 2B: Standard Continuous Table */
            <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-700 uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2 text-left">SL</th>
                    <th className="px-3 py-2 text-left">Asset ID</th>
                    <th className="px-3 py-2 text-left">Tag</th>
                    <th className="px-3 py-2 text-left">Title & Category</th>
                    <th className="px-3 py-2 text-left">Center & Room</th>
                    <th className="px-3 py-2 text-left">Acquisition Date</th>
                    <th className="px-3 py-2 text-right">Original Cost</th>
                    <th className="px-3 py-2 text-right">Book Value</th>
                    <th className="px-3 py-2 text-center">Status / Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        {lang === 'bn'
                          ? 'নির্বাচিত ফিল্টারে কোনো সম্পদ পাওয়া যায়নি।'
                          : 'No assets found matching the selected scope.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset, index) => {
                      const areaName = getAreaName(asset.assignedAreaId);
                      const dep = calculateDepreciation(
                        asset.purchaseDate,
                        asset.purchaseValueBDT,
                        asset.category
                      );
                      const code =
                        asset.itemTypeCode || inferItemTypeCode(asset.titleEn, asset.category);

                      return (
                        <tr key={`${asset.id}_${index}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-slate-400 font-mono">{index + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {asset.id}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-red-600 text-[10px]">
                            {code}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">
                            <div className="font-bold text-slate-900">{asset.titleEn}</div>
                            <div className="text-[10px] text-slate-500">
                              {getCategoryName(asset.category, lang)} • {asset.titleBn || ''}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            <div className="font-semibold flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span>{areaName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-4">{asset.specificRoom}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                            {asset.purchaseDate}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatBDT(asset.purchaseValueBDT)}
                          </td>
                          <td className="px-3 py-2 text-right font-black text-red-600 whitespace-nowrap">
                            {formatBDT(dep.currentBookValue)}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                asset.usabilityStatus === 'Usable'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : asset.usabilityStatus === 'Repairable'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {getConditionLabel(asset.usabilityStatus)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredAssets.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-right uppercase text-[10px] text-slate-600">
                        Total Sum:
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900 font-black">
                        {formatBDT(totalOriginalCost)}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600 font-black">
                        {formatBDT(totalCurrentBookValue)}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500 text-[10px]">
                        {filteredAssets.length} Assets
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Formal Audit Verification Signatures */}
          <div className="audit-signatures-block pt-8 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="border-t border-slate-500 pt-2 font-bold text-slate-900 text-sm">
                {currentUser.name}
              </div>
              <p className="text-[11px] text-slate-700 font-medium">
                {currentUser.designation} (ID: {currentUser.employeeId})
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                {lang === 'bn' ? 'প্রস্তুতকারী / Signatory (Logged-in ID)' : 'Prepared By / Signatory (Logged-in ID)'}
              </p>
            </div>

            <div>
              <div className="border-t border-slate-500 pt-2 font-bold text-slate-900 text-sm">
                Rone Ahammed & Sazzad Hosen
              </div>
              <p className="text-[11px] text-slate-700 font-medium">
                Logistics Officer (1009) & Asst. Accountant (1079)
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                {lang === 'bn' ? 'যাচাইকারী / Verified By (Rone & Sazzad)' : 'Verified By (Rone & Sazzad)'}
              </p>
            </div>

            <div>
              <div className="border-t border-slate-500 pt-2 font-bold text-slate-900 text-sm">
                Md. Habibur Rahman
              </div>
              <p className="text-[11px] text-slate-700 font-medium">
                Accountant, Admin & Finance (ID: 1004)
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                {lang === 'bn' ? 'অনুমোদনকারী / Approved By (Habib)' : 'Approved By (Habib)'}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400">
            LEEDO Asset Management System (LAMS) • Official NGO Affairs Bureau Audit Copy • Printed on{' '}
            {new Date().toLocaleString()}
          </div>

          {/* Prominent Close Option for Printable View (no-print) */}
          <div className="pt-4 no-print flex items-center justify-between border-t border-slate-200">
            <span className="text-xs text-slate-500 font-medium">
              {lang === 'bn' ? 'রিপোর্ট দেখা শেষ হলে বন্ধ করুন' : 'Done reviewing printable document'}
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'bn' ? 'প্রিন্ট করুন' : 'Print Document'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>{lang === 'bn' ? 'রিপোর্ট ভিউ বন্ধ করুন (Close)' : 'Close Report View'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
