import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Leaf, LogOut, Menu, X, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RoleBadge from './RoleBadge';
import { useState } from 'react';

const ROLE_NAV = {
  FARMER:    [{ label: 'Dashboard', to: '/farmer' }, { label: 'My Produce', to: '/farmer/produce' }],
  FPO:       [{ label: 'Dashboard', to: '/fpo' },    { label: 'Members', to: '/fpo/members' }],
  BUYER:     [{ label: 'Dashboard', to: '/buyer' },  { label: 'Marketplace', to: '/buyer/marketplace' }],
  LOGISTICS: [{ label: 'Dashboard', to: '/logistics' }, { label: 'Deliveries', to: '/logistics/deliveries' }],
  ADMIN:     [{ label: 'Dashboard', to: '/admin' },  { label: 'Users', to: '/admin/users' }],
};

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = isAuthenticated && user?.role ? ROLE_NAV[user.role] ?? [] : [];

  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <div className="nav-inner">
        {/* Brand */}
        <Link to="/" className="nav-brand" aria-label="SasyaVahini home">
          <Leaf size={28} color="#07875B" strokeWidth={2.5} />
          <span className="nav-brand-text">SasyaVahini</span>
        </Link>

        {/* Desktop nav links */}
        <ul className="nav-links" aria-label="Navigation links">
          {!isAuthenticated ? (
            <>
              <li>
                <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/about" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  About
                </NavLink>
              </li>
              <li>
                <NavLink to="/buyer/login" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  Buyer Portal
                </NavLink>
              </li>
            </>
          ) : (
            navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
                  {item.label}
                </NavLink>
              </li>
            ))
          )}
        </ul>

        {/* Actions */}
        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <RoleBadge role={user?.role} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {user?.name || user?.email}
              </span>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                aria-label="Notifications"
                style={{ position: 'relative' }}
              >
                <Bell size={18} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={logout} aria-label="Log out">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/buyer/login" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                Buyer Login
              </NavLink>
              <NavLink to="/login" className="btn btn-ghost btn-sm">Sign In</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">Get Started</NavLink>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="btn btn-ghost btn-sm btn-icon"
            style={{ display: 'none' }}
            id="mobile-menu-btn"
            aria-label="Toggle mobile menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu (CSS shows at ≤768px) */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
          .nav-links { display: none; }
        }
      `}</style>
    </nav>
  );
}
