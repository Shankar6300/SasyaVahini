import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Building, Users, Layers, ShoppingBag, CheckCircle2,
  ShieldCheck, Package, Search, Eye,
  MapPin, UserCheck, Mic, Calculator, AlertCircle,
  UserPlus, UserMinus, Truck, Clock, RefreshCw, ShieldAlert,
  UserX, Inbox, Send, Check, X as CloseIcon, Ban
} from 'lucide-react';

import FpoMemberDetailsModal from '../../components/fpo/FpoMemberDetailsModal';
import FpoProfileModal from '../../components/fpo/FpoProfileModal';
import FpoVoiceAggregationModal from '../../components/fpo/FpoVoiceAggregationModal';
import FpoAddMemberModal from '../../components/fpo/FpoAddMemberModal';
import FpoMemberProduceTab from '../../components/fpo/FpoMemberProduceTab';
import FpoStockAggregationTab from '../../components/fpo/FpoStockAggregationTab';
import FpoProduceLotsTab from '../../components/fpo/FpoProduceLotsTab';
import FpoBulkRequirementsTab from '../../components/fpo/FpoBulkRequirementsTab';
import FpoDeliveryManagementTab from '../../components/fpo/FpoDeliveryManagementTab';
import FpoSettlementsTab from '../../components/fpo/FpoSettlementsTab';
import LanguageSelector from '../../components/LanguageSelector';
import VoiceAssistant from '../../components/VoiceAssistant';
import VoiceInput from '../../components/VoiceInput';
import NotificationBell from '../../components/NotificationBell';

