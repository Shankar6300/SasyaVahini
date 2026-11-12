import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { User, ShieldCheck, X, Save, AlertCircle } from 'lucide-react';
import VoiceInput from '../VoiceInput';

const FarmerProfileModal = ({ isOpen, onClose, user, onProfileUpdated }) => {
  const { t } = useTranslation();
  const farmerProfile = user?.farmerProfile || {};

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    village: user?.village || '',
    district: user?.district || 'Pune',
    state: user?.state || 'Maharashtra',
    landSizeAcres: farmerProfile?.landSizeAcres || 2.5,
    produceTypes: Array.isArray(farmerProfile?.produceTypes) ? farmerProfile.produceTypes.join(', ') : (farmerProfile?.produceTypes || 'Tomato, Onion')
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
      const res = await api.put('/farmers/profile', {
        ...formData,
        produceTypes: typeof formData.produceTypes === 'string'
          ? formData.produceTypes.split(',').map(s => s.trim()).filter(Boolean)
          : formData.produceTypes
      });
      setSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated(res.data?.data?.user || res.data?.user || res.data?.data || res.data);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || t('profile.saveFailed', 'Failed to update farmer profile.'));
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07875B] flex items-center justify-center border border-emerald-200">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {t('profile.farmerProfileSettings', 'Farmer Profile & Settings')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('profile.farmerProfileSubtitle', 'Maintain your farm details, verified credentials, and land size')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Status Badge */}
        <div className="bg-[#E8F5E9] border border-emerald-300 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#07875B] flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900">{t('profile.aadhaarVerified', 'Aadhaar & Land Record Verified')}</p>
              <p className="text-[11px] text-[#07875B]">{t('profile.directTradeEligibility', 'Direct-to-market trade eligibility enabled')}</p>
            </div>
          </div>
          <span className="bg-white text-[#07875B] font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-emerald-300 shadow-sm">
            {t('status.ACTIVE', 'ACTIVE')}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[#07875B] text-xs font-bold">
            {t('profile.saveSuccess', 'Profile updated successfully! Refreshing...')}
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">{t('auth.fullName', 'Full Legal Name *')}</label>
              <VoiceInput
                onResult={(val) => setFormData(prev => ({ ...prev, name: val }))}
                title={t('voice.speakFullName', 'Speak full name')}
              />
            </div>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('farmer.landSizeAcres', 'Land Holding (Acres) *')}</label>
                <VoiceInput
                  type="number"
                  onResult={(val) => setFormData(prev => ({ ...prev, landSizeAcres: parseFloat(val) || prev.landSizeAcres }))}
                  title={t('voice.speakLandSize', 'Speak land size in acres')}
                />
              </div>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={formData.landSizeAcres}
                onChange={(e) => setFormData(prev => ({ ...prev, landSizeAcres: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">{t('location.village', 'Village *')}</label>
                <VoiceInput
                  onResult={(val) => setFormData(prev => ({ ...prev, village: val }))}
                  title={t('voice.speakVillage', 'Speak village')}
                />
              </div>
              <input
                type="text"
                required
                value={formData.village}
                onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                placeholder="e.g. Manchar"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">{t('profile.produceTypes', 'Primary Produce Types')}</label>
              <VoiceInput
                onResult={(val) => setFormData(prev => ({ ...prev, produceTypes: val }))}
                title={t('voice.speakProduceTypes', 'Speak produce types')}
              />
            </div>
            <input
              type="text"
              value={formData.produceTypes}
              onChange={(e) => setFormData(prev => ({ ...prev, produceTypes: e.target.value }))}
              placeholder={t('profile.produceTypesPlaceholder', 'e.g. Tomato, Onion, Wheat, Chilli')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
            />
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
              className="px-5 py-2.5 bg-[#07875B] hover:bg-[#056b48] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? t('common.saving', 'Saving Changes...') : t('common.save', 'Save Profile')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default FarmerProfileModal;
