import React, { useState, useEffect } from 'react';
import {
  Settings, Globe, Bell, Lock, ShieldCheck,
  CheckCircle, AlertCircle, Loader2, Save, Eye, EyeOff,
  UserCheck, Shield
} from 'lucide-react';
import buyerApi from '@/services/buyerApi';
import PasswordRequirements from '@/components/buyer/PasswordRequirements';
import '@/styles/buyer-auth.css';

export default function BuyerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  // Settings State
  const [accountInfo, setAccountInfo] = useState(null);
  const [preferredLocale, setPreferredLocale] = useState('en');
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    deliveryAlerts: true,
    priceDrops: false,
    securityAlerts: true,
    smsEnabled: true,
    emailEnabled: true,
  });

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await buyerApi.getSettings();
      setAccountInfo(data.account || {});
      setPreferredLocale(data.preferences?.preferredLocale || 'en');
      if (data.preferences?.notificationPreferences) {
        setNotifications((prev) => ({
          ...prev,
          ...data.preferences.notificationPreferences,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load account settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setError(null);
      await buyerApi.updateSettings({
        preferredLocale,
        notificationPreferences: notifications,
      });
      setNotification('Preferences updated successfully!');
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update preferences.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password cannot be identical to your current password.');
      return;
    }

    try {
      setChangingPassword(true);
      await buyerApi.changePassword({ currentPassword, newPassword });
      setPasswordSuccess('Password changed successfully! Active sessions secured.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err) {
      setPasswordError(err.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="buyer-profile-loading">
        <Loader2 size={32} className="animate-spin text-[#245C43]" />
        <p className="text-sm font-semibold text-[#68736B] mt-2">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="buyer-page-container">
      {/* Notifications */}
      {notification && (
        <div className="buyer-alert buyer-alert-success buyer-animate-in mb-4">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {error && (
        <div className="buyer-alert buyer-alert-error buyer-animate-in mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="buyer-page-title">Account Settings & Security</h1>
        <p className="buyer-page-subtitle">
          Manage your notification channels, language, and authentication security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Preferences & Notifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: Language & Preferences */}
          <div className="buyer-card">
            <div className="buyer-section-header mb-4">
              <Globe size={18} className="text-[#245C43]" />
              <h2 className="text-sm font-bold text-[#202820]">Language & Region</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="buyer-form-group">
                <label className="buyer-form-label">Preferred Platform Language</label>
                <select
                  className="buyer-input"
                  value={preferredLocale}
                  onChange={(e) => setPreferredLocale(e.target.value)}
                >
                  <option value="en">English (India)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
                <span className="text-[11px] text-[#68736B]">
                  Interface labels and notification messages will use this language.
                </span>
              </div>

              <div className="buyer-form-group">
                <label className="buyer-form-label">Procurement Currency</label>
                <input
                  type="text"
                  className="buyer-input bg-[#F8F9FA] cursor-not-allowed"
                  value="INR (₹) — Indian Rupee"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Section B: Communication & Notification Channels */}
          <div className="buyer-card">
            <div className="buyer-section-header mb-4">
              <Bell size={18} className="text-[#245C43]" />
              <h2 className="text-sm font-bold text-[#202820]">Notification Preferences</h2>
            </div>

            <p className="text-xs text-[#68736B] mb-4">
              Select which notifications you wish to receive regarding produce availability, logistics pings, and security.
            </p>

            <div className="space-y-3.5">
              {[
                {
                  id: 'orderUpdates',
                  title: 'Order & Procurement Milestones',
                  desc: 'Notifications when farmer or FPO accepts your allocation proposal',
                },
                {
                  id: 'deliveryAlerts',
                  title: 'Logistics & Dispatch Tracking',
                  desc: 'Live SMS/Push pings for vehicle departure and delivery OTP arrival',
                },
                {
                  id: 'priceDrops',
                  title: 'Gowtham ML Price Intelligence Alerts',
                  desc: 'Weekly mandi forecast dips and APMC price arbitrage opportunities',
                },
                {
                  id: 'securityAlerts',
                  title: 'Security & Sign-in Alerts',
                  desc: 'Immediate notifications upon new device logins or password modifications',
                },
              ].map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F8F8F3] transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="buyer-checkbox mt-0.5"
                    checked={Boolean(notifications[item.id])}
                    onChange={(e) =>
                      setNotifications({ ...notifications, [item.id]: e.target.checked })
                    }
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#202820]">{item.title}</p>
                    <p className="text-[11px] text-[#68736B]">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-[#EAECF0] flex justify-end">
              <button
                type="button"
                className="buyer-btn buyer-btn-primary"
                onClick={handleSavePreferences}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Preferences...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Preferences</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Security (Change Password) + Account Info */}
        <div className="space-y-6">
          {/* Section C: Password Security */}
          <div className="buyer-card">
            <div className="buyer-section-header mb-4">
              <Lock size={18} className="text-[#245C43]" />
              <h2 className="text-sm font-bold text-[#202820]">Change Password</h2>
            </div>

            {passwordSuccess && (
              <div className="buyer-alert buyer-alert-success buyer-animate-in mb-3 text-xs">
                <CheckCircle size={15} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="buyer-alert buyer-alert-error buyer-animate-in mb-3 text-xs">
                <AlertCircle size={15} />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              {/* Current Password */}
              <div className="buyer-form-group">
                <label className="buyer-form-label">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className="buyer-input pr-10"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#68736B] hover:text-[#202820]"
                    onClick={() => setShowCurrent(!showCurrent)}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="buyer-form-group">
                <label className="buyer-form-label">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="buyer-input pr-10"
                    placeholder="Enter strong new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#68736B] hover:text-[#202820]"
                    onClick={() => setShowNew(!showNew)}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              {newPassword && <PasswordRequirements password={newPassword} />}

              {/* Confirm New Password */}
              <div className="buyer-form-group">
                <label className="buyer-form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="buyer-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full buyer-btn buyer-btn-primary justify-center mt-2"
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          </div>

          {/* Section D: Account Status Overview */}
          <div className="buyer-card">
            <h3 className="text-sm font-bold text-[#202820] mb-3 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-[#245C43]" />
              Account Verification & Security
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-[#344054]">
                <span className="text-[#68736B]">Account Type</span>
                <span className="font-semibold">{accountInfo?.buyerType || 'Buyer'}</span>
              </div>
              <div className="flex items-center justify-between text-[#344054]">
                <span className="text-[#68736B]">Account Status</span>
                <span className="font-semibold text-emerald-700">{accountInfo?.status || 'ACTIVE'}</span>
              </div>
              <div className="flex items-center justify-between text-[#344054]">
                <span className="text-[#68736B]">Email Verified</span>
                <span className="font-semibold">
                  {accountInfo?.isEmailVerified ? 'Yes' : 'Pending Verification'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#344054]">
                <span className="text-[#68736B]">Phone Verified</span>
                <span className="font-semibold">
                  {accountInfo?.isPhoneVerified ? 'Yes' : 'Pending OTP'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#344054]">
                <span className="text-[#68736B]">Member Since</span>
                <span className="font-semibold">
                  {accountInfo?.createdAt
                    ? new Date(accountInfo.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recent'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
