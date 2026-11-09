import React from 'react';
import BrandPanel from './BrandPanel';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="buyer-auth-page">
      <div className="buyer-auth-layout">
        <BrandPanel />
        <div className="buyer-auth-right">
          <div className="buyer-form-container buyer-animate-in">
            <div className="buyer-form-header">
              {title && <h2 className="buyer-form-title">{title}</h2>}
              {subtitle && <p className="buyer-form-subtitle">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
