import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { Building, X, Save, AlertCircle, ShieldCheck, CheckCircle2, MapPin, Phone, User, Users } from 'lucide-react';
import VoiceInput from '../VoiceInput';

const FpoProfileModal = ({ isOpen, onClose, fpoProfile, user, onProfileUpdated }) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    fpoName: '',
    registrationNo: '',
    address: '',
    district: '',
    state: '',
    contactName: '',
    phone: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        fpoName: fpoProfile?.fpoName || user?.name || '',
        registrationNo: fpoProfile?.registrationNo || '',
        address: fpoProfile?.address || '',
        district: fpoProfile?.district || user?.district || '',
        state: fpoProfile?.state || user?.state || 'Maharashtra',
        contactName: user?.name || '',
        phone: user?.phone || ''
      });
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, fpoProfile, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.put('/fpo/profile', formData);
      setSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated(res.data?.data || res.data);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.message || t('fpo.saveFailed', 'Failed to update FPO organization profile.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isVerified = Boolean(fpoProfile?.registrationCertVerified);
  const verifiedMemberCount = fpoProfile?.memberCount ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07875B] flex items-center justify-center border border-emerald-200">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {t('fpo.profileTitle', 'FPO Organization Profile & Settings')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('fpo.profileSubtitle', 'Maintain corporate registration, location, and member capacity')}
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

        {/* Verification Status Banner (Evidence-Based: No NABARD/SFAC claimed without cert) */}
        {isVerified ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#07875B] flex-shrink-0" />
              <div>
                <p className="font-bold text-slate-900">{t('fpo.certVerifiedTitle', 'Registration Certificate Verified')}</p>
                <p className="text-[11px] text-emerald-800">{t('fpo.certVerifiedDesc', 'Official DoCA registration verified on platform registry.')}</p>
              </div>
            </div>
            <span className="bg-emerald-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
              {t('status.VERIFIED', 'VERIFIED')}
            </span>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-slate-900">{t('fpo.certPendingTitle', 'Self-Registered Organization')}</p>
                <p className="text-[11px] text-amber-800">{t('fpo.certPendingDesc', 'Official government verification pending administrator review.')}</p>
              </div>
            </div>
            <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-amber-300">
              {t('status.PENDING', 'PENDING')}
            </span>
          </div>
        )}

        {/* Database-Driven Member Farmers Metric Card (Read-Only) */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{t('fpo.registeredMembers', 'Cooperative Member Farmers')}</p>
              <p className="text-[11px] text-slate-500">{t('fpo.memberCountVerifiedNote', 'Calculated from actual member profiles affiliated with this FPO.')}</p>
            </div>
          </div>
          <span className="font-black text-slate-900 text-sm bg-white px-3 py-1 rounded-xl border border-slate-200">
            {verifiedMemberCount} {t('fpo.farmers', 'Farmers')}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#07875B] flex-shrink-0" />
            <span>{t('fpo.saveSuccess', 'FPO organization profile updated successfully!')}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">{t('fpo.fpoNameLabel', 'FPO Legal / Trading Name *')}</label>
              <VoiceInput
                onResult={(val) => setFormData(prev => ({ ...prev, fpoName: val }))}
                title={t('voice.speakFpoName', 'Speak FPO name')}
              />
            </div>
            <input
              type="text"
              required
              value={formData.fpoName}
              onChange={(e) => setFormData(prev => ({ ...prev, fpoName: e.target.value }))}
              placeholder={t('auth.fpoNamePlaceholder', 'e.g. Junnar Farmers Producer Co.')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">{t('fpo.regNoLabel', 'Registration / CIN Number *')}</label>
              <VoiceInput
                onResult={(val) => setFormData(prev => ({ ...prev, registrationNo: val }))}
                title={t('voice.speakRegNo', 'Speak Registration Number')}
              />
            </div>
            <input
              type="text"
              required
              value={formData.registrationNo}
              onChange={(e) => setFormData(prev => ({ ...prev, registrationNo: e.target.value }))}
              placeholder={t('auth.fpoRegNoPlaceholder', 'e.g. FPO-MH-2024-8842')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {t('fpo.managerNameLabel', 'Lead Contact / Manager Name')}
                </label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, contactName: val }))}
                  title={t('voice.speakManagerName', 'Speak manager name')}
                />
              </div>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                placeholder={t('auth.fullNamePlaceholder', 'e.g. Ramesh Patil')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {t('auth.phone', 'Contact Phone')}
                </label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, phone: val.replace(/[^0-9+]/g, '') }))}
                  title={t('voice.speakPhone', 'Speak phone number')}
                />
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+919876543210"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {t('fpo.hubAddressLabel', 'Registered Office / Hub Address')}
              </label>
              <VoiceInput
                onResult={(val) => setFormData(prev => ({ ...prev, address: val }))}
                title={t('voice.speakHubLocation', 'Speak hub location')}
              />
            </div>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder={t('fpo.addressPlaceholder', 'e.g. APMC Market Yard, Main Gate')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('location.district', 'District *')}</label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, district: val }))}
                  title={t('voice.speakDistrict', 'Speak district')}
                />
              </div>
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                placeholder={t('auth.districtPlaceholder', 'e.g. Pune')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('location.state', 'State *')}</label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, state: val }))}
                  title={t('voice.speakState', 'Speak state')}
                />
              </div>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                placeholder="Maharashtra"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? t('common.saving', 'Saving Changes...') : t('common.save', 'Save FPO Profile')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default FpoProfileModal;
