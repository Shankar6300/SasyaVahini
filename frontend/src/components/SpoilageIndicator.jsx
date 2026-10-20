import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, Thermometer, Clock, Snowflake } from 'lucide-react';

/**
 * SasyaVahini — Spoilage Risk & Shelf Life Decay Indicator
 *
 * Estimates commodity shelf-life decay based on harvest date, ambient temperature,
 * crop perishability index, and transit conditions.
 *
 * Owner: Member 5 (ML Analytics & Mandi Advisor)
 */

// Perishability baselines (shelf life in days at standard ambient 25°C)
const CROP_PERISHABILITY = {
  Tomato: { baselineDays: 7, optimalTemp: '12-15°C', highRiskThreshold: 30, category: 'High' },
  Grapes: { baselineDays: 5, optimalTemp: '0-2°C', highRiskThreshold: 26, category: 'High' },
  Banana: { baselineDays: 6, optimalTemp: '13-14°C', highRiskThreshold: 28, category: 'High' },
  Cauliflower: { baselineDays: 7, optimalTemp: '0-4°C', highRiskThreshold: 25, category: 'High' },
  Cabbage: { baselineDays: 10, optimalTemp: '0-4°C', highRiskThreshold: 28, category: 'Medium' },
  Brinjal: { baselineDays: 7, optimalTemp: '10-12°C', highRiskThreshold: 28, category: 'High' },
  Chilli: { baselineDays: 12, optimalTemp: '7-10°C', highRiskThreshold: 32, category: 'Medium' },
  Onion: { baselineDays: 45, optimalTemp: 'Ambient Dry (20-25°C)', highRiskThreshold: 35, category: 'Low' },
  Potato: { baselineDays: 60, optimalTemp: '8-10°C Dark', highRiskThreshold: 35, category: 'Low' },
  Pomegranate: { baselineDays: 20, optimalTemp: '5-7°C', highRiskThreshold: 30, category: 'Medium' },
  Wheat: { baselineDays: 180, optimalTemp: 'Dry Ambient (<12% moisture)', highRiskThreshold: 40, category: 'Dry Grain' },
  Rice: { baselineDays: 180, optimalTemp: 'Dry Ambient (<13% moisture)', highRiskThreshold: 40, category: 'Dry Grain' },
  Soybean: { baselineDays: 150, optimalTemp: 'Dry Ambient', highRiskThreshold: 38, category: 'Dry Grain' },
  Maize: { baselineDays: 120, optimalTemp: 'Dry Ambient', highRiskThreshold: 38, category: 'Dry Grain' },
  Sugarcane: { baselineDays: 3, optimalTemp: 'Process within 48h', highRiskThreshold: 32, category: 'Critical' },
  Cotton: { baselineDays: 240, optimalTemp: 'Dry Ambient', highRiskThreshold: 42, category: 'Non-perishable' },
};

export default function SpoilageIndicator({
  crop = 'Tomato',
  temperatureCelsius = 28,
  daysInTransit = 1.5,
  coldChain = false,
}) {
  const profile = CROP_PERISHABILITY[crop] || {
    baselineDays: 14,
    optimalTemp: '15-20°C',
    highRiskThreshold: 30,
    category: 'Medium',
  };

  // Temperature acceleration coefficient (Arrhenius-style heuristic approximation)
  // Higher ambient temps drastically accelerate respiration and bacterial decay in perishables
  let decayFactor = 1.0;
  if (!coldChain) {
    if (temperatureCelsius > profile.highRiskThreshold) {
      decayFactor = 1.0 + (temperatureCelsius - profile.highRiskThreshold) * 0.12;
    } else if (temperatureCelsius < 20) {
      decayFactor = 0.8;
    }
  } else {
    // Cold chain maintains freshness
    decayFactor = 0.35;
  }

  // Effective days consumed
  const effectiveDaysElapsed = daysInTransit * decayFactor;
  const remainingDays = Math.max(0, Number((profile.baselineDays - effectiveDaysElapsed).toFixed(1)));
  const decayPercent = Math.min(100, Math.round((effectiveDaysElapsed / profile.baselineDays) * 100));

  // Risk categorization
  let riskLevel = 'LOW';
  let badgeClass = 'badge-success';
  let riskColor = 'var(--color-success)';
  let RiskIcon = CheckCircle;

  if (decayPercent > 65 || remainingDays <= 1.5) {
    riskLevel = 'CRITICAL';
    badgeClass = 'badge-error';
    riskColor = 'var(--color-error)';
    RiskIcon = ShieldAlert;
  } else if (decayPercent > 35 || remainingDays <= 3.5) {
    riskLevel = 'MODERATE';
    badgeClass = 'badge-warning';
    riskColor = 'var(--color-warning)';
    RiskIcon = AlertTriangle;
  }

  return (
    <div className="card" style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <RiskIcon size={20} color={riskColor} />
          <h3 className="heading-3" style={{ margin: 0 }}>
            Shelf Life & Spoilage Index
          </h3>
        </div>
        <span className={`badge ${badgeClass}`} style={{ fontWeight: 700 }}>
          {riskLevel} RISK
        </span>
      </div>

      <p className="body-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
        Estimated degradation rate based on ambient weather ({temperatureCelsius}°C), crop perishability, and logistics duration.
      </p>

      {/* Decay Gauge */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-1)' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Decay Progress</span>
          <span style={{ fontWeight: 700, color: riskColor }}>{decayPercent}% Consumed</span>
        </div>
        <div
          style={{
            height: '10px',
            backgroundColor: 'var(--color-border)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${decayPercent}%`,
              height: '100%',
              backgroundColor: riskColor,
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.4s ease-in-out',
            }}
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-3)',
          background: 'var(--color-bg)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            <Clock size={13} />
            Est. Shelf Life
          </div>
          <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text-primary)', marginTop: '2px' }}>
            ~{remainingDays} days
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            <Thermometer size={13} />
            Optimal Temp
          </div>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', marginTop: '2px' }}>
            {profile.optimalTemp}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            <Snowflake size={13} />
            Cold Chain
          </div>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: coldChain ? 'var(--color-success)' : 'var(--color-text-muted)', marginTop: '2px' }}>
            {coldChain ? 'Active' : 'Standard'}
          </div>
        </div>
      </div>

      {/* Advisory Tip */}
      <div
        style={{
          fontSize: 'var(--text-xs)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: riskLevel === 'CRITICAL' ? 'var(--color-error-bg)' : 'var(--color-primary-bg)',
          color: riskLevel === 'CRITICAL' ? 'var(--color-error)' : 'var(--color-primary-dark)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <span>💡</span>
        <span>
          {riskLevel === 'CRITICAL'
            ? `Immediate local sale recommended. High ambient heat (${temperatureCelsius}°C) will accelerate spoilage within 24-48 hours.`
            : `Perishability is within safe window. Target Mandis within ${remainingDays} days transit horizon.`}
        </span>
      </div>
    </div>
  );
}
