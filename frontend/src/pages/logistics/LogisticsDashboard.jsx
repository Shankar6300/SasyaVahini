import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Truck,
  RotateCw,
  Navigation,
  CheckCircle,
  Layers,
  MapPin,
  ExternalLink,
  Thermometer,
  Package,
  Calendar,
  Sliders,
  Plus,
  XCircle,
  Clock,
  Eye,
  ShieldCheck,
  Upload,
  AlertTriangle,
  FileText,
  Check,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logisticsApi from '../../services/logisticsApi';
import LiveMap from '../../components/logistics/LiveMap';
import NearbyBuyerRadar from '../../components/logistics/NearbyBuyerRadar';
import SavingsCard from '../../components/logistics/SavingsCard';
import PlanCards from '../../components/logistics/PlanCards';
import LogisticsProfileView from '../../components/logistics/LogisticsProfileView';
import LogisticsPaymentsView from '../../components/logistics/LogisticsPaymentsView';
import NotificationBell from '../../components/NotificationBell';
import {
  STATUTORY_DOC_TYPES,
  getExpiryStatus,
  getVehicleComplianceSummary,
} from '../../utils/complianceHelpers';
import ShipmentList from './ShipmentList';
import RouteMap from './RouteMap';
import MilestoneUpdater from './MilestoneUpdater';

/**
 * SasyaVahini — Logistics Operations Center & Sub-Router
 *
 * Owner: Member 4
 */
export default function LogisticsDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Child view routing based on pathname
  const path = location.pathname;
  if (path.includes('/payments')) {
    return <MainOperationsDashboard initialTab="payments" />;
  }
  if (path.includes('/shipments')) {
    return <ShipmentList />;
  }
  if (path.includes('/map')) {
    return <RouteMap />;
  }
  if (path.includes('/milestones')) {
    return <MilestoneUpdater />;
  }

  // Otherwise, render main Logistics Operations Dashboard
  return <MainOperationsDashboard />;
}

