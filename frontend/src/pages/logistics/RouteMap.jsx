import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Truck,
  Thermometer,
  Clock,
  Navigation,
  CheckCircle2,
  RotateCw,
  Compass,
  Lock,
  Unlock,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Check,
  Fuel,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logisticsApi from '../../services/logisticsApi';
import LiveMap from '../../components/logistics/LiveMap';

const DEVIATION_REASONS = [
  { value: 'ROAD_CLOSED', label: 'Road Closed / Construction' },
  { value: 'FLOOD', label: 'Monsoon Flooding / Waterlogging' },
  { value: 'ACCIDENT', label: 'Traffic Accident / Severe Congestion' },
  { value: 'WEIGHT_LIMIT', label: 'Vehicle Weight / Bridge Limit' },
  { value: 'OTHER', label: 'Other Operational Deviation' },
];

/**
 * SasyaVahini — Live Route Map, Multi-Route Navigation & Fleet Tracking
 *
 * Owner: Member 4
 */
export default function RouteMap() {
  const [searchParams] = useSearchParams();
  const queryShipmentId = searchParams.get('shipmentId');
  const queryLegId = searchParams.get('legId');
  const { user } = useAuth();

  const isBuyer = user?.role === 'BUYER';
  const isDriverOrAdmin = !user || user?.role === 'LOGISTICS' || user?.role === 'ADMIN' || user?.role === 'TRANSPORTER';

  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [shipmentId, setShipmentId] = useState(queryShipmentId || 'shp_demo_101');
  const [legId, setLegId] = useState(queryLegId || 'leg_demo_101');

  // Multi-route state
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);

  // Deviation modal
  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [pendingRouteIndex, setPendingRouteIndex] = useState(null);
  const [deviationReason, setDeviationReason] = useState('ROAD_CLOSED');

  // OTP Verification state
  const [otpInput, setOtpInput] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [otpError, setOtpError] = useState('');

  const fetchTracking = async () => {
    try {
      setLoading(true);
      let targetId = shipmentId;
      if (!queryShipmentId || queryShipmentId === 'shp_demo_101') {
        try {
          const listRes = await logisticsApi.getShipments({ limit: 5 });
          const userShipments = listRes?.shipments || [];
          const active = userShipments.find((s) => s.status !== 'DELIVERED') || userShipments[0];
          if (active?.id) {
            targetId = active.id;
            setShipmentId(active.id);
          }
        } catch {
          // ignore
        }
      }

      const data = await logisticsApi.getShipmentTracking(targetId);
      setTrackingData(data);

      if (data.routes && data.routes.length > 0) {
        setRoutes(data.routes);
      } else if (data.primaryRoute) {
        setRoutes([
          { ...data.primaryRoute, routeIndex: 0 },
          ...(data.alternativeRoute ? [{ ...data.alternativeRoute, routeIndex: 1 }] : []),
        ]);
      }

      if (data.selectedRouteIndex != null) {
        setSelectedRouteIndex(data.selectedRouteIndex);
      }
      if (data.isLocked != null) {
        setIsLocked(data.isLocked);
      }
      if (data.legId) {
        setLegId(data.legId);
      }
    } catch (err) {
      console.error('Failed to load tracking data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(() => {
      logisticsApi.getShipmentTracking(shipmentId).then((data) => {
        setTrackingData(data);
        if (data.selectedRouteIndex != null && isLocked) {
          setSelectedRouteIndex(data.selectedRouteIndex);
        }
      }).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [shipmentId]);

  // Handle route selection attempt
  const handleSelectRoute = (index) => {
    if (index === selectedRouteIndex) return;

    if (isLocked) {
      // Prompt for deviation reason
      setPendingRouteIndex(index);
      setShowDeviationModal(true);
    } else {
      setSelectedRouteIndex(index);
    }
  };

  // Lock or switch route
  const handleLockRoute = async (routeIdxToLock, reason = null) => {
    try {
      setLockLoading(true);
      await logisticsApi.selectLegRoute(legId, {
        selectedRouteIndex: routeIdxToLock,
        deviationReason: reason,
      });
      setSelectedRouteIndex(routeIdxToLock);
      setIsLocked(true);
      setShowDeviationModal(false);
      setPendingRouteIndex(null);
      await fetchTracking();
    } catch (err) {
      console.error('Failed to lock route', err);
      alert(err.response?.data?.message || err.message || 'Failed to lock route');
    } finally {
      setLockLoading(false);
    }
  };

  // Confirm deviation from modal
  const handleConfirmDeviation = () => {
    if (pendingRouteIndex == null) return;
    handleLockRoute(pendingRouteIndex, deviationReason);
  };

  // Verify delivery OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      setOtpError('Please enter a 6-digit numeric OTP');
      return;
    }

    try {
      setOtpSubmitting(true);
      setOtpError('');
      await logisticsApi.verifyDeliveryOtp(shipmentId, otpInput.trim());
      setOtpSuccess(true);
      await fetchTracking();
    } catch (err) {
      setOtpError(err.response?.data?.message || err.message || 'OTP verification failed');
    } finally {
      setOtpSubmitting(false);
    }
  };

  const activeRoute = routes[selectedRouteIndex] || routes[0] || trackingData?.primaryRoute;

  // Google Maps navigation URL builder fallback
  const getGoogleMapsNavUrl = (route) => {
    if (route?.googleMapsUrl) return route.googleMapsUrl;
    const dest = trackingData?.stops?.find((s) => s.stopType === 'DELIVERY') || { latitude: 18.5089, longitude: 73.9260 };
    const origin = trackingData?.currentLocation || { latitude: 18.9880, longitude: 73.9400 };
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}&travelmode=driving`;
  };

  return (
    <div className="main-content space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="heading-2 flex items-center gap-2">
            <Navigation size={24} style={{ color: 'var(--color-primary)' }} />
            Multi-Route Navigation & Live Tracking
          </h1>
          <p className="text-secondary text-sm">
            Tracking {trackingData?.trackingNumber || shipmentId} — Google Maps-style live navigation, route comparison & telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Polling (5s)
          </span>
          <button
            type="button"
            onClick={fetchTracking}
            className="btn btn-secondary text-xs flex items-center gap-1"
          >
            <RotateCw size={13} className={loading ? 'animate-spin' : ''} /> Sync
          </button>
        </div>
      </div>

      {/* Buyer Delivery OTP Banner (Visible to buyer) */}
      {(isBuyer || trackingData?.deliveryOtp) && (
        <div className="card p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-full bg-emerald-600 text-white shadow-sm mt-0.5">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                Secure Delivery Handover OTP
                <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-800">
                  Buyer Confidential
                </span>
              </h3>
              <p className="text-xs text-emerald-900/80 mt-0.5 max-w-xl">
                Inspect fresh produce quality and weight upon arrival at destination. Provide this 6-digit OTP to the driver to complete delivery handover and release payment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-lg border border-emerald-300 shadow-sm self-start md:self-auto">
            <span className="text-xs text-secondary font-medium">Delivery OTP:</span>
            <span className="font-mono text-xl font-extrabold tracking-widest text-emerald-700">
              {trackingData?.deliveryOtp || '482910'}
            </span>
          </div>
        </div>
      )}

      {/* Telemetry Status Bar */}
      {trackingData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-3 rounded-lg bg-white border" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-secondary text-xs flex items-center gap-1">
              <Truck size={14} /> Assigned Vehicle:
            </div>
            <div className="text-base font-bold mt-1 text-gray-900">
              {trackingData.vehicle?.vehicleNumber || 'MH-12-QX-4012'}
            </div>
            <div className="text-xs text-secondary">{trackingData.vehicle?.driverName || 'Shivaji Mane'}</div>
          </div>

          <div className="card p-3 rounded-lg bg-white border" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-secondary text-xs flex items-center gap-1">
              <Thermometer size={14} className="text-purple-600" /> Cold-Chain Telemetry:
            </div>
            <div className="text-base font-bold mt-1 text-purple-700">
              {trackingData.coldChain?.currentTempC || 13.8}°C
            </div>
            <div className="text-xs text-emerald-600 font-semibold">Status: Optimal (10°–16°C)</div>
          </div>

          <div className="card p-3 rounded-lg bg-white border" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-secondary text-xs flex items-center gap-1">
              <Clock size={14} className="text-blue-600" /> Estimated Time Remaining:
            </div>
            <div className="text-base font-bold mt-1 text-blue-700">
              {activeRoute?.etaMin || activeRoute?.etaMinutes || trackingData.route?.etaMinutes || 110} mins
            </div>
            <div className="text-xs text-secondary">
              Distance: {activeRoute?.distanceKm || trackingData.route?.totalDistanceKm || 96} km
            </div>
          </div>

          <div className="card p-3 rounded-lg bg-white border" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-secondary text-xs flex items-center gap-1">
              <Navigation size={14} className="text-emerald-600" /> Current Velocity:
            </div>
            <div className="text-base font-bold mt-1 text-emerald-700">
              {trackingData.currentLocation?.speedKmh || 44} km/h
            </div>
            <div className="text-xs text-secondary">Pune-Nashik Highway Corridor</div>
          </div>
        </div>
      )}

      {/* 3 Real Alternative Routes Comparison Header & Action Buttons */}
      <div className="card p-4 rounded-xl bg-white border space-y-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Compass size={18} style={{ color: 'var(--color-primary)' }} />
              Real Multi-Route Comparison & Live Selection
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Compare 3 real road routes calculated via OSRM with road hierarchy, fuel economics, toll costs, and net driver earnings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Google Maps Navigation Link */}
            <a
              href={getGoogleMapsNavUrl(activeRoute)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-xs flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
            >
              <ExternalLink size={13} />
              Open in Google Maps
            </a>

            {/* Lock Route & Start Trip button */}
            {isLocked ? (
              <button
                type="button"
                onClick={() => {
                  setPendingRouteIndex((selectedRouteIndex + 1) % (routes.length || 3));
                  setShowDeviationModal(true);
                }}
                className="btn text-xs flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100"
              >
                <Lock size={13} className="text-emerald-600" />
                Route Locked · Change Route
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleLockRoute(selectedRouteIndex)}
                disabled={lockLoading}
                className="btn btn-primary text-xs flex items-center gap-1.5 px-4 py-2 font-bold shadow-sm"
              >
                {lockLoading ? (
                  <RotateCw size={13} className="animate-spin" />
                ) : (
                  <Lock size={13} />
                )}
                Lock Route & Start Trip
              </button>
            )}
          </div>
        </div>

        {/* 3 Route Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {routes.map((r, idx) => {
            const isSelected = selectedRouteIndex === idx;
            const routeColors = ['#10b981', '#3b82f6', '#f59e0b'];
            const cardBorder = isSelected
              ? idx === 0
                ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/20'
                : idx === 1
                ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/20'
                : 'border-amber-500 ring-2 ring-amber-200 bg-amber-50/20'
              : 'border-gray-200 hover:border-gray-300 bg-white';

            return (
              <div
                key={idx}
                onClick={() => handleSelectRoute(idx)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${cardBorder}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: routeColors[idx] || '#10b981' }}
                      />
                      {r.label || `Route ${idx + 1}`}
                    </span>
                    {r.isRecommended && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        RECOMMENDED
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-900 text-white">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-secondary mt-1 line-clamp-1">
                    {r.description || (idx === 0 ? 'Fastest highway corridor' : idx === 1 ? 'Balanced state highway' : 'Rural direct')}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-100 text-xs">
                    <div>
                      <span className="text-secondary text-[11px]">Distance:</span>
                      <div className="font-bold text-gray-900">{r.distanceKm} km</div>
                    </div>
                    <div>
                      <span className="text-secondary text-[11px]">ETA:</span>
                      <div className="font-bold text-blue-700">{r.etaMin || r.etaMinutes} mins</div>
                    </div>
                    <div>
                      <span className="text-secondary text-[11px]">Fuel:</span>
                      <div className="font-semibold text-gray-800">
                        {r.fuelLitres} L (₹{r.fuelCostRs})
                      </div>
                    </div>
                    <div>
                      <span className="text-secondary text-[11px]">Tolls:</span>
                      <div className="font-semibold text-gray-800">
                        ₹{r.tollsRs || 0}
                      </div>
                    </div>
                  </div>

                  {/* Road Breakdown */}
                  {r.roadBreakdown && (
                    <div className="mt-2.5 pt-2 border-t border-gray-100 text-[11px] text-secondary">
                      <span className="font-medium text-gray-700">Road Mix: </span>
                      {r.roadBreakdown.highwayKm ? `${r.roadBreakdown.highwayKm}km Hwy · ` : ''}
                      {r.roadBreakdown.stateHighwayKm ? `${r.roadBreakdown.stateHighwayKm}km SH · ` : ''}
                      {r.roadBreakdown.ruralKm ? `${r.roadBreakdown.ruralKm}km Rural` : ''}
                    </div>
                  )}
                </div>

                {/* Driver Net Earnings Pill */}
                <div className="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-gray-600">Net Driver Payout:</span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    ₹{r.driverNetEarningsRs != null ? r.driverNetEarningsRs : (4500 - (r.fuelCostRs || 2200) - (r.tollsRs || 0))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map and Stops Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Map (2 Cols) */}
        <div className="lg:col-span-2 card p-4 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <LiveMap
            farmers={trackingData?.stops?.filter((s) => s.stopType === 'PICKUP') || []}
            buyer={trackingData?.stops?.find((s) => s.stopType === 'DELIVERY') || { lat: 18.5089, lng: 73.9260, name: 'Hadapsar Destination' }}
            vehicle={trackingData?.currentLocation ? { ...trackingData.currentLocation, vehicleNumber: trackingData.vehicle?.vehicleNumber } : null}
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={handleSelectRoute}
            isEstimated={activeRoute?.isEstimated || false}
            height="480px"
          />
        </div>

        {/* Stops Sequence and Driver Verification (1 Col) */}
        <div className="card p-4 rounded-xl bg-white border flex flex-col justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center justify-between">
              <span>Pickup & Delivery Stops</span>
              <span className="text-xs text-secondary">
                {trackingData?.stops?.filter((s) => s.status === 'COMPLETED').length || 0} /{' '}
                {trackingData?.stops?.length || 0} Completed
              </span>
            </h3>

            <div className="space-y-3">
              {trackingData?.stops?.map((stop, idx) => {
                const isCompleted = stop.status === 'COMPLETED';
                const isDelivery = stop.stopType === 'DELIVERY';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs ${
                      isCompleted ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${
                            isDelivery ? 'bg-blue-600' : 'bg-emerald-600'
                          }`}
                        >
                          {isDelivery ? '🏬' : stop.sequence}
                        </span>
                        {stop.stopName}
                      </span>
                      {isCompleted ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 size={13} /> Completed
                        </span>
                      ) : (
                        <span className="text-secondary">En Route</span>
                      )}
                    </div>
                    <div className="mt-1 pl-6 text-secondary flex justify-between">
                      <span>{isDelivery ? 'Delivery Load:' : 'Collected:'} <b>{stop.quantityKg} kg</b></span>
                      {stop.grade && <span>Grade: <b>{stop.grade}</b></span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Driver OTP Verification Form at Delivery */}
            {isDriverOrAdmin && trackingData?.status !== 'DELIVERED' && (
              <div className="mt-5 p-3.5 rounded-lg border border-amber-200 bg-amber-50/60 text-xs space-y-2">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck size={15} /> Confirm Delivery via Buyer OTP
                </div>
                <p className="text-amber-800 text-[11px]">
                  Collect the 6-digit verification OTP from the buyer upon safe arrival and unloading of produce.
                </p>
                <form onSubmit={handleVerifyOtp} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3 py-1.5 rounded border border-amber-300 text-xs font-mono font-bold tracking-wider"
                  />
                  <button
                    type="submit"
                    disabled={otpSubmitting || otpInput.length !== 6}
                    className="btn btn-primary text-xs px-3 py-1.5"
                  >
                    {otpSubmitting ? 'Verifying...' : 'Verify'}
                  </button>
                </form>
                {otpError && <p className="text-red-600 font-semibold text-[11px]">{otpError}</p>}
                {otpSuccess && (
                  <p className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 size={13} /> Delivery verified successfully!
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t text-xs text-secondary" style={{ borderColor: 'var(--color-border)' }}>
            <span className="font-medium text-gray-700">Driver Contact:</span>{' '}
            {trackingData?.vehicle?.driverPhone || '+91 98220 14012'}
          </div>
        </div>
      </div>

      {/* Route Deviation Reason Modal */}
      {showDeviationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Route Locked · Deviation Reason Required
                </h3>
                <p className="text-xs text-secondary mt-1">
                  This trip's route is locked. Switching to Route {(pendingRouteIndex ?? 0) + 1} requires logging a valid operational deviation reason.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <Check size={14} className="text-blue-700" /> Statutory Payout Protection
              </div>
              <p className="text-[11px] text-blue-800">
                The agreed buyer price is fixed and immutable. Transporter earnings are fully protected.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Select Deviation Reason:
              </label>
              <select
                value={deviationReason}
                onChange={(e) => setDeviationReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs focus:ring-2 focus:ring-emerald-500"
              >
                {DEVIATION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowDeviationModal(false);
                  setPendingRouteIndex(null);
                }}
                className="btn btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeviation}
                disabled={lockLoading}
                className="btn btn-primary text-xs px-4 py-1.5 font-bold"
              >
                {lockLoading ? 'Saving...' : 'Confirm Reroute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
