import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Leaf, LogOut, Menu, X, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import RoleBadge from './RoleBadge';
import LanguageSelector from './LanguageSelector';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const ROLE_NAV = {
    FARMER: [
      { label: t('nav.dashboard', 'Dashboard'), to: '/farmer' },
      { label: t('nav.marketIntelligence', 'Market Intelligence'), to: '/market-intelligence' },
      { label: t('farmer.myListings', 'My Listings'), to: '/farmer' },
    ],
    FPO: [
      { label: t('nav.dashboard', 'Dashboard'), to: '/fpo' },
      { label: t('nav.marketIntelligence', 'Market Intelligence'), to: '/market-intelligence' },
      { label: t('fpo.members', 'Members'), to: '/fpo' },
    ],
    BUYER: [
      { label: `📊 ${t('nav.buyerDashboard', 'Buyer Dashboard')}`, to: '/buyer' },
      { label: `🌾 ${t('nav.marketplace', 'Marketplace')}`, to: '/buyer/marketplace' },
      { label: `📈 ${t('nav.priceDiscovery', 'AI Price Intelligence')}`, to: '/market-intelligence' },
      { label: `🚚 ${t('nav.deliveries', 'Order Tracking')}`, to: '/buyer/tracking' },
    ],
    LOGISTICS: [
      { label: t('nav.dashboard', 'Operations Center'), to: '/logistics' },
      { label: 'Shipments Dispatch', to: '/logistics/shipments' },
      { label: 'Live Fleet Map', to: '/logistics/map' },
      { label: 'Milestone Control', to: '/logistics/milestones' },
    ],
    ADMIN: [
      { label: t('nav.dashboard', 'Admin Center'), to: '/admin' },
      { label: t('nav.marketIntelligence', 'Market Intelligence'), to: '/market-intelligence' },
      { label: t('nav.logistics', 'Fleet Operations'), to: '/logistics' },
    ],
  };

  const navItems = isAuthenticated && user?.role ? ROLE_NAV[user.role] ?? [] : [];

  return (
    <nav className="nav shadow-sm" role="navigation" aria-label="Main navigation">
      <div className="nav-inner">
        {/* Brand & Portal Indicator in Top Left */}
        <div className="flex items-center gap-2.5">
          <Link to="/" className="nav-brand" aria-label="SasyaVahini home">
            <Leaf size={28} color="#07875B" strokeWidth={2.5} />
            <span className="nav-brand-text">SasyaVahini</span>
          </Link>
          {isAuthenticated && user?.role === 'BUYER' && (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F0E8] text-[#245C43] border border-[#DDE5DC]">
              <ShoppingBag size={12} />
              Buyer Portal
            </span>
          )}
        </div>

        {/* Desktop nav links in Top Middle */}
        <ul className="nav-links" aria-label="Navigation links">
          {!isAuthenticated ? (
            <>
              <li>
                <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
                  {t('nav.home', 'Home')}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/buyer/login"
                  className={({ isActive }) =>
                    `nav-link font-semibold ${isActive ? ' active' : ''}`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? 'white' : '#245C43',
                    background: isActive ? '#245C43' : '#E8F0E8',
                    borderRadius: '8px',
                    padding: '6px 12px',
                  })}
                >
                  🛒 {t('nav.buyerPortal', 'Buyer Portal')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/login" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  🌾 {t('nav.farmerPortal', 'Farmer Portal')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/logistics/login" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  🚚 {t('nav.logisticsPortal', 'Logistics Portal')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/market-intelligence" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  📈 {t('nav.priceDiscovery', 'AI Mandi Rates')}
                </NavLink>
              </li>
            </>
          ) : (
            navItems.map((item) => (
              <li key={item.to + item.label}>
                <NavLink to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active font-bold text-[#245C43]' : ''}`} end>
                  {item.label}
                </NavLink>
              </li>
            ))
          )}
        </ul>

        {/* Actions in Top Right Corner */}
        <div className="nav-actions">
          {/* Multilingual Selector */}
          <LanguageSelector />

          {isAuthenticated ? (
            <>
              <RoleBadge role={user?.role} />
              {user?.role === 'BUYER' && (
                <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck size={12} /> Verified Buyer
                </span>
              )}
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                {user?.name || user?.email}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={logout} aria-label="Log out">
                <LogOut size={16} />
                <span className="hidden sm:inline">{t('nav.logout', 'Logout')}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <NavLink
                to="/buyer/login"
                className="btn btn-sm"
                style={{
                  background: '#245C43',
                  color: 'white',
                  fontWeight: 600,
                  boxShadow: '0 2px 6px rgba(36,92,67,0.25)',
                }}
              >
                🛒 {t('nav.buyerLogin', 'Buyer Login')}
              </NavLink>
              <NavLink to="/login" className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>
                🌾 {t('nav.farmerLogin', 'Farmer')}
              </NavLink>
              <NavLink to="/logistics/login" className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>
                🚚 {t('nav.logisticsLogin', 'Logistics')}
              </NavLink>
              <NavLink to="/register" className="btn btn-secondary btn-sm">{t('nav.register', 'Get Started')}</NavLink>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="btn btn-ghost btn-sm btn-icon md:hidden"
            id="mobile-menu-btn"
            aria-label="Toggle mobile menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
