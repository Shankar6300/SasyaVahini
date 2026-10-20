import React from 'react';

const ROLE_LABELS = {
  FARMER:    { label: 'Farmer',    emoji: '🌾' },
  FPO:       { label: 'FPO',       emoji: '🤝' },
  BUYER:     { label: 'Buyer',     emoji: '🏪' },
  LOGISTICS: { label: 'Logistics', emoji: '🚚' },
  ADMIN:     { label: 'Admin',     emoji: '🛡️' },
};

export default function RoleBadge({ role }) {
  if (!role) return null;
  const config = ROLE_LABELS[role] ?? { label: role, emoji: '👤' };
  return (
    <span className={`badge badge-${role.toLowerCase()}`}>
      {config.emoji} {config.label}
    </span>
  );
}
