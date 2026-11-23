/**
 * SasyaVahini — Cart Summary Component (Phase 5)
 *
 * Transparent price ledger, item totals, and checkout preparation transition.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React from 'react';
import { ArrowRight, ShieldCheck, Truck, Trash2, AlertCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartSummary({ onProceedToCheckout }) {
  const { cart, clearCart, isLoading } = useCart();

  const {
    totalItems = 0,
    totalQuantityKg = 0,
    productSubtotal = 0,
    allValid = true,
    validationIssues = [],
  } = cart || {};

  const isBulkOrder = totalQuantityKg >= 1000;

  return (
    <aside className="cart-summary-card" aria-label="Cart Cost Summary">
      <h3 className="cart-summary-title">Cart Summary</h3>

      <div className="cart-summary-line">
        <span>Verified Produce Batches</span>
        <strong>{totalItems} lots</strong>
      </div>

      <div className="cart-summary-line">
        <span>Total Net Weight</span>
        <strong>{totalQuantityKg.toLocaleString('en-IN')} kg</strong>
      </div>

      <div className="cart-summary-line">
        <span>Farm-Gate Product Subtotal</span>
        <strong className="text-base text-[#245C43]">
          ₹{productSubtotal.toLocaleString('en-IN')}
        </strong>
      </div>

      {isBulkOrder && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 mb-3">
          ✨ <strong>Bulk Order Incentive Eligible:</strong> 3% platform discount will be applied during checkout.
        </div>
      )}

      {/* Logistics & Delivery Transparency Notice */}
      <div className="p-3 bg-[#F8F8F3] border border-[#DDE5DC] rounded-xl text-xs text-[#68736B] mb-4">
        <div className="flex items-center gap-1.5 font-bold text-[#202820] mb-1">
          <Truck size={14} className="text-[#245C43]" />
          <span>Logistics & Handling Notice</span>
        </div>
        <p className="m-0 leading-relaxed">
          Standard agricultural delivery fee & pooling charges will be authoritatively calculated in the next step based on your delivery address and fleet route distance.
        </p>
      </div>

      <div className="cart-summary-total">
        <div>
          <span className="cart-summary-total-label">Produce Total</span>
          <span className="block text-[11px] text-[#68736B]">Excl. delivery & handling</span>
        </div>
        <span className="cart-summary-total-amount">
          ₹{productSubtotal.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Validation Issue Warning */}
      {!allValid && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <AlertCircle size={14} />
            <span>Attention Required</span>
          </div>
          <ul className="list-disc pl-4 space-y-1">
            {validationIssues.map((issue, idx) => (
              <li key={idx}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onProceedToCheckout}
        disabled={isLoading || totalItems === 0 || !allValid}
        className="cart-checkout-btn"
      >
        <span>Proceed to Checkout</span>
        <ArrowRight size={16} />
      </button>

      <button
        type="button"
        onClick={clearCart}
        disabled={isLoading || totalItems === 0}
        className="cart-clear-btn"
      >
        <span className="flex items-center justify-center gap-1">
          <Trash2 size={13} /> Clear Entire Cart
        </span>
      </button>

      <div className="mt-4 pt-3 border-t border-[#DDE5DC] flex items-center justify-center gap-2 text-[11px] text-[#68736B]">
        <ShieldCheck size={14} className="text-emerald-700" />
        <span>100% Direct Farm Gate Sourced · 0% Middleman Markups</span>
      </div>
    </aside>
  );
}
