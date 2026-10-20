import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={18} />,
  error:   <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info:    <Info size={18} />,
};

export default function Alert({ variant = 'info', title, children, className = '' }) {
  return (
    <div className={`alert alert-${variant} ${className}`} role="alert">
      <span style={{ flexShrink: 0, marginTop: 1 }}>{ICONS[variant]}</span>
      <div>
        {title && <strong style={{ display: 'block', marginBottom: 4 }}>{title}</strong>}
        {children}
      </div>
    </div>
  );
}
