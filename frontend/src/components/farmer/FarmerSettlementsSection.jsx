import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  DollarSign, TrendingUp, Package, ShieldCheck, CheckCircle2,
  Clock, FileText, AlertCircle, Search, Filter, RefreshCw,
  CreditCard, ChevronRight, Building, Calendar, ArrowUpRight,
  Receipt, Landmark, Info, X as CloseIcon, Eye
} from 'lucide-react';

const FarmerSettlementsSection = () => {
  const { t } = useTranslation();

  const [settlements, setSettlements] = useState([]);
  const [summary, setSummary] = useState({
    totalSettlements: 0,
    totalGrossEarnings: 0,
    totalCommissionDeductions: 0,
    totalNetPayable: 0,
    totalSettledProceeds: 0,
    totalPendingProceeds: 0,
    paidCount: 0,
    partiallyPaidCount: 0,
    pendingCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Payment Proof Modal
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);

  const fetchMySettlements = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/farmers/settlements', { params });
      const data = res.data?.data || res.data || {};
      setSettlements(Array.isArray(data.settlements) ? data.settlements : []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching farmer settlements:', err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySettlements();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMySettlements();
  };

  const handleViewProof = (item) => {
    setSelectedSettlement(item);
    setProofModalOpen(true);
  };

  const statusStyles = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-800 border-blue-300',
    PAID: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    DISPUTED: 'bg-rose-100 text-rose-800 border-rose-300',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-300'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
              {t('farmer.phase7Badge', 'Direct Farmer Settlements')}
            </span>
            <span className="text-emerald-300 text-xs font-semibold">
              {t('farmer.auditedEscrowBadge', 'Transparent Unit Accounting & Bank UTR Proof')}
            </span>
          </div>
          <h2 className="text-2xl font-black mt-1">
            {t('farmer.bulkOrderSettlementsTitle', 'FPO Bulk Order Settlements & Payouts')}
          </h2>
          <p className="text-xs text-emerald-100/80 max-w-2xl mt-1 leading-relaxed">
            {t('farmer.bulkOrderSettlementsDesc', 'Direct financial accounting for your contributed produce in FPO bulk contracts. Review individual lot quantities, agreed purchase rates, authorized cooperative service fees, and bank disbursement transaction references.')}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMySettlements}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white border border-white/20 text-xs font-bold transition-all self-start md:self-auto cursor-pointer"
          title="Refresh Settlements"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('farmer.disbursedBankProceeds', 'Disbursed To Bank')}
            </span>
            <h3 className="text-2xl font-black text-emerald-700 leading-tight">
              ₹{summary.totalSettledProceeds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {summary.paidCount} {t('farmer.paidSettlements', 'settlements cleared')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('farmer.pendingDisbursement', 'Pending Disbursement')}
            </span>
            <h3 className="text-2xl font-black text-amber-800 leading-tight">
              ₹{summary.totalPendingProceeds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> {summary.pendingCount + summary.partiallyPaidCount} {t('farmer.pendingDisbursements', 'pending')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200 flex-shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('farmer.netPayableTotal', 'Net Approved Value')}
            </span>
            <h3 className="text-2xl font-black text-indigo-900 leading-tight">
              ₹{summary.totalNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {summary.totalSettlements} {t('farmer.settlementRecords', 'settlement records')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200 flex-shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('farmer.fpoServiceFees', 'Cooperative Deductions')}
            </span>
            <h3 className="text-2xl font-black text-sky-800 leading-tight">
              ₹{summary.totalCommissionDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {t('farmer.fpoServiceDesc', 'Transparent FPO fees')}
            </span>
          </div>
        </div>
      </div>

      {/* Governance Notice */}
      <div className="bg-[#E8F5E9] border border-emerald-300 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-700 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-[#07875B] flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-extrabold text-slate-900">
            {t('farmer.fairTradeSettlementTitle', 'SasyaVahini Fair-Trade Settlement Protocol')}
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
            {t('farmer.fairTradeSettlementDesc', 'Every rupee is accounted for directly from the institutional buyer contract. Your payouts are computed from your verified produce contributions, unit rates agreed at aggregation, and bank transfer UTR proofs recorded by your cooperative management.')}
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('farmer.searchSettlementPlaceholder', 'Search by settlement #, order #, crop, or FPO…')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">{t('farmer.allStatuses', 'All Statuses')}</option>
              <option value="PENDING">{t('status.PENDING', 'Pending')}</option>
              <option value="PARTIALLY_PAID">{t('status.PARTIALLY_PAID', 'Partially Paid')}</option>
              <option value="PAID">{t('status.PAID', 'Paid / Settled')}</option>
              <option value="DISPUTED">{t('status.DISPUTED', 'Disputed')}</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-[#07875B] text-white font-bold rounded-xl text-xs hover:bg-[#066e4a] transition-all cursor-pointer"
            >
              {t('common.filter', 'Filter')}
            </button>
          </div>
        </form>
      </div>

      {/* Settlements Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t('farmer.settlementHistory', 'Settlement Records & Disbursement Ledger')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('farmer.settlementHistoryDesc', 'Detailed statement of bulk order produce contributions and received bank payments.')}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs">
            {settlements.length} {t('farmer.records', 'records')}
          </span>
        </div>

        {error && (
          <div className="m-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {settlements.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {t('farmer.noSettlementRecordsYet', 'No settlement records found.')}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {t('farmer.noSettlementsYetDesc', 'Once your FPO delivers a bulk order and generates settlements, your individual payment statement will appear here with bank transfer references.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">{t('farmer.settlementNum', 'Settlement #')}</th>
                  <th className="py-3.5 px-4">{t('farmer.fpoCooperative', 'FPO Cooperative')}</th>
                  <th className="py-3.5 px-4">{t('farmer.orderNum', 'Order Ref')}</th>
                  <th className="py-3.5 px-4">{t('farmer.crop', 'Crop')}</th>
                  <th className="py-3.5 px-4 text-right">{t('farmer.qtyKg', 'Quantity')}</th>
                  <th className="py-3.5 px-4 text-right">{t('farmer.agreedRate', 'Agreed Rate')}</th>
                  <th className="py-3.5 px-4 text-right">{t('farmer.grossTotal', 'Gross Value')}</th>
                  <th className="py-3.5 px-4 text-right">{t('farmer.fpoFee', 'FPO Fee')}</th>
                  <th className="py-3.5 px-4 text-right">{t('farmer.netPayable', 'Net Payable')}</th>
                  <th className="py-3.5 px-4 text-right">{t('farmer.paid', 'Paid')}</th>
                  <th className="py-3.5 px-4 text-right">{t('farmer.due', 'Due')}</th>
                  <th className="py-3.5 px-4 text-center">{t('common.status', 'Status')}</th>
                  <th className="py-3.5 px-4 text-center">{t('farmer.bankProof', 'Bank Proof')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {settlements.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {item.settlementNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">
                        {item.fpo?.fpoName || 'FPO Cooperative'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.fpo?.district}, {item.fpo?.state}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {item.order?.orderNumber || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {item.cropName}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                      {item.contributionQuantityKg.toLocaleString('en-IN')} kg
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      ₹{item.agreedPricePerKg.toFixed(2)}/kg
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{item.grossPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500">
                      {item.fpoCommissionAmount > 0 ? (
                        <span className="text-sky-700 font-semibold">
                          ₹{item.fpoCommissionAmount.toFixed(2)}
                          <span className="text-[10px] text-slate-400 block">({item.fpoCommissionRatePercent}%)</span>
                        </span>
                      ) : (
                        '₹0.00'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-indigo-900">
                      ₹{item.netPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                      ₹{item.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-amber-700">
                      ₹{item.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${statusStyles[item.status] || statusStyles.PENDING}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {(item.paymentRecords || []).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleViewProof(item)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] shadow-2xs flex items-center gap-1 mx-auto transition-all cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>{item.paymentRecords.length} {t('farmer.utrProof', 'Proof')}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          {t('farmer.noDisbursementYet', 'Pending transfer')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: PAYMENT PROOF & UTR RECORDS */}
      {proofModalOpen && selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl animate-scale-up space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Bank Transfer Receipts & Evidence
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1 font-mono">
                  {selectedSettlement.settlementNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  FPO: <span className="font-bold text-slate-800">{selectedSettlement.fpo?.fpoName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProofModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Produce:</span>
                <span className="font-bold text-slate-900">{selectedSettlement.cropName} ({selectedSettlement.contributionQuantityKg} kg)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Net Approved Payable:</span>
                <span className="font-bold text-indigo-900">₹{selectedSettlement.netPayableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Disbursed to date:</span>
                <span className="font-bold text-emerald-700">₹{selectedSettlement.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="font-semibold text-slate-700">Remaining Balance:</span>
                <span className="font-black text-amber-700">₹{selectedSettlement.outstandingAmount.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                Bank Disbursement Transactions ({(selectedSettlement.paymentRecords || []).length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(selectedSettlement.paymentRecords || []).map((rec) => (
                  <div key={rec.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{rec.transactionRef}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {rec.paymentMode}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(rec.paymentDate).toLocaleString('en-IN')}
                        {rec.notes ? ` • Note: ${rec.notes}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-700 text-sm">
                        ₹{rec.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProofModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerSettlementsSection;
