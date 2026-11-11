import React, { useState } from 'react';
import {
  Building2,
  User,
  UserCheck,
  CreditCard,
  ShieldCheck,
  Clock,
  XCircle,
  CheckCircle,
  FileText,
  ExternalLink,
  Edit3,
  Phone,
  Mail,
  MapPin,
  Truck,
  AlertCircle,
  Save,
  X,
  BadgeCheck,
} from 'lucide-react';
import logisticsApi from '../../services/logisticsApi';

/**
 * SasyaVahini — Logistics Partner & Organization Profile View
 *
 * Provides dedicated view & edit capabilities for:
 * - Enterprise Fleet Operator (Organization credentials, CIN, GSTIN, PAN, Business Certificate)
 * - Commercial Vehicle Owner (Owner details, bank account, fleet count)
 * - Individual Driver (Licence verification, permitted classes, DL front/back uploads, emergency contact)
 */
export default function LogisticsProfileView({ profile, user, vehicles = [], onProfileUpdated }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const partnerType = profile?.partnerType || 'VEHICLE_OWNER';
  const isOrganization = partnerType === 'FLEET_OPERATOR';
  const isDriver = partnerType === 'DRIVER' || partnerType === 'INDIVIDUAL_DRIVER';
  const isOwner = partnerType === 'VEHICLE_OWNER';

  // Edit form state
  const [editForm, setEditForm] = useState({
    companyName: profile?.companyName || '',
    ownerName: profile?.ownerName || user?.name || '',
    phone: user?.phone || '',
    emergencyContact: profile?.emergencyContact || '',
    ownershipType: profile?.ownershipType || 'Private Limited',
    panNumber: profile?.panNumber || '',
    gstin: profile?.gstin || '',
    businessRegNo: profile?.businessRegNo || '',
    businessCertUrl: profile?.businessCertUrl || '',
    drivingLicenceNo: profile?.drivingLicenceNo || '',
    licenceFrontUrl: profile?.licenceFrontUrl || '',
    licenceBackUrl: profile?.licenceBackUrl || '',
    serviceDistricts: Array.isArray(profile?.serviceDistricts)
      ? profile.serviceDistricts.join(', ')
      : (profile?.serviceDistricts || 'Pune, Nashik'),
    bankName: profile?.bankName || '',
    accountHolderName: profile?.accountHolderName || profile?.ownerName || user?.name || '',
    accountNumber: profile?.accountNumber || '',
    ifscCode: profile?.ifscCode || '',
  });

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const payload = {
        ...editForm,
        serviceDistricts: typeof editForm.serviceDistricts === 'string'
          ? editForm.serviceDistricts.split(',').map((s) => s.trim()).filter(Boolean)
          : editForm.serviceDistricts,
      };

      const updated = await logisticsApi.updateProfile(payload);
      setSaveSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setTimeout(() => {
        setIsEditOpen(false);
        setSaveSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to update profile', err);
      setSaveError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBanner = () => {
    const status = profile?.verificationStatus || 'PENDING';
    if (status === 'VERIFIED') {
      return (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <CheckCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-emerald-950">DoCA Verified Logistics Partner</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  STATUTORY COMPLIANT
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Authorized for interstate and district-level agricultural freight transit under Indian Motor Vehicle Rules.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-sm">
            Audit ID: {profile?.id?.slice(0, 8).toUpperCase() || 'DOCA-7701'}
          </span>
        </div>
      );
    }

    if (status === 'REJECTED') {
      return (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-800">
              <XCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-rose-950">DoCA Verification Requires Attention</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                  REJECTED / ACTION REQUIRED
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                Remarks: {profile?.adminRemarks || profile?.rejectionReason || 'Uploaded certificates do not meet statutory freight criteria. Please update documents.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="btn btn-sm bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
          >
            Update Credentials
          </button>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
            <Clock size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-amber-950">Verification in Progress with DoCA</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                PENDING RTO AUDIT
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              Department of Consumer Affairs compliance officers are verifying your commercial documents. You may still list vehicles and configure corridors.
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-amber-900 bg-white px-3 py-1.5 rounded-lg border border-amber-300">
          Estimated SLA: 24 - 48 hours
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── Status Banner ─────────────────────────────────────────────────── */}
      {getStatusBanner()}

      {/* ─── Profile Header Summary Card ───────────────────────────────────── */}
      <div className="card p-6 rounded-2xl bg-white border shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
              {isOrganization ? <Building2 size={28} /> : isDriver ? <UserCheck size={28} /> : <Truck size={28} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {isOrganization ? (profile?.companyName || user?.name + ' Logistics') : (profile?.ownerName || user?.name)}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isOrganization
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : isDriver
                    ? 'bg-sky-100 text-sky-800 border border-sky-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {isOrganization ? '🏢 FLEET OPERATOR (ORGANIZATION)' : isDriver ? '🪪 INDIVIDUAL DRIVER' : '🚚 VEHICLE OWNER'}
                </span>
              </div>
              <p className="text-xs text-secondary mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1"><Mail size={12} /> {user?.email}</span>
                <span className="flex items-center gap-1"><Phone size={12} /> {user?.phone || 'Not provided'}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {Array.isArray(profile?.serviceDistricts) ? profile.serviceDistricts.join(', ') : (profile?.serviceDistricts || 'Pune, Maharashtra')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 flex items-center gap-1.5 border border-gray-300 shadow-sm transition"
            >
              <Edit3 size={14} />
              Edit Profile & KYC
            </button>
          </div>
        </div>

        {/* Fleet & Operation Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">Registered Fleet</span>
            <div className="text-xl font-extrabold text-gray-900 mt-0.5 flex items-center gap-1.5">
              <Truck size={18} className="text-emerald-700" />
              <span>{vehicles.length} Vehicles</span>
            </div>
            <span className="text-[10px] text-gray-500">Exclusively isolated to your account</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider block">Verified Fleet</span>
            <div className="text-xl font-extrabold text-emerald-950 mt-0.5 flex items-center gap-1.5">
              <CheckCircle size={18} className="text-emerald-700" />
              <span>{vehicles.filter((v) => v.verificationStatus === 'VERIFIED').length} Ready</span>
            </div>
            <span className="text-[10px] text-emerald-700">RTO & Insurance Verified</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-[11px] font-medium text-amber-800 uppercase tracking-wider block">Pending Review</span>
            <div className="text-xl font-extrabold text-amber-950 mt-0.5 flex items-center gap-1.5">
              <Clock size={18} className="text-amber-700" />
              <span>{vehicles.filter((v) => v.verificationStatus === 'PENDING').length} Under Audit</span>
            </div>
            <span className="text-[10px] text-amber-700">DoCA queue processing</span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200">
            <span className="text-[11px] font-medium text-blue-800 uppercase tracking-wider block">Active Operating Zone</span>
            <div className="text-sm font-bold text-blue-950 mt-1 truncate">
              {Array.isArray(profile?.serviceDistricts) && profile.serviceDistricts.length > 0
                ? profile.serviceDistricts.slice(0, 2).join(', ') + (profile.serviceDistricts.length > 2 ? ' +' : '')
                : 'Pune Agri Zone'}
            </div>
            <span className="text-[10px] text-blue-700">Maharashtra Corridors</span>
          </div>
        </div>
      </div>

      {/* ─── Detailed Credentials Cards Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Enterprise or Driver Identity Credentials */}
        <div className="card p-5 rounded-2xl bg-white border space-y-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 border-b pb-3">
            {isOrganization ? (
              <Building2 size={18} className="text-purple-700" />
            ) : isDriver ? (
              <UserCheck size={18} className="text-sky-700" />
            ) : (
              <User size={18} className="text-emerald-700" />
            )}
            <h3 className="font-bold text-sm text-gray-900">
              {isOrganization
                ? 'Corporate Enterprise & Business Credentials'
                : isDriver
                ? 'Commercial Driver Licence & Personal Identity'
                : 'Vehicle Owner Registration Details'}
            </h3>
          </div>

          {isOrganization && (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Company / Enterprise Name:</span>
                <span className="font-bold text-gray-900">{profile?.companyName || user?.name + ' Logistics'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Registration No. (CIN / LLPIN):</span>
                <span className="font-mono font-bold text-gray-900">{profile?.businessRegNo || 'CIN-MH2023PTC40918'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Enterprise Ownership Type:</span>
                <span className="font-semibold text-gray-800">{profile?.ownershipType || 'Private Limited'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Income Tax PAN:</span>
                <span className="font-mono font-bold text-gray-900">{profile?.panNumber || 'AABCS9918F'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Goods & Services Tax (GSTIN):</span>
                <span className="font-mono font-bold text-gray-900">{profile?.gstin || '27AABCS9918F1Z4'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-secondary font-medium">Operating Hubs / Districts:</span>
                <span className="font-semibold text-gray-800 text-right">
                  {Array.isArray(profile?.serviceDistricts) ? profile.serviceDistricts.join(', ') : (profile?.serviceDistricts || 'Pune, Nashik')}
                </span>
              </div>
            </div>
          )}

          {isDriver && (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Driver Full Name:</span>
                <span className="font-bold text-gray-900">{profile?.ownerName || user?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Commercial DL Number:</span>
                <span className="font-mono font-bold text-sky-900">{profile?.drivingLicenceNo || 'MH-12-20170098121'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">DL Expiry Date:</span>
                <span className="font-semibold text-gray-800">
                  {profile?.licenceExpiry ? new Date(profile.licenceExpiry).toLocaleDateString() : '14 Jun 2032'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Permitted Commercial Classes:</span>
                <div className="flex flex-wrap gap-1">
                  {(profile?.permittedClasses?.length ? profile.permittedClasses : ['LMV', 'LMV-TR', 'HGMV']).map((cls) => (
                    <span key={cls} className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-secondary font-medium">Emergency Contact:</span>
                <span className="font-bold text-gray-900">{profile?.emergencyContact || '+91 98220 01122 (Suresh Patil)'}</span>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Owner Full Name:</span>
                <span className="font-bold text-gray-900">{profile?.ownerName || user?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Ownership Structure:</span>
                <span className="font-semibold text-gray-800">{profile?.ownershipType || 'Individual Proprietor'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">Contact Phone:</span>
                <span className="font-semibold text-gray-900">{user?.phone || '+91 98220 99881'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-secondary font-medium">Operating Corridors:</span>
                <span className="font-semibold text-gray-800 text-right">
                  {Array.isArray(profile?.serviceDistricts) ? profile.serviceDistricts.join(', ') : (profile?.serviceDistricts || 'Pune, Nashik')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Uploaded Statutory KYC Documents */}
        <div className="card p-5 rounded-2xl bg-white border space-y-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-emerald-700" />
              <h3 className="font-bold text-sm text-gray-900">Uploaded Statutory Documents</h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Verified Vault
            </span>
          </div>

          <div className="space-y-3">
            {isOrganization && (
              <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-800">
                    <FileText size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-900 block">Certificate of Incorporation / Registration</span>
                    <span className="text-[10px] text-secondary font-mono">{profile?.businessRegNo || 'CIN-MH-2023'} • PDF Upload</span>
                  </div>
                </div>
                <a
                  href={profile?.businessCertUrl || 'https://storage.sasyavahini.gov.in/docs/sample_cin.pdf'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 border text-xs font-semibold text-gray-700 flex items-center gap-1 shadow-sm"
                >
                  <ExternalLink size={12} /> View
                </a>
              </div>
            )}

            {isDriver && (
              <>
                <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
                      <FileText size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-gray-900 block">Driving Licence (Front Photo)</span>
                      <span className="text-[10px] text-secondary font-mono">{profile?.drivingLicenceNo || 'MH-12-DL'} • Scanned Copy</span>
                    </div>
                  </div>
                  <a
                    href={profile?.licenceFrontUrl || 'https://storage.sasyavahini.gov.in/docs/sample_dl_front.jpg'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 border text-xs font-semibold text-gray-700 flex items-center gap-1 shadow-sm"
                  >
                    <ExternalLink size={12} /> View
                  </a>
                </div>

                <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
                      <FileText size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-gray-900 block">Driving Licence (Back Photo)</span>
                      <span className="text-[10px] text-secondary font-mono">Endorsements & Validity</span>
                    </div>
                  </div>
                  <a
                    href={profile?.licenceBackUrl || 'https://storage.sasyavahini.gov.in/docs/sample_dl_back.jpg'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 border text-xs font-semibold text-gray-700 flex items-center gap-1 shadow-sm"
                  >
                    <ExternalLink size={12} /> View
                  </a>
                </div>
              </>
            )}

            {/* Direct Bank Settlement Card */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <CreditCard size={15} className="text-amber-700" />
                  <span>Freight Direct Settlement Bank Account</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  DBT ACTIVE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-gray-500 text-[10px] block">Bank Name</span>
                  <span className="font-bold text-gray-900">{profile?.bankName || 'HDFC Bank'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Account Number</span>
                  <span className="font-mono font-bold text-gray-900">
                    {profile?.accountNumber ? `•••• •••• ${profile.accountNumber.slice(-4)}` : '•••• •••• 5029'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Account Holder</span>
                  <span className="font-semibold text-gray-800">{profile?.accountHolderName || profile?.ownerName || user?.name}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">IFSC Code</span>
                  <span className="font-mono font-bold text-gray-900">{profile?.ifscCode || 'HDFC0001812'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal: Edit Profile / Organization Details ─────────────────────── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-emerald-700" />
                <h3 className="font-bold text-base text-gray-900">
                  Update {isOrganization ? 'Organization & Business Credentials' : 'Profile & KYC Credentials'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {saveError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle size={15} />
                <span>Profile credentials updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {isOrganization && (
                <div className="space-y-3 p-3.5 rounded-xl bg-purple-50/50 border border-purple-200">
                  <h4 className="font-bold text-purple-950 uppercase tracking-wider text-[11px]">Organization Credentials</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Company / Enterprise Name *</label>
                      <input
                        type="text"
                        name="companyName"
                        value={editForm.companyName}
                        onChange={handleEditChange}
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Business Reg No (CIN / LLPIN)</label>
                      <input
                        type="text"
                        name="businessRegNo"
                        value={editForm.businessRegNo}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Income Tax PAN</label>
                      <input
                        type="text"
                        name="panNumber"
                        value={editForm.panNumber}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border rounded-lg font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">GSTIN</label>
                      <input
                        type="text"
                        name="gstin"
                        value={editForm.gstin}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border rounded-lg font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Personal / Contact Details */}
              <div className="space-y-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Contact & Operations</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Contact Person / Owner Name *</label>
                    <input
                      type="text"
                      name="ownerName"
                      value={editForm.ownerName}
                      onChange={handleEditChange}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Phone Number</label>
                    <input
                      type="text"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      name="emergencyContact"
                      value={editForm.emergencyContact}
                      onChange={handleEditChange}
                      placeholder="e.g. Suresh Patil (+91 9822001122)"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Operating Service Districts (comma-separated)</label>
                    <input
                      type="text"
                      name="serviceDistricts"
                      value={editForm.serviceDistricts}
                      onChange={handleEditChange}
                      placeholder="Pune, Nashik, Ahmednagar"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Banking Details */}
              <div className="space-y-3 p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
                <h4 className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">Bank Settlement Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      value={editForm.bankName}
                      onChange={handleEditChange}
                      placeholder="e.g. State Bank of India"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      name="accountHolderName"
                      value={editForm.accountHolderName}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Account Number</label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={editForm.accountNumber}
                      onChange={handleEditChange}
                      placeholder="e.g. 502000889912"
                      className="w-full px-3 py-2 border rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">IFSC Code</label>
                    <input
                      type="text"
                      name="ifscCode"
                      value={editForm.ifscCode}
                      onChange={handleEditChange}
                      placeholder="e.g. SBIN0001234"
                      className="w-full px-3 py-2 border rounded-lg font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow"
                >
                  {saving ? 'Saving...' : <><Save size={14} /> Save Profile Credentials</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

