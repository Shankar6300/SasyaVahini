import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Leaf, LogOut, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import RoleBadge from './RoleBadge';
import LanguageSelector from './LanguageSelector';
import { useState } from 'react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const ROLE_NAV = {
    FARMER:    [{ label: t('nav.dashboard', 'Dashboard'), to: '/farmer' }, { label: t('farmer.myListings', 'My Produce'), to: '/farmer' }],
    FPO:       [{ label: t('nav.dashboard', 'Dashboard'), to: '/fpo' },    { label: t('fpo.members', 'Members'), to: '/fpo' }],
    BUYER:     [{ label: t('nav.dashboard', 'Dashboard'), to: '/buyer' },  { label: 'Marketplace', to: '/buyer' }],
    LOGISTICS: [{ label: t('nav.dashboard', 'Dashboard'), to: '/logistics' }, { label: 'Deliveries', to: '/logistics' }],
    ADMIN:     [{ label: t('nav.dashboard', 'Dashboard'), to: '/admin' },  { label: 'Users', to: '/admin' }],
  };

  const navItems = isAuthenticated && user?.role ? ROLE_NAV[user.role] ?? [] : [];

  return (
    <nav className="nav shadow-sm" role="navigation" aria-label="Main navigation">
      <div className="nav-inner">
        {/* Brand */}
        <Link to="/" className="nav-brand" aria-label="SasyaVahini home">
          <Leaf size={28} color="#07875B" strokeWidth={2.5} />
          <span className="nav-brand-text">SasyaVahini</span>
        </Link>

        {/* Desktop nav links */}
        <ul className="nav-links" aria-label="Navigation links">
          {!isAuthenticated && (
            <>
              <li><NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>{t('nav.home', 'Home')}</NavLink></li>
              <li><NavLink to="/about" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>{t('nav.about', 'About')}</NavLink></li>
            </>
          )}
          {navItems.map((item) => (
            <li key={item.to + item.label}>
              <NavLink to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="nav-actions">
          {/* Multilingual Selector */}
          <LanguageSelector />

          {isAuthenticated ? (
            <>
              <RoleBadge role={user?.role} />
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                {user?.name || user?.email}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={logout} aria-label="Log out">
                <LogOut size={16} />
                <span className="hidden sm:inline">{t('nav.logout', 'Logout')}</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn-ghost btn-sm">{t('nav.login', 'Sign In')}</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">{t('nav.register', 'Get Started')}</NavLink>
            </>
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
