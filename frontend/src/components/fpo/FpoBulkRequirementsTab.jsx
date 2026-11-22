import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  ShoppingBag, Search, Filter, RefreshCw, Layers, CheckCircle2,
  Clock, AlertCircle, MapPin, Building, ChevronRight, SlidersHorizontal,
  DollarSign, Calendar, FileText, Send, XCircle, Info, ExternalLink,
  Package, Check, Truck, ArrowRight, ShieldCheck, Tag
} from 'lucide-react';
import FpoQuotationModal from './FpoQuotationModal';

const FpoBulkRequirementsTab = ({ fpoProfile, onNavigateToLots }) => {
  const { t } = useTranslation();

  // Sub-tabs: 'REQUIREMENTS' | 'QUOTATIONS'
  const [subTab, setSubTab] = useState('REQUIREMENTS');

  // Requirements State
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [requirements, setRequirements] = useState([]);
  const [reqSummary, setReqSummary] = useState(null);
  const [reqSearch, setReqSearch] = useState('');
  const [reqCropFilter, setReqCropFilter] = useState('ALL');
  const [reqMatchFilter, setReqMatchFilter] = useState('ALL');
  const [reqSortBy, setReqSortBy] = useState('urgency');

  // Quotations State
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [quoteSummary, setQuoteSummary] = useState(null);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRequirementId, setActiveRequirementId] = useState(null);

  // Withdraw Action State
  const [withdrawLoadingId, setWithdrawLoadingId] = useState(null);

  // Fetch Open Buyer Requirements with Feasibility Matching
  const fetchRequirements = async () => {
    setLoadingReqs(true);
    try {
      const params = new URLSearchParams();
      if (reqCropFilter !== 'ALL') params.append('crop', reqCropFilter);
      if (reqMatchFilter !== 'ALL') params.append('matchStatus', reqMatchFilter);
      if (reqSearch.trim()) params.append('search', reqSearch.trim());
      if (reqSortBy) params.append('sortBy', reqSortBy);

      const res = await api.get(`/fpo/requirements?${params.toString()}`);
      const data = res.data?.data || res.data || {};
      setRequirements(data.requirements || []);
      setReqSummary(data.summary || null);
    } catch (err) {
      console.warn('Error fetching bulk requirements:', err);
    } finally {
      setLoadingReqs(false);
    }
  };

  // Fetch FPO Quotations
  const fetchQuotations = async () => {
    setLoadingQuotes(true);
    try {
      const params = new URLSearchParams();
      if (quoteStatusFilter !== 'ALL') params.append('status', quoteStatusFilter);

      const res = await api.get(`/fpo/quotations?${params.toString()}`);
      const data = res.data?.data || res.data || {};
      setQuotations(data.quotations || []);
      setQuoteSummary(data.summary || null);
    } catch (err) {
      console.warn('Error fetching quotations:', err);
    } finally {
      setLoadingQuotes(false);
    }
  };

  useEffect(() => {
    if (subTab === 'REQUIREMENTS') {
      fetchRequirements();
    } else {
      fetchQuotations();
    }
  }, [subTab, reqCropFilter, reqMatchFilter, reqSortBy, quoteStatusFilter]);

  const handleReqSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequirements();
  };

  const handleOpenQuotationModal = (requirementId) => {
    setActiveRequirementId(requirementId);
    setModalOpen(true);
  };

  const handleQuotationSubmitted = () => {
    fetchRequirements();
    fetchQuotations();
  };

  const handleWithdrawQuotation = async (quoteId, quoteNumber) => {
    if (!window.confirm(t('quotations.confirmWithdraw', `Are you sure you want to withdraw quotation ${quoteNumber}? Any reserved lot stock will be freed.`))) {
      return;
    }
    setWithdrawLoadingId(quoteId);
    try {
      await api.post(`/fpo/quotations/${quoteId}/withdraw`, {
        reason: 'Withdrawn by FPO management via dashboard'
      });
      fetchQuotations();
      fetchRequirements();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setWithdrawLoadingId(null);
    }
  };

  // Format Helper
  const formatCurrency = (num) => {
    return '₹' + Number(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const matchBadges = {
    FULL_MATCH: {
      label: t('quotations.fullMatch', 'Full Stock Match (Ready Lot)'),
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500'
    },
    PARTIAL_MATCH: {
      label: t('quotations.partialMatch', 'Partial Lot Available'),
      bg: 'bg-amber-50 text-amber-800 border-amber-300',
      dot: 'bg-amber-500'
    },
    INDICATIVE_ONLY: {
      label: t('quotations.indicativeOnly', 'Member Supply Pipeline'),
      bg: 'bg-sky-50 text-sky-800 border-sky-300',
      dot: 'bg-sky-500'
    },
    INSUFFICIENT_STOCK: {
      label: t('quotations.insufficientStock', 'Insufficient Stock'),
      bg: 'bg-slate-50 text-slate-600 border-slate-200',
      dot: 'bg-slate-400'
    }
  };

  const quoteStatusBadges = {
    PENDING: { label: 'Pending Review', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
    ACCEPTED: { label: 'Accepted by Buyer', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    REJECTED: { label: 'Rejected by Buyer', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
    WITHDRAWN: { label: 'Withdrawn by FPO', bg: 'bg-slate-100 text-slate-700 border-slate-300' },
    EXPIRED: { label: 'Offer Expired', bg: 'bg-gray-100 text-gray-600 border-gray-300' },
    SUPERSEDED: { label: 'Superseded', bg: 'bg-purple-100 text-purple-700 border-purple-300' }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Top Banner & Sub-Tab Navigation */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[#07875B]" />
              {t('quotations.bulkProcurementHeader', 'Bulk Procurement & Institutional Quotations')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t('quotations.bulkProcurementSub', 'Receive verified institutional buyer requests, assess aggregated lot stock feasibility, submit binding quotations, and track orders.')}
            </p>
          </div>

          {/* Sub-Tab Switcher */}
          <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSubTab('REQUIREMENTS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                subTab === 'REQUIREMENTS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#07875B]" />
              {t('quotations.openRequirementsTab', 'Open Buyer Requests')}
              {reqSummary?.totalOpen > 0 && (
                <span className="bg-[#07875B] text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {reqSummary.totalOpen}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSubTab('QUOTATIONS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                subTab === 'QUOTATIONS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              {t('quotations.myQuotationsTab', 'My Quotations')}
              {quoteSummary?.total > 0 && (
                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {quoteSummary.total}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUBTAB 1: OPEN REQUIREMENTS                                   */}
        {/* ------------------------------------------------------------- */}
        {subTab === 'REQUIREMENTS' && (
          <div className="space-y-6">

            {/* Metrics Bar */}
            {reqSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">{t('quotations.totalOpen', 'Total Open')}</p>
                  <p className="text-xl font-black text-slate-900">{reqSummary.totalOpen}</p>
                </div>
                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase">{t('quotations.fullMatch', 'Full Stock Match')}</p>
                  <p className="text-xl font-black text-emerald-800">{reqSummary.fullMatch}</p>
                </div>
                <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200">
                  <p className="text-[11px] font-bold text-amber-700 uppercase">{t('quotations.partialMatch', 'Partial Stock')}</p>
                  <p className="text-xl font-black text-amber-800">{reqSummary.partialMatch}</p>
                </div>
                <div className="bg-sky-50/60 p-3.5 rounded-2xl border border-sky-200">
                  <p className="text-[11px] font-bold text-sky-700 uppercase">{t('quotations.pipelineOnly', 'Member Pipeline')}</p>
                  <p className="text-xl font-black text-sky-800">{reqSummary.indicativeOnly}</p>
                </div>
                <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200">
                  <p className="text-[11px] font-bold text-purple-700 uppercase">{t('quotations.quoted', 'Already Quoted')}</p>
                  <p className="text-xl font-black text-purple-800">{reqSummary.alreadyQuoted}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">{t('quotations.unfulfilled', 'Insufficient')}</p>
                  <p className="text-xl font-black text-slate-500">{reqSummary.insufficientStock}</p>
                </div>
              </div>
            )}

            {/* Filter Controls */}
            <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <form onSubmit={handleReqSearchSubmit} className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  placeholder={t('quotations.searchPlaceholder', 'Search by crop, buyer organization, city or requirement #...')}
                  className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#07875B]"
                />
              </form>

              <div className="flex flex-wrap items-center gap-2">
                {/* Feasibility Filter */}
                <select
                  value={reqMatchFilter}
                  onChange={(e) => setReqMatchFilter(e.target.value)}
                  className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#07875B] cursor-pointer"
                >
                  <option value="ALL">All Feasibility</option>
                  <option value="FULL_MATCH">Ready Stock Match</option>
                  <option value="PARTIAL_MATCH">Partial Lot Match</option>
                  <option value="INDICATIVE_ONLY">Member Pipeline Only</option>
                  <option value="INSUFFICIENT_STOCK">Insufficient Stock</option>
                </select>

                {/* Sort Option */}
                <select
                  value={reqSortBy}
                  onChange={(e) => setReqSortBy(e.target.value)}
                  className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#07875B] cursor-pointer"
                >
                  <option value="urgency">Sort: Delivery Urgency</option>
                  <option value="quantity">Sort: Highest Quantity</option>
                  <option value="price">Sort: Target Price (High to Low)</option>
                </select>

                <button
                  type="button"
                  onClick={fetchRequirements}
                  className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingReqs ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Requirements Cards */}
            {loadingReqs ? (
              <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#07875B]" />
                {t('common.loading', 'Assessing bulk procurement requirements against FPO stock...')}
              </div>
            ) : requirements.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">{t('quotations.noReqsFound', 'No buyer requirements matching current criteria.')}</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {t('quotations.noReqsDesc', 'When institutional buyers post requirements for crops your FPO produces, they will automatically be matched and shown here.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {requirements.map((req) => {
                  const matching = req.matching || {};
                  const badge = matchBadges[matching.matchStatus] || matchBadges.INSUFFICIENT_STOCK;
                  const reqDate = new Date(req.requiredByDate);
                  const isUrgent = (reqDate - new Date()) / (1000 * 60 * 60 * 24) <= 5;
                  const hasActiveQuote = matching.hasActiveQuotation;
                  const activeQuote = matching.quotation;

                  return (
                    <div
                      key={req.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs space-y-4"
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-sm tracking-tight">
                            {req.requirementNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            • Buyer: <strong className="text-slate-800">{req.buyer?.organizationName || req.buyer?.user?.name || 'Verified Buyer'}</strong>
                          </span>
                          {req.buyer?.buyerType && (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {req.buyer.buyerType}
                            </span>
                          )}
                          {req.buyer?.verificationStatus === 'VERIFIED' && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                            </span>
                          )}
                        </div>

                        {/* Stock Feasibility Badge */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${badge.bg}`}>
                            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      {/* Main Spec Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                        {/* Crop & Quality */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('common.crop', 'Crop & Quality')}</p>
                          <p className="text-base font-black text-slate-900 mt-0.5">
                            {t('crops.' + req.cropName, req.cropName)}
                          </p>
                          <p className="text-slate-500 text-[11px]">
                            {req.variety || 'Standard Variety'} • Grade: <strong className="text-slate-700">{req.grade || 'A'}</strong>
                          </p>
                        </div>

                        {/* Required Quantity & Target Budget */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('quotations.demand', 'Demand & Budget')}</p>
                          <p className="text-base font-black text-slate-900 mt-0.5">
                            {Number(req.quantityKg).toLocaleString()} kg
                          </p>
                          <p className="text-slate-500 text-[11px]">
                            Target: <strong className="text-[#07875B] font-bold">₹{req.targetPricePerKg || req.maxPricePerKg}/kg</strong>
                            {req.maxPricePerKg && req.targetPricePerKg !== req.maxPricePerKg && (
                              <span className="text-slate-400"> (Max ₹{req.maxPricePerKg})</span>
                            )}
                          </p>
                        </div>

                        {/* Delivery Location & Timeline */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('quotations.delivery', 'Delivery Terms')}</p>
                          <p className="text-slate-800 font-bold text-xs mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {req.deliveryLocation || 'Buyer Warehouse'}
                          </p>
                          <p className={`text-[11px] flex items-center gap-1 mt-0.5 ${isUrgent ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            Required by: {formatDate(req.requiredByDate)}
                          </p>
                        </div>

                        {/* FPO Supply Feasibility Breakdown */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('quotations.fpoCapacity', 'FPO Capacity Match')}</p>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-600">Ready Lots:</span>
                            <span className="font-bold text-emerald-700">
                              {Number(matching.confirmedStockKg || 0).toLocaleString()} kg ({matching.confirmedLotsCount || 0} lots)
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-600">Member Pipeline:</span>
                            <span className="font-bold text-sky-700">
                              {Number(matching.indicativeStockKg || 0).toLocaleString()} kg ({matching.indicativeListingsCount || 0} listings)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-[#07875B] h-full"
                              style={{ width: `${Math.min(100, matching.coveragePercent || 0)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-right text-slate-400 font-bold">
                            {matching.coveragePercent || 0}% covered
                          </p>
                        </div>
                      </div>

                      {/* Footer Action Bar */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-100">
                        {hasActiveQuote ? (
                          <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-amber-900 font-medium">
                              Quotation <strong className="font-bold">{activeQuote?.quotationNumber}</strong> submitted ({activeQuote?.status}). Offered: {activeQuote?.offeredQuantityKg?.toLocaleString()} kg @ ₹{activeQuote?.offeredPricePerKg}/kg.
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-slate-400" />
                            {matching.confirmedLotsCount > 0 ? (
                              <span>Allocate confirmed produce lots directly into this quotation.</span>
                            ) : matching.indicativeListingsCount > 0 ? (
                              <span>Quotes can be backed by member pipeline listings or committed forward contracts.</span>
                            ) : (
                              <span>No current stock in this crop. You can aggregate member produce or prepare an advance quote.</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {hasActiveQuote ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSubTab('QUOTATIONS');
                                setQuoteStatusFilter('ALL');
                              }}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              {t('quotations.viewInQuotes', 'View Submitted Quote')}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenQuotationModal(req.id)}
                              className="px-4 py-2 bg-[#07875B] hover:bg-[#06724d] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {t('quotations.prepareQuotationBtn', 'Prepare Quotation')}
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBTAB 2: SENT QUOTATIONS & HISTORY                           */}
        {/* ------------------------------------------------------------- */}
        {subTab === 'QUOTATIONS' && (
          <div className="space-y-6">

            {/* Metrics Bar */}
            {quoteSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">{t('quotations.totalQuotes', 'Total Quotes')}</p>
                  <p className="text-xl font-black text-slate-900">{quoteSummary.total}</p>
                </div>
                <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200">
                  <p className="text-[11px] font-bold text-amber-700 uppercase">{t('quotations.pendingReview', 'Pending Review')}</p>
                  <p className="text-xl font-black text-amber-800">{quoteSummary.pending}</p>
                </div>
                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase">{t('quotations.acceptedDeals', 'Accepted')}</p>
                  <p className="text-xl font-black text-emerald-800">{quoteSummary.accepted}</p>
                </div>
                <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200">
                  <p className="text-[11px] font-bold text-rose-700 uppercase">{t('quotations.rejectedQuotes', 'Rejected')}</p>
                  <p className="text-xl font-black text-rose-800">{quoteSummary.rejected}</p>
                </div>
                <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200">
                  <p className="text-[11px] font-bold text-purple-700 uppercase">{t('quotations.activeOfferedValue', 'Active Quoted')}</p>
                  <p className="text-base font-black text-purple-800">{formatCurrency(quoteSummary.totalQuotedValue)}</p>
                </div>
                <div className="bg-emerald-100/60 p-3.5 rounded-2xl border border-emerald-300">
                  <p className="text-[11px] font-bold text-emerald-900 uppercase">{t('quotations.confirmedOrderValue', 'Confirmed Orders')}</p>
                  <p className="text-base font-black text-[#07875B]">{formatCurrency(quoteSummary.totalAcceptedValue)}</p>
                </div>
              </div>
            )}

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500">{t('common.status', 'Status')}:</span>
                {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setQuoteStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      quoteStatusFilter === st
                        ? 'bg-[#07875B] text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={fetchQuotations}
                className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer self-end sm:self-auto"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingQuotes ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quotations List */}
            {loadingQuotes ? (
              <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#07875B]" />
                {t('common.loading', 'Loading FPO quotation history...')}
              </div>
            ) : quotations.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">{t('quotations.noQuotesFound', 'No quotations found.')}</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {t('quotations.noQuotesDesc', 'Select an open requirement to submit your first competitive quotation backed by verified produce lots.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {quotations.map((quote) => {
                  const req = quote.requirement || {};
                  const lot = quote.produceLot;
                  const order = quote.order;
                  const stBadge = quoteStatusBadges[quote.status] || quoteStatusBadges.PENDING;
                  const isPending = quote.status === 'PENDING';
                  const isAccepted = quote.status === 'ACCEPTED';
                  const isRejected = quote.status === 'REJECTED';
                  const isExpired = quote.status === 'EXPIRED';

                  return (
                    <div
                      key={quote.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs space-y-4"
                    >
                      {/* Top Header */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-sm">
                            {quote.quotationNumber}
                          </span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-xs text-slate-600">
                            For Req: <strong>{req.requirementNumber || 'Direct'}</strong>
                          </span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-xs text-slate-600">
                            Buyer: <strong>{req.buyer?.organizationName || req.buyer?.user?.name || 'Verified Buyer'}</strong>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            (Submitted: {formatDate(quote.createdAt)})
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${stBadge.bg}`}>
                            {stBadge.label}
                          </span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                        {/* Offered Quantity & Rate */}
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('quotations.quoteDetails', 'Quotation Terms')}</p>
                          <p className="text-base font-black text-[#07875B]">
                            {Number(quote.offeredQuantityKg).toLocaleString()} kg @ ₹{quote.offeredPricePerKg}/kg
                          </p>
                          <p className="text-slate-700 font-bold text-xs">
                            Total Value: <strong className="text-slate-900 text-sm">{formatCurrency(quote.totalAmount)}</strong>
                          </p>
                        </div>

                        {/* Allocated Lot vs Advance Supply */}
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('quotations.fulfillmentStock', 'Stock Fulfillment')}</p>
                          {lot ? (
                            <div>
                              <p className="text-slate-800 font-bold flex items-center gap-1">
                                <Package className="w-3.5 h-3.5 text-[#07875B]" />
                                Lot: {lot.lotNumber}
                              </p>
                              <p className="text-slate-500 text-[11px]">
                                {lot.cropName} • {lot.grade || 'A'} • Lot Available: {lot.availableQuantityKg?.toLocaleString()} kg
                              </p>
                            </div>
                          ) : (
                            <p className="text-sky-700 font-bold flex items-center gap-1">
                              <Info className="w-3.5 h-3.5 text-sky-600" />
                              Forward / Member Pipeline Commitment
                            </p>
                          )}
                        </div>

                        {/* Delivery & Validity Timers */}
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('quotations.timeline', 'Timeline & Expiry')}</p>
                          <p className="text-slate-700 text-xs flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            Delivery: {formatDate(quote.estimatedDeliveryDate)}
                          </p>
                          <p className={`text-[11px] flex items-center gap-1 ${isPending ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            Valid until: {new Date(quote.validUntil).toLocaleString()}
                          </p>
                        </div>

                        {/* Status Details / Rejection Reason / Order Info */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          {isAccepted && order ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Order Generated
                              </span>
                              <p className="font-black text-slate-900 text-xs">#{order.orderNumber}</p>
                              <p className="text-[11px] text-slate-500">Order Status: <strong className="text-emerald-700">{order.status}</strong></p>
                            </div>
                          ) : isRejected ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Rejection Feedback
                              </span>
                              <p className="text-[11px] text-rose-900 italic">"{quote.rejectionReason || 'No specific reason provided'}"</p>
                            </div>
                          ) : isExpired ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-500" />
                                Expired
                              </span>
                              <p className="text-[11px] text-gray-500">Validity period elapsed without buyer acceptance.</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Under Buyer Review
                              </span>
                              <p className="text-[11px] text-slate-500">Buyer has received this offer. Stock reservation held.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      {isPending && (
                        <div className="flex justify-end pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={withdrawLoadingId === quote.id}
                            onClick={() => handleWithdrawQuotation(quote.id, quote.quotationNumber)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition-colors text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {withdrawLoadingId === quote.id ? t('common.withdrawing', 'Withdrawing...') : t('quotations.withdrawBtn', 'Withdraw Quotation')}
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Quotation Preparation Modal */}
      {modalOpen && (
        <FpoQuotationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          requirementId={activeRequirementId}
          onQuotationSubmitted={handleQuotationSubmitted}
        />
      )}

    </div>
  );
};

export default FpoBulkRequirementsTab;
