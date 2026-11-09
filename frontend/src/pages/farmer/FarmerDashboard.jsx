import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Package, Plus, TrendingUp, DollarSign, AlertCircle, Trash2, Edit3,
  CheckCircle, ChevronRight, ShieldCheck, MapPin, Eye, Search,
  Layers, Bell, UserCheck, Sparkles, Sliders, LayoutDashboard,
  HandCoins, User, Wheat, Menu, X as XIcon, RefreshCw, ArrowUpRight, Info, Mic
} from 'lucide-react';
import MarketIntelligenceWidget from '../../components/ml/MarketIntelligenceWidget';

import ProduceListingModal from '../../components/farmer/ProduceListingModal';
import ProduceDetailsModal from '../../components/farmer/ProduceDetailsModal';
import FarmerProfileModal from '../../components/farmer/FarmerProfileModal';
import AllocationConsentSection from '../../components/farmer/AllocationConsentSection';
import FarmerEarningsSection from '../../components/farmer/FarmerEarningsSection';
import FarmerNotificationsModal from '../../components/farmer/FarmerNotificationsModal';
import SmartVoiceListingModal from '../../components/farmer/SmartVoiceListingModal';
import LanguageSelector from '../../components/LanguageSelector';
import VoiceAssistant from '../../components/VoiceAssistant';

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const styles = { AVAILABLE: 'bg-emerald-100 text-emerald-800 border-emerald-300', PROPOSED: 'bg-amber-100 text-amber-800 border-amber-300', RESERVED: 'bg-blue-100 text-blue-800 border-blue-300', SOLD: 'bg-slate-100 text-slate-700 border-slate-300' };
  const label = t('status.' + status, status);
  return <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border shadow-sm ${styles[status] || styles.AVAILABLE}`}>{label}</span>;
};

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, badge, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      active ? 'bg-[#07875B] text-white shadow-md' : 'text-[#64748B] hover:bg-[#E8F5E9] hover:text-[#07875B]'
    }`}
  >
    <Icon className="w-4 h-4 flex-shrink-0" />
    <span className="flex-1 text-left">{label}</span>
    {badge > 0 && (
      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'}`}>
        {badge}
      </span>
    )}
  </button>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, sub, onClick, alert }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl border p-4 flex items-start gap-3 transition-all ${onClick ? 'cursor-pointer hover:border-[#07875B]/30' : ''} ${alert ? 'border-amber-200 bg-amber-50/30' : 'border-[#E2E8F0] hover:border-slate-300'}`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div>
      <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className="text-xl font-black text-[#1F2937]">{value}</p>
      {sub && <p className="text-[11px] text-[#64748B] mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-4 mb-5">
    <div>
      <h2 className="text-base font-extrabold text-[#1F2937]">{title}</h2>
      {subtitle && <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed max-w-xl">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const FarmerDashboard = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [voiceListingModalOpen, setVoiceListingModalOpen] = useState(false);

  const [activeSection, setActiveSection] = useState('OVERVIEW');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [produceListings, setProduceListings] = useState([]);
  const [proposalsCount, setProposalsCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState(null);
  const [priceRec, setPriceRec] = useState(null);

  // Listing filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal state
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [listingModalMode, setListingModalMode] = useState('QUICK');
  const [selectedListingForEdit, setSelectedListingForEdit] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedListingForDetails, setSelectedListingForDetails] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);

  const fetchFarmerData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/farmers/produce');
      const raw = res.data?.data ?? res.data;
      setProduceListings(Array.isArray(raw) ? raw : []);

      try {
        const propRes = await api.get('/farmers/proposals');
        setProposalsCount(propRes.data.filter(p => p.status === 'PROPOSED').length);
      } catch { /* non-fatal */ }

      try {
        const notifRes = await api.get('/notifications');
        setUnreadCount(notifRes.data.filter(n => !n.isRead).length);
      } catch { /* non-fatal */ }

      try {
        const primaryCrop = res.data[0]?.cropName || 'Tomato';
        const loc = user?.village || user?.district || 'Pune';
        const [fcRes, prRes] = await Promise.allSettled([
          api.post('/forecast/demand', { crop: primaryCrop, location: loc }),
          api.post('/forecast/price', { crop: primaryCrop, location: loc, quantity: 1500 })
        ]);
        if (fcRes.status === 'fulfilled') setForecast(fcRes.value.data);
        if (prRes.status === 'fulfilled') setPriceRec(prRes.value.data);
      } catch { /* non-fatal */ }
    } catch (err) {
      console.error('Error fetching farmer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFarmerData(); }, [user]);

  const handleApplyVoiceParsed = (parsed) => {
    setSelectedListingForEdit({
      cropName: parsed.cropName || 'Tomato',
      category: parsed.category || 'Vegetables',
      quantityKg: parsed.quantityKg ? String(parsed.quantityKg) : '500',
      askingPricePerKg: parsed.askingPricePerKg ? String(parsed.askingPricePerKg) : '24',
      minPricePerKg: parsed.minPricePerKg ? String(parsed.minPricePerKg) : (parsed.askingPricePerKg ? String((parseFloat(parsed.askingPricePerKg) * 0.9).toFixed(1)) : '21'),
      qualityGrade: parsed.qualityGrade || 'GRADE_A',
      isOrganic: Boolean(parsed.isOrganic),
      location: (user?.village || user?.district) ? (user.village + ', ' + user.district) : 'Manchar, Pune'
    });
    setListingModalMode('QUICK');
    setVoiceListingModalOpen(false);
    setListingModalOpen(true);
  };

  const handleOpenAddModal = (mode = 'QUICK') => {
    setSelectedListingForEdit(null);
    setListingModalMode(mode);
    setListingModalOpen(true);
  };

  const handleOpenEditModal = (listing) => {
    setSelectedListingForEdit(listing);
    setListingModalMode('DETAILED');
    setListingModalOpen(true);
  };

  const handleOpenDetailsModal = (listing) => {
    setSelectedListingForDetails(listing);
    setDetailsModalOpen(true);
  };

  const handleDeleteProduce = async (id) => {
    if (!window.confirm('Remove this produce listing from the marketplace?')) return;
    try {
      await api.delete(`/farmers/produce/${id}`);
      fetchFarmerData();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const goTo = (section) => { setActiveSection(section); setSidebarOpen(false); };

  // Computed
  const available = produceListings.filter(i => i.status === 'AVAILABLE');
  const reserved  = produceListings.filter(i => i.status === 'RESERVED');
  const sold      = produceListings.filter(i => i.status === 'SOLD');
  const totalAvailKg = available.reduce((s, i) => s + i.quantityKg, 0);
  const totalResvKg  = reserved.reduce((s, i) => s + i.quantityKg, 0);

  const filteredListings = produceListings.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      (item.cropName.toLowerCase().includes(q) || (item.location || '').toLowerCase().includes(q)) &&
      (statusFilter === 'ALL' || item.status === statusFilter)
    );
  });

  const navItems = [
    { key: 'OVERVIEW',     label: t('farmer.overview', 'Overview'),                     icon: LayoutDashboard },
    { key: 'INTELLIGENCE', label: t('farmer.marketIntelligence', 'Market Intelligence'), icon: Sparkles },
    { key: 'LISTINGS',     label: t('farmer.myListings', 'My Listings'),               icon: Package,   badge: produceListings.length },
    { key: 'INVENTORY',    label: t('farmer.inventory', 'Inventory'),                 icon: Layers },
    { key: 'PROPOSALS',    label: t('farmer.proposals', 'Allocation Requests'),       icon: HandCoins, badge: proposalsCount },
    { key: 'EARNINGS',     label: t('farmer.earnings', 'Earnings'),                  icon: TrendingUp },
    { key: 'PROFILE',      label: t('farmer.profile', 'Profile'),                   icon: User },
  ];

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <RefreshCw className="w-7 h-7 text-[#07875B] animate-spin mx-auto" />
        <p className="text-sm text-[#64748B]">Loading your farm workspace…</p>
      </div>
    </div>
  );

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-[#07875B] flex items-center justify-center flex-shrink-0">
          <Wheat className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black text-[#07875B] leading-none">{t('farmer.portalTitle', 'FARMER PORTAL')}</p>
          <p className="text-[10px] text-[#64748B] leading-none mt-0.5 truncate">{user?.name || 'Farmer'}</p>
        </div>
      </div>
      {navItems.map(item => (
        <NavItem key={item.key} icon={item.icon} label={item.label} badge={item.badge}
          active={activeSection === item.key} onClick={() => goTo(item.key)} />
      ))}
      <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
        <button onClick={() => setVoiceListingModalOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-sm transition-all"><Mic className="w-3.5 h-3.5" /> {t('farmer.smartVoiceListing', 'Smart Voice Listing')}</button>
            <button onClick={() => handleOpenAddModal('QUICK')}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#07875B] hover:bg-[#056b48] text-white text-xs font-bold rounded-xl transition-all">
          <Plus className="w-3.5 h-3.5" /> {t('farmer.listProduceBtn', 'List Produce')}
        </button>
      </div>
    </>
  );

  // ── OVERVIEW ─────────────────────────────────────────────────────────────
  const OverviewSection = () => (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#1F2937]">
            {new Date().getHours() < 12 ? t('farmer.goodMorning', 'Good morning') : t('farmer.goodAfternoon', 'Good afternoon')}, {user?.name?.split(' ')[0] || t('auth.roleFarmer', 'Farmer')} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#64748B]">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {user?.village || 'Manchar'}, {user?.district || 'Pune'}</span>
            <span className="flex items-center gap-1 text-[#07875B] font-semibold"><ShieldCheck className="w-3 h-3" /> SasyaVahini Verified</span>
            {user?.farmerProfile?.landSizeAcres && (
              <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {user.farmerProfile.landSizeAcres} {t('farmer.acres', 'Acres')}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VoiceAssistant guideType="farmer" />
          <LanguageSelector />
          <button onClick={() => setNotificationsModalOpen(true)}
            className="relative p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#64748B] hover:text-[#07875B] hover:border-[#07875B]/30 transition-all">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          <button onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#64748B] hover:border-[#07875B]/30 transition-all">
            <UserCheck className="w-3.5 h-3.5" /> {t('farmer.profile', 'Profile')}
          </button>
        </div>
      </div>

      {/* Action needed */}
      {proposalsCount > 0 && (
        <div onClick={() => goTo('PROPOSALS')}
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">{t('farmer.proposalsNeedDecision', { count: proposalsCount, defaultValue: `${proposalsCount} allocation proposals need your decision` })}</p>
            <p className="text-xs text-amber-700">{t('farmer.proposalsNeedDecisionSub', 'Review and accept or reject buyer requests for your produce.')}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-600 flex-shrink-0" />
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Package}     iconBg="bg-[#E8F5E9]" iconColor="text-[#07875B]"
          label={t('farmer.availableStock', 'Available Stock')} value={`${totalAvailKg.toLocaleString()} kg`}
          sub={`${available.length} ${t('farmer.activeLots', 'active lots')}`} />
        <StatCard icon={ShieldCheck} iconBg="bg-blue-50"   iconColor="text-blue-600"
          label={t('farmer.reservedStock', 'Reserved')} value={`${totalResvKg.toLocaleString()} kg`}
          sub={`${reserved.length} ${t('farmer.committed', 'committed')}`} />
        <StatCard icon={HandCoins}   iconBg="bg-amber-50"  iconColor="text-amber-600"
          label={t('farmer.pendingProposals', 'Pending Proposals')} value={proposalsCount}
          sub={t('farmer.awaitingConsent', 'Awaiting consent')} alert={proposalsCount > 0} onClick={() => goTo('PROPOSALS')} />
        <StatCard icon={Layers}      iconBg="bg-slate-50"  iconColor="text-slate-500"
          label={t('farmer.totalListings', 'Total Listings')} value={produceListings.length}
          sub={`${sold.length} ${t('farmer.fulfilled', 'fulfilled')}`} />
      </div>

      {/* AI insights — best-effort */}
      {(forecast || priceRec) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {forecast && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#07875B]" />
                  <span className="text-xs font-extrabold text-[#1F2937] uppercase tracking-wider">AI Demand Forecast</span>
                </div>
                <span className="text-[10px] font-bold text-[#07875B] bg-[#E8F5E9] px-2 py-0.5 rounded-full border border-emerald-200">ML Model</span>
              </div>
              <div>
                <p className="text-lg font-black text-[#1F2937]">{forecast.crop}: <span className="text-[#07875B]">{forecast.demand_level}</span> Demand</p>
                <p className="text-xs text-[#64748B]">Regional estimate: {forecast.predicted_demand?.toLocaleString()} kg</p>
              </div>
              <ul className="space-y-1">
                {(forecast.explanations || []).slice(0, 3).map((exp, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-[#64748B]">
                    <CheckCircle className="w-3.5 h-3.5 text-[#07875B] flex-shrink-0 mt-0.5" /> {exp}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {priceRec && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#07875B]" />
                  <span className="text-xs font-extrabold text-[#1F2937] uppercase tracking-wider">Price Guidance</span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">AI Estimate</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-[#64748B]">Mandi range: {priceRec.market_range}</p>
                  <p className="text-xs text-[#64748B]">Recommended asking rate</p>
                </div>
                <p className="text-2xl font-black text-[#07875B]">₹{priceRec.recommended_price}<span className="text-sm font-bold text-[#64748B]">/kg</span></p>
              </div>
              <ul className="space-y-1">
                {(priceRec.explainability || []).slice(0, 3).map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-[#64748B]">
                    <ChevronRight className="w-3.5 h-3.5 text-[#07875B] flex-shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recent produce */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0]">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-[#1F2937] text-sm">{t('farmer.recentProduce', 'Recent Produce')}</h3>
            <p className="text-xs text-[#64748B] mt-0.5">{t('farmer.latestListings', 'Your latest listings')}</p>
          </div>
          <button onClick={() => goTo('LISTINGS')} className="text-xs font-semibold text-[#07875B] hover:underline flex items-center gap-1">
            {t('farmer.viewAll', 'View all')} <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        {produceListings.length === 0 ? (
          <div className="px-5 py-10 text-center space-y-3">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm text-[#64748B]">No produce listed yet.</p>
            <button onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#07875B] text-white font-bold rounded-xl text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Available Produce
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {produceListings.slice(0, 5).map(item => (
              <div key={item.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/70 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-base flex-shrink-0">🌾</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1F2937] text-sm truncate">{t('crops.' + item.cropName, item.cropName)}</span>
                    {item.isOrganic && <span className="text-[10px] font-bold text-[#07875B] bg-[#E8F5E9] px-1.5 py-0.5 rounded">{t('farmer.organicBadge', 'Organic 🌿')}</span>}
                  </div>
                  <span className="text-xs text-[#64748B]">{item.quantityKg.toLocaleString()} kg · {item.harvestDate}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-extrabold text-[#07875B] text-sm">₹{item.askingPricePerKg}/kg</span>
                  <StatusBadge status={item.status} />
                  <button onClick={() => handleOpenDetailsModal(item)}
                    className="p-1.5 text-[#64748B] hover:text-[#07875B] hover:bg-[#E8F5E9] rounded-lg transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── LISTINGS ─────────────────────────────────────────────────────────────
  const ListingsSection = () => (
    <div className="space-y-5">
      <SectionHeader
        title={t('farmer.myListings', 'My Produce Listings')}
        subtitle={t('farmer.inventoryDesc', 'Manage your harvest lots available for direct procurement on the marketplace.')}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => handleOpenAddModal('QUICK')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#07875B] bg-[#E8F5E9] border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all">
              <Sliders className="w-3.5 h-3.5" /> {t('farmer.quick', 'Quick')}
            </button>
            <button onClick={() => handleOpenAddModal('DETAILED')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#07875B] hover:bg-[#056b48] rounded-xl transition-all">
              <Plus className="w-3.5 h-3.5" /> {t('farmer.detailed', 'Detailed')}
            </button>
          </div>
        }
      />

      <div className="flex items-start gap-2 px-4 py-3 bg-[#E8F5E9]/50 border border-emerald-200 rounded-xl text-xs text-[#64748B]">
        <Info className="w-3.5 h-3.5 text-[#07875B] flex-shrink-0 mt-0.5" />
        <span><strong className="text-[#07875B]">Quick Listing</strong> — visual card workflow, mobile-friendly. <strong className="text-[#07875B]">Detailed Listing</strong> — full form with quality grade, certification and GPS location.</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('farmer.searchProducePlaceholder', 'Search produce by crop or location...')}
            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm outline-none focus:border-[#07875B] transition-all" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#1F2937] outline-none font-medium">
          <option value="ALL">{t('farmer.filterAll', 'All Statuses')}</option>
          <option value="AVAILABLE">{t('status.AVAILABLE', 'Available')}</option>
          <option value="RESERVED">{t('status.RESERVED', 'Reserved')}</option>
          <option value="SOLD">{t('status.SOLD', 'Sold')}</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {filteredListings.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-[#1F2937]">No listings match your filters.</p>
            <p className="text-xs text-[#64748B]">Clear search or add a new produce lot.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                <tr>
                  {[t('farmer.cropNameLabel', 'Crop'), t('farmer.quantityLabel', 'Qty (kg)'), t('farmer.harvestDate', 'Harvest Date'), t('farmer.askingPriceLabel', 'Asking Rate'), t('farmer.qualityGradeLabel', 'Grade'), t('common.status', 'Status'), ''].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredListings.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1F2937]">{t('crops.' + item.cropName, item.cropName)}</span>
                        {item.isOrganic && <span className="text-[10px] font-bold text-[#07875B] bg-[#E8F5E9] px-1.5 rounded">{t('farmer.organicBadge', 'Organic 🌿')}</span>}
                      </div>
                      {item.location && <p className="text-[#64748B] text-[11px] mt-0.5">{item.location}</p>}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F2937]">{item.quantityKg.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#64748B]">{item.harvestDate || '—'}</td>
                    <td className="px-4 py-3 font-extrabold text-[#07875B]">₹{item.askingPricePerKg}/kg</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 border border-[#E2E8F0] px-2 py-0.5 rounded font-bold text-[#1F2937]">{item.qualityGrade || '—'}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenDetailsModal(item)} title="View"
                          className="p-1.5 text-[#64748B] hover:text-[#07875B] hover:bg-[#E8F5E9] rounded-lg transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleOpenEditModal(item)} title="Edit"
                          className="p-1.5 text-[#64748B] hover:text-[#07875B] hover:bg-[#E8F5E9] rounded-lg transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteProduce(item.id)} title="Remove"
                          className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ── INVENTORY ─────────────────────────────────────────────────────────────
  const InventorySection = () => {
    const cropMap = {};
    for (const item of produceListings) {
      if (!cropMap[item.cropName]) cropMap[item.cropName] = { available: 0, reserved: 0, sold: 0, lots: 0 };
      cropMap[item.cropName].lots++;
      if (item.status === 'AVAILABLE') cropMap[item.cropName].available += item.quantityKg;
      else if (item.status === 'RESERVED') cropMap[item.cropName].reserved += item.quantityKg;
      else if (item.status === 'SOLD') cropMap[item.cropName].sold += item.quantityKg;
    }
    const crops = Object.entries(cropMap);

    return (
      <div className="space-y-5">
        <SectionHeader
          title={t('farmer.inventoryBreakdown', 'Inventory Breakdown')}
          subtitle={t('farmer.inventoryDesc', 'Stock states are set by the backend after explicit consent. Proposals do not reserve stock — they require your decision first.')}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { cls: 'sv-badge-available', label: t('status.AVAILABLE', 'Available'), value: `${totalAvailKg.toLocaleString()} kg`, desc: t('farmer.availableDesc', 'Open for buyer proposals') },
            { cls: 'sv-badge-proposed',  label: t('status.PROPOSED', 'Proposed'), value: `${proposalsCount} proposal${proposalsCount !== 1 ? 's' : ''}`, desc: t('farmer.proposedDesc', 'Pending your consent') },
            { cls: 'sv-badge-reserved',  label: t('status.RESERVED', 'Reserved'), value: `${totalResvKg.toLocaleString()} kg`, desc: t('farmer.reservedDesc', 'Locked after consent') },
            { cls: 'sv-badge-sold',      label: t('status.SOLD', 'Fulfilled'), value: `${sold.reduce((s,i)=>s+i.quantityKg,0).toLocaleString()} kg`, desc: t('farmer.fulfilledDesc', 'Delivered & settled') },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2">
              <span className={s.cls}>{s.label}</span>
              <p className="text-lg font-black text-[#1F2937] mt-2">{s.value}</p>
              <p className="text-[11px] text-[#64748B]">{s.desc}</p>
            </div>
          ))}
        </div>

        {crops.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] py-12 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-[#64748B]">No produce in inventory yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0]">
              <h3 className="font-extrabold text-[#1F2937] text-sm">{t('farmer.cropWiseBreakdown', 'Crop-Wise Breakdown')}</h3>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {crops.map(([crop, data]) => {
                const total = data.available + data.reserved + data.sold || 1;
                const availPct = Math.round((data.available / total) * 100);
                const resvPct = Math.round((data.reserved / total) * 100);
                return (
                  <div key={crop} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[#1F2937] text-sm">{t('crops.' + crop, crop)}</span>
                      <span className="text-[11px] text-[#64748B]">{data.lots} lot{data.lots !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs mb-2">
                      {data.available > 0 && <span className="text-[#07875B] font-bold">{data.available.toLocaleString()} kg available</span>}
                      {data.reserved > 0 && <span className="text-blue-600 font-bold">{data.reserved.toLocaleString()} kg reserved</span>}
                      {data.sold > 0 && <span className="text-purple-600 font-bold">{data.sold.toLocaleString()} kg sold</span>}
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-[#07875B]" style={{ width: `${availPct}%` }} />
                      <div className="h-full bg-blue-400" style={{ width: `${resvPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── PROFILE ───────────────────────────────────────────────────────────────
  const ProfileSection = () => (
    <div className="space-y-5">
      <SectionHeader title={t('farmer.profileOverview', 'Your Profile')} subtitle="Farm registration details and contact information stored on SasyaVahini." />
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            ['Full Name', user?.name],
            ['Email', user?.email],
            ['Village', user?.village],
            ['District', user?.district],
            ['State', user?.state],
            ['Land Holding', user?.farmerProfile?.landSizeAcres ? `${user.farmerProfile.landSizeAcres} Acres` : null],
            ['Primary Crops', user?.farmerProfile?.primaryCrops],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">{label}</p>
              <p className="font-bold text-[#1F2937] mt-0.5 text-sm">{value}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#07875B] text-white font-bold rounded-xl text-sm transition-all hover:bg-[#056b48]">
          <Edit3 className="w-4 h-4" /> {t('farmer.editProfile', 'Edit Profile')}
        </button>
      </div>
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between mb-4 bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#07875B] flex items-center justify-center">
            <Wheat className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-black text-[#07875B]">Farmer Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748B]">{navItems.find(n => n.key === activeSection)?.label}</span>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B]">
            {sidebarOpen ? <XIcon className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl p-4 flex flex-col gap-1 overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex flex-col gap-1 w-52 flex-shrink-0 bg-white rounded-2xl border border-[#E2E8F0] p-3 self-start sticky top-6">
          <SidebarContent />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'OVERVIEW'      && <OverviewSection />}
          {activeSection === 'INTELLIGENCE' && <MarketIntelligenceWidget initialDistrict={user?.district || 'Pune'} />}
          {activeSection === 'LISTINGS'      && <ListingsSection />}
          {activeSection === 'INVENTORY'  && <InventorySection />}
          {activeSection === 'PROPOSALS'  && <AllocationConsentSection onAllocationStatusChanged={fetchFarmerData} />}
          {activeSection === 'EARNINGS'   && <FarmerEarningsSection />}
          {activeSection === 'PROFILE'    && <ProfileSection />}
        </div>
      </div>

      {/* Modals */}
      <ProduceListingModal
        isOpen={listingModalOpen}
        onClose={() => setListingModalOpen(false)}
        initialData={selectedListingForEdit}
        onListingSaved={fetchFarmerData}
        defaultLocation={`${user?.village || 'Manchar'}, ${user?.district || 'Pune'}`}
        initialMode={listingModalMode}
      />
      <ProduceDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        listing={selectedListingForDetails}
        onEdit={item => handleOpenEditModal(item)}
        onDelete={id => handleDeleteProduce(id)}
      />
      <FarmerProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        onProfileUpdated={() => { refreshUser(); fetchFarmerData(); }}
      />
      <SmartVoiceListingModal isOpen={voiceListingModalOpen} onClose={() => setVoiceListingModalOpen(false)} onApplyParsed={handleApplyVoiceParsed} />
      <FarmerNotificationsModal
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        onNotificationsRead={fetchFarmerData}
      />
    </div>
  );
};

export default FarmerDashboard;