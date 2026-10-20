import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Alert from '../components/Alert';

export default function LoginPage() {
  const { login } = useAuth();
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
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.password) errs.password = 'Password is required';
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
      const user = await login(form.email, form.password);
      const dest = from || ROLE_REDIRECTS[user.role] || '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setApiError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <Leaf size={32} color="#07875B" strokeWidth={2.5} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
            SasyaVahini
          </span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {apiError && (
          <Alert variant="error" className="mb-6">{apiError}</Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <FormField
              id="login-email"
              label="Email address"
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
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="Enter your password"
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
            Sign In
          </Button>
        </form>

        <div className="divider mt-6">or</div>

        {/* Demo credentials */}
        <details style={{ marginBottom: 'var(--space-4)' }}>
          <summary style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', userSelect: 'none' }}>
            Demo credentials (SIH prototype)
          </summary>
          <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
            <p style={{ marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>Password for all: <code>DemoPass1</code></p>
            {[
              ['Farmer',    'farmer@demo.sasyavahini.in'],
              ['FPO',       'fpo@demo.sasyavahini.in'],
              ['Buyer',     'buyer@demo.sasyavahini.in'],
              ['Logistics', 'logistics@demo.sasyavahini.in'],
              ['Admin',     'admin@demo.sasyavahini.in'],
            ].map(([role, email]) => (
              <button
                key={role}
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 2 }}
                onClick={() => setForm({ email, password: 'DemoPass1' })}
              >
                {role}: {email}
              </button>
            ))}
          </div>
        </details>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
