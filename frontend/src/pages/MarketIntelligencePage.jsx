import React from 'react';
import MarketIntelligenceWidget from '../components/ml/MarketIntelligenceWidget';

export default function MarketIntelligencePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          SasyaVahini Market Intelligence & Price Discovery
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Government of India • Ministry of Consumer Affairs, Food & Public Distribution (DoCA)
        </p>
      </div>

      <MarketIntelligenceWidget />
    </div>
  );
}

