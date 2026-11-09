import React, { useState } from 'react';
import api from '../../services/api';
import { User, ShieldCheck, X, Save, AlertCircle } from 'lucide-react';
import VoiceInput from '../VoiceInput';

const FarmerProfileModal = ({ isOpen, onClose, user, onProfileUpdated }) => {

  const farmerProfile = user?.farmerProfile || {};

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    village: user?.village || '',
    district: user?.district || 'Pune',
    state: user?.state || 'Maharashtra',
    landSizeAcres: farmerProfile?.landSizeAcres || 2.5,
    produceTypes: farmerProfile?.produceTypes || 'Vegetables, Grains'
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
      const res = await api.put('/farmers/profile', formData);
      setSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated(res.data?.data?.user || res.data?.user || res.data?.data || res.data);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || 'Failed to update farmer profile.');
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
              <h3 className="font-extrabold text-slate-900 text-lg">Farmer Profile Settings</h3>
              <p className="text-xs text-slate-500">Maintain your farm details and verified credentials</p>
            </div>
          </div>
          <button
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
              <p className="font-bold text-slate-900">Aadhaar & Land Record Verified</p>
              <p className="text-[11px] text-[#07875B]">Direct-to-market trade eligibility enabled</p>
            </div>
          </div>
          <span className="bg-white text-[#07875B] font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-emerald-300 shadow-sm">
            ACTIVE
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
            Profile updated successfully! Refreshing...
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">Full Legal Name</label>
              <VoiceInput onResult={(t) => setFormData({ ...formData, name: t })} title="Speak full name" />
            </div>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Contact Phone</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Land Holding (Acres)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={formData.landSizeAcres}
                onChange={(e) => setFormData({ ...formData, landSizeAcres: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">Village</label>
                <VoiceInput onResult={(t) => setFormData({ ...formData, village: t })} title="Speak village name" />
              </div>
              <input
                type="text"
                required
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                placeholder="e.g. Manchar"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">District</label>
                <VoiceInput onResult={(t) => setFormData({ ...formData, district: t })} title="Speak district" />
              </div>
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">State</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">Primary Produce Types</label>
              <VoiceInput onResult={(t) => setFormData({ ...formData, produceTypes: t })} title="Speak produce types" />
            </div>
            <input
              type="text"
              value={formData.produceTypes}
              onChange={(e) => setFormData({ ...formData, produceTypes: e.target.value })}
              placeholder="e.g. Tomato, Onion, Wheat, Pomegranate"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#07875B] outline-none transition-all"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#07875B] hover:bg-[#056b48] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default FarmerProfileModal;