function MainOperationsDashboard({ initialTab = 'operations' }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab); // 'operations' | 'profile' | 'payments'
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [savings, setSavings] = useState(null);
  const [activeShipment, setActiveShipment] = useState(null);
  const [planResult, setPlanResult] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Vehicle Management & Verification Modal States
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [inspectedVehicle, setInspectedVehicle] = useState(null);
  const [newVehicleForm, setNewVehicleForm] = useState({
    vehicleNumber: '',
    make: 'Tata',
    model: 'Intra V30',
    manufacturingYear: '2023',
    category: 'SCV',
    fuelType: 'DIESEL',
    capacityKg: '1500',
    mileageKmpl: '14.5',
    dimensions: '8.8ft x 5.3ft x 5.0ft',
    baseHub: 'Chakan Agri Hub',
    driverName: 'Kailash Jadhav',
    driverPhone: '+919822099881',
    isRefrigerated: false,
    minTempC: '10',
    maxTempC: '16',
    rcNumber: 'MH-14-AZ-RC99',
    rcExpiry: '2028-12-31',
    insuranceNumber: 'COMM-INS-44910',
    insuranceExpiry: '2026-11-30',
    pucNumber: 'PUC-MH-88129',
    pucExpiry: '2026-05-15',
    fitnessNumber: 'FIT-MH-33120',
    fitnessExpiry: '2027-08-20',
    permitNumber: 'PERMIT-MH-4491',
    permitExpiry: '2029-01-10',
    taxNumber: 'MV-TAX-2026-27',
    taxExpiry: '2027-03-31',
  });

  // Document Re-upload & Inspection State
  const [reuploadingDoc, setReuploadingDoc] = useState(false);
  const [activeReuploadType, setActiveReuploadType] = useState(null);
  const [reuploadForm, setReuploadForm] = useState({
    docType: '',
    docNumber: '',
    expiryDate: '',
    fileUrl: '',
    fileName: '',
  });
  const [reuploadSuccessMsg, setReuploadSuccessMsg] = useState(null);
  const [reuploadError, setReuploadError] = useState(null);

  const handleInspectVehicle = async (veh) => {
    setInspectedVehicle(veh);
    setActiveReuploadType(null);
    setReuploadError(null);
    setReuploadSuccessMsg(null);
    try {
      const fresh = await logisticsApi.getVehicleDetail(veh.id);
      if (fresh) {
        setInspectedVehicle(fresh);
        setVehicles((prev) => prev.map((v) => (v.id === fresh.id ? fresh : v)));
      }
    } catch {
      // Fallback to current veh state
    }
  };

  const handleOpenReupload = (docType, existingDoc = null) => {
    setActiveReuploadType(docType);
    setReuploadError(null);
    setReuploadSuccessMsg(null);
    setReuploadForm({
      docType,
      docNumber: existingDoc?.docNumber || (docType === 'RC' ? `${inspectedVehicle?.vehicleNumber || 'MH14'}-RC` : ''),
      expiryDate: existingDoc?.expiryDate ? existingDoc.expiryDate.slice(0, 10) : '',
      fileUrl: existingDoc?.fileUrl || '',
      fileName: '',
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReuploadForm((prev) => ({
        ...prev,
        fileUrl: reader.result,
        fileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleReuploadSubmit = async (e) => {
    e.preventDefault();
    if (!inspectedVehicle || !reuploadForm.docType) return;
    try {
      setReuploadingDoc(true);
      setReuploadError(null);
      const updatedVeh = await logisticsApi.uploadVehicleDocument(inspectedVehicle.id, {
        docType: reuploadForm.docType,
        docNumber: reuploadForm.docNumber,
        expiryDate: reuploadForm.expiryDate || null,
        fileUrl: reuploadForm.fileUrl || `https://storage.sasyavahini.gov.in/docs/doc_${reuploadForm.docType.toLowerCase()}_${Date.now()}.pdf`,
      });
      setInspectedVehicle(updatedVeh);
      setVehicles((prev) => prev.map((v) => (v.id === updatedVeh.id ? updatedVeh : v)));
      setReuploadSuccessMsg(`Document (${reuploadForm.docType}) re-uploaded successfully! Re-queued for DoCA Compliance Officer audit.`);
      setActiveReuploadType(null);
      setTimeout(() => setReuploadSuccessMsg(null), 6000);
    } catch (err) {
      console.error('Failed to upload document', err);
      setReuploadError(err.message || 'Failed to upload document');
    } finally {
      setReuploadingDoc(false);
    }
  };

  const handleAddVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      setAddingVehicle(true);
      const statutoryDocs = [
        { docType: 'RC', docNumber: newVehicleForm.rcNumber, expiryDate: newVehicleForm.rcExpiry || null, fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_rc.pdf' },
        { docType: 'INSURANCE', docNumber: newVehicleForm.insuranceNumber, expiryDate: newVehicleForm.insuranceExpiry || null, fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_insurance.pdf' },
        { docType: 'PUC', docNumber: newVehicleForm.pucNumber, expiryDate: newVehicleForm.pucExpiry || null, fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_puc.pdf' },
        { docType: 'FITNESS', docNumber: newVehicleForm.fitnessNumber, expiryDate: newVehicleForm.fitnessExpiry || null, fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_fitness.pdf' },
        { docType: 'PERMIT', docNumber: newVehicleForm.permitNumber, expiryDate: newVehicleForm.permitExpiry || null, fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_permit.pdf' },
        { docType: 'ROAD_TAX', docNumber: newVehicleForm.taxNumber, expiryDate: newVehicleForm.taxExpiry || null, fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_tax.pdf' },
      ].filter((d) => d.docNumber);

      const payload = {
        ...newVehicleForm,
        vehicleType:
          newVehicleForm.vehicleType ||
          (newVehicleForm.category === 'HCV'
            ? 'Truck'
            : newVehicleForm.category === 'SCV'
            ? 'Tempo'
            : 'Mini-Truck'),
        capacityKg: parseFloat(newVehicleForm.capacityKg) || 1500,
        mileageKmpl: parseFloat(newVehicleForm.mileageKmpl) || 14.5,
        manufacturingYear: parseInt(newVehicleForm.manufacturingYear, 10) || 2023,
        driverName: newVehicleForm.driverName?.trim() || user?.name || 'Designated Driver',
        driverPhone: newVehicleForm.driverPhone?.trim() || user?.phone || '+919800000000',
        documents: statutoryDocs,
      };

      await logisticsApi.createVehicle(payload);
      setIsAddVehicleOpen(false);
      setNewVehicleForm({
        vehicleNumber: '',
        make: 'Tata',
        model: 'Intra V30',
        manufacturingYear: '2023',
        category: 'SCV',
        fuelType: 'DIESEL',
        capacityKg: '1500',
        mileageKmpl: '14.5',
        dimensions: '8.8ft x 5.3ft x 5.0ft',
        baseHub: 'Chakan Agri Hub',
        driverName: '',
        driverPhone: '',
        isRefrigerated: false,
        minTempC: '10',
        maxTempC: '16',
        rcNumber: '',
        rcExpiry: '',
        insuranceNumber: '',
        insuranceExpiry: '',
        pucNumber: '',
        pucExpiry: '',
        fitnessNumber: '',
        fitnessExpiry: '',
        permitNumber: '',
        permitExpiry: '',
        taxNumber: '',
        taxExpiry: '',
      });
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to register vehicle', err);
      const detailMsg = Array.isArray(err.details)
        ? err.details.map((d) => `${d.field}: ${d.message}`).join(', ')
        : err.message || 'Failed to register vehicle';
      alert(`Registration error: ${detailMsg}`);
    } finally {
      setAddingVehicle(false);
    }
  };

  const getVerificationBadge = (v) => {
    const status = v.verificationStatus || 'VERIFIED';
    if (status === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
          <CheckCircle size={10} /> VERIFIED
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
          <XCircle size={10} /> REJECTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
        <Clock size={10} /> PENDING
      </span>
    );
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [vehRes, shpRes, savRes, profRes] = await Promise.all([
        logisticsApi.getVehicles(),
        logisticsApi.getShipments({ limit: 10 }),
        logisticsApi.getSavingsAnalytics(),
        logisticsApi.getProfile().catch(() => null),
      ]);

      setVehicles(vehRes || []);
      const shipList = shpRes?.shipments || [];
      setShipments(shipList);
      setSavings(savRes);
      setProfile(profRes || null);

      const active = shipList.find((s) => s.status === 'TRANSIT') || shipList[0];
      if (active) {
        setActiveShipment(active);
      }
    } catch (err) {
      console.error('Failed to load logistics dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRunOptimizer = async () => {
    try {
      setOptimizing(true);
      const planRes = await logisticsApi.planOrder({
        crop: 'Onion',
        qtyKg: 1500,
        maxBudget: 80000,
        minGrade: 'GRADE_B',
        minReliability: 0.70,
        priority: 0.5,
        buyerLat: 18.5089,
        buyerLng: 73.9260,
        buyerAddress: 'Pune APMC Market Yard, Gultekdi',
      });

      setPlanResult(planRes);
      if (planRes.plans && planRes.plans.length > 0) {
        setSelectedPlan(planRes.plans[0]);
      }
    } catch (err) {
      console.error('Optimization failed', err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleVehicleLocationUpdate = async (vehicleId, locationPayload) => {
    try {
      await logisticsApi.updateVehicleLocation(vehicleId, locationPayload);
    } catch (err) {
      console.error('Failed to send vehicle GPS telemetry', err);
    }
  };

  const getStatusChip = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'AVAILABLE':
        return <span className="badge badge-success">AVAILABLE</span>;
      case 'ASSIGNED':
        return <span className="badge badge-info">ASSIGNED</span>;
      case 'PICKUP':
        return <span className="badge badge-warning">PICKUP</span>;
      case 'TRANSIT':
        return <span className="badge" style={{ backgroundColor: '#7C3AED', color: '#fff' }}>IN TRANSIT</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="badge badge-warning">OUT FOR DELIVERY</span>;
      case 'DELIVERED':
        return <span className="badge badge-success">DELIVERED</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="main-content space-y-6">
      {/* ─── Module Sub-Navigation Bar ───────────────────────────────────────── */}
      <div className="logistics-subnav flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('operations')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'operations' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Overview & Fleet Operations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'profile' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ShieldCheck size={13} />
            {profile?.partnerType === 'FLEET_OPERATOR'
              ? '🏢 Organization Profile & KYC'
              : profile?.partnerType === 'DRIVER' || profile?.partnerType === 'INDIVIDUAL_DRIVER'
              ? '🪪 Driver Profile & DL'
              : '🚚 Owner Profile & Bank'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'payments' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CreditCard size={13} />
            💳 Payments & Earnings
          </button>
          <Link
            to="/logistics/map"
            className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Live Route Tracking
          </Link>
          <Link
            to="/logistics/milestones"
            className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Milestone Updater
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationBell />
        </div>
      </div>

      {activeTab === 'profile' && (
        <LogisticsProfileView
          profile={profile}
          user={user}
          vehicles={vehicles}
          onProfileUpdated={(updated) => setProfile(updated)}
          onVehicleUpdated={(updatedVeh) => {
            setVehicles((prev) => prev.map((v) => (v.id === updatedVeh.id ? updatedVeh : v)));
          }}
        />
      )}

      {activeTab === 'payments' && (
        <LogisticsPaymentsView
          profile={profile}
          user={user}
        />
      )}

      {activeTab === 'operations' && (
        <>
      {/* ─── Progressive Onboarding & Statutory Compliance Audit Hub ────────── */}
      {(() => {
        const partnerType = profile?.partnerType || 'VEHICLE_OWNER';
        const isOrg = partnerType === 'FLEET_OPERATOR';
        const isDriver = partnerType === 'DRIVER' || partnerType === 'INDIVIDUAL_DRIVER';

        const hasStep1 = true; // Account created at signup
        const hasStep2 = isDriver
          ? Boolean(profile?.drivingLicenceNo)
          : isOrg
          ? Boolean(profile?.businessRegNo || profile?.panNumber || profile?.businessCertUrl)
          : Boolean(profile?.ownerName);
        const hasStep3 = vehicles.length > 0;
        const hasStep4 = Boolean(profile?.accountNumber && profile?.ifscCode);

        const stepsCount = [hasStep1, hasStep2, hasStep3, hasStep4].filter(Boolean).length;
        const progressPct = Math.round((stepsCount / 4) * 100);
        const isVerified = profile?.verificationStatus === 'VERIFIED';
        const isRejected = profile?.verificationStatus === 'REJECTED';

        return (
          <div className="space-y-4">
            {/* Status Alert Banner */}
            {!isVerified && (
              <div
                className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm ${
                  isRejected
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isRejected ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isRejected ? <XCircle size={22} /> : <Clock size={22} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">
                        {isRejected
                          ? 'DoCA Statutory Compliance Action Required'
                          : 'Account In Verification Mode (DoCA Regulatory Audit)'}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isRejected
                            ? 'bg-rose-200 text-rose-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {isRejected ? 'REJECTED' : 'RESTRICTED ACCESS'}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {isRejected
                        ? `Compliance remarks: ${profile?.adminRemarks || profile?.rejectionReason || 'Please review your uploaded documents and resubmit for verification.'}`
                        : 'Your account was registered successfully! You can upload your Driving Licence, RC, and Bank details below at your own pace. Farmer shipments will be unlocked as soon as DoCA officers verify your credentials.'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 shadow-sm transition"
                  >
                    Manage Documents
                  </button>
                </div>
              </div>
            )}

            {isVerified && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">DoCA Verified Commercial Logistics Partner</span>
                    <span className="text-[11px] text-emerald-800">
                      Full statutory compliance active. You are authorized to accept farmer pickups across Maharashtra corridors.
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  ACTIVE PARTNER
                </span>
              </div>
            )}

            {/* In-Portal Progressive Onboarding Checklist Card */}
            {!isVerified && (
              <div className="card p-5 rounded-xl bg-white border shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      <span>Onboarding & Verification Checklist</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {stepsCount} of 4 Complete ({progressPct}%)
                      </span>
                    </h3>
                    <p className="text-xs text-secondary mt-0.5">
                      Submit each requirement at your convenience. You do not need to submit everything at once.
                    </p>
                  </div>

                  <div className="w-full sm:w-48 bg-gray-100 rounded-full h-2.5 overflow-hidden border">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  {/* Step 1 */}
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Step 1</span>
                        <CheckCircle size={14} className="text-emerald-700" />
                      </div>
                      <span className="font-bold text-xs text-gray-900 block">Identity & Role</span>
                      <span className="text-[11px] text-gray-500">Phone & OTP verified</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 mt-2">COMPLETED</span>
                  </div>

                  {/* Step 2 */}
                  <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                    hasStep2 ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/40'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Step 2</span>
                        {hasStep2 ? <CheckCircle size={14} className="text-emerald-700" /> : <Clock size={14} className="text-amber-700" />}
                      </div>
                      <span className="font-bold text-xs text-gray-900 block">
                        {isDriver ? 'Commercial DL' : isOrg ? 'Business Reg (CIN)' : 'Owner Profile'}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {hasStep2 ? 'Submitted for audit' : 'Upload front & back'}
                      </span>
                    </div>
                    {hasStep2 ? (
                      <span className="text-[10px] font-bold text-emerald-700 mt-2">SUBMITTED</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 text-left mt-2 underline"
                      >
                        Submit Now →
                      </button>
                    )}
                  </div>

                  {/* Step 3 */}
                  <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                    hasStep3 ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/40'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Step 3</span>
                        {hasStep3 ? <CheckCircle size={14} className="text-emerald-700" /> : <Clock size={14} className="text-amber-700" />}
                      </div>
                      <span className="font-bold text-xs text-gray-900 block">Vehicle & RC</span>
                      <span className="text-[11px] text-gray-500">
                        {hasStep3 ? `${vehicles.length} vehicle(s) listed` : 'Add your primary truck'}
                      </span>
                    </div>
                    {hasStep3 ? (
                      <span className="text-[10px] font-bold text-emerald-700 mt-2">LISTED</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddVehicleOpen(true)}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 text-left mt-2 underline"
                      >
                        + Add Vehicle →
                      </button>
                    )}
                  </div>

                  {/* Step 4 */}
                  <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                    hasStep4 ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/40'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Step 4</span>
                        {hasStep4 ? <CheckCircle size={14} className="text-emerald-700" /> : <Clock size={14} className="text-amber-700" />}
                      </div>
                      <span className="font-bold text-xs text-gray-900 block">Freight Bank Account</span>
                      <span className="text-[11px] text-gray-500">
                        {hasStep4 ? 'Direct DBT linked' : 'For freight payments'}
                      </span>
                    </div>
                    {hasStep4 ? (
                      <span className="text-[10px] font-bold text-emerald-700 mt-2">LINKED</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 text-left mt-2 underline"
                      >
                        Add Bank →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div className="logistics-workflow">
        <div className="logistics-workflow-heading">
          <div>
            <span className="logistics-eyebrow">Current delivery</span>
            <h2>{activeShipment?.trackingNumber || 'Preparing live shipment data'}</h2>
          </div>
          <span className={`logistics-status ${activeShipment ? 'is-live' : ''}`}>
            {activeShipment?.status || 'LOADING'}
          </span>
        </div>
        <div className="logistics-workflow-details">
          <span><strong>Route:</strong> Manchar → Khed → Hadapsar</span>
          <span><strong>Vehicle:</strong> {activeShipment?.vehicleNumber || 'Loading...'}</span>
          <span><strong>Driver:</strong> {activeShipment?.driverName || 'Loading...'}</span>
          <span><strong>Load:</strong> {activeShipment?.totalWeightKg || 0} kg</span>
        </div>
        <div className="logistics-workflow-actions">
          <Link to={`/logistics/map?shipmentId=${activeShipment?.trackingNumber || 'SV-DATASET-S2-001'}`} className="btn btn-primary btn-sm">
            View live map
          </Link>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className="btn btn-secondary btn-sm"
          >
            💳 View payments
          </button>
          <Link to={`/logistics/milestones?shipmentId=${activeShipment?.trackingNumber || 'SV-DATASET-S2-001'}`} className="btn btn-secondary btn-sm">
            Update status
          </Link>
        </div>
      </div>

      {/* ─── Dark Header with CVRP Badge ───────────────────────────────────── */}
      <div
        className="logistics-header rounded-xl text-white shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1F2937 50%, #064E3B 100%)',
          color: '#FFFFFF',
        }}
      >
        <div className="logistics-header-content">
          <div className="logistics-header-meta">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-gray-950 flex items-center gap-1">
              <Layers size={13} /> CVRP v2.0
            </span>
            <span className="text-xs" style={{ color: '#D1D5DB' }}>OR-Tools + OSRM Multi-Stop Fleet Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#FFFFFF' }}>
            Logistics & Fleet Operations Control
          </h1>
          <p className="text-sm mt-1" style={{ color: '#D1D5DB' }}>
            Real-time multi-farmer pickup aggregation, capacity optimization, and cold-chain monitoring.
          </p>
        </div>

        <div className="logistics-header-actions">
          <button
            type="button"
            onClick={loadDashboardData}
            className="btn btn-secondary text-sm flex items-center gap-1.5 bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"
          >
            <RotateCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleRunOptimizer}
            disabled={optimizing}
            className="btn btn-primary text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
            style={{ backgroundColor: '#07875B', borderColor: '#07875B' }}
          >
            <Navigation size={16} className={optimizing ? 'animate-spin' : ''} />
            {optimizing ? 'Solving CVRP...' : 'Run Route Optimizer'}
          </button>
        </div>
      </div>

      {/* ─── Route Optimization Results (If executed) ────────────────────────── */}
      {planResult && planResult.plans && (
        <div className="card p-5 border-2 border-emerald-500 bg-emerald-50/20 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="text-emerald-600" size={20} />
              Optimization Result: {planResult.requestedQtyKg} kg {planResult.crop}
            </h2>
            <button
              type="button"
              onClick={() => setPlanResult(null)}
              className="text-xs text-secondary hover:underline"
            >
              Dismiss
            </button>
          </div>

          <PlanCards
            plans={planResult.plans}
            selectedPlanId={selectedPlan?.planId}
            onSelectPlan={(p) => setSelectedPlan(p)}
            priority={planResult.priority}
            onPriorityChange={(newPriority) => {
              logisticsApi
                .planOrder({
                  crop: planResult.crop,
                  qtyKg: planResult.requestedQtyKg,
                  priority: newPriority,
                  buyerLat: 18.5089,
                  buyerLng: 73.9260,
                })
                .then((res) => {
                  setPlanResult(res);
                  if (res.plans?.length > 0) setSelectedPlan(res.plans[0]);
                });
            }}
          />
        </div>
      )}

      {/* ─── Map & Impact Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Map Card (2 Cols) */}
        <div className="lg:col-span-2 card p-4 rounded-xl flex flex-col justify-between bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="card-title text-base flex items-center gap-2">
                <Truck size={18} style={{ color: 'var(--color-primary)' }} />
                Active Sourcing & Delivery Corridor (Pune Hub)
              </h2>
              <p className="text-xs text-secondary">
                {selectedPlan
                  ? `Viewing: ${selectedPlan.label} (${selectedPlan.farmers.length} farmers -> Buyer)`
                  : activeShipment
                  ? `Tracking ${activeShipment.trackingNumber} (${activeShipment.status})`
                  : 'Live Fleet Positions'}
              </p>
            </div>
            {activeShipment && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
                <Thermometer size={14} /> 13.8°C Cold-Chain
              </span>
            )}
          </div>

          <LiveMap
            key={activeShipment?.id || selectedPlan?.planId || 'fleet-preview'}
            farmers={selectedPlan ? selectedPlan.farmers : activeShipment ? activeShipment.stops.filter((s) => s.stopType === 'PICKUP') : []}
            buyer={selectedPlan ? selectedPlan.destination : { lat: 18.5089, lng: 73.9260, name: 'Hadapsar Hub' }}
            vehicle={activeShipment ? { ...activeShipment.currentLocation, vehicleNumber: activeShipment.vehicleNumber } : null}
            routeGeometry={selectedPlan?.routeGeometry || activeShipment?.routeGeometry}
            height="380px"
          />
        </div>

        {/* Optimization Impact (1 Col) */}
        <div className="flex flex-col gap-4">
          <SavingsCard
            savings={selectedPlan?.savings || savings || {
              baselineKm: 165,
              optimizedKm: 96,
              savedKm: 69,
              fuelSavedRs: 1639,
              utilizationPercent: 100,
            }}
          />

          <NearbyBuyerRadar
            vehicles={vehicles}
            shipments={shipments}
            onLocationUpdate={handleVehicleLocationUpdate}
          />

          {/* Quick Dispatch / Fleet Summary Card */}
          <div className="card p-4 rounded-xl bg-white border flex-1" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center justify-between">
              <span>Fleet Dispatch Hub</span>
              <span className="text-xs font-normal text-secondary">Pune Agri Zone</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                <span className="text-secondary">Registered Goods Vehicles:</span>
                <span className="font-bold text-gray-900">{vehicles.length} {vehicles.length === 1 ? 'Vehicle' : 'Vehicles'}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-emerald-50 text-emerald-800">
                <span>Available for Dispatch:</span>
                <span className="font-bold">
                  {vehicles.filter((v) => v.status === 'AVAILABLE').length} Ready
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-purple-50 text-purple-800">
                <span>Active in Transit:</span>
                <span className="font-bold">
                  {vehicles.filter((v) => v.status === 'ASSIGNED' || v.status === 'IN_TRANSIT').length} En Route
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => navigate('/logistics/shipments')}
                className="btn btn-secondary w-full text-xs"
              >
                View Shipments
              </button>
              <button
                type="button"
                onClick={() => navigate('/logistics/milestones')}
                className="btn btn-primary w-full text-xs"
              >
                Update Milestones
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Active Fleet Vehicles Table (Strictly Scoped Multi-Tenant Fleet) ─── */}
      <div className="card p-5 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="card-title text-base">
                {profile?.partnerType === 'FLEET_OPERATOR'
                  ? `${profile?.companyName || user?.name + ' Logistics'} — Corporate Commercial Fleet`
                  : profile?.partnerType === 'DRIVER' || profile?.partnerType === 'INDIVIDUAL_DRIVER'
                  ? 'My Assigned Commercial Vehicle'
                  : `${profile?.ownerName || user?.name || 'Owner'}'s Goods Vehicles`}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                {vehicles.length} {vehicles.length === 1 ? 'Vehicle' : 'Vehicles'} Listed
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              {profile?.partnerType === 'FLEET_OPERATOR'
                ? `Restricted Enterprise View • Only commercial vehicles owned by ${profile?.companyName || 'your company'} are displayed. Zero data leakage across fleets.`
                : profile?.partnerType === 'DRIVER' || profile?.partnerType === 'INDIVIDUAL_DRIVER'
                ? 'Commercial Driver View • Displaying only vehicles registered or assigned to your license.'
                : 'Private Transporter View • Showing vehicles registered under your account.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              Register New Vehicle
            </button>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/70 border border-dashed rounded-xl my-2">
            <Truck size={36} className="mx-auto text-gray-400 mb-2" />
            <h3 className="font-bold text-gray-800 text-sm">
              No Commercial Vehicles Registered Under {profile?.partnerType === 'FLEET_OPERATOR' ? (profile?.companyName || 'Your Organization') : (profile?.ownerName || user?.name || 'Your Account')}
            </h3>
            <p className="text-xs text-secondary max-w-md mx-auto mt-1 mb-4">
              Multi-tenant data isolation is active. Other transporters' vehicles and statutory documents are completely isolated from your account. Click below to add your primary goods vehicle.
            </p>
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 shadow"
            >
              <Plus size={14} />
              Register Your Vehicle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="text-left py-2.5">Vehicle Reg. No.</th>
                  <th className="text-left py-2.5">Make & Model</th>
                  <th className="text-left py-2.5">Category</th>
                  <th className="text-left py-2.5">Legal Payload</th>
                  <th className="text-left py-2.5">Mileage (km/L)</th>
                  <th className="text-left py-2.5">Driver & Phone</th>
                  <th className="text-left py-2.5">Assigned Depot</th>
                  <th className="text-left py-2.5">RTO Compliance</th>
                  <th className="text-left py-2.5">Status</th>
                  <th className="text-right py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id || v.vehicleNumber} className="border-b hover:bg-gray-50/70" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="py-2.5 font-bold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Truck size={13} className="text-emerald-700" />
                        <span>{v.vehicleNumber}</span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="font-semibold text-gray-800">{v.make || 'Tata'} {v.model || v.vehicleType}</div>
                      <div className="text-[10px] text-secondary">{v.manufacturingYear || 2023} • {v.fuelType || 'DIESEL'}</div>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                        {v.category || (v.capacityKg > 5000 ? 'HCV' : v.capacityKg >= 2500 ? 'MCV' : 'SCV')}
                      </span>
                      {v.isRefrigerated && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">
                          ❄️ Reefer
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 font-bold text-gray-900">{v.capacityKg} kg</td>
                    <td className="py-2.5 text-secondary">{v.mileageKmpl || 14.5} km/L</td>
                    <td className="py-2.5">
                      <div className="font-medium text-gray-900">{v.driverName}</div>
                      <div className="text-[10px] text-secondary">{v.driverPhone}</div>
                    </td>
                    <td className="py-2.5 text-secondary">{v.baseHub || v.hubName || 'Pune Rural Depot'}</td>
                    <td className="py-2.5">
                      <div className="flex flex-col gap-1 items-start">
                        {getVerificationBadge(v)}
                        {(() => {
                          const comp = getVehicleComplianceSummary(v);
                          if (comp.status === 'EXPIRED') {
                            return (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse" title={comp.reason}>
                                🚨 EXPIRED (Hold)
                              </span>
                            );
                          }
                          if (comp.status === 'EXPIRING_SOON') {
                            return (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300" title={comp.reason}>
                                ⚠️ Expiring Soon
                              </span>
                            );
                          }
                          return (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✓ Active Docs
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-2.5">
                      {(() => {
                        const comp = getVehicleComplianceSummary(v);
                        if (!comp.canAllocate) {
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                🔒 BLOCKED
                              </span>
                              <span className="text-[9px] text-rose-700 font-semibold">Hold on Dispatch</span>
                            </div>
                          );
                        }
                        return getStatusChip(v.status);
                      })()}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleInspectVehicle(v)}
                        className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold"
                        title="Inspect technical specifications and certificates"
                      >
                        <Eye size={12} className="inline mr-1" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </>
      )}

      {/* ─── Modal: Register New Commercial Vehicle ─── */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-emerald-700" />
                <h3 className="font-bold text-base text-gray-900">Add Vehicle to Commercial Fleet</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVehicleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Vehicle Reg Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-12-RN-9988"
                    value={newVehicleForm.vehicleNumber}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Commercial Category *</label>
                  <select
                    value={newVehicleForm.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setNewVehicleForm((f) => ({
                        ...f,
                        category: cat,
                        capacityKg: cat === 'SCV' ? '1500' : cat === 'MCV' ? '3500' : '9000',
                        mileageKmpl: cat === 'SCV' ? '14.5' : cat === 'MCV' ? '8.5' : '4.5',
                      }));
                    }}
                    className="form-select text-xs w-full"
                  >
                    <option value="SCV">SCV - Small Commercial (&lt; 2.5T)</option>
                    <option value="MCV">MCV - Medium Commercial (2.5T - 9T)</option>
                    <option value="HCV">HCV - Heavy Commercial (&gt; 9T)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Manufacturer (Make) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Motors"
                    value={newVehicleForm.make}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, make: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Intra V30"
                    value={newVehicleForm.model}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, model: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Payload Capacity (kg) *</label>
                  <input
                    type="number"
                    required
                    value={newVehicleForm.capacityKg}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, capacityKg: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Fuel Efficiency (km/L) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newVehicleForm.mileageKmpl}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, mileageKmpl: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Fuel Type</label>
                  <select
                    value={newVehicleForm.fuelType}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, fuelType: e.target.value }))}
                    className="form-select text-xs w-full"
                  >
                    <option value="DIESEL">Diesel</option>
                    <option value="CNG">CNG</option>
                    <option value="ELECTRIC">Electric (EV)</option>
                    <option value="PETROL">Petrol</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanjay Thorat"
                    value={newVehicleForm.driverName}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, driverName: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Driver Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+919822001122"
                    value={newVehicleForm.driverPhone}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, driverPhone: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Base Logistics Hub *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chakan Agri Depot"
                    value={newVehicleForm.baseHub}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, baseHub: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Cargo Bed Dimensions</label>
                  <input
                    type="text"
                    placeholder="8.8ft x 5.3ft x 5.0ft"
                    value={newVehicleForm.dimensions}
                    onChange={(e) => setNewVehicleForm((f) => ({ ...f, dimensions: e.target.value }))}
                    className="form-input text-xs w-full"
                  />
                </div>
              </div>

              {/* Statutory Documents & Validity Expiries */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-teal-700" />
                      Statutory Documents & Expiry Dates (MVA Compliance)
                    </h4>
                    <p className="text-[10px] text-gray-500">
                      RC, Insurance, Pollution (PUC), and Fitness are required for shipment allocation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewVehicleForm((f) => ({
                        ...f,
                        rcNumber: f.rcNumber || 'MH14-RC-2024-9988',
                        rcExpiry: '2028-12-31',
                        insuranceNumber: f.insuranceNumber || 'NIC-COMM-991204',
                        insuranceExpiry: '2026-12-15',
                        pucNumber: f.pucNumber || 'PUC-MH-88129',
                        pucExpiry: '2026-06-30',
                        fitnessNumber: f.fitnessNumber || 'FIT-MH-33120',
                        fitnessExpiry: '2027-08-20',
                        permitNumber: f.permitNumber || 'PERMIT-MH-4491',
                        permitExpiry: '2029-01-10',
                        taxNumber: f.taxNumber || 'MV-TAX-2026-27',
                        taxExpiry: '2027-03-31',
                      }));
                    }}
                    className="text-[10px] font-semibold text-teal-800 hover:underline"
                  >
                    + Pre-fill Sample Certificates
                  </button>
                </div>

                {/* RC & Insurance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold block text-[11px]">1. Registration Certificate (RC) *</label>
                    <input
                      type="text"
                      placeholder="e.g. MH14AZ-RC-2024"
                      value={newVehicleForm.rcNumber}
                      onChange={(e) => setNewVehicleForm((f) => ({ ...f, rcNumber: e.target.value }))}
                      className="form-input text-xs w-full py-1.5"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 shrink-0">RC Expiry:</span>
                      <input
                        type="date"
                        value={newVehicleForm.rcExpiry}
                        onChange={(e) => setNewVehicleForm((f) => ({ ...f, rcExpiry: e.target.value }))}
                        className="form-input text-xs w-full py-1 px-1.5"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold block text-[11px]">2. Commercial Insurance Policy *</label>
                    <input
                      type="text"
                      placeholder="e.g. NIC-COMM-991204"
                      value={newVehicleForm.insuranceNumber}
                      onChange={(e) => setNewVehicleForm((f) => ({ ...f, insuranceNumber: e.target.value }))}
                      className="form-input text-xs w-full py-1.5"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 shrink-0">Policy Expiry:</span>
                      <input
                        type="date"
                        value={newVehicleForm.insuranceExpiry}
                        onChange={(e) => setNewVehicleForm((f) => ({ ...f, insuranceExpiry: e.target.value }))}
                        className="form-input text-xs w-full py-1 px-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Pollution (PUC) & Fitness */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-200">
                  <div className="space-y-1">
                    <label className="font-semibold block text-[11px]">3. Pollution Under Control (PUC) *</label>
                    <input
                      type="text"
                      placeholder="e.g. PUC-MH-88129"
                      value={newVehicleForm.pucNumber}
                      onChange={(e) => setNewVehicleForm((f) => ({ ...f, pucNumber: e.target.value }))}
                      className="form-input text-xs w-full py-1.5"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 shrink-0">PUC Expiry:</span>
                      <input
                        type="date"
                        value={newVehicleForm.pucExpiry}
                        onChange={(e) => setNewVehicleForm((f) => ({ ...f, pucExpiry: e.target.value }))}
                        className="form-input text-xs w-full py-1 px-1.5"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold block text-[11px]">4. Fitness Certificate (Form 38) *</label>
                    <input
                      type="text"
                      placeholder="e.g. FIT-MH-33120"
                      value={newVehicleForm.fitnessNumber}
                      onChange={(e) => setNewVehicleForm((f) => ({ ...f, fitnessNumber: e.target.value }))}
                      className="form-input text-xs w-full py-1.5"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 shrink-0">Fitness Expiry:</span>
                      <input
                        type="date"
                        value={newVehicleForm.fitnessExpiry}
                        onChange={(e) => setNewVehicleForm((f) => ({ ...f, fitnessExpiry: e.target.value }))}
                        className="form-input text-xs w-full py-1 px-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Route Permit & Road Tax */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-200">
                  <div className="space-y-1">
                    <label className="font-semibold block text-[11px]">5. Goods Route Permit (Form 47)</label>
                    <input
                      type="text"
                      placeholder="e.g. PERMIT-MH-4491"
                      value={newVehicleForm.permitNumber}
                      onChange={(e) => setNewVehicleForm((f) => ({ ...f, permitNumber: e.target.value }))}
                      className="form-input text-xs w-full py-1.5"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 shrink-0">Permit Expiry:</span>
                      <input
                        type="date"
                        value={newVehicleForm.permitExpiry}
                        onChange={(e) => setNewVehicleForm((f) => ({ ...f, permitExpiry: e.target.value }))}
                        className="form-input text-xs w-full py-1 px-1.5"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold block text-[11px]">6. Road Tax Receipt / Token</label>
                    <input
                      type="text"
                      placeholder="e.g. MV-TAX-2026-27"
                      value={newVehicleForm.taxNumber}
                      onChange={(e) => setNewVehicleForm((f) => ({ ...f, taxNumber: e.target.value }))}
                      className="form-input text-xs w-full py-1.5"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 shrink-0">Tax Valid Till:</span>
                      <input
                        type="date"
                        value={newVehicleForm.taxExpiry}
                        onChange={(e) => setNewVehicleForm((f) => ({ ...f, taxExpiry: e.target.value }))}
                        className="form-input text-xs w-full py-1 px-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingVehicle}
                  className="btn btn-primary text-xs"
                >
                  {addingVehicle ? 'Registering...' : 'Register Vehicle & Queue for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Inspect Vehicle Specs & Statutory Document Management ─── */}
      {inspectedVehicle && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Truck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-gray-900">{inspectedVehicle.vehicleNumber}</h3>
                    {getVerificationBadge(inspectedVehicle)}
                    {inspectedVehicle.isRefrigerated && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">
                        ❄️ Cold-Chain
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary">
                    {inspectedVehicle.make || 'Tata'} {inspectedVehicle.model || inspectedVehicle.vehicleType} • {inspectedVehicle.category || 'SCV'} • {inspectedVehicle.fuelType || 'DIESEL'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectedVehicle(null);
                  setActiveReuploadType(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Rejection Alert Banner if vehicle status is REJECTED */}
            {inspectedVehicle.verificationStatus === 'REJECTED' && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800 text-sm">
                  <AlertTriangle size={16} /> Statutory Audit Notice — Action Required
                </div>
                <p className="text-rose-800">
                  This vehicle has been marked <strong>REJECTED</strong> by the DoCA Compliance Officer.
                  {inspectedVehicle.rejectionReason && (
                    <span className="block font-semibold mt-0.5">
                      Reason: {inspectedVehicle.rejectionReason}
                    </span>
                  )}
                  {inspectedVehicle.adminRemarks && (
                    <span className="block text-[11px] text-rose-700 mt-0.5">
                      Auditor Remarks: {inspectedVehicle.adminRemarks}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-rose-700">
                  Please review the statutory document items flagged below, click <strong>Re-upload Document</strong>, and provide updated valid certificates. Once submitted, the vehicle will immediately re-enter the DoCA review queue.
                </p>
              </div>
            )}

            {/* Expired Documents Allocation Blocked Notice */}
            {(() => {
              const comp = getVehicleComplianceSummary(inspectedVehicle);
              if (!comp.canAllocate && comp.status === 'EXPIRED') {
                return (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-800 text-sm">
                      <AlertTriangle size={16} /> Statutory Compliance Notice — Vehicle Allocation Blocked
                    </div>
                    <p className="text-rose-800">
                      This vehicle cannot be allocated to farmer shipment runs because the following statutory certificate(s) have expired: <strong>{comp.expiredDocs.map((d) => d.docType).join(', ')}</strong>.
                    </p>
                    <p className="text-[11px] text-rose-700">
                      In accordance with the Motor Vehicles Act and DoCA transit regulations, expired commercial vehicles are paused from allocation. Please click <strong>Upload Renewed Certificate</strong> below to submit renewed documents and restore allocation.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Success message banner */}
            {reuploadSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-700 shrink-0" />
                <span className="font-medium">{reuploadSuccessMsg}</span>
              </div>
            )}

            {/* Specs Grid */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <span className="text-secondary block text-[10px] uppercase font-semibold">Legal Payload</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.capacityKg} kg</span>
              </div>
              <div>
                <span className="text-secondary block text-[10px] uppercase font-semibold">Mileage</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.mileageKmpl || 14.5} km/L</span>
              </div>
              <div>
                <span className="text-secondary block text-[10px] uppercase font-semibold">Cargo Dimensions</span>
                <span className="font-bold text-gray-900 truncate block">{inspectedVehicle.dimensions || '8.8ft x 5.3ft x 5.0ft'}</span>
              </div>
              <div>
                <span className="text-secondary block text-[10px] uppercase font-semibold">Home Depot</span>
                <span className="font-bold text-gray-900 truncate block">{inspectedVehicle.baseHub || inspectedVehicle.hubName || 'Pune Rural Depot'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-secondary block text-[10px] uppercase font-semibold">Driver</span>
                <span className="font-bold text-gray-900">{inspectedVehicle.driverName} ({inspectedVehicle.driverPhone})</span>
              </div>
              <div className="col-span-2">
                <span className="text-secondary block text-[10px] uppercase font-semibold">RTO Compliance</span>
                <span className="font-bold text-emerald-800">
                  {inspectedVehicle.rcVerified && inspectedVehicle.insuranceVerified ? 'Fully Compliant ✓' : 'Statutory Review Incomplete ⏳'}
                </span>
              </div>
            </div>

            {/* Statutory Documents Section Header */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-teal-700" />
                    Statutory Documents & DoCA Compliance Vault
                  </h4>
                  <p className="text-[11px] text-secondary">
                    Official RTO & Central Motor Vehicles Rules compliance. Re-upload rejected or expired certificates to re-queue for verification.
                  </p>
                </div>
              </div>

              {/* Documents List */}
              <div className="space-y-2.5">
                {STATUTORY_DOC_TYPES.map((docDef) => {
                  const existingDoc = inspectedVehicle.documents?.find((d) => d.docType === docDef.type);
                  const isFlagVerified = inspectedVehicle[docDef.flagKey];
                  const expiryInfo = getExpiryStatus(existingDoc?.expiryDate);
                  const isExpired = expiryInfo.isExpired;
                  const docStatus = existingDoc?.verificationStatus || (isFlagVerified ? 'VERIFIED' : 'NOT_UPLOADED');
                  const isRejected = docStatus === 'REJECTED';
                  const isPending = docStatus === 'PENDING';
                  const isVerified = docStatus === 'VERIFIED';
                  const isMissing = docStatus === 'NOT_UPLOADED';
                  const isEditingThis = activeReuploadType === docDef.type;

                  return (
                    <div
                      key={docDef.type}
                      className={`p-3 rounded-xl border transition-all ${
                        isExpired
                          ? 'bg-rose-50/80 border-rose-400'
                          : isRejected
                          ? 'bg-rose-50/50 border-rose-300'
                          : isPending
                          ? 'bg-amber-50/40 border-amber-300'
                          : isVerified
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : 'bg-gray-50/70 border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            isExpired || isRejected
                              ? 'bg-rose-100 text-rose-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <FileText size={16} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-xs text-gray-900">{docDef.label}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-200 text-gray-700">
                                {docDef.type}
                              </span>
                              {docDef.mandatory && (
                                <span className="text-[9px] font-bold text-rose-600 uppercase">Mandatory</span>
                              )}
                            </div>
                            <div className="text-[11px] text-secondary flex flex-wrap items-center gap-2 mt-0.5">
                              <span>Doc No: <strong className="font-mono text-gray-800">{existingDoc?.docNumber || '—'}</strong></span>
                              {existingDoc?.expiryDate ? (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] ${expiryInfo.badgeClass}`}>
                                  {expiryInfo.label}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">• No Expiry Set</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status badge & action buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              <XCircle size={10} /> EXPIRED
                            </span>
                          )}
                          {!isExpired && isVerified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle size={10} /> VERIFIED
                            </span>
                          )}
                          {!isExpired && isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock size={10} /> UNDER AUDIT
                            </span>
                          )}
                          {!isExpired && isRejected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              <XCircle size={10} /> REJECTED
                            </span>
                          )}
                          {!isExpired && isMissing && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-300">
                              NOT UPLOADED
                            </span>
                          )}

                          {existingDoc?.fileUrl && (
                            <a
                              href={existingDoc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-white hover:bg-gray-100 border text-[11px] font-semibold text-gray-700 inline-flex items-center gap-1 shadow-sm"
                              title="View current uploaded certificate"
                            >
                              <ExternalLink size={11} /> View
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingThis) {
                                setActiveReuploadType(null);
                              } else {
                                handleOpenReupload(docDef.type, existingDoc);
                              }
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold inline-flex items-center gap-1 shadow-sm transition ${
                              isExpired || isRejected
                                ? 'bg-rose-700 hover:bg-rose-800 text-white'
                                : isMissing
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
                            }`}
                          >
                            {isEditingThis ? (
                              'Cancel'
                            ) : isExpired ? (
                              <>
                                <Upload size={11} />
                                Upload Renewed Certificate
                              </>
                            ) : isRejected ? (
                              <>
                                <Upload size={11} />
                                Re-upload
                              </>
                            ) : isMissing ? (
                              <>
                                <Plus size={11} />
                                Upload
                              </>
                            ) : (
                              <>
                                <RotateCw size={11} />
                                Replace / Renew
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expired Certificate Warning */}
                      {isExpired && (
                        <div className="mt-2 p-2 rounded-lg bg-rose-100 border border-rose-300 text-[11px] text-rose-950 flex items-start gap-1.5">
                          <AlertTriangle size={13} className="text-rose-700 shrink-0 mt-0.5" />
                          <div>
                            <strong>Expired Certificate — Allocation Paused: </strong>
                            <span>This certificate expired on {new Date(existingDoc.expiryDate).toLocaleDateString()}. Motor Vehicles Act requires valid statutory documents. Please upload the renewed certificate to re-activate vehicle allocation.</span>
                          </div>
                        </div>
                      )}

                      {/* Auditor Remarks / Rejection details */}
                      {(existingDoc?.rejectionReason || existingDoc?.adminRemarks) && (
                        <div className="mt-2 p-2 rounded-lg bg-rose-100/70 border border-rose-200 text-[11px] text-rose-900 flex items-start gap-1.5">
                          <AlertTriangle size={13} className="text-rose-700 shrink-0 mt-0.5" />
                          <div>
                            <strong>DoCA Compliance Auditor Remarks: </strong>
                            <span>{existingDoc.rejectionReason || existingDoc.adminRemarks}</span>
                          </div>
                        </div>
                      )}

                      {/* Inline Re-upload Form Drawer */}
                      {isEditingThis && (
                        <form onSubmit={handleReuploadSubmit} className="mt-3 p-3.5 rounded-xl bg-white border border-teal-300 shadow-md space-y-3">
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="font-bold text-xs text-teal-950 flex items-center gap-1">
                              <Upload size={13} className="text-teal-700" />
                              {isRejected ? 'Re-upload / Replace Document' : isMissing ? 'Upload Document' : 'Update Existing Document'}: {docDef.label}
                            </span>
                            <span className="text-[10px] text-secondary">PDF, PNG, JPG (Max 5MB)</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                                Document / Certificate Number *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder={`e.g. ${docDef.sampleNum}`}
                                value={reuploadForm.docNumber}
                                onChange={(e) => setReuploadForm((f) => ({ ...f, docNumber: e.target.value }))}
                                className="form-input text-xs w-full py-1.5 px-2.5 rounded-lg border-gray-300"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                                Expiry Date (Optional)
                              </label>
                              <input
                                type="date"
                                value={reuploadForm.expiryDate}
                                onChange={(e) => setReuploadForm((f) => ({ ...f, expiryDate: e.target.value }))}
                                className="form-input text-xs w-full py-1.5 px-2.5 rounded-lg border-gray-300"
                              />
                            </div>
                          </div>

                          {/* File Picker & URL */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-gray-700 block">
                              Select Document File / Upload
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                              <input
                                type="file"
                                accept=".pdf,image/png,image/jpeg"
                                onChange={handleFileUpload}
                                className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100"
                              />
                              <span className="text-[10px] text-gray-400">or enter link:</span>
                              <input
                                type="url"
                                placeholder="https://storage.sasyavahini.gov.in/docs/cert.pdf"
                                value={reuploadForm.fileUrl && !reuploadForm.fileUrl.startsWith('data:') ? reuploadForm.fileUrl : ''}
                                onChange={(e) => setReuploadForm((f) => ({ ...f, fileUrl: e.target.value }))}
                                className="form-input text-xs flex-1 py-1.5 px-2.5 rounded-lg border-gray-300"
                              />
                            </div>
                            {reuploadForm.fileName && (
                              <p className="text-[10px] text-teal-700 font-semibold flex items-center gap-1">
                                <Check size={11} /> Selected: {reuploadForm.fileName}
                              </p>
                            )}
                          </div>

                          {reuploadError && (
                            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                              {reuploadError}
                            </div>
                          )}

                          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t">
                            <button
                              type="button"
                              onClick={() => {
                                setReuploadForm((f) => ({
                                  ...f,
                                  docNumber: f.docNumber || docDef.sampleNum,
                                  fileUrl: `https://storage.sasyavahini.gov.in/docs/sample_${docDef.type.toLowerCase()}.pdf`,
                                }));
                              }}
                              className="text-[10px] font-semibold text-teal-800 hover:underline"
                            >
                              + Use Gov Vault Sample Document
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveReuploadType(null)}
                                className="btn btn-secondary text-xs py-1 px-3"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={reuploadingDoc}
                                className="btn btn-primary text-xs py-1 px-3.5 flex items-center gap-1"
                              >
                                {reuploadingDoc ? (
                                  <>
                                    <RotateCw size={12} className="animate-spin" /> Submitting...
                                  </>
                                ) : (
                                  <>
                                    <Upload size={12} /> Submit to DoCA Verification Queue
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setInspectedVehicle(null);
                  setActiveReuploadType(null);
                }}
                className="btn btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Active Orders & Shipments Table ─────────────────────────────────── */}
      <div className="card p-5 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="card-title text-base">Active Procurement Orders & Shipments</h2>
            <p className="text-xs text-secondary">
              Multi-stop fulfillment progress, route distances, and milestone tracking.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <th className="text-left py-2">Tracking #</th>
                <th className="text-left py-2">Order ID</th>
                <th className="text-left py-2">Total Load</th>
                <th className="text-left py-2">Route Summary</th>
                <th className="text-left py-2">Distance</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-b hover:bg-gray-50/70" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="py-2.5 font-bold" style={{ color: 'var(--color-primary)' }}>
                    {s.trackingNumber}
                  </td>
                  <td className="py-2.5 text-secondary">{s.orderId}</td>
                  <td className="py-2.5 font-semibold">{s.totalWeightKg} kg</td>
                  <td className="py-2.5 text-secondary">
                    {s.stops?.length ? `${s.stops.length - 1} pickups -> ${s.stops[s.stops.length - 1]?.stopName?.slice(0, 20)}` : 'Multi-stop route'}
                  </td>
                  <td className="py-2.5">{s.totalDistanceKm} km</td>
                  <td className="py-2.5">{getStatusChip(s.status)}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveShipment(s);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="btn btn-secondary text-xs px-2 py-1"
                    >
                      Focus Map
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
