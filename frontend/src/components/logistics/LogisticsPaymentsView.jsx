import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  Download,
  Building,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  FileText,
  DollarSign,
  AlertCircle,
  Truck,
  RotateCw,
} from 'lucide-react';

const INITIAL_SETTLEMENTS = [
  {
    id: 'pay_001',
    waybillNo: 'SV-SHP-2026-0001',
    tripDate: '2026-11-11',
    corridor: 'Manchar Hub → Khed → Hadapsar APMC',
    distanceKm: 96,
    crop: 'Tomato (Grade A)',
    weightKg: 2500,
    vehicleNumber: 'MH-14-AZ-7434',
    baseFreight: 2840,
    tollReimbursement: 120,
    platformFeeDeduction: 0, // Kisan logistics exemption
    netPayout: 2960,
    status: 'ESCROW_HELD',
    utrNumber: 'PENDING_DELIVERY_OTP',
    estimatedRelease: 'Instant upon buyer delivery OTP verification',
  },
  {
    id: 'pay_002',
    waybillNo: 'SV-SHP-2026-0000',
    tripDate: '2026-11-09',
    corridor: 'Narayangaon Hub → Bhosari → Pune Market Yard',
    distanceKm: 78,
    crop: 'Onion (Grade B)',
    weightKg: 3500,
    vehicleNumber: 'MH-14-AZ-7434',
    baseFreight: 3200,
    tollReimbursement: 80,
    platformFeeDeduction: 0,
    netPayout: 3280,
    status: 'SETTLED',
    utrNumber: 'UTR-20261109-883921',
    settledAt: '2026-11-09 18:30 IST',
  },
  {
    id: 'pay_003',
    waybillNo: 'SV-SHP-2025-9981',
    tripDate: '2026-11-07',
    corridor: 'Junnar Hub → Chakan Consolidation Depot',
    distanceKm: 64,
    crop: 'Pomegranate (Grade A)',
    weightKg: 2000,
    vehicleNumber: 'MH-14-AZ-7434',
    baseFreight: 2400,
    tollReimbursement: 0,
    platformFeeDeduction: 0,
    netPayout: 2400,
    status: 'SETTLED',
    utrNumber: 'UTR-20261107-771920',
    settledAt: '2026-11-07 16:45 IST',
  },
  {
    id: 'pay_004',
    waybillNo: 'SV-SHP-2025-9942',
    tripDate: '2026-11-04',
    corridor: 'Baramati Hub → Hadapsar APMC Yard',
    distanceKm: 110,
    crop: 'Grapes (Reefer Cold-Chain)',
    weightKg: 4000,
    vehicleNumber: 'MH-14-AZ-7434',
    baseFreight: 5200,
    tollReimbursement: 160,
    platformFeeDeduction: 0,
    netPayout: 5360,
    status: 'SETTLED',
    utrNumber: 'UTR-20261104-551982',
    settledAt: '2026-11-04 19:15 IST',
  },
];

