import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  PlusCircle,
  Printer,
  Truck,
  UserCheck,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { storage } from '../services/storage';
import { Area, Asset, AssetTransfer, TransferCondition, User } from '../types';
import { GatePassModal } from './GatePassModal';

interface TransfersViewProps {
  currentUser: User;
  transfers: AssetTransfer[];
  assets: Asset[];
  areas: Area[];
  lang: Language;
  onSaveTransfer: (transfer: AssetTransfer) => void;
}

export const TransfersView: React.FC<TransfersViewProps> = ({
  currentUser,
  transfers,
  assets,
  areas,
  lang,
  onSaveTransfer,
}) => {
  const t = translations[lang];

  // Modals state
  const [isInitiateOpen, setIsInitiateOpen] = useState(false);
  const [selectedForReceive, setSelectedForReceive] = useState<AssetTransfer | null>(null);
  const [selectedForGatePass, setSelectedForGatePass] = useState<AssetTransfer | null>(null);

  // Form State: Initiate
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [destinationAreaId, setDestinationAreaId] = useState(areas[1]?.id || 'area-mir');
  const [dispatchDateTime, setDispatchDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [dispatchCondition, setDispatchCondition] = useState<TransferCondition>('Good');
  const [courierOrDriver, setCourierOrDriver] = useState('');
  const [dispatchRemarks, setDispatchRemarks] = useState('');

  // Form State: Receive
  const [receiveDateTime, setReceiveDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [receiveCondition, setReceiveCondition] = useState<TransferCondition>('Good');
  const [receiveRemarks, setReceiveRemarks] = useState('');

  const isGlobal = currentUser.assignedAreaIds.includes('ALL');

  // Filter transfers relevant to user's scope
  const scopedTransfers = transfers.filter((tr) => {
    if (isGlobal) return true;
    return (
      currentUser.assignedAreaIds.includes(tr.sourceAreaId) ||
      currentUser.assignedAreaIds.includes(tr.destinationAreaId)
    );
  });

  // Assets that can be transferred (must belong to sender's area and not already in transit)
  const transferrableAssets = assets.filter((a) => {
    if (a.usabilityStatus === 'Disposed') return false;
    if (a.transferStatus === 'in_transit') return false;
    if (isGlobal) return true;
    return currentUser.assignedAreaIds.includes(a.assignedAreaId);
  });

  // Incoming shipments destined for the current user's centers
  const incomingTransfers = transfers.filter(
    (tr) =>
      tr.status === 'In-Transit' &&
      (isGlobal || currentUser.assignedAreaIds.includes(tr.destinationAreaId))
  );

  const activeInTransit = scopedTransfers.filter((tr) => tr.status === 'In-Transit');
  const completedTransfers = scopedTransfers.filter((tr) => tr.status === 'Received');

  const handleInitiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find((a) => a.id === selectedAssetId);
    if (!asset) return;

    const newTransfer: AssetTransfer = {
      id: `TR-${Date.now()}`,
      voucherNumber: storage.generateVoucherNumber(),
      assetId: asset.id,
      assetTitle: asset.titleEn,
      sourceAreaId: asset.assignedAreaId,
      destinationAreaId,
      dispatchDateTime,
      dispatchCondition,
      dispatchByUserId: currentUser.id,
      dispatchByUserName: currentUser.name,
      courierOrDriver: courierOrDriver.trim(),
      dispatchRemarks: dispatchRemarks.trim(),
      status: 'In-Transit',
    };

    onSaveTransfer(newTransfer);
    setIsInitiateOpen(false);
    setSelectedAssetId('');
    setCourierOrDriver('');
    setDispatchRemarks('');
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForReceive) return;

    const updated: AssetTransfer = {
      ...selectedForReceive,
      status: 'Received',
      receiveDateTime,
      receiveCondition,
      receivedByUserId: currentUser.id,
      receivedByUserName: currentUser.name,
      receiveRemarks: receiveRemarks.trim(),
    };

    onSaveTransfer(updated);
    setSelectedForReceive(null);
    setReceiveRemarks('');
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t.transfersTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.transfersSubtitle}</p>
        </div>

        {currentUser.canManageAssets && (
          <button
            onClick={() => {
              if (transferrableAssets.length > 0) {
                setSelectedAssetId(transferrableAssets[0].id);
              }
              setIsInitiateOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.initiateTransfer}</span>
          </button>
        )}
      </div>

      {/* Incoming Transfers Section (Immediate Attention Alert) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-emerald-50/70 p-4 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
              {t.incomingShipments}
            </h3>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            {incomingTransfers.length} {lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}
          </span>
        </div>

        {incomingTransfers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
            <p className="font-semibold text-slate-600">{t.noIncomingShipments}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {incomingTransfers.map((tr) => {
              const src = areas.find((a) => a.id === tr.sourceAreaId);
              const dest = areas.find((a) => a.id === tr.destinationAreaId);
              const asset = assets.find((a) => a.id === tr.assetId);

              return (
                <div key={tr.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
                        {tr.voucherNumber}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{tr.assetTitle}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center space-x-1 font-medium text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{src ? (lang === 'bn' ? src.nameBn : src.nameEn) : 'Origin'}</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="flex items-center space-x-1 font-bold text-emerald-700">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>{dest ? (lang === 'bn' ? dest.nameBn : dest.nameEn) : 'Destination'}</span>
                      </span>
                      <span>•</span>
                      <span>Dispatched: {tr.dispatchDateTime.replace('T', ' ')}</span>
                      <span>•</span>
                      <span>Condition: <strong>{tr.dispatchCondition}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => setSelectedForGatePass(tr)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors flex items-center space-x-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t.printGatePass}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedForReceive(tr);
                        setReceiveDateTime(new Date().toISOString().slice(0, 16));
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.receiveAndConfirm}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t.transferHistory} ({scopedTransfers.length})
          </h3>
        </div>

        {scopedTransfers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {lang === 'bn' ? 'কোনো স্থানান্তরের রেকর্ড নেই' : 'No transfer records yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-left">{t.voucherNo}</th>
                  <th className="px-4 py-3 text-left">{t.assetTitle}</th>
                  <th className="px-4 py-3 text-left">{t.sourceCenter}</th>
                  <th className="px-4 py-3 text-left">{t.destinationCenter}</th>
                  <th className="px-4 py-3 text-left">{t.dispatchTime}</th>
                  <th className="px-4 py-3 text-center">{t.status}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {scopedTransfers.map((tr) => {
                  const src = areas.find((a) => a.id === tr.sourceAreaId);
                  const dest = areas.find((a) => a.id === tr.destinationAreaId);

                  return (
                    <tr key={tr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-900">
                        {tr.voucherNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{tr.assetTitle}</div>
                        <div className="text-[11px] font-mono text-red-600">{tr.assetId}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {src ? (lang === 'bn' ? src.nameBn : src.nameEn) : 'Unknown'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">
                        {dest ? (lang === 'bn' ? dest.nameBn : dest.nameEn) : 'Unknown'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {tr.dispatchDateTime.replace('T', ' ')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            tr.status === 'Received'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800 animate-pulse'
                          }`}
                        >
                          {tr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedForGatePass(tr)}
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title={t.printGatePass}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Initiate Transfer Modal */}
      {isInitiateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">{t.initiateTransfer}</h3>
              <button
                onClick={() => setIsInitiateOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInitiateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'স্থানান্তরের জন্য সম্পদ নির্বাচন করুন' : 'Select Asset to Move'} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {transferrableAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.id}] {a.titleEn} ({a.specificRoom})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.destinationCenter} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={destinationAreaId}
                  onChange={(e) => setDestinationAreaId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {lang === 'bn' ? a.nameBn : a.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.dispatchTime} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={dispatchDateTime}
                    onChange={(e) => setDispatchDateTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.dispatchCondition}
                  </label>
                  <select
                    value={dispatchCondition}
                    onChange={(e) => setDispatchCondition(e.target.value as TransferCondition)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none"
                  >
                    <option value="Good">{t.good}</option>
                    <option value="Damaged">{t.damaged}</option>
                    <option value="Repairable">{t.statusRepairable}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.courierName}
                </label>
                <input
                  type="text"
                  value={courierOrDriver}
                  onChange={(e) => setCourierOrDriver(e.target.value)}
                  placeholder="e.g. Rafiqul Islam (LEEDO Staff Driver), SA Paribahan Courier"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'স্থানান্তরের উদ্দেশ্য বা মন্তব্য' : 'Transfer Purpose / Remarks'}
                </label>
                <textarea
                  rows={2}
                  value={dispatchRemarks}
                  onChange={(e) => setDispatchRemarks(e.target.value)}
                  placeholder="Reason for transfer, emergency requirement, or setup notes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsInitiateOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors"
                >
                  {lang === 'bn' ? 'চালান ইস্যু ও গেটপাস তৈরি' : 'Dispatch & Generate Gate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Confirmation Form Modal */}
      {selectedForReceive && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="bg-emerald-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">{t.confirmArrivalTitle}</h3>
              </div>
              <button
                onClick={() => setSelectedForReceive(null)}
                className="text-emerald-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">{selectedForReceive.assetTitle}</p>
                <p className="font-mono text-red-600">{selectedForReceive.assetId} • Voucher: {selectedForReceive.voucherNumber}</p>
                <p className="text-[11px] text-slate-500">
                  Dispatched by {selectedForReceive.dispatchByUserName} on {selectedForReceive.dispatchDateTime.replace('T', ' ')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.receiveTime} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={receiveDateTime}
                    onChange={(e) => setReceiveDateTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.receiveCondition} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={receiveCondition}
                    onChange={(e) => setReceiveCondition(e.target.value as TransferCondition)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none"
                  >
                    <option value="Good">{t.good}</option>
                    <option value="Damaged">{t.damaged}</option>
                    <option value="Missing parts">{t.missingParts}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'গ্রহণকালীন মন্তব্য ও পর্যবেক্ষণ' : 'Inspection & Acceptance Remarks'}
                </label>
                <textarea
                  rows={3}
                  value={receiveRemarks}
                  onChange={(e) => setReceiveRemarks(e.target.value)}
                  placeholder="Confirm physical condition, cable/parts match, or any transit damage noticed..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedForReceive(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors"
                >
                  {lang === 'bn' ? 'প্রাপ্তি নিশ্চিত করুন ও কার্যকর করুন' : 'Confirm & Activate in Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gate Pass Print Voucher Modal */}
      <GatePassModal
        isOpen={Boolean(selectedForGatePass)}
        transfer={selectedForGatePass}
        asset={assets.find((a) => a.id === selectedForGatePass?.assetId)}
        onClose={() => setSelectedForGatePass(null)}
        areas={areas}
        lang={lang}
      />
    </div>
  );
};
