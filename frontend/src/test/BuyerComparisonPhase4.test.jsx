import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CompareProvider, useCompare } from '../context/CompareContext';
import { ToastProvider } from '../components/Toast';
import ProductCompareButton from '../components/buyer/comparison/ProductCompareButton';
import ComparisonSelectionBar from '../components/buyer/comparison/ComparisonSelectionBar';
import ComparisonPage from '../pages/buyer/comparison/ComparisonPage';
import marketplaceApi from '../services/marketplaceApi';

// Mock marketplaceApi
vi.mock('../services/marketplaceApi', () => ({
  default: {
    getComparisonData: vi.fn(),
    calculateLandedCost: vi.fn(),
    getPriceHistory: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'buyer-test-1', name: 'Test Buyer', role: 'BUYER', buyerType: 'Individual' },
    isAuthenticated: true,
  }),
}));

const sampleProductA = {
  id: 'seed-onion-a',
  cropName: 'Nashik Red Onion (Lot A)',
  category: 'Vegetables',
  qualityGrade: 'GRADE_A',
  askingPricePerKg: 20,
  availableQtyKg: 500,
  totalQuantityKg: 500,
  village: 'Lasalgaon',
  district: 'Nashik',
  state: 'Maharashtra',
  fpo: { name: 'Nashik Krishi Producer Co.' },
};

const sampleProductB = {
  id: 'seed-onion-b',
  cropName: 'Nashik Red Onion (Lot B)',
  category: 'Vegetables',
  qualityGrade: 'GRADE_B',
  askingPricePerKg: 18,
  availableQtyKg: 1200,
  totalQuantityKg: 1200,
  village: 'Manchar',
  district: 'Pune',
  state: 'Maharashtra',
  fpo: { name: 'Pune Sahakari Krishi Producer Company' },
};

// Test harness helper
function TestTrayConsumer() {
  const { selectedListings, addToCompare, clearCompare } = useCompare();
  return (
    <div>
      <span data-testid="compare-count">{selectedListings.length}</span>
      <button onClick={() => addToCompare(sampleProductA)}>Add A</button>
      <button onClick={() => addToCompare(sampleProductB)}>Add B</button>
      <button onClick={clearCompare}>Clear</button>
    </div>
  );
}

