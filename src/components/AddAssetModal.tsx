import React, { useEffect, useState } from 'react';
import { Building, DollarSign, HelpCircle, PlusCircle, Sparkles, X } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { storage } from '../services/storage';
import { Area, Asset, AssetCategory, InitialCondition, UsabilityStatus, User } from '../types';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void;
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
  const [acquisitionType, setAcquisitionType] = useState<'Purchased' | 'Donation'>('Purchased');
  const [donorOrVendor, setDonorOrVendor] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseValueBDT, setPurchaseValueBDT] = useState<number>(0);
  const [initialCondition, setInitialCondition] = useState<InitialCondition>('New');
  const [usabilityStatus, setUsabilityStatus] = useState<UsabilityStatus>('Usable');
  const [specificRoom, setSpecificRoom] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Auto-generate ID formula when Area or Year changes
  useEffect(() => {
    if (editingAsset) {
      setAssetId(editingAsset.id);
      setTitleEn(editingAsset.titleEn);
      setCategory(editingAsset.category);
      setAcquisitionType(editingAsset.acquisitionType);
      setDonorOrVendor(editingAsset.donorOrVendor);
      setPurchaseDate(editingAsset.purchaseDate);
      setPurchaseValueBDT(editingAsset.purchaseValueBDT);
      setInitialCondition(editingAsset.initialCondition);
      setUsabilityStatus(editingAsset.usabilityStatus);
      setAssignedAreaId(editingAsset.assignedAreaId);
      setSpecificRoom(editingAsset.specificRoom);
      setSerialNumber(editingAsset.serialNumber || '');
      setRemarks(editingAsset.remarks || '');
    } else {
      const area = areas.find((a) => a.id === assignedAreaId) || areas[0];
      const areaCode = area ? area.code : 'HO';
      const year = new Date(purchaseDate || Date.now()).getFullYear();
      const generated = storage.generateAssetId(areaCode, year);
      setAssetId(generated);
    }
  }, [assignedAreaId, purchaseDate, editingAsset, areas, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const assetData: Asset = {
      id: assetId,
      titleEn: titleEn.trim(),
      category,
      acquisitionType,
      donorOrVendor: donorOrVendor.trim(),
      purchaseDate,
      purchaseValueBDT: Number(purchaseValueBDT) || 0,
      initialCondition,
      usabilityStatus,
      assignedAreaId,
      specificRoom: specificRoom.trim(),
      serialNumber: serialNumber.trim() || undefined,
      remarks: remarks.trim() || undefined,
      createdBy: editingAsset ? editingAsset.createdBy : currentUser.name,
      createdAt: editingAsset ? editingAsset.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transferStatus: editingAsset?.transferStatus || 'none',
      currentTransferId: editingAsset?.currentTransferId,
    };

    onSave(assetData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-red-600 rounded-lg">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {editingAsset
                  ? lang === 'bn' ? 'সম্পদ তথ্য সম্পাদনা' : 'Edit Asset Details'
                  : lang === 'bn' ? 'নতুন সম্পদ অন্তর্ভুক্তি ও নিবন্ধন' : 'Register New Asset'}
              </h3>
              <p className="text-xs text-slate-300">
                {lang === 'bn'
                  ? 'লিডো স্বয়ংক্রিয় আইডি জেনারেশন ফর্মুলা: LEEDO-[এরিয়া]-[বছর]-[ক্রমিক]'
                  : 'Auto ID formula: LEEDO-[AREA_CODE]-[YEAR]-[AUTO_INCREMENT_4_DIGITS]'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Top Row: Auto ID & Center */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.assetId} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  required
                  readOnly={!editingAsset}
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-mono font-bold text-red-600 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'bn' ? 'কেন্দ্র ও বছর অনুযায়ী স্বয়ংক্রিয়ভাবে তৈরি' : 'Auto-computed from Area & Year'}
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
                    {lang === 'bn' ? a.nameBn : a.nameEn}
                  </option>
                ))}
              </select>
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
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="e.g. Dell Latitude 5420 Laptop, Toyota Ambulance, Smart Board"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
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
                placeholder="e.g. Room 102, Computer Lab, Main Office Desk"
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
                placeholder={acquisitionType === 'Donation' ? 'e.g. UNICEF, Rotary Club' : 'e.g. Star Tech, Otobi'}
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
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'bn' ? 'কবে কেনা হয়েছে / লিডোতে ইন হয়েছে' : 'Entry date into organization'}
              </p>
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
                  value={purchaseValueBDT || ''}
                  onChange={(e) => setPurchaseValueBDT(Number(e.target.value))}
                  placeholder="50000"
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
                placeholder="e.g. SN-9988102, Chassis No"
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
                placeholder="Warranty, specific tags or donor project reference"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors"
            >
              {editingAsset ? t.save : t.addNewAsset}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
