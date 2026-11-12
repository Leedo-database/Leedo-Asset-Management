import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  CheckSquare,
  Copy,
  Download,
  Filter,
  Grid,
  Layers,
  MapPin,
  Printer,
  QrCode,
  Square,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { storage, inferItemTypeCode } from '../services/storage';
import { Area, Asset, AssetCategory } from '../types';
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

  const orgProfile = storage.getOrgProfile();
  const logoUrl =
    orgProfile.logoUrl || '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';

  // Synchronize active asset IDs with selected assets when modal opens
  useEffect(() => {
    if (isOpen) {
      if (selectedAssets.length > 0) {
        setActiveAssetIds(selectedAssets.map((a) => a.id));
      } else {
        // If opened with no prior selection, default to first 16 or all
        setActiveAssetIds(allAssets.slice(0, 16).map((a) => a.id));
      }
    }
  }, [isOpen, selectedAssets, allAssets]);

  // Assets to print
  const printableAssets = useMemo(() => {
    const activeSet = new Set(activeAssetIds);
    return allAssets.filter((a) => {
      if (!activeSet.has(a.id)) return false;
      if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
      return true;
    });
  }, [allAssets, activeAssetIds, categoryFilter]);

  // Batch QR Code Generation
  useEffect(() => {
    if (!isOpen || printableAssets.length === 0) return;

    let isMounted = true;
    setIsGeneratingQr(true);

    const generateBatch = async () => {
      const map: Record<string, string> = { ...qrCodeMap };
      const missing = printableAssets.filter((a) => !map[a.id]);

      for (const asset of missing) {
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
            width: 240,
            margin: 1,
            color: {
              dark: '#020617', // High contrast deep black
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          });
          map[asset.id] = url;
        } catch (err) {
          console.error(`Failed to generate QR for ${asset.id}`, err);
        }
      }

      if (isMounted) {
        setQrCodeMap(map);
        setIsGeneratingQr(false);
      }
    };

    generateBatch();

    return () => {
      isMounted = false;
    };
  }, [isOpen, printableAssets, areas]);

  // Layout page size calculations
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

  // Chunk assets into pages for printing
  const pages = useMemo(() => {
    if (layout === 'thermal_single') {
      return [printableAssets];
    }
    const chunked: Asset[][] = [];
    for (let i = 0; i < printableAssets.length; i += tagsPerPage) {
      chunked.push(printableAssets.slice(i, i + tagsPerPage));
    }
    return chunked.length > 0 ? chunked : [[]];
  }, [printableAssets, tagsPerPage, layout]);

  const handlePrint = () => {
    window.print();
  };

  const handleToggleSelectAll = () => {
    if (activeAssetIds.length === allAssets.length) {
      setActiveAssetIds([]);
    } else {
      setActiveAssetIds(allAssets.map((a) => a.id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Print isolation stylesheet: strictly prints ONLY the asset tags */}
      <style>{`
        @media print {
          @page {
            size: ${layout === 'thermal_single' ? '58mm 30mm' : 'A4 portrait'};
            margin: ${layout === 'thermal_single' ? '2mm' : '8mm 6mm 8mm 6mm'};
          }
          body * {
            visibility: hidden !important;
          }
          #printable-tag-sheet,
          #printable-tag-sheet * {
            visibility: visible !important;
          }
          #printable-tag-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .tag-page-container {
            page-break-after: always !important;
            break-after: page !important;
            display: grid !important;
            box-sizing: border-box !important;
            margin-bottom: 0 !important;
          }
          .tag-page-container:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .tag-item-sticker {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-4 sm:my-6 flex flex-col max-h-[94vh]">
        {/* Top Header Bar */}
        <div className="bg-slate-900 px-5 py-3.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print shrink-0 border-b border-slate-800">
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
                  ? 'এক বা একাধিক পাতায় শুধু ট্যাগগুলো প্রিন্ট করুন (A4 স্টিকার পেপার বা থার্মাল লেবেল)'
                  : 'Multi-page batch sticker sheet printing (Only clean tags will appear in print/PDF)'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              disabled={printableAssets.length === 0}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {lang === 'bn'
                  ? `🖨️ প্রিন্ট করুন (${printableAssets.length}টি ট্যাগ)`
                  : `Print ${printableAssets.length} Tags`}
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
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 no-print flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Layout Selector */}
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              {lang === 'bn' ? 'শিট লেআউট:' : 'Sheet Layout:'}
            </span>
            <div className="inline-flex rounded-lg bg-slate-200/90 p-0.5">
              <button
                type="button"
                onClick={() => setLayout('8_per_page')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  layout === '8_per_page'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="2 columns x 4 rows (Standard A4 Sticker Sheet)"
              >
                {lang === 'bn' ? '৮টি ট্যাগ / পাতা (স্ট্যান্ডার্ড)' : '8 / Page (Standard 2x4)'}
              </button>
              <button
                type="button"
                onClick={() => setLayout('12_per_page')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  layout === '12_per_page'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="2 columns x 6 rows (Medium Stickers)"
              >
                {lang === 'bn' ? '১২টি ট্যাগ / পাতা' : '12 / Page (2x6)'}
              </button>
              <button
                type="button"
                onClick={() => setLayout('18_per_page')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  layout === '18_per_page'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="3 columns x 6 rows (Compact Stickers)"
              >
                {lang === 'bn' ? '১৮টি ট্যাগ (কমপ্যাক্ট)' : '18 / Page (Compact 3x6)'}
              </button>
              <button
                type="button"
                onClick={() => setLayout('thermal_single')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  layout === 'thermal_single'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Continuous thermal label roll"
              >
                {lang === 'bn' ? 'থার্মাল রোল' : 'Thermal Roll'}
              </button>
            </div>
          </div>

          {/* Quick Selection Toggles & Category Filter */}
          <div className="flex items-center space-x-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800 text-xs outline-none"
            >
              <option value="ALL">{lang === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
              <option value="IT_Electronics">IT & Electronics</option>
              <option value="Furniture">Furniture</option>
              <option value="Appliances">Appliances</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Kitchenware">Kitchenware</option>
              <option value="Educational">Educational</option>
              <option value="Facility">Facility</option>
            </select>

            <button
              onClick={handleToggleSelectAll}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-bold text-slate-700 text-xs transition-colors cursor-pointer flex items-center space-x-1"
            >
              {activeAssetIds.length === allAssets.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-red-600" />
                  <span>{lang === 'bn' ? 'সব বাতিল' : 'Deselect All'}</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'bn' ? 'সব ১৭২টি নির্বাচন' : 'Select All 172'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Page Count & Instruction Banner */}
        <div className="bg-red-50/70 border-b border-red-100 px-4 py-2 text-xs flex items-center justify-between no-print shrink-0">
          <div className="flex items-center space-x-2 text-red-950 font-medium">
            <span className="font-bold text-red-700">
              {lang === 'bn' ? 'প্রিন্ট বিবরণী:' : 'Print Breakdown:'}
            </span>
            <span>
              {printableAssets.length} {lang === 'bn' ? 'টি ট্যাগ' : 'tags'} •{' '}
              {layout === 'thermal_single'
                ? lang === 'bn'
                  ? 'থার্মাল রোলে পর পর প্রিন্ট হবে'
                  : 'Continuous thermal label feed'
                : lang === 'bn'
                ? `A4 পাতায় মোট ${pages.length}টি পেইজ লাগবে (${tagsPerPage}টি প্রতি পাতা)`
                : `Takes ${pages.length} A4 sheet(s) (${tagsPerPage} tags/page)`}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-semibold">
            {lang === 'bn'
              ? 'টিপস: ব্রাউজার প্রিন্টে "Headers & Footers" টিক আনচেক রাখুন'
              : 'Tip: Uncheck "Headers & Footers" in print dialog for clean margins'}
          </div>
        </div>

        {/* Tag Sheet Viewport (Screen Preview + Print Container) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100">
          {isGeneratingQr && (
            <div className="mb-4 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs flex items-center justify-center space-x-2 no-print">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>{lang === 'bn' ? 'কিউআর কোড প্রস্তুত হচ্ছে...' : 'Generating high-contrast QR codes...'}</span>
            </div>
          )}

          {printableAssets.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Tag className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-sm">
                {lang === 'bn' ? 'প্রিন্ট করার মতো কোনো ট্যাগ নির্বাচিত নেই।' : 'No asset tags selected to print.'}
              </p>
              <button
                onClick={() => setActiveAssetIds(allAssets.map((a) => a.id))}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                {lang === 'bn' ? 'সকল সম্পদ নির্বাচন করুন' : 'Select All Assets'}
              </button>
            </div>
          ) : (
            <div id="printable-tag-sheet" className="space-y-8">
              {pages.map((pageAssets, pageIndex) => (
                <div
                  key={`page_${pageIndex}`}
                  className={`tag-page-container bg-white p-3 sm:p-5 rounded-xl border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-0 ${
                    layout === '8_per_page'
                      ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 print:grid-cols-2 print:gap-3'
                      : layout === '12_per_page'
                      ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 print:grid-cols-2 print:gap-2'
                      : layout === '18_per_page'
                      ? 'grid grid-cols-1 sm:grid-cols-3 gap-2 print:grid-cols-3 print:gap-2'
                      : 'flex flex-col gap-3 print:gap-1'
                  }`}
                  style={{
                    minHeight: layout !== 'thermal_single' ? '260mm' : 'auto',
                  }}
                >
                  {/* Visual Page Break Separator in Screen Preview */}
                  <div className="col-span-full border-b-2 border-dashed border-slate-300 pb-1 text-[10px] text-slate-400 font-mono uppercase tracking-wider flex justify-between no-print">
                    <span>
                      {lang === 'bn' ? `পৃষ্ঠা ${pageIndex + 1} / ${pages.length}` : `Page ${pageIndex + 1} of ${pages.length}`}
                    </span>
                    <span>
                      {pageAssets.length} {lang === 'bn' ? 'টি ট্যাগ এই পৃষ্ঠায়' : 'tags on this sheet'}
                    </span>
                  </div>

                  {/* Render Tags */}
                  {pageAssets.map((asset) => {
                    const area = areas.find((a) => a.id === asset.assignedAreaId);
                    const areaCode = area?.code || 'HO';
                    const areaName = area ? (lang === 'bn' ? area.nameBn : area.nameEn) : 'Head Office';
                    const tagCode = asset.itemTypeCode || inferItemTypeCode(asset.titleEn, asset.category);
                    const qrUrl = qrCodeMap[asset.id];

                    return (
                      <div
                        key={asset.id}
                        className={`tag-item-sticker bg-white border-2 border-slate-900 rounded-lg overflow-hidden flex flex-col justify-between text-slate-900 print:border-black ${
                          layout === '8_per_page'
                            ? 'p-3 min-h-[58mm] text-xs'
                            : layout === '12_per_page'
                            ? 'p-2.5 min-h-[42mm] text-[11px]'
                            : layout === '18_per_page'
                            ? 'p-2 min-h-[36mm] text-[10px]'
                            : 'p-2 w-[54mm] min-h-[26mm] text-[9px]'
                        }`}
                        style={{
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Header: LEEDO Logo, Title & Area Badge */}
                        <div className="flex items-center justify-between pb-1 border-b border-slate-300">
                          <div className="flex items-center space-x-1.5">
                            <img
                              src={logoUrl}
                              alt="LEEDO"
                              className={`${
                                layout === '18_per_page' || layout === 'thermal_single' ? 'h-4' : 'h-5'
                              } w-auto object-contain shrink-0`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';
                              }}
                            />
                            <div className="leading-tight">
                              <span className="font-black text-slate-950 tracking-wider text-[11px]">
                                LEEDO
                              </span>
                              <span className="ml-1 text-[8px] font-bold text-slate-600 uppercase">
                                ASSET TAG
                              </span>
                            </div>
                          </div>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-300">
                            {areaCode} • AUDIT
                          </span>
                        </div>

                        {/* Middle: QR Code + Asset Details */}
                        <div className="flex items-center space-x-2.5 py-1.5 flex-1">
                          {/* QR Code */}
                          <div className="shrink-0 bg-white p-0.5 border border-slate-300 rounded">
                            {qrUrl ? (
                              <img
                                src={qrUrl}
                                alt={`QR ${asset.id}`}
                                className={`${
                                  layout === '8_per_page'
                                    ? 'w-18 h-18'
                                    : layout === '12_per_page'
                                    ? 'w-14 h-14'
                                    : layout === '18_per_page'
                                    ? 'w-12 h-12'
                                    : 'w-10 h-10'
                                } object-contain`}
                              />
                            ) : (
                              <div
                                className={`${
                                  layout === '8_per_page' ? 'w-18 h-18' : 'w-12 h-12'
                                } bg-slate-100 animate-pulse rounded`}
                              />
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 space-y-0.5 leading-tight">
                            {/* Asset ID Number */}
                            <div className="font-mono font-black text-slate-950 tracking-tight text-xs sm:text-[13px] border-b border-slate-200 pb-0.5 truncate">
                              {asset.id}
                            </div>

                            {/* Item Name */}
                            <div className="font-bold text-slate-900 truncate">
                              {asset.titleEn}
                            </div>

                            {/* Tag Code & Category */}
                            <div className="text-[9px] text-slate-600 flex items-center space-x-1">
                              <span className="font-bold text-red-600 font-mono">
                                [{tagCode}]
                              </span>
                              <span className="truncate">{getCategoryName(asset.category, 'en')}</span>
                            </div>

                            {/* Location & Room */}
                            <div className="text-[9px] text-slate-700 truncate">
                              <span className="font-bold">Loc:</span> {areaName}
                              {asset.specificRoom ? ` (${asset.specificRoom})` : ''}
                            </div>

                            {/* Date */}
                            <div className="text-[8px] text-slate-400 font-mono">
                              Acq: {asset.purchaseDate || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Footer: Property of LEEDO Notice */}
                        <div className="pt-0.5 border-t border-slate-200 flex items-center justify-between text-[7.5px] text-slate-500 font-bold uppercase tracking-tight">
                          <span>Property of LEEDO • Do Not Remove</span>
                          <span className="font-mono text-slate-400">Verified</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-white border-t border-slate-200 no-print flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {printableAssets.length > 0 && (
              <span>
                {lang === 'bn'
                  ? `মোট ${printableAssets.length}টি ট্যাগ প্রস্তুত • ${pages.length} পৃষ্ঠা`
                  : `Total ${printableAssets.length} tags ready • ${pages.length} page(s)`}
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
              disabled={printableAssets.length === 0}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'bn' ? '🖨️ প্রিন্ট / সেভ PDF' : '🖨️ Print / Save PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
