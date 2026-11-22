import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Building, Search, MapPin, Users, CheckCircle2, Clock, AlertCircle,
  Send, X as CloseIcon, Filter, Info, ShieldCheck, ShieldAlert,
  Check, RefreshCw, ChevronRight, UserPlus, Phone, Mail
} from 'lucide-react';

const FarmerFpoDirectorySection = ({ user, onMembershipChange }) => {
  const { t } = useTranslation();

  const [fpos, setFpos] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedInvites, setReceivedInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');

  // Request Modal
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedFpoForRequest, setSelectedFpoForRequest] = useState(null);
  const [requestRemarks, setRequestRemarks] = useState('');

  const fetchDirectoryData = async () => {
    setLoading(true);
    try {
      const [fpoRes, reqRes, invRes] = await Promise.allSettled([
        api.get('/farmers/fpos'),
        api.get('/farmers/fpos/requests'),
        api.get('/farmers/membership/invitations')
      ]);

      if (fpoRes.status === 'fulfilled') {
        const rawFpos = fpoRes.value.data?.data || fpoRes.value.data || [];
        setFpos(Array.isArray(rawFpos) ? rawFpos : []);
      }
      if (reqRes.status === 'fulfilled') {
        const rawReqs = reqRes.value.data?.data || reqRes.value.data || [];
        setSentRequests(Array.isArray(rawReqs) ? rawReqs : []);
      }
      if (invRes.status === 'fulfilled') {
        const rawInvs = invRes.value.data?.data || invRes.value.data || [];
        setReceivedInvites(Array.isArray(rawInvs) ? rawInvs : []);
      }
    } catch (err) {
      console.error('Failed to load FPO directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectoryData();
  }, [user]);

  // Unique districts for filter
  const districts = ['ALL', ...Array.from(new Set(fpos.map((f) => f.district).filter(Boolean)))];

  // Farmer's current membership status
  const currentFpoId = user?.farmerProfile?.fpoId;
  const isAffiliated = Boolean(currentFpoId);

  // Filtered FPOs
  const filteredFpos = fpos.filter((fpo) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      fpo.fpoName?.toLowerCase().includes(query) ||
      fpo.district?.toLowerCase().includes(query) ||
      fpo.state?.toLowerCase().includes(query) ||
      fpo.registrationNo?.toLowerCase().includes(query);

    const matchesDistrict = selectedDistrict === 'ALL' || fpo.district === selectedDistrict;

    return matchesSearch && matchesDistrict;
  });

  // Action handlers
  const openRequestModal = (fpo) => {
    setSelectedFpoForRequest(fpo);
    setRequestRemarks('');
    setRequestModalOpen(true);
  };

  const handleSendJoinRequest = async (e) => {
    e?.preventDefault();
    if (!selectedFpoForRequest) return;

    setActionLoading(selectedFpoForRequest.id);
    try {
      const res = await api.post(`/farmers/fpos/${selectedFpoForRequest.id}/request-join`, {
        remarks: requestRemarks
      });
      alert(res.data?.data?.message || t('farmer.joinRequestSent', 'Join request submitted successfully.'));
      setRequestModalOpen(false);
      setSelectedFpoForRequest(null);
      await fetchDirectoryData();
      if (onMembershipChange) onMembershipChange();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm(t('farmer.confirmCancelRequest', 'Are you sure you want to cancel this join request?'))) {
      return;
    }
    setActionLoading(requestId);
    try {
      const res = await api.delete(`/farmers/fpos/requests/${requestId}`);
      alert(res.data?.data?.message || t('farmer.requestCancelled', 'Join request cancelled.'));
      await fetchDirectoryData();
      if (onMembershipChange) onMembershipChange();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    setActionLoading(inviteId);
    try {
      const res = await api.post(`/farmers/membership/invitations/${inviteId}/accept`);
      alert(res.data?.data?.message || t('farmer.inviteAccepted', 'FPO membership accepted successfully!'));
      await fetchDirectoryData();
      if (onMembershipChange) onMembershipChange();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectInvite = async (inviteId) => {
    if (!window.confirm(t('farmer.confirmRejectInvite', 'Are you sure you want to decline this invitation?'))) {
      return;
    }
    setActionLoading(inviteId);
    try {
      const res = await api.post(`/farmers/membership/invitations/${inviteId}/reject`);
      alert(res.data?.data?.message || t('farmer.inviteRejected', 'Invitation declined.'));
      await fetchDirectoryData();
      if (onMembershipChange) onMembershipChange();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingInvites = receivedInvites.filter((inv) => inv.status === 'PENDING');
  const pendingRequests = sentRequests.filter((req) => req.status === 'PENDING');

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#07875B] border border-emerald-200 text-xs font-bold mb-2">
              <Building className="w-3.5 h-3.5" />
              {t('farmer.fpoDirectoryBadge', 'Farmer Producer Organizations • Cooperative Network')}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t('farmer.fpoDirectoryTitle', 'FPO Directory & Cooperative Affiliation')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              {t('farmer.fpoDirectorySubtitle', 'Connect with verified Farmer Producer Organizations in your district to pool harvest, access bulk institutional buyers, and gain logistics support.')}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-center">
              <span className="block text-lg font-black text-[#07875B]">{fpos.length}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">{t('fpo.registeredFpos', 'Verified FPOs')}</span>
            </div>
            <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-center">
              <span className="block text-lg font-black text-amber-600">{pendingRequests.length}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">{t('farmer.pendingRequests', 'Pending Requests')}</span>
            </div>
          </div>
        </div>

        {/* Policy Invariant Alert */}
        <div className="mt-5 p-3.5 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-2.5 text-xs text-sky-900">
          <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{t('farmer.singleFpoPolicyTitle', 'Primary FPO Affiliation Policy:')} </span>
            {t('farmer.singleFpoPolicyDesc', 'Under SasyaVahini guidelines, an active farmer can be registered with one primary Producer Organization at a time for institutional lot aggregation. You can browse all FPOs freely.')}
            {isAffiliated && (
              <span className="block mt-1 font-semibold text-emerald-800">
                ✓ {t('farmer.currentlyAffiliatedWith', 'You are currently an active member of')} <strong>{user?.farmerProfile?.fpo?.fpoName || 'your cooperative'}</strong>.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PENDING ACTIONS SECTION: Received Invitations & Sent Requests */}
      {(pendingInvites.length > 0 || pendingRequests.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Received Invitations (Workflow A) */}
          {pendingInvites.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#07875B]" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {t('farmer.receivedInvitations', 'Invitations Received from FPOs')} ({pendingInvites.length})
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase bg-emerald-200/60 text-[#07875B] px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {t('farmer.receivedInvitesDesc', 'These Producer Organizations have invited you to join their cooperative directory.')}
              </p>

              <div className="space-y-2.5 pt-1">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{inv.fpoName}</p>
                      <p className="text-slate-500 text-[11px]">
                        {inv.fpoDistrict ? `${inv.fpoDistrict}, ` : ''}{inv.fpoState || 'Cooperative Hub'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {t('common.received', 'Received')}: {new Date(inv.invitedAt || inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading === inv.id}
                        onClick={() => handleAcceptInvite(inv.id)}
                        className="px-3 py-1.5 bg-[#07875B] hover:bg-[#056b48] text-white font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm text-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {t('common.accept', 'Accept & Join')}
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading === inv.id}
                        onClick={() => handleRejectInvite(inv.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold rounded-xl transition-all text-xs cursor-pointer"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                        {t('common.decline', 'Decline')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sent Join Requests (Workflow B) */}
          {pendingRequests.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {t('farmer.sentRequests', 'My Sent Join Requests')} ({pendingRequests.length})
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase bg-amber-200/60 text-amber-800 px-2 py-0.5 rounded-full">
                  Under Review
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {t('farmer.sentRequestsDesc', 'Your membership applications currently awaiting approval by FPO managers.')}
              </p>

              <div className="space-y-2.5 pt-1">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{req.fpoName}</p>
                      <p className="text-[11px] text-slate-500">
                        {t('common.submitted', 'Submitted')}: {new Date(req.requestedAt || req.createdAt).toLocaleDateString()}
                      </p>
                      {req.remarks && (
                        <p className="text-[11px] text-slate-600 italic mt-0.5 line-clamp-1">
                          "{req.remarks}"
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={actionLoading === req.id}
                      onClick={() => handleCancelRequest(req.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition-all text-xs flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                      {t('common.cancel', 'Cancel Request')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('farmer.searchFpoPlaceholder', 'Search FPOs by name, district, state, or registration number...')}
            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#07875B] transition-all font-medium"
          />
        </div>

        {/* District Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#07875B] font-bold text-slate-700 cursor-pointer"
          >
            {districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist === 'ALL' ? t('common.allDistricts', 'All Districts') : dist}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FPO DIRECTORY GRID */}
      {loading ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-7 h-7 text-[#07875B] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">{t('farmer.loadingFpos', 'Loading verified FPO directory...')}</p>
        </div>
      ) : filteredFpos.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-dashed border-slate-300">
          <Building className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700 text-sm">{t('farmer.noFposFound', 'No Farmer Producer Organizations found.')}</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t('farmer.noFposFoundDesc', 'Try clearing your search query or selecting a different district filter.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFpos.map((fpo) => {
            const isCurrent = fpo.affiliationStatus === 'CURRENT_MEMBER';
            const isPendingReq = fpo.affiliationStatus === 'REQUEST_PENDING';
            const isInvited = fpo.affiliationStatus === 'INVITATION_RECEIVED';
            const canJoin = fpo.affiliationStatus === 'CAN_JOIN';

            return (
              <div
                key={fpo.id}
                className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between gap-4 shadow-sm ${
                  isCurrent
                    ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Top: Name & Badges */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-[#07875B]">
                      <Building className="w-5 h-5" />
                    </div>

                    {/* Affiliation Status Pill */}
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#07875B] font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> {t('farmer.yourCooperative', 'Your Cooperative')}
                      </span>
                    )}
                    {isPendingReq && (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                        <Clock className="w-3 h-3" /> {t('farmer.requestPending', 'Request Pending')}
                      </span>
                    )}
                    {isInvited && (
                      <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-800 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                        <UserPlus className="w-3 h-3" /> {t('farmer.invitedToJoin', 'Invited to Join')}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                      {fpo.fpoName}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {fpo.district}, {fpo.state}
                    </p>
                  </div>

                  {/* Verification & Members */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-bold">
                      {t('fpo.regNoLabel', 'Reg')}: {fpo.registrationNo}
                    </span>
                    {fpo.registrationCertVerified ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-lg">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> {t('fpo.certVerifiedBadge', 'Verified')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 font-bold px-2 py-0.5 rounded-lg">
                        <ShieldAlert className="w-3 h-3 text-slate-400" /> {t('fpo.pendingVerificationBadge', 'Pending Review')}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                      <Users className="w-3 h-3 text-slate-400" /> {fpo.activeMemberCount || fpo.memberCount || 0} {t('fpo.farmers', 'Farmers')}
                    </span>
                  </div>

                  {/* Contact Info (if permitted) */}
                  {(fpo.contactPerson || fpo.contactPhone || fpo.contactEmail) && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                      {fpo.contactPerson && (
                        <p className="font-semibold text-slate-800">{fpo.contactPerson}</p>
                      )}
                      {fpo.contactPhone && (
                        <p className="flex items-center gap-1 text-slate-500">
                          <Phone className="w-3 h-3" /> {fpo.contactPhone}
                        </p>
                      )}
                      {fpo.contactEmail && (
                        <p className="flex items-center gap-1 text-slate-500 truncate">
                          <Mail className="w-3 h-3" /> {fpo.contactEmail}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom: Action CTA */}
                <div className="pt-2 border-t border-slate-100">
                  {isCurrent && (
                    <div className="text-center py-2 bg-emerald-50 text-[#07875B] font-bold rounded-xl text-xs">
                      ✓ {t('farmer.activeMemberLabel', 'Active Cooperative Member')}
                    </div>
                  )}

                  {isPendingReq && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-700 font-bold flex-1">
                        {t('farmer.awaitingApproval', 'Awaiting FPO Review')}
                      </span>
                      <button
                        type="button"
                        disabled={actionLoading === fpo.id}
                        onClick={() => {
                          const req = sentRequests.find((r) => r.fpoId === fpo.id && r.status === 'PENDING');
                          if (req) handleCancelRequest(req.id);
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        {t('common.cancel', 'Cancel')}
                      </button>
                    </div>
                  )}

                  {isInvited && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading === fpo.id}
                        onClick={() => {
                          const inv = receivedInvites.find((i) => i.fpoId === fpo.id && i.status === 'PENDING');
                          if (inv) handleAcceptInvite(inv.id);
                        }}
                        className="flex-1 py-2 bg-[#07875B] hover:bg-[#056b48] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> {t('common.accept', 'Accept Invite')}
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading === fpo.id}
                        onClick={() => {
                          const inv = receivedInvites.find((i) => i.fpoId === fpo.id && i.status === 'PENDING');
                          if (inv) handleRejectInvite(inv.id);
                        }}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        {t('common.decline', 'Decline')}
                      </button>
                    </div>
                  )}

                  {canJoin && (
                    <div>
                      {isAffiliated ? (
                        <button
                          type="button"
                          disabled
                          title="You are already affiliated with another FPO. Unlink before joining a new cooperative."
                          className="w-full py-2 bg-slate-100 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed"
                        >
                          {t('farmer.alreadyAffiliatedBtn', 'Already in another FPO')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoading === fpo.id}
                          onClick={() => openRequestModal(fpo)}
                          className="w-full py-2 bg-[#07875B] hover:bg-[#056b48] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {t('farmer.requestToJoinBtn', 'Request to Join')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REQUEST TO JOIN MODAL */}
      {requestModalOpen && selectedFpoForRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-[#07875B]" />
                <h3 className="font-black text-slate-900 text-base">
                  {t('farmer.joinFpoModalTitle', 'Apply to Join FPO')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900 text-sm">{selectedFpoForRequest.fpoName}</p>
              <p className="text-slate-500">
                {selectedFpoForRequest.district}, {selectedFpoForRequest.state} • Reg: {selectedFpoForRequest.registrationNo}
              </p>
            </div>

            <form onSubmit={handleSendJoinRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('farmer.requestRemarksLabel', 'Note / Remarks to FPO Manager (Optional)')}
                </label>
                <textarea
                  rows={3}
                  value={requestRemarks}
                  onChange={(e) => setRequestRemarks(e.target.value)}
                  placeholder={t('farmer.requestRemarksPlaceholder', 'E.g., I cultivate 3 acres of organic tomatoes and onions in Manchar village...')}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#07875B] transition-all font-medium resize-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-800">
                ✓ Your contact number, village location, land size, and produce types from your farmer profile will be shared with the FPO manager for verification.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === selectedFpoForRequest.id}
                  className="px-4 py-2 bg-[#07875B] hover:bg-[#056b48] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {actionLoading === selectedFpoForRequest.id ? t('common.sending', 'Sending...') : t('farmer.sendApplication', 'Send Membership Application')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FarmerFpoDirectorySection;
