import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  Sliders,
  Upload,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { storage } from '../services/storage';
import { AssetCategory, OrganizationProfile, User } from '../types';

interface OrgSettingsViewProps {
  currentUser: User;
  profile: OrganizationProfile;
  lang: Language;
  onSaveProfile: (profile: OrganizationProfile) => void;
  onResetFactory: () => void;
}

export const OrgSettingsView: React.FC<OrgSettingsViewProps> = ({
  currentUser,
  profile,
  lang,
  onSaveProfile,
  onResetFactory,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nameEn, setNameEn] = useState(profile.nameEn);
  const [nameBn, setNameBn] = useState(profile.nameBn);
  const [shortName, setShortName] = useState(profile.shortName);
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl);
  const [addressEn, setAddressEn] = useState(profile.addressEn);
  const [addressBn, setAddressBn] = useState(profile.addressBn);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [website, setWebsite] = useState(profile.website);
  const [registrationNo, setRegistrationNo] = useState(profile.registrationNo);
  const [executiveDirector, setExecutiveDirector] = useState(profile.executiveDirector);

  // Depreciation Rates
  const [rates, setRates] = useState<Record<AssetCategory, number>>(
    profile.categoryDepreciationRates
  );

  const [savedMessage, setSavedMessage] = useState(false);

  // HR Permission Guard
  if (!currentUser.canUpdateOrgInfo && currentUser.role !== 'hr_admin') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-800 space-y-2">
        <ShieldAlert className="w-12 h-12 mx-auto text-red-600 mb-2" />
        <h3 className="text-base font-bold">
          {lang === 'bn' ? 'অ্যাক্সেস সংরক্ষিত: শুধুমাত্র এইচআর ম্যানেজার (ওমর)' : 'Restricted: HR Manager (Omar) Permission Required'}
        </h3>
        <p className="text-xs text-red-600 max-w-md mx-auto">
          {lang === 'bn'
            ? 'প্রতিষ্ঠানের প্রাতিষ্ঠানিক তথ্য, লোগো এবং আর্থিক অবচয় হার পরিবর্তনের অধিকার শুধুমাত্র এইচআর অ্যাডমিনের জন্য নির্ধারিত।'
            : 'Updating official organization information, logo, and depreciation percentages requires HR Manager privileges.'}
        </p>
      </div>
    );
  }

  const handleRateChange = (cat: AssetCategory, val: number) => {
    setRates((prev) => ({
      ...prev,
      [cat]: val / 100, // convert percentage e.g. 20 to 0.20
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: OrganizationProfile = {
      nameEn: nameEn.trim(),
      nameBn: nameBn.trim(),
      shortName: shortName.trim(),
      logoUrl: logoUrl.trim() || '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png',
      addressEn: addressEn.trim(),
      addressBn: addressBn.trim(),
      email: email.trim(),
      phone: phone.trim(),
      website: website.trim(),
      registrationNo: registrationNo.trim(),
      executiveDirector: executiveDirector.trim(),
      categoryDepreciationRates: rates,
    };

    onSaveProfile(updated);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">{t.settingsTitle}</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              Omar (HR Admin Access)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{t.settingsSubtitle}</p>
        </div>

        {savedMessage && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{t.savedSuccess}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Organization Logo & Branding Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <ImageIcon className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.officialLogo}</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Logo Preview */}
            <div className="h-24 w-24 p-2 bg-slate-50 rounded-2xl border-2 border-dashed border-red-200 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src={logoUrl || '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png'}
                alt="Logo Preview"
                className="h-full w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';
                }}
              />
            </div>

            <div className="space-y-2 flex-1">
              <p className="text-xs font-semibold text-slate-800">
                {lang === 'bn' ? 'প্রাতিষ্ঠানিক অফিসিয়াল লোগো আপলোড' : 'Official Organization Brand Mark'}
              </p>
              <p className="text-[11px] text-slate-500">
                {lang === 'bn'
                  ? 'এটি গেট পাস ভাউচার, অডিট রিপোর্ট এবং লগইন স্ক্রিনে ব্যবহৃত হবে (PNG, JPG বা SVG)।'
                  : 'Used on Gate Pass transfer vouchers, audit reports, and headers across the system.'}
              </p>
              <div className="flex items-center space-x-3 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors flex items-center space-x-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.uploadLogo}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoUrl('/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png')}
                  className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  {lang === 'bn' ? 'ডিফল্ট লিডো লোগোতে রিসেট' : 'Reset to Default'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Institutional Details Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.companyDetails}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                {t.orgNameEn} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                {t.orgNameBn}
              </label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                {t.officialAddress} (English)
              </label>
              <input
                type="text"
                value={addressEn}
                onChange={(e) => setAddressEn(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                {t.officialAddress} (Bangla)
              </label>
              <input
                type="text"
                value={addressBn}
                onChange={(e) => setAddressBn(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                {t.officialEmail}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                {t.officialPhone}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                {t.officialWebsite}
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                {t.registrationNumber}
              </label>
              <input
                type="text"
                value={registrationNo}
                onChange={(e) => setRegistrationNo(e.target.value)}
                placeholder="FDSR/NGOAB/2384"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                {t.executiveDirector}
              </label>
              <input
                type="text"
                value={executiveDirector}
                onChange={(e) => setExecutiveDirector(e.target.value)}
                placeholder="Forhad Hossain"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Depreciation Rates by Category Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.depreciationRatesConfig}</h3>
          </div>

          <p className="text-[11px] text-slate-500">
            {lang === 'bn'
              ? 'নিয়ম: ১ম বছর শেষে সকল সম্পদে ৫০% প্রাথমিক অবচয় ধরা হয়। পরবর্তীতে প্রতি বছর ক্যাটাগরি অনুযায়ী ১০% থেকে ২০% হারে বার্ষিক অবচয় প্রযোজ্য।'
              : 'Rule: 50% write-down occurs at the end of Year 1. Subsequent annual depreciation is applied between 10% to 20% by category.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                ['IT_Electronics', t.cat_IT_Electronics],
                ['Furniture', t.cat_Furniture],
                ['Vehicle', t.cat_Vehicle],
                ['Kitchenware', t.cat_Kitchenware],
                ['Educational', t.cat_Educational],
                ['Appliances', t.cat_Appliances],
                ['Medical', t.cat_Medical],
                ['Facility', t.cat_Facility],
              ] as [AssetCategory, string][]
            ).map(([cat, label]) => {
              const currentPercent = Math.round((rates[cat] || 0.15) * 100);

              return (
                <div key={cat} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block truncate text-[11px]">
                    {label}
                  </span>
                  <div className="mt-1 flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={5}
                      max={40}
                      step={1}
                      value={currentPercent}
                      onChange={(e) => handleRateChange(cat, Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-center font-bold text-slate-900 outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <span className="font-bold text-slate-500">% / yr</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  lang === 'bn'
                    ? 'আপনি কি সিস্টেমের সমস্ত ডেটা ফ্যাক্টরি ডিফল্টে রিসেট করতে চান?'
                    : 'Reset all system data to initial LEEDO factory demo state?'
                )
              ) {
                onResetFactory();
              }
            }}
            className="px-4 py-2 font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ফ্যাক্টরি ডেটায় রিসেট' : 'Reset to Factory Defaults'}</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{t.saveChanges}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
