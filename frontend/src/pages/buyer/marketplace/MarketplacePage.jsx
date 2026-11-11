import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import marketplaceApi from '@/services/marketplaceApi';
import CategoryNavigation from '@/components/buyer/marketplace/CategoryNavigation';
import ProductSearch from '@/components/buyer/marketplace/ProductSearch';
import ProductFilters from '@/components/buyer/marketplace/ProductFilters';
import ProductSorting from '@/components/buyer/marketplace/ProductSorting';
import ProductGrid from '@/components/buyer/marketplace/ProductGrid';
import BuyerMarketplaceIntelligence from '@/components/buyer/BuyerMarketplaceIntelligence';
import { Sparkles, ShieldCheck, Truck, RefreshCw, Leaf, ChevronDown, ChevronUp } from 'lucide-react';
import '@/styles/marketplace.css';

export default function MarketplacePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [stats, setStats] = useState({ activeListings: 0, totalAvailableKg: 0, avgMandiSavingsPercent: 14.5 });
  const [isLoading, setIsLoading] = useState(true);
  const [showIntelligence, setShowIntelligence] = useState(false);

  // Filters state initialized from searchParams
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'ALL',
    qualityGrade: searchParams.get('qualityGrade') || 'ALL',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    isOrganic: searchParams.get('isOrganic') === 'true',
    availability: searchParams.get('availability') || 'ALL',
    sortBy: searchParams.get('sortBy') || 'recent',
    page: parseInt(searchParams.get('page') || '1', 10),
  });

  // Load categories and stats on mount
  useEffect(() => {
    let mounted = true;

    async function initData() {
      try {
        const [cats, st] = await Promise.all([
          marketplaceApi.getCategories(),
          marketplaceApi.getMarketplaceStats(),
        ]);
        if (mounted) {
          setCategories(cats || []);
          if (st) setStats(st);
        }
      } catch (err) {
        console.error('Failed to load marketplace initial data', err);
      }
    }

    initData();
    return () => { mounted = false; };
  }, []);

  // Fetch filtered produce products
  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {
        page: filters.page,
        limit: 12,
        sortBy: filters.sortBy,
      };

      if (filters.search) params.search = filters.search;
      if (filters.category && filters.category !== 'ALL') params.category = filters.category;
      if (filters.qualityGrade && filters.qualityGrade !== 'ALL') params.qualityGrade = filters.qualityGrade;
      if (filters.minPrice) params.minPrice = Number(filters.minPrice);
      if (filters.maxPrice) params.maxPrice = Number(filters.maxPrice);
      if (filters.isOrganic) params.isOrganic = true;
      if (filters.availability && filters.availability !== 'ALL') params.availability = filters.availability;

      const res = await marketplaceApi.getProducts(params);
      setProducts(res.products || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, totalCount: 0 });
    } catch (err) {
      console.error('Failed to load products', err);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handlers
  const handleCategorySelect = (categoryName) => {
    setFilters((prev) => ({ ...prev, category: categoryName, page: 1 }));
  };

  const handleSearch = (query) => {
    setFilters((prev) => ({ ...prev, search: query, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'ALL',
      qualityGrade: 'ALL',
      minPrice: '',
      maxPrice: '',
      isOrganic: false,
      availability: 'ALL',
      sortBy: 'recent',
      page: 1,
    });
  };

  const handleSortChange = (newSort) => {
    setFilters((prev) => ({ ...prev, sortBy: newSort, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const buyerType = user?.buyerProfile?.buyerType || 'INDIVIDUAL';

  return (
    <div className="marketplace-container">
      {/* ── Marketplace Hero Banner ─────────────────────────────────── */}
      <section className="marketplace-hero">
        <div className="marketplace-hero-header">
          <div className="marketplace-hero-badge">
            <Leaf size={14} className="text-emerald-300" />
            <span>Problem Statement ID 26033 · DoCA Direct Procurement</span>
          </div>

          <h1 className="marketplace-hero-title">
            Explore Fresh Farm Produce
          </h1>

          <p className="marketplace-hero-subtitle">
            Direct farmer-to-buyer agricultural marketplace. Source premium grains, fresh vegetables, pulses, and spices directly from verified FPOs and farmers with transparent APMC mandi price benchmarks.
          </p>

          <div className="marketplace-hero-meta">
            <div className="marketplace-meta-pill">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>{stats.activeListings || 12} Verified Listings</span>
            </div>
            <div className="marketplace-meta-pill">
              <Sparkles size={14} className="text-amber-300" />
              <span>Avg {stats.avgMandiSavingsPercent || 14.5}% Below Mandi Rate</span>
            </div>
            <div className="marketplace-meta-pill">
              <Truck size={14} className="text-blue-300" />
              <span>Two-Tier Cold Chain Logistics</span>
            </div>
          </div>
        </div>

        {/* ── Search Bar Component ────────────────────────────────────── */}
        <ProductSearch
          initialQuery={filters.search}
          onSearch={handleSearch}
        />

        {/* ── AI Procurement Optimizer Toggle ── */}
        <div style={{ maxWidth: 1200, margin: '16px auto 0', padding: '0 16px' }}>
          <button
            type="button"
            onClick={() => setShowIntelligence(!showIntelligence)}
            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl border border-indigo-500/30 shadow-sm hover:brightness-110 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold">
                {showIntelligence ? 'Hide AI Procurement Intelligence' : 'Open AI Procurement Intelligence: Wholesale Valley Detector & Volume Elasticity'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase font-black">
                102-D ML Model
              </span>
            </div>
            {showIntelligence ? <ChevronUp className="w-4 h-4 text-indigo-300" /> : <ChevronDown className="w-4 h-4 text-indigo-300" />}
          </button>

          {showIntelligence && (
            <div className="mt-3 animate-fade-in">
              <BuyerMarketplaceIntelligence initialDestination="Mumbai" />
            </div>
          )}
        </div>
      </section>

      {/* ── Dynamic Category Navigation ─────────────────────────────── */}
      <CategoryNavigation
        categories={categories}
        selectedCategory={filters.category}
        onSelectCategory={handleCategorySelect}
        totalProductCount={pagination.totalCount || stats.activeListings || 12}
      />

      {/* ── Main Layout: Filters Sidebar + Products Grid ─────────────── */}
      <div className="marketplace-layout">
        {/* Left Filter Panel */}
        <ProductFilters
          filters={filters}
          onChangeFilter={handleFilterChange}
          onResetFilters={handleResetFilters}
          totalResults={pagination.totalCount || 0}
        />

        {/* Right Product Grid Area */}
        <main>
          <ProductSorting
            sortBy={filters.sortBy}
            onChangeSort={handleSortChange}
            totalCount={pagination.totalCount || 0}
            buyerType={buyerType}
          />

          <ProductGrid
            products={products}
            isLoading={isLoading}
            pagination={pagination}
            buyerType={buyerType}
            onResetFilters={handleResetFilters}
            onChangePage={handlePageChange}
          />
        </main>
      </div>
    </div>
  );
}
