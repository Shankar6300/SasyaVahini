import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, Info } from 'lucide-react';

/**
 * SasyaVahini — Mandi Price Forecast Chart
 *
 * Renders a rich, interactive 7-day price forecast visualization with SVG curves,
 * gradient area fill, interactive hover nodes, and market trend indicators.
 *
 * Owner: Member 5 (ML Analytics & Mandi Advisor)
 */
export default function MandiPriceChart({
  crop = 'Tomato',
  district = 'Pune',
  basePrice = 25,
  recommendedPrice = 27.5,
  demandLevel = 'HIGH',
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Generate a realistic 7-day trajectory based on demand level and recommendation
  const multiplier = demandLevel === 'HIGH' ? 1.02 : demandLevel === 'LOW' ? 0.98 : 1.005;
  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  
  const pricePoints = days.map((day, idx) => {
    const drift = (idx * 0.4) * (demandLevel === 'HIGH' ? 1 : -0.7);
    const wave = Math.sin(idx * 1.1) * 0.6;
    const price = Math.max(5, Number((recommendedPrice + drift + wave).toFixed(2)));
    return { day, price, date: `+${idx + 1}d` };
  });

  const prices = pricePoints.map((p) => p.price);
  const minPrice = Math.min(...prices) * 0.95;
  const maxPrice = Math.max(...prices) * 1.05;
  const priceRange = maxPrice - minPrice || 1;

  // SVG dimensions
  const width = 640;
  const height = 220;
  const paddingX = 45;
  const paddingY = 30;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  // Calculate coordinates
  const coords = pricePoints.map((p, idx) => {
    const x = paddingX + (idx / (pricePoints.length - 1)) * graphWidth;
    const y = height - paddingY - ((p.price - minPrice) / priceRange) * graphHeight;
    return { x, y, ...p };
  });

  // Construct SVG path using smooth Bezier curves
  const linePath = coords.reduce((acc, point, idx, arr) => {
    if (idx === 0) return `M ${point.x},${point.y}`;
    const prev = arr[idx - 1];
    const cpX1 = prev.x + (point.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (point.x - prev.x) / 2;
    const cpY2 = point.y;
    return `${acc} C ${cpX1},${cpY1} ${cpX2},${cpY2} ${point.x},${point.y}`;
  }, '');

  const areaPath = `${linePath} L ${coords[coords.length - 1].x},${height - paddingY} L ${coords[0].x},${height - paddingY} Z`;

  const startPrice = prices[0];
  const endPrice = prices[prices.length - 1];
  const priceChangePercent = Number((((endPrice - startPrice) / startPrice) * 100).toFixed(1));
  const isUp = priceChangePercent > 0;
  const isDown = priceChangePercent < 0;

  return (
    <div className="card" style={{ padding: 'var(--space-6)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 700 }}>
              AI Mandi Advisory
            </span>
            <span className="badge badge-neutral" style={{ fontSize: 'var(--text-xs)' }}>
              7-Day Horizon
            </span>
          </div>
          <h3 className="heading-3" style={{ marginTop: 'var(--space-1)', marginBottom: 0 }}>
            {crop} Price Outlook — {district}
          </h3>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Projected 7-Day Trend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', justifyContent: 'flex-end', marginTop: '2px' }}>
            {isUp ? (
              <TrendingUp size={18} color="var(--color-success)" />
            ) : isDown ? (
              <TrendingDown size={18} color="var(--color-error)" />
            ) : (
              <Minus size={18} color="var(--color-text-muted)" />
            )}
            <span
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                color: isUp ? 'var(--color-success)' : isDown ? 'var(--color-error)' : 'var(--color-text-secondary)',
              }}
            >
              {isUp ? `+${priceChangePercent}%` : `${priceChangePercent}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minWidth: '460px', display: 'block' }}
          aria-label={`${crop} 7-day price forecast chart`}
        >
          <defs>
            <linearGradient id="mandiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#07875B" stopOpacity="0.32" />
              <stop offset="90%" stopColor="#07875B" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#09a970" />
              <stop offset="100%" stopColor="#07875B" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((factor) => {
            const y = height - paddingY - factor * graphHeight;
            const priceVal = (minPrice + factor * priceRange).toFixed(1);
            return (
              <g key={factor}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--color-text-muted)"
                  fontFamily="var(--font-sans)"
                >
                  ₹{priceVal}
                </text>
              </g>
            );
          })}

          {/* Gradient area */}
          <path d={areaPath} fill="url(#mandiGradient)" />

          {/* Forecast curve */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGlow)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Data Points */}
          {coords.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g key={pt.day} style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6.5 : 4.5}
                  fill={isHovered ? '#07875B' : '#ffffff'}
                  stroke="#07875B"
                  strokeWidth={isHovered ? 3 : 2.5}
                  style={{ transition: 'all 0.15s ease' }}
                />
                {/* Day labels along X axis */}
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? '600' : '400'}
                  fill={isHovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}
                  fontFamily="var(--font-sans)"
                >
                  {pt.day}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip display / Summary cards */}
      <div
        style={{
          marginTop: 'var(--space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 'var(--space-3)',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-3) var(--space-4)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Current Mandi</span>
          <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}>
            ₹{basePrice.toFixed(2)}/kg
          </div>
        </div>
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>AI Recommended</span>
          <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-primary)' }}>
            ₹{recommendedPrice.toFixed(2)}/kg
          </div>
        </div>
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>7-Day Low / High</span>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
            ₹{Math.min(...prices).toFixed(1)} – ₹{Math.max(...prices).toFixed(1)}
          </div>
        </div>
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Best Selling Window</span>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-success)' }}>
            {demandLevel === 'HIGH' ? 'Day 3 – Day 5' : 'Immediate / Day 1'}
          </div>
        </div>
      </div>
    </div>
  );
}
