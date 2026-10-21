import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AuthLayout from '@/components/buyer/AuthLayout';
import BuyerTypeSelector from '@/components/buyer/BuyerTypeSelector';
import PasswordRequirements from '@/components/buyer/PasswordRequirements';
import '@/styles/buyer-auth.css';

export default function BuyerRegisterPage() {
  const { register, error, clearError } = useAuth();

  const [buyerType, setBuyerType] = useState('consumer');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    businessCategory: '',
    gstin: '',
    businessAddress: '',
    agreeTerms: false,
  });

  useEffect(() => {
    return () => { clearError(); }; // eslint-disable-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (error) clearError();
  };

  const validate = () => {
    const errs = {};

    if (!form.name.trim()) errs.name = 'Full name is required';
    else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';

    if (!form.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';

    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^\d{10,15}$/.test(form.phone.replace(/[\s\-+]/g, '')))
      errs.phone = 'Enter a valid 10–15 digit phone number';

    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Password must contain an uppercase letter';
    else if (!/\d/.test(form.password)) errs.password = 'Password must contain a number';

    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';

    if (buyerType === 'business') {
      if (!form.organizationName.trim()) errs.organizationName = 'Organization name is required';
      if (!form.businessCategory) errs.businessCategory = 'Business category is required';
    }

    if (!form.agreeTerms) errs.agreeTerms = 'You must agree to the terms';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.replace(/[\s\-+]/g, ''),
        password: form.password,
        role: 'BUYER',
        preferredLocale: 'en',
      });
      setSuccess(true);
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Account created!"
        subtitle="Your buyer account has been registered successfully."
      >
        <div className="buyer-form-card">
          <div className="buyer-success-page">
            <div className="buyer-success-icon">
              <CheckCircle size={32} />
            </div>
            <h3 className="buyer-success-title">Welcome to SasyaVahini</h3>
            <p className="buyer-success-text">
              Your {buyerType === 'business' ? 'business' : 'consumer'} account has been created.
              Sign in to start exploring agricultural produce from verified farmers and FPOs.
            </p>
            <Link to="/buyer/login" className="buyer-btn buyer-btn-primary buyer-btn-full">
              Sign in to your account
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join the agricultural marketplace to discover produce from farmers and FPOs."
    >
      <div className="buyer-form-card">
        {error && (
          <div className="buyer-alert buyer-alert-error">
            <AlertCircle size={18} className="buyer-alert-icon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <BuyerTypeSelector value={buyerType} onChange={setBuyerType} />

          {/* ── Personal Information ──────────────────────── */}
          <div className="buyer-form-section">
            <h3 className="buyer-form-section-title">Personal Information</h3>

            <div className="buyer-form-group">
              <label htmlFor="reg-name" className="buyer-form-label">
                Full name <span className="required">*</span>
              </label>
              <input
                id="reg-name"
                name="name"
                type="text"
                className={`buyer-form-input${errors.name ? ' error' : ''}`}
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
              />
              {errors.name && <p className="buyer-form-error-text"><AlertCircle size={13} /> {errors.name}</p>}
            </div>

            <div className="buyer-form-grid-2">
              <div className="buyer-form-group">
                <label htmlFor="reg-email" className="buyer-form-label">
                  Email address <span className="required">*</span>
                </label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  className={`buyer-form-input${errors.email ? ' error' : ''}`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                {errors.email && <p className="buyer-form-error-text"><AlertCircle size={13} /> {errors.email}</p>}
              </div>

              <div className="buyer-form-group">
                <label htmlFor="reg-phone" className="buyer-form-label">
                  Phone number <span className="required">*</span>
                </label>
                <input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  className={`buyer-form-input${errors.phone ? ' error' : ''}`}
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
                {errors.phone && <p className="buyer-form-error-text"><AlertCircle size={13} /> {errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* ── Business Information (conditional) ────────── */}
          {buyerType === 'business' && (
            <div className="buyer-form-section buyer-animate-in">
              <h3 className="buyer-form-section-title">Business Information</h3>

              <div className="buyer-form-group">
                <label htmlFor="reg-org" className="buyer-form-label">
                  Organization name <span className="required">*</span>
                </label>
                <input
                  id="reg-org"
                  name="organizationName"
                  type="text"
                  className={`buyer-form-input${errors.organizationName ? ' error' : ''}`}
                  placeholder="Your business or organization name"
                  value={form.organizationName}
                  onChange={handleChange}
                />
                {errors.organizationName && (
                  <p className="buyer-form-error-text"><AlertCircle size={13} /> {errors.organizationName}</p>
                )}
              </div>

              <div className="buyer-form-grid-2">
                <div className="buyer-form-group">
                  <label htmlFor="reg-category" className="buyer-form-label">
                    Business category <span className="required">*</span>
                  </label>
                  <select
                    id="reg-category"
                    name="businessCategory"
                    className={`buyer-form-input buyer-form-select${errors.businessCategory ? ' error' : ''}`}
                    value={form.businessCategory}
                    onChange={handleChange}
                  >
                    <option value="">Select category</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Retailer">Retailer</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="Supermarket">Supermarket</option>
                    <option value="Government">Government</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.businessCategory && (
                    <p className="buyer-form-error-text"><AlertCircle size={13} /> {errors.businessCategory}</p>
                  )}
                </div>

                <div className="buyer-form-group">
                  <label htmlFor="reg-gstin" className="buyer-form-label">
                    GSTIN <span className="buyer-form-hint-inline">(optional)</span>
                  </label>
                  <input
                    id="reg-gstin"
                    name="gstin"
                    type="text"
                    className="buyer-form-input"
                    placeholder="22AAAAA0000A1Z5"
                    value={form.gstin}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="buyer-form-group">
                <label htmlFor="reg-address" className="buyer-form-label">
                  Business address <span className="buyer-form-hint-inline">(optional)</span>
                </label>
                <input
                  id="reg-address"
                  name="businessAddress"
                  type="text"
                  className="buyer-form-input"
                  placeholder="Street address, city, state"
                  value={form.businessAddress}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          {/* ── Security ─────────────────────────────────── */}
          <div className="buyer-form-section">
            <h3 className="buyer-form-section-title">Security</h3>

            <div className="buyer-form-group">
              <label htmlFor="reg-password" className="buyer-form-label">
                Password <span className="required">*</span>
              </label>
              <div className="buyer-password-wrapper">
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`buyer-form-input${errors.password ? ' error' : ''}`}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="buyer-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="buyer-form-error-text"><AlertCircle size={13} /> {errors.password}</p>}
              <PasswordRequirements password={form.password} />
            </div>

            <div className="buyer-form-group">
              <label htmlFor="reg-confirm" className="buyer-form-label">
                Confirm password <span className="required">*</span>
              </label>
              <div className="buyer-password-wrapper">
                <input
                  id="reg-confirm"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  className={`buyer-form-input${errors.confirmPassword ? ' error' : ''}`}
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="buyer-password-toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="buyer-form-error-text"><AlertCircle size={13} /> {errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* ── Terms ────────────────────────────────────── */}
          <div className="buyer-form-group">
            <label className="buyer-checkbox-label">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={form.agreeTerms}
                onChange={handleChange}
              />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>
            {errors.agreeTerms && (
              <p className="buyer-form-error-text"><AlertCircle size={13} /> {errors.agreeTerms}</p>
            )}
          </div>

          <button
            type="submit"
            className="buyer-btn buyer-btn-primary buyer-btn-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="buyer-btn-spinner" />
                Creating account…
              </>
            ) : (
              `Create ${buyerType === 'business' ? 'business' : 'consumer'} account`
            )}
          </button>
        </form>

        <div className="buyer-auth-links">
          <p>
            Already have an account?{' '}
            <Link to="/buyer/login">Sign in</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
