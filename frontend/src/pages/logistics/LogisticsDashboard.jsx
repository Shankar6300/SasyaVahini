import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LogisticsDashboard() {
  const { user } = useAuth();
  return (
    <div className="main-content">
      <h1 className="heading-2">Logistics Dashboard 🚚</h1>
      <p className="text-secondary mt-2">Welcome, {user?.name}.</p>
      <div className="card mt-8">
        <div className="card-header"><h2 className="card-title">🚧 Features in Development</h2></div>
        <p className="body-sm text-secondary">
          Vehicle management, OR-Tools CVRP route optimization, GPS tracking, driver interface
          and delivery proof (OTP/photo) are planned for the Member 4 feature branch.
        </p>
      </div>
    </div>
  );
}
