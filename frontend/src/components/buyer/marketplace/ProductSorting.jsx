import React from 'react';
import { ArrowUpDown, UserCheck, Building } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Listed' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'qty_desc', label: 'Highest Available Quantity' },
  { value: 'harvest_recent', label: 'Freshly Harvested First' },
];

export default function ProductSorting({
  sortBy = 'recent',
  onChangeSort,
  totalCount = 0,
  buyerType = 'INDIVIDUAL',
}) {
  const isB2B = buyerType === 'BUSINESS';

  return (
    <div className="marketplace-content-header">
      <div className="flex items-center gap-3">
        <p className="marketplace-result-count">
          Showing <strong>{totalCount}</strong> verified produce {totalCount === 1 ? 'lot' : 'lots'}
        </p>

        {/* Buyer View Context Pill */}
        <span className={`marketplace-buyer-context ${isB2B ? 'b2b' : 'b2c'}`}>
          {isB2B ? (
            <>
              <Building size={12} />
              <span>B2B Institutional Wholesale Mode</span>
            </>
          ) : (
            <>
              <UserCheck size={12} />
              <span>Consumer Retail Mode</span>
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="sort-by-select" className="text-xs font-bold text-[#68736B] flex items-center gap-1">
          <ArrowUpDown size={13} />
          <span>Sort By:</span>
        </label>
        <select
          id="sort-by-select"
          value={sortBy}
          onChange={(e) => onChangeSort(e.target.value)}
          className="marketplace-sort-select"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
