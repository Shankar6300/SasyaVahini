import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Scale,
  LayoutDashboard, Search, ShoppingCart, ShoppingBag, ClipboardList, Truck,
  Heart, MapPin, FileText, Bell, Settings,
  Package, TrendingUp, Clock, Leaf, ShieldCheck, CheckCircle,
  Building2, User, ArrowRight, Sparkles, Filter, RefreshCw,
  SlidersHorizontal, Phone, Check, ChevronRight, ChevronLeft, Layers, Navigation, CreditCard
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RoleBadge from '@/components/RoleBadge';
import MarketIntelligenceWidget from '@/components/ml/MarketIntelligenceWidget';
import BuyerMarketplaceIntelligence from '@/components/buyer/BuyerMarketplaceIntelligence';
import marketplaceApi from '@/services/marketplaceApi';
import BuyerProfilePage from './BuyerProfilePage';
import BuyerAddressesPage from './BuyerAddressesPage';
import BuyerSettingsPage from './BuyerSettingsPage';
import MarketplacePage from './marketplace/MarketplacePage';
import ProductDetailPage from './marketplace/ProductDetailPage';
import SupplierProfilePage from './marketplace/SupplierProfilePage';
import ComparisonPage from './comparison/ComparisonPage';
import ComparisonSelectionBar from '@/components/buyer/comparison/ComparisonSelectionBar';
import CartPage from './cart/CartPage';
import CheckoutPage from './checkout/CheckoutPage';
import InvoicesPage from './invoices/InvoicesPage';
import TransactionHistoryPage from './transactions/TransactionHistoryPage';
import OrdersPage from './orders/OrdersPage';
import OrderDetailPage from './orders/OrderDetailPage';
import OrderTrackingPage from './orders/OrderTrackingPage';
import { useCompare } from '@/context/CompareContext';
import { useCart } from '@/context/CartContext';
import '@/styles/buyer-auth.css';
import '@/styles/marketplace.css';
import '@/styles/cart.css';
import '@/styles/payment.css';

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
  const { count: compareCount } = useCompare();
  const { cartCount, addToCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [produceListings, setProduceListings] = useState([]);
  const [loadingProduce, setLoadingProduce] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cartItems, setCartItems] = useState([]);
  const [notification, setNotification] = useState(null);

  // Sidebar collapsed state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sasyavahini_buyer_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sasyavahini_buyer_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcut (Ctrl+\ or Cmd+\) to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync tab with URL
  useEffect(() => {
    const p = location.pathname;
    if (p.includes('/marketplace/products/')) setActiveTab('PRODUCT_DETAIL');
    else if (p.includes('/marketplace/suppliers/')) setActiveTab('SUPPLIER_PROFILE');
    else if (p.includes('/marketplace')) setActiveTab('MARKETPLACE');
    else if (p.includes('/compare')) setActiveTab('COMPARE');
    else if (p.includes('/tracking')) {
      const match = p.match(/\/tracking\/([^/?]+)/);
      if (match) setTrackingOrderId(match[1]);
      setActiveTab('TRACKING');
    }
    else if (p.includes('/checkout')) setActiveTab('CHECKOUT');
    else if (p.includes('/cart')) setActiveTab('CART');
    else if (p.includes('/invoices')) setActiveTab('INVOICES');
    else if (p.includes('/transactions')) setActiveTab('TRANSACTIONS');
    else if (p.includes('/orders')) {
      const match = p.match(/\/orders\/([^/?]+)/);
      if (match) setSelectedOrderId(match[1]);
      setActiveTab('ORDERS');
    }
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
      <aside className={`buyer-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
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
              <span className="buyer-sidebar-badge" style={{ background: '#E8F5E9', color: '#1B5E20' }}>AI Powered</span>
            </NavLink>
            <button
              onClick={() => { setActiveTab('COMPARE'); navigate('/buyer/compare'); }}
              className={`buyer-sidebar-link${activeTab === 'COMPARE' ? ' active' : ''}`}
            >
              <Scale size={18} className="buyer-sidebar-link-icon" />
              <span>Compare Produce</span>
              {compareCount > 0 && (
                <span className="buyer-sidebar-badge" style={{ background: '#245C43', color: 'white' }}>
                  {compareCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('CART'); navigate('/buyer/cart'); }}
              className={`buyer-sidebar-link${activeTab === 'CART' || activeTab === 'CHECKOUT' ? ' active' : ''}`}
            >
              <ShoppingCart size={18} className="buyer-sidebar-link-icon" />
              <span>Procurement Cart</span>
              {cartCount > 0 && (
                <span className="buyer-sidebar-badge" style={{ background: '#245C43', color: 'white' }}>
                  {cartCount}
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
            <p className="buyer-sidebar-section-title">Payments</p>
            <button
              onClick={() => { setActiveTab('TRANSACTIONS'); navigate('/buyer/transactions'); }}
              className={`buyer-sidebar-link${activeTab === 'TRANSACTIONS' ? ' active' : ''}`}
            >
              <CreditCard size={18} className="buyer-sidebar-link-icon" />
              <span>Transactions</span>
              <span className="buyer-sidebar-badge" style={{ background: '#E8F5E9', color: '#1B5E20' }}>HMAC</span>
            </button>
          </div>

          <div className="buyer-sidebar-section">
            <p className="buyer-sidebar-section-title">Account & Locations</p>
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

      {/* ── Elegant Middle Border Sidebar Toggle Arrow ──────────────── */}
      <button
        type="button"
        onClick={toggleSidebar}
        className={`buyer-sidebar-toggle-btn ${isSidebarCollapsed ? 'collapsed' : ''}`}
        aria-label={isSidebarCollapsed ? 'Expand navigation sidebar' : 'Hide navigation sidebar'}
        title={isSidebarCollapsed ? 'Expand sidebar (Ctrl+\\)' : 'Hide sidebar (Ctrl+\\)'}
      >
        {isSidebarCollapsed ? (
          <ChevronRight size={15} />
        ) : (
          <ChevronLeft size={15} />
        )}
        <span className="buyer-sidebar-toggle-tooltip">
          <span>{isSidebarCollapsed ? 'Open Sidebar' : 'Hide Sidebar'}</span>
          <span className="buyer-sidebar-toggle-kbd">Ctrl+\</span>
        </span>
      </button>

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
                    Enterprise Verified
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

            {/* Top-Right Corner: Ticker & Actions */}
            <div className="buyer-header-right-badges">
              <div className="buyer-live-ticker-badge" title="Real-time Agmarknet / e-NAM benchmark comparison">
                <span className="buyer-live-indicator-dot" />
                <span>APMC Pune Avg: ₹28.5/kg · Farm Direct Savings: ~14.5%</span>
              </div>
              {compareCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setActiveTab('COMPARE'); navigate('/buyer/compare'); }}
                  className="buyer-btn buyer-btn-outline"
                  style={{ padding: '8px 12px', fontSize: 13, gap: 6 }}
                  title="Compare selected produce"
                >
                  <Scale size={15} />
                  <span>Compare ({compareCount})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => { setActiveTab('CART'); navigate('/buyer/cart'); }}
                className="buyer-btn buyer-btn-secondary"
                style={{ padding: '8px 14px', fontSize: 13 }}
              >
                <ShoppingCart size={15} />
                <span>Cart ({cartItems.length})</span>
              </button>
            </div>
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

            {/* AI Mandi Intelligence & Price Prediction */}
            <div style={{ marginBottom: 24 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-600" />
                  <h3 className="font-bold text-[#202820] text-base">
                    AI Buyer Procurement Optimizer & Landed Cost Intelligence
                  </h3>
                </div>
                <span className="text-xs text-[#68736B]">102-D Quantile Model (v0.5.0) • Valley Detector</span>
              </div>
              <BuyerMarketplaceIntelligence initialDestination="Mumbai" />
            </div>

            {/* Quick Actions & Recent Sourcing */}
            <div className="buyer-content-grid">
              {/* Featured Produce Cards */}
              <div className="buyer-content-card">
                <div className="buyer-content-card-header">
                  <h3 className="buyer-content-card-title flex items-center gap-2">
                    <Leaf size={18} className="text-emerald-700" />
                    <span>Live Farm Inventory (Direct FPO Supply)</span>
                  </h3>
                  <button
                    onClick={() => { setActiveTab('MARKETPLACE'); navigate('/buyer/marketplace'); }}
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
                              ~14% below APMC Mandi Rate
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setActiveTab('PRODUCT_DETAIL'); navigate(`/buyer/marketplace/products/${lot.id}`); }}
                            className="buyer-btn buyer-btn-outline"
                            style={{ padding: '6px 12px', fontSize: 12 }}
                          >
                            View Lot
                          </button>
                          <button
                            onClick={() => handleAddToCart(lot)}
                            className="buyer-btn buyer-btn-primary"
                            style={{ padding: '6px 12px', fontSize: 12 }}
                          >
                            Add Lot
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Two-Tier Logistics Status Overview */}
              <div className="buyer-content-card">
                <div className="buyer-content-card-header">
                  <h3 className="buyer-content-card-title flex items-center gap-2">
                    <Truck size={18} className="text-blue-700" />
                    <span>Two-Tier Logistics Status (Intelligent Routing)</span>
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
            TAB 2: AGRICULTURAL MARKETPLACE (PHASE 3)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'MARKETPLACE' && (
          <div className="buyer-animate-in">
            <MarketplacePage />
          </div>
        )}

        {/* Phase 3 Dedicated Product Detail Page */}
        {activeTab === 'PRODUCT_DETAIL' && (
          <div className="buyer-animate-in">
            <ProductDetailPage productId={location.pathname.split('/products/')[1]?.split('?')[0]?.split('/')[0]} />
          </div>
        )}

        {/* Phase 3 Dedicated Supplier Profile Page */}
        {activeTab === 'SUPPLIER_PROFILE' && (
          <div className="buyer-animate-in">
            <SupplierProfilePage supplierId={location.pathname.split('/suppliers/')[1]?.split('?')[0]?.split('/')[0]} />
          </div>
        )}

        {/* Phase 4 Dedicated Supplier & Price Comparison Page */}
        {activeTab === 'COMPARE' && (
          <div className="buyer-animate-in">
            <ComparisonPage />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: TWO-TIER LOGISTICS TRACKING
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'TRACKING' && (
          trackingOrderId ? (
            <OrderTrackingPage
              orderId={trackingOrderId}
              onBack={() => {
                setTrackingOrderId(null);
                setActiveTab('ORDERS');
                navigate('/buyer/orders');
              }}
            />
          ) : (
            <div className="space-y-6">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Two-Tier Agricultural Logistics & Tracking</h2>
                  <p className="text-xs text-slate-500">Select any active order to monitor real verified milestones</p>
                </div>
                <NavLink
                  to="/logistics"
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
                >
                  <Truck size={14} />
                  <span>Logistics Console</span>
                </NavLink>
              </div>

              <OrdersPage
                onSelectOrder={(id) => {
                  setSelectedOrderId(id);
                  setActiveTab('ORDERS');
                  navigate(`/buyer/orders/${id}`);
                }}
                onTrackOrder={(id) => {
                  setTrackingOrderId(id);
                  navigate(`/buyer/tracking/${id}`);
                }}
                onBrowseMarketplace={() => {
                  setActiveTab('MARKETPLACE');
                  navigate('/buyer/marketplace');
                }}
              />
            </div>
          )
        )}

        {activeTab === 'CART' && (
          <CartPage
            onProceedToCheckout={() => {
              setActiveTab('CHECKOUT');
              navigate('/buyer/checkout');
            }}
          />
        )}

        {activeTab === 'CHECKOUT' && (
          <CheckoutPage
            onBackToCart={() => {
              setActiveTab('CART');
              navigate('/buyer/cart');
            }}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 5: ORDER LEDGER & SETTLEMENTS
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'ORDERS' && (
          selectedOrderId ? (
            <OrderDetailPage
              orderId={selectedOrderId}
              onBack={() => {
                setSelectedOrderId(null);
                navigate('/buyer/orders');
              }}
              onTrack={(id) => {
                setTrackingOrderId(id);
                setActiveTab('TRACKING');
                navigate(`/buyer/tracking/${id}`);
              }}
            />
          ) : (
            <OrdersPage
              onSelectOrder={(id) => {
                setSelectedOrderId(id);
                navigate(`/buyer/orders/${id}`);
              }}
              onTrackOrder={(id) => {
                setTrackingOrderId(id);
                setActiveTab('TRACKING');
                navigate(`/buyer/tracking/${id}`);
              }}
              onBrowseMarketplace={() => {
                setActiveTab('MARKETPLACE');
                navigate('/buyer/marketplace');
              }}
            />
          )
        )}

        {activeTab === 'TRANSACTIONS' && <TransactionHistoryPage />}
        {activeTab === 'INVOICES' && <InvoicesPage />}

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
      {/* Phase 4 Floating Comparison Selection Tray */}
      <ComparisonSelectionBar />
    </div>
  );
}
