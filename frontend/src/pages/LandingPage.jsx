import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, Truck, ShieldCheck, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: <TrendingUp size={24} />,
    title: 'Transparent Pricing',
    description: 'ML-powered demand forecasts and fair price recommendations eliminate information asymmetry for farmers.',
  },
  {
    icon: <Users size={24} />,
    title: 'FPO Aggregation',
    description: 'Small farmers combine supply through FPOs to satisfy large bulk buyer orders they could never fill individually.',
  },
  {
    icon: <Truck size={24} />,
    title: 'Route Optimization',
    description: 'OR-Tools CVRP minimizes multi-stop pickup routes, reducing logistics costs and time.',
  },
  {
    icon: <ShieldCheck size={24} />,
    title: 'Secure Payments',
    description: 'Escrow-style payment release tied to verified delivery — farmers are paid only after confirmed receipt.',
  },
];

const STEPS = [
  { label: 'Farmer lists produce with price and quantity.' },
  { label: 'Buyer posts requirement — matching engine finds top suppliers.' },
  { label: 'Farmer/FPO explicitly accepts allocation proposal.' },
  { label: 'Inventory is atomically reserved — no double-booking.' },
  { label: 'Logistics vehicle picks up from farms and delivers.' },
  { label: 'Buyer confirms delivery. Payment is released to farmer.' },
];

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-bg-pattern" aria-hidden="true" />
        <div className="hero-content">
          <span className="hero-tagline">🌱 SIH 2026 · Problem Statement 26033</span>
          <h1 id="hero-heading" className="hero-title">
            Farm to Market.<br />
            <span className="highlight">Fair for Everyone.</span>
          </h1>
          <p className="hero-subtitle">
            SasyaVahini connects farmers and FPOs directly with bulk buyers,
            bypassing intermediaries through transparent procurement, smart matching
            and verified delivery.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-lg" style={{
              background: 'white', color: 'var(--color-primary)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}>
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-lg btn-secondary" style={{
              borderColor: 'rgba(255,255,255,0.5)', color: 'white',
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="features-section" aria-labelledby="features-heading">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            <h2 id="features-heading" className="heading-2">
              How SasyaVahini Works
            </h2>
            <p className="body-lg text-secondary" style={{ marginTop: 'var(--space-4)', maxWidth: 560, margin: 'var(--space-4) auto 0' }}>
              A five-stage pipeline from prediction to settlement, eliminating up to four
              middleman layers.
            </p>
          </div>
          <div className="grid-4">
            {FEATURES.map((f) => (
              <article key={f.title} className="feature-card">
                <div className="feature-icon" aria-hidden="true">{f.icon}</div>
                <h3 className="heading-5" style={{ marginBottom: 'var(--space-3)' }}>{f.title}</h3>
                <p className="body-sm text-secondary">{f.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow Steps ────────────────────────────────────────────── */}
      <section className="steps-section" aria-labelledby="steps-heading">
        <div className="container" style={{ maxWidth: 720 }}>
          <h2 id="steps-heading" className="heading-2" style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            The Procurement Workflow
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {STEPS.map((step, i) => (
              <div key={i} className="step animate-fadeIn">
                <div className="step-number" aria-hidden="true">{i + 1}</div>
                <p className="body-lg" style={{ paddingTop: 'var(--space-2)' }}>{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles CTA ─────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--color-surface)', padding: 'var(--space-24) var(--space-6)' }} aria-labelledby="roles-heading">
        <div className="container">
          <h2 id="roles-heading" className="heading-2" style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            Built for Every Stakeholder
          </h2>
          <div className="grid-4">
            {[
              { role: 'FARMER', emoji: '🌾', title: 'Farmers', desc: 'List produce, accept allocation proposals, track payments.' },
              { role: 'FPO', emoji: '🤝', title: 'FPOs', desc: 'Aggregate member supply, manage bulk listings and payouts.' },
              { role: 'BUYER', emoji: '🏪', title: 'Buyers', desc: 'Post requirements, browse marketplace, confirm deliveries.' },
              { role: 'LOGISTICS', emoji: '🚚', title: 'Logistics', desc: 'Accept delivery assignments, upload proof, get paid.' },
            ].map((r) => (
              <div key={r.role} className="card card-interactive" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 'var(--space-4)' }} aria-hidden="true">{r.emoji}</div>
                <h3 className="heading-5" style={{ marginBottom: 'var(--space-3)' }}>{r.title}</h3>
                <p className="body-sm text-secondary" style={{ marginBottom: 'var(--space-5)' }}>{r.desc}</p>
                <Link to={`/register?role=${r.role}`} className="btn btn-secondary btn-sm btn-full">
                  Join as {r.title.slice(0, -1)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Disclaimer ────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--color-bg)', padding: 'var(--space-8) var(--space-6)', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
        <p className="caption">
          ⚠️ PROTOTYPE SIMULATION — SIH 2026 Demo. All data, prices and metrics displayed are for demonstration purposes only.
        </p>
      </div>
    </main>
  );
}
