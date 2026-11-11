import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useCompare } from '@/context/CompareContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import marketplaceApi from '@/services/marketplaceApi';
import {
  Scale, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, Clock,
  Truck, ShieldCheck, MapPin, Building2, User, Sparkles, HelpCircle,
  TrendingUp, Calendar, Info, Check, X, Layers, AlertCircle, ArrowRight
} from 'lucide-react';
import '@/styles/marketplace.css';

export default function ComparisonPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedIds, removeFromCompare, clearCompare, count } = useCompare();
  const { user } = useAuth();
  const toast = useToast();

  // Query parameter fallback (e.g. /buyer/compare?items=id1,id2)
  const urlItems = searchParams.get('items')
    ? searchParams.get('items').split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const effectiveIds = selectedIds.length >= 2 ? selectedIds : urlItems;

  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);

  // Calculation parameters
  const [procurementQty, setProcurementQty] = useState(100);
  const [buyerType, setBuyerType] = useState(user?.buyerType === 'Wholesaler' || user?.buyerType === 'Supermarket' ? 'BUSINESS' : 'INDIVIDUAL');
  const [landedCostData, setLandedCostData] = useState(null);
  const [priceHistoryData, setPriceHistoryData] = useState(null);

  // Load comparison data
  const loadComparison = useCallback(async () => {
    if (effectiveIds.length < 2) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await marketplaceApi.getComparisonData(effectiveIds, {
        buyerType,
        sampleQuantityKg: procurementQty,
      });

      setComparisonData(data);

      // Also calculate initial landed cost for default quantity
      try {
        const calc = await marketplaceApi.calculateLandedCost({
          listingIds: effectiveIds,
          quantityKg: procurementQty,
          buyerType,
        });
        setLandedCostData(calc);
      } catch {
        // Landed cost fallback
      }

      // Load price history if available for primary crop
      if (data?.products?.[0]?.cropName) {
        try {
          const hist = await marketplaceApi.getPriceHistory(data.products[0].cropName);
          setPriceHistoryData(hist);
        } catch {
          // Ignore
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        'Unable to load comparison data. Please ensure selected listings are currently active.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [effectiveIds, buyerType, procurementQty]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  // Recalculate Landed Cost when quantity or buyer type changes
  const handleRecalculate = async (newQty) => {
    const qtyVal = Math.max(1, parseFloat(newQty) || 1);
    setProcurementQty(qtyVal);

    if (!effectiveIds || effectiveIds.length < 2) return;

    try {
      setIsCalculating(true);
      const calc = await marketplaceApi.calculateLandedCost({
        listingIds: effectiveIds,
        quantityKg: qtyVal,
        buyerType,
      });
      setLandedCostData(calc);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to recalculate landed costs.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Quantity presets
  const QUANTITY_PRESETS = [50, 100, 250, 500, 1000];

  // ── EMPTY STATE (fewer than 2 items selected) ─────────────────────────────
  if (!isLoading && effectiveIds.length < 2) {
    return (
      <div className="marketplace-container" style={{ padding: '40px 0' }}>
        <div className="comparison-empty-panel">
          <div className="comparison-empty-icon">
            <Scale size={42} className="text-[#245C43]" />
          </div>
          <h2 className="text-xl font-bold text-[#202820] mb-2">
            No Produce Lots Selected for Comparison
          </h2>
          <p className="text-sm text-[#68736B] max-w-md mx-auto mb-6">
            Compare up to 4 farmer and FPO produce listings side-by-side to inspect quality grades,
            APMC benchmark savings, and Total Landed Cost before ordering.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate('/buyer/marketplace')}
              className="buyer-btn buyer-btn-primary"
            >
              Browse Live Marketplace Lots
            </button>
            <button
              onClick={() => navigate('/buyer')}
              className="buyer-btn buyer-btn-outline"
            >
              Back to Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR STATE ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="marketplace-container" style={{ padding: '40px 0' }}>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center max-w-lg mx-auto">
          <AlertTriangle size={36} className="text-red-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-red-900 mb-1">Comparison Failed</h3>
          <p className="text-xs text-red-700 mb-4">{error}</p>
          <div className="flex justify-center gap-3">
            <button onClick={loadComparison} className="buyer-btn buyer-btn-primary">
              <RefreshCw size={14} className="mr-1" /> Retry
            </button>
            <button onClick={() => navigate('/buyer/marketplace')} className="buyer-btn buyer-btn-outline">
              Return to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING SKELETON ─────────────────────────────────────────────────────
  if (isLoading || !comparisonData) {
    return (
      <div className="marketplace-container" style={{ padding: '40px 0' }}>
        <div className="comparison-skeleton-header animate-pulse mb-6">
          <div className="h-7 bg-slate-200 rounded w-1/3 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="marketplace-skeleton-card" style={{ height: 420 }} />
          ))}
        </div>
      </div>
    );
  }

  const { products, comparability, highlights, transparencyNotes } = comparisonData;

  return (
    <div className="marketplace-container" style={{ padding: '30px 0 60px' }}>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="comparison-header-block mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate('/buyer/marketplace')}
                className="text-xs font-semibold text-[#245C43] hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Back to Marketplace
              </button>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Phase 4 Procurement Intelligence
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#202820] flex items-center gap-2">
              <Scale size={24} className="text-[#245C43]" />
              <span>Compare Suppliers & Prices</span>
            </h1>
            <p className="text-xs text-[#68736B] mt-1">
              Compare agricultural produce, quality, availability and delivery costs before making an informed decision.
            </p>
          </div>

          {/* Mode Switch & Tray Management */}
          <div className="flex items-center gap-3">
            {/* B2C vs B2B Mode Toggle */}
            <div className="bg-[#E8F0E8] p-1 rounded-lg flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setBuyerType('INDIVIDUAL');
                  handleRecalculate(procurementQty);
                }}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  buyerType === 'INDIVIDUAL'
                    ? 'bg-white text-[#245C43] shadow-sm'
                    : 'text-[#68736B] hover:text-[#202820]'
                }`}
              >
                Consumer (B2C)
              </button>
              <button
                type="button"
                onClick={() => {
                  setBuyerType('BUSINESS');
                  handleRecalculate(procurementQty);
                }}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  buyerType === 'BUSINESS'
                    ? 'bg-white text-[#245C43] shadow-sm'
                    : 'text-[#68736B] hover:text-[#202820]'
                }`}
              >
                Wholesale (B2B)
              </button>
            </div>

            <button
              onClick={() => {
                clearCompare();
                navigate('/buyer/marketplace');
              }}
              className="buyer-btn buyer-btn-outline"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Clear Comparison
            </button>
          </div>
        </div>

        {/* Comparability Notice Banner */}
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            comparability.status === 'IDENTICAL_COMMODITY'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : comparability.status === 'SAME_CATEGORY_DIFFERENT_VARIETY'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {comparability.status === 'IDENTICAL_COMMODITY' ? (
            <CheckCircle size={16} className="text-emerald-700 flex-shrink-0" />
          ) : (
            <Info size={16} className="text-amber-700 flex-shrink-0" />
          )}
          <span>{comparability.message}</span>
        </div>
      </div>

      {/* ── TOTAL LANDED COST CALCULATOR WIDGET ──────────────────────────── */}
      <section
        className="comparison-landed-calculator-card mb-8"
        aria-labelledby="calculator-heading"
      >
        <div className="calculator-header flex flex-wrap items-center justify-between gap-4 p-5 border-b border-[#DDE5DC] bg-white">
          <div>
            <h2 id="calculator-heading" className="text-base font-bold text-[#202820] flex items-center gap-2">
              <Sparkles size={18} className="text-amber-600" />
              <span>Total Landed Cost Calculator</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                Phase 4 Invariant
              </span>
            </h2>
            <p className="text-xs text-[#68736B] mt-0.5">
              Auditable total procurement cost = Farm Gate Produce + Two-Tier Logistics + Handling + Platform Facilitation (0% GST).
            </p>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <label htmlFor="procurement-qty-input" className="text-xs font-bold text-[#202820]">
              Procurement Quantity:
            </label>
            <div className="flex items-center">
              <input
                id="procurement-qty-input"
                type="number"
                min="1"
                max="50000"
                value={procurementQty}
                onChange={(e) => handleRecalculate(e.target.value)}
                className="w-24 px-3 py-1.5 border border-[#DDE5DC] rounded-l-lg text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#245C43]"
              />
              <span className="px-3 py-1.5 bg-[#F8F8F3] border border-l-0 border-[#DDE5DC] rounded-r-lg text-xs font-bold text-[#68736B]">
                kg
              </span>
            </div>
          </div>
        </div>

        {/* Quantity Quick-Chips */}
        <div className="px-5 py-2.5 bg-[#F8F8F3] border-b border-[#DDE5DC] flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Quick Quantity:</span>
          {QUANTITY_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleRecalculate(preset)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                procurementQty === preset
                  ? 'bg-[#245C43] text-white'
                  : 'bg-white border border-[#DDE5DC] text-[#202820] hover:border-[#245C43]'
              }`}
            >
              {preset.toLocaleString('en-IN')} kg
            </button>
          ))}
          {isCalculating && (
            <span className="ml-auto text-xs text-[#245C43] flex items-center gap-1 font-semibold animate-pulse">
              <RefreshCw size={12} className="animate-spin" /> Recalculating...
            </span>
          )}
        </div>

        {/* Landed Cost Breakdown Grid */}
        <div className="p-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {landedCostData?.calculations?.map((calc) => {
              const isLowestLanded = calc.listingId === landedCostData.highlights?.lowestLandedCostId;
              const isLowestProduct = calc.listingId === landedCostData.highlights?.lowestProductCostId;

              return (
                <div
                  key={calc.listingId}
                  className={`p-4 rounded-xl border transition-all ${
                    isLowestLanded
                      ? 'border-[#245C43] bg-[#F8FAF8] ring-1 ring-[#245C43]'
                      : 'border-[#DDE5DC] bg-white'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#202820] truncate" title={calc.cropName}>
                      {calc.cropName}
                    </span>
                    {isLowestLanded && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                        Lowest Landed Cost
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#68736B] truncate mb-3">
                    {calc.supplierName}
                  </p>

                  {/* Fulfillment Status Pill */}
                  <div className="mb-3">
                    {calc.fulfillmentStatus === 'CAN_FULFILL' && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                        <CheckCircle size={12} /> Can Fulfill ({calc.availableQtyKg} kg available)
                      </span>
                    )}
                    {calc.fulfillmentStatus === 'INSUFFICIENT_STOCK' && (
                      <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1 border border-red-200">
                        <AlertTriangle size={12} /> Stock Shortfall (-{calc.shortfallKg} kg)
                      </span>
                    )}
                    {calc.fulfillmentStatus === 'BELOW_MINIMUM_ORDER' && (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                        <AlertCircle size={12} /> Below MOQ ({calc.moqKg} kg minimum)
                      </span>
                    )}
                  </div>

                  {/* Cost Items */}
                  <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
                    <div className="flex justify-between text-slate-600">
                      <span>Produce Subtotal ({procurementQty} kg @ ₹{calc.askingPricePerKg}):</span>
                      <span className="font-semibold text-slate-800">
                        ₹{calc.breakdown.productCost.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span className="flex items-center gap-1">
                        <Truck size={12} className="text-[#245C43]" />
                        Two-Tier Logistics ({calc.deliveryDetails.roadKm} km):
                      </span>
                      <span className="font-semibold text-slate-800">
                        ₹{calc.breakdown.deliveryCost.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Handling & Aggregation (₹0.50/kg):</span>
                      <span>₹{calc.breakdown.handlingFee.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Platform Facilitation (2%):</span>
                      <span>₹{calc.breakdown.platformFee.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Taxes (GST 0% Exempt):</span>
                      <span className="text-emerald-700 font-semibold">₹0</span>
                    </div>

                    {calc.breakdown.bulkDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold text-[11px]">
                        <span>Bulk Volume Incentive (3%):</span>
                        <span>-₹{calc.breakdown.bulkDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  {/* Landed Cost Total */}
                  <div className="mt-4 pt-3 border-t border-[#DDE5DC] bg-[#F8FAF8] -mx-4 -mb-4 p-4 rounded-b-xl">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-slate-700">Total Landed Cost:</span>
                      <span className="text-base font-black text-[#245C43]">
                        ₹{calc.breakdown.totalLandedCost.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                      <span>Effective Unit Price:</span>
                      <span className="font-bold text-slate-800">
                        ₹{calc.breakdown.effectiveRatePerKg}/kg
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SIDE-BY-SIDE DETAILED COMPARISON TABLE ───────────────────────── */}
      <section className="comparison-table-wrapper mb-8" aria-label="Detailed Produce Comparison">
        <div className="overflow-x-auto">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="comparison-th-attribute">Produce Specification</th>
                {products.map((p) => (
                  <th key={p.id} className="comparison-th-product">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => removeFromCompare(p.id)}
                        className="comparison-col-remove"
                        title={`Remove ${p.cropName} from comparison`}
                        aria-label={`Remove ${p.cropName}`}
                      >
                        <X size={14} />
                      </button>

                      <div className="comparison-card-top">
                        <span className="marketplace-card-category">{p.category}</span>
                        <h3 className="text-sm font-bold text-[#202820] mt-1">{p.cropName}</h3>
                        <p className="text-xs text-[#245C43] font-black mt-0.5">
                          ₹{p.pricing.askingPricePerKg}/kg
                        </p>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* ── 1. SUPPLIER & ORIGIN ATTRIBUTION ──────────────────────── */}
              <tr className="comparison-section-row">
                <td colSpan={products.length + 1}>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#245C43] uppercase tracking-wider">
                    <Building2 size={14} /> 1. Supplier & FPO Origin
                  </div>
                </td>
              </tr>

              <tr>
                <td className="comparison-td-label">Supplier / Producer Entity</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <Link
                      to={`/buyer/marketplace/suppliers/${p.supplier.id}`}
                      className="font-bold text-[#245C43] hover:underline flex items-center gap-1"
                    >
                      <span>{p.supplier.name}</span>
                      {p.supplier.isVerified && <CheckCircle size={12} className="text-emerald-600 flex-shrink-0" />}
                    </Link>
                    <span className="text-[11px] text-[#68736B] block mt-0.5">
                      {p.supplier.type === 'FPO_PRODUCER_CO' ? 'Farmer Producer Org' : 'Direct Verified Farmer'}
                      {p.supplier.memberCount > 1 ? ` · ${p.supplier.memberCount} Members` : ''}
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="comparison-td-label">Farm Corridor Location</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <div className="flex items-center gap-1 text-xs text-slate-700">
                      <MapPin size={12} className="text-[#245C43] flex-shrink-0" />
                      <span>
                        {p.supplier.location.village ? `${p.supplier.location.village}, ` : ''}
                        {p.supplier.location.district}, {p.supplier.location.state}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="comparison-td-label">Verification Credentials</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    {p.supplier.isVerified ? (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                        <ShieldCheck size={12} /> Verified Registration & KYC
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Standard Sourcing
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* ── 2. PRICE PER STANDARD UNIT & BENCHMARK ─────────────────── */}
              <tr className="comparison-section-row">
                <td colSpan={products.length + 1}>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#245C43] uppercase tracking-wider">
                    <Sparkles size={14} /> 2. Normalized Price per Standard Unit
                  </div>
                </td>
              </tr>

              <tr>
                <td className="comparison-td-label">Price per Kilogram (1 kg)</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-[#245C43]">
                        ₹{p.pricing.pricePerKg}
                        <span className="text-xs font-normal text-slate-500">/kg</span>
                      </span>
                      {p.id === highlights.lowestProductPriceId && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                          Lowest Price
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="comparison-td-label">Price per Quintal (100 kg)</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val font-semibold text-slate-800">
                    ₹{p.pricing.pricePerQuintal.toLocaleString('en-IN')}/qtl
                  </td>
                ))}
              </tr>

              <tr>
                <td className="comparison-td-label">Price per Tonne (1,000 kg)</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val font-semibold text-slate-800">
                    ₹{p.pricing.pricePerTonne.toLocaleString('en-IN')}/t
                  </td>
                ))}
              </tr>

              <tr>
                <td className="comparison-td-label">APMC Mandi Benchmark (Agmarknet)</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <div className="text-xs">
                      <span className="text-slate-500">Terminal Mandi: ₹{p.pricing.mandiBenchmark}/kg</span>
                      {p.pricing.savingsPercent > 0 && (
                        <span className="block font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1">
                          Save {p.pricing.savingsPercent}% Direct from Farm
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* ── 3. QUALITY GRADE & FRESHNESS ───────────────────────────── */}
              <tr className="comparison-section-row">
                <td colSpan={products.length + 1}>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#245C43] uppercase tracking-wider">
                    <CheckCircle size={14} /> 3. Quality Specifications & Freshness
                  </div>
                </td>
              </tr>

              <tr>
                <td className="comparison-td-label">Quality Grade</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {p.quality.grade.replace('_', ' ')}
                    </span>
                    {p.quality.isOrganic && (
                      <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        🌿 Organic
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="comparison-td-label">Harvest Date & Freshness Index</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <div className="flex items-center gap-1 text-xs text-slate-700">
                      <Clock size={12} className="text-[#245C43]" />
                      <span>
                        {p.quality.daysSinceHarvest != null
                          ? `${p.quality.daysSinceHarvest} days fresh`
                          : 'Recent Harvest'}
                      </span>
                    </div>
                    {p.quality.harvestDate && (
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Harvested: {p.quality.harvestDate}
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="comparison-td-label">Inspection & Packaging</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <p className="text-xs font-semibold text-slate-800">{p.quality.inspectionStatus}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{p.quality.packagingType}</p>
                  </td>
                ))}
              </tr>

              {/* ── 4. INVENTORY & MINIMUM ORDER QUANTITY ───────────────────── */}
              <tr className="comparison-section-row">
                <td colSpan={products.length + 1}>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#245C43] uppercase tracking-wider">
                    <Layers size={14} /> 4. Inventory Availability & MOQ
                  </div>
                </td>
              </tr>

              <tr>
                <td className="comparison-td-label">Available Inventory</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {p.availableQtyKg.toLocaleString('en-IN')} kg
                      </span>
                      {p.id === highlights.highestAvailableStockId && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                          Highest Stock
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Total Lot: {p.totalQuantityKg.toLocaleString('en-IN')} kg
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="comparison-td-label">Minimum Order Quantity (MOQ)</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val font-semibold text-slate-800">
                    {p.moqKg} kg
                    <span className="text-[10px] text-slate-500 font-normal block">
                      {buyerType === 'BUSINESS' ? 'Wholesale commercial threshold' : 'Standard direct consumer pack'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* ── 5. TWO-TIER LOGISTICS & DELIVERY ───────────────────────── */}
              <tr className="comparison-section-row">
                <td colSpan={products.length + 1}>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#245C43] uppercase tracking-wider">
                    <Truck size={14} /> 5. Two-Tier Logistics & Delivery Cost
                  </div>
                </td>
              </tr>

              <tr>
                <td className="comparison-td-label">Road Transit Distance</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <span className="font-bold text-slate-800">{p.delivery.roadKm} km</span>
                    <span className="text-[10px] text-slate-500 block">
                      From {p.supplier.location.district} corridor
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="comparison-td-label">Estimated Delivery Cost</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <span className="font-bold text-slate-800">
                      ₹{p.delivery.deliveryCost.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Vehicle: {p.delivery.vehicleType}
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="comparison-td-label">Estimated Transit Window</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {p.delivery.estimatedTimeWindow}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Approx {p.delivery.transitHours} hour{p.delivery.transitHours > 1 ? 's' : ''} transit
                    </span>
                  </td>
                ))}
              </tr>

              {/* ── ACTION ROW ────────────────────────────────────────────── */}
              <tr>
                <td className="comparison-td-label">Inspect Produce Lot</td>
                {products.map((p) => (
                  <td key={p.id} className="comparison-td-val">
                    <Link
                      to={`/buyer/marketplace/products/${p.id}`}
                      className="buyer-btn buyer-btn-primary w-full text-center text-xs"
                      style={{ padding: '8px 12px' }}
                    >
                      View Produce Details
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PRICE TRANSPARENCY & SOURCING AUDIT TRAIL ─────────────────────── */}
      <section className="p-5 bg-white rounded-xl border border-[#DDE5DC] mb-8">
        <h3 className="text-sm font-bold text-[#202820] mb-2 flex items-center gap-2">
          <HelpCircle size={16} className="text-[#245C43]" />
          <span>Agricultural Pricing Transparency & Audit Disclosure</span>
        </h3>
        <p className="text-xs text-[#68736B] leading-relaxed mb-4">
          SasyaVahini eliminates agricultural broker margins by directly linking buyer purchase orders
          to registered farmer inventory. All prices and logistics cost formulas are fully transparent:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#F8F8F3] rounded-lg border border-[#DDE5DC]">
            <p className="font-bold text-slate-800 mb-1">Direct Farm Gate Price</p>
            <p className="text-slate-600">
              The listed product rate is set directly by the farmer or FPO collective, ensuring 100% of the produce value reaches rural producers.
            </p>
          </div>
          <div className="p-3 bg-[#F8F8F3] rounded-lg border border-[#DDE5DC]">
            <p className="font-bold text-slate-800 mb-1">Two-Tier Logistics</p>
            <p className="text-slate-600">
              Calculated via Shanmukhananda's Logistics Engine (Port 8001): Base Vehicle Fare + (Road Km × per-km rate). No artificial fuel surcharges.
            </p>
          </div>
          <div className="p-3 bg-[#F8F8F3] rounded-lg border border-[#DDE5DC]">
            <p className="font-bold text-slate-800 mb-1">Tax Exempt Status</p>
            <p className="text-slate-600">
              Under GST Notification No. 2/2017-Central Tax, unprocessed agricultural commodities are exempt from GST (0% tax rate).
            </p>
          </div>
        </div>

        {/* Agmarknet 7-Day Price History Corridor if Available */}
        {priceHistoryData?.hasHistory && priceHistoryData.history?.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#202820] flex items-center gap-1.5">
                <TrendingUp size={14} className="text-amber-600" />
                <span>Agmarknet Mandi 7-Day Modal Price Trajectory ({priceHistoryData.crop})</span>
              </p>
              <span className="text-[11px] text-slate-500">Live Agmarknet APMC Corridor</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {priceHistoryData.history.map((day) => (
                <div
                  key={day.date}
                  className="p-2 bg-slate-50 rounded border border-slate-200 text-center min-w-[90px]"
                >
                  <span className="text-[10px] text-slate-500 block">{day.date}</span>
                  <span className="text-xs font-bold text-[#245C43]">
                    ₹{day.mandiRate}/kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
