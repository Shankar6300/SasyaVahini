import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Truck, Package, Clock, CheckCircle2, AlertCircle, MapPin,
  Calendar, Phone, RefreshCw, ShieldCheck, Navigation, ArrowRight,
  Sparkles, Info
} from 'lucide-react';

const FarmerPickupsSection = () => {
  const { t } = useTranslation();

  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchPickups = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/farmers/pickups');
      const list = res.data?.data || res.data || [];
      setPickups(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching farmer pickups:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPickups();
  }, []);

  const filteredPickups = pickups.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    return true;
  });

  const totalScheduled = pickups.length;
  const totalCompleted = pickups.filter((p) => p.status === 'COMPLETED').length;
  const totalPending = pickups.filter((p) => p.status === 'PENDING' || p.status === 'ARRIVED').length;
  const totalKgCollected = pickups
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + (p.quantityKg || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#07875B] text-xs font-bold border border-emerald-200 mb-2">
              <Truck className="w-3.5 h-3.5" />
              {t('pickups.badge', 'Multi-Farmer Route Pickups')}
            </div>
            <h2 className="text-lg font-black text-[#1F2937]">
              {t('pickups.title', 'Produce Pickups & Dispatch Schedule')}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-xl">
              {t('pickups.subtitle', 'Live schedule of transporters arriving at your farm gate to collect confirmed FPO contributions.')}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPickups}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            title={t('common.refresh', 'Refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#07875B]' : ''}`} />
          </button>
        </div>

        {/* 2. Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Scheduled</span>
            <span className="text-xl font-black text-slate-800 mt-0.5 block">{totalScheduled}</span>
            <span className="text-[10px] text-slate-500 font-medium">pickup stops</span>
          </div>

          <div className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending Pickups</span>
            <span className="text-xl font-black text-amber-800 mt-0.5 block">{totalPending}</span>
            <span className="text-[10px] text-amber-600 font-medium">ready for collection</span>
          </div>

          <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Completed</span>
            <span className="text-xl font-black text-[#07875B] mt-0.5 block">{totalCompleted}</span>
            <span className="text-[10px] text-emerald-600 font-medium">weighed & collected</span>
          </div>

          <div className="bg-sky-50/50 rounded-xl p-3.5 border border-sky-200">
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Total Dispatched</span>
            <span className="text-xl font-black text-sky-800 mt-0.5 block">{totalKgCollected.toLocaleString()} kg</span>
            <span className="text-[10px] text-sky-600 font-medium">collected produce</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex justify-between items-center text-xs">
        <span className="font-extrabold text-[#1F2937]">
          {t('pickups.myPickups', 'My Scheduled Pickups')} ({filteredPickups.length})
        </span>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs text-slate-700 font-semibold outline-none cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending (Scheduled)</option>
          <option value="ARRIVED">Arrived at Gate</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* 4. Pickups List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0]">
          <RefreshCw className="w-8 h-8 text-[#07875B] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600 mt-2">Loading your scheduled pickups...</p>
        </div>
      ) : filteredPickups.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-dashed border-[#E2E8F0]">
          <Truck className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold text-slate-800">No scheduled pickups found.</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When your FPO confirms a bulk order and arranges multi-farmer logistics, your scheduled pickup window and vehicle details will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPickups.map((pickup) => {
            const isCompleted = pickup.status === 'COMPLETED';
            const isArrived = pickup.status === 'ARRIVED';

            return (
              <div
                key={pickup.stopId}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all space-y-3 ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : isArrived
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-[#E2E8F0]'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-[#1F2937]">Order #{pickup.orderNumber}</span>
                      <span className="text-xs font-bold text-slate-400">• Stop #{pickup.sequence} in route</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isCompleted
                            ? 'bg-emerald-100 text-[#07875B]'
                            : isArrived
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {pickup.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Cooperative Hub: <strong>{pickup.fpoName || 'FPO Marketing Center'}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantity to Handover</span>
                    <span className="text-base font-black text-[#07875B]">{pickup.quantityKg?.toLocaleString()} kg</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Produce Details</span>
                    <p className="font-bold text-slate-800">{pickup.cropName} ({pickup.variety || 'Standard'})</p>
                    <p className="text-[11px] text-slate-500">Grade: {pickup.grade || 'GRADE_A'}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Pickup Location</span>
                    <p className="font-bold text-slate-800 truncate">{pickup.address || 'Farm Gate'}</p>
                    <p className="text-[10px] text-emerald-700 font-medium">Village Cluster Depot</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Carrier / Vehicle</span>
                    {pickup.transporter?.name ? (
                      <div>
                        <p className="font-bold text-slate-800 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-[#07875B]" />
                          {pickup.transporter.name}
                        </p>
                        {pickup.vehicle?.vehicleNumber && (
                          <p className="text-[11px] text-slate-600">Vehicle: {pickup.vehicle.vehicleNumber}</p>
                        )}
                        {pickup.driverPhone && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> {pickup.driverPhone}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic text-[11px]">
                        Carrier assignment in progress. Transporter details will update shortly.
                      </p>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-slate-700">
                  <Info className="w-4 h-4 text-[#07875B] flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    {isCompleted
                      ? `Produce was collected and weighed at ${pickup.completedAt ? new Date(pickup.completedAt).toLocaleTimeString() : 'farm gate'}. Thank you for contributing to your FPO bulk order.`
                      : isArrived
                      ? 'The collection transporter has arrived at your farm gate! Please verify scale tare and assist with produce loading.'
                      : 'Please keep your produce packaged, graded, and ready near your village collection point before vehicle arrival.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FarmerPickupsSection;
