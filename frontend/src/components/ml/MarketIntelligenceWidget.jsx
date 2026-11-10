import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  Truck,
  Info,
  RefreshCw,
  Sliders,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { getDemandForecast, getPriceRecommendation } from '../../services/mlApi';

const CROPS = [
  { id: 'Tomato', label: 'Tomato (टमाटर / टोमॅटो)', defaultSupply: 25000, temp: 30 },
  { id: 'Onion', label: 'Onion (प्याज़ / कांदा)', defaultSupply: 40000, temp: 28 },
  { id: 'Potato', label: 'Potato (आलू / बटाटा)', defaultSupply: 35000, temp: 26 },
  { id: 'Rice', label: 'Rice / Paddy (चावल / धान)', defaultSupply: 45000, temp: 28 },
  { id: 'Wheat', label: 'Wheat (गेहूं / गहू)', defaultSupply: 50000, temp: 24 },
  { id: 'Maize', label: 'Maize (मक्का / मका)', defaultSupply: 20000, temp: 27 },
  { id: 'Chilli', label: 'Chilli (हरी / लाल मिर्च)', defaultSupply: 12000, temp: 31 },
  { id: 'Garlic', label: 'Garlic (लहसुन / लसूण)', defaultSupply: 10000, temp: 26 },
  { id: 'Ginger', label: 'Ginger (अदरक / आले)', defaultSupply: 11000, temp: 27 },
  { id: 'Turmeric', label: 'Turmeric (हल्दी / हळद)', defaultSupply: 15000, temp: 28 },
  { id: 'Soybean', label: 'Soybean (सोयाबीन)', defaultSupply: 25000, temp: 28 },
  { id: 'Cotton', label: 'Cotton (कपास / कापूस)', defaultSupply: 22000, temp: 30 },
  { id: 'Sugarcane', label: 'Sugarcane (गन्ना / ऊस)', defaultSupply: 60000, temp: 30 },
  { id: 'Banana', label: 'Banana (केला / केळी)', defaultSupply: 30000, temp: 29 },
  { id: 'Grapes', label: 'Grapes (अंगूर / द्राक्षे)', defaultSupply: 18000, temp: 26 },
  { id: 'Pomegranate', label: 'Pomegranate (अनार / डाळिंब)', defaultSupply: 14000, temp: 29 },
  { id: 'Mango', label: 'Mango (आम / आंबा)', defaultSupply: 20000, temp: 32 },
  { id: 'Papaya', label: 'Papaya (पपीता / पपई)', defaultSupply: 18000, temp: 29 },
  { id: 'Lemon', label: 'Lemon (नींबू / लिंबू)', defaultSupply: 12000, temp: 30 },
  { id: 'Capsicum', label: 'Capsicum (शिमला मिर्च / ढोबळी मिरची)', defaultSupply: 14000, temp: 26 },
  { id: 'Brinjal', label: 'Brinjal (बैंगन / वांगी)', defaultSupply: 16000, temp: 28 },
  { id: 'Cauliflower', label: 'Cauliflower (फूलगोभी / फ्लॉवर)', defaultSupply: 18000, temp: 25 },
  { id: 'Cabbage', label: 'Cabbage (पत्तागोभी / कोबी)', defaultSupply: 18000, temp: 25 },
  { id: 'Cucumber', label: 'Cucumber (खीरा / काकडी)', defaultSupply: 16000, temp: 27 },
];

const DISTRICTS = [
  'Pune', 'Nashik', 'Ahmednagar', 'Solapur', 'Nagpur',
  'Satara', 'Kolhapur', 'Sangli', 'Jalgaon', 'Aurangabad',
  'Mumbai', 'Kadapa', 'Kurnool', 'Guntur', 'Hyderabad',
  'Bengaluru', 'Indore', 'Bhopal', 'Jaipur', 'Lucknow',
  'Delhi', 'Ahmedabad', 'Surat', 'Chandigarh', 'Kolkata',
];

