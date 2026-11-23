/**
 * SasyaVahini — Supplier-Grouped Cart Component (Phase 5)
 *
 * Implements strict supplier-wise cart organization connecting buyers directly
 * with designated FPOs or individual farmers without mixing batches.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React from 'react';
import { Building2, User, CheckCircle, MapPin, PackageCheck } from 'lucide-react';
import CartItem from './CartItem';

export default function SupplierGroupedCart({ supplierGroup }) {
  if (!supplierGroup) return null;

  const isFpo = supplierGroup.supplierType === 'FPO_PRODUCER_CO';

  return (
    <div className="supplier-group-card" aria-label={`Produce group from ${supplierGroup.supplierName}`}>
      {/* ── Supplier Header ─────────────────────────────────────────── */}
      <div className="supplier-group-header">
        <div className="supplier-meta-block">
          <div className="supplier-avatar-badge">
            {isFpo ? <Building2 size={18} /> : <User size={18} />}
          </div>

          <div>
            <div className="supplier-title-text">
              <span>{supplierGroup.supplierName}</span>
              <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="supplier-location-text flex items-center gap-1">
                <MapPin size={11} className="text-emerald-700" />
                {supplierGroup.location}
              </span>
              {supplierGroup.registrationNo && (
                <span className="text-[11px] text-[#68736B]">
                  · Reg: {supplierGroup.registrationNo}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="supplier-tag">
            {isFpo ? 'Farmer Producer Org' : 'Direct Farmer'}
          </span>
          <div className="text-right">
            <span className="text-xs text-[#68736B] block">Batch Total</span>
            <span className="text-sm font-black text-[#245C43]">
              ₹{supplierGroup.supplierSubtotal?.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Items from this Supplier ─────────────────────────────────── */}
      <div className="divide-y divide-[#EEF2EE]">
        {supplierGroup.items?.map((item) => (
          <CartItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
