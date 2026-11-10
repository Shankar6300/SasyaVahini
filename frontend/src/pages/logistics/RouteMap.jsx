import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Truck, Thermometer, Clock, Navigation, CheckCircle2, RotateCw, Compass } from 'lucide-react';
import logisticsApi from '../../services/logisticsApi';
import LiveMap from '../../components/logistics/LiveMap';
import SavingsCard from '../../components/logistics/SavingsCard';

/**
 * SasyaVahini — Live Route Map & Fleet Tracking Page
 *
 * Owner: Member 4
 */
export default function RouteMap() {
  const [searchParams] = useSearchParams();
  const queryShipmentId = searchParams.get('shipmentId');

  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [shipmentId, setShipmentId] = useState(queryShipmentId || 'SV-DATASET-S2-001');
  const [routeMode, setRouteMode] = useState('HIGHWAY');

  const fetchTracking = async () => {
    try {
      setLoading(true);
      const data = await logisticsApi.getShipmentTracking(shipmentId);
      setTrackingData(data);
    } catch (err) {
      console.error('Failed to load tracking data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    // Auto-refresh every 5 seconds for live tracking simulation
    const interval = setInterval(() => {
      logisticsApi.getShipmentTracking(shipmentId).then(setTrackingData).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [shipmentId]);

  return (
    <div className="main-content space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="heading-2 flex items-center gap-2">
            <Navigation size={24} style={{ color: 'var(--color-primary)' }} />
            Live Route & Telemetry Monitor
          </h1>
          <p className="text-secondary text-sm">
            Tracking {trackingData?.trackingNumber || shipmentId} — Real-time GPS pings and cold-chain status.
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

      {/* Telemetry Status Bar */}
      {trackingData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-3 rounded-lg bg-white border" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-secondary text-xs flex items-center gap-1">
              <Truck size={14} /> Assigned Vehicle:
            </div>
            <div className="text-base font-bold mt-1 text-gray-900">
              {trackingData.vehicle?.vehicleNumber || 'Unassigned'}
            </div>
            <div className="text-xs text-secondary">{trackingData.vehicle?.driverName}</div>
          </div>

          <div className="card p-3 rounded-lg bg-white border" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-secondary text-xs flex items-center gap-1">
              <Thermometer size={14} className="text-purple-600" /> Cold-Chain Telemetry:
            </div>
            <div className="text-base font-bold mt-1 text-purple-700">
              {trackingData.coldChain?.currentTempC || 14.2}°C
            </div>
            <div className="text-xs text-emerald-600 font-semibold">Status: Optimal (10°–16°C)</div>
          </div>

          <div className="card p-3 rounded-lg bg-white border" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-secondary text-xs flex items-center gap-1">
              <Clock size={14} className="text-blue-600" /> Estimated Time Remaining:
            </div>
            <div className="text-base font-bold mt-1 text-blue-700">
              {trackingData.route?.etaMinutes || 45} mins
            </div>
            <div className="text-xs text-secondary">
              Remaining: {trackingData.route?.remainingDistanceKm || 24} km
            </div>
          </div>

          <div className="card p-3 rounded-lg bg-white border" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-secondary text-xs flex items-center gap-1">
              <Navigation size={14} className="text-emerald-600" /> Current Velocity:
            </div>
            <div className="text-base font-bold mt-1 text-emerald-700">
              {trackingData.currentLocation?.speedKmh || 42} km/h
            </div>
            <div className="text-xs text-secondary">NH-60 Pune-Nashik Highway</div>
          </div>
        </div>
      )}

      {/* Truckable Route Strategy & Multi-Criteria Optimizer */}
      <div className="card p-4 rounded-xl bg-white border space-y-3" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Compass size={18} style={{ color: 'var(--color-primary)' }} />
              Truckable Route Strategy (India Multi-Criteria Optimizer)
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Evaluating road classification (NH vs SH vs Rural lanes), truck load friction, and diesel consumption.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRouteMode('HIGHWAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                routeMode === 'HIGHWAY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>NH-60 Corridor (Recommended)</span>
            </button>
            <button
              type="button"
              onClick={() => setRouteMode('RURAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                routeMode === 'RURAL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>SH-54 Rural Short Direct</span>
            </button>
          </div>
        </div>

        {/* Route Details Card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
            <span className="text-secondary text-xs">Route Distance:</span>
            <div className="text-base font-bold text-gray-900 mt-0.5">
              {routeMode === 'HIGHWAY' ? '96.0 km' : '82.5 km'}
            </div>
            <div className="text-xs text-gray-500">
              {routeMode === 'HIGHWAY' ? '75% 4-Lane Highway' : '50% Narrow Rural Road'}
            </div>
          </div>

          <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
            <span className="text-secondary text-xs">Transit & Handling ETA:</span>
            <div className="text-base font-bold text-blue-700 mt-0.5">
              {routeMode === 'HIGHWAY' ? '1h 50m (110 mins)' : '3h 05m (185 mins)'}
            </div>
            <div className="text-xs text-gray-500">
              {routeMode === 'HIGHWAY' ? 'Avg 52 km/h free-flow' : 'Avg 26 km/h village turns'}
            </div>
          </div>

          <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
            <span className="text-secondary text-xs">Diesel Consumption:</span>
            <div className="text-base font-bold text-amber-700 mt-0.5">
              {routeMode === 'HIGHWAY' ? '23.4 Litres (₹2,223)' : '29.8 Litres (₹2,831)'}
            </div>
            <div className="text-xs text-gray-500">
              {routeMode === 'HIGHWAY' ? 'Eff: 4.2 km/L (Saves ₹608)' : 'Eff: 2.9 km/L (Heavy idling)'}
            </div>
          </div>

          <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
            <span className="text-secondary text-xs">Cargo Spoilage Risk:</span>
            <div className="text-base font-bold mt-0.5" style={{ color: routeMode === 'HIGHWAY' ? '#07875B' : '#DC2626' }}>
              {routeMode === 'HIGHWAY' ? 'Minimal Risk (Cold Chain OK)' : 'Elevated (Bumpy & Delayed)'}
            </div>
            <div className="text-xs text-gray-500">
              {routeMode === 'HIGHWAY' ? 'Smooth highway bypass' : 'Excessive vibration & delay'}
            </div>
          </div>
        </div>
      </div>

      {/* Map and Stops Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Map (2 Cols) */}
        <div className="lg:col-span-2 card p-4 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
          <LiveMap
            farmers={trackingData?.stops?.filter((s) => s.stopType === 'PICKUP') || []}
            buyer={trackingData?.stops?.find((s) => s.stopType === 'DELIVERY') || { lat: 18.5089, lng: 73.9260, name: 'Hadapsar Hub' }}
            vehicle={trackingData?.currentLocation ? { ...trackingData.currentLocation, vehicleNumber: trackingData.vehicle?.vehicleNumber } : null}
            routeGeometry={trackingData?.route?.geometry}
            alternativeGeometry={trackingData?.route?.alternativeRoute?.geometry}
            activeRouteMode={routeMode}
            height="460px"
          />
        </div>

        {/* Stops Sequence (1 Col) */}
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
          </div>

          <div className="mt-4 pt-3 border-t text-xs text-secondary" style={{ borderColor: 'var(--color-border)' }}>
            <span className="font-medium text-gray-700">Driver Contact:</span>{' '}
            {trackingData?.vehicle?.driverPhone || '+91 98220 14012'}
          </div>
        </div>
      </div>
    </div>
  );
}
