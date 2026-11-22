import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Wheat, Search, Filter, Layers, CheckCircle2, Clock,
  AlertCircle, Send, X as CloseIcon, RefreshCw, Eye,
  ShieldCheck, Package, MapPin, Check, Ban, RotateCcw,
  Calendar, Info
} from 'lucide-react';
import FpoRequestContributionModal from './FpoRequestContributionModal';
import VoiceInput from '../VoiceInput';

const FpoMemberProduceTab = ({ fpoProfile }) => {
  const { t } = useTranslation();

  // Sub-tabs: 'CATALOG' (Member Produce) | 'HISTORY' (Contribution Requests Tracking)
  const [activeSubTab, setActiveSubTab] = useState('CATALOG');

  // Produce State
  const [produceListings, setProduceListings] = useState([]);
  const [summary, setSummary] = useState({
    totalListingsCount: 0,
    availableListingsCount: 0,
    totalAvailableKg: 0,
    totalReservedKg: 0,
    totalCommittedKg: 0
  });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('ALL');
  const [selectedQuality, setSelectedQuality] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('AVAILABLE');
  const [harvestAfter, setHarvestAfter] = useState('');
  const [harvestBefore, setHarvestBefore] = useState('');

  // Selection & Contribution Modal State
  const [selectedListingIds, setSelectedListingIds] = useState([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [activeListingForSingleRequest, setActiveListingForSingleRequest] = useState(null);

  // Contributions History State
  const [contributionsHistory, setContributionsHistory] = useState([]);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchMemberProduce = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCrop !== 'ALL') params.crop = selectedCrop;
      if (selectedQuality !== 'ALL') params.qualityGrade = selectedQuality;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (harvestAfter) params.harvestAfter = harvestAfter;
      if (harvestBefore) params.harvestBefore = harvestBefore;

      const res = await api.get('/fpo/member-produce', { params });
      const data = res.data?.data || res.data || {};
      setProduceListings(data.listings || []);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error('Error fetching member produce:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContributionHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = {};
      if (historyStatusFilter !== 'ALL') params.status = historyStatusFilter;
      const res = await api.get('/fpo/contributions', { params });
      const list = res.data?.data || res.data || [];
      setContributionsHistory(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching contribution history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberProduce();
  }, [search, selectedCrop, selectedQuality, selectedStatus, harvestAfter, harvestBefore]);

  useEffect(() => {
    if (activeSubTab === 'HISTORY') {
      fetchContributionHistory();
    }
  }, [activeSubTab, historyStatusFilter]);

  // Unique crops for filter dropdown
  const cropsList = ['ALL', ...Array.from(new Set(produceListings.map((l) => l.cropName).filter(Boolean)))];

  // Selection handlers
  const handleToggleSelect = (id) => {
    if (selectedListingIds.includes(id)) {
      setSelectedListingIds(selectedListingIds.filter((item) => item !== id));
    } else {
      setSelectedListingIds([...selectedListingIds, id]);
    }
  };

  const handleSelectAllAvailable = () => {
    const availableIds = produceListings.filter((l) => l.isAvailable).map((l) => l.id);
    if (selectedListingIds.length === availableIds.length) {
      setSelectedListingIds([]);
    } else {
      setSelectedListingIds(availableIds);
    }
  };

  const handleOpenSingleRequest = (listing) => {
    setActiveListingForSingleRequest(listing);
    setSelectedListingIds([listing.id]);
    setRequestModalOpen(true);
  };

  const handleOpenBulkRequest = () => {
    setActiveListingForSingleRequest(null);
    setRequestModalOpen(true);
  };

  const handleCancelRequest = async (id, isConfirmed, cropName) => {
    const promptMsg = isConfirmed
      ? t('fpo.confirmReleaseReservation', `Are you sure you want to cancel this confirmed contribution for ${cropName}? The reserved stock will be automatically released back to the farmer's available inventory.`)
      : t('fpo.confirmCancelContributionRequest', `Are you sure you want to retract this contribution request for ${cropName}?`);

    if (!window.confirm(promptMsg)) return;

    setActionLoadingId(id);
    try {
      const res = await api.delete(`/fpo/contributions/${id}`);
      alert(res.data?.data?.message || t('fpo.requestCancelledSuccess', 'Contribution request cancelled.'));
      await fetchContributionHistory();
      await fetchMemberProduce();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const selectedListingsObjects = produceListings.filter((l) =>
    selectedListingIds.includes(l.id)
  );

  const selectedTotalAvailKg = selectedListingsObjects.reduce(
    (s, l) => s + (l.availableQuantityKg || 0),
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Sub-Tab Switcher & Action Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('CATALOG')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeSubTab === 'CATALOG'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wheat className="w-4 h-4 text-[#07875B]" />
            <span>{t('fpo.memberProduceCatalogSubtab', 'Active Member Produce')}</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {summary.totalListingsCount || produceListings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeSubTab === 'HISTORY'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-sky-600" />
            <span>{t('fpo.contributionHistorySubtab', 'Contribution Requests Tracking')}</span>
            {contributionsHistory.filter((c) => c.status === 'PENDING').length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {contributionsHistory.filter((c) => c.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        {/* Selected Items Action Pill */}
        {activeSubTab === 'CATALOG' && selectedListingIds.length > 0 && (
          <div className="flex items-center gap-2.5 animate-scale-up self-end sm:self-auto">
            <span className="text-xs font-bold text-slate-600">
              <strong>{selectedListingIds.length}</strong> {t('common.selected', 'selected')} ({selectedTotalAvailKg.toLocaleString()} kg)
            </span>
            <button
              type="button"
              onClick={handleOpenBulkRequest}
              className="px-4 py-2 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold rounded-2xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('fpo.requestContributionBtn', 'Request Contribution')}</span>
            </button>
          </div>
        )}
      </div>

      {/* SUBTAB 1: MEMBER PRODUCE CATALOG */}
      {activeSubTab === 'CATALOG' && (
        <div className="space-y-6">

          {/* 4 Quantity Metric Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#07875B] flex items-center justify-center font-bold border border-emerald-100 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">{t('farmer.availableStock', 'Available Stock')}</p>
                <p className="text-lg font-black text-[#07875B]">{summary.totalAvailableKg.toLocaleString()} kg</p>
                <span className="text-[10px] text-slate-500 font-medium">Eligible for requests</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-100 flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.reservedStock', 'Reserved Stock')}</p>
                <p className="text-lg font-black text-amber-700">{summary.totalReservedKg.toLocaleString()} kg</p>
                <span className="text-[10px] text-slate-500 font-medium">Farmer-confirmed hold</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold border border-slate-200 flex-shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.committedSoldStock', 'Committed / Sold')}</p>
                <p className="text-lg font-black text-slate-900">{summary.totalCommittedKg.toLocaleString()} kg</p>
                <span className="text-[10px] text-slate-500 font-medium">Fulfilled to buyers</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold border border-sky-100 flex-shrink-0">
                <Wheat className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.activeMemberLots', 'Active Member Lots')}</p>
                <p className="text-lg font-black text-sky-900">{summary.totalListingsCount || produceListings.length}</p>
                <span className="text-[10px] text-slate-500 font-medium">{summary.availableListingsCount} with available stock</span>
              </div>
            </div>
          </div>

          {/* Search & Comprehensive Filters Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('fpo.searchMemberProducePlaceholder', 'Search by farmer name, crop, variety, or village...')}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#07875B] transition-all font-medium"
                  />
                </div>
                <VoiceInput
                  onResult={(val) => setSearch(val)}
                  title={t('voice.speakSearchTerm', 'Speak search term')}
                />
              </div>

              {/* Status and Crop Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#07875B] font-bold text-slate-700 cursor-pointer"
                >
                  {cropsList.map((c) => (
                    <option key={c} value={c}>
                      {c === 'ALL' ? t('common.allCrops', 'All Crops') : c}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#07875B] font-bold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">{t('common.allGrades', 'All Grades')}</option>
                  <option value="GRADE_A">Grade A (Export/Retail)</option>
                  <option value="GRADE_B">Grade B (Standard Market)</option>
                  <option value="GRADE_C">Grade C (Processing)</option>
                  <option value="ORGANIC_PREMIUM">Organic Premium</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#07875B] font-bold text-slate-700 cursor-pointer"
                >
                  <option value="AVAILABLE">{t('common.availableOnly', 'Available Stock')}</option>
                  <option value="ALL">{t('common.allStatus', 'All Statuses')}</option>
                  <option value="PARTIALLY_RESERVED">{t('status.PARTIALLY_RESERVED', 'Partially Reserved')}</option>
                  <option value="RESERVED">{t('status.RESERVED', 'Fully Reserved')}</option>
                </select>
              </div>
            </div>

            {/* Date Filters Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="font-bold flex items-center gap-1 text-slate-700">
                <Calendar className="w-3.5 h-3.5" /> {t('fpo.harvestDateFilter', 'Harvest Date Range')}:
              </span>
              <div className="flex items-center gap-1.5">
                <span>From:</span>
                <input
                  type="date"
                  value={harvestAfter}
                  onChange={(e) => setHarvestAfter(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span>To:</span>
                <input
                  type="date"
                  value={harvestBefore}
                  onChange={(e) => setHarvestBefore(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium outline-none"
                />
              </div>
              {(harvestAfter || harvestBefore || selectedCrop !== 'ALL' || selectedQuality !== 'ALL' || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSelectedCrop('ALL');
                    setSelectedQuality('ALL');
                    setSelectedStatus('AVAILABLE');
                    setHarvestAfter('');
                    setHarvestBefore('');
                  }}
                  className="text-[#07875B] hover:underline font-bold ml-auto cursor-pointer"
                >
                  {t('common.clearFilters', 'Clear Filters')}
                </button>
              )}
            </div>
          </div>

          {/* Produce Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-xs">
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-7 h-7 text-[#07875B] animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">{t('fpo.loadingMemberProduce', 'Loading member produce catalog...')}</p>
              </div>
            ) : produceListings.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Wheat className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">
                  {t('fpo.noMemberProduceFound', 'No member produce listings found matching your criteria.')}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {t('fpo.noMemberProduceFoundDesc', 'When active member farmers list harvest produce in their portal, their lots will appear here for cooperative pooling.')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-extrabold tracking-wider border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={
                            produceListings.filter((l) => l.isAvailable).length > 0 &&
                            selectedListingIds.length === produceListings.filter((l) => l.isAvailable).length
                          }
                          onChange={handleSelectAllAvailable}
                          className="accent-[#07875B] rounded w-4 h-4 cursor-pointer"
                          title="Select all available lots"
                        />
                      </th>
                      <th className="p-4">{t('fpo.farmerMember', 'Farmer Member')}</th>
                      <th className="p-4">{t('farmer.produce', 'Crop & Variety')}</th>
                      <th className="p-4">{t('farmer.availableStock', 'Available')}</th>
                      <th className="p-4">{t('fpo.reservedStock', 'Reserved')}</th>
                      <th className="p-4">{t('fpo.committedSoldStock', 'Committed')}</th>
                      <th className="p-4">{t('fpo.totalQuantity', 'Total Lot')}</th>
                      <th className="p-4">{t('farmer.ratePerKg', 'Asking Rate')}</th>
                      <th className="p-4">{t('farmer.harvestDate', 'Harvest Date')}</th>
                      <th className="p-4">{t('fpo.contributionStatus', 'Status')}</th>
                      <th className="p-4 text-right">{t('common.actions', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {produceListings.map((l) => {
                      const isSelected = selectedListingIds.includes(l.id);

                      return (
                        <tr
                          key={l.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-emerald-50/70 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              disabled={!l.isAvailable}
                              checked={isSelected}
                              onChange={() => handleToggleSelect(l.id)}
                              className="accent-[#07875B] rounded w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-slate-900 block">{l.farmer?.name}</span>
                            <span className="text-slate-500 text-[11px]">
                              {l.farmer?.village || 'Manchar'}, {l.farmer?.district || 'Pune'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-[#07875B] text-sm">{l.cropName}</span>
                              {l.isOrganic && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-extrabold">
                                  Org
                                </span>
                              )}
                            </div>
                            <span className="text-slate-500 text-[11px] block">{l.qualityGrade}</span>
                          </td>
                          <td className="p-4 font-black text-[#07875B] text-sm">
                            {l.availableQuantityKg.toLocaleString()} {l.unit}
                          </td>
                          <td className="p-4 text-amber-700 font-bold">
                            {l.reservedQuantityKg.toLocaleString()} {l.unit}
                          </td>
                          <td className="p-4 text-slate-500 font-medium">
                            {l.committedQuantityKg.toLocaleString()} {l.unit}
                          </td>
                          <td className="p-4 text-slate-800 font-bold">
                            {l.totalQuantityKg.toLocaleString()} {l.unit}
                          </td>
                          <td className="p-4 font-black text-slate-900">
                            ₹{l.askingPricePerKg}/kg
                            {l.minPricePerKg && (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                Min: ₹{l.minPricePerKg}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-600 whitespace-nowrap">
                            {l.harvestDate || '—'}
                          </td>
                          <td className="p-4">
                            {l.pendingContributionRequestsCount > 0 ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                <Clock className="w-3 h-3" />
                                {l.pendingContributionRequestsCount} Request(s) Sent
                              </span>
                            ) : l.isAvailable ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#07875B] font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                <CheckCircle2 className="w-3 h-3" /> Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                Fully Reserved
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            {l.isAvailable ? (
                              <button
                                type="button"
                                onClick={() => handleOpenSingleRequest(l)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#07875B] font-bold rounded-xl border border-emerald-200 transition-colors inline-flex items-center gap-1 cursor-pointer text-[11px]"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {t('fpo.requestQtyShort', 'Request')}
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">No Stock</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBTAB 2: CONTRIBUTION REQUESTS TRACKING & HISTORY */}
      {activeSubTab === 'HISTORY' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-600" />
                {t('fpo.contributionRequestsHistoryTitle', 'Outgoing Contribution Proposals & Reservation Status')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('fpo.contributionRequestsHistorySubtitle', 'Audit trail of contribution requests sent to member farmers and their confirmed reservation holdings.')}
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
              {['ALL', 'PENDING', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setHistoryStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-[11px] ${
                    historyStatusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st}
                </button>
              ))}
            </div>
          </div>

          {historyLoading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-[#07875B] animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading contribution history...</p>
            </div>
          ) : contributionsHistory.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">
                {t('fpo.noContributionsFound', 'No contribution proposals found.')}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {t('fpo.noContributionsFoundDesc', 'When you request contributions from the Active Member Produce tab, tracking records will appear here.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {contributionsHistory.map((item) => {
                const isPending = item.status === 'PENDING';
                const isAccepted = item.status === 'ACCEPTED' || item.status === 'PARTIALLY_ACCEPTED';
                const isRejected = item.status === 'REJECTED';
                const isCancelled = item.status === 'CANCELLED';

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      isAccepted
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isPending
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{item.cropName}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isAccepted
                              ? 'bg-emerald-100 text-[#07875B]'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Requested: {new Date(item.requestedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-slate-600 text-[11px]">
                        <span>
                          Farmer: <strong>{item.farmerName}</strong> ({item.farmerVillage || 'Member Cluster'})
                        </span>
                        <span>
                          Requested: <strong>{item.requestedQtyKg} kg</strong>
                        </span>
                        {item.confirmedQtyKg && (
                          <span className="text-[#07875B]">
                            Confirmed / Reserved: <strong>{item.confirmedQtyKg} kg</strong>
                          </span>
                        )}
                        <span>
                          Rate: <strong>₹{item.offeredPricePerKg}/kg</strong>
                        </span>
                        <span>
                          Total Value: <strong>₹{item.estimatedTotalValue?.toLocaleString()}</strong>
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-white/80 p-2 rounded-xl border border-slate-200 mt-1">
                          "{item.notes}"
                        </p>
                      )}

                      {item.rejectionReason && (
                        <p className="text-[11px] text-rose-700 italic bg-rose-50 p-2 rounded-xl border border-rose-200 mt-1">
                          Declined by farmer: "{item.rejectionReason}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="self-end md:self-center">
                      {isPending && (
                        <button
                          type="button"
                          disabled={actionLoadingId === item.id}
                          onClick={() => handleCancelRequest(item.id, false, item.cropName)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
                          {actionLoadingId === item.id ? 'Cancelling...' : 'Cancel Request'}
                        </button>
                      )}

                      {isAccepted && (
                        <button
                          type="button"
                          disabled={actionLoadingId === item.id}
                          onClick={() => handleCancelRequest(item.id, true, item.cropName)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl border border-amber-200 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                          title="Release reserved stock back to member farmer inventory"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          {actionLoadingId === item.id ? 'Releasing...' : 'Release Reservation'}
                        </button>
                      )}

                      {(isRejected || isCancelled) && (
                        <span className="text-slate-400 text-xs italic">
                          {isCancelled ? 'Cancelled' : 'Declined'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* REQUEST CONTRIBUTION MODAL */}
      <FpoRequestContributionModal
        isOpen={requestModalOpen}
        onClose={() => {
          setRequestModalOpen(false);
          setActiveListingForSingleRequest(null);
        }}
        selectedListings={activeListingForSingleRequest ? [activeListingForSingleRequest] : selectedListingsObjects}
        onRequestSent={() => {
          fetchMemberProduce();
          if (activeSubTab === 'HISTORY') fetchContributionHistory();
          setSelectedListingIds([]);
        }}
      />

    </div>
  );
};

export default FpoMemberProduceTab;
