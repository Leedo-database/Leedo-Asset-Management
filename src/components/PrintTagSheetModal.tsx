import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  CheckSquare,
  MapPin,
  Printer,
  QrCode,
  Search,
  Square,
  Tag,
  X,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { deduplicateAssets, inferItemTypeCode, storage } from '../services/storage';
import { Area, Asset } from '../types';
import { getCategoryName } from '../utils/exportToExcel';

interface PrintTagSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAssets: Asset[];
  allAssets: Asset[];
  areas: Area[];
  lang: Language;
}

type SheetLayout = '8_per_page' | '12_per_page' | '18_per_page' | 'thermal_single';

export const PrintTagSheetModal: React.FC<PrintTagSheetModalProps> = ({
  isOpen,
  onClose,
  selectedAssets,
  allAssets,
  areas,
  lang,
}) => {
  const [layout, setLayout] = useState<SheetLayout>('8_per_page');
  const [activeAssetIds, setActiveAssetIds] = useState<string[]>([]);
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({});
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const orgProfile = storage.getOrgProfile();
  const logoUrl =
    orgProfile.logoUrl || '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';

  const uniqueAllAssets = useMemo(() => deduplicateAssets(allAssets), [allAssets]);

  // Toggle body class for isolated portal printing whenever modal opens/closes
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-print-portal');
    } else {
      document.body.classList.remove('has-print-portal');
    }
    return () => {
      document.body.classList.remove('has-print-portal');
    };
  }, [isOpen]);

  // Initialize active asset IDs only when modal transitions to open
  useEffect(() => {
    if (isOpen) {
      setCategoryFilter('ALL');
      setAreaFilter('ALL');
      setSearchQuery('');
      if (selectedAssets.length > 0) {
        setActiveAssetIds(deduplicateAssets(selectedAssets).map((a) => a.id));
      } else {
        setActiveAssetIds(uniqueAllAssets.map((a) => a.id));
      }
    }
  }, [isOpen]); // intentionally only on open toggle so live updates don't wipe user selection

  // Assets to print based on active selection & optional modal filters
  const printableAssets = useMemo(() => {
    const activeSet = new Set(activeAssetIds);
    const q = searchQuery.trim().toLowerCase();

    return uniqueAllAssets.filter((a) => {
      if (!activeSet.has(a.id)) return false;
      if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
      if (areaFilter !== 'ALL' && a.assignedAreaId !== areaFilter) return false;
      if (q) {
        const match =
          (a.id || '').toLowerCase().includes(q) ||
          (a.titleEn || '').toLowerCase().includes(q) ||
          (a.specificRoom || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [uniqueAllAssets, activeAssetIds, categoryFilter, areaFilter, searchQuery]);

  // Fast Parallel Batch QR Code Generation
  useEffect(() => {
    if (!isOpen || printableAssets.length === 0) return;

    let isMounted = true;
    const missing = printableAssets.filter((a) => !qrCodeMap[a.id]);
    if (missing.length === 0) return;

    setIsGeneratingQr(true);

    const generateBatch = async () => {
      const nextEntries: Record<string, string> = {};
      const chunkSize = 25;

      for (let i = 0; i < missing.length; i += chunkSize) {
        if (!isMounted) break;
        const batch = missing.slice(i, i + chunkSize);
        await Promise.all(
          batch.map(async (asset) => {
            try {
              const area = areas.find((ar) => ar.id === asset.assignedAreaId);
              const payload = JSON.stringify({
                org: 'LEEDO',
                id: asset.id,
                name: asset.titleEn,
                area: area?.code || 'HO',
                room: asset.specificRoom || '',
                cat: asset.category,
                date: asset.purchaseDate || '',
              });

              const url = await QRCode.toDataURL(payload, {
                width: 220,
                margin: 1,
                color: {
                  dark: '#020617',
                  light: '#ffffff',
                },
                errorCorrectionLevel: 'M',
              });
              nextEntries[asset.id] = url;
            } catch (err) {
              console.error(`Failed to generate QR for ${asset.id}`, err);
            }
          })
        );
      }

      if (isMounted) {
        setQrCodeMap((prev) => ({ ...prev, ...nextEntries }));
        setIsGeneratingQr(false);
      }
    };

    generateBatch();

    return () => {
      isMounted = false;
    };
  }, [isOpen, printableAssets, areas]);

  // Tags per A4 page
  const tagsPerPage = useMemo(() => {
    switch (layout) {
      case '8_per_page':
        return 8;
      case '12_per_page':
        return 12;
      case '18_per_page':
        return 18;
      case 'thermal_single':
        return 1;
    }
  }, [layout]);

  // Chunk printable assets into clean pages
  const pages = useMemo(() => {
    if (printableAssets.length === 0) return [];
    const chunked: Asset[][] = [];
    for (let i = 0; i < printableAssets.length; i += tagsPerPage) {
      chunked.push(printableAssets.slice(i, i + tagsPerPage));
    }
    return chunked;
  }, [printableAssets, tagsPerPage]);

  const handlePrint = () => {
    window.print();
  };

  const handleSelectAllDB = () => {
    if (activeAssetIds.length === uniqueAllAssets.length) {
      setActiveAssetIds([]);
    } else {
      setActiveAssetIds(uniqueAllAssets.map((a) => a.id));
    }
  };

  const renderStickerCard = (asset: Asset, forPrint = false) => {
    const area = areas.find((a) => a.id === asset.assignedAreaId);
    const areaCode = area?.code || 'HO';
    const areaName = area ? (lang === 'bn' ? area.nameBn : area.nameEn) : 'Head Office';
    const tagCode = asset.itemTypeCode || inferItemTypeCode(asset.titleEn, asset.category);
    const qrUrl = qrCodeMap[asset.id];

    const isCompact = layout === '18_per_page' || layout === 'thermal_single';
    const isMedium = layout === '12_per_page';

    return (
      <div
        key={`${asset.id}${forPrint ? '_p' : ''}`}
        className={`tag-item-sticker bg-white border-[1.5px] border-slate-900 rounded-md overflow-hidden flex flex-col justify-between text-slate-900 ${
          layout === '8_per_page'
            ? 'p-2.5 h-[56mm] text-xs'
            : layout === '12_per_page'
            ? 'p-2 h-[39mm] text-[10.5px]'
            : layout === '18_per_page'
            ? 'p-1.5 h-[37mm] text-[9.5px]'
            : 'p-1.5 w-[54mm] h-[28mm] text-[9px]'
        }`}
        style={{
          boxSizing: 'border-box',
          borderColor: '#000000',
        }}
      >
        {/* Top Strip: Logo & Center Code */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-300">
          <div className="flex items-center space-x-1.5 min-w-0">
            <img
              src={logoUrl}
              alt="LEEDO"
              className={`${isCompact ? 'h-3.5' : isMedium ? 'h-4' : 'h-5'} w-auto object-contain shrink-0`}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';
              }}
            />
            <div className="leading-none truncate">
              <span className={`font-black text-slate-950 tracking-wider ${isCompact ? 'text-[9px]' : 'text-[11px]'}`}>
                LEEDO
              </span>
              <span className="ml-1 text-[7.5px] font-bold text-slate-600 uppercase">
                ASSET TAG
              </span>
            </div>
          </div>
          <span className="text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-300 shrink-0">
            {areaCode}
          </span>
        </div>

        {/* Center Body: QR Code Left, Asset ID & Details Right */}
        <div className="flex items-center space-x-2 py-1 flex-1 min-h-0">
          <div className="shrink-0 bg-white p-0.5 border border-slate-300 rounded">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR ${asset.id}`}
                className={`${
                  layout === '8_per_page'
                    ? 'w-16 h-16'
                    : layout === '12_per_page'
                    ? 'w-12 h-12'
                    : layout === '18_per_page'
                    ? 'w-11 h-11'
                    : 'w-9 h-9'
                } object-contain block`}
              />
            ) : (
              <div
                className={`${
                  layout === '8_per_page' ? 'w-16 h-16' : 'w-11 h-11'
                } bg-slate-100 animate-pulse rounded`}
              />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5 leading-tight">
            <div
              className={`font-mono font-black text-slate-950 tracking-tight border-b border-slate-200 pb-0.5 truncate ${
                layout === '8_per_page'
                  ? 'text-[11.5px]'
                  : layout === '12_per_page'
                  ? 'text-[10px]'
                  : 'text-[8.5px]'
              }`}
              title={asset.id}
            >
              {asset.id}
            </div>

            <div className="font-bold text-slate-900 truncate">
              {asset.titleEn}
            </div>

            <div className="text-[8.5px] text-slate-600 flex items-center space-x-1 truncate">
              <span className="font-bold text-red-600 font-mono shrink-0">[{tagCode}]</span>
              <span className="truncate">{getCategoryName(asset.category, 'en')}</span>
            </div>

            <div className="text-[8.5px] text-slate-700 truncate">
              <span className="font-bold">Loc:</span> {areaName}
              {asset.specificRoom ? ` (${asset.specificRoom})` : ''}
            </div>

            {layout === '8_per_page' && (
              <div className="text-[7.5px] text-slate-500 font-mono">
                Acq: {asset.purchaseDate || 'N/A'}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Notice */}
        <div className="pt-0.5 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-500 font-bold uppercase tracking-tight">
          <span>Property of LEEDO • Do Not Remove</span>
          <span className="font-mono text-slate-400">HQ Audit</span>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  // Render dedicated Print-Only Portal directly onto document.body so Chromium never clips or repeats Page 1
  const printPortal =
    typeof document !== 'undefined' && printableAssets.length > 0
      ? createPortal(
          <div className="leedo-print-portal">
            <style>{`
              @media print {
                @page {
                  size: ${layout === 'thermal_single' ? '58mm 32mm' : 'A4 portrait'};
                  margin: ${layout === 'thermal_single' ? '2mm' : '8mm 7mm 8mm 7mm'};
                }
                .portal-tag-page {
                  display: grid !important;
                  width: 100% !important;
                  box-sizing: border-box !important;
                  break-after: page !important;
                  page-break-after: always !important;
                  grid-template-columns: ${
                    layout === '18_per_page'
                      ? 'repeat(3, minmax(0, 1fr))'
                      : layout === 'thermal_single'
                      ? '1fr'
                      : 'repeat(2, minmax(0, 1fr))'
                  } !important;
                  gap: ${
                    layout === '8_per_page'
                      ? '4mm'
                      : layout === '12_per_page'
                      ? '3mm'
                      : layout === '18_per_page'
                      ? '2.5mm'
                      : '0'
                  } !important;
                }
                .portal-tag-page:last-child {
                  break-after: auto !important;
                  page-break-after: auto !important;
                }
                .tag-item-sticker {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                }
              }
            `}</style>
            {pages.map((pageAssets, pageIndex) => (
              <div key={`portal_page_${pageIndex}`} className="portal-tag-page">
                {pageAssets.map((asset) => renderStickerCard(asset, true))}
              </div>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {printPortal}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 no-print">
        <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-4 sm:my-6 flex flex-col max-h-[94vh]">
          {/* Top Header Bar */}
          <div className="bg-slate-900 px-5 py-3.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-red-600 rounded-xl shadow-xs">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold flex items-center space-x-2">
                  <span>
                    {lang === 'bn' ? 'অ্যাসেট ট্যাগ ও কিউআর শিট প্রিন্ট' : 'Asset QR Tag Sticker Sheet'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[11px] font-mono border border-red-500/30 font-bold">
                    {printableAssets.length} {lang === 'bn' ? 'টি নির্বাচিত' : 'Selected'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn'
                    ? 'এক বা একাধিক পাতায় শুধু ট্যাগগুলো প্রিন্ট হবে (কোনো পাতা রিপিট হবে না)'
                    : 'Clean multi-page sticker sheet printing — only tags print across all pages'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                disabled={printableAssets.length === 0 || isGeneratingQr}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {isGeneratingQr
                    ? lang === 'bn'
                      ? 'QR তৈরি হচ্ছে...'
                      : 'Preparing QR...'
                    : lang === 'bn'
                    ? `🖨️ প্রিন্ট / Save PDF (${printableAssets.length}টি)`
                    : `Print / Save PDF (${printableAssets.length})`}
                </span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Configuration Bar */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
            {/* Layout Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                {lang === 'bn' ? 'শিট:' : 'Layout:'}
              </span>
              <div className="inline-flex flex-wrap rounded-lg bg-slate-200/90 p-0.5">
                <button
                  type="button"
                  onClick={() => setLayout('8_per_page')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    layout === '8_per_page'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'bn' ? '৮টি / পাতা (২×৪)' : '8 / Page (2x4)'}
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('12_per_page')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    layout === '12_per_page'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'bn' ? '১২টি / পাতা (২×৬)' : '12 / Page (2x6)'}
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('18_per_page')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    layout === '18_per_page'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'bn' ? '১৮টি / পাতা (৩×৬)' : '18 / Page (3x6)'}
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('thermal_single')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    layout === 'thermal_single'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'bn' ? 'থার্মাল (১/পৃষ্ঠা)' : 'Thermal Roll'}
                </button>
              </div>
            </div>

            {/* Filters & All Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'bn' ? 'আইডি বা নাম খুঁজুন...' : 'Search ID or name...'}
                  className="pl-7 pr-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-500 w-36"
                />
              </div>

              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-800 text-xs outline-none max-w-[140px]"
              >
                <option value="ALL">{lang === 'bn' ? 'সকল কেন্দ্র' : 'All Centers'}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {lang === 'bn' ? a.nameBn : a.nameEn}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-800 text-xs outline-none"
              >
                <option value="ALL">{lang === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
                <option value="IT_Electronics">IT & Electronics</option>
                <option value="Furniture">Furniture</option>
                <option value="Appliances">Appliances</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Kitchenware">Kitchenware</option>
                <option value="Educational">Educational</option>
                <option value="Facility">Facility</option>
                <option value="Medical">Medical</option>
              </select>

              <button
                onClick={handleSelectAllDB}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-bold text-slate-700 text-xs transition-colors cursor-pointer flex items-center space-x-1"
              >
                {activeAssetIds.length === uniqueAllAssets.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-red-600" />
                    <span>{lang === 'bn' ? 'সব বাতিল' : 'Deselect All'}</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {lang === 'bn'
                        ? `সব নির্বাচন (${uniqueAllAssets.length}টি)`
                        : `Select All (${uniqueAllAssets.length})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-red-50/70 border-b border-red-100 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-2 text-red-950 font-medium">
              <span className="font-bold text-red-700">
                {lang === 'bn' ? 'প্রিন্ট বিবরণী:' : 'Print Breakdown:'}
              </span>
              <span>
                {printableAssets.length} {lang === 'bn' ? 'টি ট্যাগ' : 'tags'} •{' '}
                {pages.length} {lang === 'bn' ? `পৃষ্ঠা (${tagsPerPage}টি প্রতি পাতায়)` : `page(s) (${tagsPerPage}/page)`}
              </span>
            </div>

            <div className="text-[11px] text-slate-600 font-semibold">
              {lang === 'bn'
                ? 'টিপস: প্রিন্ট উইন্ডোতে "Background graphics" অন ও "Headers & Footers" অফ রাখুন'
                : 'Tip: Enable "Background graphics" & uncheck "Headers & Footers" in print dialog'}
            </div>
          </div>

          {/* Screen Preview Viewport */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100">
            {isGeneratingQr && (
              <div className="mb-4 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs flex items-center justify-center space-x-2">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>
                  {lang === 'bn'
                    ? `${printableAssets.length}টি সম্পদের কিউআর কোড প্রস্তুত হচ্ছে...`
                    : `Generating high-contrast QR codes for ${printableAssets.length} assets...`}
                </span>
              </div>
            )}

            {printableAssets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Tag className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-semibold text-sm">
                  {lang === 'bn'
                    ? 'প্রিন্ট করার মতো কোনো ট্যাগ নির্বাচিত বা ফিল্টারের মধ্যে নেই।'
                    : 'No asset tags match your selection or filters.'}
                </p>
                <button
                  onClick={() => {
                    setCategoryFilter('ALL');
                    setAreaFilter('ALL');
                    setSearchQuery('');
                    setActiveAssetIds(uniqueAllAssets.map((a) => a.id));
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                >
                  {lang === 'bn' ? `সকল সম্পদ নির্বাচন করুন (${uniqueAllAssets.length})` : `Select All (${uniqueAllAssets.length})`}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {pages.map((pageAssets, pageIndex) => (
                  <div
                    key={`preview_page_${pageIndex}`}
                    className={`bg-white p-4 rounded-xl border border-slate-300 shadow-sm ${
                      layout === '8_per_page'
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'
                        : layout === '12_per_page'
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
                        : layout === '18_per_page'
                        ? 'grid grid-cols-1 sm:grid-cols-3 gap-2'
                        : 'flex flex-wrap gap-3'
                    }`}
                  >
                    <div className="col-span-full border-b border-dashed border-slate-300 pb-1 text-[10px] text-slate-500 font-mono uppercase tracking-wider flex justify-between">
                      <span>
                        {lang === 'bn'
                          ? `পৃষ্ঠা ${pageIndex + 1} / ${pages.length}`
                          : `Page ${pageIndex + 1} of ${pages.length}`}
                      </span>
                      <span>
                        {pageAssets.length} {lang === 'bn' ? 'টি ট্যাগ এই পৃষ্ঠায়' : 'tags on this page'}
                      </span>
                    </div>

                    {pageAssets.map((asset) => renderStickerCard(asset, false))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-500">
              {printableAssets.length > 0 && (
                <span>
                  {lang === 'bn'
                    ? `মোট ${printableAssets.length}টি ট্যাগ প্রস্তুত • ${pages.length}টি প্রিন্ট পৃষ্ঠা`
                    : `Total ${printableAssets.length} tags ready • ${pages.length} print page(s)`}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={printableAssets.length === 0 || isGeneratingQr}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'bn' ? '🖨️ প্রিন্ট / Save PDF' : '🖨️ Print / Save PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
