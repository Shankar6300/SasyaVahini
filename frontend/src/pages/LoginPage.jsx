import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Alert from '../components/Alert';
import LanguageSelector from '../components/LanguageSelector';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

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

        <h1 className="auth-title">🌾 {t('auth.farmerLoginTitle', 'Farmer & Partner Portal')}</h1>
        <p className="auth-subtitle">{t('auth.farmerLoginSubtitle', 'Sign in to access your farm dashboard, listings, and orders')}</p>

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
        </form>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-6)' }}>
          {t('auth.dontHaveAccount', "Don't have an account?")}{' '}
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
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