describe('Phase 4: Supplier Comparison & Total Landed Cost UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('CompareContext adds listings, prevents duplicates, and enforces 4-item limit', () => {
    render(
      <CompareProvider>
        <TestTrayConsumer />
      </CompareProvider>
    );

    const addABtn = screen.getByText('Add A');
    const addBBtn = screen.getByText('Add B');
    const countEl = screen.getByTestId('compare-count');

    expect(countEl.textContent).toBe('0');

    // Add item A
    fireEvent.click(addABtn);
    expect(countEl.textContent).toBe('1');

    // Duplicate check: Add item A again -> count should remain 1
    fireEvent.click(addABtn);
    expect(countEl.textContent).toBe('1');

    // Add item B -> count becomes 2
    fireEvent.click(addBBtn);
    expect(countEl.textContent).toBe('2');
  });

  it('renders ProductCompareButton and toggles selection state', () => {
    render(
      <ToastProvider>
        <CompareProvider>
          <ProductCompareButton product={sampleProductA} compact />
        </CompareProvider>
      </ToastProvider>
    );

    const button = screen.getByRole('button', { name: /Compare Nashik Red Onion/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Compare')).toBeInTheDocument();

    // Click to add
    fireEvent.click(button);
    expect(screen.getByText('In Compare')).toBeInTheDocument();

    // Click again to remove
    fireEvent.click(button);
    expect(screen.getByText('Compare')).toBeInTheDocument();
  });

  it('renders ComparisonSelectionBar with counter and action buttons when items are selected', () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <CompareProvider>
            <ProductCompareButton product={sampleProductA} compact />
            <ProductCompareButton product={sampleProductB} compact />
            <ComparisonSelectionBar />
          </CompareProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // Initially bar is hidden (0 items)
    expect(screen.queryByText(/Compare Produce/i)).not.toBeInTheDocument();

    // Select Item A
    const btnA = screen.getByRole('button', { name: /Compare Nashik Red Onion \(Lot A\)/i });
    fireEvent.click(btnA);

    // Bar appears with 1 item and hint that at least 2 are needed
    expect(screen.getByText(/Compare Produce/i)).toBeInTheDocument();
    expect(screen.getByText(/Select at least 2 produce lots/i)).toBeInTheDocument();

    // Select Item B
    const btnB = screen.getByRole('button', { name: /Compare Nashik Red Onion \(Lot B\)/i });
    fireEvent.click(btnB);

    // Now 2 items selected, compare button becomes enabled
    const compareNowBtn = screen.getByRole('button', { name: /Compare Now/i });
    expect(compareNowBtn).toBeInTheDocument();
    expect(compareNowBtn).not.toHaveClass('disabled');
  });

  it('renders ComparisonPage with side-by-side specs and Total Landed Cost calculator', async () => {
    marketplaceApi.getComparisonData.mockResolvedValueOnce({
      comparability: {
        status: 'IDENTICAL_COMMODITY',
        message: 'Direct side-by-side comparison across verified Onion suppliers.',
        isSameCommodity: true,
        isSameCategory: true,
      },
      sampleQuantityKg: 100,
      buyerType: 'INDIVIDUAL',
      products: [
        {
          id: 'seed-onion-a',
          cropName: 'Nashik Red Onion (Lot A)',
          category: 'Vegetables',
          qualityGrade: 'GRADE_A',
          availableQtyKg: 500,
          totalQuantityKg: 500,
          pricing: {
            askingPricePerKg: 20,
            pricePerKg: 20,
            pricePerQuintal: 2000,
            pricePerTonne: 20000,
            mandiBenchmark: 26,
            savingsPercent: 23.1,
          },
          quality: {
            grade: 'GRADE_A',
            isOrganic: false,
            daysSinceHarvest: 3,
            inspectionStatus: 'Platform Verified Inspection',
            packagingType: 'Jute Bags',
          },
          supplier: {
            id: 'fpo-1',
            name: 'Nashik Krishi Producer Co.',
            type: 'FPO_PRODUCER_CO',
            isVerified: true,
            location: { village: 'Lasalgaon', district: 'Nashik', state: 'Maharashtra' },
          },
          delivery: {
            roadKm: 45,
            deliveryCost: 850,
            transitHours: 2,
            estimatedTimeWindow: 'Within 2 Hours',
            vehicleType: 'Tempo',
          },
        },
        {
          id: 'seed-onion-b',
          cropName: 'Nashik Red Onion (Lot B)',
          category: 'Vegetables',
          qualityGrade: 'GRADE_B',
          availableQtyKg: 1200,
          totalQuantityKg: 1200,
          pricing: {
            askingPricePerKg: 18,
            pricePerKg: 18,
            pricePerQuintal: 1800,
            pricePerTonne: 18000,
            mandiBenchmark: 26,
            savingsPercent: 30.8,
          },
          quality: {
            grade: 'GRADE_B',
            isOrganic: false,
            daysSinceHarvest: 6,
            inspectionStatus: 'Platform Verified Inspection',
            packagingType: 'Jute Bags',
          },
          supplier: {
            id: 'fpo-2',
            name: 'Pune Sahakari Krishi Producer Company',
            type: 'FPO_PRODUCER_CO',
            isVerified: true,
            location: { village: 'Manchar', district: 'Pune', state: 'Maharashtra' },
          },
          delivery: {
            roadKm: 15,
            deliveryCost: 500,
            transitHours: 1,
            estimatedTimeWindow: 'Same Day Delivery',
            vehicleType: 'Tempo',
          },
        },
      ],
      highlights: {
        lowestProductPriceId: 'seed-onion-b',
        highestAvailableStockId: 'seed-onion-b',
        lowestDeliveryCostId: 'seed-onion-b',
      },
    });

    marketplaceApi.calculateLandedCost.mockResolvedValueOnce({
      requestedQuantityKg: 100,
      calculations: [
        {
          listingId: 'seed-onion-a',
          cropName: 'Nashik Red Onion (Lot A)',
          supplierName: 'Nashik Krishi Producer Co.',
          askingPricePerKg: 20,
          availableQtyKg: 500,
          moqKg: 5,
          fulfillmentStatus: 'CAN_FULFILL',
          breakdown: {
            productCost: 2000,
            deliveryCost: 850,
            handlingFee: 50,
            platformFee: 40,
            taxes: 0,
            bulkDiscount: 0,
            totalLandedCost: 2940,
            effectiveRatePerKg: 29.4,
          },
          deliveryDetails: { roadKm: 45, vehicleType: 'Tempo', estimatedTimeWindow: 'Within 2 Hours' },
        },
        {
          listingId: 'seed-onion-b',
          cropName: 'Nashik Red Onion (Lot B)',
          supplierName: 'Pune Sahakari Krishi Producer Company',
          askingPricePerKg: 18,
          availableQtyKg: 1200,
          moqKg: 5,
          fulfillmentStatus: 'CAN_FULFILL',
          breakdown: {
            productCost: 1800,
            deliveryCost: 500,
            handlingFee: 50,
            platformFee: 36,
            taxes: 0,
            bulkDiscount: 0,
            totalLandedCost: 2386,
            effectiveRatePerKg: 23.86,
          },
          deliveryDetails: { roadKm: 15, vehicleType: 'Tempo', estimatedTimeWindow: 'Same Day Delivery' },
        },
      ],
      highlights: { lowestLandedCostId: 'seed-onion-b', lowestProductCostId: 'seed-onion-b' },
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <CompareProvider>
            {/* Seed 2 items into compare state */}
            <ProductCompareButton product={sampleProductA} />
            <ProductCompareButton product={sampleProductB} />
            <ComparisonPage />
          </CompareProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // Trigger adding both items to compare
    const addBtns = screen.getAllByRole('button', { name: /Compare/i });
    fireEvent.click(addBtns[0]);
    fireEvent.click(addBtns[1]);

    await waitFor(() => {
      expect(screen.getByText('Compare Suppliers & Prices')).toBeInTheDocument();
      expect(screen.getByText(/Total Landed Cost Calculator/i)).toBeInTheDocument();
      expect(screen.getAllByText('Nashik Krishi Producer Co.').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Pune Sahakari Krishi Producer Company').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/₹2,940/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/₹2,386/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
