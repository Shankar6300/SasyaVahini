import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Package, Search, Eye, Filter, RefreshCw, Layers, CheckCircle2,
  Clock, AlertCircle, MapPin, Building, ChevronRight, SlidersHorizontal,
  ArrowUpRight, Users, Check, X
} from 'lucide-react';
import FpoLotDetailsModal from './FpoLotDetailsModal';

const FpoProduceLotsTab = ({ fpoProfile, onNavigateToAggregation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState([]);
  const [summary, setSummary] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cropFilter, setCropFilter] = useState('ALL');

  // Modal state
  const [selectedLotId, setSelectedLotId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchLots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (cropFilter !== 'ALL') params.append('crop', cropFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/fpo/lots?${params.toString()}`);
      const data = res.data?.data || res.data || {};
      setLots(data.lots || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.warn('Error fetching FPO produce lots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, [statusFilter, cropFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLots();
  };

  const handleOpenDetails = (lotId) => {
    setSelectedLotId(lotId);
    setModalOpen(true);
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

  const availableCrops = Array.from(new Set(lots.map((l) => l.cropName)));

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-sky-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-emerald-800/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-2">
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            📦 {t('fpo.lotsDirectoryTitle', 'Consolidated Produce Lots Directory')}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {t('fpo.produceLotsHeading', 'Track Consolidated Lots & Collective Inventory')}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
            {t('fpo.produceLotsSubtitle', 'View aggregated batches created from member contributions. Monitor certification, testing, marketing status, and track buyer contract allocations.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToAggregation && (
            <button
              type="button"
              onClick={onNavigateToAggregation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              {t('fpo.assembleNewLot', 'Assemble New Lot')}
            </button>
          )}

          <button
            type="button"
            onClick={fetchLots}
            disabled={loading}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {/* 4 Core Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.totalAggregatedLots', 'Total Created Lots')}</p>
          <p className="text-2xl font-black text-slate-900">{summary?.totalLotsCount || lots.length}</p>
          <span className="text-[10px] text-slate-500 font-medium">
            {summary?.activeLotsCount || 0} active / marketable
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.totalConsolidatedStock', 'Consolidated Volume')}</p>
          <p className="text-2xl font-black text-emerald-700">
            {(summary?.totalAggregatedKg || 0).toLocaleString()} kg
          </p>
          <span className="text-[10px] text-slate-500 font-medium">
            Across {availableCrops.length} crop categories
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.availableForSale', 'Available for Contract')}</p>
          <p className="text-2xl font-black text-sky-800">
            {(summary?.availableLotStockKg || 0).toLocaleString()} kg
          </p>
          <span className="text-[10px] text-slate-500 font-medium">
            Unallocated balance
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.allocatedToOrders', 'Committed / Sold')}</p>
          <p className="text-2xl font-black text-amber-800">
            {(summary?.allocatedLotStockKg || 0).toLocaleString()} kg
          </p>
          <span className="text-[10px] text-slate-500 font-medium">
            Allocated to buyers
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('fpo.searchLotsPlaceholder', 'Search by lot number, crop, variety...')}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">{t('fpo.allStatuses', 'All Statuses')}</option>
            <option value="AGGREGATED">AGGREGATED</option>
            <option value="TESTED">TESTED</option>
            <option value="READY_FOR_SALE">READY_FOR_SALE</option>
            <option value="ALLOCATED">ALLOCATED</option>
            <option value="FULFILLED">FULFILLED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {/* Crop Filter */}
          <select
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">{t('fpo.allCrops', 'All Crops')}</option>
            {availableCrops.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Produce Lots Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-bold">{t('common.loading', 'Loading consolidated produce lots…')}</p>
        </div>
      ) : lots.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">{t('fpo.noLotsFound', 'No produce lots found')}</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {t('fpo.noLotsFoundDesc', 'When you aggregate member farmer contributions from the Aggregation Engine, your traceable wholesale lots will appear here.')}
          </p>
          {onNavigateToAggregation && (
            <button
              type="button"
              onClick={onNavigateToAggregation}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {t('fpo.openAggregationEngine', 'Open Aggregation Engine')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">{t('fpo.lotNumber', 'Lot ID & Number')}</th>
                  <th className="py-3.5 px-4">{t('fpo.cropVariety', 'Crop & Quality')}</th>
                  <th className="py-3.5 px-4 text-right">{t('fpo.totalVolume', 'Consolidated Volume')}</th>
                  <th className="py-3.5 px-4 text-right">{t('fpo.availableBalance', 'Available Balance')}</th>
                  <th className="py-3.5 px-4 text-right">{t('fpo.weightedRate', 'Fair Weighted Rate')}</th>
                  <th className="py-3.5 px-4">{t('fpo.farmers', 'Farmers')}</th>
                  <th className="py-3.5 px-4">{t('fpo.status', 'Status')}</th>
                  <th className="py-3.5 px-4 text-right">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {lots.map((lot) => {
                  return (
                    <tr key={lot.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{lot.lotNumber}</span>
                        <span className="text-[10px] text-slate-400 block">{new Date(lot.createdAt).toLocaleDateString()}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{lot.cropName}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {lot.variety || 'Standard'} • <strong className="text-emerald-700">{lot.qualityGrade}</strong>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-800">
                        {lot.totalQuantityKg.toLocaleString()} kg
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-emerald-700 block">
                          {lot.availableQuantityKg.toLocaleString()} kg
                        </span>
                        {lot.allocatedQuantityKg > 0 && (
                          <span className="text-[10px] text-amber-700 block font-bold">
                            ({lot.allocatedQuantityKg} kg allocated)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        ₹{lot.weightedAvgPricePerKg}<span className="text-[10px] font-normal text-slate-400">/kg</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full font-bold text-[11px]">
                          <Users className="w-3 h-3 text-slate-400" />
                          {lot.contributingFarmersCount || lot.contributions?.length || 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusColors[lot.status] || 'bg-slate-100'}`}>
                          {lot.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(lot.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold rounded-xl transition-all border border-slate-200 flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('fpo.viewDetails', 'Details')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      <FpoLotDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        lotId={selectedLotId}
        onLotUpdated={fetchLots}
      />

    </div>
  );
};

export default FpoProduceLotsTab;
