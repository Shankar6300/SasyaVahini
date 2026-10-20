import React from 'react';
import { Leaf, TrendingUp, ShoppingBag, Wallet, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/Card';

const PLANNED_FEATURES = [
  'Produce listing creation and management (Member 2)',
  'Inventory quantity updates and reservation view (Member 2)',
  'Allocation proposal inbox — accept or reject (Member 1/2)',
  'Earnings and payout history (Member 2)',
  'Order status tracking (Member 3)',
  'Hindi/Marathi localization (Member 2)',
];

export default function FarmerDashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-layout">
      <aside className="sidebar" aria-label="Farmer navigation">
        {[
          { icon: <Leaf size={18} />, label: 'Dashboard', href: '/farmer' },
          { icon: <ShoppingBag size={18} />, label: 'My Produce', href: '/farmer/produce' },
          { icon: <TrendingUp size={18} />, label: 'Market Prices', href: '/farmer/prices' },
          { icon: <Wallet size={18} />, label: 'Earnings', href: '/farmer/earnings' },
          { icon: <Clock size={18} />, label: 'Order History', href: '/farmer/orders' },
        ].map((item) => (
          <a key={item.label} href={item.href} className="sidebar-item">
            {item.icon}
            {item.label}
          </a>
        ))}
      </aside>

      <main className="main-content" aria-label="Farmer dashboard main">
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 className="heading-2">Welcome, {user?.name || 'Farmer'} 🌾</h1>
          <p className="body-base text-secondary" style={{ marginTop: 'var(--space-2)' }}>
            Your farm dashboard. Track your produce, orders and earnings.
          </p>
        </div>

        {/* Stat cards — placeholder data labeled as DEMO */}
        <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
          <StatCard value="—" label="Active Listings" icon={<ShoppingBag size={22} />} trend="DEMO DATA — not real" />
          <StatCard value="—" label="Pending Proposals" icon={<Clock size={22} />} trend="DEMO DATA — not real" />
          <StatCard value="₹—" label="Earnings this month" icon={<Wallet size={22} />} trend="DEMO DATA — not real" />
          <StatCard value="—" label="Completed Orders" icon={<TrendingUp size={22} />} trend="DEMO DATA — not real" />
        </div>

        {/* Planned features */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">🚧 Features in Development</h2>
              <p className="card-subtitle">These features will be implemented in the Member 2 feature branch.</p>
            </div>
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {PLANNED_FEATURES.map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <span style={{ color: 'var(--color-warning)' }}>⏳</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
