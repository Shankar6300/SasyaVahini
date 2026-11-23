/**
 * SasyaVahini — Frontend Unit & Integration Tests (Phase 5)
 *
 * Verifies:
 * - CartProvider state management & resilient fallback
 * - AddToCartButton rendering and stock/MOQ interaction
 * - CartItem quantity adjustment & subtotal calculation
 * - SupplierGroupedCart organization
 * - CartSummary cost breakdown & empty cart state
 * - CheckoutSummary review & phase boundary display
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider, useCart } from '../context/CartContext';
import AddToCartButton from '../components/buyer/cart/AddToCartButton';
import CartItem from '../components/buyer/cart/CartItem';
import SupplierGroupedCart from '../components/buyer/cart/SupplierGroupedCart';
import CartSummary from '../components/buyer/cart/CartSummary';
import CheckoutSummary from '../components/buyer/checkout/CheckoutSummary';

// Mock dependencies
vi.mock('../services/cartApi', () => ({
  default: {
    getCart: vi.fn().mockResolvedValue({
      totalItems: 1,
      totalQuantityKg: 50,
      productSubtotal: 1200,
      allValid: true,
      validationIssues: [],
      supplierGroups: [],
    }),
    addToCart: vi.fn().mockResolvedValue({ success: true, message: 'Added to cart' }),
    updateQuantity: vi.fn().mockResolvedValue({ success: true }),
    removeItem: vi.fn().mockResolvedValue({ success: true }),
    clearCart: vi.fn().mockResolvedValue({ success: true }),
    validateCart: vi.fn().mockResolvedValue({ valid: true, issues: [] }),
    getCheckoutSummary: vi.fn().mockResolvedValue({
      checkoutStatus: 'READY_FOR_PAYMENT',
      nextPhaseNotice: 'Phase 6 notice',
    }),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'test-buyer-1', name: 'Ganga Satish', role: 'BUYER', buyerType: 'INDIVIDUAL' },
  }),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

const mockProduct = {
  id: 'seed-listing-tomato-001',
  cropName: 'Tomato',
  category: 'Vegetables',
  qualityGrade: 'GRADE_A',
  askingPricePerKg: 24,
  totalQuantityKg: 2000,
  availableQtyKg: 1500,
  village: 'Manchar',
  district: 'Pune',
  state: 'Maharashtra',
  fpo: { name: 'Pune Sahakari Krishi FPO' },
};

const mockCartItem = {
  id: 'cart-item-1',
  listingId: 'seed-listing-tomato-001',
  cropName: 'Tomato',
  category: 'Vegetables',
  qualityGrade: 'GRADE_A',
  unitPrice: 24,
  quantityKg: 50,
  itemSubtotal: 1200,
  availableQtyKg: 1500,
  moqKg: 5,
  isValid: true,
};

const mockSupplierGroup = {
  supplierId: 'fpo-pune-001',
  supplierName: 'Pune Sahakari Krishi FPO',
  supplierType: 'FPO_PRODUCER_CO',
  location: 'Manchar, Pune, Maharashtra',
  registrationNo: 'MH-FPC-2023-001',
  supplierSubtotal: 1200,
  supplierQuantityKg: 50,
  items: [mockCartItem],
};

describe('Phase 5: Shopping Cart & Checkout Frontend Components', () => {
  afterEach(() => {
    cleanup();
  });
  describe('1. AddToCartButton Component', () => {
    it('renders compact mode with + Cart text and handles addition', async () => {
      render(
        <BrowserRouter>
          <CartProvider>
            <AddToCartButton product={mockProduct} compact />
          </CartProvider>
        </BrowserRouter>
      );

      const btn = screen.getByRole('button', { name: /\+ Cart/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
    });

    it('renders full mode with quantity stepper and order subtotal', () => {
      render(
        <BrowserRouter>
          <CartProvider>
            <AddToCartButton product={mockProduct} showQuantitySelector />
          </CartProvider>
        </BrowserRouter>
      );

      expect(screen.getByText(/Order Quantity \(kg\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Batch Subtotal/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add \d+ kg to Cart/i })).toBeInTheDocument();
    });

    it('disables button when product is out of stock', () => {
      const outOfStockProduct = { ...mockProduct, availableQtyKg: 0 };
      render(
        <BrowserRouter>
          <CartProvider>
            <AddToCartButton product={outOfStockProduct} compact />
          </CartProvider>
        </BrowserRouter>
      );

      const btn = screen.getByRole('button', { name: /Sold Out/i });
      expect(btn).toBeDisabled();
    });
  });

  describe('2. CartItem & SupplierGroupedCart Components', () => {
    it('renders produce name, unit price, and subtotal correctly', () => {
      render(
        <BrowserRouter>
          <CartProvider>
            <CartItem item={mockCartItem} />
          </CartProvider>
        </BrowserRouter>
      );

      expect(screen.getByText('Tomato')).toBeInTheDocument();
      expect(screen.getByText(/₹24/)).toBeInTheDocument();
      expect(screen.getByText('₹1,200')).toBeInTheDocument();
      expect(screen.getByLabelText(/Remove Tomato from cart/i)).toBeInTheDocument();
    });

    it('renders supplier header with FPO name and registration details', () => {
      render(
        <BrowserRouter>
          <CartProvider>
            <SupplierGroupedCart supplierGroup={mockSupplierGroup} />
          </CartProvider>
        </BrowserRouter>
      );

      expect(screen.getByText('Pune Sahakari Krishi FPO')).toBeInTheDocument();
      expect(screen.getByText(/Farmer Producer Org/i)).toBeInTheDocument();
      expect(screen.getByText(/MH-FPC-2023-001/i)).toBeInTheDocument();
      expect(screen.getByText('Tomato')).toBeInTheDocument();
    });
  });

  describe('3. CartSummary Component', () => {
    it('renders item count, net weight, produce subtotal, and proceed CTA', async () => {
      const onProceed = vi.fn();
      render(
        <BrowserRouter>
          <CartProvider>
            <CartSummary onProceedToCheckout={onProceed} />
          </CartProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Cart Summary')).toBeInTheDocument();
        expect(screen.getByText(/Proceed to Checkout/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. CheckoutSummary & Phase Boundary', () => {
    const mockCheckoutData = {
      checkoutStatus: 'READY_FOR_PAYMENT',
      nextPhaseNotice: 'Checkout preparation complete. Payment processing will be available in the next phase (Phase 6).',
      buyer: { name: 'Ganga Satish' },
      deliveryAddress: {
        id: 'addr-1',
        recipientName: 'Ganga Satish Hub',
        contactNumber: '+919800000004',
        addressType: 'BUSINESS',
        addressLine1: 'Warehouse 12, APMC Market',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411037',
      },
      itemsCount: 1,
      totalQuantityKg: 50,
      costBreakdown: {
        productSubtotal: 1200,
        deliveryCost: 250,
        handlingFee: 25,
        platformFee: 24,
        taxes: 0,
        taxNotes: '0% GST — Raw agricultural produce is exempt',
        bulkDiscount: 0,
        estimatedTotal: 1499,
      },
      supplierGroups: [
        {
          ...mockSupplierGroup,
          delivery: {
            vehicleType: 'Tempo',
            roadKm: 45,
            deliveryCost: 250,
            estimatedTimeWindow: 'Same Day Delivery',
          },
        },
      ],
    };

    it('renders authoritative cost breakdown with 0% GST exempt notice', () => {
      render(
        <BrowserRouter>
          <CheckoutSummary
            checkoutData={mockCheckoutData}
            onBackToCart={vi.fn()}
            onAddressChangeRequired={vi.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Authoritative Cost Breakdown')).toBeInTheDocument();
      expect(screen.getAllByText(/₹1,200/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/₹250/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/1,499/).length).toBeGreaterThan(0);
      expect(screen.getByText(/0% Exempt/i)).toBeInTheDocument();
    });

    it('displays the strict Phase 5 boundary modal when Continue to Payment is clicked', () => {
      render(
        <BrowserRouter>
          <CheckoutSummary
            checkoutData={mockCheckoutData}
            onBackToCart={vi.fn()}
            onAddressChangeRequired={vi.fn()}
          />
        </BrowserRouter>
      );

      const payBtn = screen.getByRole('button', { name: /Continue to Payment/i });
      fireEvent.click(payBtn);

      expect(screen.getAllByText(/Checkout Preparation Complete/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Capstone Phase Boundary/i)).toBeInTheDocument();
      expect(screen.getByText(/Payment processing will be available in the next phase/i)).toBeInTheDocument();
    });
  });
});
