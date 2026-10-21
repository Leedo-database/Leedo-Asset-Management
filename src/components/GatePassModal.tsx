import React from 'react';
import {
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  MapPin,
  Printer,
  QrCode,
  ShieldCheck,
  Square,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { storage } from '../services/storage';
import { Area, Asset, AssetTransfer, User } from '../types';

interface GatePassModalProps {
  transfer: AssetTransfer | null;
  asset?: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  areas: Area[];
  lang: Language;
}

export const GatePassModal: React.FC<GatePassModalProps> = ({
  transfer,
  asset,
  isOpen,
  onClose,
  areas,
  lang,
}) => {
  if (!isOpen || !transfer) return null;

  const t = translations[lang];
  const orgProfile = storage.getOrgProfile();

  const sourceArea = areas.find((a) => a.id === transfer.sourceAreaId);
  const destArea = areas.find((a) => a.id === transfer.destinationAreaId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 px-6 py-3 text-white flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-red-500" />
            <span className="font-bold text-xs uppercase tracking-wider">
              {lang === 'bn' ? 'অফিসিয়াল স্থানান্তর গেটপাস ভাউচার' : 'Official Dual-Sign Inter-Center Gate Pass'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printGatePass}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 space-y-6 text-slate-800 font-sans print-page">
          {/* Header */}
          <div className="border-b-2 border-red-600 pb-4 flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 p-1 rounded-xl border border-red-200 flex items-center justify-center bg-white shadow-xs">
                <img
                  src={orgProfile.logoUrl || '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png'}
                  alt="LEEDO Logo"
                  className="h-full w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png';
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {orgProfile.nameEn}
                </h1>
                <p className="text-xs font-semibold text-red-600">
                  {orgProfile.nameBn}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {orgProfile.addressEn} • {orgProfile.phone} • {orgProfile.email}
                </p>
                <p className="text-[10px] text-slate-400">
                  Reg. No: {orgProfile.registrationNo} (NGO Affairs Bureau, Bangladesh)
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="inline-block bg-red-50 border border-red-200 rounded-lg px-3 py-1 text-center">
                <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider block">
                  TRANSFER GATE PASS
                </span>
                <span className="text-sm font-mono font-black text-slate-900">
                  {transfer.voucherNumber}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Issued: {transfer.dispatchDateTime.replace('T', ' ')}
              </p>
            </div>
          </div>

          {/* Transfer Route Banner */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-4">
            {/* Source */}
            <div className="border-r border-slate-200 pr-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                FROM (DISPATCH CENTER):
              </span>
              <p className="font-bold text-sm text-slate-900 mt-1">
                {sourceArea?.nameEn} [{sourceArea?.code}]
              </p>
              <p className="text-xs text-slate-600">{sourceArea?.addressEn}</p>
              <p className="text-xs text-slate-500 mt-1">
                Authorized By: <strong>{transfer.dispatchByUserName}</strong>
              </p>
            </div>

            {/* Destination */}
            <div className="pl-2">
              <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">
                TO (DESTINATION CENTER):
              </span>
              <p className="font-bold text-sm text-slate-900 mt-1">
                {destArea?.nameEn} [{destArea?.code}]
              </p>
              <p className="text-xs text-slate-600">{destArea?.addressEn}</p>
              <p className="text-xs text-slate-500 mt-1">
                Recipient Incharge: <strong>{destArea?.contactPerson}</strong> ({destArea?.contactPhone})
              </p>
            </div>
          </div>

          {/* Asset Item Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full text-xs divide-y divide-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-700 text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Asset Identification</th>
                  <th className="px-4 py-2 text-left">Asset Title & Category</th>
                  <th className="px-4 py-2 text-left">Serial / Model No</th>
                  <th className="px-4 py-2 text-center">Dispatch Condition</th>
                  <th className="px-4 py-2 text-center">Arrival Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="px-4 py-3 font-mono font-bold text-red-600">
                    {transfer.assetId}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {transfer.assetTitle}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {asset?.serialNumber || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {transfer.dispatchCondition}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {transfer.status === 'Received' ? (
                      <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {transfer.receiveCondition}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">In-Transit Verification</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Courier / Driver & Handover Note */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-600 uppercase text-[10px]">
                Transport / Handover Person:
              </span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {transfer.courierOrDriver || 'LEEDO Authorized Logistics Representative'}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-600 uppercase text-[10px]">
                Sender Transfer Purpose / Remarks:
              </span>
              <p className="text-slate-700 mt-0.5">
                {transfer.dispatchRemarks || 'Authorized official relocation for program requirements.'}
              </p>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="border border-slate-200 rounded-xl p-3 text-[11px] space-y-1 bg-white">
            <span className="font-bold text-slate-800 uppercase text-[10px] block">
              Physical Handover & Verification Checklist:
            </span>
            <div className="grid grid-cols-3 gap-2 text-slate-600 pt-1">
              <div className="flex items-center space-x-1.5">
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Physical condition matched</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Power cable / accessories intact</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Asset tag label securely affixed</span>
              </div>
            </div>
          </div>

          {/* Signatures & Official Seal Grid */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
            {/* Sender */}
            <div>
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-900">
                {transfer.dispatchByUserName}
              </div>
              <p className="text-[10px] text-slate-500">
                Dispatch Officer (Sender Signature)
              </p>
              <p className="text-[9px] text-slate-400">Date: {transfer.dispatchDateTime.split('T')[0]}</p>
            </div>

            {/* Official Seal */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-red-300 flex items-center justify-center p-1 text-center">
                <span className="text-[9px] font-bold text-red-600 uppercase leading-tight">
                  LEEDO<br />Official Seal<br />& Stamp
                </span>
              </div>
            </div>

            {/* Receiver */}
            <div>
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-900">
                {transfer.receivedByUserName || '___________________________'}
              </div>
              <p className="text-[10px] text-slate-500">
                Receiving Incharge (Receiver Signature)
              </p>
              <p className="text-[9px] text-slate-400">
                Date: {transfer.receiveDateTime ? transfer.receiveDateTime.split('T')[0] : '____/__/____'}
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
            {t.confidentialDoc} • Generated via LEEDO LAMS System
          </div>
        </div>
      </div>
    </div>
  );
};
