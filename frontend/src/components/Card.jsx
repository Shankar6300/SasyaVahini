import React from 'react';

export default function Card({ children, className = '', interactive = false, ...props }) {
  const classes = ['card', interactive ? 'card-interactive' : '', className].filter(Boolean).join(' ');
  return <div className={classes} {...props}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions }) {
  return (
    <div className="card-header">
      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function StatCard({ value, label, icon, trend, color = 'var(--color-primary)' }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-card-value" style={{ color }}>{value}</div>
          <div className="stat-card-label">{label}</div>
        </div>
        {icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-xl)',
            background: 'var(--color-primary-bg)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color,
          }}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
          {trend}
        </div>
      )}
    </div>
  );
}
