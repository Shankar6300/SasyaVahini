import React, { useEffect, useRef } from 'react';
import { CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function LogisticsSubnav({ activePage }) {
  const navigate = useNavigate();
  const linksRef = useRef(null);

  useEffect(() => {
    const activeLink = linksRef.current?.querySelector('[data-active="true"]');
    if (activeLink && linksRef.current) {
      linksRef.current.scrollTo({
        left: Math.max(0, activeLink.offsetLeft),
        behavior: 'smooth',
      });
    }
  }, [activePage]);

  const isActive = (page) => page === activePage;
  const className = (page, compact = false) => `logistics-subnav-item${isActive(page) ? ' active' : ''}${compact ? ' compact' : ''}`;

  return (
    <div className="logistics-page-subnav">
      <div ref={linksRef} className="logistics-page-subnav-links">
        <button type="button" className={className('operations')} data-active={isActive('operations')} onClick={() => navigate('/logistics')}>
          Overview & Fleet Operations
        </button>
        <button type="button" className={className('payments')} data-active={isActive('payments')} onClick={() => navigate('/logistics/payments')}>
          <CreditCard size={13} /> Payments & Earnings
        </button>
        <Link to="/logistics/map" className={className('map')} data-active={isActive('map')}>
          Live Route Tracking
        </Link>
      </div>
    </div>
  );
}
