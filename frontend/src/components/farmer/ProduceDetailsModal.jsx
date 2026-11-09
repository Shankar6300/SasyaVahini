import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Info, Trash2, Edit3 } from 'lucide-react';

const ProduceDetailsModal = ({ isOpen, onClose, listing, onEdit, onDelete }) => {
  const { t } = useTranslation();
  if (!isOpen || !listing) return null;

  const totalLotValuation = listing.quantityKg * listing.askingPricePerKg;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full text-xs shadow-xs">{t('farmer.availableForProcurement', 'Available for Procurement')}</span>;
      case 'RESERVED':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 font-extrabold px-2.5 py-0.5 rounded-full text-xs shadow-xs">{t('farmer.committedReserved', 'Committed / Reserved')}</span>;
      case 'SOLD':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 font-extrabold px-2.5 py-0.5 rounded-full text-xs shadow-xs">{t('farmer.soldFulfilled', 'Sold & Fulfilled')}</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs">{t('status.' + status, status)}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#07875B] flex items-center justify-center border border-emerald-200 text-xl font-black">
              🌾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-xl">{t('crops.' + listing.cropName, listing.cropName)}</h3>
                {listing.isOrganic && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                    {t('farmer.organicBadge', 'Organic 🌿')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Listing ID: #{listing.id.slice(0, 10)} • {listing.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status & Valuation Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('farmer.authoritativeInventoryState', 'Authoritative Inventory State')}</p>
            <div className="mt-1">{getStatusBadge(listing.status)}</div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('farmer.lotValuation', 'Lot Valuation')}</p>
            <p className="text-xl font-black text-slate-900">₹{totalLotValuation.toLocaleString()}</p>
          </div>
        </div>

        {/* Detailed Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block font-medium">{t('farmer.availableStock', 'Available Quantity')}</span>
            <span className="font-black text-slate-900 text-base">{listing.quantityKg.toLocaleString()} kg</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block font-medium">{t('farmer.askingPriceLabel', 'Asking Price')}</span>
            <span className="font-black text-[#07875B] text-base">₹{listing.askingPricePerKg}/kg</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block font-medium">{t('farmer.qualityGradeLabel', 'Quality Grade')}</span>
            <span className="font-extrabold text-slate-800 text-sm">{listing.qualityGrade}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block font-medium">{t('farmer.minAcceptablePrice', 'Min Acceptable Price')}</span>
            <span className="font-extrabold text-slate-800 text-sm">₹{listing.minPricePerKg || (listing.askingPricePerKg * 0.9).toFixed(1)}/kg</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block font-medium">{t('farmer.harvestDate', 'Harvest Date')}</span>
            <span className="font-bold text-slate-700">{listing.harvestDate}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block font-medium">{t('farmer.farmPickupPoint', 'Farm Pickup Point')}</span>
            <span className="font-bold text-slate-700 truncate block">{listing.location || 'Pune District'}</span>
          </div>
        </div>

        {/* Inventory State Notice */}
        <div className="bg-[#E8F5E9]/60 border border-emerald-200 rounded-2xl p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#07875B] flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>{t('farmer.directTraceabilityGuarantee', 'Direct Traceability Guarantee:')}</strong> {t('farmer.inventoryDesc', 'This lot is indexed in the SasyaVahini central ledger.')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <button
            onClick={() => onDelete(listing.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('farmer.removeListing', 'Remove Listing')}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => onEdit(listing)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-[#07875B] hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors border border-emerald-200"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {t('farmer.editListing', 'Edit Listing')}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProduceDetailsModal;