const FpoDashboard = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();

  // Tab State: 'OVERVIEW' | 'MEMBERS' | 'AGGREGATION' | 'PROPOSALS' | 'ORDERS'
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  // Core Data
  const [fpoData, setFpoData] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter in Member Directory
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  const [memberSubTab, setMemberSubTab] = useState('DIRECTORY'); // 'DIRECTORY' | 'REQUESTS' | 'INVITATIONS'
  const [joinRequests, setJoinRequests] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [reqActionLoading, setReqActionLoading] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);

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

      try {
        const [reqRes, invRes] = await Promise.allSettled([
          api.get('/fpo/join-requests'),
          api.get('/fpo/invitations')
        ]);
        if (reqRes.status === 'fulfilled') {
          const raw = reqRes.value.data?.data || reqRes.value.data || [];
          setJoinRequests(Array.isArray(raw) ? raw : []);
        }
        if (invRes.status === 'fulfilled') {
          const raw = invRes.value.data?.data || invRes.value.data || [];
          setSentInvitations(Array.isArray(raw) ? raw : []);
        }
      } catch (err) {
        console.warn('Could not fetch membership workflows:', err);
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
        village: 'Member Cluster',
        quantityKg: parseFloat(l.quantityKg) || 0,
        askingPricePerKg: parseFloat(l.askingPricePerKg) || 0
      }))
    });
  };

  const handleViewMemberDetails = (member) => {
    setSelectedMember(member);
    setMemberModalOpen(true);
  };

  const handleVerifyMember = async (memberId) => {
    try {
      await api.patch(`/fpo/members/${memberId}/verify`);
      fetchFpoDashboard();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    }
  };

  const handleSuspendMember = async (memberId, memberName) => {
    if (!window.confirm(t('fpo.confirmSuspendMember', `Are you sure you want to suspend ${memberName || 'this farmer'}? They will be unable to contribute new produce to aggregated lots until reactivated.`))) {
      return;
    }
    try {
      const res = await api.patch(`/fpo/members/${memberId}/suspend`);
      alert(res.data?.data?.message || t('fpo.suspendSuccess', 'Member account suspended.'));
      fetchFpoDashboard();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    }
  };

  const handleReactivateMember = async (memberId, memberName) => {
    try {
      const res = await api.patch(`/fpo/members/${memberId}/reactivate`);
      alert(res.data?.data?.message || t('fpo.reactivateSuccess', 'Member account reactivated successfully.'));
      fetchFpoDashboard();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    }
  };

  const handleApproveJoinRequest = async (requestId, farmerName) => {
    setReqActionLoading(requestId);
    try {
      const res = await api.post(`/fpo/join-requests/${requestId}/approve`);
      alert(res.data?.data?.message || t('fpo.joinRequestApproved', `${farmerName || 'Farmer'} enrolled successfully into your cooperative!`));
      fetchFpoDashboard();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setReqActionLoading(null);
    }
  };

  const handleRejectJoinRequest = async (requestId, farmerName) => {
    const reason = window.prompt(t('fpo.enterRejectionReason', `Enter reason for declining ${farmerName || 'this farmer'}'s request (optional):`));
    if (reason === null) return;

    setReqActionLoading(requestId);
    try {
      const res = await api.post(`/fpo/join-requests/${requestId}/reject`, { reason });
      alert(res.data?.data?.message || t('fpo.joinRequestRejected', 'Join request declined.'));
      fetchFpoDashboard();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setReqActionLoading(null);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm(t('fpo.confirmCancelInvitation', 'Are you sure you want to cancel this sent invitation?'))) {
      return;
    }
    setReqActionLoading(invitationId);
    try {
      const res = await api.delete(`/fpo/invitations/${invitationId}`);
      alert(res.data?.data?.message || t('fpo.invitationCancelled', 'Invitation cancelled.'));
      fetchFpoDashboard();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setReqActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(t('fpo.confirmUnlinkMember', `Are you sure you want to unlink ${memberName || 'this farmer'} from your FPO? All active orders, deliveries, and payment records will be preserved safely.`))) {
      return;
    }
    try {
      const res = await api.delete(`/fpo/members/${memberId}`);
      alert(res.data?.data?.message || t('fpo.memberUnlinkedSuccess', 'Farmer unlinked successfully.'));
      fetchFpoDashboard();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    }
  };

  // Database-driven metrics (strictly un-shadowed)
  const activeMembersList = fpoData?.memberFarmers || [];
  const memberCount = fpoData?.memberCount ?? activeMembersList.length ?? 0;
  const activeCount = fpoData?.activeMemberCount ?? activeMembersList.filter(m => m.user?.status === 'ACTIVE').length;
  const pendingCount = fpoData?.pendingMemberCount ?? activeMembersList.filter(m => m.user?.status === 'PENDING_VERIFICATION').length;
  const suspendedCount = fpoData?.suspendedMemberCount ?? activeMembersList.filter(m => m.user?.status === 'SUSPENDED').length;

  const inventory = fpoData?.inventoryMetrics || {
    availableStockKg: fpoData?.collectiveInventory?.reduce((s, i) => s + (i.availableQuantityKg || 0), 0) || 0,
    reservedStockKg: fpoData?.collectiveInventory?.reduce((s, i) => s + (i.reservedQuantityKg || 0), 0) || 0,
    soldStockKg: fpoData?.collectiveInventory?.reduce((s, i) => s + (i.soldQuantityKg || 0), 0) || 0,
    totalStockKg: fpoData?.collectiveInventory?.reduce((s, i) => s + (i.totalQuantityKg || 0), 0) || 0,
    activeLotsCount: fpoData?.fpoListings?.filter(l => l.status === 'AVAILABLE' || l.status === 'PARTIALLY_RESERVED').length || 0,
    totalLotsCount: fpoData?.fpoListings?.length || 0
  };

  const orders = fpoData?.orders || [];
  const activeOrdersCount = fpoData?.activeOrdersCount ?? orders.filter(o => ['PLACED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status)).length;
  const pendingBulkRequestsCount = fpoData?.pendingBulkRequestsCount ?? (fpoData?.activeRequirements?.length || 0);

  // Filtered members list
  const filteredMembers = activeMembersList.filter(m => {
    const name = m.user?.name || '';
    const village = m.village || m.user?.village || '';
    const matchesSearch = name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                          village.toLowerCase().includes(memberSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (memberStatusFilter === 'ACTIVE') return m.user?.status === 'ACTIVE';
    if (memberStatusFilter === 'PENDING') return m.user?.status === 'PENDING_VERIFICATION';
    if (memberStatusFilter === 'SUSPENDED') return m.user?.status === 'SUSPENDED';
    return true;
  });

  const isCertVerified = Boolean(fpoData?.fpoProfile?.registrationCertVerified);
  const locationString = fpoData?.fpoProfile?.address
    ? `${fpoData.fpoProfile.address}, ${fpoData.fpoProfile.district}, ${fpoData.fpoProfile.state}`
    : `${fpoData?.fpoProfile?.district || user?.district || 'Pune'}, ${fpoData?.fpoProfile?.state || user?.state || 'Maharashtra'}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">

      {/* 1. TOP FPO ORGANIZATION BANNER */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-sky-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-emerald-800/40">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
            <Building className="w-3.5 h-3.5 text-emerald-400" />
            🏢 {t('fpo.portalTitle', 'FPO Collective Marketing Hub • Smallholder Aggregation')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {fpoData?.fpoProfile?.fpoName || user?.name || t('fpo.defaultName', 'Producer Organization')}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              {locationString}
            </span>
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 font-bold">
              {t('fpo.regNoLabel', 'Reg')}: {fpoData?.fpoProfile?.registrationNo || 'Pending CIN'}
            </span>
            {/* Evidence-Based Verification Badge (Strictly no fake SFAC/NABARD) */}
            {isCertVerified ? (
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {t('fpo.certVerifiedBadge', 'Registration Certificate Verified')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> {t('fpo.pendingVerificationBadge', 'Self-Registered (Verification Pending)')}
              </span>
            )}
          </div>
        </div>

        {/* Banner Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <VoiceAssistant guideType="fpo" />
          <LanguageSelector />
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/20">
            <NotificationBell />
          </div>
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-300" />
            {t('fpo.orgProfile', 'Organization Profile')}
          </button>
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-right">
            <p className="text-[10px] text-emerald-200 uppercase font-extrabold tracking-wider">{t('fpo.registeredMembers', 'Registered Members')}</p>
            <p className="text-2xl font-black text-white">{memberCount} {t('fpo.farmers', 'Farmers')}</p>
          </div>
        </div>
      </div>

      {/* 2. TOP METRICS ROW (Strictly Database-Driven Values) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Cooperative Members */}
        <div
          onClick={() => setActiveTab('MEMBERS')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-emerald-300 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#07875B] flex items-center justify-center font-bold border border-emerald-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">{t('fpo.cooperativeMembers', 'Cooperative Members')}</p>
            <p className="text-2xl font-black text-slate-900">{memberCount} {t('fpo.farmers', 'Farmers')}</p>
            <span className="text-[10px] text-slate-500 font-medium">
              {activeCount} {t('fpo.active', 'active')} • {pendingCount} {t('fpo.pending', 'pending')}
            </span>
          </div>
        </div>

        {/* Card 2: Available Produce Stock */}
        <div
          onClick={() => setActiveTab('OVERVIEW')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-emerald-300 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#07875B] flex items-center justify-center font-bold border border-emerald-200">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">{t('fpo.totalAggregatedStock', 'Collective Available Stock')}</p>
            <p className="text-2xl font-black text-[#07875B]">{inventory.availableStockKg.toLocaleString()} kg</p>
            <span className="text-[10px] text-slate-500 font-medium">
              {t('fpo.acrossCrops', { count: fpoData?.collectiveInventory?.length || 0, defaultValue: `Across ${fpoData?.collectiveInventory?.length || 0} crop categories` })}
            </span>
          </div>
        </div>

        {/* Card 3: Reserved & Aggregated Lots */}
        <div
          onClick={() => setActiveTab('AGGREGATION')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-sky-300 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold border border-sky-200">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">{t('fpo.reservedAggregatedStock', 'Reserved / Sold Stock')}</p>
            <p className="text-2xl font-black text-sky-900">{inventory.reservedStockKg.toLocaleString()} kg</p>
            <span className="text-[10px] text-slate-500 font-medium">
              {inventory.activeLotsCount} {t('farmer.activeLots', 'Lots')} • {inventory.soldStockKg.toLocaleString()} kg {t('farmer.sold', 'sold')}
            </span>
          </div>
        </div>

        {/* Card 4: Institutional Proposals & Orders */}
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
            <span className="text-[10px] text-amber-700 font-bold">
              {activeOrdersCount} {t('fpo.activeOrders', 'active orders')} • {pendingBulkRequestsCount} {t('fpo.buyerReqs', 'bulk reqs')}
            </span>
          </div>
        </div>

      </div>

      {/* 3. TAB NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto text-xs font-bold">
        {[
          { key: 'OVERVIEW', label: '🏢 ' + t('fpo.tabCollectiveStock', 'Collective Stock & Overview') },
          { key: 'MEMBERS', label: '👨‍🌾 ' + t('fpo.tabMemberDirectory', 'Member Farmers Directory') + ` (${memberCount})` },
          { key: 'MEMBER_PRODUCE', label: '🌾 ' + t('fpo.tabMemberProduce', 'Member Produce & Contributions') },
          { key: 'AGGREGATION', label: '⚡ ' + t('fpo.aggregationEngineTab', 'Produce Aggregation Engine') },
          { key: 'LOTS', label: '📦 ' + t('fpo.tabProduceLots', 'Produce Lots Directory') },
          { key: 'PROPOSALS', label: '📋 ' + t('fpo.institutionalProposalsTab', 'Bulk Procurement & Quotations') },
          { key: 'ORDERS', label: '🚚 ' + t('fpo.ordersDeliveryTab', 'Orders & Logistics Tracking') + ` (${orders.length})` },
          { key: 'SETTLEMENTS', label: '💰 ' + t('fpo.tabSettlements', 'Farmer Settlements & Payouts') }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-2 sm:px-4 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.key
                ? 'border-[#07875B] text-[#07875B] font-extrabold'
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

          {/* Anti Double-Counting Notice */}
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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">{t('fpo.collectiveInventoryByCrop', 'Collective Inventory by Crop')}</h3>
                <p className="text-xs text-slate-500">{t('fpo.liveAggregatedSupplyDesc', 'Live aggregated supply available across all registered member farmers.')}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('AGGREGATION')}
                className="px-4 py-2 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Layers className="w-4 h-4" /> {t('fpo.openAggregationEngine', 'Open Aggregation Engine')}
              </button>
            </div>

            {(!fpoData?.collectiveInventory || fpoData.collectiveInventory.length === 0) ? (
              <div className="p-10 text-center space-y-3 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">{t('fpo.noInventoryYet', 'No collective produce stock listed yet.')}</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  {t('fpo.noInventoryDesc', 'When member farmers list their harvest lots, collective supply will aggregate and calculate fair weighted rates automatically.')}
                </p>
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-50 text-[#07875B] border border-emerald-200 hover:bg-emerald-100 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 inline mr-1" /> {t('fpo.addMemberTitle', 'Enroll Member Farmer')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {fpoData.collectiveInventory.map((inv, idx) => (
                  <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 hover:border-emerald-300 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900 text-base">{t('crops.' + inv.cropName, inv.cropName)}</span>
                      <span className="bg-emerald-100 text-[#07875B] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {inv.farmerCount} {t('fpo.farmers', 'Farmers')}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-[#07875B]">{inv.availableQuantityKg.toLocaleString()} kg</p>
                    <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-200">
                      <span>{t('fpo.avgAskingRate', 'Avg Asking Rate')}:</span>
                      <span className="font-bold text-slate-800">₹{inv.avgAskingPrice}/kg</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Bulk Buyer Requirements in Region */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{t('fpo.activeBuyerReqs', 'Active Bulk Buyer Requirements in Region')}</h3>
                <p className="text-xs text-slate-500">{t('fpo.activeBuyerReqsSubtitle', 'High-volume purchase tenders seeking aggregated supply.')}</p>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {fpoData?.activeRequirements?.length || 0} {t('common.open', 'Open')}
              </span>
            </div>

            {(!fpoData?.activeRequirements || fpoData.activeRequirements.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                {t('fpo.noBuyerReqs', 'No open bulk requirements in your operating region at this moment.')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {fpoData.activeRequirements.slice(0, 5).map((req) => (
                  <div key={req.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{t('crops.' + req.cropName, req.cropName)}</span>
                      <span className="text-slate-500 block">
                        Target: {req.quantityKg.toLocaleString()} kg • Max Rate: ₹{req.maxPricePerKg}/kg • Buyer: {req.buyer?.organizationName || 'Verified Procurement Partner'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequirementId(req.id);
                        setActiveTab('AGGREGATION');
                      }}
                      className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-50 text-[#07875B] hover:bg-emerald-100 font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                    >
                      {t('fpo.matchAndAggregate', 'Match & Aggregate Supply →')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: MEMBER FARMERS MANAGEMENT & DIRECTORY */}
      {activeTab === 'MEMBERS' && (
        <div className="space-y-6 animate-fade-in">

          {/* Sub-Tab Navigation Header */}
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setMemberSubTab('DIRECTORY')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  memberSubTab === 'DIRECTORY'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-[#07875B]" />
                <span>{t('fpo.activeMembersSubtab', 'Member Directory')}</span>
                <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {activeMembersList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMemberSubTab('REQUESTS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  memberSubTab === 'REQUESTS'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Inbox className="w-4 h-4 text-amber-600" />
                <span>{t('fpo.joinRequestsSubtab', 'Incoming Join Requests')}</span>
                {joinRequests.filter((r) => r.status === 'PENDING').length > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                    {joinRequests.filter((r) => r.status === 'PENDING').length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMemberSubTab('INVITATIONS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  memberSubTab === 'INVITATIONS'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Send className="w-4 h-4 text-sky-600" />
                <span>{t('fpo.sentInvitationsSubtab', 'Sent Invitations')}</span>
                {sentInvitations.filter((i) => i.status === 'PENDING').length > 0 && (
                  <span className="bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                    {sentInvitations.filter((i) => i.status === 'PENDING').length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAddMemberModalOpen(true)}
              className="px-4 py-2 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold rounded-2xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('fpo.enrollButton', 'Search & Invite Farmer')}</span>
            </button>
          </div>

          {/* SUBTAB 1: ACTIVE DIRECTORY */}
          {memberSubTab === 'DIRECTORY' && (
            <div className="space-y-4">
              {/* Action & Filter Bar */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-xs">
                <div className="relative flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder={t('fpo.searchMembersPlaceholder', 'Search member farmers by name or village...')}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#07875B] transition-all font-medium"
                    />
                  </div>
                  <VoiceInput
                    onResult={(val) => setMemberSearch(val)}
                    title={t('voice.speakSearchTerm', 'Speak search term')}
                  />
                </div>

                {/* Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: 'ALL', label: t('common.all', 'All') + ` (${memberCount})` },
                    { key: 'ACTIVE', label: t('status.ACTIVE', 'Active') + ` (${activeCount})` },
                    { key: 'PENDING', label: t('status.PENDING', 'Pending') + ` (${pendingCount})` },
                    { key: 'SUSPENDED', label: t('status.SUSPENDED', 'Suspended') + ` (${suspendedCount})` }
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setMemberStatusFilter(f.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        memberStatusFilter === f.key
                          ? 'bg-[#07875B] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Members Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {filteredMembers.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <Users className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700 text-sm">
                      {memberSearch
                        ? t('fpo.noMembersFound', `No member farmers found matching "${memberSearch}".`)
                        : t('fpo.noMembersEnrolled', 'No member farmers enrolled in this cooperative yet.')}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {t('fpo.noMembersEnrolledDesc', 'Enroll or invite your regional farmers to aggregate their produce lots, track farm locations, and participate in bulk institutional contracts.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAddMemberModalOpen(true)}
                      className="px-4 py-2 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{t('fpo.enrollFirstMember', 'Enroll or Invite First Member Farmer')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-extrabold tracking-wider border-b border-slate-200 text-[10px]">
                        <tr>
                          <th className="p-4">{t('fpo.farmerMember', 'Farmer Member')}</th>
                          <th className="p-4">{t('auth.phone', 'Contact')}</th>
                          <th className="p-4">{t('location.village', 'Village / District')}</th>
                          <th className="p-4">{t('farmer.landSizeAcres', 'Land Holding')}</th>
                          <th className="p-4">{t('fpo.contributedLots', 'Contributed Lots')}</th>
                          <th className="p-4">{t('fpo.totalSupply', 'Total Supply (kg)')}</th>
                          <th className="p-4">{t('fpo.membershipStatus', 'Membership')}</th>
                          <th className="p-4">{t('fpo.kycStatus', 'KYC Verification')}</th>
                          <th className="p-4 text-right">{t('common.actions', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredMembers.map((m) => {
                          const totalMemberQty = (m.listings || []).reduce(
                            (s, l) => s + (l.totalQuantityKg || l.quantityKg || 0),
                            0
                          );
                          const isPending = m.user?.status === 'PENDING_VERIFICATION';
                          const isSuspended = m.user?.status === 'SUSPENDED';
                          const isKycVerified = Boolean(m.aadhaarVerified || m.bankAccountVerified);

                          return (
                            <tr key={m.id} className="hover:bg-slate-50">
                              <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    isSuspended ? 'bg-rose-500' : isPending ? 'bg-amber-400' : 'bg-[#07875B]'
                                  }`}
                                ></span>
                                {m.user?.name || 'Member Farmer'}
                              </td>
                              <td className="p-4 text-slate-600">{m.user?.phone || '—'}</td>
                              <td className="p-4 text-slate-600">
                                {m.village || m.user?.village || 'Member Hub'}, {m.district || m.user?.district || 'Pune'}
                              </td>
                              <td className="p-4 font-bold text-slate-800">
                                {m.landSizeAcres || 1.0} {t('farmer.acres', 'Acres')}
                              </td>
                              <td className="p-4 text-slate-700">
                                {m.listings?.length || 0}{' '}
                                {m.listings?.length === 1 ? t('farmer.activeLot', 'Lot') : t('farmer.activeLots', 'Lots')}
                              </td>
                              <td className="p-4 font-black text-[#07875B]">{totalMemberQty.toLocaleString()} kg</td>
                              <td className="p-4">
                                {isSuspended ? (
                                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                    <UserX className="w-3 h-3" /> {t('status.SUSPENDED', 'SUSPENDED')}
                                  </span>
                                ) : isPending ? (
                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                    <Clock className="w-3 h-3" /> {t('status.PENDING', 'PENDING')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#07875B] font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                    <CheckCircle2 className="w-3 h-3" /> {t('status.ACTIVE', 'ACTIVE')}
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                {isKycVerified ? (
                                  <span
                                    className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full text-[10px]"
                                    title="Aadhaar / Bank Account Verified"
                                  >
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> {t('fpo.kycVerified', 'Verified')}
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 font-bold px-2 py-0.5 rounded-full text-[10px]"
                                    title="Identity verification pending review"
                                  >
                                    <ShieldAlert className="w-3 h-3 text-slate-400" /> {t('fpo.kycPending', 'Pending Review')}
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                                {isPending && (
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyMember(m.id)}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition-colors cursor-pointer text-[11px]"
                                  >
                                    {t('fpo.verifyMember', 'Activate')}
                                  </button>
                                )}
                                {!isSuspended && !isPending && (
                                  <button
                                    type="button"
                                    onClick={() => handleSuspendMember(m.id, m.user?.name)}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition-colors inline-flex items-center gap-1 cursor-pointer text-[11px]"
                                    title={t('fpo.suspendTooltip', 'Temporarily suspend member participation')}
                                  >
                                    <Ban className="w-3.5 h-3.5 text-amber-600" /> {t('fpo.suspend', 'Suspend')}
                                  </button>
                                )}
                                {isSuspended && (
                                  <button
                                    type="button"
                                    onClick={() => handleReactivateMember(m.id, m.user?.name)}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#07875B] font-bold rounded-lg border border-emerald-200 transition-colors inline-flex items-center gap-1 cursor-pointer text-[11px]"
                                    title={t('fpo.reactivateTooltip', 'Restore member account to active standing')}
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> {t('fpo.reactivate', 'Reactivate')}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleViewMemberDetails(m)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-[#07875B] text-slate-700 font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer text-[11px]"
                                >
                                  <Eye className="w-3.5 h-3.5" /> {t('fpo.viewProduceLots', 'Lots')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(m.id, m.user?.name)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition-colors inline-flex items-center gap-1 cursor-pointer text-[11px]"
                                  title={t('fpo.unlinkTooltip', 'Safely unlink member (preserves active orders & commitments)')}
                                >
                                  <UserMinus className="w-3.5 h-3.5" /> {t('fpo.unlink', 'Unlink')}
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

          {/* SUBTAB 2: INCOMING JOIN REQUESTS (Workflow B) */}
          {memberSubTab === 'REQUESTS' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-amber-600" />
                    {t('fpo.joinRequestsTitle', 'Incoming Farmer Membership Applications')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('fpo.joinRequestsSubtitle', 'Local farmers requesting to affiliate with your FPO for collective aggregation.')}
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {joinRequests.filter((r) => r.status === 'PENDING').length} {t('common.pending', 'Pending Review')}
                </span>
              </div>

              {joinRequests.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">
                    {t('fpo.noJoinRequests', 'No pending join requests from farmers at this time.')}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {t('fpo.noJoinRequestsDesc', 'When independent farmers discover your FPO in their directory and submit applications, they will appear here for review.')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 text-xs">
                  {joinRequests.map((req) => {
                    const isPending = req.status === 'PENDING';
                    const isApproved = req.status === 'APPROVED';
                    const isRejected = req.status === 'REJECTED';

                    return (
                      <div
                        key={req.id}
                        className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                          isPending ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">{req.farmerName}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : isApproved
                                  ? 'bg-emerald-100 text-[#07875B]'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {req.status}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {new Date(req.requestedAt || req.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-slate-600 text-[11px]">
                            <span>
                              <strong>{t('location.village', 'Location')}:</strong> {req.village || 'Hub'}, {req.district || 'Pune'}
                            </span>
                            <span>
                              <strong>{t('farmer.landSizeAcres', 'Land')}:</strong> {req.landSizeAcres || 1} {t('farmer.acres', 'Acres')}
                            </span>
                            {req.farmerPhone && (
                              <span>
                                <strong>{t('auth.phone', 'Phone')}:</strong> {req.farmerPhone}
                              </span>
                            )}
                          </div>

                          {req.produceTypes && req.produceTypes.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Crops:</span>
                              {req.produceTypes.map((crop, idx) => (
                                <span key={idx} className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-semibold text-slate-700">
                                  {crop}
                                </span>
                              ))}
                            </div>
                          )}

                          {req.remarks && (
                            <p className="text-[11px] text-slate-600 italic bg-white/80 p-2 rounded-xl border border-slate-200 mt-1">
                              "{req.remarks}"
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        {isPending ? (
                          <div className="flex items-center gap-2 self-end md:self-center">
                            <button
                              type="button"
                              disabled={reqActionLoading === req.id}
                              onClick={() => handleApproveJoinRequest(req.id, req.farmerName)}
                              className="px-3.5 py-2 bg-[#07875B] hover:bg-[#056b48] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {reqActionLoading === req.id ? t('common.enrolling', 'Enrolling...') : t('fpo.approveEnroll', 'Approve & Enroll')}
                            </button>
                            <button
                              type="button"
                              disabled={reqActionLoading === req.id}
                              onClick={() => handleRejectJoinRequest(req.id, req.farmerName)}
                              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              <CloseIcon className="w-3.5 h-3.5" />
                              {t('common.decline', 'Decline')}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            {isApproved ? '✓ Member Enrolled' : 'Declined'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 3: SENT INVITATIONS (Workflow A) */}
          {memberSubTab === 'INVITATIONS' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Send className="w-5 h-5 text-sky-600" />
                    {t('fpo.sentInvitationsTitle', 'Outgoing Farmer Membership Invitations')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('fpo.sentInvitationsSubtitle', 'Invitations dispatched to registered farmers awaiting their consent to affiliate.')}
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {sentInvitations.filter((i) => i.status === 'PENDING').length} {t('common.pending', 'Awaiting Consent')}
                </span>
              </div>

              {sentInvitations.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Send className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">
                    {t('fpo.noInvitationsSent', 'No outgoing invitations dispatched yet.')}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {t('fpo.noInvitationsSentDesc', 'Use the "Search & Invite Farmer" action above to search regional farmers by phone or email and invite them.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddMemberModalOpen(true)}
                    className="px-4 py-2 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{t('fpo.inviteFirstFarmer', 'Search & Invite Farmer')}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 text-xs">
                  {sentInvitations.map((inv) => {
                    const isPending = inv.status === 'PENDING';
                    const isAccepted = inv.status === 'ACCEPTED';
                    const isRejected = inv.status === 'REJECTED';
                    const isExpired = inv.status === 'EXPIRED';
                    const isCancelled = inv.status === 'CANCELLED';

                    return (
                      <div
                        key={inv.id}
                        className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">{inv.farmerName || 'Invited Farmer'}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isPending
                                  ? 'bg-sky-100 text-sky-800'
                                  : isAccepted
                                  ? 'bg-emerald-100 text-[#07875B]'
                                  : isRejected
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {inv.status}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              Invited: {new Date(inv.invitedAt || inv.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-slate-600 text-[11px]">
                            {inv.farmerPhone && (
                              <span>
                                <strong>Phone:</strong> {inv.farmerPhone}
                              </span>
                            )}
                            {inv.farmerEmail && (
                              <span>
                                <strong>Email:</strong> {inv.farmerEmail}
                              </span>
                            )}
                            {inv.village && (
                              <span>
                                <strong>Village:</strong> {inv.village}, {inv.district || ''}
                              </span>
                            )}
                            {inv.landSizeAcres && (
                              <span>
                                <strong>Land:</strong> {inv.landSizeAcres} Acres
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        {isPending ? (
                          <button
                            type="button"
                            disabled={reqActionLoading === inv.id}
                            onClick={() => handleCancelInvitation(inv.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition-colors text-xs flex items-center gap-1 cursor-pointer self-end md:self-center"
                          >
                            <CloseIcon className="w-3.5 h-3.5" />
                            {reqActionLoading === inv.id ? t('common.cancelling', 'Cancelling...') : t('common.cancelInvitation', 'Cancel Invitation')}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            {isAccepted ? '✓ Joined Cooperative' : isRejected ? 'Declined by Farmer' : isCancelled ? 'Cancelled' : 'Expired'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* TAB 3: STOCK AGGREGATION ENGINE (PHASE 4) */}
      {activeTab === 'AGGREGATION' && (
        <FpoStockAggregationTab
          fpoProfile={fpoData?.fpoProfile}
          onLotCreated={() => {
            fetchFpoDashboard();
            setActiveTab('LOTS');
          }}
        />
      )}

      {/* TAB: PRODUCE LOTS DIRECTORY (PHASE 4) */}
      {activeTab === 'LOTS' && (
        <FpoProduceLotsTab
          fpoProfile={fpoData?.fpoProfile}
          onNavigateToAggregation={() => setActiveTab('AGGREGATION')}
        />
      )}

      {/* TAB 4: BULK REQUIREMENTS & QUOTATIONS (PHASE 5) */}
      {activeTab === 'PROPOSALS' && (
        <FpoBulkRequirementsTab
          fpoProfile={fpoData?.fpoProfile}
          onNavigateToLots={() => setActiveTab('LOTS')}
        />
      )}

      {/* TAB 5: ORDERS & LOGISTICS TRACKING (PHASE 6 MULTI-FARMER PICKUPS) */}
      {activeTab === 'ORDERS' && (
        <FpoDeliveryManagementTab fpoProfile={fpoData?.fpoProfile} />
      )}

      {/* TAB 6: SETTLEMENTS & PAYOUTS (PHASE 7) */}
      {activeTab === 'SETTLEMENTS' && (
        <FpoSettlementsTab fpoProfile={fpoData?.fpoProfile} />
      )}

            {/* TAB: MEMBER PRODUCE & CONTRIBUTIONS */}
      {activeTab === 'MEMBER_PRODUCE' && (
        <FpoMemberProduceTab fpoProfile={fpoData?.fpoProfile} />
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
        user={fpoData?.fpoProfile?.user || user}
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

      <FpoAddMemberModal
        isOpen={addMemberModalOpen}
        onClose={() => setAddMemberModalOpen(false)}
        onMemberAdded={() => {
          fetchFpoDashboard();
        }}
      />

    </div>
  );
};

export default FpoDashboard;
