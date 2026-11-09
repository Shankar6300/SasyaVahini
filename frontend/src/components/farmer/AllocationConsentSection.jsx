import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { ShieldCheck, CheckCircle2, AlertTriangle, Clock, MapPin, Building, RefreshCw, Check } from 'lucide-react';
import VoiceAssistant from '../VoiceAssistant';

const AllocationConsentSection = ({ onAllocationStatusChanged }) => {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal Confirmation states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: null, // 'ACCEPT' or 'REJECT'
    proposal: null,
    reason: 'Price mismatch with mandi trend'
  });
  const [processingId, setProcessingId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  const fetchProposals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/farmers/proposals');
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setProposals(list);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError('Could not load supplier allocation proposals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const openConfirmation = (action, proposal) => {
    setConfirmModal({
      isOpen: true,
      action,
      proposal,
      reason: 'Price or delivery date mismatch'
    });
  };

  const executeConsentAction = async () => {
    const { action, proposal, reason } = confirmModal;
    if (!proposal) return;

    setProcessingId(proposal.id);
    setActionSuccessMsg(null);

    try {
      if (action === 'ACCEPT') {
        const res = await api.post(`/farmers/proposals/${proposal.id}/accept`, {
          listingId: proposal.listingId,
          requestedQtyKg: proposal.proposedQuantityKg
        });
        const msg = res.data?.data?.message || res.data?.message || 'Proposal accepted';
        setActionSuccessMsg(`Success: ${msg}`);
      } else if (action === 'REJECT') {
        const res = await api.post(`/farmers/proposals/${proposal.id}/reject`, {
          reason,
          listingId: proposal.listingId
        });
        const msg = res.data?.data?.message || res.data?.message || 'Proposal declined';
        setActionSuccessMsg(`Notice: ${msg}`);
      }

      setConfirmModal({ isOpen: false, action: null, proposal: null, reason: '' });
      await fetchProposals();
      if (onAllocationStatusChanged) {
        onAllocationStatusChanged();
      }
    } catch (err) {
      alert(`Action failed: ${err.response?.data?.error?.message || err.response?.data?.error || err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Educational Banner explaining the SasyaVahini differentiator */}
      <div className="bg-gradient-to-r from-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-emerald-800/40 space-y-3">
        <div className="flex items-center gap-2">
          <span className="bg-[#07875B] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
            Core Invention Workflow
          </span>
          <span className="text-emerald-400 text-xs font-bold">Explicit Supplier Consent Protocol</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">{t('proposals.title', 'Proposed Procurement Allocations & Supplier Consent')}</h2>
        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">{t('proposals.subtitle', "Unlike speculative platforms that assume unconfirmed stock, SasyaVahini mandates explicit supplier consent. Once you accept, the backend validates available inventory and locks it in the RESERVED state.")}</p>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-[#07875B] text-xs font-bold flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#07875B]" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Control bar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{t('proposals.activeProposals', 'Active Procurement Proposals')}</h3>
          <p className="text-xs text-slate-500">Review buyer purchase proposals matching your registered harvest inventory.</p>
        </div>
        <div className="flex items-center gap-2">
          <VoiceAssistant guideType="consent" />
          <button
            onClick={fetchProposals}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('proposals.refreshProposals', 'Refresh Proposals')}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-medium bg-white rounded-3xl border border-slate-200">
          Loading allocation proposals from matching engine...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600 text-xs font-medium bg-rose-50 rounded-2xl border border-rose-200">
          {error}
        </div>
      ) : proposals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">{t('proposals.noPendingProposals', 'No Pending Allocation Proposals')}</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{t('proposals.noPendingDesc', 'When institutional buyers post procurement requirements matching your produce listings, proposed allocations will appear here for your explicit consent.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {proposals.map((prop) => {
            const isReserved = prop.status === 'RESERVED';
            const lotValue = prop.proposedQuantityKg * prop.offeredPricePerKg;
            const priceDiff = prop.offeredPricePerKg - prop.farmerAskingPrice;

            return (
              <div
                key={prop.id}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  isReserved
                    ? 'border-blue-200 bg-blue-50/20'
                    : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Buyer & Crop Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-base">{prop.cropName}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md border border-slate-200">
                        Req #{prop.requirementId ? prop.requirementId.slice(0, 8) : '26033'}
                      </span>
                      {isReserved ? (
                        <span className="sv-badge-reserved">
                          ✓ Consent Granted • Inventory Reserved
                        </span>
                      ) : (
                        <span className="sv-badge-proposed">
                          Pending Farmer Consent
                        </span>
                      )}
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 font-extrabold px-2 py-0.5 rounded-full">
                        {prop.matchScore}% Match Score
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {prop.buyerName} ({prop.buyerType})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {prop.deliveryLocation} ({prop.distanceKm} km away)
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Delivery By: <strong>{prop.requiredByDate}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Middle: Commercial Figures */}
                  <div className="flex items-center gap-6 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">Proposed Lot</span>
                      <span className="font-black text-slate-900 text-sm">{prop.proposedQuantityKg.toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">Offered Price</span>
                      <span className="font-black text-[#07875B] text-sm">₹{prop.offeredPricePerKg}/kg</span>
                      {priceDiff >= 0 ? (
                        <span className="text-[10px] text-[#07875B] block font-bold">+₹{priceDiff}/kg vs asking</span>
                      ) : (
                        <span className="text-[10px] text-amber-600 block font-bold">-₹{Math.abs(priceDiff)}/kg vs asking</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">Estimated Gross</span>
                      <span className="font-black text-slate-900 text-sm">₹{lotValue.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Right: Explicit Consent Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    {isReserved ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-xl border border-blue-200">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        Allocated & Reserved
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => openConfirmation('REJECT', prop)}
                          disabled={processingId === prop.id}
                          className="px-3.5 py-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => openConfirmation('ACCEPT', prop)}
                          disabled={processingId === prop.id}
                          className="px-4 py-2 text-xs font-extrabold text-white bg-[#07875B] hover:bg-[#056b48] rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105"
                        >
                          <Check className="w-4 h-4" />
                          Accept Allocation
                        </button>
                      </>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.proposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  confirmModal.action === 'ACCEPT'
                    ? 'bg-emerald-100 text-[#07875B]'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {confirmModal.action === 'ACCEPT' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  {confirmModal.action === 'ACCEPT' ? 'Confirm Allocation Acceptance' : 'Decline Allocation Proposal'}
                </h4>
                <p className="text-xs text-slate-500">
                  {confirmModal.proposal.cropName} • {confirmModal.proposal.proposedQuantityKg.toLocaleString()} kg @ ₹{confirmModal.proposal.offeredPricePerKg}/kg
                </p>
              </div>
            </div>

            {confirmModal.action === 'ACCEPT' ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2 text-xs text-slate-700">
                <p className="font-bold text-[#07875B]">Safe Inventory Reservation Notice:</p>
                <p>
                  By confirming, you explicitly grant consent to commit <strong>{confirmModal.proposal.proposedQuantityKg} kg</strong> of {confirmModal.proposal.cropName}.
                </p>
                <p className="text-[11px] text-slate-500">
                  The backend will mark this produce listing as <strong>RESERVED</strong> to prevent double-booking. Dispatch instructions will be scheduled upon buyer route finalization.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-amber-900">
                  <p className="font-bold">Shortfall-Only Rematching Guarantee:</p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Declining this lot does not cancel other suppliers' valid accepted quantities. The system will calculate the exact shortfall ({confirmModal.proposal.proposedQuantityKg} kg) and rematch only that portion.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reason for declining</label>
                  <select
                    value={confirmModal.reason}
                    onChange={(e) => setConfirmModal({ ...confirmModal, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none"
                  >
                    <option value="Offered price is below farm gate expectation">Offered price is below farm gate expectation</option>
                    <option value="Harvest timing does not match required delivery date">Harvest timing does not match required delivery date</option>
                    <option value="Physical stock already committed or sold locally">Physical stock already committed or sold locally</option>
                    <option value="Pickup logistics location is unreachable">Pickup logistics location is unreachable</option>
                  </select>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal({ isOpen: false, action: null, proposal: null, reason: '' })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={executeConsentAction}
                className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-md ${
                  confirmModal.action === 'ACCEPT'
                    ? 'bg-[#07875B] hover:bg-[#056b48]'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmModal.action === 'ACCEPT' ? 'Confirm & Reserve Stock' : 'Confirm Decline'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AllocationConsentSection;
