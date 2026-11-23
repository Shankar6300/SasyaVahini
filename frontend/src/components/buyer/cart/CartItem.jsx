/**
 * SasyaVahini — Cart Item Component (Phase 5)
 *
 * Displays single produce batch inside a supplier group with real-time stock
 * validation, quantity adjustments, and subtotal calculation.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { useState } from 'react';
import { Trash2, AlertTriangle, AlertCircle, Plus, Minus, CheckCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartItem({ item }) {
  const { updateQuantity, removeFromCart, isLoading } = useCart();
  const [localQty, setLocalQty] = useState(item.quantityKg);
  const [isUpdating, setIsUpdating] = useState(false);

  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="%23E8F0E8" width="80" height="80"/><text fill="%23245C43" font-family="sans-serif" font-size="10" font-weight="bold" x="50%" y="55%" text-anchor="middle">🌱 ${encodeURIComponent(item.cropName || 'Produce')}</text></svg>`;

  const handleQtyChange = async (newQty) => {
    const qty = Math.max(1, Number(newQty));
    setLocalQty(qty);
    try {
      setIsUpdating(true);
      await updateQuantity(item.id, qty);
    } finally {
      setIsUpdating(false);
    }
  };

  const isLowStock = item.availableQtyKg < 100;
  const isOverStock = item.quantityKg > item.availableQtyKg;
  const isUnderMoq = item.quantityKg < item.moqKg;

  return (
    <div className="cart-item-row" aria-label={`Cart item: ${item.cropName}`}>
      {/* ── Left: Thumbnail & Produce Meta ──────────────────────────── */}
      <div className="cart-item-info-wrap">
        <img
          src={item.imageUrl || fallbackSvg}
          alt={item.cropName}
          className="cart-item-thumbnail"
          onError={(e) => { e.target.src = fallbackSvg; }}
        />

        <div className="cart-item-details">
          <h4 className="cart-item-name">{item.cropName}</h4>

          <div className="cart-item-tags">
            <span className="cart-badge cart-badge-grade">
              {item.isOrganic ? '🌿 Organic' : item.qualityGrade?.replace('_', ' ')}
            </span>
            <span className="text-xs text-[#68736B]">{item.category}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-[#68736B]">
              Stock: <strong>{item.availableQtyKg?.toLocaleString('en-IN')} kg</strong>
            </span>
          </div>

          <p className="cart-item-unit-price">
            ₹{item.unitPrice} <span className="text-xs text-[#68736B] font-normal">/ kg direct farm gate</span>
          </p>

          {/* Validation Warnings */}
          {isOverStock && (
            <div className="cart-item-warning">
              <AlertTriangle size={13} className="text-amber-700 flex-shrink-0" />
              <span>Only {item.availableQtyKg} kg available in this batch. Please reduce quantity.</span>
            </div>
          )}
          {isUnderMoq && (
            <div className="cart-item-warning">
              <AlertCircle size={13} className="text-amber-700 flex-shrink-0" />
              <span>Minimum order quantity is {item.moqKg} kg.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Quantity Stepper & Subtotal ───────────────────────── */}
      <div className="cart-item-actions-wrap">
        <div className="flex flex-col items-end gap-1">
          <div className="quantity-stepper">
            <button
              type="button"
              className="quantity-stepper-btn"
              onClick={() => handleQtyChange(Math.max(item.moqKg || 5, item.quantityKg - 10))}
              disabled={isUpdating || isLoading || item.quantityKg <= (item.moqKg || 5)}
              title="Decrease quantity"
            >
              <Minus size={13} />
            </button>
            <input
              type="number"
              className="quantity-stepper-input"
              value={localQty}
              min={item.moqKg || 5}
              max={item.availableQtyKg || 50000}
              onChange={(e) => setLocalQty(e.target.value)}
              onBlur={() => handleQtyChange(localQty)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQtyChange(localQty);
              }}
            />
            <button
              type="button"
              className="quantity-stepper-btn"
              onClick={() => handleQtyChange(Math.min(item.availableQtyKg, item.quantityKg + 10))}
              disabled={isUpdating || isLoading || item.quantityKg >= item.availableQtyKg}
              title="Increase quantity"
            >
              <Plus size={13} />
            </button>
          </div>
          <span className="text-[10px] text-[#68736B]">MOQ: {item.moqKg} kg</span>
        </div>

        <div className="cart-item-subtotal-block">
          <div className="cart-item-subtotal-val">
            ₹{item.itemSubtotal?.toLocaleString('en-IN')}
          </div>
          <span className="cart-item-subtotal-label">{item.quantityKg} kg subtotal</span>
        </div>

        <button
          type="button"
          onClick={() => removeFromCart(item.id)}
          disabled={isLoading}
          className="cart-item-remove-btn"
          title="Remove from cart"
          aria-label={`Remove ${item.cropName} from cart`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
