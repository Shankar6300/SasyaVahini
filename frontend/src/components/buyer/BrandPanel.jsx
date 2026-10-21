import React from 'react';
import { Leaf, ShieldCheck, TrendingUp, Truck, Users } from 'lucide-react';

export default function BrandPanel() {
  return (
    <div className="buyer-auth-left">
      <div className="buyer-brand-decoration" />
      <div className="buyer-brand-content">
        <div className="buyer-brand-logo">
          <div className="buyer-brand-logo-icon">
            <Leaf size={22} />
          </div>
          <span className="buyer-brand-logo-text">SasyaVahini</span>
        </div>
        
        <h1 className="buyer-brand-heading">
          Fresh produce.<br />Fair connections.
        </h1>
        
        <p className="buyer-brand-tagline">
          Discover agricultural produce directly from farmers and FPOs, with transparent pricing and convenient delivery.
        </p>
        
        <ul className="buyer-brand-features">
          <li className="buyer-brand-feature">
            <span className="buyer-brand-feature-icon"><ShieldCheck size={18} /></span>
            <span>Verified farmers and FPOs with quality-graded produce</span>
          </li>
          <li className="buyer-brand-feature">
            <span className="buyer-brand-feature-icon"><TrendingUp size={18} /></span>
            <span>Transparent, fair pricing without unnecessary intermediaries</span>
          </li>
          <li className="buyer-brand-feature">
            <span className="buyer-brand-feature-icon"><Truck size={18} /></span>
            <span>Route-optimized delivery with real-time tracking</span>
          </li>
          <li className="buyer-brand-feature">
            <span className="buyer-brand-feature-icon"><Users size={18} /></span>
            <span>Direct connections to Farmer Producer Organizations</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
