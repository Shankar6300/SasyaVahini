import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Handshake, CheckCircle2, XCircle, Clock, AlertCircle, Building,
  Package, DollarSign, Calendar, RefreshCw, ChevronRight, Check, X,
  ShieldCheck, ArrowRight, HelpCircle
} from 'lucide-react';

const FarmerContributionsSection = ({ user, onContributionAction }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'HISTORY'
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  // Partial Acceptance Modal State
  const [partialModalReq, setPartialModalReq] = useState(null);
  const [partialQty, setPartialQty] = useState('');
  const [partialError, setPartialError] = useState('');

  const fetchContributions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/farmers/contributions');
      const data = res.data?.data || res.data || {};
      setPendingRequests(data.incomingRequests || []);
      setHistoryRequests(data.contributionHistory || []);
    } catch (err) {
      console.warn('Error fetching farmer contributions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, []);

  const handleAcceptFull = async (req) => {
    if (!window.confirm(t('farmer.confirmAcceptFull', `Accept FPO request for ${req.requestedQtyKg} kg of ${req.cropName} at ₹${req.offeredPricePerKg}/kg? This quantity will be reserved for FPO aggregation.`))) {
      return;
    }
    setActionLoading(req.id);
    try {
      const res = await api.post(`/farmers/contributions/${req.id}/accept`);
      alert(res.data?.data?.message || t('farmer.acceptSuccess', 'Contribution confirmed successfully! Stock has been reserved for collective aggregation.'));
      fetchContributions();
      if (onContributionAction) onContributionAction();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenPartialModal = (req) => {
    setPartialModalReq(req);
    setPartialQty(String(Math.min(req.requestedQtyKg, req.listingAvailableQtyKg || req.requestedQtyKg)));
    setPartialError('');
  };

  const handleSubmitPartial = async (e) => {
    e.preventDefault();
    if (!partialModalReq) return;

    const qty = parseFloat(partialQty);
    if (!qty || isNaN(qty) || qty <= 0) {
      setPartialError(t('farmer.validQtyReq', 'Please enter a valid quantity greater than 0 kg.'));
      return;
    }

    if (qty > partialModalReq.requestedQtyKg) {
      setPartialError(t('farmer.cannotExceedRequested', `Accepted quantity cannot exceed the requested ${partialModalReq.requestedQtyKg} kg.`));
      return;
    }

    if (qty > partialModalReq.listingAvailableQtyKg) {
      setPartialError(t('farmer.cannotExceedAvailable', `Accepted quantity cannot exceed your available stock (${partialModalReq.listingAvailableQtyKg} kg).`));
      return;
    }

    setActionLoading(partialModalReq.id);
    try {
      const res = await api.post(`/farmers/contributions/${partialModalReq.id}/accept-partial`, {
        acceptedQtyKg: qty
      });
      alert(res.data?.data?.message || t('farmer.partialAcceptSuccess', `Partial contribution of ${qty} kg confirmed successfully!`));
      setPartialModalReq(null);
      fetchContributions();
      if (onContributionAction) onContributionAction();
    } catch (err) {
      setPartialError(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (req) => {
    const reason = window.prompt(t('farmer.enterDeclineReason', `Decline request for ${req.cropName}? You can optionally enter a reason for the FPO:`));
    if (reason === null) return; // user cancelled

    setActionLoading(req.id);
    try {
      const res = await api.post(`/farmers/contributions/${req.id}/reject`, { reason });
      alert(res.data?.data?.message || t('farmer.declineSuccess', 'Request declined. Your stock remains completely available for independent sales.'));
      fetchContributions();
      if (onContributionAction) onContributionAction();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const totalAggregatedKg = historyRequests
    .filter(r => ['ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(r.status))
    .reduce((s, r) => s + (r.confirmedQtyKg || r.requestedQtyKg || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-emerald-800/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-2">
            <Handshake className="w-3.5 h-3.5 text-emerald-400" />
            🌾 {t('farmer.fpoContributions', 'FPO Collective Procurement & Contributions')}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {t('farmer.incomingContributionsTitle', 'Cooperative Contribution Requests')}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
            {t('farmer.incomingContributionsSubtitle', 'When your FPO aggregates produce for institutional buyers, purchase requests appear here. Your stock is only reserved upon your explicit consent.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchContributions}
            disabled={loading}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {/* Trust & Non-Unilateral Hold Notice */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-700 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-extrabold text-slate-900">{t('farmer.consentGuaranteeTitle', 'Farmer Consent Guarantee Enforced')}</p>
          <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
            {t('farmer.consentGuaranteeDesc', 'FPOs cannot freeze, hold, or reserve your produce unilaterally. Stock is only reserved when you confirm the requested quantity. You have complete freedom to accept in full, accept a partial batch, or decline.')}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">{t('farmer.pendingProposals', 'Pending Requests')}</p>
            <p className="text-xl font-black text-slate-900">{pendingRequests.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">{t('farmer.confirmedContributions', 'Confirmed Requests')}</p>
            <p className="text-xl font-black text-emerald-700">
              {historyRequests.filter(r => ['ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(r.status)).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">{t('farmer.totalSuppliedToFpo', 'Total Contributed')}</p>
            <p className="text-xl font-black text-sky-800">{totalAggregatedKg.toLocaleString()} kg</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`pb-3 px-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'PENDING'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          {t('farmer.actionRequiredRequests', 'Action Required / Incoming Requests')} ({pendingRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t('farmer.contributionHistoryTab', 'Contribution History & Completed')} ({historyRequests.length})
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-bold">{t('farmer.loadingContributions', 'Loading cooperative requests…')}</p>
        </div>
      ) : activeTab === 'PENDING' ? (
        /* PENDING REQUESTS TAB */
        pendingRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
            <Handshake className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">{t('farmer.noPendingRequests', 'No pending contribution requests')}</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {t('farmer.noPendingRequestsDesc', 'When your FPO needs produce for large institutional buyer contracts, aggregation proposals will be sent directly to your portal for review.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((req) => {
              const totalPayout = (req.requestedQtyKg || 0) * (req.offeredPricePerKg || 0);
              const isOverStock = req.listingAvailableQtyKg !== undefined && req.requestedQtyKg > req.listingAvailableQtyKg;

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-emerald-300 transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-1">
                        <Clock className="w-3 h-3" /> {t('common.pendingAction', 'Pending Response')}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-emerald-600" />
                        {req.cropName} {req.variety ? `(${req.variety})` : ''}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {req.fpoName || 'Affiliated Producer Organization'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">{t('farmer.offeredRate', 'Offered Rate')}</span>
                      <span className="text-lg font-black text-emerald-700">₹{req.offeredPricePerKg}<span className="text-xs text-slate-500">/kg</span></span>
                    </div>
                  </div>

                  {/* Quantity & Stock Context */}
                  <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">{t('farmer.requestedQuantity', 'FPO Requested')}</span>
                      <span className="font-bold text-slate-800 text-sm">{req.requestedQtyKg.toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{t('farmer.yourAvailableStock', 'Your Available Stock')}</span>
                      <span className={`font-bold text-sm ${isOverStock ? 'text-rose-600' : 'text-slate-800'}`}>
                        {req.listingAvailableQtyKg !== undefined ? `${req.listingAvailableQtyKg.toLocaleString()} kg` : 'Available'}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200/60 flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">{t('farmer.estimatedGrossPayout', 'Total Contract Value')}:</span>
                      <span className="font-extrabold text-emerald-800">₹{totalPayout.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Purpose / Notes */}
                  {req.purpose && (
                    <div className="text-xs bg-emerald-50/50 rounded-lg p-2.5 border border-emerald-100 text-emerald-900">
                      <span className="font-bold block text-[10px] text-emerald-700 uppercase">{t('farmer.fpoPurpose', 'Aggregation Purpose')}:</span>
                      <p className="mt-0.5">{req.purpose}</p>
                      {req.notes && <p className="text-[11px] text-emerald-700 mt-1 italic">"{req.notes}"</p>}
                    </div>
                  )}

                  {/* Expiry */}
                  {req.expiresAt && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {t('farmer.expiresOn', 'Expires')}: {new Date(req.expiresAt).toLocaleDateString()} {new Date(req.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAcceptFull(req)}
                      disabled={actionLoading === req.id || (req.listingAvailableQtyKg !== undefined && req.listingAvailableQtyKg < req.requestedQtyKg)}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {t('farmer.acceptFullBtn', 'Accept Full Qty')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPartialModal(req)}
                      disabled={actionLoading === req.id || (req.listingAvailableQtyKg !== undefined && req.listingAvailableQtyKg <= 0)}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      {t('farmer.acceptPartialBtn', 'Accept Partial…')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReject(req)}
                      disabled={actionLoading === req.id}
                      className="py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      {t('farmer.declineBtn', 'Decline')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* HISTORY TAB */
        historyRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">{t('farmer.noHistoryYet', 'No past contribution records')}</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {t('farmer.noHistoryDesc', 'Confirmed, completed, or declined contributions will appear here with complete audit records.')}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">{t('farmer.crop', 'Crop')}</th>
                    <th className="py-3 px-4">{t('farmer.fpo', 'FPO')}</th>
                    <th className="py-3 px-4">{t('farmer.requestedVsConfirmed', 'Requested / Confirmed')}</th>
                    <th className="py-3 px-4">{t('farmer.price', 'Price')}</th>
                    <th className="py-3 px-4">{t('farmer.status', 'Status')}</th>
                    <th className="py-3 px-4">{t('farmer.date', 'Date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyRequests.map((req) => {
                    const statusColor = {
                      ACCEPTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      PARTIALLY_ACCEPTED: 'bg-teal-50 text-teal-800 border-teal-200',
                      REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
                      CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
                      EXPIRED: 'bg-amber-50 text-amber-800 border-amber-200'
                    }[req.status] || 'bg-slate-100 text-slate-600 border-slate-200';

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{req.cropName}</td>
                        <td className="py-3 px-4 text-slate-600">{req.fpoName || 'FPO'}</td>
                        <td className="py-3 px-4 font-bold">
                          {req.confirmedQtyKg ? `${req.confirmedQtyKg} kg` : '-'}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Req: {req.requestedQtyKg} kg
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">₹{req.offeredPricePerKg}/kg</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* PARTIAL QUANTITY ACCEPTANCE MODAL */}
      {partialModalReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {t('farmer.acceptPartialTitle', 'Accept Partial Contribution Quantity')}
              </h3>
              <button
                type="button"
                onClick={() => setPartialModalReq(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {t('farmer.partialInstructions', `Specify how many kilograms of ${partialModalReq.cropName} you wish to allocate to ${partialModalReq.fpoName || 'your FPO'}. The remaining stock stays available for your direct sales.`)}
            </p>

            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>{t('farmer.fpoRequested', 'FPO Requested')}:</span>
                <span className="font-bold text-slate-900">{partialModalReq.requestedQtyKg} kg</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t('farmer.availableInListing', 'Available in your listing')}:</span>
                <span className="font-bold text-emerald-700">{partialModalReq.listingAvailableQtyKg || partialModalReq.requestedQtyKg} kg</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t('farmer.offeredRate', 'Offered Rate')}:</span>
                <span className="font-bold text-slate-900">₹{partialModalReq.offeredPricePerKg}/kg</span>
              </div>
            </div>

            <form onSubmit={handleSubmitPartial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('farmer.quantityToCommit', 'Quantity to Commit (kg)')} *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={Math.min(partialModalReq.requestedQtyKg, partialModalReq.listingAvailableQtyKg || partialModalReq.requestedQtyKg)}
                  value={partialQty}
                  onChange={(e) => {
                    setPartialQty(e.target.value);
                    setPartialError('');
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                  placeholder="e.g. 250"
                  required
                />
                {partialQty && !isNaN(parseFloat(partialQty)) && (
                  <p className="text-[11px] text-emerald-700 font-bold mt-1">
                    {t('farmer.expectedPayout', 'Expected gross earnings')}: ₹{(parseFloat(partialQty) * partialModalReq.offeredPricePerKg).toLocaleString()}
                  </p>
                )}
              </div>

              {partialError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{partialError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPartialModalReq(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === partialModalReq.id}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {t('farmer.confirmPartialCommitment', 'Confirm & Reserve Stock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FarmerContributionsSection;
