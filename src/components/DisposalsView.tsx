import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  PlusCircle,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Area, Asset, DisposalRequest, DisposalStatus, User } from '../types';
import { calculateDepreciation, formatBDT } from '../utils/depreciation';

interface DisposalsViewProps {
  currentUser: User;
  disposals: DisposalRequest[];
  assets: Asset[];
  areas: Area[];
  lang: Language;
  onSaveDisposal: (request: DisposalRequest) => void;
  onRequestFromAsset?: Asset | null;
  onClearRequestAsset?: () => void;
}

export const DisposalsView: React.FC<DisposalsViewProps> = ({
  currentUser,
  disposals,
  assets,
  areas,
  lang,
  onSaveDisposal,
  onRequestFromAsset,
  onClearRequestAsset,
}) => {
  const t = translations[lang];

  const isGlobal = currentUser.assignedAreaIds.includes('ALL');

  // Modal States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(Boolean(onRequestFromAsset));
  const [reviewingRequest, setReviewingRequest] = useState<DisposalRequest | null>(null);

  // Form State: Submit Request
  const [selectedAssetId, setSelectedAssetId] = useState(onRequestFromAsset?.id || '');
  const [reasonEn, setReasonEn] = useState('');
  const [damageDetails, setDamageDetails] = useState('');
  const [proposedAction, setProposedAction] = useState<
    'Sell as Scrap' | 'E-waste Recycling' | 'Donation to Destitute' | 'Destruction' | 'Auction'
  >('E-waste Recycling');

  // Form State: HO Review
  const [reviewComments, setReviewComments] = useState('');
  const [reviewAction, setReviewAction] = useState<
    'Sell as Scrap' | 'E-waste Recycling' | 'Donation to Destitute' | 'Destruction' | 'Auction'
  >('Sell as Scrap');

  // Eligible assets for disposal: belonging to current user's areas, not yet disposed
  const eligibleAssets = assets.filter((a) => {
    if (a.usabilityStatus === 'Disposed') return false;
    if (isGlobal) return true;
    return currentUser.assignedAreaIds.includes(a.assignedAreaId);
  });

  // Selected asset computation for financial impact preview
  const activeAssetToDispose = assets.find((a) => a.id === (selectedAssetId || onRequestFromAsset?.id));
  const depCalculation = activeAssetToDispose
    ? calculateDepreciation(
        activeAssetToDispose.purchaseDate,
        activeAssetToDispose.purchaseValueBDT,
        activeAssetToDispose.category
      )
    : null;

  // Filter disposals by user's area scope
  const scopedDisposals = disposals.filter((d) => {
    if (isGlobal) return true;
    return currentUser.assignedAreaIds.includes(d.assignedAreaId);
  });

  const pendingRequests = scopedDisposals.filter((d) => d.status === 'Pending HO Approval');
  const pastRequests = scopedDisposals.filter((d) => d.status !== 'Pending HO Approval');

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssetToDispose || !depCalculation) return;

    const newRequest: DisposalRequest = {
      id: `DISP-${Date.now()}`,
      assetId: activeAssetToDispose.id,
      assetTitle: activeAssetToDispose.titleEn,
      category: activeAssetToDispose.category,
      assignedAreaId: activeAssetToDispose.assignedAreaId,
      purchaseValueBDT: activeAssetToDispose.purchaseValueBDT,
      currentBookValueBDT: depCalculation.currentBookValue,
      requestedByUserId: currentUser.id,
      requestedByUserName: `${currentUser.name} (${currentUser.designation})`,
      requestDate: new Date().toISOString().split('T')[0],
      reasonEn: reasonEn.trim(),
      damageDetails: damageDetails.trim(),
      status: 'Pending HO Approval',
      proposedAction,
    };

    onSaveDisposal(newRequest);
    setIsSubmitModalOpen(false);
    setSelectedAssetId('');
    setReasonEn('');
    setDamageDetails('');
    if (onClearRequestAsset) onClearRequestAsset();
  };

  const handleReviewDecision = (status: DisposalStatus) => {
    if (!reviewingRequest) return;

    const updated: DisposalRequest = {
      ...reviewingRequest,
      status,
      reviewedByUserId: currentUser.id,
      reviewedByUserName: currentUser.name,
      reviewDate: new Date().toISOString().split('T')[0],
      reviewComments: reviewComments.trim(),
      proposedAction: reviewAction,
    };

    onSaveDisposal(updated);
    setReviewingRequest(null);
    setReviewComments('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t.disposalsTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.disposalsSubtitle}</p>
        </div>

        <button
          onClick={() => {
            if (eligibleAssets.length > 0 && !selectedAssetId) {
              setSelectedAssetId(eligibleAssets[0].id);
            }
            setIsSubmitModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-xs transition-colors shrink-0"
        >
          <AlertOctagon className="w-4 h-4" />
          <span>{t.requestDisposal}</span>
        </button>
      </div>

      {/* Pending HO Review Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-amber-600 text-white">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              {lang === 'bn'
                ? `হেড অফিসের অনুমোদনের অপেক্ষমাণ আবেদনসমূহ (${pendingRequests.length})`
                : `Awaiting Head Office Review & Approval (${pendingRequests.length})`}
            </h3>
          </div>
          {currentUser.canApproveDisposal && (
            <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
              {lang === 'bn' ? 'অনুমোদনের ক্ষমতা রয়েছে' : 'Approval Permission Active'}
            </span>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">
              {lang === 'bn' ? 'কোনো অপেক্ষমাণ বাতিলের আবেদন নেই' : 'No pending disposal requests.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingRequests.map((req) => {
              const area = areas.find((a) => a.id === req.assignedAreaId);

              return (
                <div key={req.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
                        {req.assetId}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{req.assetTitle}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                        {t.pendingApproval}
                      </span>
                    </div>

                    {/* Financial Loss Impact Display */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1 max-w-lg text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">{t.originalCost}</span>
                        <p className="font-bold text-slate-800">{formatBDT(req.purchaseValueBDT)}</p>
                      </div>
                      <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                        <span className="text-[10px] text-red-700 uppercase font-semibold">{t.currentDepreciatedValue}</span>
                        <p className="font-black text-red-600">{formatBDT(req.currentBookValueBDT)}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">{t.lossRecognized}</span>
                        <p className="font-bold text-slate-800">
                          {formatBDT(req.currentBookValueBDT)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <strong>{t.disposalReason}:</strong> {req.reasonEn}
                      </p>
                      {req.damageDetails && (
                        <p className="text-slate-500 text-[11px]">
                          <strong>Damage Details:</strong> {req.damageDetails}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        Requested by <strong>{req.requestedByUserName}</strong> on {req.requestDate} at {area?.nameEn}
                      </p>
                    </div>
                  </div>

                  {/* Actions for Head Office Approvers */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {currentUser.canApproveDisposal ? (
                      <button
                        onClick={() => {
                          setReviewingRequest(req);
                          setReviewAction(req.proposedAction || 'Sell as Scrap');
                        }}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center space-x-1"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'আর্থিক পর্যালোচনা ও সিদ্ধান্ত' : 'Review & Decide'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        {lang === 'bn' ? 'হেড অফিসের পর্যালোচনার অপেক্ষায়' : 'Awaiting HO Decision'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disposed / Rejected History Archive */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {lang === 'bn' ? 'নিষ্পত্তি ও বাতিলকরণ অডিট লগ' : 'Disposal & Audit History Log'} ({pastRequests.length})
          </h3>
        </div>

        {pastRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {lang === 'bn' ? 'কোনো পূর্ববর্তী নিষ্পত্তির রেকর্ড নেই' : 'No previous disposal history records.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-left">{t.assetId}</th>
                  <th className="px-4 py-3 text-left">{t.assetTitle}</th>
                  <th className="px-4 py-3 text-left">{t.assignedArea}</th>
                  <th className="px-4 py-3 text-right">{t.originalCost}</th>
                  <th className="px-4 py-3 text-right">{t.currentDepreciatedValue}</th>
                  <th className="px-4 py-3 text-center">{t.requestStatus}</th>
                  <th className="px-4 py-3 text-left">{lang === 'bn' ? 'সিদ্ধান্ত ও মন্তব্য' : 'Decision & Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {pastRequests.map((req) => {
                  const area = areas.find((a) => a.id === req.assignedAreaId);

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-700">
                        {req.assetId}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {req.assetTitle}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {area ? (lang === 'bn' ? area.nameBn : area.nameEn) : 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatBDT(req.purchaseValueBDT)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {formatBDT(req.currentBookValueBDT)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            req.status === 'Approved'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>
                          <strong>{req.proposedAction}:</strong> {req.reviewComments || 'Approved per policy.'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          By {req.reviewedByUserName} on {req.reviewDate}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Disposal Request Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="bg-amber-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">{t.requestDisposalTitle}</h3>
              </div>
              <button
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  if (onClearRequestAsset) onClearRequestAsset();
                }}
                className="text-amber-100 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'সম্পদ নির্বাচন করুন' : 'Select Asset for Disposal'} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {eligibleAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.id}] {a.titleEn} ({a.specificRoom})
                    </option>
                  ))}
                </select>
              </div>

              {/* Financial Depreciation Evaluation Preview */}
              {depCalculation && (
                <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-800 uppercase text-[10px]">
                      {t.financialImpact}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Age: {depCalculation.ageFormatted}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px]">{t.originalCost}:</span>
                      <p className="font-bold text-slate-800">{formatBDT(depCalculation.purchaseValue)}</p>
                    </div>
                    <div>
                      <span className="text-red-700 text-[10px] font-bold">{t.currentDepreciatedValue}:</span>
                      <p className="font-black text-red-600">{formatBDT(depCalculation.currentBookValue)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.disposalReason} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reasonEn}
                  onChange={(e) => setReasonEn(e.target.value)}
                  placeholder="e.g. Beyond economical repair, damaged beyond restoration, obsolete"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'ক্ষতির বিবরণ ও ইতিহাস' : 'Detailed Damage Description'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={damageDetails}
                  onChange={(e) => setDamageDetails(e.target.value)}
                  placeholder={t.damageDetailsPlaceholder}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.proposedMethod}
                </label>
                <select
                  value={proposedAction}
                  onChange={(e) => setProposedAction(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Sell as Scrap">{t.methodScrap}</option>
                  <option value="E-waste Recycling">{t.methodRecycle}</option>
                  <option value="Donation to Destitute">{t.methodDestitute}</option>
                  <option value="Auction">{t.methodAuction}</option>
                  <option value="Destruction">{t.methodDestruction}</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-colors"
                >
                  {lang === 'bn' ? 'আবেদন জমা দিন' : 'Submit for HO Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Head Office Review Modal */}
      {reviewingRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold">{t.reviewByHO}</h3>
              </div>
              <button
                onClick={() => setReviewingRequest(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">{reviewingRequest.assetTitle}</p>
                <p className="font-mono text-red-600">{reviewingRequest.assetId}</p>
                <p className="text-slate-600 mt-1">
                  <strong>Reason:</strong> {reviewingRequest.reasonEn}
                </p>
                <p className="text-slate-500">
                  <strong>Damage details:</strong> {reviewingRequest.damageDetails}
                </p>
              </div>

              {/* Financial impact */}
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">{t.originalCost}</span>
                  <p className="font-bold text-slate-800">{formatBDT(reviewingRequest.purchaseValueBDT)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-red-700 uppercase font-bold">{t.currentDepreciatedValue}</span>
                  <p className="font-black text-red-600">{formatBDT(reviewingRequest.currentBookValueBDT)}</p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'চূড়ান্ত নিষ্পত্তির উপায়' : 'Final Approved Disposal Method'}
                </label>
                <select
                  value={reviewAction}
                  onChange={(e) => setReviewAction(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none"
                >
                  <option value="Sell as Scrap">{t.methodScrap}</option>
                  <option value="E-waste Recycling">{t.methodRecycle}</option>
                  <option value="Donation to Destitute">{t.methodDestitute}</option>
                  <option value="Auction">{t.methodAuction}</option>
                  <option value="Destruction">{t.methodDestruction}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.approvalComments}
                </label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Enter Head Office approval notes, disposal committee resolution, or rejection reason..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between space-x-2">
                <button
                  type="button"
                  onClick={() => handleReviewDecision('Rejected')}
                  className="px-4 py-2 font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors flex items-center space-x-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{t.rejectDisposal}</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setReviewingRequest(null)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewDecision('Approved')}
                    className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t.approveDisposal}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
