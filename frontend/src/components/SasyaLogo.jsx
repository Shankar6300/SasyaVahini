import React from 'react';

/**
 * SasyaVahini Official Agricultural Brand Logo
 * Combines an organic sprout rising over furrowed agricultural fields with direct circular trade flow.
 */
export const SasyaLogo = ({ size = 38, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SasyaVahini Emblem"
    >
      <defs>
        <linearGradient id="svGradientPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#07875B" />
          <stop offset="100%" stopColor="#044c33" />
        </linearGradient>
        <linearGradient id="svLeafLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#07875B" />
        </linearGradient>
      </defs>

      {/* Rounded squircle emblem background */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#svGradientPrimary)" />

      {/* Golden dawn arc / sun */}
      <circle cx="24" cy="20" r="7" fill="#F59E0B" fillOpacity="0.85" />

      {/* Furrowed field curves (direct agricultural earth) */}
      <path
        d="M6 38 C 14 33, 22 36, 42 32"
        stroke="#E8F5E9"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
      <path
        d="M6 42 C 16 38, 26 40, 42 37"
        stroke="#A7F3D0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />

      {/* Central Sprout Stem */}
      <path
        d="M24 35 C 24 26, 24 16, 24 14"
        stroke="#E8F5E9"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Left Sprout Leaf */}
      <path
        d="M24 23 C 18 21, 14 15, 17 12 C 21 12, 24 17, 24 20"
        fill="url(#svLeafLight)"
        stroke="#E8F5E9"
        strokeWidth="1"
      />

      {/* Right Sprout Leaf */}
      <path
        d="M24 19 C 29 17, 34 12, 32 9 C 28 9, 24 14, 24 17"
        fill="#10B981"
        stroke="#E8F5E9"
        strokeWidth="1"
      />
    </svg>
  );
};

export default SasyaLogo;
