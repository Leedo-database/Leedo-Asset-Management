import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { storage } from '../services/storage';
import { Area, Asset, AssetCategory, UsabilityStatus, User } from '../types';

interface BulkImportAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  areas: Area[];
  currentUser: User;
  lang: Language;
  onImportComplete: () => void;
}

export const BulkImportAssetsModal: React.FC<BulkImportAssetsModalProps> = ({
  isOpen,
  onClose,
  areas,
  currentUser,
  lang,
  onImportComplete,
}) => {
  if (!isOpen) return null;

  const t = translations[lang];
  const [inputText, setInputText] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<Partial<Asset>[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Sample placeholder template
  const sampleTemplate = `Dell OptiPlex Desktop Computer\tIT_Electronics\tHead Office\t2024-03-10\t65000\tUsable\tAdmin Room 102\tDonation\tUNICEF
Sewing Machine (Singer 191D)\tFacility\tKodomtoli\t2024-02-15\t28000\tUsable\tTraining Room\tPurchased\tSinger BD
Heavy Duty Refrigerator 350L\tAppliances\tMirpur\t2023-11-20\t58000\tRepairable\tKitchen\tPurchased\tWalton
Executive Wooden Table\tFurniture\tInclusive School\t2024-01-05\t24000\tUsable\tTeachers Room\tPurchased\tOtobi`;

  const findAreaId = (locationNameOrCode: string): string => {
    const clean = (locationNameOrCode || '').toLowerCase().trim();
    if (!clean) return 'area-ho';

    const match = areas.find(
      (a) =>
        a.id.toLowerCase() === clean ||
        a.code.toLowerCase() === clean ||
        a.nameEn.toLowerCase().includes(clean) ||
        a.nameBn.toLowerCase().includes(clean)
    );

    return match ? match.id : 'area-ho';
  };

  const normalizeCategory = (catStr: string): AssetCategory => {
    const c = (catStr || '').toLowerCase().trim();
    if (c.includes('it') || c.includes('comput') || c.includes('elect') || c.includes('laptop') || c.includes('printer')) return 'IT_Electronics';
    if (c.includes('furn') || c.includes('table') || c.includes('chair') || c.includes('desk') || c.includes('bed')) return 'Furniture';
    if (c.includes('vehic') || c.includes('car') || c.includes('micro') || c.includes('bike') || c.includes('ambulance')) return 'Vehicle';
    if (c.includes('appliance') || c.includes('ac') || c.includes('fridge') || c.includes('purifier') || c.includes('fan')) return 'Appliances';
    if (c.includes('kitch') || c.includes('cooker') || c.includes('pot')) return 'Kitchenware';
    if (c.includes('edu') || c.includes('book') || c.includes('board') || c.includes('projector') || c.includes('school')) return 'Educational';
    if (c.includes('medic') || c.includes('first aid')) return 'Medical';
    return 'Facility';
  };

  const normalizeStatus = (statusStr: string): UsabilityStatus => {
    const s = (statusStr || '').toLowerCase().trim();
    if (s.includes('repair') || s.includes('মেরামত')) return 'Repairable';
    if (s.includes('unusable') || s.includes('অকেজো')) return 'Unusable';
    if (s.includes('disp') || s.includes('বাতিল')) return 'Disposed';
    return 'Usable';
  };

  const handleParse = () => {
    setErrorMsg('');
    if (!inputText.trim()) {
      setErrorMsg(lang === 'bn' ? 'অনুগ্রহ করে অ্যাসেটের তথ্য পেস্ট বা লিখুন।' : 'Please paste or enter asset rows.');
      return;
    }

    const lines = inputText.trim().split('\n').filter((l) => l.trim().length > 0);
    const results: Partial<Asset>[] = [];

    lines.forEach((line, index) => {
      // Split by tab (Excel copy-paste) or comma
      let cols = line.includes('\t') ? line.split('\t') : line.split(',');
      cols = cols.map((c) => c.replace(/^["']|["']$/g, '').trim());

      if (cols.length >= 1) {
        const title = cols[0];
        if (!title || title.toLowerCase() === 'title' || title.toLowerCase() === 'asset title' || title.toLowerCase() === 'নাম') {
          return; // Skip header row
        }

        const category = cols[1] ? normalizeCategory(cols[1]) : 'IT_Electronics';
        const locationInput = cols[2] || 'Head Office';
        const areaId = findAreaId(locationInput);
        const purchaseDate = cols[3] && cols[3].match(/^\d{4}-\d{2}-\d{2}$/) ? cols[3] : new Date().toISOString().slice(0, 10);
        const cost = parseFloat((cols[4] || '0').replace(/[^0-9.]/g, '')) || 10000;
        const condition = cols[5] ? normalizeStatus(cols[5]) : 'Usable';
        const room = cols[6] || '';
        const acqType = cols[7]?.toLowerCase().includes('don') ? 'Donation' : 'Purchased';
        const vendor = cols[8] || (acqType === 'Donation' ? 'Donor / Grant' : 'Authorized Vendor');

        results.push({
          titleEn: title,
          category,
          assignedAreaId: areaId,
          purchaseDate,
          purchaseValueBDT: cost,
          usabilityStatus: condition,
          initialCondition: 'New',
          acquisitionType: acqType,
          donorOrVendor: vendor,
          specificRoom: room,
          createdBy: currentUser.name,
        });
      }
    });

    if (results.length === 0) {
      setErrorMsg(lang === 'bn' ? 'কোনো বৈধ সম্পদ সারি শনাক্ত করা যায়নি।' : 'No valid asset rows parsed.');
    } else {
      setParsedPreview(results);
    }
  };

  const handleSaveToDatabase = () => {
    if (parsedPreview.length === 0) {
      setErrorMsg(lang === 'bn' ? 'সংরক্ষণ করার আগে পার্স করুন।' : 'Please parse items before saving.');
      return;
    }

    const currentYear = new Date().getFullYear();
    const finalAssets: Asset[] = parsedPreview.map((item, idx) => {
      const area = areas.find((a) => a.id === item.assignedAreaId) || areas[0];
      const areaCode = area ? area.code : 'HO';
      const assetId = `LEEDO-${areaCode}-${currentYear}-${String(idx + 1).padStart(4, '0')}`;

      return {
        id: assetId,
        titleEn: item.titleEn || 'Asset Item',
        titleBn: item.titleBn,
        category: item.category || 'Facility',
        acquisitionType: item.acquisitionType || 'Purchased',
        donorOrVendor: item.donorOrVendor || 'Vendor',
        purchaseDate: item.purchaseDate || new Date().toISOString().slice(0, 10),
        purchaseValueBDT: item.purchaseValueBDT || 10000,
        initialCondition: 'New',
        usabilityStatus: item.usabilityStatus || 'Usable',
        assignedAreaId: item.assignedAreaId || 'area-ho',
        specificRoom: item.specificRoom || 'General Store',
        remarks: item.remarks || 'Registered through bulk import',
        createdBy: currentUser.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    if (replaceExisting) {
      // Replaces previous/demo assets
      storage.setAllAssets(finalAssets);
    } else {
      // Append
      const existing = storage.getAssets();
      storage.setAllAssets([...finalAssets, ...existing]);
    }

    onImportComplete();
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {lang === 'bn'
                  ? 'বাল্ক সম্পদ আমদানি (Bulk Asset Import)'
                  : 'Bulk Asset Import'}
              </h3>
              <p className="text-xs text-slate-300">
                {lang === 'bn'
                  ? 'এক্সেল বা টেক্সট থেকে প্রতিষ্ঠানের সম্পদ তালিকা ক্লাউড ডাটাবেজে সংরক্ষণ করুন'
                  : 'Import official institutional asset inventory directly to Firebase Cloud'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Radio Choice: Append or Replace */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-slate-900 block text-xs">
                {lang === 'bn' ? 'আমদানি মোড (Import Action):' : 'Import Action Mode:'}
              </span>
              <p className="text-[11px] text-slate-600">
                {lang === 'bn'
                  ? 'নতুন সম্পদ যুক্ত করতে বা সম্পূর্ণ নতুন তালিকা দিয়ে প্রতিস্থাপন করতে নির্বাচন করুন।'
                  : 'Choose whether to append new assets to the registry or replace existing items.'}
              </p>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-slate-900">
                <input
                  type="radio"
                  name="importMode"
                  checked={!replaceExisting}
                  onChange={() => setReplaceExisting(false)}
                  className="text-red-600 focus:ring-red-500"
                />
                <span>{lang === 'bn' ? 'বিদ্যমানের সাথে যোগ' : 'Append to Existing'}</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="importMode"
                  checked={replaceExisting}
                  onChange={() => setReplaceExisting(true)}
                  className="text-red-600 focus:ring-red-500"
                />
                <span>{lang === 'bn' ? 'নতুন তালিকা দিয়ে প্রতিস্থাপন' : 'Replace All Existing'}</span>
              </label>
            </div>
          </div>

          {/* Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider">
                {lang === 'bn'
                  ? 'এক্সেল বা টেক্সট থেকে পেস্ট করুন (Paste Rows from Excel / Text):'
                  : 'Paste Rows from Excel or Text:'}
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setInputText(sampleTemplate)}
                  className="text-red-600 hover:text-red-700 font-semibold underline text-[11px] cursor-pointer"
                >
                  {lang === 'bn' ? 'নমুনা ফরম্যাট পেস্ট করুন' : 'Load Sample Format'}
                </button>
                <label className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer border border-slate-300 text-[11px]">
                  <Upload className="w-3 h-3 text-slate-500" />
                  <span>{lang === 'bn' ? 'CSV ফাইল আপলোড' : 'Upload CSV'}</span>
                  <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Title [Tab] Category [Tab] Location [Tab] PurchaseDate [Tab] Cost [Tab] Condition [Tab] Room\nExample:\nDell Laptop Core i5\tIT_Electronics\tHead Office\t2024-02-15\t85000\tUsable\tAdmin Room 101`}
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500 bg-slate-50"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {lang === 'bn'
                ? 'কলাম ক্রম: সম্পদ নাম | ক্যাটাগরি | এরিয়া (যেমন Head Office, Kamalapur, Mirpur) | ক্রয় তারিখ | মূল্য (টাকা) | অবস্থা (Usable/Repairable/Unusable/Disposed) | রুম'
                : 'Columns: Title | Category | Area Location | Purchase Date (YYYY-MM-DD) | Cost (BDT) | Condition | Room'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action to Parse */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleParse}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'টেক্সট পার্স ও যাচাই করুন' : 'Parse & Validate Rows'}</span>
            </button>
          </div>

          {/* Parsed Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
              <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 flex items-center justify-between text-xs">
                <span>
                  {lang === 'bn'
                    ? `যাচাইকৃত সম্পদ (${parsedPreview.length}টি আইটেম)`
                    : `Verified Asset Items (${parsedPreview.length})`}
                </span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                  {lang === 'bn' ? 'ডাটাবেজে যুক্ত করার জন্য প্রস্তুত' : 'Ready for database save'}
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto text-[11px]">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-2.5 py-1.5 text-left">SL</th>
                      <th className="px-2.5 py-1.5 text-left">Title</th>
                      <th className="px-2.5 py-1.5 text-left">Category</th>
                      <th className="px-2.5 py-1.5 text-left">Location</th>
                      <th className="px-2.5 py-1.5 text-right">Cost (BDT)</th>
                      <th className="px-2.5 py-1.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedPreview.map((item, i) => {
                      const matchedArea = areas.find((a) => a.id === item.assignedAreaId);
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-2.5 py-1 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-2.5 py-1 font-bold text-slate-900">{item.titleEn}</td>
                          <td className="px-2.5 py-1 text-slate-600">{item.category}</td>
                          <td className="px-2.5 py-1 text-slate-700">
                            {matchedArea ? (lang === 'bn' ? matchedArea.nameBn : matchedArea.nameEn) : 'Head Office'}
                          </td>
                          <td className="px-2.5 py-1 text-right font-semibold text-slate-800">
                            {(item.purchaseValueBDT || 0).toLocaleString()} ৳
                          </td>
                          <td className="px-2.5 py-1 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {item.usabilityStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200 rounded-xl font-medium transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={parsedPreview.length === 0}
            onClick={handleSaveToDatabase}
            className={`px-5 py-2 rounded-xl font-bold flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer ${
              parsedPreview.length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {replaceExisting
                ? lang === 'bn'
                  ? 'প্রতিস্থাপন করে সংরক্ষণ করুন'
                  : 'Replace & Save Assets'
                : lang === 'bn'
                ? 'ডাটাবেজে যুক্ত করুন'
                : 'Append & Save Assets'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
