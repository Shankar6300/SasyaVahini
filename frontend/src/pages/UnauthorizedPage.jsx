import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const dashboardMap = { FARMER: '/farmer', FPO: '/fpo', BUYER: '/buyer', LOGISTICS: '/logistics', ADMIN: '/admin' };
  const home = user?.role ? dashboardMap[user.role] : '/';

  return (
    <div className="empty-state" style={{ minHeight: '60vh' }}>
      <div className="empty-state-icon" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', width: 80, height: 80 }}>
        <ShieldOff size={36} />
      </div>
      <h1 className="heading-2">Access Denied</h1>
      <p className="body-lg text-secondary" style={{ maxWidth: 400, textAlign: 'center' }}>
        You don&apos;t have permission to view this page. This resource requires a different role.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <Link to={home} className="btn btn-primary">Go to My Dashboard</Link>
        <Link to="/" className="btn btn-ghost">Home</Link>
      </div>
    </div>
  );
}
