import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  X, AlertCircle, CheckCircle2, Package, ShieldCheck, DollarSign,
  Calendar, Clock, Truck, FileText, ChevronRight, Info, Layers, Check
} from 'lucide-react';

const FpoQuotationModal = ({ isOpen, onClose, requirementId, onQuotationSubmitted }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [selectedLotId, setSelectedLotId] = useState('');
  const [offeredQuantityKg, setOfferedQuantityKg] = useState('');
  const [offeredPricePerKg, setOfferedPricePerKg] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [validityHours, setValidityHours] = useState(48);
  const [notes, setNotes] = useState('');

  // Fetch requirement assessment & compatible lots
  useEffect(() => {
    if (!isOpen || !requirementId) return;

    setError('');
    setSuccessMsg('');
    setLoading(true);

    api.get(`/fpo/requirements/${requirementId}`)
      .then((res) => {
        const payload = res.data?.data || res.data || {};
        setData(payload);

        const req = payload.requirement;
        const lots = payload.confirmedLots || [];

        // Pre-select first compatible lot if available
        if (lots.length > 0) {
          const firstLot = lots[0];
          setSelectedLotId(firstLot.id);
          const defaultQty = Math.min(firstLot.availableQuantityKg, req?.quantityKg || 0);
          setOfferedQuantityKg(defaultQty > 0 ? String(defaultQty) : '');
          setOfferedPricePerKg(firstLot.weightedAvgPricePerKg || firstLot.basePricePerKg || '');
        } else {
          setSelectedLotId('');
          setOfferedQuantityKg(req?.quantityKg ? String(req.quantityKg) : '');
          setOfferedPricePerKg(req?.maxPricePerKg ? String(req.maxPricePerKg) : '');
        }

        // Default delivery date: 3 days before requiredByDate or 3 days from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 3);
        setEstimatedDeliveryDate(defaultDate.toISOString().slice(0, 10));
      })
      .catch((err) => {
        console.warn('Error fetching requirement assessment:', err);
        setError(err.response?.data?.error?.message || 'Failed to load requirement details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, requirementId]);

  if (!isOpen) return null;

  const requirement = data?.requirement;
  const feasibility = data?.feasibility;
  const confirmedLots = data?.confirmedLots || [];
  const memberListings = data?.indicativeMemberListings || [];

  const selectedLot = confirmedLots.find((l) => l.id === selectedLotId);

  // Auto-calculated total
  const qtyNum = parseFloat(offeredQuantityKg) || 0;
  const priceNum = parseFloat(offeredPricePerKg) || 0;
  const totalAmount = Math.round(qtyNum * priceNum * 100) / 100;

  // Validation
  const isOverAllocated = selectedLot && qtyNum > selectedLot.availableQuantityKg;

  const handleLotSelect = (lot) => {
    setSelectedLotId(lot.id);
    const maxPoss = Math.min(lot.availableQuantityKg, requirement?.quantityKg || lot.availableQuantityKg);
    setOfferedQuantityKg(String(maxPoss));
    setOfferedPricePerKg(String(lot.weightedAvgPricePerKg || lot.basePricePerKg || ''));
  };

  const handleIndicativeSelect = () => {
    setSelectedLotId('');
    setOfferedQuantityKg(String(requirement?.quantityKg || ''));
    setOfferedPricePerKg(String(requirement?.maxPricePerKg || ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (qtyNum <= 0) {
      setError(t('quotations.errorValidQty', 'Please enter a valid offered quantity greater than 0 kg.'));
      return;
    }

    if (priceNum <= 0) {
      setError(t('quotations.errorValidPrice', 'Please enter a valid offered price per kg greater than ₹0.'));
      return;
    }

    if (!estimatedDeliveryDate) {
      setError(t('quotations.errorDeliveryDate', 'Please specify an estimated delivery date.'));
      return;
    }

    if (isOverAllocated) {
      setError(
        t('quotations.errorOverAlloc', `Offered quantity exceeds available lot balance (${selectedLot.availableQuantityKg.toLocaleString()} kg).`)
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        requirementId,
        produceLotId: selectedLotId || null,
        offeredQuantityKg: qtyNum,
        offeredPricePerKg: priceNum,
        estimatedDeliveryDate: new Date(estimatedDeliveryDate).toISOString(),
        validityHours: Number(validityHours) || 48,
        notes: notes ? notes.trim() : null
      };

      const res = await api.post('/fpo/quotations', payload);
      setSuccessMsg(res.data?.message || t('quotations.submittedSuccess', 'Quotation submitted successfully!'));

      setTimeout(() => {
        if (onQuotationSubmitted) onQuotationSubmitted(res.data?.data?.quotation);
        onClose();
      }, 1200);
    } catch (err) {
      console.warn('Quotation submission error:', err);
      setError(err.response?.data?.error?.message || t('quotations.submitFailed', 'Failed to submit quotation.'));
    } finally {
      setSubmitting(false);
    }
  };

  const matchBadges = {
    FULL_MATCH: { label: t('quotations.badgeFull', 'Full Lot Match'), color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    PARTIAL_MATCH: { label: t('quotations.badgePartial', 'Partial Match'), color: 'bg-sky-100 text-sky-800 border-sky-300' },
    INDICATIVE_ONLY: { label: t('quotations.badgeIndicative', 'Pipeline / Member Supply'), color: 'bg-purple-100 text-purple-800 border-purple-300' },
    INSUFFICIENT_STOCK: { label: t('quotations.badgeInsufficient', 'Stock Insufficient'), color: 'bg-amber-100 text-amber-800 border-amber-300' }
  };

  const badgeInfo = matchBadges[feasibility?.matchBadge] || matchBadges.INSUFFICIENT_STOCK;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-[#07875B] to-emerald-800 p-6 text-white flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${badgeInfo.color}`}>
                {badgeInfo.label}
              </span>
              <span className="text-emerald-200 text-xs font-semibold">
                {t('quotations.institutionalProcurement', 'Institutional Bulk Demand')}
              </span>
            </div>
            <h2 className="text-xl font-black text-white">
              {t('quotations.prepareQuotationTitle', 'Prepare Commercial Quotation')}
            </h2>
            <p className="text-emerald-100 text-xs">
              {requirement?.cropName} • {requirement?.quantityKg?.toLocaleString()} kg {t('quotations.demanded', 'demanded by')} {requirement?.buyer?.organizationName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold">{t('quotations.assessingStock', 'Analyzing inventory feasibility & compatible lots...')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6 max-h-[80vh] overflow-y-auto">

            {/* Error & Success Toasts */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Section 1: Institutional Requirement Details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">{t('quotations.buyer', 'Buyer')}</p>
                <p className="font-extrabold text-slate-900 truncate">{requirement?.buyer?.organizationName}</p>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold">
                  {requirement?.buyer?.businessType}
                </span>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">{t('quotations.targetRate', 'Target Price')}</p>
                <p className="font-black text-emerald-700 text-sm">₹{requirement?.maxPricePerKg}/kg</p>
                <span className="text-[10px] text-slate-500">{t('quotations.maxBudget', 'Max Budget')}</span>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">{t('quotations.deliveryDestination', 'Delivery Depot')}</p>
                <p className="font-bold text-slate-900 truncate">{requirement?.deliveryDistrict}, {requirement?.deliveryState}</p>
                <span className="text-[10px] text-slate-500">{requirement?.deliveryAddress?.slice(0, 20)}...</span>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">{t('quotations.requiredBy', 'Required By')}</p>
                <p className="font-extrabold text-slate-900">
                  {requirement?.requiredByDate ? new Date(requirement.requiredByDate).toLocaleDateString() : 'Immediate'}
                </p>
                <span className="text-[10px] text-amber-700 font-bold">
                  {feasibility?.daysUntilRequired > 0 ? `${feasibility.daysUntilRequired} days remaining` : 'Urgent Demand'}
                </span>
              </div>
            </div>

            {/* Section 2: Inventory Allocation Source (Confirmed Lot vs Pipeline) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#07875B]" />
                  {t('quotations.selectLot', '1. Select Inventory Allocation Source')}
                </label>
                <span className="text-[11px] text-slate-500">
                  {confirmedLots.length} {t('quotations.confirmedLotsAvail', 'confirmed lots')} • {memberListings.length} {t('quotations.memberFarmsAvail', 'member farms')}
                </span>
              </div>

              {confirmedLots.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">{t('quotations.noConfirmedLotWarning', 'No ready consolidated produce lots for this crop.')}</p>
                    <p className="text-slate-600 text-[11px]">
                      {t('quotations.canQuoteIndicative', `You can submit an Indicative Pipeline Quotation backed by ${feasibility?.indicativeMemberSupplyKg?.toLocaleString() || 0} kg from ${memberListings.length} active member farmers.`)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                  {confirmedLots.map((lot) => {
                    const isSelected = selectedLotId === lot.id;
                    return (
                      <div
                        key={lot.id}
                        onClick={() => handleLotSelect(lot)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50/70 border-[#07875B] shadow-sm ring-1 ring-[#07875B]'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-slate-900 text-xs">{lot.lotNumber}</span>
                            <span className="text-[10px] block text-slate-500 font-medium">
                              {lot.variety || 'Standard'} • {lot.qualityGrade}
                            </span>
                          </div>
                          {isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-[#07875B] text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                              {lot.status}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
                          <div>
                            <span className="text-slate-400 text-[10px]">{t('quotations.available', 'Available')}: </span>
                            <strong className="text-emerald-800 font-black">{lot.availableQuantityKg?.toLocaleString()} kg</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">{t('quotations.costBase', 'Cost')}: </span>
                            <strong className="text-slate-900 font-extrabold">₹{lot.weightedAvgPricePerKg || lot.basePricePerKg}/kg</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Indicative Supply Option */}
              {memberListings.length > 0 && (
                <button
                  type="button"
                  onClick={handleIndicativeSelect}
                  className={`w-full p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    selectedLotId === ''
                      ? 'bg-purple-50 border-purple-400 text-purple-900 ring-1 ring-purple-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>{t('quotations.quotePipelineSupply', 'Quote as Pipeline Supply (Consolidate from Member Farms on Order)')}</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    {feasibility?.indicativeMemberSupplyKg?.toLocaleString()} kg {t('quotations.inPipeline', 'in pipeline')}
                  </span>
                </button>
              )}
            </div>

            {/* Section 3: Commercial Offer Terms */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#07875B]" />
                {t('quotations.commercialOffer', '2. Commercial Quotation Terms')}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Offered Quantity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('quotations.offeredQuantity', 'Offered Quantity (kg)')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={offeredQuantityKg}
                    onChange={(e) => setOfferedQuantityKg(e.target.value)}
                    placeholder="e.g. 3000"
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                      isOverAllocated
                        ? 'border-rose-400 bg-rose-50/50 text-rose-900'
                        : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                    }`}
                  />
                  {selectedLot && (
                    <p className={`text-[10px] mt-1 ${isOverAllocated ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                      {t('quotations.maxAllocatable', 'Max allocatable from lot')}: {selectedLot.availableQuantityKg?.toLocaleString()} kg
                    </p>
                  )}
                </div>

                {/* Offered Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('quotations.offeredRatePerKg', 'Offered Rate (₹ / kg)')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={offeredPricePerKg}
                    onChange={(e) => setOfferedPricePerKg(e.target.value)}
                    placeholder="e.g. 30.5"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-bold outline-none transition-all"
                  />
                  {requirement?.maxPricePerKg > 0 && priceNum > 0 && (
                    <p className="text-[10px] mt-1 font-bold">
                      {priceNum <= requirement.maxPricePerKg ? (
                        <span className="text-emerald-600">
                          ✓ ₹{(requirement.maxPricePerKg - priceNum).toFixed(1)}/kg {t('quotations.belowTarget', 'below buyer target')}
                        </span>
                      ) : (
                        <span className="text-amber-600">
                          ⚠️ ₹{(priceNum - requirement.maxPricePerKg).toFixed(1)}/kg {t('quotations.aboveTarget', 'above buyer target')}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Total Quotation Value Banner */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    {t('quotations.totalQuotedValue', 'Total Quotation Value')}
                  </span>
                  <p className="text-2xl font-black text-[#07875B]">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{qtyNum.toLocaleString()} kg @ ₹{priceNum}/kg</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">{t('quotations.exColdStorage', 'Inclusive of packaging & grading')}</span>
                </div>
              </div>

              {/* Delivery Date & Validity Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('quotations.deliveryDate', 'Estimated Delivery Date')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('quotations.validityDuration', 'Offer Validity Duration')}
                  </label>
                  <select
                    value={validityHours}
                    onChange={(e) => setValidityHours(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-bold outline-none"
                  >
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={48}>48 Hours (2 Days) - Standard</option>
                    <option value={72}>72 Hours (3 Days)</option>
                    <option value={168}>7 Days (1 Week)</option>
                  </select>
                </div>
              </div>

              {/* Packaging / Delivery Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('quotations.packagingNotes', 'Packaging, Logistics & Quality Terms (Optional)')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('quotations.notesPlaceholder', 'e.g. Cleaned, graded in 20kg plastic crates. Transport arranged via SasyaVahini 2-tier logistics network.')}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || isOverAllocated || qtyNum <= 0 || priceNum <= 0}
                className="px-6 py-2.5 bg-[#07875B] hover:bg-[#066e4a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('quotations.submitting', 'Submitting Quotation...')}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>{t('quotations.submitQuotationBtn', 'Submit Official Quotation')}</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export default FpoQuotationModal;
