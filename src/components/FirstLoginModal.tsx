import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { storage } from '../services/storage';
import { User } from '../types';

interface FirstLoginModalProps {
  user: User;
  isOpen: boolean;
  onSuccess: (updatedUser: User) => void;
  lang: Language;
  onCancel?: () => void;
  isVoluntary?: boolean; // if opened manually from navbar
}

export const FirstLoginModal: React.FC<FirstLoginModalProps> = ({
  user,
  isOpen,
  onSuccess,
  lang,
  onCancel,
  isVoluntary = false,
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const t = translations[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Verify current password (default is EID)
    const validCurrent = user.password || user.employeeId;
    if (currentPass !== validCurrent && currentPass !== user.employeeId) {
      setError(
        lang === 'bn'
          ? 'বর্তমান পাসওয়ার্ডটি ভুল। প্রাথমিক পাসওয়ার্ড আপনার এমপ্লয়ি আইডি।'
          : 'Incorrect current password. Your default temporary password was your Employee ID.'
      );
      return;
    }

    if (newPass.length < 6) {
      setError(t.passwordRequirements);
      return;
    }

    if (newPass === user.employeeId) {
      setError(
        lang === 'bn'
          ? 'নতুন পাসওয়ার্ড অবশ্যই এমপ্লয়ি আইডি থেকে আলাদা ও জটিল হতে হবে।'
          : 'New password cannot be identical to your Employee ID.'
      );
      return;
    }

    if (newPass !== confirmPass) {
      setError(t.passwordMismatch);
      return;
    }

    // Save
    const updated: User = {
      ...user,
      password: newPass,
      isFirstLogin: false,
    };

    storage.saveUser(updated);
    storage.setCurrentUser(updated);
    setSuccess(true);

    setTimeout(() => {
      onSuccess(updated);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold">
            {isVoluntary
              ? lang === 'bn'
                ? 'পাসওয়ার্ড পরিবর্তন করুন'
                : 'Change Account Password'
              : t.firstLoginAlert}
          </h3>
          <p className="text-xs text-red-100 mt-1">
            {isVoluntary
              ? lang === 'bn'
                ? 'আপনার অ্যাকাউন্ট সুরক্ষিত রাখতে নিয়মিত পাসওয়ার্ড পরিবর্তন করুন।'
                : 'Keep your account secure with a strong unique password.'
              : lang === 'bn'
              ? 'নিরাপত্তার স্বার্থে প্রাথমিক ইআইডি পাসওয়ার্ড বদলে নতুন পাসওয়ার্ড দিন।'
              : 'Please replace your temporary EID password before proceeding.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                {lang === 'bn'
                  ? 'পাসওয়ার্ড সফলভাবে আপডেট হয়েছে! সিস্টেমে প্রবেশ করা হচ্ছে...'
                  : 'Password successfully updated! Redirecting to workspace...'}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t.currentPassword}
            </label>
            <div className="mt-1 relative rounded-lg">
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder={user.employeeId}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t.newPassword}
            </label>
            <div className="mt-1 relative rounded-lg">
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t.confirmPassword}
            </label>
            <div className="mt-1 relative rounded-lg">
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            {isVoluntary && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-1/2 py-2.5 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                {t.cancel}
              </button>
            )}
            <button
              type="submit"
              className={`${
                isVoluntary ? 'w-1/2' : 'w-full'
              } py-2.5 px-4 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t.saveNewPassword}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
