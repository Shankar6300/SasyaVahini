/**
 * SasyaVahini — Add to Cart Button Component (Phase 5)
 *
 * Supports compact mode (for product catalog cards) and detailed mode with quantity input
 * (for product detail page), with real-time stock and MOQ verification.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { useState } from 'react';
import { ShoppingCart, Check, Plus, Minus, AlertCircle, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AddToCartButton({ product, compact = false, showQuantitySelector = false }) {
  const { addToCart, isLoading } = useCart();
  let authContext = { isAuthenticated: false, user: null };
  try {
    authContext = useAuth();
  } catch {
    authContext = { isAuthenticated: false, user: null };
  }
  const { isAuthenticated = false, user = null } = authContext || {};
  const navigate = useNavigate();

  const isBusiness = user?.buyerType === 'BUSINESS' || user?.buyerType === 'Wholesaler' || user?.buyerType === 'Supermarket';
  
  // Compute default MOQ
  const computeMoq = () => {
    if (!product) return 5;
    if (isBusiness) {
      return (product.totalQuantityKg || 0) >= 1000 ? 100 : 50;
    }
    const cat = (product.category || '').toLowerCase();
    return cat.includes('grain') || cat.includes('pulse') ? 10 : 5;
  };

  const moqKg = computeMoq();
  const availableQty = Math.max(0, (product?.availableQtyKg ?? product?.totalQuantityKg ?? 0));
  const isOutOfStock = availableQty <= 0;

  const [quantity, setQuantity] = useState(moqKg);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isAuthenticated) {
      navigate('/login?redirect=/buyer/cart');
      return;
    }

    if (isOutOfStock) return;

    try {
      setIsAdding(true);
      const res = await addToCart(product, quantity);
      if (res?.success) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      }
    } finally {
      setIsAdding(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={isOutOfStock || isAdding || isLoading}
        className={`marketplace-card-btn ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          background: justAdded ? '#15803d' : '#245C43',
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '700',
          border: 'none',
          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
        title={isOutOfStock ? 'Out of stock' : `Add ${moqKg} kg (MOQ) to procurement cart`}
      >
        {isAdding ? (
          <Loader2 size={13} className="animate-spin" />
        ) : justAdded ? (
          <>
            <Check size={13} />
            <span>Added</span>
          </>
        ) : (
          <>
            <ShoppingCart size={13} />
            <span>{isOutOfStock ? 'Sold Out' : '+ Cart'}</span>
          </>
        )}
      </button>
    );
  }

  // Full view with quantity selector (e.g. for ProductDetailPage)
  return (
    <div className="add-to-cart-container" style={{ width: '100%' }}>
      {showQuantitySelector && !isOutOfStock && (
        <div className="mb-3">
          <div className="flex justify-between items-center text-xs mb-1.5 font-semibold text-[#202820]">
            <span>Order Quantity (kg)</span>
            <span className="text-[#68736B]">Min: {moqKg} kg · Max: {availableQty} kg</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="quantity-stepper">
              <button
                type="button"
                className="quantity-stepper-btn"
                onClick={() => setQuantity((q) => Math.max(moqKg, q - (isBusiness ? 25 : 5)))}
                disabled={quantity <= moqKg}
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                className="quantity-stepper-input"
                value={quantity}
                min={moqKg}
                max={availableQty}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setQuantity(val);
                }}
              />
              <button
                type="button"
                className="quantity-stepper-btn"
                onClick={() => setQuantity((q) => Math.min(availableQty, q + (isBusiness ? 25 : 5)))}
                disabled={quantity >= availableQty}
              >
                <Plus size={14} />
              </button>
            </div>
            <span className="text-xs text-[#68736B] font-bold">kg</span>

            <div className="ml-auto text-right">
              <span className="text-xs text-[#68736B] block">Batch Subtotal</span>
              <span className="text-sm font-black text-[#245C43]">
                ₹{((product.askingPricePerKg || 0) * quantity).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={isOutOfStock || isAdding || isLoading || quantity < moqKg || quantity > availableQty}
        className="w-full"
        style={{
          background: isOutOfStock ? '#94A3B8' : justAdded ? '#15803d' : '#245C43',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '700',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {isAdding ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Adding to Cart...</span>
          </>
        ) : justAdded ? (
          <>
            <Check size={16} />
            <span>Added to Procurement Cart!</span>
          </>
        ) : (
          <>
            <ShoppingCart size={16} />
            <span>{isOutOfStock ? 'Currently Out of Stock' : `Add ${quantity} kg to Cart`}</span>
          </>
        )}
      </button>

      {quantity < moqKg && (
        <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-semibold">
          <AlertCircle size={12} />
          Quantity must be at least {moqKg} kg for this listing.
        </p>
      )}
      {quantity > availableQty && (
        <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-semibold">
          <AlertCircle size={12} />
          Quantity exceeds current available batch ({availableQty} kg).
        </p>
      )}
    </div>
  );
}
