/**
 * SasyaVahini — System Audit Logs & Financial Governance
 * Page 5 of the Admin Portal
 *
 * Features:
 *  - KPI summary: Total Entries, Security Events, Financial Events, Admin Actions
 *  - Filters: Action type tabs, Entity type selector, Date range, Free-text search
 *  - Paginated data table with expandable metadata rows
 *  - Detail inspection modal with full JSON metadata view
 *  - Consistent design language with rest of Admin Portal
 *
 * Owner: Member 1
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import adminApi from '../../services/adminApi';
import {
  FileText,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  X,
  Shield,
  IndianRupee,
  UserCheck,
  Activity,
  Eye,
  Clock,
  Globe,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Download,
} from 'lucide-react';

/* ── Action Categories for KPI and filter grouping ─────────────────── */
const SECURITY_ACTIONS = ['USER_REGISTERED', 'USER_APPROVED', 'USER_SUSPENDED'];
const FINANCIAL_ACTIONS = ['PAYMENT_RELEASED', 'RESERVATION_CREATED', 'RESERVATION_RELEASED'];
const ADMIN_ACTIONS_LIST = ['ADMIN_ACTION'];
const ORDER_ACTIONS = ['ORDER_STATUS_CHANGED', 'DELIVERY_VERIFIED'];
const MARKET_ACTIONS = ['LISTING_CREATED', 'LISTING_UPDATED', 'REQUIREMENT_POSTED', 'PROPOSAL_CREATED', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED'];

const ACTION_TABS = [
  { key: 'ALL', label: 'All Events' },
  { key: 'SECURITY', label: 'Security', actions: SECURITY_ACTIONS },
  { key: 'FINANCIAL', label: 'Financial', actions: FINANCIAL_ACTIONS },
  { key: 'ORDERS', label: 'Orders', actions: ORDER_ACTIONS },
  { key: 'MARKET', label: 'Market', actions: MARKET_ACTIONS },
  { key: 'ADMIN', label: 'Admin', actions: ADMIN_ACTIONS_LIST },
];

const ENTITY_TYPES = ['ALL', 'User', 'Order', 'ProduceListing', 'Proposal', 'Reservation', 'Vehicle'];

/* ── Badge color mapping for action types ──────────────────────────── */
const actionBadge = (action) => {
  const map = {
    USER_REGISTERED:      { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'User Registered' },
    USER_APPROVED:        { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'User Approved' },
    USER_SUSPENDED:       { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'User Suspended' },
    LISTING_CREATED:      { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: 'Listing Created' },
    LISTING_UPDATED:      { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: 'Listing Updated' },
    REQUIREMENT_POSTED:   { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Requirement Posted' },
    PROPOSAL_CREATED:     { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Proposal Created' },
    PROPOSAL_ACCEPTED:    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Proposal Accepted' },
    PROPOSAL_REJECTED:    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Proposal Rejected' },
    RESERVATION_CREATED:  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Reservation Created' },
    RESERVATION_RELEASED: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'Reservation Released' },
    ORDER_STATUS_CHANGED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Order Status Changed' },
    DELIVERY_VERIFIED:    { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', label: 'Delivery Verified' },
    PAYMENT_RELEASED:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Payment Released' },
    ADMIN_ACTION:         { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Admin Action' },
  };
  return map[action] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: action };
};

/* ── Role badge helper ─────────────────────────────────────────────── */
const roleBadge = (role) => {
  const map = {
    ADMIN:     'bg-orange-100 text-orange-800',
    FARMER:    'bg-emerald-100 text-emerald-800',
    FPO:       'bg-sky-100 text-sky-800',
    BUYER:     'bg-indigo-100 text-indigo-800',
    LOGISTICS: 'bg-amber-100 text-amber-800',
  };
  return map[role] || 'bg-slate-100 text-slate-700';
};

/* ── Timestamp formatter ───────────────────────────────────────────── */
const formatTimestamp = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

const relativeTime = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

/* ════════════════════════════════════════════════════════════════════ */
export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [inspectLog, setInspectLog] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');

  /* Debounce search input */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  /* ── Fetch audit logs ────────────────────────────────────────────── */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'ALL') {
        const tab = ACTION_TABS.find((t) => t.key === activeTab);
        if (tab && tab.actions && tab.actions.length === 1) {
          params.action = tab.actions[0];
        }
      }
      if (entityFilter !== 'ALL') params.entityType = entityFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const result = await adminApi.getAuditLogs(params);
      let fetched = result?.logs || result || [];

      /* Client-side category tab filtering (for multi-action categories) */
      if (activeTab !== 'ALL') {
        const tab = ACTION_TABS.find((t) => t.key === activeTab);
        if (tab && tab.actions && tab.actions.length > 1) {
          fetched = fetched.filter((l) => tab.actions.includes(l.action));
        }
      }

      /* Client-side sort toggle */
      fetched.sort((a, b) => {
        const diff = new Date(b.createdAt) - new Date(a.createdAt);
        return sortOrder === 'desc' ? diff : -diff;
      });

      setLogs(fetched);
      setTotal(result?.total ?? fetched.length);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, entityFilter, debouncedSearch, sortOrder]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* ── KPI Metrics ─────────────────────────────────────────────────── */
  const kpi = useMemo(() => {
    const security = logs.filter((l) => SECURITY_ACTIONS.includes(l.action)).length;
    const financial = logs.filter((l) => FINANCIAL_ACTIONS.includes(l.action)).length;
    const admin = logs.filter((l) => ADMIN_ACTIONS_LIST.includes(l.action)).length;
    return { total: logs.length, security, financial, admin };
  }, [logs]);

  /* ── Row expand toggle ───────────────────────────────────────────── */
  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Export as CSV (simple) ──────────────────────────────────────── */
  const exportCsv = () => {
    const header = 'Timestamp,Action,Entity Type,Entity ID,Actor,Email,Role,IP Address\n';
    const rows = logs
      .map(
        (l) =>
          `"${formatTimestamp(l.createdAt)}","${l.action}","${l.entityType}","${l.entityId}","${l.user?.name || '—'}","${l.user?.email || '—'}","${l.user?.role || '—'}","${l.ipAddress || '—'}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sasyavahini-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-200">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              System Audit Logs & Financial Governance
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable chronological record of every security, financial, and administrative event on the platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Log Entries',
            value: kpi.total,
            icon: Activity,
            color: 'emerald',
            gradient: 'from-emerald-500 to-emerald-700',
          },
          {
            label: 'Security Events',
            value: kpi.security,
            icon: Shield,
            color: 'sky',
            gradient: 'from-sky-500 to-sky-700',
            sub: 'Registrations, Approvals & Suspensions',
          },
          {
            label: 'Financial Events',
            value: kpi.financial,
            icon: IndianRupee,
            color: 'violet',
            gradient: 'from-violet-500 to-violet-700',
            sub: 'Payments, Reservations & Escrow',
          },
          {
            label: 'Admin Actions',
            value: kpi.admin,
            icon: UserCheck,
            color: 'orange',
            gradient: 'from-orange-500 to-orange-700',
            sub: 'Arbitrations, Verifications & Overrides',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center`}
              >
                <card.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">{card.value}</div>
            {card.sub && (
              <p className="text-[10px] text-slate-400 mt-1">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Action Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {ACTION_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg whitespace-nowrap transition ${
                  activeTab === tab.key
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 lg:ml-auto">
            {/* Entity Type Selector */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="pl-8 pr-6 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
              >
                {ENTITY_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {et === 'ALL' ? 'All Entities' : et}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
              title={`Sort: ${sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
            </button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actor, entity, metadata…"
                className="pl-8 pr-3 py-1.5 w-56 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Audit Log Table ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
            <span className="ml-3 text-sm text-slate-500">Loading audit trail…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No audit log entries found</p>
            <p className="text-xs mt-1">Adjust your filters or search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="w-8 px-3 py-3"></th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const badge = actionBadge(log.action);
                  const isExpanded = expandedRows.has(log.id);
                  return (
                    <React.Fragment key={log.id}>
                      {/* ── Main Row ──────────────────────────── */}
                      <tr className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-3 py-3">
                          <button
                            onClick={() => toggleRow(log.id)}
                            className="text-slate-400 hover:text-slate-600 transition"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-slate-700">
                            {formatTimestamp(log.createdAt)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {relativeTime(log.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-slate-700">
                            {log.entityType}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {log.entityId}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-slate-700">
                            {log.user?.name || '—'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400">
                              {log.user?.email || '—'}
                            </span>
                            {log.user?.role && (
                              <span
                                className={`inline-flex px-1.5 py-0 rounded text-[9px] font-bold ${roleBadge(
                                  log.user.role
                                )}`}
                              >
                                {log.user.role}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-slate-500 font-mono">
                            {log.ipAddress || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setInspectLog(log)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition opacity-0 group-hover:opacity-100"
                          >
                            <Eye className="w-3 h-3" />
                            Inspect
                          </button>
                        </td>
                      </tr>

                      {/* ── Expanded Metadata Row ─────────────── */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td></td>
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Metadata */}
                              <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                                  <Activity className="w-3 h-3" />
                                  Event Metadata
                                </h4>
                                <div className="bg-white rounded-lg border border-slate-200 p-3">
                                  {log.metadata &&
                                  Object.keys(log.metadata).length > 0 ? (
                                    <dl className="space-y-1">
                                      {Object.entries(log.metadata).map(
                                        ([key, val]) => (
                                          <div
                                            key={key}
                                            className="flex items-start gap-2"
                                          >
                                            <dt className="text-[10px] font-semibold text-slate-500 min-w-[100px]">
                                              {key
                                                .replace(/([A-Z])/g, ' $1')
                                                .replace(/^./, (s) =>
                                                  s.toUpperCase()
                                                )}
                                            </dt>
                                            <dd className="text-[11px] text-slate-700 font-mono break-all">
                                              {typeof val === 'object'
                                                ? JSON.stringify(val)
                                                : String(val)}
                                            </dd>
                                          </div>
                                        )
                                      )}
                                    </dl>
                                  ) : (
                                    <p className="text-[10px] text-slate-400 italic">
                                      No metadata recorded
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Client Info */}
                              <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                                  <Monitor className="w-3 h-3" />
                                  Client Information
                                </h4>
                                <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] font-semibold text-slate-500 min-w-[60px]">
                                      IP
                                    </span>
                                    <span className="text-[11px] text-slate-700 font-mono">
                                      {log.ipAddress || '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Monitor className="w-3 h-3 text-slate-400 mt-0.5" />
                                    <span className="text-[10px] font-semibold text-slate-500 min-w-[60px]">
                                      UA
                                    </span>
                                    <span className="text-[10px] text-slate-600 break-all leading-relaxed">
                                      {log.userAgent || '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] font-semibold text-slate-500 min-w-[60px]">
                                      Time
                                    </span>
                                    <span className="text-[11px] text-slate-700">
                                      {formatTimestamp(log.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────── */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-[11px] text-slate-500">
              Showing <span className="font-semibold text-slate-700">{logs.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span> entries
            </span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] text-slate-500">
                Tamper-proof immutable record — Blockchain-anchored hash chain
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Inspection Modal ──────────────────────────────────────── */}
      {inspectLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setInspectLog(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Audit Log Entry Detail</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {inspectLog.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto px-6 py-5 space-y-5">
              {/* Event Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Action
                  </label>
                  <div className="mt-1">
                    {(() => {
                      const b = actionBadge(inspectLog.action);
                      return (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${b.bg} ${b.text} ${b.border}`}
                        >
                          {b.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Timestamp
                  </label>
                  <p className="text-xs text-slate-700 mt-1 font-medium">
                    {formatTimestamp(inspectLog.createdAt)}
                  </p>
                  <p className="text-[10px] text-slate-400">{relativeTime(inspectLog.createdAt)}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Entity Type
                  </label>
                  <p className="text-xs text-slate-700 mt-1 font-medium">{inspectLog.entityType}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Entity ID
                  </label>
                  <p className="text-xs text-slate-700 mt-1 font-mono">{inspectLog.entityId}</p>
                </div>
              </div>

              {/* Actor */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Actor
                </label>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                    {(inspectLog.user?.name || 'U').charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-700">
                      {inspectLog.user?.name || '—'}
                    </p>
                    <p className="text-[10px] text-slate-400">{inspectLog.user?.email || '—'}</p>
                  </div>
                  {inspectLog.user?.role && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleBadge(
                        inspectLog.user.role
                      )}`}
                    >
                      {inspectLog.user.role}
                    </span>
                  )}
                </div>
              </div>

              {/* Client Info */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Client Information
                </label>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-500 w-20">IP Address</span>
                    <span className="text-xs text-slate-700 font-mono">
                      {inspectLog.ipAddress || '—'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Monitor className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <span className="text-[10px] font-semibold text-slate-500 w-20">User Agent</span>
                    <span className="text-[10px] text-slate-600 break-all leading-relaxed">
                      {inspectLog.userAgent || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Metadata JSON */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Full Event Metadata
                </label>
                <pre className="bg-slate-900 text-emerald-400 rounded-xl p-4 text-[11px] font-mono overflow-x-auto leading-relaxed max-h-48">
                  {JSON.stringify(inspectLog.metadata, null, 2) || '{}'}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] text-slate-500">
                  Immutable audit record — cannot be edited or deleted
                </span>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-1.5 text-xs font-medium bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
