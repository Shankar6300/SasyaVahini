import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../components/buyer/marketplace/ProductCard';
import CategoryNavigation from '../components/buyer/marketplace/CategoryNavigation';
import ProductFilters from '../components/buyer/marketplace/ProductFilters';
import ProductSorting from '../components/buyer/marketplace/ProductSorting';

const mockProduct = {
  id: 'lot-test-tomato-01',
  cropName: 'Nashik Red Tomato',
  category: 'Vegetables',
  qualityGrade: 'GRADE_A',
  isOrganic: false,
  askingPricePerKg: 24,
  mandiBenchmark: 28,
  savingsPercent: 14.3,
  totalQuantityKg: 2000,
  availableQtyKg: 1800,
  village: 'Pimpalgaon',
  district: 'Nashik',
  state: 'Maharashtra',
  daysSinceHarvest: 1,
  farmer: { name: 'Sunil Jadhav', district: 'Nashik', aadhaarVerified: true },
  fpo: { name: 'Nashik Krishi FPO', district: 'Nashik' },
};

describe('Phase 3 Agricultural Marketplace UI Components', () => {
  it('renders ProductCard with accurate crop name, grade, available stock, and mandi savings', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} buyerType="INDIVIDUAL" />
      </BrowserRouter>
    );

    expect(screen.getByText('Nashik Red Tomato')).toBeInTheDocument();
    expect(screen.getByText('Vegetables')).toBeInTheDocument();
    expect(screen.getByText('GRADE A')).toBeInTheDocument();
    expect(screen.getByText(/vs APMC Mandi/i)).toBeInTheDocument();
    expect(screen.getByText('14.3%')).toBeInTheDocument();
    expect(screen.getByText(/1,800 kg/)).toBeInTheDocument();
    expect(screen.getByText('₹24')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('renders CategoryNavigation with dynamic categories and handles category selection', () => {
    const handleSelect = vi.fn();
    const categories = [
      { name: 'Vegetables', count: 4, icon: '🥦' },
      { name: 'Grains', count: 2, icon: '🌾' },
    ];

    render(
      <CategoryNavigation
        categories={categories}
        selectedCategory="ALL"
        onSelectCategory={handleSelect}
        totalProductCount={6}
      />
    );

    expect(screen.getByText('All Produce')).toBeInTheDocument();
    expect(screen.getByText('Vegetables')).toBeInTheDocument();
    expect(screen.getByText('Grains')).toBeInTheDocument();

    const vegBtn = screen.getByText('Vegetables');
    fireEvent.click(vegBtn);
    expect(handleSelect).toHaveBeenCalledWith('Vegetables');
  });

  it('renders ProductFilters and triggers filter change callbacks', () => {
    const handleChange = vi.fn();
    const handleReset = vi.fn();
    const filters = {
      qualityGrade: 'ALL',
      minPrice: '',
      maxPrice: '',
      isOrganic: false,
      availability: 'ALL',
    };

    render(
      <ProductFilters
        filters={filters}
        onChangeFilter={handleChange}
        onResetFilters={handleReset}
        totalResults={12}
      />
    );

    expect(screen.getByText('Quality Grade')).toBeInTheDocument();
    expect(screen.getByText('Price Range (₹/kg)')).toBeInTheDocument();

    const organicCheckbox = screen.getByLabelText(/Organic Certified Only/i);
    fireEvent.click(organicCheckbox);
    expect(handleChange).toHaveBeenCalledWith('isOrganic', true);

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalled();
  });

  it('renders ProductSorting and switches sorting options', () => {
    const handleSortChange = vi.fn();

    render(
      <ProductSorting
        sortBy="recent"
        onChangeSort={handleSortChange}
        totalCount={12}
        buyerType="BUSINESS"
      />
    );

    expect(screen.getByText(/B2B Institutional Wholesale Mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();

    const select = screen.getByLabelText(/sort by/i);
    fireEvent.change(select, { target: { value: 'price_asc' } });
    expect(handleSortChange).toHaveBeenCalledWith('price_asc');
  });
});
