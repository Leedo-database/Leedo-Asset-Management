import React from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Globe,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  User as UserIcon,
  X,
  XCircle,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Area, User } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  areas: Area[];
  lang: Language;
  onOpenPasswordModal: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  areas,
  lang,
  onOpenPasswordModal,
}) => {
  if (!isOpen) return null;

  const t = translations[lang];

  // Get assigned area names
  const assignedAreas = user.assignedAreaIds.includes('ALL')
    ? [
        {
          id: 'all',
          nameEn: 'All 13 Centers & Shelters (Global Access)',
          nameBn: 'সকল ১৩টি কেন্দ্র, শেল্টার ও প্রধান কার্যালয় (সার্বজনীন এক্সেস)',
          code: 'ALL',
        },
      ]
    : areas.filter((a) => user.assignedAreaIds.includes(a.id));

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'hr_admin':
        return {
          label: t.role_hr_admin,
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      case 'head_office':
        return {
          label: t.role_head_office,
          bg: 'bg-red-100 text-red-800 border-red-200',
        };
      case 'asset_manager':
        return {
          label: t.role_asset_manager,
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'area_incharge':
        return {
          label: t.role_area_incharge,
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      default:
        return {
          label: t.role_field_staff,
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
        };
    }
  };

  const roleBadge = getRoleBadge(user.role);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Header Pattern */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xl text-white">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight">{user.name}</h3>
                <p className="text-xs text-red-100 flex items-center space-x-2 mt-0.5">
                  <span className="font-mono font-bold bg-white/20 px-1.5 py-0.2 rounded">
                    EID: {user.employeeId}
                  </span>
                  <span>•</span>
                  <span>{user.designation}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6 space-y-5">
          {/* Key Identification Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {lang === 'bn' ? 'বিভাগ' : 'Department'}
              </span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {user.department || (lang === 'bn' ? 'কার্যক্রম ও প্রশাসন' : 'Program & Operation')}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {lang === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}
              </span>
              <p className="font-semibold text-slate-800 mt-0.5 flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{user.phone || 'N/A'}</span>
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {lang === 'bn' ? 'কর্মক্ষেত্র (লোকেশন)' : 'Job Location'}
              </span>
              <p className="font-semibold text-slate-800 mt-0.5 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>{user.jobLocationCategory || 'Field Operation'}</span>
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {lang === 'bn' ? 'সিস্টেম রোল' : 'System Role'}
              </span>
              <div className="mt-0.5">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleBadge.bg}`}
                >
                  {roleBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Areas (Strict Access Control) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>
                  {lang === 'bn'
                    ? 'দায়িত্বপ্রাপ্ত কেন্দ্র ও এলাকা (সম্পদ দৃশ্যমানতা)'
                    : 'Assigned Centers & Area Scope (Asset Visibility)'}
                </span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {user.assignedAreaIds.includes('ALL')
                  ? lang === 'bn'
                    ? '১৩টি এলাকা (সম্পূর্ণ এক্সেস)'
                    : '13 Areas (Full Access)'
                  : `${assignedAreas.length} ${lang === 'bn' ? 'টি কেন্দ্র' : 'Center(s)'}`}
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {assignedAreas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span className="font-semibold text-slate-800">
                      {'nameBn' in area && lang === 'bn' ? area.nameBn : area.nameEn}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {lang === 'bn' ? 'সম্পদ দৃশ্যমান' : 'Assets Visible'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Role Permissions Matrix */}
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              {lang === 'bn' ? 'অনুমতি ও দায়িত্বসমূহ (RBAC Matrix)' : 'Access Privileges (RBAC Matrix)'}
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1.5 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  {user.assignedAreaIds.includes('ALL')
                    ? lang === 'bn'
                      ? 'সার্বজনীন সকল সম্পদ দর্শন'
                      : 'Global Asset Visibility'
                    : lang === 'bn'
                      ? 'নিজ এলাকার সম্পদ ট্র্যাকিং'
                      : 'Area-Scoped Asset Tracking'}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 text-slate-700">
                {user.canManageAssets ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                )}
                <span>
                  {lang === 'bn' ? 'নতুন সম্পদ এন্ট্রি / সম্পাদনা' : 'Add / Edit Asset Records'}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 text-slate-700">
                {user.canApproveDisposal ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
                <span>
                  {user.canApproveDisposal
                    ? lang === 'bn'
                      ? 'নিষ্কাশন অনুমোদন (HO)'
                      : 'Approve Disposals (HO)'
                    : lang === 'bn'
                      ? 'নিষ্কাশনের অনুরোধ পেশ'
                      : 'Submit Disposal Request'}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 text-slate-700">
                {user.canManageStaff ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                )}
                <span>
                  {lang === 'bn' ? 'কর্মী ও দায়িত্ব ব্যবস্থাপনা (HR)' : 'Manage Staff & RBAC (HR)'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => {
                onClose();
                onOpenPasswordModal();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Change Password'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
