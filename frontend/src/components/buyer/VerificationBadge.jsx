import React from 'react';
import { ShieldCheck, Clock, AlertTriangle, XCircle, Shield } from 'lucide-react';

const STATUS_CONFIG = {
  VERIFIED: {
    label: 'Verified Business',
    icon: ShieldCheck,
    bg: '#EBFDF2',
    color: '#027A48',
    border: '#A6F4C5',
    description: 'Government identification and business verification complete.',
  },
  PENDING: {
    label: 'Verification Pending Review',
    icon: Clock,
    bg: '#FFFAEB',
    color: '#B54708',
    border: '#FEDF89',
    description: 'Your details are currently being reviewed by the operations team.',
  },
  ADDITIONAL_INFORMATION_REQUIRED: {
    label: 'Action Required',
    icon: AlertTriangle,
    bg: '#FFF6ED',
    color: '#C4320A',
    border: '#FECDCA',
    description: 'Additional documentation or clarification needed to verify account.',
  },
  REJECTED: {
    label: 'Verification Rejected',
    icon: XCircle,
    bg: '#FEF3F2',
    color: '#B42318',
    border: '#FECDCA',
    description: 'Verification was not approved. Please review details and resubmit.',
  },
  NOT_SUBMITTED: {
    label: 'Unverified Account',
    icon: Shield,
    bg: '#F8F9FA',
    color: '#475467',
    border: '#EAECF0',
    description: 'Submit GSTIN and business details to get verified badge & unlock bulk quotes.',
  },
};

export default function VerificationBadge({ status, showDescription = false }) {
  const normalized = (status || 'NOT_SUBMITTED').toUpperCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.NOT_SUBMITTED;
  const Icon = config.icon;

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{
          background: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
        }}
      >
        <Icon size={14} />
        <span>{config.label}</span>
      </span>
      {showDescription && (
        <p className="text-xs text-[#68736B] mt-0.5 leading-relaxed">{config.description}</p>
      )}
    </div>
  );
}
