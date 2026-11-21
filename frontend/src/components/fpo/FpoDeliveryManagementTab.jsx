import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Truck, Package, CheckCircle2, Clock, MapPin, AlertCircle,
  ShieldCheck, ShieldAlert, ArrowRight, RefreshCw, Search,
  Navigation, Check, Users, Fuel, Calendar, Phone, Eye, ExternalLink,
  ChevronDown, ChevronUp, Layers, CheckCircle
} from 'lucide-react';

const FpoDeliveryManagementTab = ({ fpoProfile }) => {
  const { t } = useTranslation();

  const [activeSubTab, setActiveSubTab] = useState('DELIVERIES'); // 'DELIVERIES' | 'PENDING_DISPATCH'
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [metrics, setMetrics] = useState({
    totalDeliveries: 0,
    inTransit: 0,
    delivered: 0,
    totalExpectedKg: 0,
    totalCollectedKg: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Delivery Plan Modal State
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState(null);
  const [deliveryPlan, setDeliveryPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  // Stop Collection Modal State
  const [selectedStopForCollection, setSelectedStopForCollection] = useState(null);
  const [collectedKgInput, setCollectedKgInput] = useState('');
  const [updatingStop, setUpdatingStop] = useState(false);

  // Expanded card tracking
  const [expandedDeliveryId, setExpandedDeliveryId] = useState(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [delRes, ordRes] = await Promise.allSettled([
        api.get('/fpo/deliveries'),
        api.get('/fpo/orders')
      ]);

      if (delRes.status === 'fulfilled') {
        const payload = delRes.value.data?.data || delRes.value.data || {};
        setDeliveries(payload.deliveries || []);
        if (payload.metrics) {
          setMetrics(payload.metrics);
        }
      }

      if (ordRes.status === 'fulfilled') {
        const ordPayload = ordRes.value.data?.data || ordRes.value.data || [];
        setOrders(Array.isArray(ordPayload) ? ordPayload : []);
      }
    } catch (err) {
      console.error('Error fetching FPO deliveries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter deliveries
  const filteredDeliveries = deliveries.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (d.trackingNumber || '').toLowerCase().includes(q) ||
      (d.order?.orderNumber || '').toLowerCase().includes(q) ||
      (d.transporter?.name || '').toLowerCase().includes(q) ||
      (d.vehicle?.vehicleNumber || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    return true;
  });

  // Filter orders that have no active delivery job
  const pendingDispatchOrders = orders.filter((o) => !o.hasDelivery && ['CONFIRMED', 'PLACED'].includes(o.status));

  // Open delivery plan preview
  const handleOpenDeliveryPlan = async (order) => {
    setSelectedOrderForDispatch(order);
    setLoadingPlan(true);
    setDeliveryPlan(null);
    try {
      const res = await api.get(`/fpo/orders/${order.id}/delivery-plan`);
      setDeliveryPlan(res.data?.data || res.data);
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
      setSelectedOrderForDispatch(null);
    } finally {
      setLoadingPlan(false);
    }
  };

  // Dispatch delivery job
  const handleConfirmDispatch = async () => {
    if (!selectedOrderForDispatch) return;
    setDispatching(true);
    try {
      const res = await api.post(`/fpo/orders/${selectedOrderForDispatch.id}/deliveries`, {
        notes: `Multi-farmer pickup job dispatched by ${fpoProfile?.fpoName || 'FPO Manager'}`
      });
      alert(res.data?.data?.message || t('deliveries.createdSuccess', 'Multi-farmer delivery job created successfully!'));
      setSelectedOrderForDispatch(null);
      setDeliveryPlan(null);
      fetchData();
      setActiveSubTab('DELIVERIES');
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setDispatching(false);
    }
  };

  // Update stop status (Mark Arrived or Completed)
  const handleUpdateStopStatus = async (deliveryId, stopId, newStatus, collectedKg = null) => {
    setUpdatingStop(true);
    try {
      const payload = { status: newStatus };
      if (collectedKg !== null) {
        payload.collectedQuantityKg = parseFloat(collectedKg);
      }
      const res = await api.patch(`/fpo/deliveries/${deliveryId}/stops/${stopId}`, payload);
      alert(res.data?.data?.message || `Stop updated to ${newStatus}`);
      setSelectedStopForCollection(null);
      setCollectedKgInput('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || err.message);
    } finally {
      setUpdatingStop(false);
    }
  };

  const collectionPercent = metrics.totalExpectedKg > 0
    ? Math.round((metrics.totalCollectedKg / metrics.totalExpectedKg) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#07875B] text-xs font-bold border border-emerald-200">
              <Truck className="w-3.5 h-3.5" />
              {t('deliveries.badge', 'Phase 6 • Multi-Farmer Pickup Logistics')}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t('deliveries.title', 'Multi-Farmer Delivery & Fleet Dispatch')}
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              {t('deliveries.subtitle', 'Consolidated logistics tracking for bulk orders with multiple farmer pickup stops (Farmer A → Farmer B → Farmer C → Buyer Destination).')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
              title={t('common.refresh', 'Refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#07875B]' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('deliveries.activeDeliveries', 'Active Jobs')}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalDeliveries}</p>
            <span className="text-[10px] text-slate-500 font-semibold">{metrics.inTransit} in transit</span>
          </div>

          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">{t('deliveries.delivered', 'Delivered')}</p>
            <p className="text-2xl font-black text-[#07875B] mt-1">{metrics.delivered}</p>
            <span className="text-[10px] text-emerald-600 font-semibold">completed fulfillment</span>
          </div>

          <div className="bg-sky-50/50 rounded-2xl p-4 border border-sky-200 sm:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">{t('deliveries.collectionProgress', 'Multi-Farmer Pickup Collection')}</p>
              <span className="text-xs font-black text-sky-700">{collectionPercent}% ({metrics.totalCollectedKg.toLocaleString()} / {metrics.totalExpectedKg.toLocaleString()} kg)</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-[#07875B] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(collectionPercent, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#07875B]" />
              {t('deliveries.stockProtected', 'Weights verified at farm gate with synchronized farmer notifications.')}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Subtabs Navigation */}
      <div className="flex border-b border-slate-200 gap-3 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveSubTab('DELIVERIES')}
          className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'DELIVERIES'
              ? 'border-[#07875B] text-[#07875B] font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          {t('deliveries.tabDeliveries', 'Consolidated Delivery Jobs')} ({deliveries.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('PENDING_DISPATCH')}
          className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'PENDING_DISPATCH'
              ? 'border-[#07875B] text-[#07875B] font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          {t('deliveries.tabPendingDispatch', 'Confirmed Orders Ready for Dispatch')} ({pendingDispatchOrders.length})
        </button>
      </div>

      {/* 4. TAB CONTENT: DELIVERIES */}
      {activeSubTab === 'DELIVERIES' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('deliveries.searchPlaceholder', 'Search by tracking #, order #, carrier, or vehicle...')}
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#07875B] transition-all shadow-xs"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none font-medium cursor-pointer"
            >
              <option value="ALL">{t('deliveries.filterAll', 'All Delivery Statuses')}</option>
              <option value="UNASSIGNED">{t('status.UNASSIGNED', 'Unassigned (Coordinates Shielded)')}</option>
              <option value="ASSIGNED">{t('status.ASSIGNED', 'Assigned to Carrier')}</option>
              <option value="PICKUP">{t('status.PICKUP', 'Pickup in Progress')}</option>
              <option value="TRANSIT">{t('status.TRANSIT', 'In Transit to Buyer')}</option>
              <option value="DELIVERED">{t('status.DELIVERED', 'Delivered')}</option>
            </select>
          </div>

          {filteredDeliveries.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-dashed border-slate-200">
              <Truck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-extrabold text-slate-800 text-sm">{t('deliveries.noDeliveriesFound', 'No delivery jobs found.')}</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {t('deliveries.noDeliveriesDesc', 'When bulk orders are confirmed, generate optimized multi-stop pickup requests to begin carrier dispatch.')}
              </p>
              {pendingDispatchOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('PENDING_DISPATCH')}
                  className="px-4 py-2 bg-[#07875B] text-white text-xs font-bold rounded-xl hover:bg-[#066e4a] transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  {t('deliveries.viewReadyOrders', 'View Confirmed Orders Ready for Dispatch')} ({pendingDispatchOrders.length})
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeliveries.map((delivery) => {
                const isExpanded = expandedDeliveryId === delivery.id;
                const stops = delivery.stops || [];
                const pickupStops = stops.filter((s) => s.stopType === 'PICKUP');
                const deliveryStop = stops.find((s) => s.stopType === 'DELIVERY');
                const isUnassigned = delivery.status === 'UNASSIGNED';

                return (
                  <div
                    key={delivery.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-emerald-300 transition-all space-y-4"
                  >
                    {/* Top Row: Job Header */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-base">{delivery.trackingNumber}</span>
                          <span className="text-xs font-bold text-slate-400">• Order #{delivery.order?.orderNumber}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              delivery.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-[#07875B] border border-emerald-300'
                                : delivery.status === 'TRANSIT'
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : delivery.status === 'PICKUP'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}
                          >
                            {delivery.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          <strong>{delivery.cropName}</strong> ({delivery.variety || 'Standard'}) • {delivery.totalWeightKg.toLocaleString()} kg total
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pickup Progress</span>
                          <span className="text-sm font-black text-[#07875B]">
                            {delivery.collectedQuantityKg?.toLocaleString() || 0} / {delivery.totalWeightKg.toLocaleString()} kg
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedDeliveryId(isExpanded ? null : delivery.id)}
                          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Transporter & Route Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Transporter Details */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {t('deliveries.transporterTitle', 'Transporter / Carrier')}
                        </span>
                        {delivery.transporter?.name ? (
                          <div className="space-y-1">
                            <p className="font-black text-slate-800 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-[#07875B]" />
                              {delivery.transporter.name}
                            </p>
                            {delivery.vehicle?.vehicleNumber && (
                              <p className="text-slate-600 text-[11px]">
                                Vehicle: <span className="font-bold">{delivery.vehicle.vehicleNumber}</span> ({delivery.vehicle.vehicleType})
                              </p>
                            )}
                            {delivery.driverPhone && (
                              <p className="text-slate-500 text-[11px] flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {delivery.driverPhone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="font-bold text-amber-800 flex items-center gap-1.5">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                              {t('deliveries.awaitingCarrier', 'Awaiting Carrier Assignment')}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {t('deliveries.coordinatesShieldedDesc', 'Farmer GPS coordinates shielded until carrier dispatch.')}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Coordinated Route Optimization */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {t('deliveries.routeOptimization', 'Route & Multi-Stop Efficiency')}
                        </span>
                        <div className="space-y-1">
                          <p className="font-black text-slate-800 flex items-center gap-1.5">
                            <Navigation className="w-3.5 h-3.5 text-[#07875B]" />
                            {delivery.routeSummary?.totalDistanceKm || 68.5} km • ~{delivery.routeSummary?.estimatedMinutes || 95} mins
                          </p>
                          <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <Fuel className="w-3 h-3 text-[#07875B]" />
                            Saved ~{delivery.routeSummary?.savedKm || 56.5} km (₹{Math.round(delivery.routeSummary?.fuelSavedRs || 1341)} fuel saved)
                          </p>
                        </div>
                      </div>

                      {/* Buyer Destination */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {t('deliveries.destinationTitle', 'Buyer Destination')}
                        </span>
                        <div className="space-y-1">
                          <p className="font-black text-slate-800 truncate">
                            {delivery.order?.buyer?.organizationName || 'Institutional Buyer'}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {delivery.order?.deliveryAddress || 'Warehouse Depot'}
                          </p>
                          {delivery.order?.scheduledDelivery && (
                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Deadline: {new Date(delivery.order.scheduledDelivery).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Multi-Farmer Pickup Stops Timeline */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#07875B]" />
                          {t('deliveries.multiPickupChain', 'Multi-Farmer Pickup Chain')} ({pickupStops.length} stops)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {delivery.progressPercent || 0}% Complete
                        </span>
                      </div>

                      {/* Sequential Stops */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        {pickupStops.map((stop, sIdx) => {
                          const isDone = stop.status === 'COMPLETED';
                          const isArrived = stop.status === 'ARRIVED';

                          return (
                            <div
                              key={stop.id || sIdx}
                              className={`p-3 rounded-2xl border text-xs transition-all ${
                                isDone
                                  ? 'bg-emerald-50/40 border-emerald-300'
                                  : isArrived
                                  ? 'bg-amber-50/50 border-amber-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-black text-slate-900 text-[11px]">
                                  Stop #{stop.sequence}: {stop.stopName || `Farmer ${sIdx + 1}`}
                                </span>
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    isDone
                                      ? 'bg-emerald-200 text-emerald-900'
                                      : isArrived
                                      ? 'bg-amber-200 text-amber-900'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {stop.status}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {stop.address || 'Member Cluster'}
                              </p>

                              {isUnassigned && (
                                <p className="text-[9px] text-slate-400 italic mt-0.5">
                                  🔒 Coordinates protected
                                </p>
                              )}

                              <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200/60">
                                <span className="font-bold text-[#07875B]">
                                  {stop.quantityKg.toLocaleString()} kg
                                </span>

                                {!isDone && (
                                  <div className="flex items-center gap-1">
                                    {!isArrived && (
                                      <button
                                        type="button"
                                        disabled={updatingStop}
                                        onClick={() => handleUpdateStopStatus(delivery.id, stop.id, 'ARRIVED')}
                                        className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                                      >
                                        Arrived
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={updatingStop}
                                      onClick={() => {
                                        setSelectedStopForCollection({
                                          deliveryId: delivery.id,
                                          stop
                                        });
                                        setCollectedKgInput(String(stop.quantityKg));
                                      }}
                                      className="px-2 py-1 bg-[#07875B] hover:bg-[#066e4a] text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                                    >
                                      Collect
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Final Destination Delivery Stop Action */}
                      {deliveryStop && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">
                              Final Destination (Buyer Depot)
                            </span>
                            <p className="font-black text-sm">{deliveryStop.stopName}</p>
                            <p className="text-slate-300 text-[11px]">{deliveryStop.address}</p>
                          </div>

                          {deliveryStop.status !== 'COMPLETED' ? (
                            <button
                              type="button"
                              disabled={updatingStop || delivery.status !== 'TRANSIT'}
                              onClick={() => handleUpdateStopStatus(delivery.id, deliveryStop.id, 'COMPLETED')}
                              className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                                delivery.status === 'TRANSIT'
                                  ? 'bg-[#07875B] hover:bg-[#066e4a] text-white'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Confirm Delivery to Buyer
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-black text-xs">
                              <CheckCircle2 className="w-4 h-4" /> Delivered & Verified
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT: PENDING DISPATCH ORDERS */}
      {activeSubTab === 'PENDING_DISPATCH' && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold">{t('deliveries.readyForDispatchHeader', 'Confirmed Orders Requiring Logistics Dispatch')}</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {t('deliveries.readyForDispatchDesc', 'Each confirmed order consolidates verified farmer contributions. Click "Plan Multi-Farmer Route & Dispatch" to calculate optimal pickup order and generate the multi-stop logistics job.')}
              </p>
            </div>
          </div>

          {pendingDispatchOrders.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="font-extrabold text-slate-800 text-sm">{t('deliveries.noPendingOrders', 'All confirmed bulk orders have been dispatched!')}</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {t('deliveries.noPendingDesc', 'When new quotation proposals are accepted and confirmed by buyers, they will appear here ready for logistics planning.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingDispatchOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-emerald-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base">Order #{ord.orderNumber}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-[#07875B] rounded-full text-[10px] font-extrabold">
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-slate-700">
                      <strong>{ord.cropName}</strong> • {ord.totalQuantityKg.toLocaleString()} kg allocated across{' '}
                      <span className="font-bold text-[#07875B]">{ord.contributingFarmersCount || 1} member farmers</span>
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Buyer: <strong>{ord.buyer?.organizationName || 'Verified Buyer'}</strong> • Destination: {ord.deliveryAddress}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Value</span>
                      <span className="font-black text-base text-[#07875B]">₹{(ord.agreedPriceTotal || 0).toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenDeliveryPlan(ord)}
                      className="px-4 py-2.5 bg-[#07875B] hover:bg-[#066e4a] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Plan Multi-Farmer Route & Dispatch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: Pre-Dispatch Multi-Farmer Route Plan */}
      {selectedOrderForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-950 to-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                  Pre-Dispatch Logistics Inspection
                </span>
                <h3 className="font-black text-lg">
                  Multi-Farmer Delivery Plan: #{selectedOrderForDispatch.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDispatch(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {loadingPlan ? (
                <div className="p-12 text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-[#07875B] animate-spin mx-auto" />
                  <p className="font-bold text-slate-700">Computing optimal multi-farmer pickup route...</p>
                  <p className="text-[11px] text-slate-400">Validating confirmed stock and checking carrier feasibility</p>
                </div>
              ) : deliveryPlan ? (
                <div className="space-y-4">
                  {/* Stock Confirmation Audit Alert */}
                  <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-[#07875B] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Stock Verified & Confirmed</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        All {deliveryPlan.contributingFarmers?.length || 0} contributing member farmers have confirmed contributions. Exact pickup coordinates will be protected until carrier assignment.
                      </p>
                    </div>
                  </div>

                  {/* Route Summary Stats */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Distance</span>
                      <span className="font-black text-slate-900 text-base">{deliveryPlan.routeSummary?.totalDistanceKm || 68.5} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Duration</span>
                      <span className="font-black text-slate-900 text-base">~{deliveryPlan.routeSummary?.estimatedMinutes || 95} mins</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fuel Savings</span>
                      <span className="font-black text-[#07875B] text-base">₹{Math.round(deliveryPlan.routeSummary?.fuelSavedRs || 1341)}</span>
                    </div>
                  </div>

                  {/* Planned Pickup Sequence */}
                  <div className="space-y-2">
                    <p className="font-extrabold text-slate-800">Optimized Pickup Sequence ({deliveryPlan.contributingFarmers?.length} Stops):</p>
                    <div className="space-y-2">
                      {deliveryPlan.contributingFarmers?.map((f, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900">
                              Stop #{idx + 1}: {f.name} ({f.village})
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {f.cropName} ({f.variety || 'Standard'}) • {f.grade || 'GRADE_A'}
                            </p>
                          </div>
                          <span className="font-black text-[#07875B] text-sm">
                            {f.quantityKg.toLocaleString()} kg
                          </span>
                        </div>
                      ))}

                      {/* Final Destination */}
                      <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center">
                        <div className="space-y-0.5">
                          <p className="font-bold">Final Stop: {deliveryPlan.order?.buyer?.organizationName || 'Buyer Hub'}</p>
                          <p className="text-[11px] text-slate-300">{deliveryPlan.order?.deliveryAddress}</p>
                        </div>
                        <span className="font-black text-emerald-400 text-sm">
                          {deliveryPlan.order?.totalQuantityKg.toLocaleString()} kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrderForDispatch(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dispatching || loadingPlan}
                onClick={handleConfirmDispatch}
                className="px-5 py-2 bg-[#07875B] hover:bg-[#066e4a] text-white font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {dispatching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating Delivery Job...
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" />
                    Confirm & Dispatch Delivery Job
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: Record Stop Collection */}
      {selectedStopForCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-black text-slate-900 text-base">
              Record Produce Collection: Stop #{selectedStopForCollection.stop.sequence}
            </h3>
            <p className="text-xs text-slate-500">
              Confirm collected quantity at farm gate for {selectedStopForCollection.stop.stopName}. The contributing farmer will receive an instant notification.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Actual Collected Quantity (kg)
              </label>
              <input
                type="number"
                value={collectedKgInput}
                onChange={(e) => setCollectedKgInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-[#07875B]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Scheduled quantity: {selectedStopForCollection.stop.quantityKg} kg
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStopForCollection(null)}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingStop}
                onClick={() =>
                  handleUpdateStopStatus(
                    selectedStopForCollection.deliveryId,
                    selectedStopForCollection.stop.id,
                    'COMPLETED',
                    collectedKgInput
                  )
                }
                className="px-4 py-2 bg-[#07875B] hover:bg-[#066e4a] text-white font-black rounded-xl text-xs shadow-sm cursor-pointer"
              >
                {updatingStop ? 'Saving...' : 'Verify & Record Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FpoDeliveryManagementTab;
