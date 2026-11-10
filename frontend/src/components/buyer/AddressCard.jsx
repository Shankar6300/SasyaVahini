import React from 'react';
import { MapPin, Phone, User, Check, Edit2, Trash2, Home, Building2, Receipt } from 'lucide-react';

const TYPE_ICONS = {
  HOME: Home,
  BUSINESS: Building2,
  BILLING: Receipt,
  OTHER: MapPin,
};

export default function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isSettingDefault = false,
}) {
  const Icon = TYPE_ICONS[address.addressType] || MapPin;

  return (
    <div className={`buyer-address-card${address.isDefault ? ' is-default' : ''}`}>
      {/* Header with Type & Default Chip */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="buyer-address-type-badge">
            <Icon size={13} />
            <span>{address.addressType}</span>
          </span>
          {address.isDefault && (
            <span className="buyer-default-chip">
              <Check size={12} strokeWidth={2.5} />
              Default Delivery
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="buyer-icon-btn"
            onClick={() => onEdit(address)}
            title="Edit Address"
            aria-label="Edit Address"
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className="buyer-icon-btn danger"
            onClick={() => onDelete(address)}
            title="Delete Address"
            aria-label="Delete Address"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Recipient Details */}
      <div className="mb-2">
        <p className="text-sm font-bold text-[#202820] flex items-center gap-1.5">
          <User size={14} className="text-[#68736B]" />
          <span>{address.recipientName}</span>
        </p>
        <p className="text-xs text-[#68736B] flex items-center gap-1.5 mt-0.5">
          <Phone size={13} className="text-[#68736B]" />
          <span>{address.contactNumber}</span>
        </p>
      </div>

      {/* Address Text */}
      <p className="text-xs text-[#344054] leading-relaxed mb-3">
        {address.addressLine1}
        {address.addressLine2 && `, ${address.addressLine2}`}
        {address.locality && `, ${address.locality}`}
        <br />
        <span className="font-semibold text-[#202820]">{address.city}</span>, {address.state} —{' '}
        <span className="font-semibold">{address.postalCode}</span>
        <br />
        <span className="text-[11px] text-[#68736B]">{address.country || 'India'}</span>
      </p>

      {/* Delivery Instructions if present */}
      {address.deliveryInstructions && (
        <div className="buyer-address-instructions">
          <span className="font-semibold">Note:</span> {address.deliveryInstructions}
        </div>
      )}

      {/* Bottom Default Action */}
      {!address.isDefault && (
        <div className="pt-2 mt-2 border-t border-[#EAECF0] flex justify-end">
          <button
            type="button"
            className="text-xs font-semibold text-[#245C43] hover:text-[#173F30] flex items-center gap-1 bg-[#E8F0E8] hover:bg-[#DDE5DC] px-2.5 py-1 rounded transition-colors"
            onClick={() => onSetDefault(address.id)}
            disabled={isSettingDefault}
          >
            {isSettingDefault ? 'Setting...' : 'Set as Default'}
          </button>
        </div>
      )}
    </div>
  );
}
