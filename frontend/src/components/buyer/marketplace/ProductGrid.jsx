import React from 'react';
import ProductCard from './ProductCard';
import { PackageOpen, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductGrid({
  products = [],
  isLoading = false,
  pagination = {},
  buyerType = 'INDIVIDUAL',
  onResetFilters,
  onChangePage,
}) {
  // Skeleton loading state (6 cards)
  if (isLoading) {
    return (
      <div className="marketplace-product-grid" aria-busy="true">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div key={idx} className="marketplace-skeleton-card">
            <div className="marketplace-skeleton-img" />
            <div className="marketplace-skeleton-body">
              <div className="marketplace-skeleton-line" style={{ width: '40%' }} />
              <div className="marketplace-skeleton-line" style={{ width: '80%', height: 18 }} />
              <div className="marketplace-skeleton-line" style={{ width: '60%' }} />
              <div className="marketplace-skeleton-line mt-auto" style={{ width: '50%', height: 24 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!products || products.length === 0) {
    return (
      <div className="marketplace-empty-state">
        <div className="marketplace-empty-icon">
          <PackageOpen size={32} />
        </div>
        <h3 className="text-base font-bold text-[#202820] mb-1">No produce lots found</h3>
        <p className="text-xs text-[#68736B] max-w-md mb-4">
          We couldn't find any produce listings matching your active filters or search terms. Try clearing your filters or selecting another category.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="buyer-btn buyer-btn-primary flex items-center gap-2"
          >
            <RotateCcw size={14} />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    );
  }

  const { page = 1, totalPages = 1 } = pagination;

  return (
    <div>
      <div className="marketplace-product-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            buyerType={buyerType}
          />
        ))}
      </div>

      {/* ── Server-Side Pagination Controls ─────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-[#DDE5DC]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onChangePage(page - 1)}
            className="buyer-icon-btn disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-semibold text-[#68736B] px-3">
            Page <strong className="text-[#202820]">{page}</strong> of <strong className="text-[#202820]">{totalPages}</strong>
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onChangePage(page + 1)}
            className="buyer-icon-btn disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
