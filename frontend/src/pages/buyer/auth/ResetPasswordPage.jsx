import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import AuthLayout from '@/components/buyer/AuthLayout';
import PasswordRequirements from '@/components/buyer/PasswordRequirements';
import '@/styles/buyer-auth.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const isTokenMissing = !token;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.password) errs.password = 'New password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Password must contain an uppercase letter';
    else if (!/\d/.test(form.password)) errs.password = 'Password must contain a number';

    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your new password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting || isTokenMissing) return;
    setSubmitting(true);
    setApiError('');

    try {
      // Backend reset-password endpoint — not yet implemented.
      // When available, call: await api.post('/auth/reset-password', { token, password: form.password });
      // For now, simulate a successful response after a brief delay.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSuccess(true);
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        'Unable to reset your password. The link may have expired.';
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Token missing / invalid state ────────────────────────────────────────
  if (isTokenMissing) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="This password reset link is missing or has expired."
      >
        <div className="buyer-form-card">
          <div className="buyer-success-page">
            <div className="buyer-success-icon" style={{ background: 'var(--buyer-error-bg)', color: 'var(--buyer-error)' }}>
              <ShieldAlert size={28} />
            </div>
            <h3 className="buyer-success-title">Link is invalid</h3>
            <p className="buyer-success-text">
              The password reset link you followed is invalid or has expired.
              Please request a new one.
            </p>
            <Link to="/buyer/forgot-password" className="buyer-btn buyer-btn-primary buyer-btn-full">
              Request new link
            </Link>
          </div>
          <div className="buyer-auth-links">
            <p>
              <Link to="/buyer/login">Back to sign in</Link>
            </p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout
        title="Password reset"
        subtitle="Your password has been successfully updated."
      >
        <div className="buyer-form-card">
          <div className="buyer-success-page">
            <div className="buyer-success-icon">
              <CheckCircle size={32} />
            </div>
            <h3 className="buyer-success-title">Password updated</h3>
            <p className="buyer-success-text">
              Your password has been reset successfully. You can now sign in
              with your new password.
            </p>
            <Link to="/buyer/login" className="buyer-btn buyer-btn-primary buyer-btn-full">
              Sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ── Reset form ───────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Create a new password for your account."
    >
      <div className="buyer-form-card">
        {apiError && (
          <div className="buyer-alert buyer-alert-error">
            <AlertCircle size={18} className="buyer-alert-icon" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="buyer-form-group">
            <label htmlFor="reset-password" className="buyer-form-label">
              New password <span className="required">*</span>
            </label>
            <div className="buyer-password-wrapper">
              <input
                id="reset-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`buyer-form-input${errors.password ? ' error' : ''}`}
                placeholder="Enter your new password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                autoFocus
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
            {errors.password && (
              <p className="buyer-form-error-text"><AlertCircle size={13} /> {errors.password}</p>
            )}
            <PasswordRequirements password={form.password} />
          </div>

          <div className="buyer-form-group">
            <label htmlFor="reset-confirm" className="buyer-form-label">
              Confirm new password <span className="required">*</span>
            </label>
            <div className="buyer-password-wrapper">
              <input
                id="reset-confirm"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className={`buyer-form-input${errors.confirmPassword ? ' error' : ''}`}
                placeholder="Re-enter your new password"
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

          <button
            type="submit"
            className="buyer-btn buyer-btn-primary buyer-btn-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="buyer-btn-spinner" />
                Resetting password…
              </>
            ) : (
              'Reset password'
            )}
          </button>
        </form>

        <div className="buyer-auth-links">
          <p>
            <Link to="/buyer/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
