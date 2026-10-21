import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Globe,
  KeyRound,
  Lock,
  LogIn,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { storage } from '../services/storage';
import { User } from '../types';

interface LoginScreenProps {
  onSuccess: (user: User) => void;
  lang: Language;
  onToggleLang: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  lang,
  onToggleLang,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[lang];
  const orgProfile = storage.getOrgProfile();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = storage.authenticate(identifier, password);
      if (res.user) {
        onSuccess(res.user);
      } else {
        setError(res.error || t.invalidCredentials);
      }
      setIsLoading(false);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-red-50/40 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      {/* Top right language switch */}
      <div className="absolute top-4 right-4">
        <button
          onClick={onToggleLang}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white shadow-xs border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{lang === 'en' ? 'বাংলা (বাংলায় দেখুন)' : 'English'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* LEEDO Red Dual Figure Logo */}
        <div className="mx-auto h-24 w-24 p-3 bg-white rounded-3xl shadow-lg border border-red-100 flex items-center justify-center">
          <img
            src={orgProfile.logoUrl || '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png'}
            alt="LEEDO Logo"
            className="h-full w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';
            }}
          />
        </div>

        <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {lang === 'bn' ? orgProfile.nameBn : orgProfile.nameEn}
        </h2>
        <p className="mt-1 text-sm font-bold text-red-600 uppercase tracking-wide">
          {t.appName}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 max-w-sm mx-auto">
          {t.orgTagline}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl sm:rounded-3xl sm:px-10 border border-slate-100">
          <div className="mb-5 text-center">
            <h3 className="text-base font-bold text-slate-800">
              {lang === 'bn' ? 'সিস্টেমে লগইন করুন' : 'Sign in to your account'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'bn' ? 'আপনার নির্ধারিত এমপ্লয়ী আইডি দিয়ে প্রবেশ করুন' : 'Enter your assigned Employee ID and password'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {lang === 'bn' ? 'এমপ্লয়ী আইডি (EID)' : 'Employee ID (EID)'}
              </label>
              <div className="mt-1 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 1001, 1004, 1009, 1032, 1079"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t.password}
              </label>
              <div className="mt-1 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-semibold text-slate-900"
                />
              </div>
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="flex items-center space-x-1.5 font-medium text-slate-700">
                  <KeyRound className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>
                    {lang === 'bn'
                      ? 'প্রাথমিক ডিফল্ট পাসওয়ার্ড: আপনার এমপ্লয়ী আইডি (যেমন: 1001)'
                      : 'Default initial password: Your Employee ID (e.g. 1001)'}
                  </span>
                </p>
                <p className="text-[10px] text-slate-500 pl-5">
                  {lang === 'bn'
                    ? '🔒 প্রথমবার সফল লগইনের পর আপনাকে নতুন ব্যক্তিগত পাসওয়ার্ড সেট করতে হবে।'
                    : '🔒 Upon first login, you will be prompted to set your personal permanent password.'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Checking...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    <span>{t.loginButton}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              {lang === 'bn'
                ? 'অননুমোদিত প্রবেশ নিষিদ্ধ • লিডো সম্পদ ট্র্যাকিং ও অডিট সিস্টেম'
                : 'Authorized Personnel Only • LEEDO Asset Tracking & Audit'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
