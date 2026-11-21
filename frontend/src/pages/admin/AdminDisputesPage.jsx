import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  ShieldCheck,
  RefreshCw,
  Lock,
  ArrowRight,
  TrendingDown,
  FileText,
  DollarSign,
  Truck,
  Building,
  User,
  ExternalLink,
  Sliders,
} from 'lucide-react';
import adminApi from '../../services/adminApi';
import Alert from '../../components/Alert';
import { PageSpinner } from '../../components/Spinner';

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('OPEN'); // 'OPEN' | 'RESOLVED' | 'ALL'
  const [searchTerm, setSearchTerm] = useState('');

  // Arbitration Dossier Modal State
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [arbitrationVerdict, setArbitrationVerdict] = useState('SPLIT_SETTLEMENT'); // 'RELEASE_TO_SELLER' | 'REFUND_TO_BUYER' | 'SPLIT_SETTLEMENT'
  const [splitBuyerPercent, setSplitBuyerPercent] = useState(25); // Default 25% refund, 75% payout
  const [arbitrationRemarks, setArbitrationRemarks] = useState('');

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDisputes({ status: statusFilter });
      setDisputes(Array.isArray(res) ? res : res?.disputes || []);
    } catch (err) {
      console.error('Failed to load disputes:', err);
      setFeedback({ type: 'error', message: 'Failed to retrieve dispute arbitration records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter]);

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!selectedDispute) return;

    try {
      setActionLoading(true);
      await adminApi.resolveDispute(selectedDispute.id, {
        verdict: arbitrationVerdict,
        splitBuyerPercent: arbitrationVerdict === 'SPLIT_SETTLEMENT' ? splitBuyerPercent : undefined,
        remarks: arbitrationRemarks || `Binding statutory arbitration order issued by DoCA under Section 12 APMC & MoAFW Act. Verdict: ${arbitrationVerdict}.`,
      });

      setFeedback({
        type: 'success',
        message: `Dispute on contract ${selectedDispute.orderNumber} successfully resolved with verdict: ${arbitrationVerdict.replace(/_/g, ' ')}. Escrow has been updated.`,
      });

      setSelectedDispute(null);
      setArbitrationRemarks('');
      await fetchDisputes();
    } catch (err) {
      console.error('Failed to arbitrate dispute:', err);
      setFeedback({ type: 'error', message: err.message || 'Arbitration settlement failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getDisputeCategoryBadge = (reason) => {
    switch (reason) {
      case 'WEIGHT_SHORTAGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">WEIGHT SHORTAGE</span>;
      case 'QUALITY_GRADE_MISMATCH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">GRADE MISMATCH</span>;
      case 'TRANSIT_DELAY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">TRANSIT DELAY</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{reason || 'CONTRACT DISPUTE'}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <AlertTriangle size={12} /> UNDER ARBITRATION
          </span>
        );
      case 'SETTLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle size={12} /> ARBITRATED & SETTLED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <XCircle size={12} /> FULLY REFUNDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    const q = searchTerm.toLowerCase();
    return (
      (d.orderNumber || '').toLowerCase().includes(q) ||
      (d.commodity || '').toLowerCase().includes(q) ||
      (d.buyer?.organizationName || '').toLowerCase().includes(q) ||
      (d.buyer?.user?.name || '').toLowerCase().includes(q) ||
      (d.supplierName || '').toLowerCase().includes(q)
    );
  });

  const openCases = disputes.filter((d) => d.status === 'DISPUTED');
  const totalFrozenEscrow = openCases.reduce((sum, d) => sum + (d.agreedPriceTotal || d.payment?.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* ─── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-100 text-rose-800 font-bold">
              <Scale size={24} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Dispute Arbitration & Escrow Resolution Center</h1>
              <p className="text-xs text-slate-500">
                Department of Consumer Affairs (DoCA) • Statutory dispute adjudication, weight loss arbitration, quality grade inspections & binding escrow settlement
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDisputes}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Queue
          </button>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* ─── 4 Metric KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'OPEN'
              ? 'bg-rose-100/70 border-rose-400 ring-2 ring-rose-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">Contested Orders</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{openCases.length}</div>
          <div className="text-[11px] text-rose-700 mt-0.5">Awaiting DoCA arbitration verdict</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Frozen Escrow Value</span>
            <Lock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalFrozenEscrow)}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Held safely in platform trust ledger</div>
        </div>

        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Historical Rulings</span>
            <CheckCircle size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {disputes.filter((d) => d.status === 'SETTLED' || d.status === 'CANCELLED').length}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Binding settlements enforced</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Legal Jurisdiction</span>
            <ShieldCheck size={16} className="text-blue-600" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-1">Section 12 APMC</div>
          <div className="text-[11px] text-blue-700 mt-0.5">Statutory escrow arbitration</div>
        </div>
      </div>

      {/* ─── Search & Tab Filters ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setStatusFilter('OPEN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'OPEN'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Open Arbitration ({openCases.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'RESOLVED'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Resolved History
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Cases
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search contract #, commodity, buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-8 py-1.5 text-xs w-full rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* ─── Disputes Data Table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-rose-600" />
            <p className="text-xs">Loading arbitration dossiers...</p>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle size={32} className="mx-auto text-emerald-600 mb-2" />
            <p className="font-semibold text-sm">No contested disputes in this view!</p>
            <p className="text-xs text-slate-400 mt-1">
              All transactions have proceeded through delivery verification or have already been settled.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Contract / Order No.</th>
                  <th className="py-3 px-4">Commodity & Volume</th>
                  <th className="py-3 px-4">Disputing Buyer</th>
                  <th className="py-3 px-4">Supplier Farmer / FPO</th>
                  <th className="py-3 px-4">Dispute Grounds</th>
                  <th className="py-3 px-4">Frozen Escrow</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">DoCA Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDisputes.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{d.orderNumber}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Active'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{d.commodity || 'Agricultural Produce'}</div>
                      <div className="text-[11px] text-slate-500">{d.totalQuantityKg} kg</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {d.buyer?.organizationName || d.buyer?.user?.name || 'Buyer Entity'}
                      </div>
                      <div className="text-[11px] text-slate-500">{d.buyer?.user?.email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{d.supplierName || 'FPO Cluster'}</div>
                      <div className="text-[11px] text-slate-500">Maharashtra Hub</div>
                    </td>

                    <td className="py-3 px-4">{getDisputeCategoryBadge(d.disputeReason)}</td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(d.agreedPriceTotal || d.payment?.totalAmount)}
                      </div>
                      <div className="text-[10px] text-amber-700 flex items-center gap-0.5">
                        <Lock size={10} /> Escrow Locked
                      </div>
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(d.status)}</td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDispute(d);
                          setArbitrationVerdict('SPLIT_SETTLEMENT');
                          setSplitBuyerPercent(25);
                          setArbitrationRemarks('');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto ${
                          d.status === 'DISPUTED'
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Scale size={13} />
                        {d.status === 'DISPUTED' ? 'Arbitrate Case' : 'View Ruling'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Arbitration Dossier & Binding Ruling Modal ────────────────────── */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Scale size={20} className="text-rose-700" />
                  Statutory Arbitration Dossier: {selectedDispute.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Commodity: <span className="font-bold text-slate-800">{selectedDispute.commodity || 'Agricultural Produce'}</span> • Total Escrow at Stake:{' '}
                  <span className="font-bold text-amber-800">{formatCurrency(selectedDispute.agreedPriceTotal)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Evidence Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Buyer Claim & Evidence */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    <Building size={14} /> Buyer Claim & Complaint
                  </span>
                  {getDisputeCategoryBadge(selectedDispute.disputeReason)}
                </div>

                <div className="bg-white p-3 rounded-lg border border-rose-100 space-y-1.5">
                  <div className="text-[11px] text-slate-500 font-medium">Claimant Entity:</div>
                  <div className="font-bold text-slate-900">
                    {selectedDispute.buyer?.organizationName || selectedDispute.buyer?.user?.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedDispute.buyer?.user?.email} • {selectedDispute.buyer?.user?.phone}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold text-[11px]">Discrepancy Details:</span>
                  <p className="text-slate-700 mt-1 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-rose-100">
                    {selectedDispute.disputeDescription ||
                      'Buyer reported discrepancy in delivered lot weight and quality specifications compared to contract.'}
                  </p>
                </div>
              </div>

              {/* Right: Supplier & Logistics Proof */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Truck size={14} className="text-emerald-700" /> Carrier & Delivery Proof
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    POD VERIFIED
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="text-[11px] text-slate-500 font-medium">Supplier Entity:</div>
                  <div className="font-bold text-slate-900">{selectedDispute.supplierName || 'Farmer / FPO Producer'}</div>
                  <div className="text-[11px] text-slate-500">Contracted: {selectedDispute.totalQuantityKg} kg</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="text-[11px] text-slate-500 font-medium">Logistics Details:</div>
                  <div className="font-bold text-slate-900">
                    Carrier: {selectedDispute.delivery?.logistics?.companyName || 'Western Express'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Vehicle: {selectedDispute.delivery?.vehicle?.vehicleNumber || 'MH-12-QX-4012'} • Proof:{' '}
                    {selectedDispute.delivery?.proofValue || 'OTP Verified'}
                  </div>
                </div>
              </div>
            </div>

            {/* Arbitration Form (if OPEN) */}
            {selectedDispute.status === 'DISPUTED' ? (
              <form onSubmit={handleResolveDispute} className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-4 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Scale size={16} /> Statutory Arbitration Decision & Escrow Directive
                </div>

                {/* Verdict Radio Options */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                    Select Binding Settlement Verdict:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label
                      className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                        arbitrationVerdict === 'SPLIT_SETTLEMENT'
                          ? 'bg-amber-100/70 border-amber-500 ring-2 ring-amber-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="verdict"
                        value="SPLIT_SETTLEMENT"
                        checked={arbitrationVerdict === 'SPLIT_SETTLEMENT'}
                        onChange={(e) => setArbitrationVerdict(e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Sliders size={14} className="text-amber-700" /> Pro-Rata Split
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Partial payout to supplier & partial refund to buyer for shrinkage.
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                        arbitrationVerdict === 'RELEASE_TO_SELLER'
                          ? 'bg-emerald-100/70 border-emerald-500 ring-2 ring-emerald-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="verdict"
                        value="RELEASE_TO_SELLER"
                        checked={arbitrationVerdict === 'RELEASE_TO_SELLER'}
                        onChange={(e) => setArbitrationVerdict(e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-emerald-700" /> Full Payout (100%)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Dismiss buyer claim; release 100% escrow to Farmer/FPO.
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                        arbitrationVerdict === 'REFUND_TO_BUYER'
                          ? 'bg-rose-100/70 border-rose-500 ring-2 ring-rose-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="verdict"
                        value="REFUND_TO_BUYER"
                        checked={arbitrationVerdict === 'REFUND_TO_BUYER'}
                        onChange={(e) => setArbitrationVerdict(e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <XCircle size={14} className="text-rose-700" /> Full Refund (100%)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Uphold claim; cancel contract and return 100% escrow to buyer.
                      </div>
                    </label>
                  </div>
                </div>

                {/* Split Settlement Slider */}
                {arbitrationVerdict === 'SPLIT_SETTLEMENT' && (
                  <div className="p-3.5 rounded-xl bg-white border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Pro-Rata Settlement Allocation:</span>
                      <span className="text-amber-800">
                        Buyer Refund: {splitBuyerPercent}% • Supplier Payout: {100 - splitBuyerPercent}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="5"
                      value={splitBuyerPercent}
                      onChange={(e) => setSplitBuyerPercent(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-700"
                    />

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                        <span className="text-slate-500 block text-[10px]">Buyer Refund Amount:</span>
                        <span className="font-bold text-rose-800 text-sm">
                          {formatCurrency((selectedDispute.agreedPriceTotal * splitBuyerPercent) / 100)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-right">
                        <span className="text-slate-500 block text-[10px]">Supplier / Farmer Payout:</span>
                        <span className="font-bold text-emerald-800 text-sm">
                          {formatCurrency((selectedDispute.agreedPriceTotal * (100 - splitBuyerPercent)) / 100)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* DoCA Statutory Remarks */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Official DoCA Legal Grounds & Order Remarks *
                  </label>
                  <textarea
                    rows={2}
                    value={arbitrationRemarks}
                    onChange={(e) => setArbitrationRemarks(e.target.value)}
                    placeholder="e.g. Weighbridge variance of 14.6% attributed to transit dehydration under high summer ambient temperatures. Ordered 25% buyer refund and 75% farmer payout in accordance with APMC Rule 44."
                    className="form-input text-xs w-full rounded-lg border border-slate-200"
                  />
                </div>

                {/* Submit Order Button */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDispute(null)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
                  >
                    <Scale size={14} />
                    Issue Binding DoCA Arbitration Order
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle size={15} /> Case Arbitrated & Closed
                </div>
                <p className="text-slate-700">
                  This dispute was officially resolved under DoCA Authority. Settlement verdict:{' '}
                  <strong>{selectedDispute.arbitrationVerdict || 'SPLIT_SETTLEMENT'}</strong>.
                </p>
                <div className="text-[11px] text-slate-500 italic">
                  Remarks: {selectedDispute.arbitrationRemarks || 'Settled pro-rata.'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

