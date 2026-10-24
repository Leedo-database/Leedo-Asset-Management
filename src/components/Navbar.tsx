import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Cloud,
  Globe,
  KeyRound,
  LogOut,
  MapPin,
  Printer,
  RefreshCw,
  Shield,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { storage } from '../services/storage';
import { Area, User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  onOpenReport: () => void;
  onOpenPasswordModal: () => void;
  onOpenProfile: () => void;
  lang: Language;
  onToggleLang: () => void;
  areas: Area[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenReport,
  onOpenPasswordModal,
  onOpenProfile,
  lang,
  onToggleLang,
  areas,
}) => {
  const t = translations[lang];
  const orgProfile = storage.getOrgProfile();
  const [isSyncInfoOpen, setIsSyncInfoOpen] = useState(false);

  const getAssignedAreaText = () => {
    if (!currentUser) return '';
    if (currentUser.assignedAreaIds.includes('ALL')) {
      return lang === 'bn' ? 'সকল ১৩টি কেন্দ্র (গ্লোবাল)' : 'All 13 Centers (Global)';
    }
    const matched = areas.filter((a) => currentUser.assignedAreaIds.includes(a.id));
    if (matched.length === 0) return lang === 'bn' ? 'কোনো এরিয়া নির্ধারিত নেই' : 'No Area Assigned';
    return matched.map((m) => (lang === 'bn' ? m.nameBn : m.nameEn)).join(', ');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'hr_admin':
        return { label: t.role_hr_admin, bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'head_office':
        return { label: t.role_head_office, bg: 'bg-red-100 text-red-800 border-red-200' };
      case 'asset_manager':
        return { label: t.role_asset_manager, bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'area_incharge':
        return { label: t.role_area_incharge, bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      default:
        return { label: t.role_field_staff, bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
  };

  const roleInfo = currentUser ? getRoleBadge(currentUser.role) : null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Left */}
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-lg bg-red-50 p-1 flex items-center justify-center border border-red-100 shadow-xs shrink-0 overflow-hidden">
              <img
                src={orgProfile.logoUrl || '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png'}
                alt="LEEDO Logo"
                className="h-full w-auto object-contain"
                onError={(e) => {
                  // fallback to direct asset
                  (e.target as HTMLImageElement).src = '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  {lang === 'bn' ? orgProfile.nameBn.split('(')[0] : 'LEEDO'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-600 text-white uppercase tracking-wider">
                  LAMS
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate max-w-md">
                {lang === 'bn' ? 'সম্পদ ব্যবস্থাপনা ও ট্র্যাকিং সিস্টেম' : 'Asset Management & Gate Pass System'}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Language Switcher */}
            <button
              onClick={onToggleLang}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700"
              title="Toggle Bangla / English"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'en' ? 'বাংলা' : 'English'}</span>
            </button>

            {/* Firebase Cloud Realtime Auto-Sync Status Indicator */}
            <button
              onClick={() => setIsSyncInfoOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
              title={lang === 'bn' ? 'ফায়ারবেস ক্লাউড অটো-সিঙ্ক বিবরণ' : 'Firebase Cloud Auto-Sync Details'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">
                {lang === 'bn' ? 'ফায়ারবেস ক্লাউড অটো-সিঙ্ক' : 'Firebase Cloud Sync'}
              </span>
            </button>

            {/* Print Report Format Trigger */}
            <button
              onClick={onOpenReport}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors shadow-2xs cursor-pointer"
              title={lang === 'bn' ? 'সম্পদ অডিট ও প্রিন্ট রিপোর্ট ফরম্যাট' : 'Print Asset Audit Report'}
            >
              <Printer className="w-3.5 h-3.5 text-red-600" />
              <span>{lang === 'bn' ? 'রিপোর্ট ফরম্যাট' : 'Report Format'}</span>
            </button>



            {/* Current User Badge & Profile */}
            {currentUser && (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                {/* Clickable Profile Card */}
                <button
                  onClick={onOpenProfile}
                  className="text-right hidden sm:block hover:bg-slate-50 p-1.5 rounded-xl transition-all cursor-pointer text-left border border-transparent hover:border-slate-200"
                  title={lang === 'bn' ? 'আমার প্রোফাইল ও অনুমতি দেখুন' : 'View My Profile & RBAC Permissions'}
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                    <span className="font-mono text-[9px] font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded border border-red-200">
                      ID: {currentUser.employeeId}
                    </span>
                    {roleInfo && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${roleInfo.bg}`}>
                        {roleInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end text-[11px] text-slate-500 space-x-1">
                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                    <span className="truncate max-w-[180px]">{getAssignedAreaText()}</span>
                  </div>
                </button>

                {/* Mobile Profile Trigger */}
                <button
                  onClick={onOpenProfile}
                  className="sm:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Profile"
                >
                  <UserCheck className="w-4 h-4 text-red-600" />
                </button>

                {/* Password Change Action */}
                <button
                  onClick={onOpenPasswordModal}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title={lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title={t.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cloud Auto-Sync Explanation Modal */}
      {isSyncInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <Cloud className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {lang === 'bn' ? 'ফায়ারবেস ক্লাউড ডেটাবেজ ও লাইভ সিঙ্ক' : 'Firebase Cloud Auto-Sync Active'}
                  </h3>
                  <p className="text-xs text-emerald-400 font-semibold">
                    {lang === 'bn' ? 'সরাসরি গুগল ক্লাউড ফায়ারস্টোর ডেটাবেজে সংযুক্ত' : 'Directly Connected to Google Cloud Firestore'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSyncInfoOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              {/* Status Box */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-bold text-emerald-950">
                    {lang === 'bn' ? 'লাইভ ক্লাউড সিঙ্ক্রোনাইজেশন চালু' : 'Live Cloud Sync Status: ACTIVE'}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                  Firestore v2
                </span>
              </div>

              {/* Explanation in Bengali / English */}
              <div className="space-y-2.5 leading-relaxed">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === 'bn' ? '১. ক্লাউডে সরাসরি ডাটা সংরক্ষণ' : '1. Direct Cloud Persistence'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    {lang === 'bn'
                      ? 'অ্যাপের সমস্ত সম্পদ (Assets), ট্রান্সফার গেটপাস (Transfers), বাতিলকরণ (Disposals) এবং অডিট লগ ব্রাউজারের লোকাল স্টোরেজে আটকে না থেকে সরাসরি সেন্ট্রাল গুগল ফায়ারবেস ক্লাউডে (Firebase Firestore Database) স্থায়ীভাবে সংরক্ষিত হচ্ছে।'
                      : 'All assets, transfer gate passes, disposal requests, and logs are saved directly to Google Firebase Cloud Firestore rather than staying confined to individual browser localStorage.'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{lang === 'bn' ? '২. রিয়েল-টাইম অটো-সিঙ্ক (Auto Sync)' : '2. Real-Time Auto Sync'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    {lang === 'bn'
                      ? 'যেকোনো কেন্দ্র (যেমন মিরপুর, কমলাপুর, প্রধান কার্যালয়) থেকে কোনো অ্যাসেট যুক্ত বা আপডেট করা হলে, কোনো রিলোড ছাড়াই অন্য সকল স্টাফদের স্ক্রিনে কয়েক মিলিসেকেন্ডের মধ্যে স্বয়ংক্রিয়ভাবে আপডেট চলে আসবে।'
                      : 'Changes made by any center staff or head office instantly reflect across all logged-in devices in real-time without needing a manual browser refresh.'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{lang === 'bn' ? '৩. অফলাইন ক্যাশ ও স্বয়ংক্রিয় রিকানেক্ট' : '3. Offline Resilience'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    {lang === 'bn'
                      ? 'কোনো সেন্টারে সাময়িক ইন্টারনেট বিভ্রাট ঘটলে অফলাইন ক্যাশে ডেটা জমা থাকবে এবং ইন্টারনেট সংযোগ ফিরে আসার সাথে সাথেই ক্লাউডে অটোমেটিক সিঙ্ক হয়ে যাবে।'
                      : 'If internet drops temporarily at a center, changes are safely buffered locally and automatically synced to the cloud upon reconnection.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsSyncInfoOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'ঠিক আছে / বন্ধ করুন' : 'Got it / Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

