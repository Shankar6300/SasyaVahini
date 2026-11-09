import React, { useEffect, useMemo, useState } from 'react';
import { LocateFixed, Radio, UserRound } from 'lucide-react';

const DEFAULT_RADIUS_KM = 25;

const distanceKm = (from, to) => {
  const lat1 = Number(from?.latitude);
  const lng1 = Number(from?.longitude);
  const lat2 = Number(to?.latitude);
  const lng2 = Number(to?.longitude);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getDeliveryStop = (shipment) =>
  shipment?.stops?.find((stop) => stop.stopType === 'DELIVERY') || null;

export default function NearbyBuyerRadar({ vehicles = [], shipments = [], onLocationUpdate }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || '');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    if (!selectedVehicleId && vehicles[0]?.id) setSelectedVehicleId(vehicles[0].id);
  }, [selectedVehicleId, vehicles]);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || vehicles[0];
  const buyers = useMemo(() => shipments
    .map((shipment) => {
      const stop = getDeliveryStop(shipment);
      if (!stop) return null;
      const buyerLocation = { latitude: stop.latitude, longitude: stop.longitude };
      const vehicleLocation = location || (selectedVehicle && {
        latitude: selectedVehicle.currentLatitude,
        longitude: selectedVehicle.currentLongitude,
      });
      const distance = distanceKm(vehicleLocation, buyerLocation);
      return {
        id: `${shipment.id}-${stop.id}`,
        name: stop.stopName || shipment.buyerName || 'Assigned buyer',
        address: stop.address || shipment.deliveryAddress || 'Delivery destination',
        distance,
        shipment,
        isAssigned: shipment.vehicleId === selectedVehicle?.id,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE)), [location, selectedVehicle, shipments]);

  const nearbyBuyers = buyers.filter((buyer) => buyer.distance !== null && buyer.distance <= DEFAULT_RADIUS_KM);
  const assignedBuyer = buyers.find((buyer) => buyer.isAssigned);

  useEffect(() => {
    if (!isWatching || !navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speedKmh: position.coords.speed ? position.coords.speed * 3.6 : 0,
          recordedAt: new Date().toISOString(),
        };
        setLocation(nextLocation);
        setLocationError('');
        if (selectedVehicle?.id) onLocationUpdate?.(selectedVehicle.id, nextLocation);
      },
      (error) => {
        setLocationError(error.message || 'Unable to read GPS location.');
        setIsWatching(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isWatching, onLocationUpdate, selectedVehicle]);

  const toggleTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('GPS is not supported by this browser.');
      return;
    }
    setLocationError('');
    setIsWatching((watching) => !watching);
  };

  return (
    <div className="card p-4 rounded-xl bg-white border" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
            <Radio size={17} className="text-rose-600" />
            Nearby Buyer Radar
          </h3>
          <p className="text-xs text-secondary mt-1">
            GPS scan within {DEFAULT_RADIUS_KM} km of the selected vehicle
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={toggleTracking}>
          <LocateFixed size={14} />
          {isWatching ? 'Stop GPS' : 'Use GPS'}
        </button>
      </div>

      <select
        className="form-input text-xs mb-3"
        value={selectedVehicle?.id || ''}
        onChange={(event) => setSelectedVehicleId(event.target.value)}
        aria-label="Vehicle for buyer radar"
      >
        {vehicles.length === 0 && <option value="">No vehicles available</option>}
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.vehicleNumber} — {vehicle.status || 'AVAILABLE'}
          </option>
        ))}
      </select>

      {locationError && <p className="text-xs text-red-600 mb-2">{locationError}</p>}
      {assignedBuyer && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 mb-3">
          <p className="text-[11px] uppercase tracking-wide text-blue-700 font-bold">Assigned buyer</p>
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mt-1">
            <UserRound size={14} /> {assignedBuyer.name}
          </p>
          <p className="text-xs text-secondary mt-1">
            {assignedBuyer.distance === null ? 'Distance unavailable' : `${assignedBuyer.distance.toFixed(1)} km from vehicle`}
          </p>
        </div>
      )}

      {nearbyBuyers.length === 0 ? (
        <p className="text-xs text-secondary">No buyer destination detected in the radar radius.</p>
      ) : (
        <div className="space-y-2">
          {nearbyBuyers.map((buyer) => (
            <div key={buyer.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{buyer.name}</p>
                <p className="text-[11px] text-secondary truncate">{buyer.address}</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">
                {buyer.distance.toFixed(1)} km
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
