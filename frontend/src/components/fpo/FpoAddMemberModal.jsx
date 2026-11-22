import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  UserPlus, X, Save, AlertCircle, CheckCircle2, Phone,
  MapPin, Wheat, Search, Send, Clock, ShieldCheck, UserCheck, Users
} from 'lucide-react';
import VoiceInput from '../VoiceInput';

const FpoAddMemberModal = ({ isOpen, onClose, onMemberAdded }) => {
  const { t } = useTranslation();

  // Mode: 'SEARCH_INVITE' (Workflow A) | 'OFFLINE_ENROLL'
  const [activeTab, setActiveTab] = useState('SEARCH_INVITE');

  // Search & Invite State (Workflow A)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [invitingId, setInvitingId] = useState(null);

  // Offline Enrollment Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    village: '',
    landSizeAcres: '1.5',
    produceTypes: 'Tomato, Onion'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSearchFarmers = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return;

    setIsSearching(true);
    setError(null);
    try {
      const res = await api.get(`/fpo/farmers/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = res.data?.data || res.data || [];
      setSearchResults(Array.isArray(data) ? data : []);
      setHasSearched(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvite = async (farmer) => {
    setInvitingId(farmer.userId);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: farmer.name,
        phone: farmer.phone,
        email: farmer.email || undefined,
        village: farmer.village || undefined,
        district: farmer.district || undefined,
        state: farmer.state || undefined,
        landSizeAcres: farmer.landSizeAcres || 1.0,
        produceTypes: farmer.produceTypes || []
      };

      const res = await api.post('/fpo/members', payload);
      setSuccess(t('fpo.inviteSentSuccess', `Membership invitation sent to ${farmer.name}! They will join once they accept.`));

      // Update in-place to show INVITED
      setSearchResults(prev =>
        prev.map(item => item.userId === farmer.userId ? { ...item, affiliationStatus: 'INVITED' } : item)
      );

      if (onMemberAdded) {
        onMemberAdded(res.data?.data || res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setInvitingId(null);
    }
  };

  const handleOfflineSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        village: formData.village.trim() || undefined,
        landSizeAcres: parseFloat(formData.landSizeAcres) || 1.0,
        produceTypes: formData.produceTypes.split(',').map(s => s.trim()).filter(Boolean)
      };

      const res = await api.post('/fpo/members', payload);
      setSuccess(t('fpo.addMemberSuccess', 'Farmer account created and membership invitation sent!'));
      if (onMemberAdded) {
        onMemberAdded(res.data?.data || res.data);
      }
      setTimeout(() => {
        onClose();
        setFormData({
          name: '',
          phone: '',
          email: '',
          village: '',
          landSizeAcres: '1.5',
          produceTypes: 'Tomato, Onion'
        });
      }, 1400);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.message || t('fpo.addMemberFailed', 'Failed to enroll member farmer.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07875B] flex items-center justify-center border border-emerald-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {t('fpo.addMemberTitle', 'Member Farmers Management')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('fpo.addMemberSubtitle', 'Invite registered farmers or enroll new regional members')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab('SEARCH_INVITE'); setError(null); }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'SEARCH_INVITE'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{t('fpo.tabInviteFarmer', 'Search & Invite Farmer')}</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('OFFLINE_ENROLL'); setError(null); }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'OFFLINE_ENROLL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t('fpo.tabOfflineEnroll', 'Enroll Offline Farmer')}</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#07875B] flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* TAB 1: WORKFLOW A — SEARCH & INVITE REGISTERED FARMER */}
        {activeTab === 'SEARCH_INVITE' && (
          <div className="space-y-4">
            <form onSubmit={handleSearchFarmers} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('fpo.searchPlaceholder', 'Enter farmer phone number, email, or full name...')}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || searchQuery.trim().length < 3}
                className="px-4 py-2.5 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? t('common.loading', 'Searching...') : t('common.search', 'Search')}
              </button>
            </form>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {isSearching && (
                <div className="text-center py-8 text-xs text-slate-400">
                  {t('fpo.searchingFarmers', 'Searching verified farmer registry...')}
                </div>
              )}

              {!isSearching && hasSearched && searchResults.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-bold">{t('fpo.noFarmersMatched', 'No registered farmers matched your query.')}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t('fpo.tryOfflineEnroll', 'If this farmer does not have an account yet, switch to "Enroll Offline Farmer".')}
                  </p>
                </div>
              )}

              {!isSearching && searchResults.map((farmer) => {
                const isInviting = invitingId === farmer.userId;
                return (
                  <div
                    key={farmer.userId}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{farmer.name}</span>
                        {farmer.aadhaarVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-1.5 py-0.2 rounded-full">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> KYC
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] flex items-center gap-2">
                        <span>{farmer.phone}</span>
                        <span>•</span>
                        <span>{farmer.village}, {farmer.district}</span>
                        <span>•</span>
                        <span>{farmer.landSizeAcres} {t('farmer.acres', 'Acres')}</span>
                      </p>
                      {farmer.produceTypes?.length > 0 && (
                        <p className="text-[10px] text-slate-600 font-medium">
                          {t('farmer.crops', 'Crops')}: {farmer.produceTypes.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {farmer.affiliationStatus === 'MEMBER' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {t('fpo.currentMemberBadge', 'Current Member')}
                        </span>
                      )}

                      {farmer.affiliationStatus === 'OTHER_FPO' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl" title={farmer.affiliatedFpoName}>
                          {t('fpo.inOtherFpoBadge', 'Affiliated with other FPO')}
                        </span>
                      )}

                      {farmer.affiliationStatus === 'INVITED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          {t('fpo.invitePendingBadge', 'Invite Sent')}
                        </span>
                      )}

                      {farmer.affiliationStatus === 'AVAILABLE' && (
                        <button
                          type="button"
                          onClick={() => handleSendInvite(farmer)}
                          disabled={isInviting}
                          className="px-3.5 py-1.5 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isInviting ? t('fpo.inviting', 'Sending...') : t('fpo.sendInvite', 'Send Invitation')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: OFFLINE ENROLLMENT FOR NEW FARMER */}
        {activeTab === 'OFFLINE_ENROLL' && (
          <form onSubmit={handleOfflineSubmit} className="space-y-3.5 text-xs font-medium">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('auth.fullName', 'Farmer Full Name *')}</label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, name: val }))}
                  title={t('voice.speakFarmerName', 'Speak farmer name')}
                />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('auth.namePlaceholder', 'e.g. Ramesh Kulkarni')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {t('auth.phone', 'Mobile Number *')}
                  </label>
                  <VoiceInput
                    onResult={(val) => setFormData(prev => ({ ...prev, phone: val.replace(/[^0-9+]/g, '') }))}
                    title={t('voice.speakPhone', 'Speak phone number')}
                  />
                </div>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+919876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">{t('auth.email', 'Email (Optional)')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="farmer@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {t('location.village', 'Village / Taluka')}
                  </label>
                  <VoiceInput
                    onResult={(val) => setFormData(prev => ({ ...prev, village: val }))}
                    title={t('voice.speakVillage', 'Speak village name')}
                  />
                </div>
                <input
                  type="text"
                  value={formData.village}
                  onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                  placeholder={t('auth.villagePlaceholder', 'e.g. Manchar')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">{t('farmer.landSizeAcres', 'Land Holding (Acres)')}</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={formData.landSizeAcres}
                  onChange={(e) => setFormData(prev => ({ ...prev, landSizeAcres: e.target.value }))}
                  placeholder="2.5"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold flex items-center gap-1">
                  <Wheat className="w-3.5 h-3.5 text-slate-400" />
                  {t('farmer.cropsGrown', 'Primary Crops (comma separated)')}
                </label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, produceTypes: val }))}
                  title={t('voice.speakCrops', 'Speak primary crops')}
                />
              </div>
              <input
                type="text"
                value={formData.produceTypes}
                onChange={(e) => setFormData(prev => ({ ...prev, produceTypes: e.target.value }))}
                placeholder="Tomato, Onion, Wheat"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? t('common.saving', 'Enrolling...') : t('fpo.enrollButton', 'Enroll & Send Invite')}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default FpoAddMemberModal;
