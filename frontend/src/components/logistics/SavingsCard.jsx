import React from 'react';
import { TrendingDown, Fuel, Gauge, Award } from 'lucide-react';

/**
 * SasyaVahini — CVRP Optimization Impact & Savings Metric Card
 * Displays baseline vs optimized route km, fuel savings (₹), and capacity utilization.
 *
 * Owner: Member 4
 */
export default function SavingsCard({ savings, title = 'Optimization Impact' }) {
  if (!savings) return null;

  const {
    baselineKm = 0,
    optimizedKm = 0,
    savedKm = 0,
    fuelSavedRs = 0,
    utilizationPercent = 0,
  } = savings;

  const pctSaved = baselineKm > 0 ? Math.round((savedKm / baselineKm) * 100) : 0;

  return (
    <div
      className="card p-4 rounded-lg"
      style={{
        background: 'linear-gradient(135deg, #07875b0d 0%, #065c3e14 100%)',
        border: '1px solid #07875B40',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
          <Award size={18} />
          {title}
        </h3>
        <span
          className="px-2 py-0.5 text-xs font-bold rounded-full"
          style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}
        >
          {pctSaved}% Distance Reduced
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-2.5 rounded border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-secondary text-xs flex items-center gap-1">
            <span>Direct Trips (Baseline):</span>
          </div>
          <div className="text-base font-bold text-gray-700 mt-1 line-through">
            {baselineKm} km
          </div>
          <div className="text-xs text-secondary">Individual farm runs</div>
        </div>

        <div className="bg-white p-2.5 rounded border" style={{ borderColor: '#07875B60' }}>
          <div className="text-secondary text-xs flex items-center gap-1">
            <TrendingDown size={14} style={{ color: 'var(--color-primary)' }} />
            <span>Consolidated Route:</span>
          </div>
          <div className="text-base font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
            {optimizedKm} km
          </div>
          <div className="text-xs text-secondary font-medium" style={{ color: 'var(--color-primary)' }}>
            Saved: {savedKm} km
          </div>
        </div>

        <div className="bg-white p-2.5 rounded border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-secondary text-xs flex items-center gap-1">
            <Fuel size={14} style={{ color: '#D97706' }} />
            <span>Fuel Cost Saved:</span>
          </div>
          <div className="text-base font-bold text-amber-700 mt-1">
            ₹{Number(fuelSavedRs || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-secondary">@ ₹95/L diesel</div>
        </div>

        <div className="bg-white p-2.5 rounded border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-secondary text-xs flex items-center gap-1">
            <Gauge size={14} style={{ color: '#2563EB' }} />
            <span>Vehicle Utilization:</span>
          </div>
          <div className="text-base font-bold text-blue-700 mt-1">
            {utilizationPercent}%
          </div>
          <div className="text-xs text-secondary">Target: 80%–90%</div>
        </div>
      </div>
    </div>
  );
}
