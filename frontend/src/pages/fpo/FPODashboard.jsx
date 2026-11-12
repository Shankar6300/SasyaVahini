import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Building, Users, Layers, ShoppingBag, CheckCircle2,
  ShieldCheck, Package, Search, Eye,
  MapPin, UserCheck, Mic, Calculator
} from 'lucide-react';

import FpoMemberDetailsModal from '../../components/fpo/FpoMemberDetailsModal';
import FpoProfileModal from '../../components/fpo/FpoProfileModal';
import FpoVoiceAggregationModal from '../../components/fpo/FpoVoiceAggregationModal';
import LanguageSelector from '../../components/LanguageSelector';
import VoiceAssistant from '../../components/VoiceAssistant';
import VoiceInput from '../../components/VoiceInput';

const FpoDashboard = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();

  // Tab State: 'OVERVIEW' | 'MEMBERS' | 'AGGREGATION' | 'PROPOSALS'
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  // Core Data
  const [fpoData, setFpoData] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter in Member Directory
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Produce Aggregation State
  const [selectedListings, setSelectedListings] = useState([]);
  const [aggregationResult, setAggregationResult] = useState(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState('');

  const fetchFpoDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fpo/dashboard');
      setFpoData(res.data?.data || res.data);

      try {
        const propRes = await api.get('/fpo/proposals');
        setProposals(Array.isArray(propRes.data?.data) ? propRes.data.data : (Array.isArray(propRes.data) ? propRes.data : []));
      } catch (err) {
        console.warn('Could not fetch FPO proposals:', err);
      }
    } catch (err) {
      console.error('Error fetching FPO dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFpoDashboard();
  }, [user]);

  const handleToggleListingSelect = (listingId) => {
    if (selectedListings.includes(listingId)) {
      setSelectedListings(selectedListings.filter(id => id !== listingId));
    } else {
      setSelectedListings([...selectedListings, listingId]);
    }
  };

  const handleRunAggregation = async () => {
    if (selectedListings.length === 0) {
      alert(t('fpo.selectAtLeastTwo', 'Please select at least 1 farmer produce listing to aggregate.'));
      return;
    }

    try {
      const res = await api.post('/fpo/aggregate', {
        listingIds: selectedListings,
        requirementId: selectedRequirementId || undefined
      });
      setAggregationResult(res.data?.data || res.data);
    } catch (err) {
      alert(t('fpo.aggFailed', 'Aggregation failed: ') + (err.response?.data?.error?.message || err.response?.data?.error || err.message));
    }
  };

  const handleApplyVoiceLots = (parsedLots, calculatedWeightedRate) => {
    setAggregationResult({
      message: `Successfully aggregated ${parsedLots.length} member contributions via Voice Assistant!`,
      totalAggregatedQty: parsedLots.reduce((s, l) => s + (parseFloat(l.quantityKg) || 0), 0),
      participatingFarmersCount: parsedLots.length,
      weightedAvgPricePerKg: calculatedWeightedRate,
      farmersBreakdown: parsedLots.map(l => ({
        farmerName: l.farmerName || 'Farmer Member',
        village: 'Khed Cluster',
        quantityKg: parseFloat(l.quantityKg) || 0,
        askingPricePerKg: parseFloat(l.askingPricePerKg) || 0
      }))
    });
  };

  const handleViewMemberDetails = (member) => {
    setSelectedMember(member);
    setMemberModalOpen(true);
  };

  // Computed metrics
  const totalCollectiveQty = fpoData?.collectiveInventory?.reduce((s, i) => s + i.totalQuantityKg, 0) || 0;
  const activeMembersList = fpoData?.memberFarmers || [];

  const filteredMembers = activeMembersList.filter(m => {
    const name = m.user?.name || '';
    const village = m.user?.village || '';
    return name.toLowerCase().includes(memberSearch.toLowerCase()) ||
           village.toLowerCase().includes(memberSearch.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">

      {/* 1. TOP FPO ORGANIZATION BANNER */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-sky-800/40">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-bold">
            <Building className="w-3.5 h-3.5 text-sky-400" />
            🏢 {t('fpo.portalTitle', 'FPO Collective Marketing Hub • Smallholder Aggregation')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {fpoData?.fpoProfile?.fpoName || user?.name || 'Pune Sahakari Krishi Producer Co.'}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-sky-200">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              {user?.location || 'Khed Hub, Pune District, Maharashtra'}
            </span>
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 font-bold">
              {t('fpo.regNoLabel', 'Reg')}: {fpoData?.fpoProfile?.registrationNo || 'FPO-MH-PUN-2023-089'}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> {t('fpo.verifiedEntityBadge', 'NABARD / SFAC Verified Entity')}
            </span>
          </div>
        </div>

        {/* Banner Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <VoiceAssistant guideType="fpo" />
          <LanguageSelector />
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-sky-300" />
            {t('fpo.orgProfile', 'Organization Profile')}
          </button>
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-right">
            <p className="text-[10px] text-sky-200 uppercase font-extrabold tracking-wider">{t('fpo.registeredMembers', 'Registered Members')}</p>
            <p className="text-2xl font-black text-white">{fpoData?.memberCount || activeMembersList.length || 45} {t('fpo.farmers', 'Farmers')}</p>
          </div>
        </div>
      </div>

      {/* 2. TOP METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold border border-sky-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">{t('fpo.cooperativeMembers', 'Cooperative Members')}</p>
            <p className="text-2xl font-black text-slate-900">{fpoData?.memberCount || activeMembersList.length || 45} {t('fpo.farmers', 'Farmers')}</p>
            <span className="text-[10px] text-slate-400">{t('fpo.kycVerified', '100% KYC verified')}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#07875B] flex items-center justify-center font-bold border border-emerald-200">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">{t('fpo.totalAggregatedStock', 'Collective Available Stock')}</p>
            <p className="text-2xl font-black text-[#07875B]">{totalCollectiveQty.toLocaleString()} kg</p>
            <span className="text-[10px] text-slate-400">{t('fpo.acrossCrops', { count: fpoData?.collectiveInventory?.length || 0, defaultValue: `Across ${fpoData?.collectiveInventory?.length || 0} crop categories` })}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold border border-indigo-200">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">{t('fpo.produceLots', 'Member Produce Lots')}</p>
            <p className="text-2xl font-black text-slate-900">{fpoData?.fpoListings?.length || 0} {fpoData?.fpoListings?.length === 1 ? t('farmer.activeLot', 'Lot') : t('farmer.activeLots', 'Lots')}</p>
            <span className="text-[10px] text-slate-400">{t('fpo.indexedForBatch', 'Indexed for batch aggregation')}</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('PROPOSALS')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-amber-300 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">{t('fpo.institutionalProposals', 'Institutional Proposals')}</p>
            <p className="text-2xl font-black text-amber-700">{proposals.length}</p>
            <span className="text-[10px] text-amber-600 font-bold">{t('fpo.reviewAllocations', 'Review allocations →')}</span>
          </div>
        </div>

      </div>

      {/* 3. TAB NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto text-xs font-bold">
        {[
          { key: 'OVERVIEW', label: '🏢 ' + t('fpo.tabCollectiveStock', 'Collective Stock & Overview') },
          { key: 'MEMBERS', label: `👨‍🌾 ` + t('fpo.tabMemberDirectory', 'Member Farmers Directory') + ` (${activeMembersList.length})` },
          { key: 'AGGREGATION', label: '⚡ ' + t('fpo.aggregationEngineTab', 'Produce Aggregation Engine') },
          { key: 'PROPOSALS', label: '📋 ' + t('fpo.institutionalProposalsTab', 'Institutional Proposals') + ` (${proposals.length})` }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-2 sm:px-4 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.key
                ? 'border-sky-700 text-sky-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: OVERVIEW & COLLECTIVE INVENTORY */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-fade-in">

          {/* Inventory Double-Counting Prevention Notice */}
          <div className="bg-[#E8F5E9] border border-emerald-300 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-700 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-[#07875B] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-slate-900">{t('fpo.antiDoubleCountingTitle', 'Anti-Double Counting Protocol Enforced')}</p>
              <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                {t('fpo.antiDoubleCountingDesc', "The collective stock displayed below is a dynamic aggregation composed strictly of verified member-farmer lots. It is never added as duplicate independent stock. When lots are procured, reservation locks synchronously on the member's listing.")}
              </p>
            </div>
          </div>

          {/* Collective Inventory Cards */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">{t('fpo.collectiveInventoryByCrop', 'Collective Inventory by Crop')}</h3>
                <p className="text-xs text-slate-500">{t('fpo.liveAggregatedSupplyDesc', 'Live aggregated supply available across all registered member farmers.')}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('AGGREGATION')}
                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4" /> {t('fpo.openAggregationEngine', 'Open Aggregation Engine')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {fpoData?.collectiveInventory?.map((inv, idx) => (
                <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 hover:border-sky-300 transition-all">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-900 text-base">{t('crops.' + inv.cropName, inv.cropName)}</span>
                    <span className="bg-sky-100 text-sky-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {inv.farmerCount} {t('fpo.farmers', 'Farmers')}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-[#07875B]">{inv.totalQuantityKg.toLocaleString()} kg</p>
                  <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-200">
                    <span>{t('fpo.avgAskingRate', 'Avg Asking Rate')}:</span>
                    <span className="font-bold text-slate-800">₹{inv.avgAskingPrice}/kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Open Buyer Requirements */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">{t('fpo.activeBuyerReqs', 'Active Bulk Buyer Requirements in Region')}</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {fpoData?.activeRequirements?.slice(0, 5).map((req) => (
                <div key={req.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{t('crops.' + req.cropName, req.cropName)}</span>
                    <span className="text-slate-500 block">
                      Target: {req.quantityKg.toLocaleString()} kg • Max Rate: ₹{req.maxPricePerKg}/kg • Buyer: {req.buyer?.organizationName || 'Supermarket Chain'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequirementId(req.id);
                      setActiveTab('AGGREGATION');
                    }}
                    className="self-start sm:self-auto px-3.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold rounded-xl border border-sky-200 transition-colors cursor-pointer"
                  >
                    {t('fpo.matchAndAggregate', 'Match & Aggregate Supply →')}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: MEMBER FARMERS DIRECTORY */}
      {activeTab === 'MEMBERS' && (
        <div className="space-y-6 animate-fade-in">

          {/* Member Search Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 text-xs">
            <div className="relative flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder={t('fpo.searchMembersPlaceholder', 'Search member farmers by name or village...')}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-sky-600 transition-all font-medium"
                />
              </div>
              <VoiceInput
                onResult={(t) => setMemberSearch(t)}
                title={t('voice.speakSearchTerm', 'Speak search term')}
              />
            </div>
            <div className="text-xs text-slate-500 font-bold whitespace-nowrap">
              {t('fpo.showingMembersCount', { filtered: filteredMembers.length, total: activeMembersList.length, defaultValue: `Showing ${filteredMembers.length} of ${activeMembersList.length} members` })}
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                {t('fpo.noMembersFound', `No member farmers found matching "${memberSearch}".`)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-extrabold tracking-wider border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="p-4">{t('fpo.farmerMember', 'Farmer Member')}</th>
                      <th className="p-4">{t('location.village', 'Village / Location')}</th>
                      <th className="p-4">{t('farmer.landSizeAcres', 'Land Holding')}</th>
                      <th className="p-4">{t('fpo.contributedLots', 'Contributed Lots')}</th>
                      <th className="p-4">{t('fpo.totalSupply', 'Total Supply (kg)')}</th>
                      <th className="p-4">{t('common.status', 'Status')}</th>
                      <th className="p-4 text-right">{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredMembers.map((m) => {
                      const totalMemberQty = (m.listings || []).reduce((s, l) => s + l.quantityKg, 0);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                            {m.user?.name || 'Member Farmer'}
                          </td>
                          <td className="p-4 text-slate-600">{m.user?.village || 'Manchar'}, {m.user?.district || 'Pune'}</td>
                          <td className="p-4 font-bold text-slate-800">{m.landSizeAcres || 2.5} {t('farmer.acres', 'Acres')}</td>
                          <td className="p-4 text-slate-700">{m.listings?.length || 0} {m.listings?.length === 1 ? t('farmer.activeLot', 'Lot') : t('farmer.activeLots', 'Lots')}</td>
                          <td className="p-4 font-black text-[#07875B]">{totalMemberQty.toLocaleString()} kg</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#07875B] font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                              <ShieldCheck className="w-3 h-3" /> {t('status.VERIFIED', 'VERIFIED')}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleViewMemberDetails(m)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> {t('fpo.viewProduceLots', 'View Produce Lots')}
                            </button>
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

      {/* TAB 3: PRODUCE AGGREGATION ENGINE */}
      {activeTab === 'AGGREGATION' && (
        <div className="space-y-6 animate-fade-in">

          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold mb-1">
                  <Layers className="w-3.5 h-3.5" /> {t('fpo.smallholderAggregationEngine', 'Smallholder Aggregation Engine')}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">{t('fpo.multiFarmerProduceAggregation', 'Multi-Farmer Produce Aggregation')}</h2>
                <p className="text-xs text-slate-500">
                  {t('fpo.aggregationSubtitle', 'Select member farmer lots below or use voice dictation to assemble a consolidated batch satisfying bulk requirements.')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVoiceModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>{t('fpo.smartVoiceAggregation', 'Smart Voice Aggregation')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunAggregation}
                  disabled={selectedListings.length === 0}
                  className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Layers className="w-4 h-4" /> {t('fpo.aggregateSelectedLotsBtn', { count: selectedListings.length, defaultValue: `Aggregate ${selectedListings.length} Selected Lots` })}
                </button>
              </div>
            </div>

            {/* Explicit Weighted Asking Rate Explainer Card */}
            <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-5 rounded-2xl border border-sky-800/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-800/50 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-sky-400" />
                  {t('fpo.weightedRateTitle', 'Weighted Average Asking Rate Calculation Principle')}
                </span>
                <span className="bg-sky-500/20 text-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-400/30">
                  {t('fpo.fairPricingFormula', 'Fair Smallholder Pricing Formula')}
                </span>
              </div>
              <div className="text-xs space-y-2 text-slate-200">
                <p className="leading-relaxed">
                  {t('fpo.weightedRateDesc', 'When multiple smallholders contribute different lot sizes at varying asking prices, simple averaging is mathematically unfair. SasyaVahini computes the exact volume-weighted asking rate:')}
                </p>
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 font-mono text-xs text-sky-200">
                  Weighted Rate = Σ(Quantity_i × Asking_Price_i) ÷ Σ(Quantity_i)
                </div>
                <div className="bg-sky-900/40 p-3 rounded-xl border border-sky-700/40 text-[11px] text-sky-100">
                  <strong>{t('fpo.exampleWalkthrough', 'Example Walkthrough:')}</strong>
                  <br />
                  Farmer A: 100 kg @ ₹20/kg (₹2,000) + Farmer B: 200 kg @ ₹25/kg (₹5,000)
                  <br />
                  Consolidated Pool = (₹2,000 + ₹5,000) ÷ (100 kg + 200 kg) = ₹7,000 ÷ 300 kg = <strong>₹23.33/kg</strong>.
                </div>
              </div>
            </div>

            {/* Aggregation Result Alert Box */}
            {aggregationResult && (
              <div className="bg-emerald-50 border-2 border-emerald-500 p-5 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[#07875B] fill-emerald-100 flex-shrink-0" />
                  {aggregationResult.message}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3.5 rounded-xl border border-emerald-200">
                  <div>
                    <span className="text-slate-400 block font-medium">{t('fpo.totalAggregatedConsignment', 'Total Aggregated Consignment')}</span>
                    <span className="font-black text-[#07875B] text-base">{aggregationResult.totalAggregatedQty.toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">{t('fpo.participatingFarmers', 'Participating Smallholders')}</span>
                    <span className="font-extrabold text-slate-900">{aggregationResult.participatingFarmersCount} {t('fpo.farmers', 'Member Farmers')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">{t('fpo.consolidatedWeightedRate', 'Consolidated Weighted Rate')}</span>
                    <span className="font-black text-[#07875B] text-base">₹{aggregationResult.weightedAvgPricePerKg}/kg</span>
                  </div>
                </div>

                {/* Farmers Breakdown Traceability */}
                <div className="pt-2">
                  <p className="text-xs font-bold text-slate-700 mb-2">{t('fpo.itemizedTraceability', 'Itemized Member Traceability Breakdown:')}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {aggregationResult.farmersBreakdown.map((f, idx) => (
                      <span key={idx} className="bg-white border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-xl font-semibold shadow-xs">
                        🌾 <strong>{f.farmerName}</strong> ({f.village}): {f.quantityKg.toLocaleString()} kg @ ₹{f.askingPricePerKg}/kg
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Selectable Member Listings Table */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <p className="font-extrabold text-slate-800">{t('fpo.availableMemberLots', 'Available Member Farmer Lots:')}</p>
                <span className="text-slate-500">{t('fpo.selectedLotsCount', { count: selectedListings.length, defaultValue: `${selectedListings.length} lots selected for consignment` })}</span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-extrabold tracking-wider border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="p-3 w-12 text-center">{t('common.select', 'Select')}</th>
                      <th className="p-3">{t('fpo.farmerMember', 'Farmer Name')}</th>
                      <th className="p-3">{t('farmer.produce', 'Crop Produce')}</th>
                      <th className="p-3">{t('farmer.availableStock', 'Available Quantity')}</th>
                      <th className="p-3">{t('farmer.ratePerKg', 'Asking Rate')}</th>
                      <th className="p-3">{t('farmer.qualityGradeLabel', 'Grade')}</th>
                      <th className="p-3">{t('location.farmPickupPin', 'Farm Location')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {fpoData?.fpoListings?.map((item) => {
                      const isSelected = selectedListings.includes(item.id);
                      return (
                        <tr key={item.id} className={isSelected ? 'bg-sky-50/80 font-bold' : 'hover:bg-slate-50'}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleListingSelect(item.id)}
                              className="accent-sky-600 rounded w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-bold text-slate-900">{item.farmer?.user?.name || 'Member Farmer'}</td>
                          <td className="p-3 text-[#07875B] font-bold flex items-center gap-1.5">
                            {t('crops.' + item.cropName, item.cropName)} {item.isOrganic && <span className="text-[10px] bg-emerald-100 px-1 py-0.2 rounded font-extrabold">Org</span>}
                          </td>
                          <td className="p-3 font-bold text-slate-800">{item.quantityKg.toLocaleString()} kg</td>
                          <td className="p-3 text-slate-900 font-bold">₹{item.askingPricePerKg}/kg</td>
                          <td className="p-3"><span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">{item.qualityGrade}</span></td>
                          <td className="p-3 text-slate-500">{item.location || 'Pune Region'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: INSTITUTIONAL ALLOCATION PROPOSALS */}
      {activeTab === 'PROPOSALS' && (
        <div className="space-y-6 animate-fade-in">

          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{t('fpo.institutionalProposalsTab', 'FPO-Level Institutional Allocation Proposals')}</h3>
              <p className="text-xs text-slate-500">
                {t('fpo.institutionalProposalsDesc', "Large institutional purchase requirements mapped to this FPO's collective capacity.")}
              </p>
            </div>

            {proposals.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">{t('fpo.noActiveProposals', 'No active institutional proposals pending.')}</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 text-xs">
                {proposals.map((prop) => (
                  <div key={prop.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-base">{t('crops.' + prop.cropName, prop.cropName)}</span>
                        <span className="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {prop.proposedQuantityKg.toLocaleString()} kg {t('proposals.required', 'Required')}
                        </span>
                        <span className="bg-emerald-100 text-[#07875B] font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {prop.matchScore}% {t('fpo.collectiveMatch', 'Collective Match')}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        {t('proposals.buyer', 'Buyer')}: <strong>{prop.buyerName}</strong> ({prop.buyerType}) • {t('proposals.destination', 'Destination')}: {prop.deliveryLocation}
                      </p>
                      <p className="text-slate-400 text-[11px]">{t('proposals.requiredBy', 'Required By')}: {prop.requiredByDate}</p>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-auto">
                      <div className="text-right">
                        <span className="text-slate-400 block text-[11px]">{t('proposals.maxOfferedRate', 'Max Offered Rate')}</span>
                        <span className="font-black text-[#07875B] text-lg">₹{prop.offeredPricePerKg}/kg</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('AGGREGATION');
                        }}
                        className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        {t('fpo.aggregateMemberSupply', 'Aggregate Member Supply →')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODALS */}
      <FpoMemberDetailsModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        member={selectedMember}
      />

      <FpoProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        fpoProfile={fpoData?.fpoProfile}
        user={user}
        onProfileUpdated={() => {
          refreshUser();
          fetchFpoDashboard();
        }}
      />

      <FpoVoiceAggregationModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onApplyLots={handleApplyVoiceLots}
      />

    </div>
  );
};

export default FpoDashboard;
