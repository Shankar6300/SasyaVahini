import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { Building, X, Save, AlertCircle, ShieldCheck } from 'lucide-react';
import VoiceInput from '../VoiceInput';

const FpoProfileModal = ({ isOpen, onClose, fpoProfile, user, onProfileUpdated }) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    fpoName: fpoProfile?.fpoName || 'Pune Sahakari Krishi Producer Co.',
    registrationNo: fpoProfile?.registrationNo || 'FPO-MH-PUN-2023-089',
    memberCount: fpoProfile?.memberCount || 45,
    name: user?.name || 'Suresh Patil (FPO Manager)',
    phone: user?.phone || '+91 98220 22002',
    location: user?.location || 'Khed Hub, Pune',
    district: user?.district || 'Pune',
    state: user?.state || 'Maharashtra'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.put('/fpo/profile', formData);
      setSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated(res.data?.data?.user || res.data?.user || res.data?.data || res.data);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || t('fpo.saveFailed', 'Failed to update FPO organization profile.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200">
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

        {/* Verification Status */}
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-700 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900">{t('fpo.registeredEntity', 'Registered Producer Organization')}</p>
              <p className="text-[11px] text-sky-700">{t('fpo.verifiedEntityBadge', 'SFAC / NABARD recognized cooperative')}</p>
            </div>
          </div>
          <span className="bg-white text-sky-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-sky-300">
            {t('status.VERIFIED', 'VERIFIED')}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
            {t('fpo.saveSuccess', 'FPO profile updated successfully! Refreshing...')}
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-sky-600 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">{t('fpo.regNoLabel', 'Registration / CIN No. *')}</label>
              <input
                type="text"
                required
                value={formData.registrationNo}
                onChange={(e) => setFormData(prev => ({ ...prev, registrationNo: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-sky-600 outline-none transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('fpo.totalMembersLabel', 'Total Member Farmers *')}</label>
                <VoiceInput
                  type="number"
                  onResult={(val) => setFormData(prev => ({ ...prev, memberCount: parseInt(val, 10) || prev.memberCount }))}
                  title={t('voice.speakMemberCount', 'Speak member count')}
                />
              </div>
              <input
                type="number"
                min="1"
                required
                value={formData.memberCount}
                onChange={(e) => setFormData(prev => ({ ...prev, memberCount: parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-sky-600 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('fpo.managerNameLabel', 'Lead Contact / Manager Name *')}</label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, name: val }))}
                  title={t('voice.speakManagerName', 'Speak manager name')}
                />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-sky-600 outline-none transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('auth.phone', 'Contact Phone *')}</label>
                <VoiceInput
                  type="number"
                  onResult={(val) => setFormData(prev => ({ ...prev, phone: val }))}
                  title={t('voice.speakPhone', 'Speak phone number')}
                />
              </div>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-sky-600 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('location.village', 'Hub Location')}</label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, location: val }))}
                  title={t('voice.speakHubLocation', 'Speak hub location')}
                />
              </div>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-sky-600 outline-none transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('location.district', 'District')}</label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, district: val }))}
                  title={t('voice.speakDistrict', 'Speak district')}
                />
              </div>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-sky-600 outline-none transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('location.state', 'State')}</label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, state: val }))}
                  title={t('voice.speakState', 'Speak state')}
                />
              </div>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-sky-600 outline-none transition-all"
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
              className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
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
