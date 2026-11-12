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
  Upload,
  AlertTriangle,
  Check,
} from 'lucide-react';
import logisticsApi from '../../services/logisticsApi';
import {
  STATUTORY_DOC_TYPES,
  getExpiryStatus,
  getVehicleComplianceSummary,
} from '../../utils/complianceHelpers';

/**
 * SasyaVahini — Logistics Partner & Organization Profile View
 *
 * Provides dedicated view & edit capabilities for:
 * - Enterprise Fleet Operator (Organization credentials, CIN, GSTIN, PAN, Business Certificate)
 * - Commercial Vehicle Owner (Owner details, bank account, fleet count)
 * - Individual Driver (Licence verification, permitted classes, DL front/back uploads, emergency contact)
 */
export default function LogisticsProfileView({
  profile,
  user,
  vehicles = [],
  onProfileUpdated,
  onVehicleUpdated,
}) {
  const [localVehicles, setLocalVehicles] = useState(vehicles);

  React.useEffect(() => {
    setLocalVehicles(vehicles);
  }, [vehicles]);

  // Vehicle Document Re-upload State in Profile View
  const [activeVehReupload, setActiveVehReupload] = useState(null);
  const [reuploadingVehDoc, setReuploadingVehDoc] = useState(false);
  const [vehDocMsg, setVehDocMsg] = useState(null);
  const [vehDocError, setVehDocError] = useState(null);

  const handleOpenVehReupload = (vehicle, docDef, existingDoc) => {
    setVehDocError(null);
    setVehDocMsg(null);
    setActiveVehReupload({
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      docType: docDef.type,
      label: docDef.label,
      docNumber: existingDoc?.docNumber || `${vehicle.vehicleNumber}-${docDef.type}`,
      expiryDate: existingDoc?.expiryDate ? existingDoc.expiryDate.slice(0, 10) : '',
      fileUrl: existingDoc?.fileUrl || '',
      fileName: '',
      sampleNum: docDef.sampleNum,
    });
  };

  const handleVehDocFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setActiveVehReupload((prev) => ({
        ...prev,
        fileUrl: reader.result,
        fileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleVehDocReuploadSubmit = async (e) => {
    e.preventDefault();
    if (!activeVehReupload) return;
    try {
      setReuploadingVehDoc(true);
      setVehDocError(null);
      const updatedVeh = await logisticsApi.uploadVehicleDocument(activeVehReupload.vehicleId, {
        docType: activeVehReupload.docType,
        docNumber: activeVehReupload.docNumber,
        expiryDate: activeVehReupload.expiryDate || null,
        fileUrl: activeVehReupload.fileUrl || `https://storage.sasyavahini.gov.in/docs/sample_${activeVehReupload.docType.toLowerCase()}.pdf`,
      });
      setLocalVehicles((prev) => prev.map((v) => (v.id === updatedVeh.id ? updatedVeh : v)));
      if (onVehicleUpdated) {
        onVehicleUpdated(updatedVeh);
      }
      setVehDocMsg(`Successfully re-uploaded ${activeVehReupload.docType} for ${activeVehReupload.vehicleNumber}! Re-queued for DoCA Compliance Officer audit.`);
      setActiveVehReupload(null);
      setTimeout(() => setVehDocMsg(null), 6000);
    } catch (err) {
      console.error('Failed to upload vehicle document', err);
      setVehDocError(err.message || 'Failed to upload vehicle document');
    } finally {
      setReuploadingVehDoc(false);
    }
  };

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
    licenceExpiry: profile?.licenceExpiry ? profile.licenceExpiry.slice(0, 10) : '',
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

  const handleFileChange = (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm((prev) => ({ ...prev, [field]: reader.result }));
    };
    reader.readAsDataURL(file);
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
              <span>{localVehicles.length} Trucks</span>
            </div>
            <span className="text-[10px] text-gray-500">Exclusively isolated to your account</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider block">Allocation Ready</span>
            <div className="text-xl font-extrabold text-emerald-950 mt-0.5 flex items-center gap-1.5">
              <CheckCircle size={18} className="text-emerald-700" />
              <span>{localVehicles.filter((v) => getVehicleComplianceSummary(v).canAllocate).length} Active</span>
            </div>
            <span className="text-[10px] text-emerald-700">All certificates active &amp; valid</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200">
            <span className="text-[11px] font-medium text-rose-800 uppercase tracking-wider block">Allocation Blocked</span>
            <div className="text-xl font-extrabold text-rose-950 mt-0.5 flex items-center gap-1.5">
              <AlertTriangle size={18} className="text-rose-700" />
              <span>{localVehicles.filter((v) => !getVehicleComplianceSummary(v).canAllocate).length} Hold</span>
            </div>
            <span className="text-[10px] text-rose-700">Expired docs / audit required</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-[11px] font-medium text-amber-800 uppercase tracking-wider block">Expiring &lt; 30 Days</span>
            <div className="text-xl font-extrabold text-amber-950 mt-0.5 flex items-center gap-1.5">
              <Clock size={18} className="text-amber-700" />
              <span>{localVehicles.filter((v) => getVehicleComplianceSummary(v).status === 'EXPIRING_SOON').length} Renew Soon</span>
            </div>
            <span className="text-[10px] text-amber-700">Upcoming RTO renewals</span>
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
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-secondary font-medium">DL Expiry Date:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">
                    {profile?.licenceExpiry ? new Date(profile.licenceExpiry).toLocaleDateString() : '14 Jun 2032'}
                  </span>
                  {profile?.licenceExpiry && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getExpiryStatus(profile.licenceExpiry).badgeClass}`}>
                      {getExpiryStatus(profile.licenceExpiry).badgeText}
                    </span>
                  )}
                </div>
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

          {profile?.verificationStatus === 'REJECTED' && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle size={15} className="text-rose-700 shrink-0 mt-0.5" />
              <div>
                <strong>DoCA Rejection Notice: </strong>
                <span>{profile.adminRemarks || profile.rejectionReason || 'Credentials rejected by compliance auditor.'}</span>
                <span className="block mt-0.5 font-medium text-rose-800">Please re-upload your document certificates below.</span>
              </div>
            </div>
          )}

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
                <div className="flex items-center gap-2">
                  <a
                    href={profile?.businessCertUrl || 'https://storage.sasyavahini.gov.in/docs/sample_cin.pdf'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 border text-xs font-semibold text-gray-700 flex items-center gap-1 shadow-sm"
                  >
                    <ExternalLink size={12} /> View
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                  >
                    <Upload size={12} /> Re-upload
                  </button>
                </div>
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
                  <div className="flex items-center gap-2">
                    <a
                      href={profile?.licenceFrontUrl || 'https://storage.sasyavahini.gov.in/docs/sample_dl_front.jpg'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 border text-xs font-semibold text-gray-700 flex items-center gap-1 shadow-sm"
                    >
                      <ExternalLink size={12} /> View
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsEditOpen(true)}
                      className="px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <Upload size={12} /> Re-upload
                    </button>
                  </div>
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
                  <div className="flex items-center gap-2">
                    <a
                      href={profile?.licenceBackUrl || 'https://storage.sasyavahini.gov.in/docs/sample_dl_back.jpg'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 border text-xs font-semibold text-gray-700 flex items-center gap-1 shadow-sm"
                    >
                      <ExternalLink size={12} /> View
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsEditOpen(true)}
                      className="px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <Upload size={12} /> Re-upload
                    </button>
                  </div>
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

      {/* ─── Fleet Statutory Documents & Expiration Vault (MVA 1988 Compliance) ── */}
      <div className="card p-6 rounded-2xl bg-white border shadow-sm space-y-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={22} className="text-emerald-700" />
              <h3 className="font-bold text-base text-gray-900">
                Fleet Statutory Documents &amp; Expiration Vault
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Motor Vehicles Act, 1988
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Under Indian Motor Vehicle Rules, commercial freight vehicles require active, unexpired statutory certificates (RC, Insurance, PUC, Fitness, Permit, Road Tax). Expired documents trigger an immediate allocation freeze on shipment assignments.
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-300 self-start sm:self-auto">
            {localVehicles.length} Registered {localVehicles.length === 1 ? 'Vehicle' : 'Vehicles'}
          </span>
        </div>

        {vehDocMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-700 shrink-0" />
              <span>{vehDocMsg}</span>
            </div>
            <button onClick={() => setVehDocMsg(null)} className="text-emerald-800 font-bold hover:underline">✕</button>
          </div>
        )}

        {vehDocError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-700 shrink-0" />
              <span>{vehDocError}</span>
            </div>
            <button onClick={() => setVehDocError(null)} className="text-rose-800 font-bold hover:underline">✕</button>
          </div>
        )}

        {localVehicles.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-gray-300 bg-gray-50 space-y-2">
            <Truck size={36} className="text-gray-400 mx-auto" />
            <h4 className="font-bold text-sm text-gray-800">No Fleet Vehicles Registered Yet</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Add your commercial trucks or mini vans in the "Fleet Management" tab. Once added, their statutory certificates (RC, Insurance, PUC, Fitness, Permit) will be tracked here with live expiration alerts.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {localVehicles.map((vehicle) => {
              const compliance = getVehicleComplianceSummary(vehicle);
              return (
                <div
                  key={vehicle.id}
                  className={`rounded-2xl border p-5 transition-shadow shadow-sm ${
                    !compliance.canAllocate
                      ? 'border-rose-300 bg-rose-50/20'
                      : compliance.status === 'EXPIRING_SOON'
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Vehicle Header & Allocation Banner */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${
                        !compliance.canAllocate ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        <Truck size={24} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-extrabold text-base text-gray-900 tracking-wide">
                            {vehicle.vehicleNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border">
                            {vehicle.type}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            • Capacity: {vehicle.capacityKg?.toLocaleString()} kg • Fuel: {vehicle.fuelType || 'DIESEL'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Assigned Driver: <strong className="text-gray-700">{vehicle.driverName || 'Self / Primary'}</strong> {vehicle.driverPhone ? `(${vehicle.driverPhone})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm ${compliance.badgeClass}`}>
                        {!compliance.canAllocate ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                        {compliance.badgeText}
                      </span>
                    </div>
                  </div>

                  {/* Allocation Block Alert if Expired */}
                  {!compliance.canAllocate && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-950 text-xs flex items-start gap-2.5">
                      <AlertCircle size={16} className="text-rose-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Dispatch Allocation Blocked by DoCA Engine: </span>
                        <span>{compliance.reason}</span>
                        <span className="block mt-1 font-medium text-rose-900">
                          To restore vehicle eligibility for agricultural shipments and CVRP route optimization, upload renewed certificates below.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 6 Statutory Documents Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
                    {STATUTORY_DOC_TYPES.map((docDef) => {
                      const doc = vehicle.documents?.find((d) => d.type === docDef.type);
                      const expiry = getExpiryStatus(doc?.expiryDate);
                      const isRejected = doc?.status === 'REJECTED';
                      const isVerified = doc?.status === 'VERIFIED';

                      return (
                        <div
                          key={docDef.type}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                            !doc
                              ? 'border-gray-200 bg-gray-50/70'
                              : expiry.isExpired
                              ? 'border-rose-300 bg-rose-50/60'
                              : isRejected
                              ? 'border-rose-300 bg-rose-50/40'
                              : expiry.isExpiringSoon
                              ? 'border-amber-300 bg-amber-50/40'
                              : 'border-emerald-200/80 bg-emerald-50/20'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-xs text-gray-900 block leading-tight">
                                  {docDef.shortLabel}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {doc?.docNumber || docDef.type}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                !doc
                                  ? 'bg-gray-200 text-gray-600'
                                  : isVerified
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isRejected
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {!doc ? 'MISSING' : doc.status || 'PENDING'}
                              </span>
                            </div>

                            <p className="text-[10px] text-gray-500 line-clamp-1">
                              {docDef.description}
                            </p>

                            {/* Expiry Pill */}
                            <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[10px] text-gray-500 font-medium">Statutory Validity:</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${expiry.badgeClass}`}>
                                {expiry.badgeText}
                              </span>
                            </div>
                            {doc?.expiryDate && (
                              <div className="text-[10px] text-gray-600 font-mono text-right">
                                {expiry.label}
                              </div>
                            )}

                            {isRejected && (
                              <div className="p-2 rounded bg-rose-100/80 text-[10px] text-rose-900 font-medium">
                                ✕ {doc.rejectionReason || 'Rejected by auditor. Renew or re-upload.'}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-3 mt-2 border-t border-gray-200/60">
                            {doc?.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-1 px-2 rounded-lg bg-white hover:bg-gray-100 border text-[11px] font-semibold text-gray-700 flex items-center justify-center gap-1 shadow-sm transition"
                              >
                                <ExternalLink size={12} /> View
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenVehReupload(vehicle, docDef, doc)}
                              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition ${
                                !doc
                                  ? 'bg-gray-800 hover:bg-gray-900 text-white'
                                  : expiry.isExpired || isRejected
                                  ? 'bg-rose-700 hover:bg-rose-800 text-white animate-pulse'
                                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              }`}
                            >
                              <Upload size={12} />
                              {!doc ? 'Upload' : expiry.isExpired ? 'Upload Renewed' : 'Update'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Modal: Edit Profile / Organization Details ─────────────────────── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
              {profile?.verificationStatus === 'REJECTED' && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle size={15} className="text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Re-submitting Rejected Credentials:</span>
                    <p className="mt-0.5">Updating these documents will reset your status to <strong>PENDING</strong> and re-queue your profile into the DoCA Statutory Compliance review queue.</p>
                  </div>
                </div>
              )}
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

                  <div className="pt-2 border-t border-purple-200/60 space-y-1.5">
                    <label className="font-semibold block">Business Registration Certificate (CIN / LLPIN Document)</label>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg"
                        onChange={(e) => handleFileChange('businessCertUrl', e)}
                        className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-800"
                      />
                      <input
                        type="url"
                        name="businessCertUrl"
                        placeholder="or paste PDF / Document URL"
                        value={editForm.businessCertUrl && !editForm.businessCertUrl.startsWith('data:') ? editForm.businessCertUrl : ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, businessCertUrl: 'https://storage.sasyavahini.gov.in/docs/sample_cin.pdf' }))}
                      className="text-[10px] text-purple-700 font-semibold hover:underline"
                    >
                      + Use Sample Certificate
                    </button>
                  </div>
                </div>
              )}

              {isDriver && (
                <div className="space-y-3 p-3.5 rounded-xl bg-sky-50/50 border border-sky-200">
                  <h4 className="font-bold text-sky-950 uppercase tracking-wider text-[11px]">Commercial Driving Licence & KYC</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Commercial DL Number *</label>
                      <input
                        type="text"
                        name="drivingLicenceNo"
                        value={editForm.drivingLicenceNo}
                        onChange={handleEditChange}
                        placeholder="e.g. MH-12-20170098121"
                        className="w-full px-3 py-2 border rounded-lg font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Licence Expiry Date</label>
                      <input
                        type="date"
                        name="licenceExpiry"
                        value={editForm.licenceExpiry ? editForm.licenceExpiry.slice(0, 10) : ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-sky-200/60 space-y-2">
                    <div>
                      <label className="font-semibold block mb-1">Driving Licence (Front Photo)</label>
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg"
                          onChange={(e) => handleFileChange('licenceFrontUrl', e)}
                          className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-sky-800"
                        />
                        <input
                          type="url"
                          name="licenceFrontUrl"
                          placeholder="or paste image URL"
                          value={editForm.licenceFrontUrl && !editForm.licenceFrontUrl.startsWith('data:') ? editForm.licenceFrontUrl : ''}
                          onChange={handleEditChange}
                          className="w-full px-3 py-1.5 border rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">Driving Licence (Back Photo)</label>
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg"
                          onChange={(e) => handleFileChange('licenceBackUrl', e)}
                          className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-sky-800"
                        />
                        <input
                          type="url"
                          name="licenceBackUrl"
                          placeholder="or paste image URL"
                          value={editForm.licenceBackUrl && !editForm.licenceBackUrl.startsWith('data:') ? editForm.licenceBackUrl : ''}
                          onChange={handleEditChange}
                          className="w-full px-3 py-1.5 border rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditForm((f) => ({
                        ...f,
                        licenceFrontUrl: 'https://storage.sasyavahini.gov.in/docs/sample_dl_front.jpg',
                        licenceBackUrl: 'https://storage.sasyavahini.gov.in/docs/sample_dl_back.jpg',
                      }))}
                      className="text-[10px] text-sky-700 font-semibold hover:underline"
                    >
                      + Use Sample Driver Licence Documents
                    </button>
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

      {/* ─── Modal: Re-upload / Renew Vehicle Statutory Certificate ──────────── */}
      {activeVehReupload && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-emerald-700" />
                <div>
                  <h3 className="font-bold text-sm text-gray-900">
                    Upload Renewed {activeVehReupload.label}
                  </h3>
                  <span className="text-[11px] text-secondary font-mono">
                    Vehicle: {activeVehReupload.vehicleNumber} • {activeVehReupload.docType}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVehReupload(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Indian Motor Vehicles Act Expiration Safeguard: </span>
                <span>
                  Uploading a renewed certificate with an active future expiry date will lift the allocation hold and re-enable this truck for assignment upon DoCA verification.
                </span>
              </div>
            </div>

            {vehDocError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{vehDocError}</span>
              </div>
            )}

            <form onSubmit={handleVehDocReuploadSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  Certificate / Policy / Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={activeVehReupload.docNumber}
                  onChange={(e) => setActiveVehReupload((prev) => ({ ...prev, docNumber: e.target.value }))}
                  placeholder={`e.g. ${activeVehReupload.sampleNum || 'MH-14-2024'}`}
                  className="w-full px-3 py-2 border rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Statutory Expiration Date * (Printed on RTO / Insurer Document)
                </label>
                <input
                  type="date"
                  required
                  value={activeVehReupload.expiryDate}
                  onChange={(e) => setActiveVehReupload((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Must be set to the future expiry date as stated on the renewal receipt or certificate.
                </span>
              </div>

              <div className="space-y-1.5 pt-1 border-t">
                <label className="font-semibold block">
                  Upload Scanned Certificate (PDF or Image) *
                </label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  onChange={handleVehDocFileChange}
                  className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800"
                />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-gray-400">or paste URL:</span>
                  <input
                    type="url"
                    value={activeVehReupload.fileUrl && !activeVehReupload.fileUrl.startsWith('data:') ? activeVehReupload.fileUrl : ''}
                    onChange={(e) => setActiveVehReupload((prev) => ({ ...prev, fileUrl: e.target.value }))}
                    placeholder="https://..."
                    className="flex-1 px-2.5 py-1 border rounded text-[11px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const futureDate = new Date();
                    futureDate.setFullYear(futureDate.getFullYear() + 1);
                    setActiveVehReupload((prev) => ({
                      ...prev,
                      docNumber: prev.sampleNum || `${prev.vehicleNumber}-${prev.docType}-2025`,
                      expiryDate: futureDate.toISOString().slice(0, 10),
                      fileUrl: `https://storage.sasyavahini.gov.in/docs/sample_${prev.docType.toLowerCase()}.pdf`,
                    }));
                  }}
                  className="text-[10px] text-emerald-700 font-semibold hover:underline block pt-1"
                >
                  + Use Sample Certificate &amp; 1-Year Renewed Date
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveVehReupload(null)}
                  className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reuploadingVehDoc}
                  className="px-4 py-2 rounded-lg font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow"
                >
                  {reuploadingVehDoc ? 'Uploading...' : <><Upload size={14} /> Submit Renewed Certificate</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

