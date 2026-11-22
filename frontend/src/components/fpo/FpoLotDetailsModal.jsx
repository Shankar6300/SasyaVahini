import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Package, X, UserCheck, MapPin, Calendar, Clock, DollarSign,
  ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, ChevronRight,
  SlidersHorizontal, History, Tag, Building
} from 'lucide-react';

const FpoLotDetailsModal = ({ isOpen, onClose, lotId, onLotUpdated }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [lotData, setLotData] = useState(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Status transition state
  const [selectedStatus, setSelectedStatus] = useState('');

  // Allocation modal state
  const [allocating, setAllocating] = useState(false);
  const [allocQty, setAllocQty] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [allocNotes, setAllocNotes] = useState('');

  const fetchLotDetails = async () => {
    if (!lotId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/fpo/lots/${lotId}`);
      const data = res.data?.data?.lot || res.data?.data;
      setLotData(data);
      setSelectedStatus(data?.status || 'AGGREGATED');
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && lotId) {
      fetchLotDetails();
      setAllocating(false);
    }
  }, [isOpen, lotId]);

  if (!isOpen) return null;

  const handleUpdateStatus = async () => {
    if (!selectedStatus || selectedStatus === lotData.status) return;
    setActionLoading(true);
    try {
      const res = await api.patch(`/fpo/lots/${lotId}/status`, { status: selectedStatus });
      alert(res.data?.data?.message || t('fpo.statusUpdatedSuccess', 'Lot status updated.'));
      fetchLotDetails();
      if (onLotUpdated) onLotUpdated();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelLot = async () => {
    if (!window.confirm(t('fpo.confirmCancelLot', `Are you sure you want to cancel produce lot ${lotData.lotNumber}? Contributed quantities will be safely restored back to the available pool.`))) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/fpo/lots/${lotId}/cancel`);
      alert(res.data?.data?.message || t('fpo.lotCancelledSuccess', 'Lot cancelled and stock released.'));
      fetchLotDetails();
      if (onLotUpdated) onLotUpdated();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    const qty = parseFloat(allocQty);
    if (!qty || qty <= 0 || qty > lotData.availableQuantityKg) {
      alert(t('fpo.validAllocQty', `Please enter a quantity between 1 and ${lotData.availableQuantityKg} kg.`));
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/fpo/lots/${lotId}/allocate`, {
        allocatedQtyKg: qty,
        buyerName: buyerName.trim() || undefined,
        notes: allocNotes.trim() || undefined
      });
      alert(res.data?.data?.message || t('fpo.allocatedSuccess', `Successfully allocated ${qty} kg!`));
      setAllocating(false);
      setAllocQty('');
      fetchLotDetails();
      if (onLotUpdated) onLotUpdated();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const statusColors = {
    DRAFT: 'bg-slate-100 text-slate-800 border-slate-300',
    AGGREGATED: 'bg-blue-100 text-blue-900 border-blue-300',
    TESTED: 'bg-purple-100 text-purple-900 border-purple-300',
    READY_FOR_SALE: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    ALLOCATED: 'bg-amber-100 text-amber-900 border-amber-300',
    FULFILLED: 'bg-teal-100 text-teal-900 border-teal-300',
    CANCELLED: 'bg-rose-100 text-rose-800 border-rose-300'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 animate-scale-up">

        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusColors[lotData?.status] || 'bg-slate-100'}`}>
                {lotData?.status}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {lotData?.lotNumber}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              {lotData?.cropName} {lotData?.variety ? `(${lotData.variety})` : ''}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">{t('common.loading', 'Loading lot details…')}</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        ) : lotData ? (
          <div className="space-y-6">

            {/* Core Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">{t('fpo.totalQuantity', 'Total Volume')}</span>
                <span className="text-base font-black text-slate-900">{lotData.totalQuantityKg.toLocaleString()} kg</span>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 block uppercase font-bold">{t('fpo.availableStock', 'Available Stock')}</span>
                <span className="text-base font-black text-emerald-800">{lotData.availableQuantityKg.toLocaleString()} kg</span>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-700 block uppercase font-bold">{t('fpo.allocatedQuantity', 'Allocated / Sold')}</span>
                <span className="text-base font-black text-amber-900">{lotData.allocatedQuantityKg.toLocaleString()} kg</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">{t('fpo.weightedRate', 'Fair Weighted Rate')}</span>
                <span className="text-base font-black text-slate-900">₹{lotData.weightedAvgPricePerKg}/kg</span>
              </div>
            </div>

            {/* Lot Information Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-medium">{t('fpo.storageLocation', 'Storage Location')}:</span>
                <p className="font-bold text-slate-800 mt-0.5">{lotData.storageLocation || 'Central FPO Warehouse'}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">{t('fpo.qualityGrade', 'Quality Grade')}:</span>
                <p className="font-bold text-slate-800 mt-0.5">{lotData.qualityGrade}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">{t('fpo.totalValuation', 'Total Consignment Value')}:</span>
                <p className="font-bold text-emerald-700 mt-0.5">
                  ₹{Math.round(lotData.totalQuantityKg * lotData.weightedAvgPricePerKg).toLocaleString()}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">{t('fpo.createdAt', 'Consolidation Date')}:</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {new Date(lotData.createdAt).toLocaleDateString()} {new Date(lotData.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {lotData.notes && (
                <div className="sm:col-span-2 pt-2 border-t border-slate-200 text-slate-600">
                  <span className="text-slate-400 font-medium">{t('fpo.notes', 'Notes')}:</span>
                  <p className="mt-0.5">{lotData.notes}</p>
                </div>
              )}
            </div>

            {/* Itemized Contributing Farmers Breakdown */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
                <span>{t('fpo.contributingFarmersTraceability', 'Contributing Smallholders & Traceability')} ({lotData.contributions?.length || 0})</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {t('fpo.farmerEquityGuarantee', '100% Volume-Weighted Equity Guaranteed')}
                </span>
              </h3>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="p-3">{t('fpo.farmer', 'Farmer Member')}</th>
                      <th className="p-3">{t('fpo.village', 'Village / Origin')}</th>
                      <th className="p-3 text-right">{t('fpo.volume', 'Volume')}</th>
                      <th className="p-3 text-right">{t('fpo.share', 'Lot Share')}</th>
                      <th className="p-3 text-right">{t('fpo.rate', 'Agreed Rate')}</th>
                      <th className="p-3 text-right">{t('fpo.payout', 'Farmer Payout')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {lotData.contributions?.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-bold text-slate-900">{c.farmerName}</td>
                        <td className="p-3 text-slate-500">{c.farmerVillage}</td>
                        <td className="p-3 text-right font-black text-slate-800">{c.allocatedQtyKg.toLocaleString()} kg</td>
                        <td className="p-3 text-right font-mono text-emerald-700 font-bold">{c.sharePercentage}%</td>
                        <td className="p-3 text-right font-bold text-slate-800">₹{c.agreedPricePerKg}/kg</td>
                        <td className="p-3 text-right font-black text-emerald-800">₹{c.payoutAmount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Trail Timeline */}
            {lotData.auditLogs?.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] uppercase font-bold text-slate-400 block">
                  {t('fpo.auditHistory', 'Traceability & Action Audit Trail')}
                </span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto space-y-1.5 text-xs">
                  {lotData.auditLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center text-[11px] text-slate-600">
                      <span className="font-bold text-slate-800">{log.action}: <span className="font-normal">{log.metadata?.notes || log.metadata?.toStatus || 'Updated'}</span></span>
                      <span className="text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allocation Form (Conditional) */}
            {allocating && (
              <form onSubmit={handleAllocate} className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-amber-900 text-xs uppercase tracking-wider">
                    {t('fpo.allocateToBuyerTitle', 'Allocate Quantity to Buyer Contract / Order')}
                  </h4>
                  <button type="button" onClick={() => setAllocating(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {t('fpo.quantityToAllocate', 'Quantity to Allocate (kg)')} * (Max: {lotData.availableQuantityKg} kg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max={lotData.availableQuantityKg}
                      value={allocQty}
                      onChange={(e) => setAllocQty(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {t('fpo.buyerName', 'Buyer / Institution Name')}
                    </label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="e.g. Reliance Fresh"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAllocating(false)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs"
                  >
                    {t('fpo.confirmAllocation', 'Confirm Allocation')}
                  </button>
                </div>
              </form>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              {/* Status Transition Control */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">{t('fpo.statusTransition', 'Transition Status')}:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={actionLoading || ['CANCELLED', 'FULFILLED'].includes(lotData.status)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="AGGREGATED">AGGREGATED</option>
                  <option value="TESTED">TESTED</option>
                  <option value="READY_FOR_SALE">READY_FOR_SALE</option>
                  <option value="ALLOCATED">ALLOCATED</option>
                  <option value="FULFILLED">FULFILLED</option>
                </select>

                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={actionLoading || selectedStatus === lotData.status || ['CANCELLED', 'FULFILLED'].includes(lotData.status)}
                  className="px-3 py-1.5 bg-[#07875B] hover:bg-[#066e4a] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {t('common.apply', 'Apply')}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {lotData.status !== 'CANCELLED' && lotData.status !== 'FULFILLED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setAllocating(true)}
                      disabled={lotData.availableQuantityKg <= 0 || allocating}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      {t('fpo.allocateToContract', 'Allocate to Contract…')}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelLot}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      {t('fpo.cancelLotBtn', 'Cancel Lot & Release Stock')}
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
};

export default FpoLotDetailsModal;
