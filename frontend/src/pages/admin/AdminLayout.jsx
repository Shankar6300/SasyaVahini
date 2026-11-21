import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  Scale,
  FileText,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
  Shield,
  Activity,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RoleBadge from '../../components/RoleBadge';

const ADMIN_NAVIGATION = [
  {
    name: 'Overview Dashboard',
    path: '/admin',
    end: true,
    icon: LayoutDashboard,
    description: 'System health, KPIs & metrics',
  },
  {
    name: 'User & KYC Governance',
    path: '/admin/users',
    icon: Users,
    description: 'Farmer, FPO, Buyer & Transporter verification',
  },
  {
    name: 'Commercial Fleet & Drivers',
    path: '/admin/fleet',
    icon: Truck,
    description: 'DoCA RTO, insurance & permit queue',
  },
  {
    name: 'Dispute Arbitration',
    path: '/admin/disputes',
    icon: Scale,
    description: 'Quality, weight discrepancy & escrow settlement',
  },
  {
    name: 'Audit Trail & Compliance',
    path: '/admin/audit-logs',
    icon: FileText,
    description: 'Security, financial & role audit logs',
  },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const getPageTitle = () => {
    const current = ADMIN_NAVIGATION.find((item) =>
      item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
    );
    return current?.name || 'Platform Governance';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* ─── Mobile Header ─────────────────────────────────────────────────── */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold">
            <Shield size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">DoCA Admin Center</div>
            <div className="text-[10px] text-slate-500 font-medium">Platform Administration</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
          aria-label="Toggle admin menu"
        >
          {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ─── Sidebar Navigation ────────────────────────────────────────────── */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-slate-200 flex flex-col justify-between z-30 transition-transform duration-200 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 flex flex-col h-full">
          {/* Brand & Department Badge */}
          <div className="pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-sm">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Admin & Governance</h1>
                <p className="text-[11px] text-slate-500 font-medium">Department of Consumer Affairs</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Platform Status: Operational
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Management Modules
            </div>
            {ADMIN_NAVIGATION.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon size={18} className="mt-0.5 shrink-0" />
                  <div className="leading-tight">
                    <div>{item.name}</div>
                    <div
                      className={`text-[10px] font-normal mt-0.5 ${
                        location.pathname === item.path || (!item.end && location.pathname.startsWith(item.path))
                          ? 'text-emerald-100'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom Admin User Pill */}
          <div className="pt-4 border-t border-slate-100 mt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Lock size={11} className="text-slate-400" /> Authenticated Role
                </span>
                <RoleBadge role={user?.role || 'ADMIN'} />
              </div>
              <div className="font-bold text-slate-800 truncate">{user?.name || 'DoCA Transport Officer'}</div>
              <div className="text-[11px] text-slate-500 font-mono truncate">{user?.email || 'admin@demo.sasyavahini.in'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ─── Main Content Canvas ───────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar Context Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 hidden md:flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Portal</span>
            <span className="text-xs font-bold text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-800">{getPageTitle()}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              <Activity size={13} className="text-emerald-600" />
              <span>National Node: Mumbai-DC1</span>
            </div>
          </div>
        </header>

        {/* Child Page Render Area */}
        <div className="p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

