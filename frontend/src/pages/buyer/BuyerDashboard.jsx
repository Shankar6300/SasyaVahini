import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Search, ShoppingCart, ClipboardList, Truck,
  Heart, MapPin, FileText, Bell, Settings,
  Package, TrendingUp, Clock, Leaf,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RoleBadge from '@/components/RoleBadge';
import '@/styles/buyer-auth.css';

/* ── Sidebar navigation structure ───────────────────────────────────────── */
const SIDEBAR_SECTIONS = [
  {
    title: 'Overview',
    links: [
      { to: '/buyer', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    title: 'Marketplace',
    links: [
      { to: '/buyer/marketplace', icon: Search, label: 'Browse Produce', badge: 'Soon' },
      { to: '/buyer/cart', icon: ShoppingCart, label: 'Cart', badge: 'Soon' },
      { to: '/buyer/favorites', icon: Heart, label: 'Saved Items', badge: 'Soon' },
    ],
  },
  {
    title: 'Orders',
    links: [
      { to: '/buyer/orders', icon: ClipboardList, label: 'My Orders', badge: 'Soon' },
      { to: '/buyer/tracking', icon: Truck, label: 'Track Delivery', badge: 'Soon' },
      { to: '/buyer/invoices', icon: FileText, label: 'Invoices', badge: 'Soon' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/buyer/addresses', icon: MapPin, label: 'Addresses', badge: 'Soon' },
      { to: '/buyer/notifications', icon: Bell, label: 'Notifications', badge: 'Soon' },
      { to: '/buyer/settings', icon: Settings, label: 'Settings', badge: 'Soon' },
    ],
  },
];

/* ── Stat cards configuration ───────────────────────────────────────────── */
const STATS = [
  { label: 'Active Orders', value: '—', icon: Package, color: '#245C43', bg: '#E8F0E8' },
  { label: 'Total Spent', value: '—', icon: TrendingUp, color: '#C7A96B', bg: '#F5F0E4' },
  { label: 'Items Saved', value: '—', icon: Heart, color: '#B42318', bg: '#FEF3F2' },
  { label: 'Pending Delivery', value: '—', icon: Clock, color: '#2563EB', bg: '#EFF6FF' },
];

/* ── Quick actions ──────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Browse Produce', icon: Search, to: '/buyer/marketplace' },
  { label: 'View Orders', icon: ClipboardList, to: '/buyer/orders' },
  { label: 'Track Delivery', icon: Truck, to: '/buyer/tracking' },
  { label: 'Manage Addresses', icon: MapPin, to: '/buyer/addresses' },
];

export default function BuyerDashboard() {
  const { user } = useAuth();
  return (
    <div className="buyer-dashboard-layout">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="buyer-sidebar">
        <div className="buyer-sidebar-header">
          <p className="buyer-sidebar-greeting">Welcome back,</p>
          <p className="buyer-sidebar-name">{user?.name || 'Buyer'}</p>
          <div className="buyer-sidebar-role">
            <RoleBadge role="BUYER" />
          </div>
        </div>

        <nav className="buyer-sidebar-nav">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.title} className="buyer-sidebar-section">
              <p className="buyer-sidebar-section-title">{section.title}</p>
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `buyer-sidebar-link${isActive ? ' active' : ''}`
                    }
                  >
                    <Icon size={18} className="buyer-sidebar-link-icon" />
                    {link.label}
                    {link.badge && (
                      <span className="buyer-feature-badge">{link.badge}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="buyer-main-content">
        <div className="buyer-page-header">
          <h1 className="buyer-page-title">Dashboard</h1>
          <p className="buyer-page-desc">
            Your marketplace overview and quick actions
          </p>
        </div>

        {/* Stats */}
        <div className="buyer-stats-grid">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="buyer-stat-card">
                <div className="buyer-stat-card-header">
                  <p className="buyer-stat-card-label">{stat.label}</p>
                  <div
                    className="buyer-stat-card-icon"
                    style={{ background: stat.bg, color: stat.color }}
                  >
                    <Icon size={18} />
                  </div>
                </div>
                <p className="buyer-stat-card-value">{stat.value}</p>
                <p className="buyer-stat-card-change">No data yet</p>
              </div>
            );
          })}
        </div>

        {/* Content Grid */}
        <div className="buyer-content-grid">
          {/* Quick Actions */}
          <div className="buyer-content-card">
            <div className="buyer-content-card-header">
              <h3 className="buyer-content-card-title">Quick Actions</h3>
            </div>
            <div className="buyer-content-card-body">
              <div className="buyer-quick-actions">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <NavLink
                      key={action.to}
                      to={action.to}
                      className="buyer-quick-action"
                    >
                      <span className="buyer-quick-action-icon">
                        <Icon size={16} />
                      </span>
                      <span className="buyer-quick-action-text">{action.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="buyer-content-card">
            <div className="buyer-content-card-header">
              <h3 className="buyer-content-card-title">Recent Orders</h3>
              <span className="buyer-feature-badge">Coming Soon</span>
            </div>
            <div className="buyer-content-card-body">
              <div className="buyer-empty-state">
                <div className="buyer-empty-state-icon">
                  <ClipboardList size={40} />
                </div>
                <p>Your order history will appear here once you start purchasing produce.</p>
              </div>
            </div>
          </div>

          {/* Featured Produce */}
          <div className="buyer-content-card">
            <div className="buyer-content-card-header">
              <h3 className="buyer-content-card-title">Featured Produce</h3>
              <span className="buyer-feature-badge">Coming Soon</span>
            </div>
            <div className="buyer-content-card-body">
              <div className="buyer-empty-state">
                <div className="buyer-empty-state-icon">
                  <Leaf size={40} />
                </div>
                <p>Seasonal produce recommendations from verified farmers and FPOs will show here.</p>
              </div>
            </div>
          </div>

          {/* Delivery Tracking */}
          <div className="buyer-content-card">
            <div className="buyer-content-card-header">
              <h3 className="buyer-content-card-title">Delivery Updates</h3>
              <span className="buyer-feature-badge">Coming Soon</span>
            </div>
            <div className="buyer-content-card-body">
              <div className="buyer-empty-state">
                <div className="buyer-empty-state-icon">
                  <Truck size={40} />
                </div>
                <p>Real-time delivery tracking and status updates will appear here.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
