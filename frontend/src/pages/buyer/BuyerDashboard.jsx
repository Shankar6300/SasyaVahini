import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function BuyerDashboard() {
  const { user } = useAuth();
  return (
    <div className="main-content">
      <h1 className="heading-2">Buyer Dashboard 🏪</h1>
      <p className="text-secondary mt-2">Welcome, {user?.name}.</p>
      <div className="card mt-8">
        <div className="card-header"><h2 className="card-title">🚧 Features in Development</h2></div>
        <p className="body-sm text-secondary">
          Marketplace search, requirement posting, order tracking, invoices, payment integration
          and notification adapters are planned for the Member 3 feature branch.
        </p>
      </div>
    </div>
  );
}
