import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  Archive,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  MapPin,
  Printer,
  ShieldCheck,
  Tag,
  TrendingDown,
  Wrench,
  X,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { deduplicateAssets, storage } from '../services/storage';
import { Area, Asset, AssetCategory, UsabilityStatus, User } from '../types';
import { calculateDepreciation, formatBDT } from '../utils/depreciation';

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
  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    isHeadOffice ? 'ALL' : availableAreas[0]?.id || 'ALL'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');

  // Base Scoped Assets (Tenant isolation for field staff, full access for HO)
  const scopedAssets = useMemo(() => {
    if (isHeadOffice) return assets;
    return assets.filter((a) => currentUser.assignedAreaIds.includes(a.assignedAreaId));
  }, [assets, currentUser, isHeadOffice]);

  // Filtered Assets based on user selections
  const filteredAssets = useMemo(() => {
    const list = scopedAssets.filter((asset) => {
      // If Disposed Assets mode is selected (Head Office Feature)
      if (reportMode === 'disposed') {
        if (asset.usabilityStatus !== 'Disposed') return false;
      } else {
        // Condition filter in standard mode
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

  // Human Area Name helper (NO RAW AREA CODES)
  const getAreaName = (areaId: string): string => {
    const matched = areas.find((a) => a.id === areaId);
    if (!matched) return lang === 'bn' ? 'সাধারণ এলাকা' : 'General Area';
    return lang === 'bn' ? matched.nameBn : matched.nameEn;
  };

  // Category translation helper
  const getCategoryLabel = (cat: AssetCategory) => {
    switch (cat) {
      case 'IT_Electronics':
        return lang === 'bn' ? 'আইটি ও ইলেকট্রনিক্স' : 'IT & Electronics';
      case 'Furniture':
        return lang === 'bn' ? 'আসবাবপত্র' : 'Furniture & Fixture';
      case 'Vehicle':
        return lang === 'bn' ? 'যানবাহন' : 'Vehicle & Transport';
      case 'Appliances':
        return lang === 'bn' ? 'গৃহস্থালি ও সরঞ্জাম' : 'Home & Electrical Appliances';
      case 'Kitchenware':
        return lang === 'bn' ? 'রান্নাঘর সামগ্রী' : 'Kitchenware';
      case 'Educational':
        return lang === 'bn' ? 'শিক্ষা উপকরণ' : 'Educational Materials';
      case 'Facility':
        return lang === 'bn' ? 'স্থায়ী সুবিধা ও জেনারেটর' : 'Facility & Utilities';
      case 'Medical':
        return lang === 'bn' ? 'প্রাথমিক চিকিৎসা সামগ্রী' : 'Medical & First Aid';
      default:
        return cat;
    }
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
    totalOriginalCost += a.purchaseValueBDT;
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

  // CSV Export
  const handleExportCSV = () => {
    const isDisposed = reportMode === 'disposed';
    const headers = isDisposed
      ? [
          'SL',
          'Asset ID',
          'Asset Title',
          'Category',
          'Center / Location',
          'Acquisition Date',
          'Original Cost (BDT)',
          'Disposal Date',
          'Disposal Method',
          'Disposal Reason',
          'Salvage Recovered (BDT)',
        ]
      : [
          'SL',
          'Asset ID',
          'Asset Title',
          'Category',
          'Center / Location',
          'Room / Specific Location',
          'Acquisition Date',
          'Original Cost (BDT)',
          'Current Book Value (BDT)',
          'Condition',
          'Serial Number',
        ];

    const rows = filteredAssets.map((asset, index) => {
      const areaName = getAreaName(asset.assignedAreaId);
      const dep = calculateDepreciation(asset.purchaseDate, asset.purchaseValueBDT, asset.category);

      return isDisposed
        ? [
            index + 1,
            `"${asset.id}"`,
            `"${asset.titleEn.replace(/"/g, '""')}"`,
            `"${asset.category}"`,
            `"${areaName.replace(/"/g, '""')}"`,
            asset.purchaseDate,
            asset.purchaseValueBDT,
            asset.disposalDate || 'N/A',
            `"${asset.disposalMethod || 'Scrapped'}"`,
            `"${(asset.disposalReason || asset.remarks || '').replace(/"/g, '""')}"`,
            asset.salvageValueBDT || 0,
          ]
        : [
            index + 1,
            `"${asset.id}"`,
            `"${asset.titleEn.replace(/"/g, '""')}"`,
            `"${asset.category}"`,
            `"${areaName.replace(/"/g, '""')}"`,
            `"${(asset.specificRoom || '').replace(/"/g, '""')}"`,
            asset.purchaseDate,
            asset.purchaseValueBDT,
            dep.currentBookValue,
            asset.usabilityStatus,
            `"${asset.serialNumber || ''}"`,
          ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `LEEDO_Asset_Report_${reportMode}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Selected Scope Display Title
  const getScopeDescription = () => {
    if (selectedAreaId === 'ALL') {
      return lang === 'bn'
        ? 'সকল ১৩টি কেন্দ্র ও প্রধান কার্যালয় (সার্বজনীন রিপোর্ট)'
        : 'All 13 Centers & Head Office (Consolidated Scope)';
    }
    return getAreaName(selectedAreaId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-4 sm:my-8 flex flex-col max-h-[92vh]">
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
                  ? `ইউজার: ${currentUser.name} (${currentUser.designation}) • আইডি: ${currentUser.employeeId}`
                  : `User: ${currentUser.name} (${currentUser.designation}) • EID: ${currentUser.employeeId}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 border border-emerald-500 cursor-pointer shadow-xs"
              title="Export to Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>{lang === 'bn' ? 'এক্সেল (Excel / CSV)' : 'Export to Excel'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
            </button>
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
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 no-print shrink-0">
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

              {/* Head Office Exclusive Feature: Disposed Assets Register */}
              {isHeadOffice && (
                <button
                  onClick={() => setReportMode('disposed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    reportMode === 'disposed'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-red-700 hover:bg-red-50'
                  }`}
                  title={
                    lang === 'bn'
                      ? 'হেড অফিস বিশেষ অপশন: সকল বাতিলকৃত মালামালের তালিকা ও নিষ্পত্তির তারিখ'
                      : 'Head Office Exclusive: Full Decommissioned & Disposed Assets List with Exact Dates'
                  }
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'bn'
                      ? 'বাতিলকৃত মালামালের হিসেব ও তারিখ'
                      : 'Disposed Assets Register & Dates'}
                  </span>
                  <span className="text-[9px] bg-white/20 text-white px-1 py-0.2 rounded font-mono">
                    HO
                  </span>
                </button>
              )}
            </div>

            {/* Dynamic Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
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
                  <option value="IT_Electronics">
                    {lang === 'bn' ? 'আইটি ও ইলেকট্রনিক্স' : 'IT & Electronics'}
                  </option>
                  <option value="Furniture">
                    {lang === 'bn' ? 'আসবাবপত্র' : 'Furniture & Fixtures'}
                  </option>
                  <option value="Vehicle">
                    {lang === 'bn' ? 'যানবাহন' : 'Vehicles'}
                  </option>
                  <option value="Appliances">
                    {lang === 'bn' ? 'গৃহস্থালি ও সরঞ্জাম' : 'Appliances'}
                  </option>
                  <option value="Kitchenware">
                    {lang === 'bn' ? 'রান্নাঘর সামগ্রী' : 'Kitchenware'}
                  </option>
                  <option value="Educational">
                    {lang === 'bn' ? 'শিক্ষা উপকরণ' : 'Educational Materials'}
                  </option>
                  <option value="Facility">
                    {lang === 'bn' ? 'স্থায়ী সুবিধা ও জেনারেটর' : 'Facility & Generator'}
                  </option>
                </select>
              </div>

              {/* Usability Condition Filter (Only in standard inventory mode) */}
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
                    <option value="Repairable">
                      {lang === 'bn' ? 'মেরামতযোগ্য (Repairable)' : 'Repairable'}
                    </option>
                    <option value="Disposed">
                      {lang === 'bn' ? 'বাতিলকৃত / অপসারিত (Disposed)' : 'Disposed'}
                    </option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800 font-sans print-page overflow-y-auto flex-1">
          {/* Formal Official LEEDO Letterhead */}
          <div className="border-b-2 border-red-600 pb-4 flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 p-1.5 rounded-xl border border-red-200 flex items-center justify-center bg-white shadow-xs shrink-0 overflow-hidden">
                <img
                  src={orgProfile.logoUrl || '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png'}
                  alt="LEEDO Logo"
                  className="h-full w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {orgProfile.nameEn}
                </h1>
                <p className="text-xs font-bold text-red-600 mt-1">{orgProfile.nameBn}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {orgProfile.addressEn} • Tel: {orgProfile.phone}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  NGO Affairs Bureau Reg. No: {orgProfile.registrationNo} • Web: {orgProfile.website}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`text-[10px] uppercase font-black tracking-wider block border rounded px-2.5 py-1 ${
                  reportMode === 'disposed'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-50 text-slate-800 border-slate-300'
                }`}
              >
                {reportMode === 'disposed'
                  ? 'DISPOSED ASSETS REGISTER & DISPOSAL DATES'
                  : 'OFFICIAL ASSET AUDIT & INVENTORY REGISTER'}
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
              <p className="text-[9px] text-slate-400">
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
                    : getCategoryLabel(selectedCategory as AssetCategory)}
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
                {countUsable} {lang === 'bn' ? 'ব্যবহারযোগ্য' : 'usable'}, {countRepairable}{' '}
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

          {/* Case 1: Head Office Disposed Assets Historical Register (with Exact Disposal Date) */}
          {reportMode === 'disposed' ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
              <div className="bg-red-50/80 px-4 py-2 border-b border-red-200 flex items-center justify-between">
                <span className="font-bold text-red-900 flex items-center space-x-1.5">
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  <span>
                    {lang === 'bn'
                      ? 'বাতিলকৃত মালামালের তালিকা ও নিষ্পত্তির তারিখের বিবরণী (Historical Disposed Assets Register)'
                      : 'Historical Disposed Assets Register & Decommission Dates (Head Office Audit)'}
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
                              {getCategoryLabel(asset.category)} • {asset.titleBn || ''}
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
                            <div className="text-[10px] text-slate-400 pl-4">
                              {asset.specificRoom}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                            {asset.purchaseDate}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatBDT(asset.purchaseValueBDT)}
                          </td>
                          {/* Exact Disposal Date prominently shown */}
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
          ) : (
            /* Case 2: Standard Asset Inventory & Valuation Register */
            <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-700 uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2 text-left">SL</th>
                    <th className="px-3 py-2 text-left">Asset ID</th>
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
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
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

                      return (
                        <tr key={`${asset.id}_${index}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-slate-400 font-mono">{index + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {asset.id}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">
                            <div className="font-bold text-slate-900">{asset.titleEn}</div>
                            <div className="text-[10px] text-slate-500">
                              {getCategoryLabel(asset.category)} • {asset.titleBn || ''}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            <div className="font-semibold flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span>{areaName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-4">
                              {asset.specificRoom}
                            </div>
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
                      <td colSpan={5} className="px-3 py-2 text-right uppercase text-[10px] text-slate-600">
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
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
            {/* 1. Signatory: Current Logged In Staff ID */}
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

            {/* 2. Verified By: Rone Ahammed & Sazzad Hosen */}
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

            {/* 3. Approved By: Md. Habibur Rahman (Habib) */}
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
