import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCompareButton from '@/components/buyer/comparison/ProductCompareButton';
import { MapPin, Sparkles, Building2, User, CheckCircle, Clock, ArrowRight, ShieldCheck, Layers } from 'lucide-react';

/**
 * ProductCard Component (Phase 3)
 * Displays a single agricultural produce listing with direct farm pricing,
 * APMC Mandi benchmark savings, available inventory progress, and supplier metadata.
 */
export default function ProductCard({ product, buyerType = 'INDIVIDUAL' }) {
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const {
    id,
    cropName,
    category,
    qualityGrade = 'GRADE_A',
    isOrganic = false,
    askingPricePerKg = 0,
    mandiBenchmark = 0,
    savingsPercent = 0,
    totalQuantityKg = 0,
    availableQtyKg = totalQuantityKg,
    village,
    district,
    state,
    harvestDate,
    daysSinceHarvest,
    farmer,
    fpo,
    imageUrl,
  } = product;

  // Grade color class
  const getGradeClass = (grade) => {
    if (grade === 'ORGANIC_PREMIUM' || isOrganic) return 'organic';
    if (grade === 'GRADE_A') return 'grade-a';
    return 'grade-b';
  };

  // Stock percentage
  const stockRatio = totalQuantityKg > 0 ? (availableQtyKg / totalQuantityKg) * 100 : 0;
  const isLowStock = availableQtyKg < 100 && availableQtyKg > 0;

  // Fallback crop image placeholder using SVG
  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="%23E8F0E8" width="300" height="200"/><text fill="%23245C43" font-family="sans-serif" font-size="16" font-weight="bold" x="50%" y="45%" text-anchor="middle">🌱 ${encodeURIComponent(cropName || 'Farm Produce')}</text><text fill="%2368736B" font-family="sans-serif" font-size="12" x="50%" y="60%" text-anchor="middle">SasyaVahini Verified Lot</text></svg>`;

  const isB2B = buyerType === 'BUSINESS';
  const supplierName = fpo?.name || farmer?.name || 'Verified FPO Producer Collective';
  const supplierId = fpo?.id || farmer?.id || id;
  const isFpo = !!fpo?.name;

  return (
    <article className="marketplace-product-card" aria-label={`${cropName} produce card`}>
      {/* ── Image & Top Badges ────────────────────────────────────────── */}
      <div className="marketplace-card-image-wrap">
        <img
          src={!imageError && imageUrl ? imageUrl : fallbackSvg}
          alt={cropName}
          className="marketplace-card-img"
          onError={() => setImageError(true)}
          loading="lazy"
        />

        <div className="marketplace-card-badges">
          <span className={`marketplace-grade-badge ${getGradeClass(qualityGrade)}`}>
            {isOrganic ? '🌿 Organic' : qualityGrade.replace('_', ' ')}
          </span>

          {daysSinceHarvest != null && (
            <span className="marketplace-freshness-badge">
              <Clock size={11} />
              <span>{daysSinceHarvest === 0 ? 'Harvested Today' : `${daysSinceHarvest}d Fresh`}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Card Content ─────────────────────────────────────────────── */}
      <div className="marketplace-card-body">
        <div className="flex items-center justify-between">
          <span className="marketplace-card-category">{category || 'Produce'}</span>
          {isB2B && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              Bulk Lot
            </span>
          )}
        </div>

        <h3 className="marketplace-card-title">{cropName}</h3>

        <div className="marketplace-card-origin">
          <MapPin size={12} className="text-[#245C43] flex-shrink-0" />
          <span className="truncate">
            {village ? `${village}, ` : ''}{district ? `${district}, ` : ''}{state || 'India'}
          </span>
        </div>

        {/* Supplier Attribution */}
        <Link
          to={`/buyer/marketplace/suppliers/${supplierId}`}
          className="marketplace-card-supplier hover:border-[#245C43] transition-colors"
          title={`View supplier profile: ${supplierName}`}
        >
          <div className="marketplace-supplier-avatar">
            {isFpo ? <Building2 size={13} /> : <User size={13} />}
          </div>
          <div className="marketplace-supplier-info">
            <p className="marketplace-supplier-name flex items-center gap-1">
              <span>{supplierName}</span>
              <CheckCircle size={11} className="text-emerald-600 flex-shrink-0" />
            </p>
            <p className="marketplace-supplier-type">
              {isFpo ? 'Farmer Producer Org' : 'Direct Verified Farmer'}
            </p>
          </div>
        </Link>

        {/* APMC Mandi Savings Pill */}
        {savingsPercent > 0 && (
          <div className="marketplace-mandi-savings">
            <Sparkles size={13} className="text-amber-600 flex-shrink-0" />
            <span>
              Save <strong>{savingsPercent}%</strong> vs APMC Mandi
            </span>
          </div>
        )}

        {/* Available Stock Indicator */}
        <div className="marketplace-stock-block">
          <div className="marketplace-stock-header">
            <span>Available Stock</span>
            <span className="font-bold text-[#202820]">
              {availableQtyKg.toLocaleString('en-IN')} kg
            </span>
          </div>
          <div className="marketplace-stock-bar-wrap">
            <div
              className={`marketplace-stock-bar-fill ${isLowStock ? 'low' : ''}`}
              style={{ width: `${Math.min(100, Math.max(10, stockRatio))}%` }}
            />
          </div>
        </div>

        {/* ── Footer: Direct Farm Price & CTA ──────────────────────────── */}
        <div className="marketplace-card-footer">
          <div className="marketplace-price-block">
            <p className="marketplace-asking-price">
              ₹{askingPricePerKg}
              <span>/kg</span>
            </p>
            {mandiBenchmark > askingPricePerKg && (
              <span className="marketplace-mandi-cross">Mandi ₹{mandiBenchmark}/kg</span>
            )}
          </div>

          <Link
            to={`/buyer/marketplace/products/${id}`}
            className="marketplace-card-btn"
          >
            <span>View Details</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}
