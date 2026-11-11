import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Leaf,
  Truck,
  UserCheck,
  Building,
  UploadCloud,
  CheckCircle,
  FileText,
  ShieldCheck,
  Thermometer,
  Phone,
  CreditCard,
  Camera,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Alert from '../components/Alert';
import LanguageSelector from '../components/LanguageSelector';
import VoiceInput from '../components/VoiceInput';
import BuyerTypeSelector from '../components/buyer/BuyerTypeSelector';
import '../styles/buyer-auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetRole = searchParams.get('role');

  const ROLES = [
    { value: 'FARMER',    label: t('roles.farmer', 'Farmer'),    emoji: '🌾', desc: t('roles.farmerDesc', 'I grow and sell produce') },
    { value: 'FPO',       label: t('roles.fpo', 'FPO'),          emoji: '🤝', desc: t('roles.fpoDesc', 'I represent a producer organization') },
    { value: 'BUYER',     label: t('roles.buyer', 'Buyer'),      emoji: '🏪', desc: t('roles.buyerDesc', 'I purchase produce in bulk') },
    { value: 'LOGISTICS', label: t('roles.logistics', 'Logistics'), emoji: '🚚', desc: t('roles.logisticsDesc', 'I provide transport services') },
  ];

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: ROLES.find((r) => r.value === presetRole)?.value || 'FARMER',
    preferredLocale: i18n.language || 'en',

    // Farmer-specific attributes
    landSizeAcres: '2.5',
    state: 'Maharashtra',
    district: 'Pune',
    village: '',
    produceTypes: 'Tomato, Onion',

    // Buyer-specific attributes
    organizationName: '',
    buyerType: 'Wholesaler',
    gstNumber: '',
    deliveryAddress: '',

    // FPO-specific attributes
    fpoName: '',
    registrationNo: '',
    memberCount: '25',

    // Transport Partner Sub-Roles: "DRIVER" | "VEHICLE_OWNER" | "FLEET_OPERATOR"
    partnerType: 'VEHICLE_OWNER',
    ownerName: '',
    dob: '1992-06-14',
    residentialAddress: 'Flat 402, Shivajinagar, Pune',
    pincode: '411005',
    emergencyContactName: 'Suresh Patil',
    emergencyContactPhone: '+919822001122',
    profilePhotoUrl: '',

    // Driving Licence Details
    drivingLicenceNo: 'MH-12-20160089124',
    licenceExpiry: '2032-12-31',
    permittedClasses: ['LMV', 'LMV-TR'],
    licenceFrontUrl: '',
    licenceBackUrl: '',

    // Fleet / Transport Company attributes
    companyName: '',
    licenseNo: '',
    businessRegNo: 'CIN-U60200PN2021PTC198822',
    panNumber: 'AABCS1234D',
    gstin: '27AABCS1234D1ZP',
    businessCertUrl: '',
    ownershipType: 'Individual',
    contactPerson: '',

    // Payout / Bank Account Info
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',

    // Vehicle Specifications (Added inside the portal after onboarding)
    vehicleNumber: '',
    make: '',
    model: '',
    manufacturingYear: '',
    category: '',
    fuelType: '',
    capacityKg: '',
    gvwKg: '',
    mileageKmpl: '',
    dimensions: '',
    baseHub: '',
    serviceDistricts: '',
    isRefrigerated: false,
    minTempC: '10',
    maxTempC: '16',

    // Vehicle Photographs
    photoFrontUrl: '',
    photoRearUrl: '',
    photoSideUrl: '',

    // Vehicle Document Uploads
    rcNumber: '',
    rcExpiry: '',
    rcDocUrl: '',
    insuranceNumber: '',
    insuranceExpiry: '',
    insuranceDocUrl: '',
    fitnessNumber: '',
    fitnessExpiry: '',
    fitnessDocUrl: '',
    permitNumber: '',
    permitExpiry: '',
    permitDocUrl: '',
    pucNumber: '',
    pucExpiry: '',
    pucDocUrl: '',
    taxNumber: '',
    taxExpiry: '',
    taxDocUrl: '',
  });

  // Mobile OTP verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');

  const [errors, setErrors] = useState({});
  const [buyerSubtype, setBuyerSubtype] = useState('consumer');
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // File upload simulation / Base64 converter
  const handleFileUpload = (fieldName, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, [fieldName]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const togglePermittedClass = (cls) => {
    setForm((prev) => {
      const current = prev.permittedClasses || [];
      if (current.includes(cls)) {
        return { ...prev, permittedClasses: current.filter((c) => c !== cls) };
      } else {
        return { ...prev, permittedClasses: [...current, cls] };
      }
    });
  };

  const handleSendOtp = () => {
    if (!form.phone || form.phone.length < 10) {
      setOtpError('Please enter a valid mobile number first.');
      return;
    }
    setOtpSent(true);
    setOtpCode('492810'); // Auto-fill sample test OTP for frictionless experience
    setOtpError('');
  };

  const handleVerifyOtp = () => {
    if (otpCode === '492810' || otpCode.length === 6) {
      setOtpVerified(true);
      setOtpError('');
    } else {
      setOtpError('Invalid OTP. Please enter 492810');
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.length < 2) errs.name = t('auth.nameRequired', 'Name must be at least 2 characters');
    if (!form.email) errs.email = t('auth.emailRequired', 'Email is required');
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = t('auth.invalidEmail', 'Invalid email');
    if (!form.phone) errs.phone = t('auth.phoneRequired', 'Phone number is required');
    else if (!/^\+?[0-9]{10,15}$/.test(form.phone)) errs.phone = t('auth.phoneInvalid', 'Enter a valid 10-15 digit phone number');
    if (!form.password) errs.password = t('auth.passwordRequired', 'Password is required');
    else if (form.password.length < 8) errs.password = t('auth.passwordLength', 'At least 8 characters');
    else if (!/[A-Z]/.test(form.password)) errs.password = t('auth.passwordUpper', 'Must contain an uppercase letter');
    else if (!/[0-9]/.test(form.password)) errs.password = t('auth.passwordNumber', 'Must contain a number');
    if (!form.role) errs.role = t('auth.selectRole', 'Please select a role');

    // Role-specific validation
    if (form.role === 'FARMER') {
      if (!form.district.trim()) errs.district = t('auth.districtRequired', 'District is required for farmers');
    } else if (form.role === 'BUYER') {
      if (buyerSubtype === 'business' && !form.organizationName.trim()) {
        errs.organizationName = t('auth.orgNameRequired', 'Company / Business name is required for business buyers');
      }
    } else if (form.role === 'FPO') {
      if (!form.fpoName.trim()) errs.fpoName = t('auth.fpoNameRequired', 'FPO organization name is required');
    } else if (form.role === 'LOGISTICS') {
      if (form.partnerType === 'FLEET_OPERATOR' && !form.companyName.trim()) {
        errs.companyName = 'Fleet enterprise / Company name is required';
      }
    }

    return errs;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
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
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      const el = document.getElementById(`reg-${firstKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      // Build documents payload for logistics
      const documentsPayload = [];
      if (form.rcDocUrl || form.rcNumber) {
        documentsPayload.push({
          docType: 'RC',
          docNumber: form.rcNumber,
          fileUrl: form.rcDocUrl || 'https://storage.sasyavahini.gov.in/docs/sample_rc.pdf',
          expiryDate: form.rcExpiry,
        });
      }
      if (form.insuranceDocUrl || form.insuranceNumber) {
        documentsPayload.push({
          docType: 'INSURANCE',
          docNumber: form.insuranceNumber,
          fileUrl: form.insuranceDocUrl || 'https://storage.sasyavahini.gov.in/docs/sample_insurance.pdf',
          expiryDate: form.insuranceExpiry,
        });
      }
      if (form.fitnessDocUrl || form.fitnessNumber) {
        documentsPayload.push({
          docType: 'FITNESS',
          docNumber: form.fitnessNumber,
          fileUrl: form.fitnessDocUrl || 'https://storage.sasyavahini.gov.in/docs/sample_fitness.pdf',
          expiryDate: form.fitnessExpiry,
        });
      }
      if (form.permitDocUrl || form.permitNumber) {
        documentsPayload.push({
          docType: 'PERMIT',
          docNumber: form.permitNumber,
          fileUrl: form.permitDocUrl || 'https://storage.sasyavahini.gov.in/docs/sample_permit.pdf',
          expiryDate: form.permitExpiry,
        });
      }
      if (form.pucDocUrl || form.pucNumber) {
        documentsPayload.push({
          docType: 'PUC',
          docNumber: form.pucNumber,
          fileUrl: form.pucDocUrl || 'https://storage.sasyavahini.gov.in/docs/sample_puc.pdf',
          expiryDate: form.pucExpiry,
        });
      }
      if (form.taxDocUrl || form.taxNumber) {
        documentsPayload.push({
          docType: 'ROAD_TAX',
          docNumber: form.taxNumber,
          fileUrl: form.taxDocUrl || 'https://storage.sasyavahini.gov.in/docs/sample_tax.pdf',
          expiryDate: form.taxExpiry,
        });
      }

      const photoList = [form.photoFrontUrl, form.photoRearUrl, form.photoSideUrl].filter(Boolean);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
        district: form.district.trim(),
        state: form.state.trim(),
        partnerType: form.partnerType,
        ownerName: form.ownerName,
        dob: form.dob,
        emergencyContact: form.emergencyContact,
        profilePhotoUrl: form.profilePhotoUrl,
        drivingLicenceNo: form.drivingLicenceNo,
        licenceExpiry: form.licenceExpiry,
        permittedClasses: form.permittedClasses,
        licenceFrontUrl: form.licenceFrontUrl,
        licenceBackUrl: form.licenceBackUrl,
        panNumber: form.panNumber,
        gstin: form.gstin,
        businessRegNo: form.businessRegNo,
        businessCertUrl: form.businessCertUrl,
        ownershipType: form.ownershipType,
        accountHolderName: form.accountHolderName?.trim() || undefined,
        bankName: form.bankName?.trim() || undefined,
        accountNumber: form.accountNumber?.trim() || undefined,
        ifscCode: form.ifscCode?.trim() || undefined,
        vehicleNumber: form.vehicleNumber?.trim() ? form.vehicleNumber.trim().toUpperCase() : undefined,
        vehicleType: form.vehicleType?.trim() || undefined,
        make: form.make?.trim() || undefined,
        model: form.model?.trim() || undefined,
        category: form.category?.trim() || undefined,
        fuelType: form.fuelType?.trim() || undefined,
        dimensions: form.dimensions?.trim() || undefined,
        isRefrigerated: form.isRefrigerated,
        baseHub: form.baseHub,
        capacityKg: form.capacityKg ? parseFloat(form.capacityKg) : undefined,
        gvwKg: form.gvwKg ? parseFloat(form.gvwKg) : undefined,
        mileageKmpl: form.mileageKmpl ? parseFloat(form.mileageKmpl) : undefined,
        manufacturingYear: form.manufacturingYear ? parseInt(form.manufacturingYear, 10) : undefined,
        minTempC: form.isRefrigerated && form.minTempC !== '' ? parseFloat(form.minTempC) : undefined,
        maxTempC: form.isRefrigerated && form.maxTempC !== '' ? parseFloat(form.maxTempC) : undefined,
        photoUrls: photoList.length > 0 ? photoList : undefined,
        documents: documentsPayload.length > 0 ? documentsPayload : undefined,
        companyName: form.companyName?.trim() || undefined,
        licenseNo: form.drivingLicenceNo?.trim() || form.licenseNo?.trim() || undefined,
        serviceDistricts: form.serviceDistricts?.trim() || undefined,
        fpoName: form.fpoName?.trim() || undefined,
        registrationNo: form.registrationNo?.trim() || undefined,
        landSizeAcres: form.landSizeAcres ? parseFloat(form.landSizeAcres) : undefined,
        memberCount: form.memberCount ? parseInt(form.memberCount, 10) : undefined,
      };

      if (form.role === 'BUYER') {
        if (buyerSubtype === 'consumer') {
          payload.organizationName = form.organizationName?.trim() || `${form.name.trim()} (Individual)`;
          payload.buyerType = 'Consumer';
          payload.gstNumber = undefined;
        } else {
          payload.organizationName = form.organizationName?.trim() || `${form.name.trim()} Enterprise`;
          payload.buyerType = form.buyerType || 'Wholesaler';
          payload.gstNumber = form.gstNumber?.trim() || undefined;
        }
      }

      await register(payload);
      setSuccess(true);
    } catch (err) {
      setApiError(err.message || t('auth.registerFailed', 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: 560 }}>
          <div style={{ fontSize: 52, marginBottom: 'var(--space-4)' }}>🎉</div>
          <h1 className="auth-title">
            {form.role === 'LOGISTICS' ? 'Transport Partner Onboarding Submitted!' : t('auth.accountCreated', 'Account Created!')}
          </h1>
          <p className="auth-subtitle" style={{ marginBottom: 'var(--space-6)' }}>
            {form.role === 'LOGISTICS'
              ? `Your commercial vehicle (${form.vehicleNumber || 'Registered Fleet'}) and driver credentials have been submitted for DoCA document verification.`
              : t('auth.pendingReview', 'Your account is pending verification. You can sign in and explore the platform.')}
          </p>

          {form.role === 'LOGISTICS' && (
            <div className="p-4 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-left text-xs text-emerald-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800 text-sm">
                <CheckCircle size={16} /> Commercial Fleet Registered in Platform
              </div>
              <div>• <strong>Vehicle:</strong> {form.make} {form.model} ({form.vehicleNumber})</div>
              <div>• <strong>Category:</strong> {form.category} • <strong>Payload:</strong> {form.capacityKg} kg</div>
              <div>• <strong>Status:</strong> Active in Logistics Operations & Queued for DoCA Verification</div>
            </div>
          )}

          <Alert variant="info" className="mb-6 text-left">
            {t('auth.reviewStatus', 'Account status: Pending Verification. An administrator will review and verify your uploaded certificates.')}
          </Alert>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                if (form.role === 'BUYER') navigate('/buyer/login');
                else if (form.role === 'LOGISTICS') navigate('/logistics/login');
                else navigate('/login');
              }}
            >
              {form.role === 'BUYER' ? 'Sign In to Buyer Portal' : form.role === 'LOGISTICS' ? 'Sign In to Fleet Center' : t('auth.goToLogin', 'Go to Sign In')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isLogistics = form.role === 'LOGISTICS';

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
      <div className="auth-card relative" style={{ maxWidth: isLogistics ? 560 : 520, width: '100%', transition: 'all 0.3s ease' }}>
        {/* Language selector in top-right */}
        <div className="flex justify-end mb-3">
          <LanguageSelector />
        </div>

        {/* Logo */}
        <div className="auth-logo">
          <Leaf size={28} color="#07875B" strokeWidth={2.5} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
            SasyaVahini
          </span>
        </div>

        <h1 className="auth-title">
          {isLogistics ? 'Transport Partner & Fleet Registration' : t('auth.registerTitle', 'Create your account')}
        </h1>
        <p className="auth-subtitle">
          {isLogistics
            ? 'Register as an individual driver, vehicle owner, or transport fleet company.'
            : t('auth.registerSubtitle', 'Join the platform and start trading fairly')}
        </p>

        {apiError && <Alert variant="error" className="mb-6">{apiError}</Alert>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Main Role selector */}
          <div className="form-group mb-5">
            <label className="form-label required">{t('auth.iAmA', 'I am registering as')}</label>
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

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* LOGISTICS SPECIFIC: 3 Sub-Roles Selector                            */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {isLogistics && (
            <div className="mb-6 p-4 rounded-xl bg-teal-50/70 border border-teal-200">
              <label className="text-xs font-bold uppercase tracking-wider text-teal-900 block mb-2">
                🚚 Select Transport Partner Classification
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* 1. Driver */}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, partnerType: 'DRIVER' }))}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    form.partnerType === 'DRIVER'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-teal-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck size={18} />
                    <span className="font-bold text-sm">Individual Driver</span>
                  </div>
                  <p className={`text-[11px] leading-tight ${form.partnerType === 'DRIVER' ? 'text-teal-100' : 'text-gray-500'}`}>
                    Drives a commercial vehicle owned by another owner or fleet operator.
                  </p>
                </button>

                {/* 2. Vehicle Owner */}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, partnerType: 'VEHICLE_OWNER' }))}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    form.partnerType === 'VEHICLE_OWNER'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-teal-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Truck size={18} />
                    <span className="font-bold text-sm">Vehicle Owner</span>
                  </div>
                  <p className={`text-[11px] leading-tight ${form.partnerType === 'VEHICLE_OWNER' ? 'text-teal-100' : 'text-gray-500'}`}>
                    Owns one or multiple goods vehicles used for farm freight and mandi transit.
                  </p>
                </button>

                {/* 3. Fleet Operator */}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, partnerType: 'FLEET_OPERATOR' }))}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    form.partnerType === 'FLEET_OPERATOR'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-teal-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Building size={18} />
                    <span className="font-bold text-sm">Fleet Operator</span>
                  </div>
                  <p className={`text-[11px] leading-tight ${form.partnerType === 'FLEET_OPERATOR' ? 'text-teal-100' : 'text-gray-500'}`}>
                    Commercial transport company managing multiple trucks, depots, and drivers.
                  </p>
                </button>
              </div>

              {form.partnerType === 'FLEET_OPERATOR' && (
                <div className="mt-3 pt-3 border-t border-teal-200">
                  <FormField
                    id="reg-company-name"
                    label="Fleet Enterprise / Company Name *"
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    error={errors.companyName}
                    placeholder="e.g. Sahyadri Agro Freight Pvt Ltd"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* Basic User Account Fields                                           */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <FormField
                    id="reg-name"
                    label={
                      isLogistics && form.partnerType === 'FLEET_OPERATOR'
                        ? 'Contact Person Full Name *'
                        : isLogistics && form.partnerType === 'VEHICLE_OWNER'
                        ? 'Vehicle Owner Full Name *'
                        : t('auth.fullName', 'Full name *')
                    }
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="e.g. Ramesh Shinde"
                  />
                </div>
                <div className="pt-6">
                  <VoiceInput
                    onResult={(transcript) => setForm((f) => ({ ...f, name: transcript }))}
                    title="Speak your full name"
                  />
                </div>
              </div>

              <FormField
                id="reg-email"
                label={t('auth.email', 'Email address *')}
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="partner@sasyavahini.in"
              />
            </div>

            {/* Mobile Number & OTP Verification with Voice Support */}
            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
                <div className="flex-1">
                  <FormField
                    id="reg-phone"
                    label={t('auth.phone', 'Mobile Number for OTP Verification *')}
                    name="phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="+919876543210"
                    hint="Active mobile number used for driver dispatch alerts & SMS OTP"
                  />
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <VoiceInput
                    onResult={(transcript) => {
                      const cleaned = transcript.replace(/[^0-9+]/g, '');
                      setForm(f => ({ ...f, phone: cleaned || transcript }));
                    }}
                    title={t('auth.speakPhoneNumber', 'Speak your phone number')}
                  />
                  {!otpVerified ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap"
                    >
                      {otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 rounded-lg whitespace-nowrap">
                      <CheckCircle size={14} /> Mobile Verified
                    </span>
                  )}
                </div>
              </div>

              {otpSent && !otpVerified && (
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-2 text-xs">
                  <span className="text-emerald-800 font-medium">Enter 6-digit OTP:</span>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="w-28 px-2 py-1 text-center font-mono font-bold tracking-widest text-sm bg-white border rounded"
                    placeholder="492810"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="px-3 py-1 bg-emerald-700 text-white font-bold rounded text-xs hover:bg-emerald-800"
                  >
                    Verify
                  </button>
                  <span className="text-secondary text-[11px]">(Demo code: 492810)</span>
                </div>
              )}
              {otpError && <p className="text-xs text-red-600 font-medium">{otpError}</p>}
            </div>

            <FormField
              id="reg-password"
              label={t('auth.password', 'Password *')}
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              hint={t('auth.passwordHint', 'Min 8 chars, one uppercase, one number')}
            />

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* FARMER SECTION (Preserved)                                        */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {form.role === 'FARMER' && (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">🌾 {t('auth.farmDetailsTitle', 'Farm & Location Details')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    id="reg-village"
                    label={t('auth.villageLabel', 'Village / Taluka')}
                    name="village"
                    value={form.village}
                    onChange={handleChange}
                    placeholder={t('auth.villagePlaceholder', 'e.g. Manchar')}
                  />
                  <FormField
                    id="reg-district"
                    label={`${t('auth.districtLabel', 'District')} *`}
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    error={errors.district}
                    placeholder={t('auth.districtPlaceholder', 'e.g. Pune')}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    id="reg-land"
                    label={t('auth.landSizeLabel', 'Land Holding (Acres)')}
                    name="landSizeAcres"
                    type="number"
                    step="0.5"
                    value={form.landSizeAcres}
                    onChange={handleChange}
                    placeholder={t('auth.landSizePlaceholder', 'e.g. 2.5')}
                  />
                  <FormField
                    id="reg-crops"
                    label={t('auth.primaryCropsLabel', 'Primary Crops')}
                    name="produceTypes"
                    value={form.produceTypes}
                    onChange={handleChange}
                    placeholder={t('auth.primaryCropsPlaceholder', 'e.g. Tomato, Onion, Wheat')}
                  />
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* BUYER SECTION (Preserved)                                         */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {form.role === 'BUYER' && (
              <div className="space-y-4">
                <BuyerTypeSelector value={buyerSubtype} onChange={setBuyerSubtype} />

                {buyerSubtype === 'business' ? (
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-800">🏪 {t('auth.buyerDetailsTitle', 'Business & Procurement Details')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        id="reg-orgName"
                        label={`${t('auth.orgNameLabel', 'Firm / Company Name')} *`}
                        name="organizationName"
                        value={form.organizationName}
                        onChange={handleChange}
                        error={errors.organizationName}
                        placeholder={t('auth.orgNamePlaceholder', 'e.g. FreshB2B Wholesale Traders')}
                      />
                      <div className="form-group">
                        <label className="form-label">{t('auth.buyerCategoryLabel', 'Buyer Category')}</label>
                        <select
                          name="buyerType"
                          className="form-select"
                          value={form.buyerType}
                          onChange={handleChange}
                        >
                          <option value="Wholesaler">{t('auth.buyerWholesaler', 'Wholesaler / Distributor')}</option>
                          <option value="Supermarket">{t('auth.buyerSupermarket', 'Supermarket / Retail Chain')}</option>
                          <option value="Processor">{t('auth.buyerProcessor', 'Food Processor / Exporter')}</option>
                          <option value="Hotel">{t('auth.buyerHotel', 'Hotel / Restaurant Bulk Buyer')}</option>
                          <option value="Retailer">{t('auth.buyerRetailer', 'Local Retailer / Store')}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        id="reg-gst"
                        label={t('auth.gstLabel', 'GSTIN (Optional)')}
                        name="gstNumber"
                        value={form.gstNumber}
                        onChange={handleChange}
                        placeholder="27AAAAA0000A1Z5"
                      />
                      <FormField
                        id="reg-address"
                        label={t('auth.deliveryAddressLabel', 'Delivery Warehouse Address')}
                        name="deliveryAddress"
                        value={form.deliveryAddress}
                        onChange={handleChange}
                        placeholder={t('auth.deliveryAddressPlaceholder', 'e.g. APMC Market Yard, Hadapsar')}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">🛒 {t('auth.consumerProfileTitle', 'Consumer Profile Details')}</p>
                    <p className="text-xs text-slate-600">
                      {t('auth.consumerProfileDesc', 'Buying for home consumption or family produce orders. No GSTIN or company documents required.')}
                    </p>
                    <FormField
                      id="reg-address"
                      label={t('auth.deliveryAddressConsumerLabel', 'Delivery Address (Optional)')}
                      name="deliveryAddress"
                      value={form.deliveryAddress}
                      onChange={handleChange}
                      placeholder={t('auth.deliveryAddressConsumerPlaceholder', 'e.g. Flat 301, Lakeview Apts, Pune')}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* FPO SECTION (Preserved)                                           */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {form.role === 'FPO' && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">🤝 {t('auth.fpoDetailsTitle', 'FPO Producer Organization Details')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    id="reg-fpoName"
                    label={`${t('auth.fpoNameLabel', 'FPO Organization Name')} *`}
                    name="fpoName"
                    value={form.fpoName}
                    onChange={handleChange}
                    error={errors.fpoName}
                    placeholder={t('auth.fpoNamePlaceholder', 'e.g. Junnar Farmers Producer Co.')}
                  />
                  <FormField
                    id="reg-regNo"
                    label={`${t('auth.fpoRegNoLabel', 'Registration Number')} *`}
                    name="registrationNo"
                    value={form.registrationNo}
                    onChange={handleChange}
                    error={errors.registrationNo}
                    placeholder={t('auth.fpoRegNoPlaceholder', 'e.g. FPO-MH-2024-8842')}
                  />
                </div>
                <FormField
                  id="reg-members"
                  label={t('auth.memberCountLabel', 'Registered Member Farmers Count')}
                  name="memberCount"
                  type="number"
                  value={form.memberCount}
                  onChange={handleChange}
                  placeholder={t('auth.memberCountPlaceholder', '25')}
                />
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* LOGISTICS PROGRESSIVE ONBOARDING BANNER                           */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {isLogistics && (
              <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200 space-y-2">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                  <ShieldCheck size={18} className="text-teal-700" />
                  <span>Fast 30-Second Registration</span>
                </div>
                <p className="text-xs text-teal-800 leading-relaxed">
                  You do not need to upload your Driving Licence, RC, or commercial insurance right now. Once your account is created, you can submit your vehicle specifications and documents at your own pace inside the partner portal.
                </p>
                <div className="text-[11px] text-teal-700 font-medium">
                  🔒 <strong>Note:</strong> Farmer shipments are unlocked as soon as your submitted documents are verified by DoCA compliance officers.
                </div>
              </div>
            )}

            {/* Language Preference */}
            <div className="form-group pt-2">
              <label htmlFor="reg-locale" className="form-label">{t('auth.preferredLanguage', 'Preferred communication language')}</label>
              <select
                id="reg-locale"
                name="preferredLocale"
                className="form-select text-xs"
                value={form.preferredLocale}
                onChange={(e) => {
                  handleChange(e);
                  i18n.changeLanguage(e.target.value);
                }}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
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
            {isLogistics ? 'Complete Transport Partner Registration' : t('auth.createAccount', 'Create Account')}
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            {t('auth.signIn', 'Sign In')}
          </Link>
        </p>
      </div>
    </div>
  );
}
