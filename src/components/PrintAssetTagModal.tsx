import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Layers,
  Printer,
  QrCode,
  Sliders,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { storage } from '../services/storage';
import { Area, Asset } from '../types';

interface PrintAssetTagModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  areas: Area[];
}

type StickerSize = 'compact' | 'standard' | 'badge';

export const PrintAssetTagModal: React.FC<PrintAssetTagModalProps> = ({
  asset,
  isOpen,
  onClose,
  lang,
  areas,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [stickerSize, setStickerSize] = useState<StickerSize>('compact');
  const [copies, setCopies] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const orgProfile = storage.getOrgProfile();
  const logoUrl =
    orgProfile.logoUrl || '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';

  const assignedArea = areas.find((a) => a.id === asset?.assignedAreaId);
  const areaName = assignedArea
    ? lang === 'bn'
      ? assignedArea.nameBn
      : assignedArea.nameEn
    : 'Head Office';

  // Generate crisp QR code whenever asset changes
  useEffect(() => {
    if (!asset) return;

    // QR Payload: Contains complete asset verification details
    const payload = JSON.stringify({
      org: 'LEEDO',
      id: asset.id,
      name: asset.titleEn,
      area: assignedArea?.code || 'HO',
      room: asset.specificRoom || 'General Store',
      cat: asset.category,
      date: asset.purchaseDate,
      ver: '1.0',
    });

    QRCode.toDataURL(payload, {
      width: 300,
      margin: 1,
      color: {
        dark: '#0f172a', // Deep slate for high contrast scanner readability
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error('QR code generation error:', err);
      });
  }, [asset, assignedArea]);

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

  if (!isOpen || !asset) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyId = () => {
    if (asset?.id) {
      navigator.clipboard.writeText(asset.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `LEEDO-TAG-${asset.id}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const renderSingleSticker = (idx: number) => (
    <div
      key={idx}
      className={`bg-white rounded-lg border-2 border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden relative print:border-black print:shadow-none ${
        stickerSize === 'compact'
          ? 'w-[320px] p-2.5 text-[10px]'
          : stickerSize === 'standard'
          ? 'w-[380px] p-3 text-[11px]'
          : 'w-[420px] p-4 text-xs'
      }`}
      style={{
        boxSizing: 'border-box',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {/* Top LEEDO Header Strip */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-300">
        <div className="flex items-center space-x-1.5">
          <img
            src={logoUrl}
            alt="LEEDO"
            className="h-5 w-auto object-contain shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';
            }}
          />
          <div className="leading-tight">
            <span className="font-black text-slate-900 tracking-wider text-[11px]">
              LEEDO
            </span>
            <span className="ml-1 text-[9px] font-semibold text-slate-600">
              ASSET TAG
            </span>
          </div>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
          {assignedArea?.code || 'HO'} • HQ AUDIT
        </span>
      </div>

      {/* Main Body: QR Code on Left, Asset ID & Info on Right */}
      <div className="flex items-center space-x-2.5 py-2">
        <div className="shrink-0 bg-white p-0.5 border border-slate-200 rounded">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code for ${asset.id}`}
              className={`${
                stickerSize === 'compact'
                  ? 'w-16 h-16'
                  : stickerSize === 'standard'
                  ? 'w-20 h-20'
                  : 'w-24 h-24'
              } object-contain`}
            />
          ) : (
            <div className="w-16 h-16 bg-slate-100 animate-pulse rounded" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-0.5 leading-tight">
          <div className="font-mono font-black text-slate-950 tracking-tight text-xs sm:text-[13px] border-b border-slate-200 pb-0.5">
            {asset.id}
          </div>

          <div className="font-bold text-slate-900 truncate text-[11px]">
            {asset.titleEn}
          </div>

          <div className="text-[9px] text-slate-600 flex items-center space-x-1">
            <span className="font-semibold text-red-600">
              [{asset.itemTypeCode || 'TAG'}]
            </span>
            <span className="truncate">{asset.category.replace('_', ' & ')}</span>
          </div>

          <div className="text-[9px] text-slate-700 truncate">
            <span className="font-bold">Loc:</span> {areaName}
            {asset.specificRoom ? ` (${asset.specificRoom})` : ''}
          </div>

          <div className="text-[8px] text-slate-400 font-mono">
            Acq: {asset.purchaseDate || 'N/A'}
          </div>
        </div>
      </div>

      {/* Bottom Property Notice Strip */}
      <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500 font-semibold tracking-tight uppercase">
        <span>Property of LEEDO • Do Not Remove</span>
        <span className="font-mono">Audit Verified</span>
      </div>
    </div>
  );

  const printPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <div className="leedo-print-portal">
            <style>{`
              @media print {
                @page {
                  margin: 6mm;
                  size: auto;
                }
                .single-tag-portal-grid {
                  display: flex !important;
                  flex-wrap: wrap !important;
                  gap: 12px !important;
                  justify-content: flex-start !important;
                }
              }
            `}</style>
            <div className="single-tag-portal-grid">
              {Array.from({ length: copies }).map((_, idx) => renderSingleSticker(idx))}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {printPortal}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print">
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-red-600 rounded-xl shadow-xs">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold flex items-center space-x-2">
                <span>
                  {lang === 'bn' ? 'সম্পদ কিউআর ট্যাগ স্টিকার' : 'Printable Asset QR Tag Label'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-mono border border-red-500/30">
                  {asset.id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                {lang === 'bn'
                  ? 'যন্ত্রপাতি ও মালামালে সরাসরি লাগানোর উপযোগী কমপ্যাক্ট স্টিকার'
                  : 'Compact thermal & paper sticker label to paste directly on assets'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 no-print flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Size Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              {lang === 'bn' ? 'সাইজ:' : 'Size:'}
            </span>
            <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5">
              <button
                type="button"
                onClick={() => setStickerSize('compact')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  stickerSize === 'compact'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'bn' ? 'স্মল / কমপ্যাক্ট' : 'Compact (2"x1")'}
              </button>
              <button
                type="button"
                onClick={() => setStickerSize('standard')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  stickerSize === 'standard'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'bn' ? 'স্ট্যান্ডার্ড' : 'Standard (2.75"x1.4")'}
              </button>
              <button
                type="button"
                onClick={() => setStickerSize('badge')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  stickerSize === 'badge'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'bn' ? 'ব্যাজ সাইজ' : 'Badge Card'}
              </button>
            </div>
          </div>

          {/* Copies */}
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              {lang === 'bn' ? 'কপি:' : 'Copies:'}
            </span>
            <select
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-800 text-xs outline-none"
            >
              <option value={1}>1 copy</option>
              <option value={2}>2 copies</option>
              <option value={4}>4 copies</option>
              <option value={8}>8 copies (Sheet)</option>
            </select>
          </div>
        </div>

        {/* Live Sticker Preview Container (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex flex-col items-center justify-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 no-print">
            {lang === 'bn' ? 'প্রিন্ট প্রিভিউ (স্টিকার লুক)' : 'Print Preview (Actual Sticker Look)'}
          </p>

          {/* Printable Area - targeted by @media print */}
          <div
            id="printable-asset-tag-area"
            ref={printContainerRef}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            {Array.from({ length: copies }).map((_, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-lg border-2 border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden relative print:border-black ${
                  stickerSize === 'compact'
                    ? 'w-[320px] p-2.5 text-[10px]'
                    : stickerSize === 'standard'
                    ? 'w-[380px] p-3 text-[11px]'
                    : 'w-[420px] p-4 text-xs'
                }`}
                style={{
                  boxSizing: 'border-box',
                  pageBreakInside: 'avoid',
                }}
              >
                {/* Top LEEDO Header Strip */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-300">
                  <div className="flex items-center space-x-1.5">
                    <img
                      src={logoUrl}
                      alt="LEEDO"
                      className="h-5 w-auto object-contain shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';
                      }}
                    />
                    <div className="leading-tight">
                      <span className="font-black text-slate-900 tracking-wider text-[11px]">
                        LEEDO
                      </span>
                      <span className="ml-1 text-[9px] font-semibold text-slate-600">
                        ASSET TAG
                      </span>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                    {assignedArea?.code || 'HO'} • HQ AUDIT
                  </span>
                </div>

                {/* Main Body: QR Code on Left, Asset ID & Info on Right */}
                <div className="flex items-center space-x-2.5 py-2">
                  {/* Left: QR Code */}
                  <div className="shrink-0 bg-white p-0.5 border border-slate-200 rounded">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR Code for ${asset.id}`}
                        className={`${
                          stickerSize === 'compact'
                            ? 'w-16 h-16'
                            : stickerSize === 'standard'
                            ? 'w-20 h-20'
                            : 'w-24 h-24'
                        } object-contain`}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 animate-pulse rounded" />
                    )}
                  </div>

                  {/* Right: Asset ID, Title, Room, Category */}
                  <div className="flex-1 min-w-0 space-y-0.5 leading-tight">
                    {/* Unique Asset ID in bold monospaced badge */}
                    <div className="font-mono font-black text-slate-950 tracking-tight text-xs sm:text-[13px] border-b border-slate-200 pb-0.5">
                      {asset.id}
                    </div>

                    {/* Title */}
                    <div className="font-bold text-slate-900 truncate text-[11px]">
                      {asset.titleEn}
                    </div>

                    {/* Category & Tag Code */}
                    <div className="text-[9px] text-slate-600 flex items-center space-x-1">
                      <span className="font-semibold text-red-600">
                        [{asset.itemTypeCode || 'TAG'}]
                      </span>
                      <span className="truncate">{asset.category.replace('_', ' & ')}</span>
                    </div>

                    {/* Room & Area */}
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

                {/* Bottom Property Notice Strip */}
                <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500 font-semibold tracking-tight uppercase">
                  <span>Property of LEEDO • Do Not Remove</span>
                  <span className="font-mono">Audit Verified</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Copy / ID Badge Below Preview */}
          <div className="mt-4 no-print flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs">
            <span className="text-slate-500 font-medium">
              {lang === 'bn' ? 'অ্যাসেট আইডি:' : 'Asset ID:'}
            </span>
            <code className="font-mono font-bold text-red-600">{asset.id}</code>
            <button
              onClick={handleCopyId}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Copy ID"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 no-print flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="flex items-center space-x-1.5 px-3 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{lang === 'bn' ? 'QR ইমেজ ডাউনলোড' : 'Download QR'}</span>
          </button>

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
              className="flex items-center space-x-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {lang === 'bn' ? '🖨️ স্টিকার প্রিন্ট করুন' : '🖨️ Print Tag Sticker'}
              </span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};
