import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react';
import AuthLayout from '@/components/buyer/AuthLayout';
import '@/styles/buyer-auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setFieldError('Email address is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('Enter a valid email address');
      return false;
    }
    setFieldError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      // Backend password reset endpoint — not yet implemented.
      // When available, call: await api.post('/auth/forgot-password', { email });
      // For now, simulate a successful response after a brief delay.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSuccess(true);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          'Unable to process your request. Please try again later.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We've sent password reset instructions to your email."
      >
        <div className="buyer-form-card">
          <div className="buyer-success-page">
            <div className="buyer-success-icon">
              <Mail size={28} />
            </div>
            <h3 className="buyer-success-title">Recovery email sent</h3>
            <p className="buyer-success-text">
              If an account exists for <strong>{email}</strong>, you will receive
              an email with instructions to reset your password. Please check
              your inbox and spam folder.
            </p>
            <Link to="/buyer/login" className="buyer-btn buyer-btn-primary buyer-btn-full">
              Back to sign in
            </Link>
          </div>
          <div className="buyer-auth-links" style={{ marginTop: 16 }}>
            <p>
              Didn&apos;t receive the email?{' '}
              <button
                type="button"
                className="buyer-btn-text"
                onClick={() => { setSuccess(false); setEmail(''); }}
                style={{ display: 'inline', fontSize: 14 }}
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email address and we'll send you a link to reset your password."
    >
      <Link to="/buyer/login" className="buyer-back-link">
        <ArrowLeft size={16} /> Back to sign in
      </Link>

      <div className="buyer-form-card">
        {error && (
          <div className="buyer-alert buyer-alert-error">
            <AlertCircle size={18} className="buyer-alert-icon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="buyer-form-group">
            <label htmlFor="forgot-email" className="buyer-form-label">
              Email address <span className="required">*</span>
            </label>
            <div className="buyer-input-icon-wrapper">
              <Mail size={18} className="buyer-input-icon" />
              <input
                id="forgot-email"
                name="email"
                type="email"
                className={`buyer-form-input buyer-input-with-icon${fieldError ? ' error' : ''}`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError('');
                  if (error) setError('');
                }}
                autoComplete="email"
                autoFocus
              />
            </div>
            {fieldError && (
              <p className="buyer-form-error-text">
                <AlertCircle size={13} /> {fieldError}
              </p>
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
                Sending…
              </>
            ) : (
              'Send recovery link'
            )}
          </button>
        </form>

        <div className="buyer-auth-links">
          <p>
            Remember your password?{' '}
            <Link to="/buyer/login">Sign in</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