export default function MarketIntelligenceWidget({ initialCrop = 'Tomato', initialDistrict = 'Pune', onPriceSelect }) {
  const [selectedCrop, setSelectedCrop] = useState(initialCrop);
  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict);
  const [quantityKg, setQuantityKg] = useState(1500);
  const [isFestival, setIsFestival] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demandData, setDemandData] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [activeTab, setActiveTab] = useState('TRAJECTORY'); // 'TRAJECTORY' | 'ARBITRAGE' | 'FACTORS'

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cropConfig = CROPS.find((c) => c.id === selectedCrop) || CROPS[0];

      // 1. Fetch Demand Forecast (Probabilistic multi-horizon + trajectory + arbitrage)
      const demandRes = await getDemandForecast({
        crop: selectedCrop,
        district: selectedDistrict,
        state: 'Maharashtra',
        festival_period: isFestival,
        current_supply_kg: cropConfig.defaultSupply,
        temperature_celsius: cropConfig.temp,
      });
      setDemandData(demandRes);

      // 2. Fetch Price Recommendation (Elasticity & decay clearing)
      const priceRes = await getPriceRecommendation({
        crop: selectedCrop,
        district: selectedDistrict,
        state: 'Maharashtra',
        quantity_kg: quantityKg,
        current_supply_kg: cropConfig.defaultSupply,
        predicted_demand_kg: demandRes?.predicted_demand_kg,
        transit_days: 1.5,
      });
      setPriceData(priceRes);
    } catch (err) {
      console.error('Failed to load market intelligence:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCrop, selectedDistrict, quantityKg, isFestival]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Find best trajectory day
  const bestTrajectoryDay = demandData?.daily_trajectory?.reduce(
    (max, item) => (item.expected_price_per_kg > (max?.expected_price_per_kg || 0) ? item : max),
    null,
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-[#07875B] text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">AI Demand & Pricing Intelligence</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  Agmarknet Verified • Live APMC
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Multi-horizon quantile forecasting (P10/P50/P90), mandi road arbitrage, and perishability discounting.
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg text-xs font-semibold backdrop-blur-sm transition-all"
            title="Refresh Intelligence"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ─── Control Bar ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/15 text-slate-800">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-100 mb-1">
              Select Commodity
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl text-xs font-bold text-slate-800 border-0 shadow-sm focus:ring-2 focus:ring-amber-400 outline-none"
            >
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-100 mb-1">
              District (Mandi Zone)
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl text-xs font-bold text-slate-800 border-0 shadow-sm focus:ring-2 focus:ring-amber-400 outline-none"
            >
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d} Mandi Hub
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-100 mb-1">
              Lot Size: {quantityKg.toLocaleString()} kg
            </label>
            <input
              type="range"
              min="200"
              max="10000"
              step="100"
              value={quantityKg}
              onChange={(e) => setQuantityKg(Number(e.target.value))}
              className="w-full accent-amber-300 mt-2"
            />
          </div>

          <div className="flex items-center sm:justify-center pt-2 sm:pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white select-none">
              <input
                type="checkbox"
                checked={isFestival}
                onChange={(e) => setIsFestival(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
              <span>🎉 Festival Period Active</span>
            </label>
          </div>
        </div>
      </div>

      {/* ─── Key KPI Metrics Grid ────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Recommended Price */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Fair Benchmark Price</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">
                ₹{priceData?.recommended_price_per_kg || '—'}
              </span>
              <span className="text-xs font-semibold text-slate-500">/ kg</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Band: ₹{priceData?.price_range_min || '—'} – ₹{priceData?.price_range_max || '—'} / kg
            </p>
            {onPriceSelect && priceData?.recommended_price_per_kg && (
              <button
                onClick={() => onPriceSelect(priceData.recommended_price_per_kg)}
                className="mt-2 text-xs font-bold text-[#07875B] hover:underline flex items-center gap-1"
              >
                Apply to listing <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* KPI 2: Demand Pressure Level */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Regional Demand</span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-black px-2.5 py-1 rounded-md ${
                  demandData?.demand_level === 'HIGH'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : demandData?.demand_level === 'LOW'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {demandData?.demand_level || 'ANALYZING'} DEMAND
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Net Gap: {demandData?.demand_gap_kg ? `${demandData.demand_gap_kg > 0 ? '+' : ''}${demandData.demand_gap_kg.toLocaleString()} kg` : 'Balanced'}
            </p>
          </div>

          {/* KPI 3: Quantile Uncertainty (P10 - P90) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Quantile Forecast</span>
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-800">
                {demandData?.predicted_demand_kg ? Math.round(demandData.predicted_demand_kg / 1000) : '—'}k
              </span>
              <span className="text-xs font-semibold text-slate-500">kg (P50 Median)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              P10 Floor: {demandData?.demand_p10_kg ? Math.round(demandData.demand_p10_kg / 1000) : '—'}k • P90 Peak: {demandData?.demand_p90_kg ? Math.round(demandData.demand_p90_kg / 1000) : '—'}k
            </p>
          </div>

          {/* KPI 4: Mandi Arbitrage Signal */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">APMC Arbitrage</span>
              <Truck className="w-4 h-4 text-teal-600" />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-black px-2 py-0.5 rounded ${
                  demandData?.arbitrage_advisory?.signal === 'STRONG_ARBITRAGE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {demandData?.arbitrage_advisory?.signal || 'SELL LOCAL'}
              </span>
            </div>
            <p className="text-[11px] font-bold text-emerald-700 mt-1.5">
              Gain: +₹{demandData?.arbitrage_advisory?.net_arbitrage_gain_per_kg || 0}/kg net profit
            </p>
          </div>
        </div>
      </div>

      {/* ─── Detailed Tabs ───────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 border-b border-slate-200 mb-4">
          <button
            onClick={() => setActiveTab('TRAJECTORY')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'TRAJECTORY'
                ? 'border-[#07875B] text-[#07875B]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> 7-Day Harvest Trajectory
          </button>

          <button
            onClick={() => setActiveTab('ARBITRAGE')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'ARBITRAGE'
                ? 'border-[#07875B] text-[#07875B]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Mandi Road Arbitrage
          </button>

          <button
            onClick={() => setActiveTab('FACTORS')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'FACTORS'
                ? 'border-[#07875B] text-[#07875B]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" /> AI Explainability Drivers
          </button>
        </div>

        {/* Tab 1: 7-Day Trajectory */}
        {activeTab === 'TRAJECTORY' && (
          <div>
            {bestTrajectoryDay && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-extrabold text-emerald-900">
                    Harvest Window Recommendation: Day {bestTrajectoryDay.day} ({bestTrajectoryDay.date})
                  </p>
                  <p className="text-emerald-700">
                    Projected peak clearing price reaches <strong>₹{bestTrajectoryDay.expected_price_per_kg}/kg</strong> with expected regional demand of {bestTrajectoryDay.p50_kg?.toLocaleString()} kg.
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2.5">Horizon</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5 text-right">P10 Floor (kg)</th>
                    <th className="p-2.5 text-right">P50 Expected (kg)</th>
                    <th className="p-2.5 text-right">P90 Ceiling (kg)</th>
                    <th className="p-2.5 text-right">Expected Price (₹/kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(demandData?.daily_trajectory || []).map((row) => (
                    <tr
                      key={row.day}
                      className={row.day === bestTrajectoryDay?.day ? 'bg-emerald-50/70 font-bold text-emerald-950' : 'hover:bg-slate-50'}
                    >
                      <td className="p-2.5">Day {row.day}</td>
                      <td className="p-2.5">{row.date}</td>
                      <td className="p-2.5 text-right">{row.p10_kg?.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{row.p50_kg?.toLocaleString()}</td>
                      <td className="p-2.5 text-right">{row.p90_kg?.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-black text-[#07875B]">₹{row.expected_price_per_kg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Mandi Road Arbitrage */}
        {activeTab === 'ARBITRAGE' && demandData?.arbitrage_advisory && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Origin APMC</p>
                <p className="text-base font-extrabold text-slate-800">{demandData.arbitrage_advisory.origin_mandi}</p>
                <p className="text-xs text-slate-500">Modal Price: ₹{demandData.arbitrage_advisory.origin_modal_price}/kg</p>
              </div>

              <div className="flex items-center gap-2 self-center text-slate-400">
                <span className="text-xs font-semibold">{demandData.arbitrage_advisory.distance_km} km</span>
                <ArrowRight className="w-5 h-5 text-emerald-600" />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Destination APMC Hub</p>
                <p className="text-base font-extrabold text-slate-800">{demandData.arbitrage_advisory.recommended_mandi}</p>
                <p className="text-xs font-bold text-emerald-700">Modal Price: ₹{demandData.arbitrage_advisory.target_modal_price}/kg</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-center">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Gross Price Gap</span>
                <p className="text-base font-black text-slate-800">
                  +₹{(demandData.arbitrage_advisory.target_modal_price - demandData.arbitrage_advisory.origin_modal_price).toFixed(2)}/kg
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Freight & Diesel Friction</span>
                <p className="text-base font-black text-rose-600">
                  -₹{demandData.arbitrage_advisory.freight_cost_per_kg}/kg
                </p>
              </div>

              <div className="bg-emerald-100/70 p-3 rounded-lg border border-emerald-300">
                <span className="text-[10px] font-black text-emerald-800 uppercase">Net Realized Gain</span>
                <p className="text-base font-black text-emerald-900">
                  +₹{demandData.arbitrage_advisory.net_arbitrage_gain_per_kg}/kg
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Factors & Explainability */}
        {activeTab === 'FACTORS' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Econometric and agronomic drivers currently steering this recommendation:
            </p>
            <ul className="space-y-2">
              {[
                ...(demandData?.explanations || []),
                ...(priceData?.explanations || []),
                `Elasticity Coefficient: ε = ${priceData?.elasticity_coefficient || -0.55} (inelastic staple responsiveness)`,
                `Model version: ${demandData?.model_version || 'v1.2-quantile'}`,
              ].map((explanation, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{explanation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

