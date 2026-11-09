import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { DollarSign, TrendingUp, Package, ShieldCheck, CheckCircle2, Clock, FileText, AlertCircle } from 'lucide-react';

const FarmerEarningsSection = () => {
  const { t } = useTranslation();
  const [earningsData, setEarningsData] = useState({
    totalCompletedEarnings: 0,
    pendingEscrow: 0,
    completedOrdersCount: 0,
    pendingOrdersCount: 0,
    settlements: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEarnings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/farmers/earnings');
      const data = res.data?.data || res.data;
      if (data && typeof data === 'object') {
        setEarningsData({
          totalCompletedEarnings: data.totalCompletedEarnings || 0,
          pendingEscrow: data.pendingEscrow || 0,
          completedOrdersCount: data.completedOrdersCount || 0,
          pendingOrdersCount: data.pendingOrdersCount || 0,
          settlements: Array.isArray(data.settlements) ? data.settlements : []
        });
      }
    } catch (err) {
      console.error('Error fetching farmer earnings:', err);
      setError('Could not load financial records. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#07875B]" />
        <p className="text-sm font-medium">Loading authoritative financial records…</p>
      </div>
    );
  }

  const { totalCompletedEarnings, pendingEscrow, completedOrdersCount, pendingOrdersCount, settlements } = earningsData;

  return (
    <div className="space-y-6">
      {/* Top Financial KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('farmer.settledProceeds', 'Settled Proceeds')}</span>
            <h3 className="text-2xl font-black text-slate-900 leading-tight">
              ₹{totalCompletedEarnings.toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('farmer.directBankTransfer', 'Direct Bank Transfer')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('farmer.escrowLocked', 'Escrow Locked')}</span>
            <h3 className="text-2xl font-black text-amber-800 leading-tight">
              ₹{pendingEscrow.toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> {t('farmer.deliveryInProgress', 'Delivery In Progress')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 flex-shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('farmer.settledLots', 'Settled Lots')}</span>
            <h3 className="text-2xl font-black text-slate-900 leading-tight">
              {completedOrdersCount}
            </h3>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Fulfilled Deliveries
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('farmer.committedLots', 'Committed Lots')}</span>
            <h3 className="text-2xl font-black text-slate-900 leading-tight">
              {pendingOrdersCount}
            </h3>
            <span className="text-[11px] text-purple-700 font-bold mt-0.5 block">
              Active Reservations
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Disclaimers & Governance Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#07875B] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">{t('farmer.escrowGovernanceTitle', 'Authoritative Escrow & Settlement Governance:')}</strong>
          <p className="mt-0.5">
            Under SasyaVahini fair-trade guidelines, buyer funds are held in authorized escrow upon proposal acceptance. Payouts are triggered server-side after successful delivery verification (OTP and weight confirmation). No arbitrary middleman deductions or undisclosed commissions are applied.
          </p>
        </div>
      </div>

      {/* Financial Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">{t('farmer.ledgerTitle', 'Transaction & Payout Ledger')}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{t('farmer.ledgerSubtitle', 'Real-time status of your fulfilled deliveries and committed escrow lots.')}</p>
          </div>
        </div>

        {settlements.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No transactions recorded yet.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Once you accept buyer allocation proposals and delivery milestones are verified, settled proceeds will appear in this ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">{t('farmer.orderRef', 'Order Ref')}</th>
                  <th className="py-3 px-4">{t('farmer.cropNameLabel', 'Produce')}</th>
                  <th className="py-3 px-4">{t('farmer.quantityLabel', 'Quantity')}</th>
                  <th className="py-3 px-4">{t('farmer.ratePerKg', 'Rate (₹/kg)')}</th>
                  <th className="py-3 px-4">{t('farmer.grossAmount', 'Gross Amount')}</th>
                  <th className="py-3 px-4">{t('common.status', 'Status')}</th>
                  <th className="py-3 px-4">{t('farmer.settlementDate', 'Settlement Date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {settlements.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{item.orderNumber}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{item.cropName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.quantityKg.toLocaleString('en-IN')} kg</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">₹{item.ratePerKg}</td>
                    <td className="py-3.5 px-4 font-black text-[#07875B]">₹{item.grossAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">
                      {item.status === 'SETTLED' ? (
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-emerald-300">
                          SETTLED
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-amber-300">
                          ESCROW HELD
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{item.settledDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerEarningsSection;