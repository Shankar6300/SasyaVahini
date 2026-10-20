import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  return (
    <div className="main-content">
      <h1 className="heading-2">Admin Dashboard 🛡️</h1>
      <p className="text-secondary mt-2">Welcome, {user?.name}. DoCA Officer view.</p>
      <div className="card mt-8">
        <div className="card-header"><h2 className="card-title">🚧 Features in Development</h2></div>
        <p className="body-sm text-secondary">
          User verification, vehicle approval, dispute management, analytics dashboards
          and platform metrics are planned for the Member 1 (API) + Member 2 (UI) feature branches.
        </p>
      </div>
    </div>
  );
}
