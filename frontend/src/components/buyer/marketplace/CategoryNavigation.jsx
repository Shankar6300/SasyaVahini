import React from 'react';
import { Layers } from 'lucide-react';

/**
 * CategoryNavigation Component (Phase 3)
 * Displays dynamic agricultural category pills with product counts and active highlights.
 */
export default function CategoryNavigation({
  categories = [],
  selectedCategory = 'ALL',
  onSelectCategory,
  totalProductCount = 0,
}) {
  return (
    <nav className="marketplace-categories-bar" aria-label="Product categories">
      {/* "All Produce" category button */}
      <button
        type="button"
        onClick={() => onSelectCategory('ALL')}
        className={`marketplace-category-card ${selectedCategory === 'ALL' ? 'active' : ''}`}
        aria-pressed={selectedCategory === 'ALL'}
      >
        <span className="marketplace-category-icon">🌾</span>
        <span className="marketplace-category-name">All Produce</span>
        <span className="marketplace-category-count">{totalProductCount}</span>
      </button>

      {/* Dynamic categories fetched from backend */}
      {categories.map((cat) => {
        const isSelected =
          selectedCategory.toUpperCase() === cat.name.toUpperCase();

        return (
          <button
            key={cat.id || cat.name}
            type="button"
            onClick={() => onSelectCategory(cat.name)}
            className={`marketplace-category-card ${isSelected ? 'active' : ''}`}
            aria-pressed={isSelected}
          >
            <span className="marketplace-category-icon">{cat.icon || '🌱'}</span>
            <span className="marketplace-category-name">{cat.name}</span>
            <span className="marketplace-category-count">{cat.count}</span>
          </button>
        );
      })}
    </nav>
  );
}
