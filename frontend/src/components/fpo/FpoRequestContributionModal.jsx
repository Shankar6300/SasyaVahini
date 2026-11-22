import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  X as CloseIcon, Send, AlertCircle, CheckCircle2,
  Wheat, Info, Clock, DollarSign
} from 'lucide-react';

const FpoRequestContributionModal = ({
  isOpen,
  onClose,
  selectedListings = [],
  onRequestSent
}) => {
  const { t } = useTranslation();

  // State mapping listingId => { requestedQtyKg, offeredPricePerKg, notes }
  const [quantities, setQuantities] = useState(() => {
    const initial = {};
    selectedListings.forEach((l) => {
      initial[l.id] = {
        requestedQtyKg: l.availableQuantityKg || (l.totalQuantityKg - l.reservedQuantityKg - l.committedQuantityKg) || 0,
        offeredPricePerKg: l.askingPricePerKg || 0,
        notes: ''
      };
    });
    return initial;
  });

  const [purpose, setPurpose] = useState('');
  const [expiryHours, setExpiryHours] = useState(48);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || selectedListings.length === 0) return null;

  const handleQtyChange = (listingId, val) => {
    setQuantities((prev) => ({
      ...prev,
      [listingId]: {
        ...prev[listingId],
        requestedQtyKg: parseFloat(val) || 0
      }
    }));
  };

  const handlePriceChange = (listingId, val) => {
    setQuantities((prev) => ({
      ...prev,
      [listingId]: {
        ...prev[listingId],
        offeredPricePerKg: parseFloat(val) || 0
      }
    }));
  };

  const handleNotesChange = (listingId, val) => {
    setQuantities((prev) => ({
      ...prev,
      [listingId]: {
        ...prev[listingId],
        notes: val
      }
    }));
  };

  // Calculate totals
  const totalRequestedKg = selectedListings.reduce((sum, l) => {
    const q = quantities[l.id]?.requestedQtyKg || 0;
    return sum + q;
  }, 0);

  const totalEstimatedCost = selectedListings.reduce((sum, l) => {
    const q = quantities[l.id]?.requestedQtyKg || 0;
    const p = quantities[l.id]?.offeredPricePerKg || l.askingPricePerKg || 0;
    return sum + (q * p);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate quantities
    for (const l of selectedListings) {
      const q = quantities[l.id]?.requestedQtyKg || 0;
      const avail = l.availableQuantityKg || 0;
      if (q <= 0) {
        setError(t('fpo.invalidQtyZero', `Quantity for ${l.cropName} (${l.farmer?.name}) must be greater than 0.`));
        return;
      }
      if (q > avail) {
        setError(t('fpo.invalidQtyExceeds', `Requested quantity (${q} kg) exceeds available stock (${avail} kg) for ${l.cropName}.`));
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        requests: selectedListings.map((l) => ({
          listingId: l.id,
          requestedQtyKg: quantities[l.id]?.requestedQtyKg,
          offeredPricePerKg: quantities[l.id]?.offeredPricePerKg || l.askingPricePerKg,
          notes: quantities[l.id]?.notes || purpose || undefined
        })),
        purpose: purpose || undefined,
        expiryHours: parseInt(expiryHours, 10) || 48
      };

      const res = await api.post('/fpo/contributions/request', payload);
      alert(res.data?.data?.message || t('fpo.contributionRequestsSuccess', 'Contribution requests dispatched to member farmers!'));
      if (onRequestSent) onRequestSent();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-scale-up my-8">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07875B] flex items-center justify-center font-bold border border-emerald-100">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {t('fpo.requestContributionTitle', 'Request Member Produce Contribution')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('fpo.requestContributionSubtitle', 'Send quantity contribution proposals to selected member farmers for collective aggregation.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Safety & Consent Notice */}
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">{t('fpo.consentNoticeTitle', 'Farmer Consent Requirement:')} </span>
            <span>{t('fpo.consentNoticeDesc', 'Stock is NOT automatically reserved. Farmers will receive in-app notifications and must accept (full or partial) to confirm reservations.')}</span>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">

          {/* Selected Produce Listings Table/Cards */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] block">
              {t('fpo.selectedLots', 'Selected Member Lots')} ({selectedListings.length})
            </span>

            {selectedListings.map((listing) => {
              const itemState = quantities[listing.id] || {};
              const avail = listing.availableQuantityKg || 0;

              return (
                <div
                  key={listing.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                    <div>
                      <span className="font-black text-slate-900 text-sm">{listing.cropName}</span>
                      <span className="text-slate-500 block text-[11px]">
                        Farmer: <strong>{listing.farmer?.name || 'Member Farmer'}</strong> • {listing.farmer?.village || 'Member Hub'}, {listing.farmer?.district || ''}
                      </span>
                    </div>
                    <div className="text-left sm:text-right text-[11px]">
                      <span className="text-slate-500 block">Available: <strong className="text-[#07875B]">{avail.toLocaleString()} kg</strong></span>
                      <span className="text-slate-400 text-[10px]">Asking: ₹{listing.askingPricePerKg}/kg</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('fpo.requestQtyLabel', 'Requested Quantity (kg)')} *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={avail}
                        step="any"
                        required
                        value={itemState.requestedQtyKg ?? ''}
                        onChange={(e) => handleQtyChange(listing.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#07875B] font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {t('fpo.offeredPriceLabel', 'Offered Rate (₹/kg)')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={itemState.offeredPricePerKg ?? ''}
                        onChange={(e) => handlePriceChange(listing.id, e.target.value)}
                        placeholder={`Asking: ₹${listing.askingPricePerKg}`}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#07875B] font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aggregation Purpose & Expiry Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {t('fpo.aggregationPurposeLabel', 'Purpose / Notes to Farmer (Optional)')}
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={t('fpo.aggregationPurposePlaceholder', 'E.g., Pooling for 10-ton institutional supermarket tender...')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#07875B] font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {t('fpo.responseExpiryLabel', 'Response Expiry')}
              </label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#07875B] font-bold text-slate-700 cursor-pointer"
              >
                <option value="24">24 Hours</option>
                <option value="48">48 Hours (Default)</option>
                <option value="72">72 Hours (3 Days)</option>
                <option value="168">7 Days</option>
              </select>
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">{t('fpo.totalQuantityToRequest', 'Total Quantity to Request')}:</span>
              <span className="text-base font-black text-[#07875B]">{totalRequestedKg.toLocaleString()} kg</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">{t('fpo.estimatedCommitmentValue', 'Estimated Total Value')}:</span>
              <span className="text-base font-black text-slate-900">₹{totalEstimatedCost.toLocaleString()}</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || totalRequestedKg <= 0}
              className="px-5 py-2 bg-[#07875B] hover:bg-[#056b48] text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {loading ? t('common.sending', 'Sending...') : t('fpo.sendRequestsBtn', `Send Requests (${selectedListings.length})`)}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default FpoRequestContributionModal;
