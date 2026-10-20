import React from 'react';

export default function Spinner({ size = 24, label = 'Loading...' }) {
  return (
    <div role="status" aria-label={label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: size,
          height: size,
          border: `${Math.max(2, size / 8)}px solid var(--color-primary-muted)`,
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageSpinner({ message = 'Loading...' }) {
  return (
    <div className="spinner-page" style={{ flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Spinner size={40} label={message} />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{message}</p>
    </div>
  );
}
