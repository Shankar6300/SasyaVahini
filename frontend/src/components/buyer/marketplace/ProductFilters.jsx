import React from 'react';
import { Filter, RotateCcw, Check, Sparkles } from 'lucide-react';

const QUALITY_GRADES = [
  { value: 'ALL', label: 'All Grades' },
  { value: 'GRADE_A', label: 'Grade A (Premium)' },
  { value: 'GRADE_B', label: 'Grade B (Standard)' },
  { value: 'GRADE_C', label: 'Grade C' },
  { value: 'ORGANIC_PREMIUM', label: 'Organic Premium' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'ALL', label: 'All Lots' },
  { value: 'IN_STOCK', label: 'In Stock (>100 kg)' },
  { value: 'LOW_STOCK', label: 'Low Stock (<100 kg)' },
];

export default function ProductFilters({
  filters,
  onChangeFilter,
  onResetFilters,
  totalResults = 0,
}) {
  return (
    <aside className="marketplace-filter-panel" aria-label="Product filters">
      <div className="marketplace-filter-header">
        <div className="marketplace-filter-title">
          <Filter size={16} className="text-[#245C43]" />
          <span>Filters</span>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="marketplace-filter-reset flex items-center gap-1"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      {/* ── Quality Grade Filter ───────────────────────────────────────── */}
      <div className="marketplace-filter-group">
        <h4 className="marketplace-filter-group-title">Quality Grade</h4>
        <div className="marketplace-pill-options">
          {QUALITY_GRADES.map((grade) => {
            const active = (filters.qualityGrade || 'ALL') === grade.value;
            return (
              <button
                key={grade.value}
                type="button"
                onClick={() => onChangeFilter('qualityGrade', grade.value)}
                className={`marketplace-filter-pill ${active ? 'active' : ''}`}
              >
                {grade.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Price Range Filter (₹/kg) ─────────────────────────────────── */}
      <div className="marketplace-filter-group">
        <h4 className="marketplace-filter-group-title">Price Range (₹/kg)</h4>
        <div className="marketplace-price-inputs">
          <div>
            <label className="text-[10px] text-[#68736B] block mb-1">Min ₹</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={filters.minPrice || ''}
              onChange={(e) => onChangeFilter('minPrice', e.target.value)}
              className="marketplace-price-input"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#68736B] block mb-1">Max ₹</label>
            <input
              type="number"
              min="0"
              placeholder="500"
              value={filters.maxPrice || ''}
              onChange={(e) => onChangeFilter('maxPrice', e.target.value)}
              className="marketplace-price-input"
            />
          </div>
        </div>
      </div>

      {/* ── Organic Certified Toggle ──────────────────────────────────── */}
      <div className="marketplace-filter-group">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!filters.isOrganic}
            onChange={(e) => onChangeFilter('isOrganic', e.target.checked)}
            className="w-4 h-4 accent-[#245C43] rounded"
          />
          <span className="text-xs font-bold text-[#202820] flex items-center gap-1.5">
            <span>🌿 Organic Certified Only</span>
          </span>
        </label>
      </div>

      {/* ── Stock Availability ────────────────────────────────────────── */}
      <div className="marketplace-filter-group">
        <h4 className="marketplace-filter-group-title">Inventory Availability</h4>
        <div className="space-y-1.5">
          {AVAILABILITY_OPTIONS.map((opt) => {
            const active = (filters.availability || 'ALL') === opt.value;
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-xs font-semibold text-[#202820] cursor-pointer"
              >
                <input
                  type="radio"
                  name="availability"
                  checked={active}
                  onChange={() => onChangeFilter('availability', opt.value)}
                  className="accent-[#245C43]"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
