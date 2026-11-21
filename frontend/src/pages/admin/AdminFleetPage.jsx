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
  CreditCard,
  MapPin,
} from 'lucide-react';
import adminApi from '../../services/adminApi';
import Alert from '../../components/Alert';
import { PageSpinner } from '../../components/Spinner';

export default function AdminFleetPage() {
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
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, item: null, type: 'vehicle', reason: '' });

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getFleetQueue();
      if (res) {
        setStats(res.stats || {});
        setPendingVehicles(res.pendingVehicles || []);
        setPendingPartners(res.pendingPartners || []);
        setAllPartners(res.allPartners || []);
      }
    } catch (err) {
      console.error('Failed to load fleet queue:', err);
      setFeedback({ type: 'error', message: 'Failed to retrieve fleet compliance queue.' });
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
      await adminApi.verifyVehicle(vehicleId, {
        status,
        adminRemarks: remarks || (status === 'VERIFIED' ? 'Approved by DoCA Transport Authority' : remarks),
        rejectionReason,
      });
      setFeedback({
        type: 'success',
        message: `Commercial Vehicle ${status === 'VERIFIED' ? 'approved and activated' : 'rejected'}.`,
      });
      setRejectionModal({ isOpen: false, item: null, type: 'vehicle', reason: '' });
      setInspectedItem(null);
      await fetchQueueData();
    } catch (err) {
      console.error('Error verifying vehicle:', err);
      setFeedback({ type: 'error', message: err.message || 'Vehicle verification failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyDriver = async (partnerId, status, remarks = '', rejectionReason = '') => {
    try {
      setActionLoading(true);
      await adminApi.verifyDriver(partnerId, {
        status,
        adminRemarks: remarks || (status === 'VERIFIED' ? 'Driver Licence & KYC verified by DoCA' : remarks),
        rejectionReason,
      });
      setFeedback({
        type: 'success',
        message: `Transport Partner ${status === 'VERIFIED' ? 'approved and activated' : 'rejected'}.`,
      });
      setRejectionModal({ isOpen: false, item: null, type: 'driver', reason: '' });
      setInspectedItem(null);
      await fetchQueueData();
    } catch (err) {
      console.error('Error verifying driver:', err);
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
            <Clock size={12} /> PENDING AUDIT
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
    <div className="space-y-6">
      {/* ─── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
              <Truck size={24} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Commercial Fleet & Driver Compliance Verification</h1>
              <p className="text-xs text-slate-500">
                Department of Consumer Affairs (DoCA) • Motor Vehicles Act statutory verification, RC, fitness certificates, reefer inspection & driver licenses
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchQueueData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
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

      {/* ─── 4 Metric KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('vehicles')}
          className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${
            activeTab === 'vehicles'
              ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Pending Vehicles</span>
            <Truck size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.pendingVehiclesCount || 0}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Awaiting RTO & Fitness audit</div>
        </div>

        <div
          onClick={() => setActiveTab('drivers')}
          className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${
            activeTab === 'drivers'
              ? 'bg-sky-100/70 border-sky-400 ring-2 ring-sky-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-800">Pending Drivers</span>
            <UserCheck size={16} className="text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.pendingPartnersCount || 0}</div>
          <div className="text-[11px] text-sky-700 mt-0.5">Awaiting DL & KYC verification</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Verified Fleet</span>
            <CheckCircle size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.verifiedVehiclesCount || 12}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Active in procurement logistics</div>
        </div>

        <div
          onClick={() => setActiveTab('all_fleet')}
          className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${
            activeTab === 'all_fleet'
              ? 'bg-purple-100/70 border-purple-400 ring-2 ring-purple-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-800">Transport Enterprises</span>
            <Building size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalPartnersCount || 0}</div>
          <div className="text-[11px] text-purple-700 mt-0.5">Contracted fleet operators</div>
        </div>
      </div>

      {/* ─── Search & Tab Filters ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('vehicles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'vehicles'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Commercial Vehicles Queue ({stats.pendingVehiclesCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('drivers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'drivers'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Driver & Carrier KYC ({stats.pendingPartnersCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all_fleet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'all_fleet'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Registered Operators
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reg #, model, carrier, DL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-8 py-1.5 text-xs w-full rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: COMMERCIAL VEHICLES QUEUE                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pending Commercial Goods Vehicles</h2>
              <p className="text-xs text-slate-500">
                Inspect RC, commercial insurance, fitness certificate, carriage permit, PUC, and cold-chain compliance.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
              <p className="text-xs">Loading vehicle verification queue...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle size={32} className="mx-auto text-emerald-600 mb-2" />
              <p className="font-semibold text-sm">All commercial vehicles have been audited!</p>
              <p className="text-xs text-slate-400 mt-1">
                New vehicles registered by transport operators will automatically appear in this queue.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Vehicle Reg. No.</th>
                    <th className="py-3 px-4">Make & Model</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payload & Efficiency</th>
                    <th className="py-3 px-4">Carrier / Transporter</th>
                    <th className="py-3 px-4">Statutory Docs</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">DoCA Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Truck size={14} className="text-emerald-700" />
                          <span>{v.vehicleNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal">{v.baseHub || 'Pune Depot'}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {v.make || 'Tata'} {v.model || 'Intra V30'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {v.manufacturingYear || 2023} • {v.fuelType || 'DIESEL'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800">
                          {v.category || 'SCV'}
                        </span>
                        {v.isRefrigerated && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">
                            ❄️ Reefer ({v.minTempC || 4}°C)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{v.capacityKg} kg</div>
                        <div className="text-[11px] text-slate-500">{v.mileageKmpl || 14.5} km/L</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {v.logistics?.companyName || v.driverName}
                        </div>
                        <div className="text-[11px] text-slate-500">{v.driverPhone}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {v.documents && v.documents.length > 0 ? (
                            v.documents.map((d) => (
                              <span
                                key={d.id}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                                title={`Doc: ${d.docNumber || 'Uploaded'}`}
                              >
                                {d.docType}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Self-Certified</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">{getVerificationBadge(v.verificationStatus)}</td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectedItem(v)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                            title="Inspect specs and certificates"
                          >
                            <Eye size={12} /> Inspect
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleVerifyVehicle(v.id, 'VERIFIED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setRejectionModal({ isOpen: true, item: v, type: 'vehicle', reason: '' })}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Driver & Commercial Transport Partner KYC</h2>
              <p className="text-xs text-slate-500">
                Inspect Commercial Driving Licenses, permitted vehicle categories, service districts, and settlement bank accounts.
              </p>
            </div>
          </div>

          {filteredPartners.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle size={32} className="mx-auto text-sky-600 mb-2" />
              <p className="font-semibold text-sm">All driver credentials have been verified!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Partner Name / Company</th>
                    <th className="py-3 px-4">Sub-Role</th>
                    <th className="py-3 px-4">Driving Licence No.</th>
                    <th className="py-3 px-4">Permitted Classes</th>
                    <th className="py-3 px-4">Service Districts</th>
                    <th className="py-3 px-4">Settlement Bank</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">DoCA Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPartners.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{p.companyName || p.user?.name}</div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          {p.user?.email} • {p.user?.phone}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800">
                          {p.partnerType || 'VEHICLE_OWNER'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800">
                          {p.drivingLicenceNo || p.licenseNo || 'On File'}
                        </div>
                        {p.licenceExpiry && (
                          <div className="text-[10px] text-slate-500">Exp: {p.licenceExpiry}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(p.permittedClasses || ['LMV']).map((cls) => (
                            <span key={cls} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-bold text-slate-700">
                              {cls}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {(p.serviceDistricts || ['Pune']).join(', ')}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.bankName || 'State Bank of India'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">IFSC: {p.ifscCode || 'SBIN0001423'}</div>
                      </td>

                      <td className="py-3 px-4">{getVerificationBadge(p.verificationStatus)}</td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleVerifyDriver(p.id, 'VERIFIED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setRejectionModal({ isOpen: true, item: p, type: 'driver', reason: '' })}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
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
      {/* TAB 3: ALL REGISTERED OPERATORS & FLEET ROSTER                       */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'all_fleet' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Contracted Fleet Operators & Active Vehicles</h2>
              <p className="text-xs text-slate-500">Consolidated overview of transport enterprises and their attached fleet.</p>
            </div>
          </div>

          <div className="space-y-4">
            {allPartners.map((partner) => (
              <div key={partner.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{partner.companyName || partner.user?.name}</h3>
                    <p className="text-xs text-slate-500">
                      Sub-Role: {partner.partnerType} • Districts: {(partner.serviceDistricts || []).join(', ')} • Contact: {partner.user?.phone}
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0">{getVerificationBadge(partner.verificationStatus)}</div>
                </div>

                {/* Partner Vehicles */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-700 mb-2">Attached Vehicles:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(partner.vehicles || []).map((veh) => (
                      <div key={veh.id} className="p-3 rounded-lg bg-white border border-slate-200 text-xs flex justify-between items-center shadow-sm">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <Truck size={13} className="text-emerald-700" />
                            {veh.vehicleNumber}
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {veh.make} {veh.model} ({veh.capacityKg} kg)
                          </div>
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

      {/* ─── Vehicle Document Inspection Modal ────────────────────────────── */}
      {inspectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-700" />
                  Commercial Vehicle Technical Inspection
                </h3>
                <p className="text-xs text-slate-500">
                  Registration No: <span className="font-bold font-mono text-emerald-800">{inspectedItem.vehicleNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Vehicle Specs Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Make & Model</span>
                <span className="font-bold text-slate-900">{inspectedItem.make} {inspectedItem.model}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Category</span>
                <span className="font-bold text-slate-900">{inspectedItem.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Payload Capacity</span>
                <span className="font-bold text-slate-900">{inspectedItem.capacityKg} kg</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Fuel & Mileage</span>
                <span className="font-bold text-slate-900">{inspectedItem.fuelType} • {inspectedItem.mileageKmpl} km/L</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Refrigeration</span>
                <span className="font-bold text-slate-900">
                  {inspectedItem.isRefrigerated ? `❄️ Cold-Chain (${inspectedItem.minTempC || 4}°C)` : 'Ambient (Standard)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Base Hub</span>
                <span className="font-bold text-slate-900">{inspectedItem.baseHub || 'Pune Depot'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Driver Assigned</span>
                <span className="font-bold text-slate-900">{inspectedItem.driverName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Driver Phone</span>
                <span className="font-mono text-slate-800">{inspectedItem.driverPhone}</span>
              </div>
            </div>

            {/* Uploaded Documents List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Uploaded Statutory Certificates
              </h4>
              <div className="space-y-2">
                {inspectedItem.documents && inspectedItem.documents.length > 0 ? (
                  inspectedItem.documents.map((doc) => (
                    <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{doc.docType} Certificate</span>
                        <span className="text-[11px] text-slate-500 font-mono">Number: {doc.docNumber || 'On Record'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-xs rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium flex items-center gap-1"
                          >
                            <ExternalLink size={12} /> View Certificate
                          </a>
                        )}
                        <span className="font-bold text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {doc.verificationStatus}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No certificates attached; self-certified by operator.</p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleVerifyVehicle(inspectedItem.id, 'VERIFIED')}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
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
              <h3 className="font-bold text-base">Reject Compliance Request</h3>
            </div>
            <p className="text-xs text-slate-600">
              Provide specific DoCA audit remarks or statutory grounds for rejection (e.g. Expired Fitness Certificate, missing commercial insurance, or non-compliant reefer unit).
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Audit Rejection Remarks *</label>
              <textarea
                rows={3}
                value={rejectionModal.reason}
                onChange={(e) => setRejectionModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. The commercial insurance policy has expired on 2024-03-31. Please upload valid active policy."
                className="form-input text-xs w-full rounded-lg border border-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionModal({ isOpen: false, item: null, type: 'vehicle', reason: '' })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionModal.reason.trim() || actionLoading}
                onClick={() => {
                  if (rejectionModal.type === 'vehicle') {
                    handleVerifyVehicle(rejectionModal.item.id, 'REJECTED', rejectionModal.reason, rejectionModal.reason);
                  } else {
                    handleVerifyDriver(rejectionModal.item.id, 'REJECTED', rejectionModal.reason, rejectionModal.reason);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
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
