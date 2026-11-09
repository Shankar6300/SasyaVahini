import React, { useState } from 'react';
import { Sliders, CheckCircle2, Users, User, Clock, Star, Shield, Sparkles } from 'lucide-react';
import CostBreakdown from './CostBreakdown';

/**
 * SasyaVahini — Plan Selection & Sourcing Cards Component
 *
 * Renders candidate procurement plans (Best Value, Cheapest, Best Quality)
 * with priority slider, TLC breakdown, and vehicle suggestions.
 * Exportable for Member 3's checkout embed.
 *
 * Owner: Member 4
 */
export default function PlanCards({
  plans = [],
  selectedPlanId,
  onSelectPlan,
  priority = 0.5,
  onPriorityChange,
  isLoading = false,
}) {
  const [localPriority, setLocalPriority] = useState(priority);

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setLocalPriority(val);
    if (onPriorityChange) {
      onPriorityChange(val);
    }
  };

  const getBadgeStyle = (label) => {
    switch (label) {
      case 'BEST_VALUE':
        return { bg: '#E8F5E9', color: '#07875B', text: '🏆 BEST VALUE' };
      case 'CHEAPEST':
        return { bg: '#FEF3C7', color: '#B45309', text: '⚡ LOWEST PRICE' };
      case 'BEST_QUALITY':
        return { bg: '#EDE9FE', color: '#7C3AED', text: '✨ TOP QUALITY' };
      default:
        return { bg: '#F1F5F9', color: '#475569', text: label };
    }
  };

  return (
    <div className="space-y-4">
      {/* Priority Slider Header */}
      <div
        className="card p-3 rounded-lg border flex flex-col md:flex-row items-center justify-between gap-3 bg-white"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <Sliders size={18} style={{ color: 'var(--color-primary)' }} />
          <div>
            <span className="font-semibold text-sm">Procurement Priority Balancing</span>
            <div className="text-xs text-secondary">
              {localPriority < 0.35
                ? 'Strict Cost Optimization (Lowest Landed Price)'
                : localPriority > 0.65
                ? 'Premium Grade & Maximum Supplier Reliability'
                : 'Balanced Cost, Quality & Multi-Farmer Realization'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-64">
          <span className="text-xs font-medium text-secondary">Lowest Price</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={localPriority}
            onChange={handleSliderChange}
            className="w-full cursor-pointer accent-[#07875B]"
          />
          <span className="text-xs font-medium text-secondary">Top Quality</span>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isSelected = selectedPlanId === plan.planId;
          const badge = getBadgeStyle(plan.label);
          const farmerCount = plan.farmers.length;

          return (
            <div
              key={plan.planId}
              onClick={() => onSelectPlan && onSelectPlan(plan)}
              className={`card p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                isSelected ? 'ring-2 ring-emerald-500 shadow-md' : 'hover:border-emerald-300'
              }`}
              style={{
                borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                background: isSelected ? '#F0FDF4' : '#FFFFFF',
              }}
            >
              {/* Badge & Radio check */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className="px-2 py-0.5 text-xs font-bold rounded-md uppercase"
                  style={{ backgroundColor: badge.bg, color: badge.color }}
                >
                  {badge.text}
                </span>
                {isSelected ? (
                  <CheckCircle2 size={18} style={{ color: 'var(--color-primary)' }} />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-gray-300" />
                )}
              </div>

              {/* Total Price */}
              <div className="mb-2">
                <div className="text-2xl font-extrabold" style={{ color: 'var(--color-primary)' }}>
                  ₹{Number(plan.totalCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-secondary font-medium">
                  Effective: ₹{plan.effectivePricePerKg}/kg landed
                </div>
              </div>

              {/* Attributes */}
              <div className="space-y-1.5 text-xs py-2 border-t border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-secondary flex items-center gap-1">
                    {plan.isSingleSource ? <User size={13} /> : <Users size={13} />}
                    Sourcing Model:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {plan.isSingleSource ? '1 Single Farmer' : `${farmerCount} Farmers Pooled`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-secondary flex items-center gap-1">
                    <Star size={13} className="text-amber-500" />
                    Quality Grade:
                  </span>
                  <span className="font-semibold text-gray-800">{plan.avgGrade || 'GRADE_A'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-secondary flex items-center gap-1">
                    <Shield size={13} className="text-blue-500" />
                    Supplier Reliability:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {Math.round((plan.avgReliability || 0.9) * 100)}% Verified
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-secondary flex items-center gap-1">
                    <Clock size={13} />
                    Estimated Transit ETA:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {Math.floor(plan.etaMinutes / 60)}h {plan.etaMinutes % 60}m ({plan.routeKm} km)
                  </span>
                </div>
              </div>

              {/* Farmers list preview */}
              <div className="mt-2 text-xs text-secondary">
                <div className="font-medium text-gray-700 mb-1">Pickup Sequence:</div>
                <div className="space-y-1">
                  {plan.farmers.map((f, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] bg-gray-50 px-2 py-1 rounded">
                      <span className="font-medium">
                        {f.pickupSeq || i + 1}. {f.name} ({f.village})
                      </span>
                      <span className="text-emerald-700 font-bold">{f.qtyKg} kg</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Breakdown */}
              <CostBreakdown
                breakdown={plan.costBreakdown}
                effectivePricePerKg={plan.effectivePricePerKg}
                totalWeightKg={plan.requestedQtyKg}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
