import React, { useEffect, useState } from 'react';
import {
  Building,
  Check,
  DollarSign,
  HelpCircle,
  Lock,
  Plus,
  PlusCircle,
  Printer,
  QrCode,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { inferItemTypeCode, storage } from '../services/storage';
import {
  Area,
  Asset,
  AssetCategory,
  InitialCondition,
  ItemTypeDefinition,
  UsabilityStatus,
  User,
} from '../types';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset, andPrintTag?: boolean) => void;
  areas: Area[];
  currentUser: User;
  lang: Language;
  editingAsset?: Asset | null;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  areas,
  currentUser,
  lang,
  editingAsset,
}) => {
  const t = translations[lang];

  const defaultArea = areas[0]?.id || 'area-ho';
  const [assignedAreaId, setAssignedAreaId] = useState(defaultArea);
  const [assetId, setAssetId] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [category, setCategory] = useState<AssetCategory>('IT_Electronics');
  const [itemTypeCode, setItemTypeCode] = useState<string>('PNT');
  const [acquisitionType, setAcquisitionType] = useState<'Purchased' | 'Donation'>('Purchased');
  const [donorOrVendor, setDonorOrVendor] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseValueBDT, setPurchaseValueBDT] = useState<number>(0);
  const [initialCondition, setInitialCondition] = useState<InitialCondition>('New');
  const [usabilityStatus, setUsabilityStatus] = useState<UsabilityStatus>('Usable');
  const [specificRoom, setSpecificRoom] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Custom Item Type inline creator state
  const [itemTypes, setItemTypes] = useState<ItemTypeDefinition[]>(() => storage.getItemTypes());
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customNameEn, setCustomNameEn] = useState('');
  const [customNameBn, setCustomNameBn] = useState('');

  // Load item types on open
  useEffect(() => {
    if (isOpen) {
      setItemTypes(storage.getItemTypes());
    }
  }, [isOpen]);

  // Initialize form fields ONLY when modal opens or target editingAsset changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingAsset) {
      setAssetId(editingAsset.id);
      setTitleEn(editingAsset.titleEn || '');
      setCategory(editingAsset.category || 'IT_Electronics');
      setItemTypeCode(
        editingAsset.itemTypeCode ||
          inferItemTypeCode(editingAsset.titleEn || '', editingAsset.category || 'IT_Electronics')
      );
      setAcquisitionType(editingAsset.acquisitionType || 'Purchased');
      setDonorOrVendor(editingAsset.donorOrVendor || '');
      const rawDate = (editingAsset.purchaseDate || '').trim();
      let normalizedDate = new Date().toISOString().split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        normalizedDate = rawDate.slice(0, 10);
      } else {
        const mmmYy = rawDate.match(/^([A-Za-z]{3})-(\d{2,4})$/);
        if (mmmYy) {
          const months: Record<string, string> = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
          };
          const mo = months[mmmYy[1].toLowerCase()];
          const yr = mmmYy[2].length === 2 ? `20${mmmYy[2]}` : mmmYy[2];
          if (mo) normalizedDate = `${yr}-${mo}-01`;
        }
      }
      setPurchaseDate(normalizedDate);
      setPurchaseValueBDT(Number(editingAsset.purchaseValueBDT) || 0);
      setInitialCondition(editingAsset.initialCondition || 'New');
      setUsabilityStatus(editingAsset.usabilityStatus || 'Usable');
      setAssignedAreaId(editingAsset.assignedAreaId || areas[0]?.id || 'area-ho');
      setSpecificRoom(editingAsset.specificRoom || '');
      setSerialNumber(editingAsset.serialNumber || '');
      setRemarks(editingAsset.remarks || '');
    } else {
      setTitleEn('');
      setCategory('IT_Electronics');
      setItemTypeCode('PNT');
      setAcquisitionType('Purchased');
      setDonorOrVendor('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setPurchaseValueBDT(0);
      setInitialCondition('New');
      setUsabilityStatus('Usable');
      setAssignedAreaId(areas[0]?.id || 'area-ho');
      setSpecificRoom('');
      setSerialNumber('');
      setRemarks('');
    }
    setIsAddingCustomType(false);
  }, [editingAsset, isOpen]);

  // Auto-generate standardized format ONLY for brand-new assets: LEEDO-{AREA}-{CODE}-{YEAR}-{001}
  useEffect(() => {
    if (!isOpen || editingAsset) return;
    const area = areas.find((a) => a.id === assignedAreaId) || areas[0];
    const areaCode = area ? area.code : 'HO';
    const parsedYear = purchaseDate ? parseInt(purchaseDate.slice(0, 4), 10) : NaN;
    const year =
      !isNaN(parsedYear) && parsedYear >= 1990 && parsedYear <= 2100
        ? parsedYear
        : new Date().getFullYear();
    const generated = storage.generateAssetId(areaCode, itemTypeCode || 'GEN', year);
    setAssetId(generated);
  }, [assignedAreaId, itemTypeCode, purchaseDate, editingAsset, areas, isOpen]);

  // When title changes on a new asset, if user hasn't explicitly customized, suggest matching code
  const handleTitleChange = (newTitle: string) => {
    setTitleEn(newTitle);
    if (!editingAsset && newTitle.trim().length >= 3) {
      const inferred = inferItemTypeCode(newTitle, category);
      if (inferred && inferred !== itemTypeCode) {
        const found = itemTypes.find((it) => it.code.toUpperCase() === inferred.toUpperCase());
        if (found) {
          setItemTypeCode(found.code);
          setCategory(found.category);
        }
      }
    }
  };

  // Change Item Type: synchronizes Tag Code, Category, and regenerates Asset ID
  const handleItemTypeSelect = (code: string) => {
    if (code === '__NEW__') {
      setIsAddingCustomType(true);
      return;
    }
    setItemTypeCode(code);
    const selected = itemTypes.find((t) => t.code === code);
    if (selected) {
      setCategory(selected.category);
    }
  };

  // Save new custom tag code to system
  const handleSaveCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = customCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (!cleanCode || !customNameEn.trim()) return;

    const newType: ItemTypeDefinition = {
      code: cleanCode,
      nameEn: customNameEn.trim(),
      nameBn: customNameBn.trim() || customNameEn.trim(),
      category,
    };

    storage.saveItemType(newType);
    const updated = storage.getItemTypes();
    setItemTypes(updated);
    setItemTypeCode(cleanCode);
    setIsAddingCustomType(false);
    setCustomCode('');
    setCustomNameEn('');
    setCustomNameBn('');
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent, andPrint = false) => {
    e.preventDefault();

    const assetData: Asset = {
      id: editingAsset ? editingAsset.id : assetId.trim(),
      titleEn: (titleEn || '').trim(),
      ...(editingAsset?.titleBn ? { titleBn: editingAsset.titleBn } : {}),
      category,
      itemTypeCode: itemTypeCode || 'GEN',
      acquisitionType,
      donorOrVendor: (donorOrVendor || '').trim(),
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
      purchaseValueBDT: Number(purchaseValueBDT) || 0,
      initialCondition: initialCondition || 'New',
      usabilityStatus,
      assignedAreaId,
      specificRoom: (specificRoom || '').trim(),
      serialNumber: (serialNumber || '').trim() || undefined,
      remarks: (remarks || '').trim() || undefined,
      createdBy: editingAsset?.createdBy || currentUser.name,
      createdAt: editingAsset?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transferStatus: editingAsset?.transferStatus || 'none',
      currentTransferId: editingAsset?.currentTransferId,
      ...(editingAsset?.disposalDate ? { disposalDate: editingAsset.disposalDate } : {}),
      ...(editingAsset?.disposalReason ? { disposalReason: editingAsset.disposalReason } : {}),
      ...(editingAsset?.disposalMethod ? { disposalMethod: editingAsset.disposalMethod } : {}),
      ...(editingAsset?.salvageValueBDT !== undefined ? { salvageValueBDT: editingAsset.salvageValueBDT } : {}),
    };

    onSave(assetData, andPrint);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-red-600 rounded-xl shadow-xs">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold flex items-center space-x-2">
                <span>
                  {editingAsset
                    ? lang === 'bn' ? 'সম্পদ তথ্য সম্পাদনা' : 'Edit Asset Details'
                    : lang === 'bn' ? 'নতুন সম্পদ অন্তর্ভুক্তি ও নিবন্ধন' : 'Register New Asset'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-mono border border-red-500/30">
                  {assetId}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                {lang === 'bn'
                  ? 'ফরম্যাট: LEEDO-[এরিয়া]-[ক্যাটাগরি কোড]-[বছর]-[ক্রমিক] (যেমন: LEEDO-HO-PNT-2026-001)'
                  : 'Format: LEEDO-[AREA]-[ITEM_CODE]-[YEAR]-[SEQ] (e.g. LEEDO-HO-PNT-2026-001)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={(e) => handleSubmit(e, false)}
          className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs flex-1"
        >
          {/* Top Row: Auto ID & Center */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <span>{t.assetId}</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>{lang === 'bn' ? 'ইউনিক ও লকড' : 'Auto & Locked'}</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={true}
                  value={assetId}
                  className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-xl bg-slate-50 font-mono font-black text-red-600 text-sm outline-none tracking-tight select-all cursor-not-allowed"
                />
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'bn'
                  ? '🔒 লিডো নীতি অনুযায়ী আইডি স্বয়ংক্রিয় তৈরি হয় এবং সম্পাদন অযোগ্য।'
                  : '🔒 Immutable: Auto-generated to prevent duplicates & audit conflict.'}
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.assignedArea} <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={assignedAreaId}
                onChange={(e) => setAssignedAreaId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {lang === 'bn' ? a.nameBn : a.nameEn} ({a.code})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'bn' ? 'অ্যাসেট কোডে এরিয়ার কোড যুক্ত হবে' : 'Area code feeds directly into tag ID'}
              </p>
            </div>
          </div>

          {/* Sub-Category / Item Tag Code Selector */}
          <div className="p-3 bg-red-50/50 border border-red-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-red-600" />
                <span>
                  {lang === 'bn'
                    ? 'আইটেম ক্যাটাগরি কোড (যেমন: PNT = প্রিন্টার)'
                    : 'Item Tag Category (e.g. PNT = Printer)'}
                </span>
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCustomType(!isAddingCustomType)}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'নতুন ক্যাটাগরি কোড' : '+ Add Custom Code'}</span>
              </button>
            </div>

            {/* Custom Item Type Form (inline) */}
            {isAddingCustomType && (
              <div className="p-3 bg-white rounded-lg border border-red-200 shadow-xs space-y-2 text-xs">
                <p className="font-bold text-slate-800 text-[11px]">
                  {lang === 'bn'
                    ? 'নতুন আইটেম ক্যাটাগরি ও ৩ অক্ষরের কোড যুক্ত করুন:'
                    : 'Create New Item Type & 2-4 Letter Prefix:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Code (e.g. PNT, PRO, DSP) *
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. PNT"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-red-600 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Name in English *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Printer / Projector"
                      value={customNameEn}
                      onChange={(e) => setCustomNameEn(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Name in Bangla
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. প্রিন্টার / প্রজেক্টর"
                      value={customNameBn}
                      onChange={(e) => setCustomNameBn(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-medium text-slate-800"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomType(false)}
                    className="px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100 rounded"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomType}
                    disabled={!customCode.trim() || !customNameEn.trim()}
                    className="px-3 py-1 bg-red-600 text-white rounded text-[11px] font-bold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    {lang === 'bn' ? 'সংরক্ষণ ও নির্বাচন করুন' : 'Save & Select'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <select
                  value={itemTypeCode}
                  onChange={(e) => handleItemTypeSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <optgroup label="IT & Electronics (কম্পিউটার ও ইলেকট্রনিক্স)">
                    {itemTypes
                      .filter((it) => it.category === 'IT_Electronics')
                      .map((it) => (
                        <option key={it.code} value={it.code}>
                          [{it.code}] {lang === 'bn' ? it.nameBn : it.nameEn}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Furniture & Fixtures (আসবাবপত্র)">
                    {itemTypes
                      .filter((it) => it.category === 'Furniture')
                      .map((it) => (
                        <option key={it.code} value={it.code}>
                          [{it.code}] {lang === 'bn' ? it.nameBn : it.nameEn}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Appliances (গৃহস্থালী ও ইলেকট্রিক্যাল যন্ত্রপাতি)">
                    {itemTypes
                      .filter((it) => it.category === 'Appliances')
                      .map((it) => (
                        <option key={it.code} value={it.code}>
                          [{it.code}] {lang === 'bn' ? it.nameBn : it.nameEn}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Educational & School (শিক্ষামূলক)">
                    {itemTypes
                      .filter((it) => it.category === 'Educational')
                      .map((it) => (
                        <option key={it.code} value={it.code}>
                          [{it.code}] {lang === 'bn' ? it.nameBn : it.nameEn}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Medical & Clinic (চিকিৎসা সরঞ্জাম)">
                    {itemTypes
                      .filter((it) => it.category === 'Medical')
                      .map((it) => (
                        <option key={it.code} value={it.code}>
                          [{it.code}] {lang === 'bn' ? it.nameBn : it.nameEn}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Kitchenware (রান্নাঘর)">
                    {itemTypes
                      .filter((it) => it.category === 'Kitchenware')
                      .map((it) => (
                        <option key={it.code} value={it.code}>
                          [{it.code}] {lang === 'bn' ? it.nameBn : it.nameEn}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Facility & Safety (নিরাপত্তা ও অন্যান্য)">
                    {itemTypes
                      .filter((it) => it.category === 'Facility' || it.category === 'Vehicle')
                      .map((it) => (
                        <option key={it.code} value={it.code}>
                          [{it.code}] {lang === 'bn' ? it.nameBn : it.nameEn}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Live Tag Breakdown Preview */}
              <div className="flex items-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-700 font-mono">
                <span className="font-bold text-slate-400 mr-1.5">Tag:</span>
                <span className="font-black text-red-600">{assetId}</span>
              </div>
            </div>
          </div>

          {/* Asset Name / Title */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t.assetTitle} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={titleEn}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. HP LaserJet Pro M404dn Printer, Dell Latitude Laptop, Ceiling Fan"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>

          {/* Category & Specific Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.category} <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              >
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

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.specificRoom} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={specificRoom}
                onChange={(e) => setSpecificRoom(e.target.value)}
                placeholder="e.g. Accounts Room, ICT Lab, ED Sir Room"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Acquisition Type & Donor / Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.acquisitionType}
              </label>
              <div className="flex space-x-3 mt-1.5">
                <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="acqType"
                    checked={acquisitionType === 'Purchased'}
                    onChange={() => setAcquisitionType('Purchased')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>{t.purchased}</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="acqType"
                    checked={acquisitionType === 'Donation'}
                    onChange={() => setAcquisitionType('Donation')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>{t.donation}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {acquisitionType === 'Donation'
                  ? lang === 'bn' ? 'দাতার নাম (Donor Name)' : 'Donor Organization / Individual'
                  : lang === 'bn' ? 'বিক্রেতা / দোকানের নাম (Vendor)' : 'Vendor / Supplier Name'}
              </label>
              <input
                type="text"
                value={donorOrVendor}
                onChange={(e) => setDonorOrVendor(e.target.value)}
                placeholder={acquisitionType === 'Donation' ? 'e.g. UNICEF, Rotary Club' : 'e.g. Star Tech, Ryans, Otobi'}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Purchase Date & Initial Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.purchaseDate} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.purchaseValue} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">
                  ৳
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={Number.isFinite(purchaseValueBDT) ? purchaseValueBDT : 0}
                  onChange={(e) => setPurchaseValueBDT(e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="36000"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Condition & Usability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.initialCondition}
              </label>
              <select
                value={initialCondition}
                onChange={(e) => setInitialCondition(e.target.value as InitialCondition)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="New">{t.conditionNew}</option>
                <option value="Used">{t.conditionUsed}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.currentCondition}
              </label>
              <select
                value={usabilityStatus}
                onChange={(e) => setUsabilityStatus(e.target.value as UsabilityStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="Usable">{t.statusUsable}</option>
                <option value="Repairable">{t.statusRepairable}</option>
                <option value="Unusable">{t.statusUnusable}</option>
                <option value="Disposed">{t.statusDisposed}</option>
              </select>
            </div>
          </div>

          {/* Serial Number & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.serialNo}
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-HP9988102"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.remarks}
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Donor project, invoice or audit notes"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="flex items-center space-x-1.5 px-4 py-2 font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-red-600" />
                <span>
                  {lang === 'bn' ? 'সংরক্ষণ ও ট্যাগ প্রিন্ট (QR)' : 'Save & Print Tag'}
                </span>
              </button>

              <button
                type="submit"
                className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {editingAsset ? t.save : t.addNewAsset}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
