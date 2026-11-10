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
    bankName: 'State Bank of India',
    accountNumber: '394810294819',
    ifscCode: 'SBIN0001423',

    // Vehicle Specifications
    vehicleNumber: 'MH-14-AZ-8899',
    make: 'Tata',
    model: 'Intra V30',
    manufacturingYear: '2023',
    category: 'SCV', // "SCV" | "MCV" | "HCV"
    fuelType: 'DIESEL', // "DIESEL" | "PETROL" | "CNG" | "ELECTRIC"
    capacityKg: '1500',
    gvwKg: '2565',
    mileageKmpl: '14.5',
    dimensions: '8.8ft x 5.3ft x 5.0ft',
    baseHub: 'Chakan Agri Logistics Hub',
    serviceDistricts: 'Pune, Nashik, Ahmednagar',
    isRefrigerated: false,
    minTempC: '10',
    maxTempC: '16',

    // Vehicle Photographs
    photoFrontUrl: '',
    photoRearUrl: '',
    photoSideUrl: '',

    // Mandatory Vehicle Document Uploads
    rcNumber: 'MH-14-AZ-8899-RC',
    rcExpiry: '2038-04-10',
    rcDocUrl: '',
    insuranceNumber: 'NIC-COMM-8892147',
    insuranceExpiry: '2027-03-31',
    insuranceDocUrl: '',
    fitnessNumber: 'MH-FIT-2024-551',
    fitnessExpiry: '2026-08-20',
    fitnessDocUrl: '',
    permitNumber: 'MH-AITP-9921',
    permitExpiry: '2029-01-15',
    permitDocUrl: '',
    pucNumber: 'PUC-MH-2024-9988',
    pucExpiry: '2025-11-30',
    pucDocUrl: '',
    taxNumber: 'MH-TAX-2024-001',
    taxExpiry: '2026-12-31',
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
      if (form.partnerType === 'DRIVER') {
        if (!form.drivingLicenceNo.trim()) errs.drivingLicenceNo = 'Driving licence number is required';
      } else if (form.partnerType === 'VEHICLE_OWNER') {
        if (!form.vehicleNumber.trim()) errs.vehicleNumber = 'Vehicle registration number is required';
        if (!form.capacityKg || Number(form.capacityKg) <= 0) errs.capacityKg = 'Valid payload capacity is required';
      } else if (form.partnerType === 'FLEET_OPERATOR') {
        if (!form.companyName.trim()) errs.companyName = 'Fleet operator enterprise name is required';
        if (!form.vehicleNumber.trim()) errs.vehicleNumber = 'Primary vehicle registration number is required';
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
        accountHolderName: form.accountHolderName,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode,
        vehicleNumber: form.vehicleNumber,
        vehicleType: form.vehicleType,
        make: form.make,
        model: form.model,
        category: form.category,
        fuelType: form.fuelType,
        dimensions: form.dimensions,
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
      <div className="auth-card relative" style={{ maxWidth: isLogistics ? 780 : 520, width: '100%', transition: 'all 0.3s ease' }}>
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
            {/* LOGISTICS ENRICHED MODULE: DRIVER, OWNER, FLEET OPERATOR          */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {isLogistics && (
              <div className="space-y-5">
                {/* ── Sub-Role A: INDIVIDUAL DRIVER SPECIFICS ── */}
                {form.partnerType === 'DRIVER' && (
                  <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <UserCheck size={20} className="text-sky-700" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                        Driver Licence & Personal Credentials
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        id="reg-dob"
                        label="Date of Birth *"
                        name="dob"
                        type="date"
                        value={form.dob}
                        onChange={handleChange}
                      />
                      <FormField
                        id="reg-pincode"
                        label="Residential PIN Code *"
                        name="pincode"
                        value={form.pincode}
                        onChange={handleChange}
                        placeholder="e.g. 411005"
                      />
                    </div>

                    <FormField
                      id="reg-address"
                      label="Residential Street Address *"
                      name="residentialAddress"
                      value={form.residentialAddress}
                      onChange={handleChange}
                      placeholder="e.g. House No. 24, Near Gram Panchayat, Chakan"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        id="reg-emerg-name"
                        label="Emergency Contact Person *"
                        name="emergencyContactName"
                        value={form.emergencyContactName}
                        onChange={handleChange}
                        placeholder="e.g. Brother / Spouse Name"
                      />
                      <FormField
                        id="reg-emerg-phone"
                        label="Emergency Mobile Number *"
                        name="emergencyContactPhone"
                        value={form.emergencyContactPhone}
                        onChange={handleChange}
                        placeholder="+919800000000"
                      />
                    </div>

                    {/* Driving Licence Section */}
                    <div className="p-3 bg-white rounded-lg border border-sky-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                          id="reg-dl-no"
                          label="Commercial Driving Licence No. *"
                          name="drivingLicenceNo"
                          value={form.drivingLicenceNo}
                          onChange={handleChange}
                          error={errors.drivingLicenceNo}
                          placeholder="e.g. MH-12-20160089124"
                        />
                        <FormField
                          id="reg-dl-exp"
                          label="Licence Expiry Date *"
                          name="licenceExpiry"
                          type="date"
                          value={form.licenceExpiry}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Permitted Vehicle Classes */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                          Permitted Commercial Vehicle Classes
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['LMV', 'LMV-TR', 'HGMV', 'HTV', 'HPMV'].map((cls) => (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => togglePermittedClass(cls)}
                              className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors ${
                                form.permittedClasses.includes(cls)
                                  ? 'bg-sky-600 text-white border-sky-600'
                                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                              }`}
                            >
                              {cls} {form.permittedClasses.includes(cls) ? '✓' : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Driving Licence Image Uploads */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="border-2 border-dashed border-sky-300 rounded-lg p-3 text-center bg-sky-50/50">
                          <UploadCloud size={20} className="mx-auto text-sky-600 mb-1" />
                          <p className="text-xs font-bold text-gray-800">Licence Front Photo *</p>
                          <p className="text-[10px] text-secondary mb-2">JPG, PNG or PDF (Max 5MB)</p>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload('licenceFrontUrl', e.target.files[0])}
                            className="text-[11px] text-gray-600 w-full"
                          />
                          {form.licenceFrontUrl && (
                            <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700">
                              ✓ Front Uploaded
                            </span>
                          )}
                        </div>

                        <div className="border-2 border-dashed border-sky-300 rounded-lg p-3 text-center bg-sky-50/50">
                          <UploadCloud size={20} className="mx-auto text-sky-600 mb-1" />
                          <p className="text-xs font-bold text-gray-800">Licence Back Photo *</p>
                          <p className="text-[10px] text-secondary mb-2">JPG, PNG or PDF (Max 5MB)</p>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload('licenceBackUrl', e.target.files[0])}
                            className="text-[11px] text-gray-600 w-full"
                          />
                          {form.licenceBackUrl && (
                            <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700">
                              ✓ Back Uploaded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Sub-Role C: FLEET OPERATOR SPECIFICS ── */}
                {form.partnerType === 'FLEET_OPERATOR' && (
                  <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <Building size={20} className="text-purple-700" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                        Fleet Enterprise & Business Credentials
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        id="reg-companyName"
                        label="Logistics Company Name *"
                        name="companyName"
                        value={form.companyName}
                        onChange={handleChange}
                        error={errors.companyName}
                        placeholder="e.g. Sahyadri Agri Freight Logistics Pvt Ltd"
                      />
                      <FormField
                        id="reg-cin"
                        label="CIN / Business Registration No."
                        name="businessRegNo"
                        value={form.businessRegNo}
                        onChange={handleChange}
                        placeholder="CIN-U60200PN2021PTC198822"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        id="reg-pan"
                        label="Company PAN *"
                        name="panNumber"
                        value={form.panNumber}
                        onChange={handleChange}
                        placeholder="AABCS1234D"
                      />
                      <FormField
                        id="reg-gstin"
                        label="GSTIN *"
                        name="gstin"
                        value={form.gstin}
                        onChange={handleChange}
                        placeholder="27AABCS1234D1ZP"
                      />
                    </div>
                  </div>
                )}

                {/* ── BANK DETAILS (For Vehicle Owners & Fleet Operators) ── */}
                {(form.partnerType === 'VEHICLE_OWNER' || form.partnerType === 'FLEET_OPERATOR') && (
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-amber-800" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Freight Payment & Direct Bank Settlement Details
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        id="reg-acc-name"
                        label="Bank Account Holder Name *"
                        name="accountHolderName"
                        value={form.accountHolderName || form.name}
                        onChange={handleChange}
                        placeholder="As written in bank passbook"
                      />
                      <FormField
                        id="reg-bank-name"
                        label="Bank Name *"
                        name="bankName"
                        value={form.bankName}
                        onChange={handleChange}
                        placeholder="e.g. State Bank of India, HDFC Bank"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        id="reg-acc-no"
                        label="Account Number *"
                        name="accountNumber"
                        value={form.accountNumber}
                        onChange={handleChange}
                        placeholder="e.g. 394810294819"
                      />
                      <FormField
                        id="reg-ifsc"
                        label="IFSC Code *"
                        name="ifscCode"
                        value={form.ifscCode}
                        onChange={handleChange}
                        placeholder="e.g. SBIN0001423"
                      />
                    </div>
                  </div>
                )}

                {/* ═════════════════════════════════════════════════════════════ */}
                {/* 2. PRIMARY COMMERCIAL VEHICLE REGISTRATION                   */}
                {/* ═════════════════════════════════════════════════════════════ */}
                {(form.partnerType === 'VEHICLE_OWNER' || form.partnerType === 'FLEET_OPERATOR') && (
                  <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck size={20} className="text-teal-700" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                          Primary Commercial Goods Vehicle Specifications
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-200 text-teal-900">
                        Immediate Fleet Listing
                      </span>
                    </div>

                    {/* Vehicle Category Selector */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        Vehicle Commercial Category *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'SCV', name: 'SCV (Small Commercial)', desc: 'Tata Intra / Ace / Bolero (< 2.5T)' },
                          { id: 'MCV', name: 'MCV (Medium Commercial)', desc: 'Tata 407 / Eicher Pro (2.5T - 9T)' },
                          { id: 'HCV', name: 'HCV (Heavy Commercial)', desc: 'Ashok Leyland 1615 (> 9T)' },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                category: cat.id,
                                capacityKg: cat.id === 'SCV' ? '1500' : cat.id === 'MCV' ? '3500' : '9000',
                                mileageKmpl: cat.id === 'SCV' ? '14.5' : cat.id === 'MCV' ? '8.5' : '4.5',
                              }))
                            }
                            className={`p-2.5 rounded-lg border text-left transition-all ${
                              form.category === cat.id
                                ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                                : 'bg-white text-gray-800 border-gray-200 hover:border-teal-400'
                            }`}
                          >
                            <div className="font-bold text-xs">{cat.name}</div>
                            <div className={`text-[10px] ${form.category === cat.id ? 'text-teal-100' : 'text-gray-500'}`}>
                              {cat.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField
                        id="reg-veh-no"
                        label="Vehicle Reg. Number *"
                        name="vehicleNumber"
                        value={form.vehicleNumber}
                        onChange={handleChange}
                        error={errors.vehicleNumber}
                        placeholder="e.g. MH-14-AZ-8899"
                      />
                      <FormField
                        id="reg-make"
                        label="Manufacturer (Make) *"
                        name="make"
                        value={form.make}
                        onChange={handleChange}
                        placeholder="e.g. Tata Motors, Mahindra"
                      />
                      <FormField
                        id="reg-model"
                        label="Model Name *"
                        name="model"
                        value={form.model}
                        onChange={handleChange}
                        placeholder="e.g. Intra V30, 407 Gold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <FormField
                        id="reg-year"
                        label="Manufacturing Year"
                        name="manufacturingYear"
                        type="number"
                        value={form.manufacturingYear}
                        onChange={handleChange}
                        placeholder="2023"
                      />
                      <div className="form-group">
                        <label className="form-label">Fuel Type</label>
                        <select
                          name="fuelType"
                          className="form-select text-xs"
                          value={form.fuelType}
                          onChange={handleChange}
                        >
                          <option value="DIESEL">Diesel</option>
                          <option value="CNG">CNG</option>
                          <option value="ELECTRIC">Electric (EV)</option>
                          <option value="PETROL">Petrol</option>
                        </select>
                      </div>
                      <FormField
                        id="reg-payload"
                        label="Legal Payload (kg) *"
                        name="capacityKg"
                        type="number"
                        value={form.capacityKg}
                        onChange={handleChange}
                        error={errors.capacityKg}
                        placeholder="1500"
                      />
                      <FormField
                        id="reg-gvw"
                        label="Gross Vehicle Wt (GVW kg)"
                        name="gvwKg"
                        type="number"
                        value={form.gvwKg}
                        onChange={handleChange}
                        placeholder="2565"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField
                        id="reg-mileage"
                        label="Fuel Mileage (km/L) *"
                        name="mileageKmpl"
                        type="number"
                        step="0.5"
                        value={form.mileageKmpl}
                        onChange={handleChange}
                        placeholder="14.5"
                        hint="Actual tested mileage under freight load"
                      />
                      <FormField
                        id="reg-dim"
                        label="Cargo Dimensions (L x W x H)"
                        name="dimensions"
                        value={form.dimensions}
                        onChange={handleChange}
                        placeholder="e.g. 8.8ft x 5.3ft x 5.0ft"
                      />
                      <FormField
                        id="reg-hub"
                        label="Home Base Hub / Depot *"
                        name="baseHub"
                        value={form.baseHub}
                        onChange={handleChange}
                        placeholder="e.g. Chakan Agri Hub"
                      />
                    </div>

                    <FormField
                      id="reg-districts"
                      label="Operating Districts & Freight Corridors *"
                      name="serviceDistricts"
                      value={form.serviceDistricts}
                      onChange={handleChange}
                      placeholder="e.g. Pune, Nashik, Ahmednagar, Mumbai"
                    />

                    {/* Cold Chain Refrigeration Toggle */}
                    <div className="p-3 bg-white rounded-lg border border-teal-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Thermometer size={18} className="text-cyan-600" />
                          <div>
                            <span className="font-bold text-xs text-gray-800">
                              Refrigerated Reefer Container / Cold Chain Support
                            </span>
                            <p className="text-[10px] text-secondary">
                              Enable for temperature-sensitive perishable produce (Berries, Herbs, Dairy)
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="isRefrigerated"
                            checked={form.isRefrigerated}
                            onChange={handleChange}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                      </div>

                      {form.isRefrigerated && (
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                          <FormField
                            id="reg-min-temp"
                            label="Min Temp (°C)"
                            name="minTempC"
                            type="number"
                            value={form.minTempC}
                            onChange={handleChange}
                            placeholder="4"
                          />
                          <FormField
                            id="reg-max-temp"
                            label="Max Temp (°C)"
                            name="maxTempC"
                            type="number"
                            value={form.maxTempC}
                            onChange={handleChange}
                            placeholder="12"
                          />
                        </div>
                      )}
                    </div>

                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* 3. MANDATORY VEHICLE DOCUMENT UPLOADS                     */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    <div className="p-4 bg-white rounded-xl border border-teal-300 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-teal-700" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                          Mandatory Vehicle Documents & Statutory Compliance (RTO / MVA)
                        </h4>
                      </div>
                      <p className="text-[11px] text-secondary">
                        Upload official motor vehicle certificates for DoCA verification. Supports PDF, JPG, PNG.
                      </p>

                      <div className="space-y-3">
                        {/* 1. Registration Certificate (RC) */}
                        <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/70 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="font-bold text-xs text-gray-800">1. Registration Certificate (RC) *</span>
                            <p className="text-[10px] text-secondary">Form 23 Commercial RC</p>
                          </div>
                          <input
                            type="text"
                            placeholder="RC Number"
                            name="rcNumber"
                            value={form.rcNumber}
                            onChange={handleChange}
                            className="form-input text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload('rcDocUrl', e.target.files[0])}
                              className="text-[10px] text-gray-600 w-full"
                            />
                            {form.rcDocUrl && <span className="text-xs font-bold text-emerald-700">✓</span>}
                          </div>
                        </div>

                        {/* 2. Commercial Insurance */}
                        <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/70 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="font-bold text-xs text-gray-800">2. Commercial Insurance *</span>
                            <p className="text-[10px] text-secondary">Goods Vehicle Comprehensive</p>
                          </div>
                          <input
                            type="text"
                            placeholder="Policy Number"
                            name="insuranceNumber"
                            value={form.insuranceNumber}
                            onChange={handleChange}
                            className="form-input text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload('insuranceDocUrl', e.target.files[0])}
                              className="text-[10px] text-gray-600 w-full"
                            />
                            {form.insuranceDocUrl && <span className="text-xs font-bold text-emerald-700">✓</span>}
                          </div>
                        </div>

                        {/* 3. Fitness Certificate */}
                        <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/70 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="font-bold text-xs text-gray-800">3. Fitness Certificate</span>
                            <p className="text-[10px] text-secondary">Form 38 Valid Fitness</p>
                          </div>
                          <input
                            type="text"
                            placeholder="Fitness Cert No."
                            name="fitnessNumber"
                            value={form.fitnessNumber}
                            onChange={handleChange}
                            className="form-input text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload('fitnessDocUrl', e.target.files[0])}
                              className="text-[10px] text-gray-600 w-full"
                            />
                            {form.fitnessDocUrl && <span className="text-xs font-bold text-emerald-700">✓</span>}
                          </div>
                        </div>

                        {/* 4. Goods Carriage Permit */}
                        <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/70 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="font-bold text-xs text-gray-800">4. Goods Carriage Permit</span>
                            <p className="text-[10px] text-secondary">State / National Permit</p>
                          </div>
                          <input
                            type="text"
                            placeholder="Permit Number"
                            name="permitNumber"
                            value={form.permitNumber}
                            onChange={handleChange}
                            className="form-input text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload('permitDocUrl', e.target.files[0])}
                              className="text-[10px] text-gray-600 w-full"
                            />
                            {form.permitDocUrl && <span className="text-xs font-bold text-emerald-700">✓</span>}
                          </div>
                        </div>

                        {/* 5. PUC */}
                        <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/70 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="font-bold text-xs text-gray-800">5. PUC Certificate</span>
                            <p className="text-[10px] text-secondary">Pollution Under Control</p>
                          </div>
                          <input
                            type="text"
                            placeholder="PUC Number"
                            name="pucNumber"
                            value={form.pucNumber}
                            onChange={handleChange}
                            className="form-input text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload('pucDocUrl', e.target.files[0])}
                              className="text-[10px] text-gray-600 w-full"
                            />
                            {form.pucDocUrl && <span className="text-xs font-bold text-emerald-700">✓</span>}
                          </div>
                        </div>

                        {/* 6. Road Tax */}
                        <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/70 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="font-bold text-xs text-gray-800">6. Road Tax Token / Receipt</span>
                            <p className="text-[10px] text-secondary">Commercial Goods Tax Receipt</p>
                          </div>
                          <input
                            type="text"
                            placeholder="Tax Receipt No."
                            name="taxNumber"
                            value={form.taxNumber}
                            onChange={handleChange}
                            className="form-input text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload('taxDocUrl', e.target.files[0])}
                              className="text-[10px] text-gray-600 w-full"
                            />
                            {form.taxDocUrl && <span className="text-xs font-bold text-emerald-700">✓</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
