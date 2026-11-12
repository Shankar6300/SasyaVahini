import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Building,
  RefreshCw,
  ExternalLink,
  Eye,
  AlertTriangle,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logisticsApi from '../../services/logisticsApi';
import Button from '../../components/Button';
import Alert from '../../components/Alert';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState({
    pendingVehiclesCount: 0,
    verifiedVehiclesCount: 0,
    rejectedVehiclesCount: 0,
    pendingPartnersCount: 0,
    totalPartnersCount: 0,
  });
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [pendingPartners, setPendingPartners] = useState([]);
  const [allPartners, setAllPartners] = useState([]);
  const [activeTab, setActiveTab] = useState('vehicles'); // 'vehicles' | 'drivers' | 'all_fleet'
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Inspection modal state
  const [inspectedItem, setInspectedItem] = useState(null);
  const [inspectType, setInspectType] = useState('vehicle'); // 'vehicle' | 'driver'
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, item: null, type: 'vehicle', reason: '' });

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const res = await logisticsApi.getAdminVerificationQueue();
      if (res) {
        setStats(res.stats || {});
        setPendingVehicles(res.pendingVehicles || []);
        setPendingPartners(res.pendingPartners || []);
        setAllPartners(res.allPartners || []);
      }
    } catch (err) {
      console.error('Failed to load admin verification queue', err);
      setFeedback({ type: 'error', message: 'Failed to load verification queue from server.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
  }, []);

  const handleVerifyVehicle = async (vehicleId, status, remarks = '', rejectionReason = '') => {
    try {
      setActionLoading(true);
      await logisticsApi.verifyVehicle(vehicleId, {
        status,
        adminRemarks: remarks || (status === 'VERIFIED' ? 'Approved by DoCA Transport Officer' : remarks),
        rejectionReason,
      });
      setFeedback({
        type: 'success',
        message: `Vehicle ${status === 'VERIFIED' ? 'approved and activated' : 'marked as rejected'}.`,
      });
      setRejectionModal({ isOpen: false, item: null, type: 'vehicle', reason: '' });
      setInspectedItem(null);
      await fetchQueueData();
    } catch (err) {
      console.error('Error verifying vehicle', err);
      setFeedback({ type: 'error', message: err.message || 'Verification update failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyDriver = async (partnerId, status, remarks = '', rejectionReason = '') => {
    try {
      setActionLoading(true);
      await logisticsApi.verifyDriver(partnerId, {
        status,
        adminRemarks: remarks || (status === 'VERIFIED' ? 'Driver Licence & KYC verified by DoCA' : remarks),
        rejectionReason,
      });
      setFeedback({
        type: 'success',
        message: `Transport Partner ${status === 'VERIFIED' ? 'approved and activated' : 'marked as rejected'}.`,
      });
      setRejectionModal({ isOpen: false, item: null, type: 'driver', reason: '' });
      setInspectedItem(null);
      await fetchQueueData();
    } catch (err) {
      console.error('Error verifying driver', err);
      setFeedback({ type: 'error', message: err.message || 'Driver verification update failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const getVerificationBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle size={12} /> VERIFIED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle size={12} /> REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock size={12} /> PENDING REVIEW
          </span>
        );
    }
  };

  const filteredVehicles = pendingVehicles.filter((v) => {
    const q = searchTerm.toLowerCase();
    return (
      (v.vehicleNumber || '').toLowerCase().includes(q) ||
      (v.make || '').toLowerCase().includes(q) ||
      (v.model || '').toLowerCase().includes(q) ||
      (v.logistics?.companyName || '').toLowerCase().includes(q) ||
      (v.driverName || '').toLowerCase().includes(q)
    );
  });

  const filteredPartners = pendingPartners.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      (p.user?.name || '').toLowerCase().includes(q) ||
      (p.companyName || '').toLowerCase().includes(q) ||
      (p.drivingLicenceNo || '').toLowerCase().includes(q) ||
      (p.partnerType || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="main-content space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck size={24} />
            </span>
            <div>
              <h1 className="heading-2 text-xl font-bold">DoCA Logistics Administration Center</h1>
              <p className="text-xs text-secondary">
                Department of Consumer Affairs (DoCA) • Commercial Vehicle Verification, Driver Licence Audit & Statutory Compliance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchQueueData}
            disabled={loading}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Queue
          </button>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* ─── High-Level Metric KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between text-secondary mb-1">
            <span className="text-xs font-semibold">Pending Vehicles</span>
            <Truck size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.pendingVehiclesCount}</div>
          <div className="text-[11px] text-amber-700 mt-1">Awaiting RTO & Insurance verification</div>
        </div>

        <div className="card p-4 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between text-secondary mb-1">
            <span className="text-xs font-semibold">Pending Drivers</span>
            <UserCheck size={18} className="text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.pendingPartnersCount}</div>
          <div className="text-[11px] text-sky-700 mt-1">Awaiting DL & KYC verification</div>
        </div>

        <div className="card p-4 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between text-secondary mb-1">
            <span className="text-xs font-semibold">Verified Fleet</span>
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.verifiedVehiclesCount || 10}</div>
          <div className="text-[11px] text-emerald-700 mt-1">Active in procurement logistics</div>
        </div>

        <div className="card p-4 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between text-secondary mb-1">
            <span className="text-xs font-semibold">Total Operators</span>
            <Building size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalPartnersCount}</div>
          <div className="text-[11px] text-purple-700 mt-1">Registered transport enterprises</div>
        </div>
      </div>

      {/* ─── Search & Tab Filters ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('vehicles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'vehicles' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Commercial Vehicles Queue ({stats.pendingVehiclesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drivers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'drivers' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Driver & Partner KYC ({stats.pendingPartnersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all_fleet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'all_fleet' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Registered Fleet
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search reg #, model, carrier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-8 py-1.5 text-xs w-full"
          />
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: VEHICLE VERIFICATION QUEUE                                    */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'vehicles' && (
        <div className="card p-5 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="card-title text-base">Pending Commercial Vehicles & Document Queue</h2>
              <p className="text-xs text-secondary">
                Inspect RC, Commercial Insurance, Fitness, Carriage Permit, PUC, and Road Tax tokens.
              </p>
            </div>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-secondary border rounded-lg bg-gray-50/50">
              <CheckCircle size={32} className="mx-auto text-emerald-600 mb-2" />
              <p className="font-semibold text-sm">All commercial vehicles have been verified!</p>
              <p className="text-xs text-secondary mt-1">
                New vehicles registered by transport partners will automatically appear in this review queue.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="text-left py-2.5">Vehicle Reg. No.</th>
                    <th className="text-left py-2.5">Make & Model</th>
                    <th className="text-left py-2.5">Category</th>
                    <th className="text-left py-2.5">Payload & Mileage</th>
                    <th className="text-left py-2.5">Carrier / Partner</th>
                    <th className="text-left py-2.5">Compliance Docs</th>
                    <th className="text-left py-2.5">Status</th>
                    <th className="text-right py-2.5">DoCA Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="border-b hover:bg-gray-50/70" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="py-3 font-bold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <Truck size={14} className="text-emerald-700" />
                          <span>{v.vehicleNumber}</span>
                        </div>
                        <div className="text-[11px] text-secondary font-normal">{v.baseHub || 'Pune Depot'}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-semibold">{v.make || 'Tata'} {v.model || 'Intra V30'}</div>
                        <div className="text-[11px] text-secondary">{v.manufacturingYear || 2023} • {v.fuelType || 'DIESEL'}</div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800">
                          {v.category || 'SCV'}
                        </span>
                        {v.isRefrigerated && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">
                            ❄️ Reefer
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold">{v.capacityKg} kg</div>
                        <div className="text-[11px] text-secondary">{v.mileageKmpl || 14.5} km/L</div>
                      </td>
                      <td className="py-3">
                        <div className="font-semibold">{v.logistics?.companyName || v.logistics?.user?.name || v.driverName}</div>
                        <div className="text-[11px] text-secondary">{v.driverPhone}</div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {v.documents && v.documents.length > 0 ? (
                            v.documents.map((d) => (
                              <span
                                key={d.id}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700 border border-gray-200"
                                title={`Doc: ${d.docNumber || 'Uploaded'}`}
                              >
                                {d.docType}
                              </span>
                            ))
                          ) : (
                            <span className="text-secondary text-[11px]">Self-Certified</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">{getVerificationBadge(v.verificationStatus)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectedItem(v);
                              setInspectType('vehicle');
                            }}
                            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium"
                            title="Inspect specifications and certificates"
                          >
                            <Eye size={13} className="inline mr-1" />
                            Inspect
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleVerifyVehicle(v.id, 'VERIFIED')}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setRejectionModal({ isOpen: true, item: v, type: 'vehicle', reason: '' })}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: DRIVER & TRANSPORT PARTNER KYC QUEUE                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'drivers' && (
        <div className="card p-5 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="card-title text-base">Driver & Transport Partner Verification Queue</h2>
              <p className="text-xs text-secondary">
                Inspect Commercial Driving Licences, permitted vehicle classes, emergency contacts, and bank payout credentials.
              </p>
            </div>
          </div>

          {filteredPartners.length === 0 ? (
            <div className="p-8 text-center text-secondary border rounded-lg bg-gray-50/50">
              <CheckCircle size={32} className="mx-auto text-sky-600 mb-2" />
              <p className="font-semibold text-sm">All driver profiles have been verified!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="text-left py-2.5">Partner Name / Company</th>
                    <th className="text-left py-2.5">Sub-Role</th>
                    <th className="text-left py-2.5">Driving Licence No.</th>
                    <th className="text-left py-2.5">Permitted Classes</th>
                    <th className="text-left py-2.5">Operating Districts</th>
                    <th className="text-left py-2.5">Direct Settlement Bank</th>
                    <th className="text-left py-2.5">Status</th>
                    <th className="text-right py-2.5">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50/70" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="py-3 font-bold text-gray-900">
                        <div>{p.companyName || p.user?.name}</div>
                        <div className="text-[11px] text-secondary font-normal">{p.user?.email} • {p.user?.phone}</div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800">
                          {p.partnerType || 'VEHICLE_OWNER'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="font-mono font-bold text-gray-800">{p.drivingLicenceNo || p.licenseNo || 'On File'}</div>
                        {p.licenceExpiry && (
                          <div className="text-[10px] text-secondary">Exp: {new Date(p.licenceExpiry).toLocaleDateString()}</div>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.permittedClasses || ['LMV']).map((cls) => (
                            <span key={cls} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 font-bold text-gray-800">
                              {cls}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 text-secondary">
                        {(p.serviceDistricts || ['Pune']).join(', ')}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold">{p.bankName || 'State Bank of India'}</div>
                        <div className="text-[10px] text-secondary font-mono">IFSC: {p.ifscCode || 'SBIN0001423'}</div>
                      </td>
                      <td className="py-3">{getVerificationBadge(p.verificationStatus)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleVerifyDriver(p.id, 'VERIFIED')}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setRejectionModal({ isOpen: true, item: p, type: 'driver', reason: '' })}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: ALL REGISTERED FLEET ROSTER                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'all_fleet' && (
        <div className="card p-5 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="card-title text-base mb-3">All Registered Transport Operators & Fleet</h2>
          <div className="space-y-4">
            {allPartners.map((partner) => (
              <div key={partner.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{partner.companyName || partner.user?.name}</h3>
                    <p className="text-xs text-secondary">
                      Role: {partner.partnerType} • Districts: {(partner.serviceDistricts || []).join(', ')} • Contact: {partner.user?.phone}
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0">{getVerificationBadge(partner.verificationStatus)}</div>
                </div>

                {/* Partner Vehicles */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-1.5">Registered Vehicles ({partner.vehicles?.length || 0}):</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(partner.vehicles || []).map((veh) => (
                      <div key={veh.id} className="p-2.5 rounded bg-white border border-gray-200 text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-gray-900">{veh.vehicleNumber}</div>
                          <div className="text-secondary text-[11px]">{veh.make} {veh.model} ({veh.capacityKg} kg)</div>
                        </div>
                        <div>{getVerificationBadge(veh.verificationStatus)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Document Inspection Modal ────────────────────────────────────── */}
      {inspectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Commercial Vehicle Document Inspection
                </h3>
                <p className="text-xs text-secondary">
                  Registration No: <span className="font-bold text-emerald-800">{inspectedItem.vehicleNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Vehicle Specs Breakdown */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-secondary block">Make & Model</span>
                <span className="font-bold">{inspectedItem.make} {inspectedItem.model}</span>
              </div>
              <div>
                <span className="text-secondary block">Category</span>
                <span className="font-bold">{inspectedItem.category}</span>
              </div>
              <div>
                <span className="text-secondary block">Payload Capacity</span>
                <span className="font-bold">{inspectedItem.capacityKg} kg</span>
              </div>
              <div>
                <span className="text-secondary block">Fuel & Mileage</span>
                <span className="font-bold">{inspectedItem.fuelType} • {inspectedItem.mileageKmpl} km/L</span>
              </div>
              <div>
                <span className="text-secondary block">Cargo Dimensions</span>
                <span className="font-bold">{inspectedItem.dimensions || 'Standard Cargo Bed'}</span>
              </div>
              <div>
                <span className="text-secondary block">Refrigeration</span>
                <span className="font-bold">{inspectedItem.isRefrigerated ? 'Yes (Cold-Chain)' : 'No (Ambient)'}</span>
              </div>
              <div>
                <span className="text-secondary block">Base Depot</span>
                <span className="font-bold">{inspectedItem.baseHub || 'Pune Hub'}</span>
              </div>
              <div>
                <span className="text-secondary block">Driver Assigned</span>
                <span className="font-bold">{inspectedItem.driverName}</span>
              </div>
            </div>

            {/* Document Verification Cards */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 mb-2">
                Uploaded Statutory Documents
              </h4>
              <div className="space-y-2">
                {inspectedItem.documents && inspectedItem.documents.length > 0 ? (
                  inspectedItem.documents.map((doc) => (
                    <div key={doc.id} className="p-3 rounded-lg border border-gray-200 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-900 block">{doc.docType} Certificate</span>
                        <span className="text-[11px] text-secondary">Number: {doc.docNumber || 'Uploaded via form'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-xs rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium flex items-center gap-1"
                          >
                            <ExternalLink size={12} /> View Document
                          </a>
                        )}
                        <span className="font-bold text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {doc.verificationStatus}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-secondary italic">No document attachments uploaded; self-certified by operator.</p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="btn btn-secondary text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleVerifyVehicle(inspectedItem.id, 'VERIFIED')}
                className="btn btn-primary text-xs"
              >
                Approve Vehicle & Documents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Rejection Reason Modal ───────────────────────────────────────── */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle size={20} />
              <h3 className="font-bold text-base">Reject Verification Request</h3>
            </div>
            <p className="text-xs text-secondary">
              Provide specific DoCA audit remarks or rejection reasons (e.g. Expired Fitness Certificate, illegible RC photo, or mismatched vehicle class).
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Rejection Remarks *</label>
              <textarea
                rows={3}
                value={rejectionModal.reason}
                onChange={(e) => setRejectionModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. The commercial insurance policy uploaded has expired on 2024-03-31. Please upload valid active policy."
                className="form-input text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionModal({ isOpen: false, item: null, type: 'vehicle', reason: '' })}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionModal.reason.trim()}
                onClick={() => {
                  if (rejectionModal.type === 'vehicle') {
                    handleVerifyVehicle(rejectionModal.item.id, 'REJECTED', rejectionModal.reason, rejectionModal.reason);
                  } else {
                    handleVerifyDriver(rejectionModal.item.id, 'REJECTED', rejectionModal.reason, rejectionModal.reason);
                  }
                }}
                className="btn btn-danger text-xs bg-rose-600 text-white hover:bg-rose-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
