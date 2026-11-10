import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, ShoppingCart, ShoppingBag, ClipboardList, Truck,
  Heart, MapPin, FileText, Bell, Settings,
  Package, TrendingUp, Clock, Leaf, ShieldCheck, CheckCircle,
  Building2, User, ArrowRight, Sparkles, Filter, RefreshCw,
  SlidersHorizontal, Phone, Check, ChevronRight, Layers, Navigation
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RoleBadge from '@/components/RoleBadge';
import MarketIntelligenceWidget from '@/components/ml/MarketIntelligenceWidget';
import marketplaceApi from '@/services/marketplaceApi';
import BuyerProfilePage from './BuyerProfilePage';
import BuyerAddressesPage from './BuyerAddressesPage';
import BuyerSettingsPage from './BuyerSettingsPage';
import '@/styles/buyer-auth.css';

/* ── Fallback demo produce lots seeded in database ───────────────────────── */
const DEMO_PRODUCE_FALLBACK = [
  {
    id: 'seed-listing-tomato-001',
    cropName: 'Tomato',
    category: 'Vegetables',
    qualityGrade: 'GRADE_A',
    askingPricePerKg: 24,
    minPricePerKg: 18,
    totalQuantityKg: 2000,
    availableQtyKg: 2000,
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Manchar',
    harvestDate: '2026-11-01',
    description: 'Fresh Grade A vine-ripened tomatoes directly from farm cluster.',
    farmer: { name: 'Ramesh Kulkarni', district: 'Pune', aadhaarVerified: true },
    fpo: { name: 'Pune Sahakari Krishi FPO', district: 'Pune' },
    mandiBenchmark: 28,
    savingsPercent: 14.3,
  },
  {
    id: 'seed-listing-onion-001',
    cropName: 'Onion',
    category: 'Vegetables',
    qualityGrade: 'GRADE_A',
    askingPricePerKg: 20,
    minPricePerKg: 16,
    totalQuantityKg: 100,
    availableQtyKg: 100,
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Manchar',
    harvestDate: '2026-11-02',
    description: 'Medium-sized dry red onions, optimal for bulk storage.',
    farmer: { name: 'Ramesh Kulkarni', district: 'Pune', aadhaarVerified: true },
    fpo: { name: 'Pune Sahakari Krishi FPO', district: 'Pune' },
    mandiBenchmark: 24,
    savingsPercent: 16.7,
  },
  {
    id: 'seed-listing-onion-002',
    cropName: 'Onion (Lot B)',
    category: 'Vegetables',
    qualityGrade: 'GRADE_A',
    askingPricePerKg: 25,
    minPricePerKg: 20,
    totalQuantityKg: 200,
    availableQtyKg: 200,
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Manchar',
    harvestDate: '2026-11-02',
    description: 'Export-grade cured red onions, FPO pooled aggregation lot.',
    farmer: { name: 'Manchar Farmer Collective', district: 'Pune', aadhaarVerified: true },
    fpo: { name: 'Pune Sahakari Krishi FPO', district: 'Pune' },
    mandiBenchmark: 29,
    savingsPercent: 13.8,
  },
  {
    id: 'demo-wheat-001',
    cropName: 'Sharbati Wheat',
    category: 'Grains',
    qualityGrade: 'ORGANIC_PREMIUM',
    askingPricePerKg: 34,
    minPricePerKg: 30,
    totalQuantityKg: 5000,
    availableQtyKg: 5000,
    state: 'Madhya Pradesh',
    district: 'Sehore',
    village: 'Ashta',
    harvestDate: '2026-10-25',
    description: 'Certified organic golden grain wheat, 100% pesticide-free.',
    farmer: { name: 'Devendra Patel', district: 'Sehore', aadhaarVerified: true },
    fpo: { name: 'Narmada Valley Farmers Producer Co.', district: 'Sehore' },
    mandiBenchmark: 40,
    savingsPercent: 15.0,
  },
];

