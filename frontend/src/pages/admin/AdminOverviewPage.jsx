import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ShoppingBag,
  Truck,
  Scale,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Package,
  CheckCircle,
  Clock,
  Database,
  Lock,
  Layers,
  FileText,
} from 'lucide-react';
import adminApi from '../../services/adminApi';
import Alert from '../../components/Alert';
import { PageSpinner } from '../../components/Spinner';

export default function AdminOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
      setError('Unable to fetch live administrative metrics. Showing fallback telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading && !data) {
    return <PageSpinner message="Compiling national platform metrics..." />;
  }

  const stats = data?.stats || {};
  const userStats = stats.users || {};
  const inventoryStats = stats.inventory || {};
  const orderStats = stats.orders || {};
  const logisticsStats = stats.logistics || {};
  const governanceStats = stats.governance || {};

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">CONFIRMED</span>;
      case 'IN_TRANSIT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">IN TRANSIT</span>;
      case 'DELIVERED':
      case 'SETTLED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">{status}</span>;
      case 'DISPUTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">DISPUTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{status || 'PLACED'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
              <ShieldCheck size={24} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">National Platform Overview & Governance</h1>
              <p className="text-xs text-slate-500">
                Department of Consumer Affairs (DoCA) • Real-time platform liquidity, audit logs & statutory arbitration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOverview}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="warning" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ─── Actionable Alerts Strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {userStats.pendingKyc > 0 && (
          <Link
            to="/admin/users"
            className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-200 text-amber-900">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900">Pending User KYC ({userStats.pendingKyc})</div>
                <div className="text-[11px] text-amber-700">Awaiting identity & document verification</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-amber-800 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        {logisticsStats.pendingVehicles > 0 && (
          <Link
            to="/admin/fleet"
            className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100/70 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-200 text-sky-900">
                <Truck size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-sky-900">Fleet Queue ({logisticsStats.pendingVehicles})</div>
                <div className="text-[11px] text-sky-700">Commercial vehicles awaiting RC & fitness audit</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-sky-800 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        <Link
          to="/admin/disputes"
          className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-200 text-rose-900">
              <Scale size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-900">
                Active Disputes ({governanceStats.openDisputes || 0})
              </div>
              <div className="text-[11px] text-rose-700">Escrow held pending official arbitration</div>
            </div>
          </div>
          <ArrowRight size={14} className="text-rose-800 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* ─── 4 Primary Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Registered Entities</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Users size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{userStats.total || 0}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across all 5 system roles</div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1 text-[10px]">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
              Farmers: {userStats.byRole?.FARMER || 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
              FPOs: {userStats.byRole?.FPO || 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
              Buyers: {userStats.byRole?.BUYER || 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
              Fleet: {userStats.byRole?.LOGISTICS || 0}
            </span>
          </div>
        </div>

        {/* Card 2: Market Inventory */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Live Produce Liquidity</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <Package size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {((inventoryStats.totalQuantityKg || 0) / 1000).toFixed(1)} MT
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {inventoryStats.totalListings || 0} verified harvest lots listed
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Direct Farmer & FPO supply</span>
            <span className="font-semibold text-emerald-700">Active</span>
          </div>
        </div>

        {/* Card 3: Orders & GMV */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Gross Platform GMV</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(orderStats.gmvTotal || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {orderStats.total || 0} contracts executed
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <Lock size={11} className="text-emerald-600" /> Two-Phase Escrow
            </span>
            <span className="font-semibold text-blue-700">Protected</span>
          </div>
        </div>

        {/* Card 4: Fleet & Transit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Logistics & Dispatches</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <Truck size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{logisticsStats.activeShipments || 0}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Shipments in active multi-stop transit
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Registered Fleet:</span>
            <span className="font-semibold text-indigo-700">{logisticsStats.totalVehicles || 0} Trucks</span>
          </div>
        </div>
      </div>

      {/* ─── Platform Architecture & Governance Nodes ──────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Database size={14} className="text-slate-400" /> Platform Infrastructure & Statutory Guardrails
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-slate-800">PostgreSQL Core</div>
              <div className="text-[10px] text-slate-500">Prisma ORM Connected</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-slate-800">Escrow Contract Lock</div>
              <div className="text-[10px] text-slate-500">Atomic 2-Phase Settlement</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-slate-800">Agmarknet AI Engine</div>
              <div className="text-[10px] text-slate-500">Guarded Mandi Forecast</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-slate-800">CVRP Routing Engine</div>
              <div className="text-[10px] text-slate-500">Multi-Stop Dispatch Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Dual Grid: Recent Orders & System Audit Log Feed ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Commercial Orders */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Procurement Contracts</h3>
                <p className="text-[11px] text-slate-500">Latest executed transactions across buyers & FPOs</p>
              </div>
              <Link to="/admin/disputes" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                View All <ArrowRight size={12} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {(data?.recentOrders || []).map((ord) => (
                <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{ord.orderNumber}</div>
                    <div className="text-[11px] text-slate-500">
                      Buyer: {ord.buyer?.user?.name || 'Commercial Buyer'} • {ord.totalQuantityKg} kg
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{formatCurrency(ord.agreedPriceTotal)}</div>
                    <div className="mt-0.5">{getOrderStatusBadge(ord.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Security & Administrative Audit Trail */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Platform Security & Audit Trail</h3>
                <p className="text-[11px] text-slate-500">Immutable ledger of administrative and financial actions</p>
              </div>
              <Link to="/admin/audit-logs" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                View Ledger <ArrowRight size={12} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {(data?.recentAuditLogs || []).map((log) => (
                <div key={log.id} className="py-2.5 flex items-start gap-2.5 text-xs">
                  <div className="p-1 rounded bg-slate-100 text-slate-600 mt-0.5">
                    <FileText size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {log.entityType} ({log.entityId || 'Platform'}) • By: {log.user?.name || log.user?.email || 'System'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

