import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, ShieldCheck, Package } from 'lucide-react';

const FpoMemberDetailsModal = ({ isOpen, onClose, member }) => {
  const { t } = useTranslation();
  if (!isOpen || !member) return null;

  const user = member.user || {};
  const listings = member.listings || [];

  const totalContributedQty = listings.reduce((sum, l) => sum + l.quantityKg, 0);
  const totalValuation = listings.reduce((sum, l) => sum + (l.quantityKg * l.askingPricePerKg), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[88vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200 text-xl font-bold">
              👨‍🌾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg">{user.name || 'Member Farmer'}</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                  {t('status.VERIFIED', 'Verified Member')}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {t('location.village', 'Village')}: {user.village || 'Manchar'}, {user.district || 'Pune'} • {member.landSizeAcres || 2.5} {t('farmer.acres', 'Acres')}
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

        {/* Member KPI Summary */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block font-medium">{t('fpo.contributedSupply', 'Contributed Supply')}</span>
            <span className="font-black text-slate-900 text-base">{totalContributedQty.toLocaleString()} kg</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block font-medium">{t('farmer.activeLots', 'Active Lots')}</span>
            <span className="font-black text-slate-900 text-base">{listings.length} {listings.length === 1 ? t('farmer.activeLot', 'Lot') : t('farmer.activeLots', 'Lots')}</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block font-medium">{t('farmer.lotValuation', 'Total Lot Valuation')}</span>
            <span className="font-black text-[#07875B] text-base">₹{totalValuation.toLocaleString()}</span>
          </div>
        </div>

        {/* Traceability Guarantee Banner */}
        <div className="bg-[#E8F5E9] border border-emerald-200 p-4 rounded-2xl space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-[#07875B]">
            <ShieldCheck className="w-4 h-4 text-[#07875B]" />
            {t('fpo.traceabilityGuaranteeTitle', 'Individual Smallholder Traceability Guarantee')}
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            {t('fpo.traceabilityGuaranteeText', "When this member's lots are aggregated into bulk buyer consignments, the central ledger preserves traceability back to this specific farmer's farm gate. Proceeds pass through directly without dilution.")}
          </p>
        </div>

        {/* Member Produce Lots Table */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <Package className="w-4 h-4 text-sky-600" />
            {t('fpo.contributedProduceListings', 'Contributed Produce Listings')}
          </h4>

          {listings.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
              {t('fpo.noListingsRegistered', 'No active listings currently registered for this member farmer.')}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-3">{t('farmer.produce', 'Crop')}</th>
                    <th className="p-3">{t('farmer.quantity', 'Quantity')}</th>
                    <th className="p-3">{t('farmer.ratePerKg', 'Asking Rate')}</th>
                    <th className="p-3">{t('farmer.qualityGradeLabel', 'Grade')}</th>
                    <th className="p-3 text-right">{t('common.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {listings.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                        {t('crops.' + l.cropName, l.cropName)} {l.isOrganic && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-extrabold">ORG</span>}
                      </td>
                      <td className="p-3 font-bold text-slate-800">{l.quantityKg.toLocaleString()} kg</td>
                      <td className="p-3 font-black text-[#07875B]">₹{l.askingPricePerKg}/kg</td>
                      <td className="p-3"><span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">{l.qualityGrade}</span></td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {t('status.' + l.status, l.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="pt-2 flex justify-end border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            {t('common.close', 'Close')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default FpoMemberDetailsModal;
