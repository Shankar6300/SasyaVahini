import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Leaf, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Alert from '../components/Alert';
import LanguageSelector from '../components/LanguageSelector';
import GoogleLoginButton from '../components/GoogleLoginButton';
import OtpVerificationModal from '../components/OtpVerificationModal';
import api from '../services/api';

export default function LoginPage() {
  const { login, loginWithOtpSession } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;
  const searchParams = new URLSearchParams(location.search);
  const activeRole = searchParams.get('role')?.toUpperCase() === 'FPO' ? 'FPO' : 'FARMER';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpTarget, setOtpTarget] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const ROLE_REDIRECTS = {
    FARMER:    '/farmer',
    FPO:       '/fpo',
    BUYER:     '/buyer',
    LOGISTICS: '/logistics',
    ADMIN:     '/admin',
  };

  const validate = () => {
    const errs = {};
    const trimmedEmail = (form.email || '').trim();
    if (!trimmedEmail) errs.email = t('auth.emailRequired', 'Email is required');
    else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) errs.email = t('auth.invalidEmail', 'Invalid email address');
    if (!form.password) errs.password = t('auth.passwordRequired', 'Password is required');
    return errs;
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((e2) => ({ ...e2, [e.target.name]: '' }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      const user = await login(form.email.trim(), form.password);
      const dest = from || ROLE_REDIRECTS[user.role] || '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setApiError(err.message || t('auth.loginFailed', 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtpLogin = async () => {
    const trimmedEmail = (form.email || '').trim();
    if (!trimmedEmail) {
      setErrors((prev) => ({ ...prev, email: t('auth.emailRequired', 'Email is required') }));
      return;
    }
    setOtpLoading(true);
    setApiError('');
    try {
      await api.post('/auth/otp/request', {
        identifier: trimmedEmail,
        purpose: 'LOGIN'
      });
      setOtpTarget(trimmedEmail);
      setOtpModalOpen(true);
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || t('otp.requestFailed', 'Failed to send OTP'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpVerified = (data) => {
    if (data?.user && data?.accessToken) {
      loginWithOtpSession(data);
      const dest = from || ROLE_REDIRECTS[data.user.role] || '/';
      navigate(dest, { replace: true });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card relative">
        {/* Language selector in top-right */}
        <div className="flex justify-end mb-4">
          <LanguageSelector />
        </div>

        {/* Logo */}
        <div className="auth-logo">
          <Leaf size={32} color="#07875B" strokeWidth={2.5} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
            SasyaVahini
          </span>
        </div>

        <h1 className="auth-title">
          {activeRole === 'FPO' ? '🤝 ' + t('auth.fpoLoginTitle', 'FPO & Cooperative Portal') : '🌾 ' + t('auth.farmerLoginTitle', 'Farmer & Partner Portal')}
        </h1>
        <p className="auth-subtitle">
          {activeRole === 'FPO'
            ? t('auth.fpoLoginSubtitle', 'Sign in to access your producer organization dashboard and member aggregation')
            : t('auth.farmerLoginSubtitle', 'Sign in to access your farm dashboard, listings, and orders')}
        </p>

        {apiError && (
          <Alert variant="error" className="mb-6">{apiError}</Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <FormField
              id="login-email"
              label={t('auth.email', 'Email address')}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@example.com"
            />
            <FormField
              id="login-password"
              label={t('auth.password', 'Password')}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading}
            className="mt-6"
            id="login-submit-btn"
          >
            {t('auth.signIn', 'Sign In')}
          </Button>

          <button
            type="button"
            onClick={handleRequestOtpLogin}
            disabled={otpLoading}
            className="w-full mt-3 py-2 px-4 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 text-[#07875B] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <KeyRound size={15} />
            <span>{otpLoading ? t('common.loading', 'Sending...') : t('auth.signInWithOtp', 'Sign In with One-Time Password (OTP)')}</span>
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{t('common.or', 'or')}</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <GoogleLoginButton role={activeRole} />

        <OtpVerificationModal
          isOpen={otpModalOpen}
          onClose={() => setOtpModalOpen(false)}
          identifier={otpTarget}
          purpose="LOGIN"
          onVerified={handleOtpVerified}
        />

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-6)' }}>
          {t('auth.dontHaveAccount', "Don't have an account?")}{' '}
          <Link to={activeRole === 'FPO' ? '/register?role=FPO' : '/register?role=FARMER'} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            {t('auth.createAccount', 'Create account')}
          </Link>
        </p>

        {/* Portal switch link */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
          Looking to purchase wholesale produce?{' '}
          <Link to="/buyer/login" className="font-bold text-[#07875B] hover:underline">
            Go to Buyer Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}
