import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

/**
 * SasyaVahini — Auditable Total Landed Cost (TLC) Breakdown Component
 * Explains every rupee in the procurement & logistics cost structure.
 *
 * Owner: Member 4
 */
export default function CostBreakdown({ breakdown, effectivePricePerKg, totalWeightKg }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!breakdown) return null;

  const formatRs = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div className="border rounded-md bg-white p-3 text-sm mt-3" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        className="w-full flex items-center justify-between text-left font-medium text-gray-800"
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span className="flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
          <ShieldCheck size={16} />
          <strong>Total Landed Cost Breakdown:</strong> {formatRs(breakdown.totalCost)}
          {effectivePricePerKg && (
            <span className="text-secondary body-sm" style={{ marginLeft: '4px' }}>
              ({formatRs(effectivePricePerKg)}/kg)
            </span>
          )}
        </span>
        <span className="text-secondary">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {isOpen && (
        <div className="mt-3 pt-3 border-t text-xs space-y-1.5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex justify-between py-1">
            <span className="text-secondary">Direct Produce Cost ({totalWeightKg || 'Total'} kg):</span>
            <span className="font-semibold">{formatRs(breakdown.productCost)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-secondary">Vehicle Transport Fare (Base + Route Km):</span>
            <span className="font-semibold">{formatRs(breakdown.transportCost)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-secondary">Crate Handling & Farm Gate Loading (₹0.50/kg):</span>
            <span className="font-semibold">{formatRs(breakdown.handlingCost)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-secondary">Platform Facilitation Fee (2%):</span>
            <span className="font-semibold">{formatRs(breakdown.platformFee)}</span>
          </div>

          {breakdown.aggregationFee > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-secondary">Multi-Farmer Aggregation Fee (₹350/extra stop):</span>
              <span className="font-semibold" style={{ color: 'var(--color-warning)' }}>
                +{formatRs(breakdown.aggregationFee)}
              </span>
            </div>
          )}

          <div className="flex justify-between py-1">
            <span className="text-secondary">Expected Spoilage & Quality Risk Buffer:</span>
            <span className="font-semibold">{formatRs(breakdown.riskCost)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-secondary">GST on Raw Produce:</span>
            <span className="font-semibold text-secondary">₹0.00 (Exempt)</span>
          </div>

          <div
            className="flex justify-between pt-2 border-t font-bold text-sm"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
          >
            <span>Total Landed Payable:</span>
            <span>{formatRs(breakdown.totalCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
