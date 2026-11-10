import React from 'react';
import { useTranslation } from 'react-i18next';

const ROLE_CONFIG = {
  FARMER:    { key: 'roleFarmer',    defaultLabel: 'Farmer',    emoji: '🌾' },
  FPO:       { key: 'roleFPO',       defaultLabel: 'FPO',       emoji: '🤝' },
  BUYER:     { key: 'roleBuyer',     defaultLabel: 'Buyer',     emoji: '🏪' },
  LOGISTICS: { key: 'roleLogistics', defaultLabel: 'Logistics', emoji: '🚚' },
  ADMIN:     { key: 'roleAdmin',     defaultLabel: 'Admin',     emoji: '🛡️' },
};

export default function RoleBadge({ role }) {
  const { t } = useTranslation();
  if (!role) return null;
  const config = ROLE_CONFIG[role] ?? { key: role, defaultLabel: role, emoji: '👤' };
  const label = t('auth.' + config.key, config.defaultLabel);
  return (
    <span className={`badge badge-${role.toLowerCase()}`}>
      {config.emoji} {label}
    </span>
  );
}
