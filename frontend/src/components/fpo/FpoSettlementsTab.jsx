import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  DollarSign, TrendingUp, Package, ShieldCheck, CheckCircle2,
  Clock, FileText, AlertCircle, Search, Filter, RefreshCw,
  PlusCircle, CreditCard, ChevronDown, ChevronRight, User,
  Calendar, ArrowUpRight, Check, X as CloseIcon, Landmark,
  Receipt, Download, Info
} from 'lucide-react';

const FpoSettlementsTab = ({ fpoProfile }) => {
  const { t } = useTranslation();

  // Settlements list & metrics
  const [settlements, setSettlements] = useState([]);
  const [metrics, setMetrics] = useState({
    totalSettlementsCount: 0,
    totalGrossAmount: 0,
    totalFpoCommission: 0,
    totalNetPayable: 0,
    totalPaidAmount: 0,
    totalOutstanding: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [farmerFilter, setFarmerFilter] = useState('ALL');
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Orders awaiting settlement generation
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Generate Settlements Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedOrderForGen, setSelectedOrderForGen] = useState(null);
  const [customCommissionRate, setCustomCommissionRate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  // Record Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedSettlementForPay, setSelectedSettlementForPay] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('NEFT');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [payError, setPayError] = useState(null);

  // Selected settlement details modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeSettlementDetail, setActiveSettlementDetail] = useState(null);

  // Fetch Settlements
  const fetchSettlements = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (farmerFilter !== 'ALL') params.farmerId = farmerFilter;
      if (orderFilter !== 'ALL') params.orderId = orderFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/fpo/settlements', { params });
      const data = res.data?.data || res.data || {};
      setSettlements(Array.isArray(data.settlements) ? data.settlements : []);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error fetching FPO settlements:', err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Delivered Orders for Settlement Generation
  const fetchDeliveredOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get('/fpo/orders');
      const orders = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      // Orders that are DELIVERED or SETTLED
      const eligible = orders.filter(o => ['DELIVERED', 'SETTLED', 'IN_TRANSIT'].includes(o.status));
      setDeliveredOrders(eligible);
    } catch (err) {
      console.warn('Could not fetch delivered orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
    fetchDeliveredOrders();
  }, [statusFilter, farmerFilter, orderFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSettlements();
  };

  // Open Generate Modal
  const openGenerateModal = (order) => {
    setSelectedOrderForGen(order);
    setCustomCommissionRate(fpoProfile?.commissionRatePercent ? String(fpoProfile.commissionRatePercent) : '0');
    setGenError(null);
    setGenerateModalOpen(true);
  };

  // Submit Generation
  const handleGenerateSettlements = async (e) => {
    e.preventDefault();
    if (!selectedOrderForGen) return;
    setGenerating(true);
    setGenError(null);

    try {
      const payload = {};
      const rate = parseFloat(customCommissionRate);
      if (!isNaN(rate) && rate >= 0) {
        payload.commissionRatePercent = rate;
      }

      const res = await api.post(`/fpo/orders/${selectedOrderForGen.id}/settlements/generate`, payload);
      alert(res.data?.data?.message || 'Farmer settlements generated successfully!');
      setGenerateModalOpen(false);
      fetchSettlements();
      fetchDeliveredOrders();
    } catch (err) {
      console.error('Error generating settlements:', err);
      setGenError(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Open Payment Modal
  const openPaymentModal = (settlement) => {
    setSelectedSettlementForPay(settlement);
    setPaymentAmount(String(settlement.outstandingAmount || ''));
    setPaymentMode('NEFT');
    setTransactionRef('');
    setPaymentNotes('');
    setPayError(null);
    setPaymentModalOpen(true);
  };

  // Submit Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedSettlementForPay) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayError('Please enter a valid positive payment amount.');
      return;
    }

    if (amt > (selectedSettlementForPay.outstandingAmount + 0.01)) {
      setPayError(`Payment cannot exceed outstanding balance of ₹${selectedSettlementForPay.outstandingAmount.toFixed(2)}.`);
      return;
    }

    if (!transactionRef.trim()) {
      setPayError('Bank transaction reference / UTR / Cheque number is mandatory.');
      return;
    }

    setRecordingPayment(true);
    setPayError(null);

    try {
      const res = await api.post(`/fpo/settlements/${selectedSettlementForPay.id}/payments`, {
        amount: amt,
        paymentMode,
        transactionRef: transactionRef.trim(),
        notes: paymentNotes.trim() || undefined
      });

      alert(res.data?.data?.message || 'Payment recorded successfully!');
      setPaymentModalOpen(false);
      fetchSettlements();
    } catch (err) {
      console.error('Error recording payment:', err);
      setPayError(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setRecordingPayment(false);
    }
  };

  // View settlement details
  const handleViewDetail = (item) => {
    setActiveSettlementDetail(item);
    setDetailModalOpen(true);
  };

  // Unique farmers & orders for filter dropdowns
  const uniqueFarmers = Array.from(
    new Map(settlements.map(s => [s.farmerId, s.farmer?.user?.name || s.farmerName || 'Farmer'])).entries()
  );

  const uniqueOrders = Array.from(
    new Map(settlements.map(s => [s.orderId, s.order?.orderNumber || s.orderNumber || 'Order'])).entries()
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Quick Action */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
              {t('fpo.phase7Title', 'Phase 7 • Financial Governance')}
            </span>
            <span className="text-emerald-300 text-xs font-semibold">
              {t('fpo.decimalPrecisionBadge', 'Decimal Precision (2 DP) & Escrow Reconciled')}
            </span>
          </div>
          <h2 className="text-2xl font-black mt-1">
            {t('fpo.farmerSettlementsTitle', 'Farmer Settlements & Payment Management')}
          </h2>
          <p className="text-xs text-emerald-100/80 max-w-2xl mt-1 leading-relaxed">
            {t('fpo.farmerSettlementsDesc', 'Transparent order-wise financial accounting. Calculate farmer-wise payouts based on committed produce, audit FPO service commissions, and record bank-verified payment transactions without manual ledger discrepancies.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSettlements}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white border border-white/20 text-xs font-bold transition-all cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {deliveredOrders.length > 0 && (
            <button
              type="button"
              onClick={() => openGenerateModal(deliveredOrders[0])}
              className="px-4 py-3 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('fpo.generateSettlementBtn', 'Generate Order Settlements')}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t('fpo.totalGrossValue', 'Gross Farmer Value')}</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-slate-900">₹{metrics.totalGrossAmount.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-slate-400 font-medium">Across {metrics.totalSettlementsCount} farmer payouts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t('fpo.fpoCommission', 'FPO Service Fee')}</span>
            <Receipt className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-black text-sky-800">₹{metrics.totalFpoCommission.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-slate-400 font-medium">Explicitly configured rate</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t('fpo.netPayable', 'Net Farmer Payable')}</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-indigo-900">₹{metrics.totalNetPayable.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-slate-400 font-medium">After approved deductions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t('fpo.settledAmount', 'Disbursed / Paid')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700">₹{metrics.totalPaidAmount.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Bank transfer confirmed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t('fpo.outstandingBalance', 'Outstanding Due')}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700">₹{metrics.totalOutstanding.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-amber-600 font-semibold">Awaiting disbursement</span>
        </div>
      </div>

      {/* Orders awaiting settlement banner */}
      {deliveredOrders.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  {t('fpo.ordersReadyForSettlement', 'Bulk Orders Ready for Settlement Accounting')}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {t('fpo.ordersReadyDesc', 'Delivered orders with completed multi-farmer pickups. Generate farmer-wise payment splits.')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {deliveredOrders.slice(0, 3).map(order => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => openGenerateModal(order)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-amber-300 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>{order.orderNumber}</span>
                  <span className="text-[10px] text-slate-500">({order.totalQuantityKg} kg)</span>
                  <ArrowUpRight className="w-3 h-3 text-amber-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('fpo.searchSettlementsPlaceholder', 'Search by order #, farmer name, crop, or transaction UTR…')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">{t('fpo.allStatuses', 'All Statuses')}</option>
              <option value="PENDING">{t('status.PENDING', 'Pending')}</option>
              <option value="PARTIALLY_PAID">{t('status.PARTIALLY_PAID', 'Partially Paid')}</option>
              <option value="PAID">{t('status.PAID', 'Paid / Settled')}</option>
              <option value="DISPUTED">{t('status.DISPUTED', 'Disputed')}</option>
            </select>

            {/* Farmer Filter */}
            {uniqueFarmers.length > 0 && (
              <select
                value={farmerFilter}
                onChange={(e) => setFarmerFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[150px] truncate"
              >
                <option value="ALL">{t('fpo.allFarmers', 'All Farmers')}</option>
                {uniqueFarmers.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}

            {/* Date Range */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              title="End Date"
            />

            <button
              type="submit"
              className="px-4 py-2 bg-[#07875B] text-white font-bold rounded-xl text-xs hover:bg-[#066e4a] transition-all cursor-pointer"
            >
              {t('common.filter', 'Filter')}
            </button>
          </div>
        </form>
      </div>

      {/* Settlements Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {t('fpo.settlementLedger', 'Settlement Records Ledger')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('fpo.settlementLedgerDesc', 'Order-level farmer disbursements, agreed unit rates, deductions, and payment proof.')}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs">
            {settlements.length} {t('fpo.recordsFound', 'records')}
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
              {t('fpo.noSettlementsFound', 'No settlement records found.')}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {t('fpo.noSettlementsDesc', 'When bulk orders are delivered, generate settlements from the order details to initialize the payout ledger.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">{t('fpo.settlementNumber', 'Settlement #')}</th>
                  <th className="py-3.5 px-4">{t('fpo.orderRef', 'Order Ref')}</th>
                  <th className="py-3.5 px-4">{t('fpo.contributingFarmer', 'Contributing Farmer')}</th>
                  <th className="py-3.5 px-4">{t('fpo.cropLabel', 'Crop')}</th>
                  <th className="py-3.5 px-4 text-right">{t('fpo.qtyKg', 'Quantity (kg)')}</th>
                  <th className="py-3.5 px-4 text-right">{t('fpo.agreedRate', 'Agreed Rate')}</th>
                  <th className="py-3.5 px-4 text-right">{t('fpo.grossAmount', 'Gross Total')}</th>
                  <th className="py-3.5 px-4 text-right">{t('fpo.commission', 'FPO Fee')}</th>
                  <th className="py-3.5 px-4 text-right">{t('fpo.netPayable', 'Net Payable')}</th>
                  <th className="py-3.5 px-4 text-right">{t('fpo.paidAmount', 'Paid')}</th>
                  <th className="py-3.5 px-4 text-right">{t('fpo.outstanding', 'Due')}</th>
                  <th className="py-3.5 px-4 text-center">{t('common.status', 'Status')}</th>
                  <th className="py-3.5 px-4 text-center">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {settlements.map((item) => {
                  const statusStyles = {
                    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
                    PARTIALLY_PAID: 'bg-blue-100 text-blue-800 border-blue-300',
                    PAID: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    DISPUTED: 'bg-rose-100 text-rose-800 border-rose-300',
                    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-300'
                  };

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(item)}
                          className="hover:underline text-[#07875B] text-left cursor-pointer"
                        >
                          {item.settlementNumber}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.order?.orderNumber || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {item.farmer?.user?.name || 'Farmer'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.farmer?.village ? `${item.farmer.village}, ` : ''}{item.farmer?.district || ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {item.cropName}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                        {item.contributionQuantityKg.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600">
                        ₹{item.agreedPricePerKg.toFixed(2)}
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
                        <div className="flex items-center justify-center gap-1.5">
                          {item.status !== 'PAID' && item.outstandingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(item)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>{t('fpo.payBtn', 'Pay')}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleViewDetail(item)}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="View Audit Details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
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

      {/* MODAL 1: GENERATE ORDER SETTLEMENTS */}
      {generateModalOpen && selectedOrderForGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl animate-scale-up space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  {t('fpo.generateSettlementHeader', 'Settlement Engine')}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Generate Farmer Settlements
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order: <span className="font-mono font-bold text-slate-800">{selectedOrderForGen.orderNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGenerateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {genError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{genError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Quantity:</span>
                <span className="font-bold text-slate-800">{selectedOrderForGen.totalQuantityKg} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Buyer Order Total:</span>
                <span className="font-bold text-slate-900">₹{selectedOrderForGen.agreedPriceTotal?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Status:</span>
                <span className="font-bold text-emerald-700">{selectedOrderForGen.status}</span>
              </div>
            </div>

            <form onSubmit={handleGenerateSettlements} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  FPO Service / Management Fee (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={customCommissionRate}
                  onChange={(e) => setCustomCommissionRate(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Leave 0 for zero-deduction cooperative distribution. Non-zero rates must be explicitly authorized by cooperative bylaws.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  Generates an individual ledger record for each contributing farmer based on their committed lot quantity and agreed price. Duplicate generation requests are strictly idempotent.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Compute</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD PAYMENT */}
      {paymentModalOpen && selectedSettlementForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl animate-scale-up space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Payment Evidence
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Record Farmer Disbursement
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Beneficiary: <span className="font-bold text-slate-800">{selectedSettlementForPay.farmer?.user?.name || 'Farmer'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {payError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Settlement ID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedSettlementForPay.settlementNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Net Payable:</span>
                <span className="font-bold text-slate-900">₹{selectedSettlementForPay.netPayableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Disbursed:</span>
                <span className="font-bold text-emerald-700">₹{selectedSettlementForPay.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="font-bold text-slate-700">Current Outstanding:</span>
                <span className="font-black text-amber-700 text-sm">₹{selectedSettlementForPay.outstandingAmount.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount to Disburse (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={selectedSettlementForPay.outstandingAmount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="NEFT">NEFT Bank Transfer</option>
                    <option value="RTGS">RTGS Real-Time Transfer</option>
                    <option value="UPI">UPI Instant Payment</option>
                    <option value="BANK_TRANSFER">Direct Core Banking</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="CASH">Direct Cash (Voucher Verified)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Reference / UTR Number / Cheque # *
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR123456789012 or CHQ-409821"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Audit mandate: Duplicate transaction references are rejected to prevent double-crediting.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Voucher Memo (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batch payout via HDFC Corporate Banking"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-5 py-2 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {recordingPayment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording…</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment Proof</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT & PAYMENT HISTORY DETAILS */}
      {detailModalOpen && activeSettlementDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl animate-scale-up space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Settlement Details & Ledger Audit
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1 font-mono">
                  {activeSettlementDetail.settlementNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order: <span className="font-mono font-bold text-slate-800">{activeSettlementDetail.order?.orderNumber}</span> • Crop: <span className="font-bold text-slate-800">{activeSettlementDetail.cropName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Breakdown Table */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Contributing Farmer:</span>
                <span className="font-bold text-slate-900">{activeSettlementDetail.farmer?.user?.name || 'Farmer'} ({activeSettlementDetail.farmer?.user?.phone || '—'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contributed Quantity:</span>
                <span className="font-bold text-slate-900">{activeSettlementDetail.contributionQuantityKg} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agreed Unit Rate:</span>
                <span className="font-bold text-slate-900">₹{activeSettlementDetail.agreedPricePerKg.toFixed(2)}/kg</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="font-semibold text-slate-700">Gross Farmer Total:</span>
                <span className="font-bold text-slate-900">₹{activeSettlementDetail.grossPayableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">FPO Fee ({activeSettlementDetail.fpoCommissionRatePercent}%):</span>
                <span className="font-bold text-sky-700">-₹{activeSettlementDetail.fpoCommissionAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="font-black text-slate-900">Net Farmer Payable:</span>
                <span className="font-black text-indigo-900 text-sm">₹{activeSettlementDetail.netPayableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-emerald-700">Disbursed Amount:</span>
                <span className="font-bold text-emerald-700">₹{activeSettlementDetail.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="font-black text-amber-700">Outstanding Balance:</span>
                <span className="font-black text-amber-700 text-sm">₹{activeSettlementDetail.outstandingAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Records History */}
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                Payment Transactions & Verified Proof ({(activeSettlementDetail.paymentRecords || []).length})
              </h4>
              {(activeSettlementDetail.paymentRecords || []).length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  No payment transactions recorded for this settlement yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSettlementDetail.paymentRecords.map((rec) => (
                    <div key={rec.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{rec.transactionRef}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {rec.paymentMode}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(rec.paymentDate).toLocaleString('en-IN')} {rec.notes ? `• ${rec.notes}` : ''}
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
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
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

export default FpoSettlementsTab;
