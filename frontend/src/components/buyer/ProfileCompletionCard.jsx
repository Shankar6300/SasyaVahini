import React from 'react';
import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';

export default function ProfileCompletionCard({
  percentage = 30,
  checklist = {},
  isBusiness = false,
  onActionClick,
}) {
  const items = [
    {
      id: 'basicInfo',
      label: 'Basic Account Details',
      detail: 'Name, email & verified phone',
      completed: Boolean(checklist.basicInfo),
    },
    {
      id: 'addressAdded',
      label: 'Delivery Address',
      detail: 'At least one default delivery location',
      completed: Boolean(checklist.addressAdded),
    },
    {
      id: 'contactVerified',
      label: 'Verified Contact',
      detail: 'Email or OTP phone verification',
      completed: Boolean(checklist.contactVerified),
    },
    {
      id: 'businessInfo',
      label: isBusiness ? 'Business Details & GSTIN' : 'Procurement Preferences',
      detail: isBusiness
        ? 'Business category & tax identifier'
        : 'Notification & language preferences',
      completed: Boolean(checklist.businessInfo),
    },
  ];

  return (
    <div className="buyer-completion-card">
      <div className="buyer-completion-header">
        <div className="flex items-center gap-2">
          <span className="buyer-completion-icon-wrap">
            <Sparkles size={18} />
          </span>
          <div>
            <h3 className="buyer-completion-title">Profile Readiness</h3>
            <p className="buyer-completion-subtitle">
              Complete your profile for seamless orders & verified trust
            </p>
          </div>
        </div>
        <div className="buyer-completion-percentage-pill">
          <span>{percentage}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="buyer-progress-track">
        <div
          className="buyer-progress-fill"
          style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
        />
      </div>

      {/* Milestone Checklist */}
      <div className="buyer-completion-checklist">
        {items.map((item) => (
          <div
            key={item.id}
            className={`buyer-checklist-item${item.completed ? ' completed' : ''}`}
            onClick={() => onActionClick && onActionClick(item.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onActionClick && onActionClick(item.id)}
          >
            {item.completed ? (
              <CheckCircle2 size={16} className="text-[#247A48] shrink-0" />
            ) : (
              <Circle size={16} className="text-[#98A2B3] shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#202820] truncate">{item.label}</p>
              <p className="text-[11px] text-[#68736B] truncate">{item.detail}</p>
            </div>
            {!item.completed && (
              <span className="text-[#245C43] hover:text-[#173F30] text-xs font-semibold flex items-center gap-0.5">
                Complete <ArrowRight size={12} />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
