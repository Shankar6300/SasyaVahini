import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import marketplaceApi from '@/services/marketplaceApi';
import ProductCard from '@/components/buyer/marketplace/ProductCard';
import ProductCompareButton from '@/components/buyer/comparison/ProductCompareButton';
import {
  ChevronLeft, MapPin, Sparkles, Building2, User, CheckCircle,
  Clock, ShieldCheck, Leaf, ArrowRight, Package, Info, AlertTriangle, ExternalLink
} from 'lucide-react';
import '@/styles/marketplace.css';

export default function ProductDetailPage({ productId: propProductId }) {
  const params = useParams();
  const location = useLocation();
  const productId =
    propProductId ||
    params.productId ||
    (location.pathname.includes('/products/')
      ? location.pathname.split('/products/')[1]?.split('?')[0]?.split('/')[0]
      : null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await marketplaceApi.getProductById(productId);
        if (isMounted) {
          if (data) {
            setProduct(data);
            setRelatedProducts(data.relatedProduce || []);
          } else {
            setError('Produce listing not found.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load produce lot details.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (productId) {
      loadData();
      window.scrollTo(0, 0);
    } else {
      setIsLoading(false);
      setError('Produce lot ID not found in URL.');
    }

    return () => { isMounted = false; };
  }, [productId]);

  if (isLoading) {
    return (
      <div className="marketplace-container" style={{ padding: '40px 0' }}>
        <div className="marketplace-skeleton-card" style={{ height: 480 }}>
          <div className="marketplace-skeleton-img" style={{ height: '100%' }} />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="marketplace-container" style={{ padding: '60px 0' }}>
        <div className="marketplace-empty-state">
          <AlertTriangle size={36} className="text-amber-600 mb-3" />
          <h2 className="text-lg font-bold text-[#202820] mb-2">{error || 'Produce lot not found'}</h2>
          <p className="text-xs text-[#68736B] mb-5">The requested produce batch may have been reserved or does not exist.</p>
          <Link to="/buyer/marketplace" className="buyer-btn buyer-btn-primary">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const {
    id,
    cropName,
    category,
    qualityGrade = 'GRADE_A',
    isOrganic = false,
    askingPricePerKg = 0,
    minPricePerKg,
    mandiBenchmark = 0,
    savingsPercent = 0,
    totalQuantityKg = 0,
    reservedQty = 0,
    soldQty = 0,
    availableQtyKg = totalQuantityKg,
    minOrderQtyKg = 50,
    shelfLifeDays = 7,
    village,
    district,
    state,
    harvestDate,
    daysSinceHarvest,
    farmer,
    fpo,
    description,
    imageUrl,
  } = product;

  const supplier = fpo || farmer || {};
  const isFpo = !!fpo?.name;
  const supplierName = supplier.name || 'Verified Agricultural Producer';
  const supplierId = supplier.id || id;
  const buyerType = user?.buyerProfile?.buyerType || 'INDIVIDUAL';

  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect fill="%23E8F0E8" width="600" height="400"/><text fill="%23245C43" font-family="sans-serif" font-size="28" font-weight="bold" x="50%" y="45%" text-anchor="middle">🌱 ${encodeURIComponent(cropName)}</text><text fill="%2368736B" font-family="sans-serif" font-size="16" x="50%" y="58%" text-anchor="middle">SasyaVahini Verified Agricultural Lot</text></svg>`;

  return (
    <div className="marketplace-container">
      {/* ── Breadcrumb Navigation ────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs text-[#68736B] mb-6 font-medium" aria-label="Breadcrumb">
        <Link to="/buyer/marketplace" className="hover:text-[#245C43] flex items-center gap-1">
          <ChevronLeft size={14} />
          <span>Marketplace</span>
        </Link>
        <span>/</span>
        <span className="text-[#68736B]">{category}</span>
        <span>/</span>
        <span className="text-[#202820] font-bold">{cropName}</span>
      </nav>

      {/* ── Main Product Detail Card ─────────────────────────────────── */}
      <div className="product-detail-layout">
        {/* Left Column: Image Gallery */}
        <div>
          <div className="product-gallery-main">
            <img
              src={!imageError && imageUrl ? imageUrl : fallbackSvg}
              alt={cropName}
              onError={() => setImageError(true)}
            />
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`marketplace-grade-badge ${isOrganic ? 'organic' : 'grade-a'}`}>
                {isOrganic ? '🌿 Organic Certified' : qualityGrade.replace('_', ' ')}
              </span>
              {daysSinceHarvest != null && (
                <span className="marketplace-freshness-badge">
                  <Clock size={12} />
                  <span>{daysSinceHarvest === 0 ? 'Harvested Today' : `${daysSinceHarvest} Days Fresh`}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Provenance Badges */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-[#F8F8F3] border border-[#DDE5DC] rounded-xl flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-emerald-700 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-[#202820]">100% Quality Verified</p>
                <p className="text-[10px] text-[#68736B]">Direct farm cluster inspection</p>
              </div>
            </div>
            <div className="p-3 bg-[#F8F8F3] border border-[#DDE5DC] rounded-xl flex items-center gap-2.5">
              <Leaf size={18} className="text-[#245C43] flex-shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-[#202820]">Zero Intermediaries</p>
                <p className="text-[10px] text-[#68736B]">100% payout to farmer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing, Specs & Supplier */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#68736B] uppercase tracking-wider">{category}</span>
            <span className="text-xs text-[#68736B] flex items-center gap-1">
              <MapPin size={13} className="text-[#245C43]" />
              <span>{village ? `${village}, ` : ''}{district}, {state}</span>
            </span>
          </div>

          <h1 className="text-2xl font-black text-[#202820] mb-3">{cropName}</h1>

          <p className="text-xs text-[#68736B] leading-relaxed mb-5">
            {description || 'Direct harvest from agricultural collective. Graded, sorted and ready for immediate two-tier cold chain dispatch.'}
          </p>

          {/* Direct Farm Price & Mandi Benchmark Comparison */}
          <div className="p-4 bg-[#F8F8F3] border border-[#DDE5DC] rounded-xl mb-5">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-xs text-[#68736B] font-semibold">Direct Farm Gate Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#245C43]">₹{askingPricePerKg}</span>
                  <span className="text-sm font-semibold text-[#68736B]">/ kg</span>
                </div>
              </div>

              {mandiBenchmark > 0 && (
                <div className="text-right">
                  <span className="text-xs text-[#68736B] block">APMC Mandi Rate</span>
                  <span className="text-base font-bold text-[#95A09A] line-through">₹{mandiBenchmark}/kg</span>
                </div>
              )}
            </div>

            {savingsPercent > 0 && (
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <Sparkles size={14} className="text-amber-600 flex-shrink-0" />
                <span>Save ~{savingsPercent}% compared to current terminal APMC mandi rates!</span>
              </div>
            )}
          </div>

          {/* Inventory Stock & Invariant Transparency */}
          <div className="mb-5 p-3.5 bg-white border border-[#DDE5DC] rounded-xl">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-[#68736B] font-medium">Batch Inventory Availability</span>
              <span className="font-bold text-[#202820]">
                {availableQtyKg.toLocaleString('en-IN')} kg available / {totalQuantityKg.toLocaleString('en-IN')} kg total
              </span>
            </div>
            <div className="marketplace-stock-bar-wrap mb-2">
              <div
                className="marketplace-stock-bar-fill"
                style={{ width: `${Math.min(100, Math.max(10, (availableQtyKg / (totalQuantityKg || 1)) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#68736B]">
              <span>Reserved: {reservedQty} kg</span>
              <span>Minimum Lot Size: {minOrderQtyKg} kg</span>
            </div>
          </div>

          {/* Supplier Card */}
          <div className="p-4 bg-white border border-[#DDE5DC] rounded-xl mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="marketplace-supplier-avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                {isFpo ? <Building2 size={18} /> : <User size={18} />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-[#202820]">{supplierName}</h4>
                  <CheckCircle size={14} className="text-emerald-600" />
                </div>
                <p className="text-xs text-[#68736B]">
                  {isFpo ? 'Farmer Producer Organization (Verified)' : 'Individual Farmer Producer'} · {district}, {state}
                </p>
              </div>
            </div>

            <Link
              to={`/buyer/marketplace/suppliers/${supplierId}`}
              className="text-xs font-bold text-[#245C43] hover:underline flex items-center gap-1"
            >
              <span>View Profile</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          {/* Phase 4: Compare Action */}
          <div className="mb-4">
            <ProductCompareButton product={product} />
          </div>

          {/* Phase 3 Scope Notice */}
          <div className="mt-auto p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
            <Info size={16} className="text-emerald-700 flex-shrink-0" />
            <span>
              <strong>Phase 3 Live Discovery:</strong> Direct farm lot verified. Full order contracting and escrow payment workflow will be unlocked in Phase 4 & 5.
            </span>
          </div>
        </div>
      </div>

      {/* ── Agricultural Specifications ──────────────────────────────── */}
      <section className="mb-10 bg-white border border-[#DDE5DC] rounded-2xl p-6">
        <h3 className="text-base font-bold text-[#202820] mb-4 flex items-center gap-2">
          <Leaf size={18} className="text-[#245C43]" />
          <span>Agricultural Lot Specifications</span>
        </h3>

        <div className="grid md:grid-cols-2 gap-x-8">
          <table className="product-specs-table">
            <tbody>
              <tr>
                <td className="product-specs-label">Crop Name</td>
                <td className="product-specs-value">{cropName}</td>
              </tr>
              <tr>
                <td className="product-specs-label">Category</td>
                <td className="product-specs-value">{category}</td>
              </tr>
              <tr>
                <td className="product-specs-label">Quality Grade</td>
                <td className="product-specs-value">{qualityGrade.replace('_', ' ')}</td>
              </tr>
              <tr>
                <td className="product-specs-label">Organic Certified</td>
                <td className="product-specs-value">{isOrganic ? 'Yes (Certified)' : 'Conventional Cultivation'}</td>
              </tr>
            </tbody>
          </table>

          <table className="product-specs-table">
            <tbody>
              <tr>
                <td className="product-specs-label">Harvest Date</td>
                <td className="product-specs-value">
                  {harvestDate ? new Date(harvestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                </td>
              </tr>
              <tr>
                <td className="product-specs-label">Expected Shelf Life</td>
                <td className="product-specs-value">{shelfLifeDays} Days</td>
              </tr>
              <tr>
                <td className="product-specs-label">Minimum Order Qty</td>
                <td className="product-specs-value">{minOrderQtyKg} kg</td>
              </tr>
              <tr>
                <td className="product-specs-label">Farm Origin</td>
                <td className="product-specs-value">{village ? `${village}, ` : ''}{district}, {state}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Related Produce Lots ─────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#202820]">Related Produce in {category}</h3>
            <Link to={`/buyer/marketplace?category=${encodeURIComponent(category)}`} className="text-xs font-bold text-[#245C43] hover:underline">
              View All {category} →
            </Link>
          </div>

          <div className="marketplace-product-grid">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                buyerType={buyerType}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
