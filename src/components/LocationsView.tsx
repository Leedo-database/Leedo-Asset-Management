import React, { useState } from 'react';
import {
  Building,
  Edit,
  MapPin,
  Phone,
  PlusCircle,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Area, Asset, User as UserType } from '../types';

interface LocationsViewProps {
  currentUser: UserType;
  areas: Area[];
  assets: Asset[];
  lang: Language;
  onSaveArea: (area: Area) => void;
  onDeleteArea: (areaId: string) => void;
}

export const LocationsView: React.FC<LocationsViewProps> = ({
  currentUser,
  areas,
  assets,
  lang,
  onSaveArea,
  onDeleteArea,
}) => {
  const t = translations[lang];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [type, setType] = useState<Area['type']>('SUS');
  const [addressEn, setAddressEn] = useState('');
  const [addressBn, setAddressBn] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [active, setActive] = useState(true);

  const handleOpenAdd = () => {
    setEditingArea(null);
    setCode('');
    setNameEn('');
    setNameBn('');
    setType('SUS');
    setAddressEn('');
    setAddressBn('');
    setContactPerson('');
    setContactPhone('');
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (area: Area) => {
    setEditingArea(area);
    setCode(area.code);
    setNameEn(area.nameEn);
    setNameBn(area.nameBn);
    setType(area.type);
    setAddressEn(area.addressEn);
    setAddressBn(area.addressBn);
    setContactPerson(area.contactPerson);
    setContactPhone(area.contactPhone);
    setActive(area.active);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const areaData: Area = {
      id: editingArea ? editingArea.id : `area-${code.toLowerCase().trim()}-${Date.now()}`,
      code: code.trim().toUpperCase(),
      nameEn: nameEn.trim(),
      nameBn: nameBn.trim() || nameEn.trim(),
      type,
      addressEn: addressEn.trim(),
      addressBn: addressBn.trim() || addressEn.trim(),
      contactPerson: contactPerson.trim(),
      contactPhone: contactPhone.trim(),
      active,
    };

    onSaveArea(areaData);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t.locationsTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.locationsSubtitle}</p>
        </div>

        {currentUser.canManageAreas && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.addNewArea}</span>
          </button>
        )}
      </div>

      {/* Areas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map((area) => {
          const areaAssets = assets.filter((a) => a.assignedAreaId === area.id);
          const activeAssets = areaAssets.filter((a) => a.usabilityStatus !== 'Disposed');
          const isUserAssigned =
            currentUser.assignedAreaIds.includes('ALL') ||
            currentUser.assignedAreaIds.includes(area.id);

          return (
            <div
              key={area.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                isUserAssigned ? 'border-slate-200 hover:border-red-300' : 'border-slate-100 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-200">
                      {area.code}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {area.type}
                    </span>
                  </div>

                  {currentUser.canManageAreas && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(area)}
                        className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Area"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {area.code !== 'HO' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${area.nameEn}?`)) {
                              onDeleteArea(area.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Area"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <h3 className="mt-3 font-bold text-slate-900 text-sm">
                  {lang === 'bn' ? area.nameBn : area.nameEn}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-start space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{lang === 'bn' ? area.addressBn : area.addressEn}</span>
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Incharge: <strong>{area.contactPerson}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{area.contactPhone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{t.assetCount}:</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
                  {activeAssets.length} {lang === 'bn' ? 'সম্পদ' : 'active'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Area Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingArea
                  ? lang === 'bn' ? 'কেন্দ্র সম্পাদনা' : 'Edit Center / Area'
                  : lang === 'bn' ? 'নতুন কেন্দ্র যুক্তকরণ' : 'Add New Center'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {t.areaCode} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MIR"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {t.areaType}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none"
                  >
                    <option value="SUS">SUS</option>
                    <option value="Shelter">Shelter</option>
                    <option value="School">School</option>
                    <option value="Vocational">Vocational</option>
                    <option value="Head Office">Head Office</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  {lang === 'bn' ? 'কেন্দ্রের নাম (English)' : 'Center Name (English)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Mirpur SUS"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  {lang === 'bn' ? 'কেন্দ্রের নাম (বাংলা)' : 'Center Name (Bangla)'}
                </label>
                <input
                  type="text"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder="যেমন: মিরপুর এসইউএস"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  {lang === 'bn' ? 'ঠিকানা (English)' : 'Address (English)'}
                </label>
                <input
                  type="text"
                  value={addressEn}
                  onChange={(e) => setAddressEn(e.target.value)}
                  placeholder="e.g. Section 10, Mirpur, Dhaka"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {t.contactPerson}
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Incharge Name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {t.contactPhone}
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+880 17..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
