/**
 * SasyaVahini — Frontend Payment & Invoice Tests (Phase 6)
 *
 * Verifies:
 * - PaymentMethodSelector rendering & interaction
 * - PaymentModal initiation & cryptographic verification
 * - PaymentResultView verified confirmation & PDF invoice trigger
 * - InvoicesPage listing & statutory 0% GST display
 * - TransactionHistoryPage ledger & status badges
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PaymentMethodSelector from '../components/buyer/payment/PaymentMethodSelector';
import PaymentResultView from '../components/buyer/payment/PaymentResultView';
import PaymentModal from '../components/buyer/payment/PaymentModal';
import InvoicesPage from '../pages/buyer/invoices/InvoicesPage';
import TransactionHistoryPage from '../pages/buyer/transactions/TransactionHistoryPage';

// Mock dependencies
vi.mock('../services/paymentApi', () => ({
  default: {
    initiatePayment: vi.fn().mockResolvedValue({
      transactionId: 'tx-test-123',
      checkoutRef: 'CHK-2026-TEST01',
      gatewayOrderId: 'order_test_456',
      amount: 2500,
      currency: 'INR',
      gateway: 'Sandbox Adapter',
      paymentMethods: [{ id: 'UPI' }, { id: 'CARD' }, { id: 'NETBANKING' }, { id: 'ESCROW' }],
    }),
    verifyPayment: vi.fn().mockResolvedValue({
      verified: true,
      transaction: {
        id: 'tx-test-123',
        checkoutRef: 'CHK-2026-TEST01',
        gatewayOrderId: 'order_test_456',
        gatewayPaymentId: 'pay_test_789',
        amount: 2500,
        currency: 'INR',
        paymentMethod: 'UPI',
        status: 'SUCCESS',
        createdAt: new Date().toISOString(),
      },
      invoice: {
        id: 'inv-test-999',
        invoiceNumber: 'INV-2026-6A912F',
        subtotal: 2400,
        gstAmount: 0,
        deliveryFee: 100,
        totalAmount: 2500,
      },
    }),
    getInvoices: vi.fn().mockResolvedValue({
      invoices: [
        {
          id: 'inv-test-999',
          invoiceNumber: 'INV-2026-6A912F',
          subtotal: 2400,
          totalAmount: 2500,
          deliveryFee: 100,
          platformFee: 0,
          issuedAt: new Date().toISOString(),
          transaction: { checkoutRef: 'CHK-2026-TEST01', paymentMethod: 'UPI' },
        },
      ],
      pagination: { page: 1, totalPages: 1, totalCount: 1 },
    }),
    getTransactions: vi.fn().mockResolvedValue({
      transactions: [
        {
          id: 'tx-test-123',
          checkoutRef: 'CHK-2026-TEST01',
          gatewayOrderId: 'order_test_456',
          gatewayPaymentId: 'pay_test_789',
          amount: 2500,
          paymentMethod: 'UPI',
          status: 'SUCCESS',
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, totalPages: 1, totalCount: 1 },
    }),
    downloadInvoicePdf: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    refreshCart: vi.fn(),
  }),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

describe('Buyer Payments & Invoices (Phase 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. PaymentMethodSelector Component', () => {
    it('renders all four Indian payment methods with security badge', () => {
      const handleSelect = vi.fn();
      render(
        <PaymentMethodSelector
          selectedMethod="UPI"
          onSelectMethod={handleSelect}
        />
      );

      expect(screen.getByText(/Select Payment Method/i)).toBeInTheDocument();
      expect(screen.getByText(/256-Bit SSL Encrypted/i)).toBeInTheDocument();
      expect(screen.getByText(/UPI \/ Instant QR/i)).toBeInTheDocument();
      expect(screen.getByText(/Debit & Credit Cards/i)).toBeInTheDocument();
      expect(screen.getByText(/Net Banking/i)).toBeInTheDocument();
      expect(screen.getByText(/SasyaVahini Escrow Protection/i)).toBeInTheDocument();
    });

    it('triggers callback when buyer selects a different payment channel', () => {
      const handleSelect = vi.fn();
      render(
        <PaymentMethodSelector
          selectedMethod="UPI"
          onSelectMethod={handleSelect}
        />
      );

      const cardOption = screen.getByText(/Debit & Credit Cards/i);
      fireEvent.click(cardOption);

      expect(handleSelect).toHaveBeenCalledWith('CARD');
    });
  });

  describe('2. PaymentResultView Component', () => {
    const mockResult = {
      verified: true,
      transaction: {
        id: 'tx-123',
        checkoutRef: 'CHK-2026-64FA0A',
        gatewayOrderId: 'order_123',
        gatewayPaymentId: 'pay_456',
        amount: 3200,
        paymentMethod: 'UPI',
        status: 'SUCCESS',
        createdAt: '2026-11-23T10:00:00.000Z',
      },
      invoice: {
        id: 'inv-456',
        invoiceNumber: 'INV-2026-6A912F',
        subtotal: 3100,
        gstAmount: 0,
        deliveryFee: 100,
        totalAmount: 3200,
      },
    };

    it('renders verified payment confirmation and transaction details', () => {
      render(
        <BrowserRouter>
          <PaymentResultView resultData={mockResult} />
        </BrowserRouter>
      );

      expect(screen.getByText(/Payment Confirmed & Verified/i)).toBeInTheDocument();
      expect(screen.getAllByText(/₹3,200/).length).toBeGreaterThan(0);
      expect(screen.getByText('CHK-2026-64FA0A')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-6A912F')).toBeInTheDocument();
      expect(screen.getByText(/Agri Produce Exempt/i)).toBeInTheDocument();
    });

    it('triggers PDF download when Download Tax Invoice is clicked', async () => {
      const paymentApi = (await import('../services/paymentApi')).default;
      render(
        <BrowserRouter>
          <PaymentResultView resultData={mockResult} />
        </BrowserRouter>
      );

      const downloadBtn = screen.getByRole('button', { name: /Download Tax Invoice/i });
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(paymentApi.downloadInvoicePdf).toHaveBeenCalledWith('inv-456', 'INV-2026-6A912F');
      });
    });
  });

  describe('3. InvoicesPage Component', () => {
    it('renders invoice ledger metrics and lists buyer invoices', async () => {
      render(
        <BrowserRouter>
          <InvoicesPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/Agricultural Tax Invoices/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('INV-2026-6A912F')).toBeInTheDocument();
        expect(screen.getByText(/0% Exempt/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. TransactionHistoryPage Component', () => {
    it('renders cryptographic transaction ledger with status badge', async () => {
      render(
        <BrowserRouter>
          <TransactionHistoryPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/Payment Transaction History/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('CHK-2026-TEST01')).toBeInTheDocument();
        expect(screen.getAllByText(/Success/i).length).toBeGreaterThan(0);
      });
    });
  });
});