export default function BuyerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [produceListings, setProduceListings] = useState([]);
  const [loadingProduce, setLoadingProduce] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cartItems, setCartItems] = useState([]);
  const [notification, setNotification] = useState(null);

  // Sync tab with URL
  useEffect(() => {
    const p = location.pathname;
    if (p.includes('/marketplace')) setActiveTab('MARKETPLACE');
    else if (p.includes('/tracking')) setActiveTab('TRACKING');
    else if (p.includes('/cart')) setActiveTab('CART');
    else if (p.includes('/orders')) setActiveTab('ORDERS');
    else if (p.includes('/profile')) setActiveTab('PROFILE');
    else if (p.includes('/addresses')) setActiveTab('ADDRESSES');
    else if (p.includes('/settings')) setActiveTab('SETTINGS');
    else setActiveTab('OVERVIEW');
  }, [location.pathname]);

  // Load live produce from backend marketplace API
  const loadProduce = async () => {
    try {
      setLoadingProduce(true);
      const res = await marketplaceApi.getProduceListings();
      if (res && res.length > 0) {
        setProduceListings(res);
      } else {
        setProduceListings(DEMO_PRODUCE_FALLBACK);
      }
    } catch {
      setProduceListings(DEMO_PRODUCE_FALLBACK);
    } finally {
      setLoadingProduce(false);
    }
  };

  useEffect(() => {
    loadProduce();
  }, []);

  // Filter produce
  const filteredProduce = produceListings.filter((item) => {
    const matchesSearch =
      item.cropName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || item.category?.toUpperCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (produce) => {
    setCartItems((prev) => {
      const exists = prev.find((item) => item.id === produce.id);
      if (exists) {
        return prev.map((item) =>
          item.id === produce.id ? { ...item, orderQtyKg: item.orderQtyKg + 50 } : item
        );
      }
      return [...prev, { ...produce, orderQtyKg: 100 }];
    });
    setNotification(`Added 100 kg of ${produce.cropName} to order cart!`);
    setTimeout(() => setNotification(null), 3500);
  };

  const cartTotalAmount = cartItems.reduce(
    (sum, item) => sum + item.askingPricePerKg * item.orderQtyKg,
    0
  );

  return (
    <div className="buyer-dashboard-layout">
      {/* ── Left Sidebar Navigation ─────────────────────────────────── */}
      <aside className="buyer-sidebar">
        <div className="buyer-sidebar-header">
          <p className="buyer-sidebar-greeting">Signed in as,</p>
          <p className="buyer-sidebar-name">{user?.name || 'Verified Buyer'}</p>
          <div className="buyer-sidebar-role flex items-center gap-2 mt-2">
            <RoleBadge role="BUYER" />
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              Direct Access
            </span>
          </div>
        </div>

        <nav className="buyer-sidebar-nav">
          <div className="buyer-sidebar-section">
            <p className="buyer-sidebar-section-title">Overview</p>
            <button
              onClick={() => { setActiveTab('OVERVIEW'); navigate('/buyer'); }}
              className={`buyer-sidebar-link${activeTab === 'OVERVIEW' ? ' active' : ''}`}
            >
              <LayoutDashboard size={18} className="buyer-sidebar-link-icon" />
              <span>Dashboard Overview</span>
            </button>
            <button
              onClick={() => { setActiveTab('MARKETPLACE'); navigate('/buyer/marketplace'); }}
              className={`buyer-sidebar-link${activeTab === 'MARKETPLACE' ? ' active' : ''}`}
            >
              <Search size={18} className="buyer-sidebar-link-icon" />
              <span>Browse Marketplace</span>
              <span className="buyer-sidebar-badge">Live</span>
            </button>
          </div>

          <div className="buyer-sidebar-section">
            <p className="buyer-sidebar-section-title">Procurement & Intelligence</p>
            <NavLink
              to="/market-intelligence"
              className="buyer-sidebar-link"
            >
              <TrendingUp size={18} className="buyer-sidebar-link-icon" />
              <span>AI Mandi Price Brain</span>
              <span className="buyer-sidebar-badge" style={{ background: '#FEF6EE', color: '#B54708' }}>Gowtham ML</span>
            </NavLink>
            <button
              onClick={() => { setActiveTab('CART'); navigate('/buyer/cart'); }}
              className={`buyer-sidebar-link${activeTab === 'CART' ? ' active' : ''}`}
            >
              <ShoppingCart size={18} className="buyer-sidebar-link-icon" />
              <span>Procurement Cart</span>
              {cartItems.length > 0 && (
                <span className="buyer-sidebar-badge" style={{ background: '#245C43', color: 'white' }}>
                  {cartItems.length}
                </span>
              )}
            </button>
          </div>

          <div className="buyer-sidebar-section">
            <p className="buyer-sidebar-section-title">Logistics & Orders</p>
            <button
              onClick={() => { setActiveTab('ORDERS'); navigate('/buyer/orders'); }}
              className={`buyer-sidebar-link${activeTab === 'ORDERS' ? ' active' : ''}`}
            >
              <ClipboardList size={18} className="buyer-sidebar-link-icon" />
              <span>My Orders</span>
            </button>
            <button
              onClick={() => { setActiveTab('TRACKING'); navigate('/buyer/tracking'); }}
              className={`buyer-sidebar-link${activeTab === 'TRACKING' ? ' active' : ''}`}
            >
              <Truck size={18} className="buyer-sidebar-link-icon" />
              <span>Two-Tier Logistics</span>
              <span className="buyer-sidebar-badge">CVRP</span>
            </button>
          </div>

          <div className="buyer-sidebar-section">
            <p className="buyer-sidebar-section-title">Account & Locations (Phase 2)</p>
            <button
              onClick={() => { setActiveTab('PROFILE'); navigate('/buyer/profile'); }}
              className={`buyer-sidebar-link${activeTab === 'PROFILE' ? ' active' : ''}`}
            >
              <User size={18} className="buyer-sidebar-link-icon" />
              <span>My Profile</span>
            </button>
            <button
              onClick={() => { setActiveTab('ADDRESSES'); navigate('/buyer/addresses'); }}
              className={`buyer-sidebar-link${activeTab === 'ADDRESSES' ? ' active' : ''}`}
            >
              <MapPin size={18} className="buyer-sidebar-link-icon" />
              <span>Saved Addresses</span>
            </button>
            <button
              onClick={() => { setActiveTab('SETTINGS'); navigate('/buyer/settings'); }}
              className={`buyer-sidebar-link${activeTab === 'SETTINGS' ? ' active' : ''}`}
            >
              <Settings size={18} className="buyer-sidebar-link-icon" />
              <span>Account Settings</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────── */}
      <main className="buyer-main-content">
        {/* Floating Notification */}
        {notification && (
          <div className="buyer-alert buyer-alert-success buyer-animate-in mb-4" style={{ position: 'sticky', top: 10, zIndex: 50, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
            <CheckCircle size={18} className="buyer-alert-icon" />
            <span>{notification}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            DEDICATED BUYER DASHBOARD TOP HEADER BAR
            (Prominently positioned at the top corner & top middle)
            ══════════════════════════════════════════════════════════════ */}
        <header className="buyer-dashboard-top-header" role="banner" aria-label="Buyer Dashboard Header">
          {/* Top Row: Left Brand/Title + Middle Search + Right Badges */}
          <div className="buyer-top-header-row">
            {/* Top-Left Corner: Portal Identification */}
            <div className="buyer-header-branding">
              <div className="buyer-header-portal-icon">
                <ShoppingBag size={24} />
              </div>
              <div className="buyer-header-title-wrap">
                <h1>
                  <span>Buyer Operations Hub</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Phase 1 Verified
                  </span>
                </h1>
                <p className="buyer-header-subtitle">
                  Direct Farm-to-Buyer Procurement · Verified FPO Lots · Transparent Cost Ledgers
                </p>
              </div>
            </div>

            {/* Top-Middle: Search Bar */}
            <div className="buyer-header-middle-controls">
              <div className="buyer-header-search-wrapper">
                <Search size={16} className="buyer-header-search-icon" />
                <input
                  type="text"
                  className="buyer-header-search-input"
                  placeholder="Search crops, grades, or FPO hubs (e.g. Pune Grade A Tomatoes)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Top-Right Corner: Ticker & Status */}
            <div className="buyer-header-right-badges">
              <div className="buyer-live-ticker-badge" title="Real-time Agmarknet / e-NAM benchmark comparison">
                <span className="buyer-live-indicator-dot" />
                <span>APMC Pune Avg: ₹28.5/kg · Farm Direct Savings: ~14.5%</span>
              </div>
              <button
                onClick={() => { setActiveTab('CART'); navigate('/buyer/cart'); }}
                className="buyer-btn buyer-btn-secondary"
                style={{ padding: '8px 14px', fontSize: 13 }}
              >
                <ShoppingCart size={15} />
                <span>Cart ({cartItems.length})</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Top Navigation Pills / Tabs in the Middle */}
          <div className="buyer-top-nav-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'OVERVIEW'}
              onClick={() => { setActiveTab('OVERVIEW'); navigate('/buyer'); }}
              className={`buyer-nav-tab-btn${activeTab === 'OVERVIEW' ? ' active' : ''}`}
            >
              <LayoutDashboard size={15} />
              <span>Overview</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'MARKETPLACE'}
              onClick={() => { setActiveTab('MARKETPLACE'); navigate('/buyer/marketplace'); }}
              className={`buyer-nav-tab-btn${activeTab === 'MARKETPLACE' ? ' active' : ''}`}
            >
              <Search size={15} />
              <span>Live Produce Marketplace</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white/20 rounded">
                {produceListings.length} Lots
              </span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'TRACKING'}
              onClick={() => { setActiveTab('TRACKING'); navigate('/buyer/tracking'); }}
              className={`buyer-nav-tab-btn${activeTab === 'TRACKING' ? ' active' : ''}`}
            >
              <Truck size={15} />
              <span>Two-Tier Logistics Tracking</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'CART'}
              onClick={() => { setActiveTab('CART'); navigate('/buyer/cart'); }}
              className={`buyer-nav-tab-btn${activeTab === 'CART' ? ' active' : ''}`}
            >
              <ShoppingCart size={15} />
              <span>Order Cart ({cartItems.length})</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'ORDERS'}
              onClick={() => { setActiveTab('ORDERS'); navigate('/buyer/orders'); }}
              className={`buyer-nav-tab-btn${activeTab === 'ORDERS' ? ' active' : ''}`}
            >
              <ClipboardList size={15} />
              <span>Order Ledger</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'PROFILE'}
              onClick={() => { setActiveTab('PROFILE'); navigate('/buyer/profile'); }}
              className={`buyer-nav-tab-btn${activeTab === 'PROFILE' ? ' active' : ''}`}
            >
              <User size={15} />
              <span>My Profile</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'ADDRESSES'}
              onClick={() => { setActiveTab('ADDRESSES'); navigate('/buyer/addresses'); }}
              className={`buyer-nav-tab-btn${activeTab === 'ADDRESSES' ? ' active' : ''}`}
            >
              <MapPin size={15} />
              <span>Addresses</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'SETTINGS'}
              onClick={() => { setActiveTab('SETTINGS'); navigate('/buyer/settings'); }}
              className={`buyer-nav-tab-btn${activeTab === 'SETTINGS' ? ' active' : ''}`}
            >
              <Settings size={15} />
              <span>Settings</span>
            </button>
            <NavLink
              to="/market-intelligence"
              className="buyer-nav-tab-btn ml-auto text-amber-800 bg-amber-50 border-amber-200"
            >
              <Sparkles size={14} className="text-amber-600" />
              <span>Gowtham's AI Pricing Brain</span>
            </NavLink>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW & STATS
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'OVERVIEW' && (
          <div className="buyer-animate-in">
            {/* Stats Row */}
            <div className="buyer-stats-grid">
              <div className="buyer-stat-card">
                <div className="buyer-stat-card-header">
                  <p className="buyer-stat-card-label">Active Orders</p>
                  <div className="buyer-stat-card-icon" style={{ background: '#E8F0E8', color: '#245C43' }}>
                    <Package size={18} />
                  </div>
                </div>
                <p className="buyer-stat-card-value">1</p>
                <p className="buyer-stat-card-change text-emerald-700 font-medium">In Transit via Two-Tier Logistics</p>
              </div>

              <div className="buyer-stat-card">
                <div className="buyer-stat-card-header">
                  <p className="buyer-stat-card-label">Farm Produce Available</p>
                  <div className="buyer-stat-card-icon" style={{ background: '#F5F0E4', color: '#C7A96B' }}>
                    <TrendingUp size={18} />
                  </div>
                </div>
                <p className="buyer-stat-card-value">7,300 kg</p>
                <p className="buyer-stat-card-change">Across 4 verified FPO lots</p>
              </div>

              <div className="buyer-stat-card">
                <div className="buyer-stat-card-header">
                  <p className="buyer-stat-card-label">Direct Farm Savings</p>
                  <div className="buyer-stat-card-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    <Sparkles size={18} />
                  </div>
                </div>
                <p className="buyer-stat-card-value">14.5%</p>
                <p className="buyer-stat-card-change">Compared to APMC terminal mandis</p>
              </div>

              <div className="buyer-stat-card">
                <div className="buyer-stat-card-header">
                  <p className="buyer-stat-card-label">Escrow Security</p>
                  <div className="buyer-stat-card-icon" style={{ background: '#ECFDF3', color: '#247A48' }}>
                    <ShieldCheck size={18} />
                  </div>
                </div>
                <p className="buyer-stat-card-value">100%</p>
                <p className="buyer-stat-card-change">Delivery-verified payout release</p>
              </div>
            </div>

            {/* Teammate Integration Showcase: Gowtham's AI Pricing Brain */}
            <div style={{ marginBottom: 24 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-600" />
                  <h3 className="font-bold text-[#202820] text-base">
                    Gowtham's AI Demand Forecasting & Mandi Price Arbitrage
                  </h3>
                </div>
                <span className="text-xs text-[#68736B]">Live Quantile Regression (P10 / P50 / P90)</span>
              </div>
              <MarketIntelligenceWidget initialDistrict="Pune" />
            </div>

            {/* Quick Actions & Recent Sourcing */}
            <div className="buyer-content-grid">
              {/* Featured Produce Cards */}
              <div className="buyer-content-card">
                <div className="buyer-content-card-header">
                  <h3 className="buyer-content-card-title flex items-center gap-2">
                    <Leaf size={18} className="text-emerald-700" />
                    <span>Live Farm Inventory (Shankar's Supply Engine)</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('MARKETPLACE')}
                    className="text-xs font-semibold text-[#245C43] hover:underline"
                  >
                    View All Lots →
                  </button>
                </div>
                <div className="buyer-content-card-body">
                  <div className="flex flex-col gap-3">
                    {produceListings.slice(0, 3).map((lot) => (
                      <div
                        key={lot.id}
                        className="p-3 rounded-lg border border-[#DDE5DC] hover:border-[#245C43] transition-all bg-[#F8F8F3] flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#202820]">{lot.cropName}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {lot.qualityGrade}
                            </span>
                          </div>
                          <p className="text-xs text-[#68736B] mt-0.5">
                            📍 {lot.village ? `${lot.village}, ` : ''}{lot.district} · {lot.farmer?.name || 'Farmer Batch'}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm font-black text-[#245C43]">₹{lot.askingPricePerKg}/kg</span>
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              ~14% below APMC Mandi Rate (Good Deal!)
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(lot)}
                          className="buyer-btn buyer-btn-primary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shankar's Logistics Overview */}
              <div className="buyer-content-card">
                <div className="buyer-content-card-header">
                  <h3 className="buyer-content-card-title flex items-center gap-2">
                    <Truck size={18} className="text-blue-700" />
                    <span>Two-Tier Logistics Status (Shankar's Routing)</span>
                  </h3>
                  <span className="buyer-feature-badge">Active Shipment</span>
                </div>
                <div className="buyer-content-card-body">
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 mb-3">
                    <div className="flex justify-between items-center text-xs text-blue-900 font-semibold mb-1">
                      <span>Shipment #SV-2026-00101</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">IN TRANSIT</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Vehicle: <strong className="text-slate-800">MH-12-QX-4012 (2.5T Refrigerated)</strong>
                    </p>
                  </div>

                  {/* 3-Tier Route Timeline */}
                  <div className="space-y-3 pl-2 border-l-2 border-emerald-500 my-4 text-xs">
                    <div className="relative pl-3">
                      <div className="absolute -left-[19px] top-0 w-3 h-3 rounded-full bg-emerald-600 ring-2 ring-white" />
                      <p className="font-bold text-slate-800">1. Farm Gate Pickup (Manchar Village)</p>
                      <p className="text-slate-500">Collected 1,500 kg Tomatoes · Verified with Farmer OTP</p>
                    </div>
                    <div className="relative pl-3">
                      <div className="absolute -left-[19px] top-0 w-3 h-3 rounded-full bg-blue-600 ring-2 ring-white" />
                      <p className="font-bold text-slate-800">2. FPO Hub Aggregation (Chakan Center)</p>
                      <p className="text-slate-500">Quality-grade sorting & cross-docking complete</p>
                    </div>
                    <div className="relative pl-3">
                      <div className="absolute -left-[19px] top-0 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
                      <p className="font-bold text-slate-800">3. Terminal Buyer Delivery (Pune FreshBasket Hub)</p>
                      <p className="text-slate-500">ETA: 45 minutes · Delivery OTP Handshake required</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('TRACKING')}
                    className="w-full mt-2 py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  >
                    View Real-Time Fleet Map & Telematics →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: LIVE PRODUCE MARKETPLACE CATALOG
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'MARKETPLACE' && (
          <div className="buyer-animate-in">
            {/* Filters Bar */}
            <div className="p-4 bg-white rounded-xl border border-[#DDE5DC] mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                  <Filter size={14} /> Category:
                </span>
                {['ALL', 'VEGETABLES', 'FRUITS', 'GRAINS'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#245C43] text-white shadow-sm'
                        : 'bg-[#E8F0E8] text-[#245C43] hover:bg-[#DDE5DC]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadProduce}
                  className="px-3 py-1.5 rounded-lg border border-[#DDE5DC] text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={loadingProduce ? 'animate-spin' : ''} />
                  <span>Refresh Lots</span>
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredProduce.length} verified produce batches
                </span>
              </div>
            </div>

            {/* Produce Grid */}
            <div className="buyer-produce-grid">
              {filteredProduce.map((lot) => (
                <div key={lot.id} className="buyer-produce-card">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {lot.qualityGrade || 'GRADE_A'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        📍 {lot.district}, {lot.state}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-[#202820] mb-1">{lot.cropName}</h4>
                    <p className="text-xs text-[#68736B] line-clamp-2 mb-3">
                      {lot.description || 'Verified agricultural batch with direct farm provenance.'}
                    </p>

                    <div className="p-2.5 bg-[#F8F8F3] rounded-lg border border-[#DDE5DC] space-y-1 mb-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Available Lot:</span>
                        <span className="font-bold text-slate-800">{lot.availableQtyKg || lot.totalQuantityKg} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Farmer:</span>
                        <span className="font-medium text-slate-800">{lot.farmer?.name || 'Verified Member'}</span>
                      </div>
                      {lot.fpo && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">FPO Pool:</span>
                          <span className="font-medium text-emerald-800">{lot.fpo.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Gowtham's AI Pricing Badge */}
                    <div className="mb-4">
                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-600 flex-shrink-0" />
                        <span><strong>₹{lot.askingPricePerKg}/kg</strong> — ~14% below APMC Mandi Rate (Good Deal!)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#DDE5DC] flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500">Direct Farm Price</p>
                      <p className="text-xl font-black text-[#245C43]">₹{lot.askingPricePerKg}<span className="text-xs font-normal">/kg</span></p>
                    </div>
                    <button
                      onClick={() => handleAddToCart(lot)}
                      className="buyer-btn buyer-btn-primary"
                      style={{ padding: '8px 16px', fontSize: 13 }}
                    >
                      <ShoppingCart size={15} />
                      <span>Add Lot</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: TWO-TIER LOGISTICS TRACKING
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'TRACKING' && (
          <div className="buyer-animate-in space-y-6">
            <div className="p-5 bg-white rounded-xl border border-[#DDE5DC]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#202820] flex items-center gap-2">
                    <Truck size={22} className="text-[#245C43]" />
                    <span>Shankar's Two-Tier Logistics Network & CVRP Routing</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Multi-stop pickup from rural farmers → FPO cold storage consolidation → Direct terminal delivery
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-300">
                  Microservice Active (Port 8001)
                </span>
              </div>

              {/* Active Route Blueprint */}
              <div className="p-4 bg-[#F8F8F3] rounded-xl border border-[#DDE5DC] grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Dispatch ID</p>
                  <p className="text-sm font-bold text-slate-800">DISP-2026-MH-9102</p>
                  <p className="text-xs text-slate-600">Order: SV-2026-00101</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Assigned Fleet Vehicle</p>
                  <p className="text-sm font-bold text-slate-800">MH-12-QX-4012 (Refrigerated)</p>
                  <p className="text-xs text-slate-600">Capacity: 2,500 kg · Driver: Santosh Gaikwad</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase">CVRP Optimization Gain</p>
                  <p className="text-sm font-bold text-emerald-700">22.4 km Saved (OR-Tools)</p>
                  <p className="text-xs text-slate-600">Estimated transit fuel saved: ₹380</p>
                </div>
              </div>

              {/* Progress Milestones */}
              <div className="grid md:grid-cols-4 gap-3 py-2">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                    <CheckCircle size={16} /> 1. Farm Collection
                  </div>
                  <p className="text-[11px] text-emerald-700">Collected from Ramesh Kulkarni (Manchar)</p>
                  <span className="text-[10px] text-slate-500">OTP Verified 10:15 AM</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                    <CheckCircle size={16} /> 2. FPO Hub Check
                  </div>
                  <p className="text-[11px] text-emerald-700">Chakan Aggregation Facility QC passed</p>
                  <span className="text-[10px] text-slate-500">Sorted 11:30 AM</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 ring-2 ring-blue-500/30">
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-xs mb-1">
                    <Navigation size={16} className="animate-spin" /> 3. City Transit
                  </div>
                  <p className="text-[11px] text-blue-700">En route on NH-60 towards Pune Hub</p>
                  <span className="text-[10px] text-blue-600 font-semibold">Speed: 42 km/h · Temp: 4°C</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 opacity-60">
                  <div className="flex items-center gap-2 text-slate-600 font-bold text-xs mb-1">
                    <Clock size={16} /> 4. Buyer Handover
                  </div>
                  <p className="text-[11px] text-slate-500">Delivery verification & Escrow Release</p>
                  <span className="text-[10px] text-slate-400">Handshake PIN: 492810</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500">
                  Need custom route planning for bulk institutional procurement?
                </span>
                <NavLink
                  to="/logistics"
                  className="font-bold text-[#245C43] hover:underline flex items-center gap-1"
                >
                  Open Full Logistics Operations Console <ArrowRight size={14} />
                </NavLink>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: PROCUREMENT CART & CHECKOUT PREVIEW
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'CART' && (
          <div className="buyer-animate-in">
            {cartItems.length === 0 ? (
              <div className="p-12 bg-white rounded-xl border border-[#DDE5DC] text-center">
                <ShoppingCart size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700 mb-1">Your Procurement Cart is Empty</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Browse fresh farmer-aggregated lots from the marketplace and add them to your bulk order.
                </p>
                <button
                  onClick={() => setActiveTab('MARKETPLACE')}
                  className="buyer-btn buyer-btn-primary"
                >
                  Browse Marketplace Lots
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="p-5 bg-white rounded-xl border border-[#DDE5DC]">
                    <h3 className="font-bold text-base text-slate-800 mb-3">Selected Farm Produce Batches</h3>
                    <div className="divide-y divide-slate-100">
                      {cartItems.map((item) => (
                        <div key={item.id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800">{item.cropName}</p>
                            <p className="text-xs text-slate-500">
                              📍 {item.district} · Grade: {item.qualityGrade} · Lot ID: {item.id}
                            </p>
                            <span className="text-xs font-semibold text-emerald-700">
                              ₹{item.askingPricePerKg} / kg
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-slate-700">{item.orderQtyKg} kg</span>
                            <span className="text-sm font-black text-slate-800">
                              ₹{(item.askingPricePerKg * item.orderQtyKg).toLocaleString()}
                            </span>
                            <button
                              onClick={() => setCartItems((prev) => prev.filter((i) => i.id !== item.id))}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Checkout Summary */}
                <div className="p-5 bg-white rounded-xl border border-[#DDE5DC] h-fit">
                  <h3 className="font-bold text-base text-slate-800 mb-3">Order Cost Ledger (Phase 1)</h3>
                  <div className="space-y-2 text-xs border-b border-slate-200 pb-3 mb-3">
                    <div className="flex justify-between text-slate-600">
                      <span>Produce Net Realization:</span>
                      <span className="font-bold text-slate-800">₹{cartTotalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>FPO Handling & Pooling (3%):</span>
                      <span>₹{(cartTotalAmount * 0.03).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Shankar's CVRP Logistics Quote:</span>
                      <span className="font-semibold text-emerald-700">₹650 (Optimized)</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Middleman Markup Avoided:</span>
                      <span className="font-bold text-emerald-700">-₹{(cartTotalAmount * 0.14).toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm font-black text-slate-900 mb-4">
                    <span>Total Landed Cost:</span>
                    <span>₹{(cartTotalAmount + cartTotalAmount * 0.03 + 650).toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => {
                      setNotification('Order allocation proposal requested from farmers & FPO!');
                      setCartItems([]);
                    }}
                    className="w-full buyer-btn buyer-btn-primary"
                  >
                    Submit Procurement Order
                  </button>
                  <p className="text-[11px] text-slate-500 text-center mt-2">
                    Atomic inventory reservation initiated upon farmer consent.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 5: ORDER LEDGER & SETTLEMENTS
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'ORDERS' && (
          <div className="buyer-animate-in">
            <div className="p-5 bg-white rounded-xl border border-[#DDE5DC]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Buyer Order History & Escrow Tracking</h3>
                  <p className="text-xs text-slate-500">
                    Transparent anti-exploitation ledger with digital delivery verification
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                  Escrow Protected
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F8F3] text-slate-600 font-bold border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Order Number</th>
                      <th className="py-2.5 px-3">Produce & Qty</th>
                      <th className="py-2.5 px-3">FPO Hub Source</th>
                      <th className="py-2.5 px-3">Landed Price</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Escrow Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">SV-2026-00101</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">Grade A Tomatoes</span>
                        <p className="text-[11px] text-slate-500">1,500 kg @ ₹24/kg</p>
                      </td>
                      <td className="py-3 px-3">Pune Sahakari Krishi FPO (Manchar)</td>
                      <td className="py-3 px-3 font-bold text-slate-800">₹36,650</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          IN_TRANSIT
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          ESCROW_HELD
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">SV-2026-00084</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">Organic Sharbati Wheat</span>
                        <p className="text-[11px] text-slate-500">2,000 kg @ ₹34/kg</p>
                      </td>
                      <td className="py-3 px-3">Narmada Valley Farmers Co.</td>
                      <td className="py-3 px-3 font-bold text-slate-800">₹68,900</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          DELIVERY_VERIFIED
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          PAYMENT_RELEASED
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PHASE 2: BUYER PROFILE
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'PROFILE' && <BuyerProfilePage />}

        {/* ══════════════════════════════════════════════════════════════
            PHASE 2: ADDRESS MANAGEMENT
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'ADDRESSES' && <BuyerAddressesPage />}

        {/* ══════════════════════════════════════════════════════════════
            PHASE 2: ACCOUNT SETTINGS
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'SETTINGS' && <BuyerSettingsPage />}
      </main>
    </div>
  );
}
