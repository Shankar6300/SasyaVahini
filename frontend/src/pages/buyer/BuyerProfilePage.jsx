import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Building2, Mail, Phone, MapPin, ShieldCheck,
  CheckCircle, AlertCircle, Edit3, Save, X, Loader2,
  FileText, Sparkles, Receipt, ArrowRight, Shield
} from 'lucide-react';
import buyerApi from '@/services/buyerApi';
import VerificationBadge from '@/components/buyer/VerificationBadge';
import ProfileCompletionCard from '@/components/buyer/ProfileCompletionCard';
import '@/styles/buyer-auth.css';

const BUSINESS_CATEGORIES = [
  'Restaurant',
  'Retailer',
  'Wholesaler',
  'Hotel',
  'Food Processor',
  'Supermarket',
  'Exporter',
  'Catering Service',
  'Other Business',
];

export default function BuyerProfilePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [serverError, setServerError] = useState(null);

  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    preferredLocale: 'en',
    organizationName: '',
    businessCategory: 'Restaurant',
    contactPerson: '',
    gstNumber: '',
    deliveryAddress: '',
    deliveryDistrict: '',
    deliveryState: '',
    billingAddress: '',
    billingState: '',
    billingDistrict: '',
    billingPincode: '',
    billingGstin: '',
  });

  const [sameAsDelivery, setSameAsDelivery] = useState(false);

  // Load profile from backend
  const loadProfile = async () => {
    try {
      setLoading(true);
      setServerError(null);
      const data = await buyerApi.getProfile();
      setProfileData(data);

      const u = data.user || {};
      const p = data.profile || {};

      setFormData({
        name: u.name || '',
        preferredLocale: u.preferredLocale || 'en',
        organizationName: p.organizationName || '',
        businessCategory: p.businessCategory || p.buyerType || 'Restaurant',
        contactPerson: p.contactPerson || u.name || '',
        gstNumber: p.gstNumber || '',
        deliveryAddress: p.deliveryAddress || '',
        deliveryDistrict: p.deliveryDistrict || '',
        deliveryState: p.deliveryState || 'Maharashtra',
        billingAddress: p.billingAddress || '',
        billingState: p.billingState || 'Maharashtra',
        billingDistrict: p.billingDistrict || '',
        billingPincode: p.billingPincode || '',
        billingGstin: p.billingGstin || p.gstNumber || '',
      });
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Failed to load buyer profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const isBusiness =
    profileData?.profile?.buyerType &&
    profileData.profile.buyerType.toUpperCase() !== 'INDIVIDUAL' &&
    profileData.profile.buyerType.toUpperCase() !== 'CONSUMER';

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setServerError(null);

      const payload = {
        name: formData.name,
        preferredLocale: formData.preferredLocale,
        deliveryAddress: formData.deliveryAddress,
        deliveryDistrict: formData.deliveryDistrict,
        deliveryState: formData.deliveryState,
      };

      if (isBusiness) {
        payload.organizationName = formData.organizationName;
        payload.businessCategory = formData.businessCategory;
        payload.contactPerson = formData.contactPerson;
        payload.gstNumber = formData.gstNumber ? formData.gstNumber.trim().toUpperCase() : null;
        payload.billingAddress = sameAsDelivery ? formData.deliveryAddress : formData.billingAddress;
        payload.billingDistrict = sameAsDelivery ? formData.deliveryDistrict : formData.billingDistrict;
        payload.billingState = sameAsDelivery ? formData.deliveryState : formData.billingState;
        payload.billingPincode = formData.billingPincode;
        payload.billingGstin = formData.billingGstin ? formData.billingGstin.trim().toUpperCase() : null;
      }

      const updated = await buyerApi.updateProfile(payload);
      setProfileData(updated);
      setIsEditing(false);
      setNotification('Profile details updated successfully!');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestVerification = async () => {
    try {
      setSaving(true);
      const updated = await buyerApi.updateProfile({ requestVerification: true });
      setProfileData(updated);
      setNotification('Verification request submitted for operational review!');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Failed to submit verification request.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="buyer-profile-loading">
        <Loader2 size={32} className="animate-spin text-[#245C43]" />
        <p className="text-sm font-semibold text-[#68736B] mt-2">Loading profile details...</p>
      </div>
    );
  }

  const user = profileData?.user || {};
  const profile = profileData?.profile || {};

  return (
    <div className="buyer-page-container">
      {/* Notifications */}
      {notification && (
        <div className="buyer-alert buyer-alert-success buyer-animate-in mb-4">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {serverError && (
        <div className="buyer-alert buyer-alert-error buyer-animate-in mb-4">
          <AlertCircle size={18} />
          <span>{serverError}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="buyer-page-title">My Buyer Profile</h1>
          <p className="buyer-page-subtitle">
            Manage your personal identity, business credentials & delivery locations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              className="buyer-btn buyer-btn-primary"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 size={16} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="buyer-btn buyer-btn-outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                className="buyer-btn buyer-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card + Completion */}
        <div className="flex flex-col gap-6">
          {/* Main User Card */}
          <div className="buyer-card">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="buyer-avatar-large">
                  {isBusiness ? <Building2 size={28} /> : <User size={28} />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#202820] leading-tight">
                    {user.name}
                  </h2>
                  <p className="text-xs text-[#68736B] font-medium">
                    {isBusiness ? profile.organizationName : 'Individual Consumer'}
                  </p>
                </div>
              </div>
              <span className="buyer-role-tag">{isBusiness ? 'BUSINESS' : 'CONSUMER'}</span>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-[#EAECF0] text-xs">
              <div className="flex items-center justify-between text-[#344054]">
                <span className="text-[#68736B] flex items-center gap-1.5">
                  <Mail size={14} /> Email
                </span>
                <span className="font-semibold text-right">{user.email}</span>
              </div>
              <div className="flex items-center justify-between text-[#344054]">
                <span className="text-[#68736B] flex items-center gap-1.5">
                  <Phone size={14} /> Phone
                </span>
                <span className="font-semibold text-right">{user.phone}</span>
              </div>
              <div className="flex items-center justify-between text-[#344054]">
                <span className="text-[#68736B]">Contact Verified</span>
                <span>
                  {user.isPhoneVerified || user.isEmailVerified ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck size={14} /> Verified
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">Pending OTP</span>
                  )}
                </span>
              </div>
            </div>

            {/* Verification Status for Business */}
            {isBusiness && (
              <div className="mt-4 pt-3 border-t border-[#EAECF0]">
                <p className="text-xs font-semibold text-[#68736B] mb-2">Business Verification</p>
                <VerificationBadge status={profile.verificationStatus} showDescription />
                {profile.verificationStatus === 'NOT_SUBMITTED' && (
                  <button
                    type="button"
                    className="mt-3 w-full text-xs font-semibold text-[#245C43] bg-[#E8F0E8] hover:bg-[#DDE5DC] py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    onClick={handleRequestVerification}
                    disabled={saving}
                  >
                    <Shield size={14} />
                    <span>Request Verification Review</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Profile Completion Widget */}
          <ProfileCompletionCard
            percentage={profileData?.completionPercentage || 40}
            checklist={profileData?.checklist || {}}
            isBusiness={isBusiness}
            onActionClick={(item) => {
              if (item === 'addressAdded') navigate('/buyer/addresses');
              else if (item === 'businessInfo') setIsEditing(true);
            }}
          />

          {/* Addresses Quick Shortcut */}
          <div className="buyer-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#202820] flex items-center gap-1.5">
                <MapPin size={16} className="text-[#245C43]" />
                Saved Addresses
              </h3>
              <span className="text-xs font-bold text-[#245C43] bg-[#E8F0E8] px-2 py-0.5 rounded-full">
                {profileData?.addresses?.length || 0}
              </span>
            </div>
            <p className="text-xs text-[#68736B] mb-3 leading-relaxed">
              Manage multi-destination shipping addresses, FPO hub delivery points, and billing records.
            </p>
            <button
              type="button"
              className="w-full buyer-btn buyer-btn-outline text-xs justify-center"
              onClick={() => navigate('/buyer/addresses')}
            >
              <span>Manage Addresses</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Right 2 Columns: Editable Profile Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="buyer-card space-y-6">
            {/* Section 1: Basic Identity */}
            <div>
              <div className="buyer-section-header">
                <User size={18} className="text-[#245C43]" />
                <h3 className="text-sm font-bold text-[#202820]">Basic Identity & Contact</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="buyer-form-group">
                  <label className="buyer-form-label">Full Name</label>
                  <input
                    type="text"
                    className="buyer-input"
                    value={formData.name}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="buyer-form-group">
                  <label className="buyer-form-label">Registered Email</label>
                  <input
                    type="email"
                    className="buyer-input bg-[#F8F9FA] cursor-not-allowed"
                    value={user.email}
                    disabled
                  />
                  <span className="text-[11px] text-[#68736B]">Email address cannot be changed directly</span>
                </div>
                <div className="buyer-form-group">
                  <label className="buyer-form-label">Registered Mobile Number</label>
                  <input
                    type="tel"
                    className="buyer-input bg-[#F8F9FA] cursor-not-allowed"
                    value={user.phone}
                    disabled
                  />
                  <span className="text-[11px] text-[#68736B]">Linked to delivery OTP verification</span>
                </div>
                <div className="buyer-form-group">
                  <label className="buyer-form-label">Interface Language</label>
                  <select
                    className="buyer-input"
                    value={formData.preferredLocale}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({ ...formData, preferredLocale: e.target.value })}
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Business Information (Conditional for Business Buyers) */}
            {isBusiness && (
              <div className="pt-6 border-t border-[#EAECF0]">
                <div className="buyer-section-header">
                  <Building2 size={18} className="text-[#245C43]" />
                  <h3 className="text-sm font-bold text-[#202820]">Institutional Business Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="buyer-form-group">
                    <label className="buyer-form-label">Organization / Business Name</label>
                    <input
                      type="text"
                      className="buyer-input"
                      placeholder="e.g. Pune Fresh Foods Ltd."
                      value={formData.organizationName}
                      disabled={!isEditing}
                      onChange={(e) =>
                        setFormData({ ...formData, organizationName: e.target.value })
                      }
                    />
                  </div>
                  <div className="buyer-form-group">
                    <label className="buyer-form-label">Business Category</label>
                    <select
                      className="buyer-input"
                      value={formData.businessCategory}
                      disabled={!isEditing}
                      onChange={(e) =>
                        setFormData({ ...formData, businessCategory: e.target.value })
                      }
                    >
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="buyer-form-group">
                    <label className="buyer-form-label">Procurement Contact Person</label>
                    <input
                      type="text"
                      className="buyer-input"
                      placeholder="e.g. Vikram Sharma (Head Chef / Manager)"
                      value={formData.contactPerson}
                      disabled={!isEditing}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                  <div className="buyer-form-group">
                    <label className="buyer-form-label">GSTIN (Goods and Services Tax ID)</label>
                    <input
                      type="text"
                      className="buyer-input"
                      placeholder="15-character GSTIN (e.g. 27AAAAA0000A1Z5)"
                      value={formData.gstNumber}
                      disabled={!isEditing}
                      onChange={(e) =>
                        setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })
                      }
                    />
                    <span className="text-[11px] text-[#68736B]">
                      Format validated for Indian GST. Enables input tax credit invoices.
                    </span>
                  </div>
                </div>

                {/* Billing Address Subsection */}
                <div className="mt-5 p-4 rounded-xl bg-[#F8F8F3] border border-[#DDE5DC]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-[#202820] flex items-center gap-1.5">
                      <Receipt size={15} className="text-[#245C43]" />
                      Tax Billing Address
                    </h4>
                    {isEditing && (
                      <label className="flex items-center gap-1.5 text-xs text-[#202820] cursor-pointer">
                        <input
                          type="checkbox"
                          className="buyer-checkbox"
                          checked={sameAsDelivery}
                          onChange={(e) => {
                            setSameAsDelivery(e.target.checked);
                            if (e.target.checked) {
                              setFormData((prev) => ({
                                ...prev,
                                billingAddress: prev.deliveryAddress,
                                billingDistrict: prev.deliveryDistrict,
                                billingState: prev.deliveryState,
                              }));
                            }
                          }}
                        />
                        <span>Same as primary delivery</span>
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        className="buyer-input"
                        placeholder="Registered billing address line"
                        value={sameAsDelivery ? formData.deliveryAddress : formData.billingAddress}
                        disabled={!isEditing || sameAsDelivery}
                        onChange={(e) =>
                          setFormData({ ...formData, billingAddress: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        className="buyer-input"
                        placeholder="Billing City"
                        value={sameAsDelivery ? formData.deliveryDistrict : formData.billingDistrict}
                        disabled={!isEditing || sameAsDelivery}
                        onChange={(e) =>
                          setFormData({ ...formData, billingDistrict: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        className="buyer-input"
                        placeholder="Billing State"
                        value={sameAsDelivery ? formData.deliveryState : formData.billingState}
                        disabled={!isEditing || sameAsDelivery}
                        onChange={(e) =>
                          setFormData({ ...formData, billingState: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        className="buyer-input"
                        placeholder="Billing PIN Code"
                        value={formData.billingPincode}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setFormData({ ...formData, billingPincode: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Primary Delivery Location */}
            <div className="pt-6 border-t border-[#EAECF0]">
              <div className="buyer-section-header">
                <MapPin size={18} className="text-[#245C43]" />
                <h3 className="text-sm font-bold text-[#202820]">Default Delivery Location</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div className="md:col-span-3 buyer-form-group">
                  <label className="buyer-form-label">Default Street Address / Unloading Facility</label>
                  <input
                    type="text"
                    className="buyer-input"
                    placeholder="e.g. Shop 12, APMC Market Yard"
                    value={formData.deliveryAddress}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryAddress: e.target.value })
                    }
                  />
                </div>
                <div className="buyer-form-group">
                  <label className="buyer-form-label">City / District</label>
                  <input
                    type="text"
                    className="buyer-input"
                    placeholder="e.g. Pune"
                    value={formData.deliveryDistrict}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryDistrict: e.target.value })
                    }
                  />
                </div>
                <div className="buyer-form-group">
                  <label className="buyer-form-label">State</label>
                  <input
                    type="text"
                    className="buyer-input"
                    placeholder="e.g. Maharashtra"
                    value={formData.deliveryState}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryState: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Save Buttons at Bottom when Editing */}
            {isEditing && (
              <div className="pt-4 border-t border-[#EAECF0] flex justify-end gap-3">
                <button
                  type="button"
                  className="buyer-btn buyer-btn-outline"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="buyer-btn buyer-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <span>Save Profile Changes</span>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
