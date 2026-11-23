/**
 * SasyaVahini — Buyer Checkout Preparation Page (Phase 5)
 *
 * Implements the 5-step checkout preparation workflow:
 * Step 1: Review Cart → Step 2: Select Delivery Address → Step 3: Delivery Info
 * → Step 4: Price Breakdown → Step 5: Final Checkout Summary
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, MapPin, Truck, Receipt, CheckCircle, ArrowLeft,
  ArrowRight, ShieldCheck, Loader2, AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import AddressSelector from '@/components/buyer/checkout/AddressSelector';
import CheckoutSummary from '@/components/buyer/checkout/CheckoutSummary';
import PaymentModal from '@/components/buyer/payment/PaymentModal';
import PaymentResultView from '@/components/buyer/payment/PaymentResultView';
import cartApi from '@/services/cartApi';
import '@/styles/cart.css';
import '@/styles/payment.css';

const STEPS = [
  { id: 1, label: 'Review Cart', icon: ShoppingCart },
  { id: 2, label: 'Delivery Address', icon: MapPin },
  { id: 3, label: 'Logistics Route', icon: Truck },
  { id: 4, label: 'Price Breakdown', icon: Receipt },
  { id: 5, label: 'Final Review', icon: CheckCircle },
];

export default function CheckoutPage({ onBackToCart: propBackToCart }) {
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(2); // Start at Address Selection if coming from Cart
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  // Fetch authoritative checkout summary from backend
  const loadCheckoutSummary = async (addressId = null) => {
    try {
      setIsLoadingSummary(true);
      setSummaryError(null);
      const res = await cartApi.getCheckoutSummary(addressId || selectedAddressId);
      setCheckoutData(res);
      if (res?.deliveryAddress?.id) {
        setSelectedAddressId(res.deliveryAddress.id);
      }
    } catch (err) {
      setSummaryError(err.response?.data?.error?.message || 'Failed to prepare checkout calculations.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadCheckoutSummary();
  }, []);

  const handleAddressSelect = (id) => {
    setSelectedAddressId(id);
    loadCheckoutSummary(id);
  };

  const handleBackToCart = () => {
    if (propBackToCart) {
      propBackToCart();
    } else {
      navigate('/buyer/cart');
    }
  };

  if (paymentResult) {
    return (
      <div className="cart-page-container animate-in fade-in duration-200">
        <PaymentResultView
          resultData={paymentResult}
          onReset={() => {
            setPaymentResult(null);
            navigate('/buyer/marketplace');
          }}
        />
      </div>
    );
  }

  if (!cart || cart.totalItems === 0) {
    return (
      <div className="cart-page-container p-12 text-center bg-white border border-[#DDE5DC] rounded-xl my-8">
        <ShoppingCart size={40} className="mx-auto text-slate-300 mb-3" />
        <h2 className="text-base font-bold text-[#202820] mb-2">No Produce Lots in Cart to Checkout</h2>
        <p className="text-xs text-[#68736B] mb-4">Please add products to your cart before proceeding to checkout.</p>
        <button type="button" onClick={handleBackToCart} className="buyer-btn buyer-btn-primary">
          Return to Cart
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page-container animate-in fade-in duration-150">
      {/* ── Top Header & Breadcrumb ─────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
        <div>
          <button
            type="button"
            onClick={handleBackToCart}
            className="text-xs font-bold text-[#245C43] hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={13} /> Back to Shopping Cart
          </button>
          <h1 className="cart-header-title">
            <span>Checkout Preparation</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#68736B] bg-[#F8F8F3] px-3 py-1.5 rounded-lg border border-[#DDE5DC]">
          <ShieldCheck size={14} className="text-[#245C43]" />
          <span>Verified Direct Agricultural Trade · Phase 5 Scope</span>
        </div>
      </div>

      {/* ── 5-Step Process Bar ───────────────────────────────────────── */}
      <nav className="checkout-steps-bar" aria-label="Checkout Progress">
        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const StepIcon = step.icon;

          return (
            <div
              key={step.id}
              className={`checkout-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              <div className="checkout-step-num">
                {isCompleted ? <CheckCircle size={14} /> : step.id}
              </div>
              <span className="flex items-center gap-1">
                <StepIcon size={13} /> {step.label}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Error state */}
      {summaryError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 mb-6 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5">Checkout Preparation Error</p>
            <p className="m-0">{summaryError}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoadingSummary && !checkoutData && (
        <div className="p-12 text-center bg-white border border-[#DDE5DC] rounded-xl my-6">
          <Loader2 size={32} className="animate-spin mx-auto text-[#245C43] mb-3" />
          <p className="text-sm font-semibold text-[#202820]">Calculating logistics routes and transparent pricing...</p>
        </div>
      )}

      {/* ── Step-Specific Content ────────────────────────────────────── */}
      {checkoutData && (
        <div>
          {/* Step 2 View: Address Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <AddressSelector
                selectedAddressId={selectedAddressId}
                onSelectAddress={handleAddressSelect}
              />

              <div className="flex justify-between items-center pt-4 border-t border-[#DDE5DC]">
                <button
                  type="button"
                  onClick={handleBackToCart}
                  className="buyer-btn buyer-btn-outline"
                >
                  <ArrowLeft size={14} /> Back to Cart
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  disabled={!selectedAddressId}
                  className="buyer-btn buyer-btn-primary flex items-center gap-2"
                >
                  <span>Review Order & Price Breakdown</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 5 / Full Summary View with Phase 6 Payment Integration */}
          {currentStep >= 3 && (
            <>
              <CheckoutSummary
                checkoutData={checkoutData}
                onBackToCart={handleBackToCart}
                onAddressChangeRequired={() => setCurrentStep(2)}
                enablePhase6Payment={true}
                selectedPaymentMethod={selectedMethod}
                onChangePaymentMethod={setSelectedMethod}
                onProceedToPayment={() => setIsPaymentModalOpen(true)}
              />

              <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                addressId={selectedAddressId}
                selectedMethod={selectedMethod}
                onPaymentSuccess={(result) => {
                  setIsPaymentModalOpen(false);
                  setPaymentResult(result);
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
