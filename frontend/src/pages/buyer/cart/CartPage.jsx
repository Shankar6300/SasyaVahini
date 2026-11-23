/**
 * SasyaVahini — Buyer Shopping Cart Page (Phase 5)
 *
 * Implements full cart review, supplier grouping, quantity adjustments,
 * and empty state handling.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { useEffect } from 'react';
import { ShoppingCart, ArrowLeft, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import SupplierGroupedCart from '@/components/buyer/cart/SupplierGroupedCart';
import CartSummary from '@/components/buyer/cart/CartSummary';
import '@/styles/cart.css';

export default function CartPage({ onProceedToCheckout: propProceed }) {
  const { cart, isLoading, refreshCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const handleProceed = () => {
    if (propProceed) {
      propProceed();
    } else {
      navigate('/buyer/checkout');
    }
  };

  if (isLoading && !cart) {
    return (
      <div className="cart-page-container flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 size={32} className="animate-spin text-[#245C43] mb-3" />
        <p className="text-sm text-[#68736B]">Synchronizing your agricultural procurement cart...</p>
      </div>
    );
  }

  const itemsCount = cart?.totalItems || 0;
  const supplierGroups = cart?.supplierGroups || [];

  return (
    <div className="cart-page-container animate-in fade-in duration-150">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="cart-header-title">
            <ShoppingCart size={24} className="text-[#245C43]" />
            <span>Procurement Shopping Cart</span>
          </h1>
          <p className="cart-header-subtitle">
            Direct farmer & FPO aggregated produce lots with authoritative pricing and inventory validation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshCart}
            disabled={isLoading}
            className="p-2 text-xs font-bold text-[#245C43] bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors"
            title="Refresh cart with live inventory"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync Live Stock</span>
          </button>
          <Link
            to="/buyer/marketplace"
            className="text-xs font-bold text-[#68736B] hover:text-[#202820] flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Back to Marketplace
          </Link>
        </div>
      </div>

      {/* ── Empty Cart State ────────────────────────────────────────── */}
      {itemsCount === 0 ? (
        <div className="p-16 bg-white rounded-2xl border border-[#DDE5DC] text-center max-w-lg mx-auto shadow-sm my-8">
          <div className="w-16 h-16 rounded-full bg-[#E8F0E8] text-[#245C43] flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} />
          </div>
          <h2 className="text-lg font-bold text-[#202820] mb-2">Your Procurement Cart is Empty</h2>
          <p className="text-xs text-[#68736B] mb-6 leading-relaxed">
            You have not added any agricultural produce lots yet. Browse verified farmer clusters and FPO pooled batches to start your procurement order.
          </p>
          <Link
            to="/buyer/marketplace"
            className="buyer-btn buyer-btn-primary inline-flex items-center gap-2"
          >
            <span>Explore Farm Marketplace</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        /* ── Grid: Supplier Groups & Summary ────────────────────────── */
        <div className="cart-grid-layout">
          <div>
            <div className="mb-3 flex items-center justify-between text-xs text-[#68736B]">
              <span>Grouped by Supplier / Cluster ({supplierGroups.length} source{supplierGroups.length > 1 ? 's' : ''})</span>
              <span>Total Lots: <strong>{itemsCount}</strong></span>
            </div>

            {supplierGroups.map((group) => (
              <SupplierGroupedCart key={group.supplierId} supplierGroup={group} />
            ))}
          </div>

          <div>
            <CartSummary onProceedToCheckout={handleProceed} />
          </div>
        </div>
      )}
    </div>
  );
}
