import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AuthLayout from '@/components/buyer/AuthLayout';
import '@/styles/buyer-auth.css';

export default function BuyerLoginPage() {
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/buyer';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    return () => { clearError(); }; // eslint-disable-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (error) clearError();
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your marketplace."
    >
      <div className="buyer-form-card">
        {error && (
          <div className="buyer-alert buyer-alert-error">
            <AlertCircle size={18} className="buyer-alert-icon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="buyer-form-group">
            <label htmlFor="login-email" className="buyer-form-label">
              Email address <span className="required">*</span>
            </label>
            <div className="buyer-input-icon-wrapper">
              <Mail size={18} className="buyer-input-icon" />
              <input
                id="login-email"
                name="email"
                type="email"
                className={`buyer-form-input buyer-input-with-icon${errors.email ? ' error' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                autoFocus
              />
            </div>
            {errors.email && (
              <p className="buyer-form-error-text">
                <AlertCircle size={13} /> {errors.email}
              </p>
            )}
          </div>

          <div className="buyer-form-group">
            <div className="buyer-form-row">
              <label htmlFor="login-password" className="buyer-form-label">
                Password <span className="required">*</span>
              </label>
              <Link to="/buyer/forgot-password" className="buyer-forgot-link">
                Forgot password?
              </Link>
            </div>
            <div className="buyer-password-wrapper">
              <Lock size={18} className="buyer-input-icon" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`buyer-form-input buyer-input-with-icon${errors.password ? ' error' : ''}`}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
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
              <p className="buyer-form-error-text">
                <AlertCircle size={13} /> {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="buyer-btn buyer-btn-primary buyer-btn-full"
            disabled={submitting || isLoading}
          >
            {submitting ? (
              <>
                <span className="buyer-btn-spinner" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="buyer-auth-links">
          <p>
            Don&apos;t have an account?{' '}
            <Link to="/buyer/register">Create one</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
