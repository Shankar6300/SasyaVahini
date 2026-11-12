import React from 'react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';

export default function LogisticsPageMobileHeader({ activeLabel }) {
  const { user } = useAuth();

  return (
    <div className="logistics-page-mobile-header" aria-label="Logistics section navigation">
      <strong className="logistics-page-active-label">{activeLabel}</strong>
      <div className="logistics-user-identity">
        <strong>{user?.name || 'Logistics Partner'}</strong>
        <span>{user?.email || ''}</span>
      </div>
      <NotificationBell />
    </div>
  );
}