export default function LogisticsPaymentsView({ profile, user }) {
  const [settlements, setSettlements] = useState(INITIAL_SETTLEMENTS);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'SETTLED' | 'ESCROW'
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState(null);

  const bankName = profile?.bankName || 'HDFC Bank';
  const accountHolder = profile?.accountHolderName || profile?.ownerName || user?.name || 'Transporter';
  const accountNumber = profile?.accountNumber || '••••4491';
  const ifscCode = profile?.ifscCode || 'HDFC0001234';

  const totalEarned = settlements.reduce((sum, s) => sum + s.netPayout, 0);
  const settledAmount = settlements
    .filter((s) => s.status === 'SETTLED')
    .reduce((sum, s) => sum + s.netPayout, 0);
  const escrowHeldAmount = settlements
    .filter((s) => s.status === 'ESCROW_HELD')
    .reduce((sum, s) => sum + s.netPayout, 0);

  const handleRequestExpressPayout = () => {
    setRequestingPayout(true);
    setTimeout(() => {
      setRequestingPayout(false);
      setPayoutSuccessMsg('Express payout request registered! Verified completed trips will be credited via IMPS within 2 hours.');
      setTimeout(() => setPayoutSuccessMsg(null), 6000);
    }, 1200);
  };

  const filtered = filter === 'ALL'
    ? settlements
    : filter === 'SETTLED'
    ? settlements.filter((s) => s.status === 'SETTLED')
    : settlements.filter((s) => s.status === 'ESCROW_HELD');

  return (
    <div className="space-y-6">
      {/* ─── Financial KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earned */}
        <div className="card p-5 rounded-xl bg-white border shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Gross Freight</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">₹{totalEarned.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <ArrowUpRight size={13} /> 100% direct transporter earnings
          </p>
        </div>

        {/* Settled to Bank */}
        <div className="card p-5 rounded-xl bg-white border shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Settled in Bank (DBT)</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-900">₹{settledAmount.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Credited to {bankName} A/C {accountNumber.slice(-4)}
          </p>
        </div>

        {/* Held in Escrow */}
        <div className="card p-5 rounded-xl bg-white border shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Held in Escrow</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900">₹{escrowHeldAmount.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            Releases upon delivery OTP confirmation
          </p>
        </div>

        {/* Next Scheduled Payout */}
        <div className="card p-5 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Direct Settlement</span>
            <div className="text-xl font-bold mt-1">Daily Automated Payout</div>
            <p className="text-xs text-emerald-100 mt-1">
              Zero Platform Commission (Kisan Exemption)
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestExpressPayout}
            disabled={requestingPayout}
            className="mt-3 py-1.5 px-3 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <RotateCw size={12} className={requestingPayout ? 'animate-spin' : ''} />
            {requestingPayout ? 'Requesting IMPS...' : 'Express Payout (IMPS)'}
          </button>
        </div>
      </div>

      {payoutSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-700 shrink-0" />
          <span>{payoutSuccessMsg}</span>
        </div>
      )}

      {/* ─── Linked Bank Account Card ──────────────────────────────────────── */}
      <div className="card p-5 rounded-xl bg-white border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
              <Building size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Primary Bank Settlement Account</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <ShieldCheck size={11} /> DBT Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                All freight dues and toll reimbursements are directly credited to this account.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Bank Name</span>
            <span className="font-bold text-slate-900 text-sm">{bankName}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Account Holder</span>
            <span className="font-bold text-slate-900 text-sm">{accountHolder}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Account Number</span>
            <span className="font-bold text-slate-900 text-sm font-mono">{accountNumber}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">IFSC Code</span>
            <span className="font-bold text-slate-900 text-sm font-mono">{ifscCode}</span>
          </div>
        </div>
      </div>

      {/* ─── Trip Settlement Ledger ───────────────────────────────────────── */}
      <div className="card p-5 rounded-xl bg-white border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-700" />
              <span>Freight Settlements & Waybill Ledger</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete transaction audit for agricultural hauling and corridor aggregation.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                filter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({settlements.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('SETTLED')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                filter === 'SETTLED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settled
            </button>
            <button
              type="button"
              onClick={() => setFilter('ESCROW')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                filter === 'ESCROW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Escrow
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-slate-500 text-left">
                <th className="py-3 font-semibold">Waybill / Trip No</th>
                <th className="py-3 font-semibold">Date</th>
                <th className="py-3 font-semibold">Corridor & Load</th>
                <th className="py-3 font-semibold">Base Freight</th>
                <th className="py-3 font-semibold">Tolls / Surcharges</th>
                <th className="py-3 font-semibold">Net Payout</th>
                <th className="py-3 font-semibold">Settlement Status</th>
                <th className="py-3 font-semibold text-right">Bank UTR / Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 font-bold text-slate-900 font-mono">
                    {item.waybillNo}
                  </td>
                  <td className="py-3.5 text-slate-600">{item.tripDate}</td>
                  <td className="py-3.5">
                    <div className="font-semibold text-slate-800">{item.corridor}</div>
                    <div className="text-[11px] text-slate-500">{item.crop} • {item.weightKg} kg • {item.distanceKm} km</div>
                  </td>
                  <td className="py-3.5 font-semibold text-slate-800">₹{item.baseFreight.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 text-emerald-700 font-semibold">+₹{item.tollReimbursement}</td>
                  <td className="py-3.5 font-extrabold text-slate-950 text-sm">
                    ₹{item.netPayout.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5">
                    {item.status === 'SETTLED' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                        <CheckCircle size={10} /> SETTLED
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 inline-flex items-center gap-1" title={item.estimatedRelease}>
                        <Clock size={10} /> IN ESCROW
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    {item.status === 'SETTLED' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-mono text-[10px] text-slate-500">{item.utrNumber}</span>
                        <button
                          type="button"
                          onClick={() => alert(`Downloading Settlement Voucher for ${item.waybillNo}...`)}
                          className="p-1 rounded text-slate-600 hover:text-emerald-700 hover:bg-slate-100"
                          title="Download Tax Invoice"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-medium">Pending Delivery OTP</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

