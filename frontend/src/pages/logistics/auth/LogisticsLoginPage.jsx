import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Truck, ShieldCheck, MapPin, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import FormField from '../../../components/FormField';
import Button from '../../../components/Button';
import Alert from '../../../components/Alert';
import LanguageSelector from '../../../components/LanguageSelector';

export default function LogisticsLoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/logistics';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = t('auth.emailRequired', 'Email is required');
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = t('auth.invalidEmail', 'Invalid email address');
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
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      const user = await login(form.email, form.password);
      if (user.role !== 'LOGISTICS' && user.role !== 'ADMIN') {
        setApiError('Access restricted: This portal is for Logistics Providers and Fleet Dispatchers.');
        return;
      }
      navigate('/logistics', { replace: true });
    } catch (err) {
      setApiError(err.message || 'Login failed. Please verify your credentials.');
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
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center text-white mb-2 shadow-md">
            <Truck size={26} strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: '#064E3B' }}>
            SasyaVahini Logistics
          </span>
        </div>

        <h1 className="auth-title">🚚 Logistics & Fleet Center</h1>
        <p className="auth-subtitle">Sign in to dispatch multi-stop routes, monitor drivers, and track cold-chain freight.</p>

        {apiError && <Alert variant="error" className="mb-6">{apiError}</Alert>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <FormField
              id="logistics-email"
              label="Fleet Operator / Driver Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="dispatch@fleet.sasyavahini.in"
            />
            <FormField
              id="logistics-password"
              label="Password"
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
            id="logistics-login-submit"
          >
            Access Operations Center
          </Button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-6)' }}>
          New transport partner?{' '}
          <Link to="/register?role=LOGISTICS" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Register your fleet
          </Link>
        </p>

        {/* Portal switch pills */}
        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2 text-center text-xs text-slate-600">
          <Link to="/login" className="flex-1 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700">
            🌾 Farmer Portal →
          </Link>
          <Link to="/buyer/login" className="flex-1 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700">
            🛒 Buyer Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}

