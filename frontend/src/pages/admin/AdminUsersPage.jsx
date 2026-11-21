import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Building,
  Truck,
  UserCheck,
  RefreshCw,
  FileCheck,
  AlertOctagon,
  Phone,
  Mail,
  MapPin,
  Lock,
} from 'lucide-react';
import adminApi from '../../services/adminApi';
import RoleBadge from '../../components/RoleBadge';
import Alert from '../../components/Alert';
import { PageSpinner } from '../../components/Spinner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filters & Search
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Inspection & Action Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, user: null, targetStatus: null });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers({
        role: roleFilter,
        status: statusFilter,
        search: searchTerm,
      });
      setUsers(res.users || []);
    } catch (err) {
      console.error('Failed to load admin users:', err);
      setFeedback({ type: 'error', message: 'Failed to retrieve user directory.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleUpdateStatus = async (user, newStatus, remarks = '') => {
    try {
      setActionLoading(true);
      const finalRemarks = remarks || (newStatus === 'ACTIVE'
        ? 'KYC and identity documents verified by DoCA'
        : newStatus === 'SUSPENDED'
        ? 'Account suspended pending administrative audit'
        : 'Status updated by administrator');

      await adminApi.updateUserStatus(user.id, {
        status: newStatus,
        remarks: finalRemarks,
      });

      setFeedback({
        type: 'success',
        message: `Successfully updated ${user.name} to ${newStatus}.`,
      });

      setSelectedUser(null);
      setConfirmModal({ isOpen: false, user: null, targetStatus: null });
      setAdminRemarks('');
      await fetchUsers();
    } catch (err) {
      console.error('Failed to update user status:', err);
      setFeedback({ type: 'error', message: err.message || 'Status update failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Status Badge Component
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle size={12} /> ACTIVE
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <AlertOctagon size={12} /> SUSPENDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock size={12} /> PENDING KYC
          </span>
        );
    }
  };

  // Metrics counts
  const totalCount = users.length;
  const pendingCount = users.filter((u) => u.status === 'PENDING_VERIFICATION').length;
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const suspendedCount = users.filter((u) => u.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6">
      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
              <Users size={24} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">User Governance & KYC Verification Center</h1>
              <p className="text-xs text-slate-500">
                Department of Consumer Affairs (DoCA) • Farmer land verification, FPO society credentials, Corporate Buyer GSTINs & Transporter compliance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Directory
          </button>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* ─── Metric KPI Badges ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Entities</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all roles</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'PENDING_VERIFICATION' ? 'ALL' : 'PENDING_VERIFICATION')}
          className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'PENDING_VERIFICATION'
              ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-300'
              : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} /> Pending Verification
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Awaiting DoCA audit</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'ACTIVE'
              ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-300'
              : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle size={13} /> Verified & Active
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{activeCount}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Authorized for trade</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'SUSPENDED' ? 'ALL' : 'SUSPENDED')}
          className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'SUSPENDED'
              ? 'bg-rose-100/70 border-rose-400 ring-2 ring-rose-300'
              : 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
          }`}
        >
          <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <AlertOctagon size={13} /> Suspended Accounts
          </div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{suspendedCount}</div>
          <div className="text-[11px] text-rose-700 mt-0.5">Blocked from operations</div>
        </div>
      </div>

      {/* ─── Search & Role Filters ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'FARMER', 'FPO', 'BUYER', 'LOGISTICS'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  roleFilter === role
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role === 'ALL' ? 'All Roles' : role}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-80">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, GSTIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-8 py-1.5 text-xs w-full rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </form>
        </div>

        {/* Status Filter Sub-strip */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Filter Status:</span>
          {['ALL', 'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Any Status' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Users Data Table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-xs">Loading user governance directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Users size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm">No matching users found.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the search query or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Entity & Contact</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Primary Statutory ID</th>
                  <th className="py-3 px-4">Region / District</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">DoCA Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const farmer = u.farmerProfile;
                  const fpo = u.fpoProfile;
                  const buyer = u.buyerProfile;
                  const logi = u.logisticsProfile;

                  const identifier =
                    farmer
                      ? `Aadhaar: ${farmer.aadhaarVerified ? 'Verified ✓' : 'Self-declared'} • Land: ${farmer.landSizeAcres || 1} ac`
                      : fpo
                      ? `Reg: ${fpo.registrationNo || 'On File'} • ${fpo.memberCount || 0} members`
                      : buyer
                      ? `GSTIN: ${buyer.gstNumber || 'Unregistered'} • ${buyer.buyerType || 'Trader'}`
                      : logi
                      ? `License: ${logi.licenseNo || 'On File'} • ${logi.partnerType}`
                      : 'Platform System Admin';

                  const location =
                    farmer?.district
                      ? `${farmer.district}, ${farmer.state}`
                      : fpo?.district
                      ? `${fpo.district}, ${fpo.state}`
                      : buyer?.deliveryDistrict
                      ? `${buyer.deliveryDistrict}, ${buyer.deliveryState || 'MH'}`
                      : logi?.serviceDistricts?.join(', ') || 'National Hub';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail size={10} className="text-slate-400" /> {u.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone size={10} className="text-slate-400" /> {u.phone}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <RoleBadge role={u.role} />
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-medium text-slate-800">{identifier}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400" /> {location}
                        </span>
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(u.status)}</td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                            title="Inspect full KYC profile"
                          >
                            <Eye size={12} /> Inspect
                          </button>

                          {u.status !== 'ACTIVE' && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => setConfirmModal({ isOpen: true, user: u, targetStatus: 'ACTIVE' })}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            >
                              Approve
                            </button>
                          )}

                          {u.status !== 'SUSPENDED' && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => setConfirmModal({ isOpen: true, user: u, targetStatus: 'SUSPENDED' })}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Detailed KYC Inspection Modal ─────────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-700" />
                  Statutory KYC & Identity Inspection
                </h3>
                <p className="text-xs text-slate-500">
                  User ID: <span className="font-mono text-slate-700">{selectedUser.id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Core User Details */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Full Name</span>
                <span className="font-bold text-slate-900">{selectedUser.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">System Role</span>
                <RoleBadge role={selectedUser.role} />
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Registered Email</span>
                <span className="font-mono text-slate-800 truncate block">{selectedUser.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Phone Verified</span>
                <span className="font-mono text-slate-800">{selectedUser.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Account Status</span>
                {getStatusBadge(selectedUser.status)}
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Registration Date</span>
                <span className="text-slate-700">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Role-Specific KYC Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Role Specific Verification Attributes
              </h4>

              {/* FARMER PROFILE */}
              {selectedUser.farmerProfile && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2 text-xs">
                  <div className="font-bold text-emerald-900 text-sm">🌾 Farmer Agricultural Credentials</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 block">Cultivable Land</span>
                      <span className="font-bold text-slate-900">{selectedUser.farmerProfile.landSizeAcres} Acres</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Aadhaar Linked</span>
                      <span className="font-bold text-emerald-800">
                        {selectedUser.farmerProfile.aadhaarVerified ? 'Verified ✓' : 'Pending Verification'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Bank Account for Payout</span>
                      <span className="font-bold text-emerald-800">
                        {selectedUser.farmerProfile.bankAccountVerified ? 'Verified Direct Deposit' : 'Pending Bank Proof'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Location</span>
                      <span className="font-bold text-slate-900">
                        {selectedUser.farmerProfile.village}, {selectedUser.farmerProfile.district}, {selectedUser.farmerProfile.state}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Crops Cultivated</span>
                      <span className="font-bold text-slate-900">
                        {(selectedUser.farmerProfile.produceTypes || []).join(', ') || 'Seasonal vegetables'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* FPO PROFILE */}
              {selectedUser.fpoProfile && (
                <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/40 space-y-2 text-xs">
                  <div className="font-bold text-sky-900 text-sm">🏢 Farmer Producer Organisation (FPO)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 block">Society / FPO Name</span>
                      <span className="font-bold text-slate-900">{selectedUser.fpoProfile.fpoName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Registration Certificate / CIN</span>
                      <span className="font-bold font-mono text-sky-800">{selectedUser.fpoProfile.registrationNo}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Attached Farmer Members</span>
                      <span className="font-bold text-slate-900">{selectedUser.fpoProfile.memberCount} Members</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-slate-500 block">Headquarters Address</span>
                      <span className="font-bold text-slate-900">
                        {selectedUser.fpoProfile.address}, {selectedUser.fpoProfile.district}, {selectedUser.fpoProfile.state}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* BUYER PROFILE */}
              {selectedUser.buyerProfile && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2 text-xs">
                  <div className="font-bold text-blue-900 text-sm">🛒 Commercial Buyer Enterprise</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 block">Organization Name</span>
                      <span className="font-bold text-slate-900">{selectedUser.buyerProfile.organizationName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Commercial Category</span>
                      <span className="font-bold text-slate-900">{selectedUser.buyerProfile.buyerType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Verified GSTIN</span>
                      <span className="font-bold font-mono text-blue-800">{selectedUser.buyerProfile.gstNumber || 'Unregistered'}</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-slate-500 block">Delivery & Fulfillment Hub</span>
                      <span className="font-bold text-slate-900">
                        {selectedUser.buyerProfile.deliveryAddress || 'Standard Warehouse'}, {selectedUser.buyerProfile.deliveryDistrict}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* LOGISTICS PROFILE */}
              {selectedUser.logisticsProfile && (
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2 text-xs">
                  <div className="font-bold text-purple-900 text-sm">🚚 Logistics & Transport Carrier</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 block">Carrier Enterprise</span>
                      <span className="font-bold text-slate-900">{selectedUser.logisticsProfile.companyName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Partner Sub-Role</span>
                      <span className="font-bold text-purple-800">{selectedUser.logisticsProfile.partnerType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Commercial Transport License</span>
                      <span className="font-bold font-mono text-slate-900">{selectedUser.logisticsProfile.licenseNo || 'On File'}</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-slate-500 block">Authorized Operating Districts</span>
                      <span className="font-bold text-slate-900">
                        {(selectedUser.logisticsProfile.serviceDistricts || []).join(', ') || 'Pune, Nashik'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold w-full sm:w-auto"
              >
                Close Inspection
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {selectedUser.status !== 'SUSPENDED' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      setConfirmModal({ isOpen: true, user: selectedUser, targetStatus: 'SUSPENDED' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
                  >
                    Suspend Account
                  </button>
                )}

                {selectedUser.status !== 'ACTIVE' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      setConfirmModal({ isOpen: true, user: selectedUser, targetStatus: 'ACTIVE' });
                    }}
                    className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
                  >
                    Approve KYC & Activate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirmation & Audit Remarks Modal ────────────────────────────── */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              {confirmModal.targetStatus === 'ACTIVE' ? (
                <>
                  <CheckCircle size={20} className="text-emerald-600" />
                  Approve User KYC & Grant Access
                </>
              ) : (
                <>
                  <AlertTriangle size={20} className="text-rose-600" />
                  Suspend Platform Access
                </>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to transition <strong>{confirmModal.user?.name}</strong> to{' '}
              <span className="font-bold">{confirmModal.targetStatus}</span>? This statutory decision will be recorded in the immutable platform Audit Log.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Administrator Audit Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder={
                  confirmModal.targetStatus === 'ACTIVE'
                    ? 'e.g. Identity and tax documents verified successfully against government registries.'
                    : 'e.g. Suspended due to reported discrepancies in quality certification.'
                }
                className="form-input text-xs w-full rounded-lg border border-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, user: null, targetStatus: null })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus(confirmModal.user, confirmModal.targetStatus, adminRemarks)}
                className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold ${
                  confirmModal.targetStatus === 'ACTIVE'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmModal.targetStatus === 'ACTIVE' ? 'Confirm Approval' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

