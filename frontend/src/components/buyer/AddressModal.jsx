import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, AlertCircle } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

export default function AddressModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    recipientName: '',
    contactNumber: '',
    addressType: 'HOME',
    addressLine1: '',
    addressLine2: '',
    locality: '',
    city: '',
    state: 'Maharashtra',
    postalCode: '',
    country: 'India',
    deliveryInstructions: '',
    isDefault: false,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        recipientName: initialData.recipientName || '',
        contactNumber: initialData.contactNumber || '',
        addressType: initialData.addressType || 'HOME',
        addressLine1: initialData.addressLine1 || '',
        addressLine2: initialData.addressLine2 || '',
        locality: initialData.locality || '',
        city: initialData.city || '',
        state: initialData.state || 'Maharashtra',
        postalCode: initialData.postalCode || '',
        country: initialData.country || 'India',
        deliveryInstructions: initialData.deliveryInstructions || '',
        isDefault: Boolean(initialData.isDefault),
      });
    } else {
      setFormData({
        recipientName: '',
        contactNumber: '',
        addressType: 'HOME',
        addressLine1: '',
        addressLine2: '',
        locality: '',
        city: '',
        state: 'Maharashtra',
        postalCode: '',
        country: 'India',
        deliveryInstructions: '',
        isDefault: false,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.recipientName.trim()) errs.recipientName = 'Recipient name is required';
    if (!/^\+?[0-9]{10,15}$/.test(formData.contactNumber.trim())) {
      errs.contactNumber = 'Enter a valid 10-digit mobile number';
    }
    if (!formData.addressLine1.trim() || formData.addressLine1.trim().length < 5) {
      errs.addressLine1 = 'Address line 1 must be at least 5 characters';
    }
    if (!formData.city.trim()) errs.city = 'City/District is required';
    if (!formData.state.trim()) errs.state = 'State is required';
    if (!/^[1-9][0-9]{5}$/.test(formData.postalCode.trim())) {
      errs.postalCode = 'Enter a valid 6-digit PIN code';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <div className="buyer-modal-overlay" role="dialog" aria-modal="true">
      <div className="buyer-modal-card">
        {/* Header */}
        <div className="buyer-modal-header">
          <div className="flex items-center gap-2">
            <span className="buyer-modal-icon">
              <MapPin size={20} />
            </span>
            <div>
              <h2 className="buyer-modal-title">
                {initialData ? 'Edit Address' : 'Add New Address'}
              </h2>
              <p className="buyer-modal-subtitle">
                Enter delivery or billing address for procurement
              </p>
            </div>
          </div>
          <button
            type="button"
            className="buyer-icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="buyer-modal-form">
          {/* Address Type Selector */}
          <div className="buyer-form-group">
            <label className="buyer-form-label">Address Type</label>
            <div className="grid grid-cols-4 gap-2">
              {['HOME', 'BUSINESS', 'BILLING', 'OTHER'].map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`buyer-type-pill${formData.addressType === type ? ' active' : ''}`}
                  onClick={() => setFormData({ ...formData, addressType: type })}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Row 1: Recipient Name & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="buyer-form-group">
              <label className="buyer-form-label">
                Recipient / Business Name <span className="text-[#B42318]">*</span>
              </label>
              <input
                type="text"
                className={`buyer-input${errors.recipientName ? ' error' : ''}`}
                placeholder="e.g. Rajesh Sharma"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              />
              {errors.recipientName && (
                <span className="buyer-form-error">{errors.recipientName}</span>
              )}
            </div>

            <div className="buyer-form-group">
              <label className="buyer-form-label">
                Mobile Number <span className="text-[#B42318]">*</span>
              </label>
              <input
                type="tel"
                className={`buyer-input${errors.contactNumber ? ' error' : ''}`}
                placeholder="10-digit mobile number"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              />
              {errors.contactNumber && (
                <span className="buyer-form-error">{errors.contactNumber}</span>
              )}
            </div>
          </div>

          {/* Row 2: Address Line 1 */}
          <div className="buyer-form-group">
            <label className="buyer-form-label">
              Flat, House No., Building, Street <span className="text-[#B42318]">*</span>
            </label>
            <input
              type="text"
              className={`buyer-input${errors.addressLine1 ? ' error' : ''}`}
              placeholder="e.g. Shop 4B, APMC Market Road, Sector 19"
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
            />
            {errors.addressLine1 && (
              <span className="buyer-form-error">{errors.addressLine1}</span>
            )}
          </div>

          {/* Row 3: Address Line 2 & Locality */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="buyer-form-group">
              <label className="buyer-form-label">Address Line 2 (Optional)</label>
              <input
                type="text"
                className="buyer-input"
                placeholder="e.g. Near Cold Storage Unit"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              />
            </div>

            <div className="buyer-form-group">
              <label className="buyer-form-label">Locality / Landmark</label>
              <input
                type="text"
                className="buyer-input"
                placeholder="e.g. Vashi / Hadapsar"
                value={formData.locality}
                onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
              />
            </div>
          </div>

          {/* Row 4: City, State, PIN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="buyer-form-group">
              <label className="buyer-form-label">
                City / District <span className="text-[#B42318]">*</span>
              </label>
              <input
                type="text"
                className={`buyer-input${errors.city ? ' error' : ''}`}
                placeholder="e.g. Pune"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              {errors.city && <span className="buyer-form-error">{errors.city}</span>}
            </div>

            <div className="buyer-form-group">
              <label className="buyer-form-label">
                State <span className="text-[#B42318]">*</span>
              </label>
              <select
                className="buyer-input"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="buyer-form-group">
              <label className="buyer-form-label">
                PIN Code <span className="text-[#B42318]">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                className={`buyer-input${errors.postalCode ? ' error' : ''}`}
                placeholder="6 digits"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              />
              {errors.postalCode && (
                <span className="buyer-form-error">{errors.postalCode}</span>
              )}
            </div>
          </div>

          {/* Row 5: Delivery instructions */}
          <div className="buyer-form-group">
            <label className="buyer-form-label">Delivery Instructions (Optional)</label>
            <input
              type="text"
              className="buyer-input"
              placeholder="e.g. Unloading ramp available at Gate 2, morning deliveries preferred"
              value={formData.deliveryInstructions}
              onChange={(e) =>
                setFormData({ ...formData, deliveryInstructions: e.target.value })
              }
            />
          </div>

          {/* Row 6: Default checkbox */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="set-as-default"
              className="buyer-checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            />
            <label htmlFor="set-as-default" className="text-xs font-medium text-[#202820] cursor-pointer">
              Set as default delivery address for future orders
            </label>
          </div>

          {/* Footer actions */}
          <div className="buyer-modal-actions">
            <button
              type="button"
              className="buyer-btn buyer-btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="buyer-btn buyer-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialData ? 'Update Address' : 'Save Address'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
