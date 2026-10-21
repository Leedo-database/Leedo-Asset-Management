import React, { useState } from 'react';
import {
  Building2,
  Globe,
  KeyRound,
  LogOut,
  MapPin,
  Printer,
  Shield,
  UserCheck,
  Users,
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
    </header>
  );
};
