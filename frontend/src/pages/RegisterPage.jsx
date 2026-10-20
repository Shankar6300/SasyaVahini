import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Alert from '../components/Alert';

const ROLES = [
  { value: 'FARMER',    label: 'Farmer',    emoji: '🌾', desc: 'I grow and sell produce' },
  { value: 'FPO',       label: 'FPO',       emoji: '🤝', desc: 'I represent a producer organization' },
  { value: 'BUYER',     label: 'Buyer',     emoji: '🏪', desc: 'I purchase produce in bulk' },
  { value: 'LOGISTICS', label: 'Logistics', emoji: '🚚', desc: 'I provide transport services' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetRole = searchParams.get('role');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: ROLES.find((r) => r.value === presetRole)?.value || '',
    preferredLocale: 'en',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.phone) errs.phone = 'Phone number is required';
    else if (!/^\+?[0-9]{10,15}$/.test(form.phone)) errs.phone = 'Enter a valid 10-15 digit phone number';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'At least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Must contain an uppercase letter';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Must contain a number';
    if (!form.role) errs.role = 'Please select a role';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e2) => ({ ...e2, [name]: '' }));
    setApiError('');
  };

  const handleRoleSelect = (role) => {
    setForm((f) => ({ ...f, role }));
    if (errors.role) setErrors((e2) => ({ ...e2, role: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      await register(form);
      setSuccess(true);
    } catch (err) {
      setApiError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>✅</div>
          <h1 className="auth-title">Account Created!</h1>
          <p className="auth-subtitle" style={{ marginBottom: 'var(--space-8)' }}>
            Your account is pending verification. You can sign in and explore the platform.
          </p>
          <Alert variant="info" className="mb-6">
            Account status: <strong>Pending Verification</strong>. An admin will review and activate your account.
          </Alert>
          <Button variant="primary" fullWidth onClick={() => navigate('/login')}>
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 'var(--space-12)' }}>
      <div className="auth-card" style={{ maxWidth: 520 }}>
        {/* Logo */}
        <div className="auth-logo">
          <Leaf size={28} color="#07875B" strokeWidth={2.5} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
            SasyaVahini
          </span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join the platform and start trading fairly</p>

        {apiError && <Alert variant="error" className="mb-6">{apiError}</Alert>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Role selector */}
          <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
            <label className="form-label required">I am a</label>
            <div className="role-grid">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  id={`role-${r.value.toLowerCase()}`}
                  className={`role-option${form.role === r.value ? ' selected' : ''}`}
                  onClick={() => handleRoleSelect(r.value)}
                  aria-pressed={form.role === r.value}
                >
                  <span className="role-option-icon" aria-hidden="true">{r.emoji}</span>
                  <span className="role-option-label">{r.label}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{r.desc}</span>
                </button>
              ))}
            </div>
            {errors.role && <span className="form-error" role="alert">{errors.role}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <FormField id="reg-name" label="Full name" name="name" required value={form.name} onChange={handleChange} error={errors.name} placeholder="Ramesh Kulkarni" />
            <FormField id="reg-email" label="Email address" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} error={errors.email} placeholder="you@example.com" />
            <FormField id="reg-phone" label="Mobile number" name="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={handleChange} error={errors.phone} placeholder="+919876543210" hint="With country code, e.g. +91 for India" />
            <FormField id="reg-password" label="Password" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={handleChange} error={errors.password} hint="Min 8 chars, one uppercase, one number" />

            <div className="form-group">
              <label htmlFor="reg-locale" className="form-label">Preferred language</label>
              <select id="reg-locale" name="preferredLocale" className="form-select" value={form.preferredLocale} onChange={handleChange}>
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading}
            className="mt-6"
            id="register-submit-btn"
          >
            Create Account
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
