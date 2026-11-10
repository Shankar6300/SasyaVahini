import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import marketplaceApi from '@/services/marketplaceApi';
import ProductCard from '@/components/buyer/marketplace/ProductCard';
import {
  Building2, User, CheckCircle, ShieldCheck, MapPin, Users,
  Leaf, ChevronLeft, AlertTriangle, Layers, Calendar
} from 'lucide-react';
import '@/styles/marketplace.css';

export default function SupplierProfilePage({ supplierId: propSupplierId }) {
  const params = useParams();
  const location = useLocation();
  const supplierId =
    propSupplierId ||
    params.supplierId ||
    (location.pathname.includes('/suppliers/')
      ? location.pathname.split('/suppliers/')[1]?.split('?')[0]?.split('/')[0]
      : null);
  const { user } = useAuth();

  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSupplierData() {
      try {
        setIsLoading(true);
        setError(null);
        const [prof, prods] = await Promise.all([
          marketplaceApi.getSupplierProfile(supplierId),
          marketplaceApi.getSupplierProducts(supplierId),
        ]);

        if (isMounted) {
          if (prof) {
            setSupplier(prof);
            setProducts(prods.products || []);
          } else {
            setError('Supplier profile not found.');
          }
        }
      } catch (err) {
        if (isMounted) setError('Failed to load supplier details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (supplierId) {
      loadSupplierData();
      window.scrollTo(0, 0);
    } else {
      setIsLoading(false);
      setError('Supplier ID not found in URL.');
    }

    return () => { isMounted = false; };
  }, [supplierId]);

  if (isLoading) {
    return (
      <div className="marketplace-container" style={{ padding: '40px 0' }}>
        <div className="marketplace-skeleton-card" style={{ height: 320 }} />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="marketplace-container" style={{ padding: '60px 0' }}>
        <div className="marketplace-empty-state">
          <AlertTriangle size={36} className="text-amber-600 mb-3" />
          <h2 className="text-lg font-bold text-[#202820] mb-2">{error || 'Supplier not found'}</h2>
          <p className="text-xs text-[#68736B] mb-5">The requested supplier profile is not available or inactive.</p>
          <Link to="/buyer/marketplace" className="buyer-btn buyer-btn-primary">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const {
    name,
    type,
    registrationNumber,
    memberCount,
    state,
    district,
    isVerified,
    acreage,
    joinedDate,
    description,
  } = supplier;

  const isFpo = type === 'FPO';
  const buyerType = user?.buyerProfile?.buyerType || 'INDIVIDUAL';

  return (
    <div className="marketplace-container">
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs text-[#68736B] mb-6 font-medium" aria-label="Breadcrumb">
        <Link to="/buyer/marketplace" className="hover:text-[#245C43] flex items-center gap-1">
          <ChevronLeft size={14} />
          <span>Marketplace</span>
        </Link>
        <span>/</span>
        <span className="text-[#68736B]">Suppliers</span>
        <span>/</span>
        <span className="text-[#202820] font-bold">{name}</span>
      </nav>

      {/* ── Supplier Hero Banner ────────────────────────────────────── */}
      <header className="supplier-banner">
        <div className="supplier-banner-info">
          <div className="supplier-banner-avatar">
            {isFpo ? <Building2 size={36} /> : <User size={36} />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 text-[#E8F0E8] border border-white/30">
                {isFpo ? 'Farmer Producer Organization' : 'Direct Farmer'}
              </span>
              {isVerified && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-400/40">
                  <CheckCircle size={12} />
                  <span>Verified Producer</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-white">{name}</h1>
            <p className="text-xs text-[#E8F0E8] flex items-center gap-1 mt-1">
              <MapPin size={13} className="text-emerald-300" />
              <span>{district ? `${district}, ` : ''}{state || 'India'}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-[#E8F0E8] block">Active Produce Lots</span>
          <span className="text-3xl font-black text-[#C7A96B]">{products.length}</span>
        </div>
      </header>

      {/* ── Trust & Verification Cards ───────────────────────────────── */}
      <div className="supplier-trust-grid">
        <div className="supplier-trust-card">
          <div className="supplier-trust-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-[#68736B]">Registration & Legal</p>
            <p className="text-sm font-bold text-[#202820]">
              {registrationNumber || (isFpo ? 'Registered Cooperative' : 'Aadhaar Verified')}
            </p>
          </div>
        </div>

        {isFpo && memberCount && (
          <div className="supplier-trust-card">
            <div className="supplier-trust-icon">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs text-[#68736B]">Farmer Collective Members</p>
              <p className="text-sm font-bold text-[#202820]">
                {memberCount.toLocaleString('en-IN')} Smallholders
              </p>
            </div>
          </div>
        )}

        {!isFpo && acreage && (
          <div className="supplier-trust-card">
            <div className="supplier-trust-icon">
              <Leaf size={20} />
            </div>
            <div>
              <p className="text-xs text-[#68736B]">Cultivated Acreage</p>
              <p className="text-sm font-bold text-[#202820]">{acreage} Acres</p>
            </div>
          </div>
        )}

        <div className="supplier-trust-card">
          <div className="supplier-trust-icon">
            <Leaf size={20} />
          </div>
          <div>
            <p className="text-xs text-[#68736B]">Sourcing Transparency</p>
            <p className="text-sm font-bold text-emerald-800">100% Direct to Farmer</p>
          </div>
        </div>
      </div>

      {/* ── Supplier's Active Produce Catalog ────────────────────────── */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#202820]">Active Produce Listings from {name}</h2>
            <p className="text-xs text-[#68736B]">Verified farm batches available for direct procurement.</p>
          </div>
          <span className="text-xs font-semibold text-[#68736B]">{products.length} Lots Available</span>
        </div>

        {products.length === 0 ? (
          <div className="marketplace-empty-state">
            <Leaf size={32} className="text-[#245C43] mb-2" />
            <h3 className="text-sm font-bold text-[#202820] mb-1">No active listings currently</h3>
            <p className="text-xs text-[#68736B]">
              This supplier has no available batches at the moment. Check back soon after the next harvest!
            </p>
          </div>
        ) : (
          <div className="marketplace-product-grid">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                buyerType={buyerType}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
