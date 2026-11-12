import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { MapPin, Navigation, Search, Check, AlertCircle, Shield, RefreshCw } from 'lucide-react';

// Default center: Pune/Maharashtra agricultural cluster
const DEFAULT_LAT = 18.5204;
const DEFAULT_LNG = 73.8567;

// Custom Leaflet Pin Icon using inline SVG data URI to avoid broken asset paths in bundler
const createCustomIcon = (color = '#07875B') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="${color}" stroke="#ffffff" stroke-width="2">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: 'custom-map-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

export default function FarmLocationPicker({
  initialLat = null,
  initialLng = null,
  initialAddress = '',
  initialVillage = '',
  initialDistrict = '',
  initialState = '',
  initialPincode = '',
  onLocationSelect,
  className = ''
}) {
  const { t } = useTranslation();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [lat, setLat] = useState(initialLat || DEFAULT_LAT);
  const [lng, setLng] = useState(initialLng || DEFAULT_LNG);
  const [address, setAddress] = useState(initialAddress);
  const [village, setVillage] = useState(initialVillage);
  const [district, setDistrict] = useState(initialDistrict);
  const [stateName, setStateName] = useState(initialState);
  const [pincode, setPincode] = useState(initialPincode);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: 'center'
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        icon: createCustomIcon(),
        draggable: true,
        autoPan: true
      }).addTo(map);

      // Handle marker drag end
      marker.on('dragend', (e) => {
        const position = e.target.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
        setHasConfirmed(false);
        reverseGeocode(position.lat, position.lng);
      });

      // Handle map click
      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        setLat(clickLat);
        setLng(clickLng);
        setHasConfirmed(false);
        reverseGeocode(clickLat, clickLng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate size on load to ensure tiles render completely
      setTimeout(() => map.invalidateSize(), 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update marker position and pan map when lat/lng state changes externally
  const updateMapMarker = (newLat, newLng, zoom = 14) => {
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      mapInstanceRef.current.setView([newLat, newLng], zoom, { animate: true });
    }
  };

  // Reverse Geocode using OpenStreetMap Nominatim
  const reverseGeocode = async (targetLat, targetLng) => {
    setReverseGeocoding(true);
    setGeoError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const detectedVillage = addr.village || addr.suburb || addr.hamlet || addr.town || addr.city_district || '';
          const detectedDistrict = addr.state_district || addr.county || addr.district || addr.city || '';
          const detectedState = addr.state || '';
          const detectedPostcode = addr.postcode || '';
          const displayName = data.display_name || `${detectedVillage}, ${detectedDistrict}`;

          setAddress(displayName);
          if (detectedVillage) setVillage(detectedVillage);
          if (detectedDistrict) setDistrict(detectedDistrict);
          if (detectedState) setStateName(detectedState);
          if (detectedPostcode) setPincode(detectedPostcode);
        }
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    } finally {
      setReverseGeocoding(false);
    }
  };

  // Forward Search using OpenStreetMap Nominatim
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setGeoError(null);
    try {
      const query = encodeURIComponent(`${searchQuery}, India`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=in&limit=1&addressdetails=1`);
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const item = results[0];
          const newLat = parseFloat(item.lat);
          const newLng = parseFloat(item.lon);
          setLat(newLat);
          setLng(newLng);
          setAddress(item.display_name);

          const addr = item.address || {};
          setVillage(addr.village || addr.suburb || addr.town || addr.city || '');
          setDistrict(addr.state_district || addr.county || addr.district || '');
          setStateName(addr.state || '');
          setPincode(addr.postcode || '');

          updateMapMarker(newLat, newLng, 15);
          setHasConfirmed(false);
        } else {
          setGeoError(t('location.noSearchResults', 'Location not found. Try searching by PIN code or nearest town.'));
        }
      }
    } catch (err) {
      setGeoError(t('location.searchFailed', 'Failed to search location. Check your internet connection.'));
    } finally {
      setIsSearching(false);
    }
  };

  // GPS Geolocation
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGeoError(t('location.gpsNotSupported', 'GPS Geolocation is not supported by your browser.'));
      return;
    }

    setIsGeolocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        updateMapMarker(latitude, longitude, 16);
        reverseGeocode(latitude, longitude);
        setIsGeolocating(false);
        setHasConfirmed(false);
      },
      (err) => {
        setIsGeolocating(false);
        if (err.code === 1) {
          setGeoError(t('location.gpsPermissionDenied', 'Location permission was denied. Please allow location access or search by village.'));
        } else {
          setGeoError(t('location.gpsUnavailable', 'Unable to retrieve your current location. Please use the search bar or drop a map pin.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Confirm Location to parent component
  const handleConfirmLocation = () => {
    setHasConfirmed(true);
    if (onLocationSelect) {
      onLocationSelect({
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        pickupAddress: address || `${village || 'Farm'}, ${district || 'Pune'}`,
        village: village || 'Manchar',
        district: district || 'Pune',
        state: stateName || 'Maharashtra',
        pincode: pincode || '',
        locationAccuracy: 'GPS_PIN'
      });
    }
  };

  return (
    <div className={`space-y-3 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm ${className}`}>
      
      {/* Header & GPS Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
            {t('location.farmPickupPin', 'Farm Pickup Location & Map Pin')}
          </h4>
          <p className="text-[11px] text-slate-500">
            {t('location.dropPinHint', 'Search your village or click on the map to pin your exact farm gate for pickup vehicles.')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleUseGps}
          disabled={isGeolocating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto cursor-pointer"
        >
          {isGeolocating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{t('location.locatingGps', 'Getting GPS...')}</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('location.useGpsBtn', 'Use My GPS Location')}</span>
            </>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('location.searchPlaceholder', 'Search village, town, taluka or 6-digit PIN code...')}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-semibold focus:bg-white focus:border-emerald-600 outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <button
          type="submit"
          disabled={isSearching || !searchQuery.trim()}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          {isSearching ? t('common.loading', 'Searching...') : t('common.search', 'Search')}
        </button>
      </form>

      {/* Error Banner */}
      {geoError && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Interactive Leaflet Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-56 sm:h-64 z-10" />

        {/* Loading Overlay when Reverse Geocoding */}
        {reverseGeocoding && (
          <div className="absolute top-2 right-2 z-20 px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-md">
            <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
            <span>{t('location.resolvingAddress', 'Resolving address...')}</span>
          </div>
        )}
      </div>

      {/* Selected Coordinates & Address Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block">{t('location.latitude', 'Latitude')}</span>
            <span className="font-extrabold text-slate-800 font-mono text-xs">{lat.toFixed(6)}° N</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block">{t('location.longitude', 'Longitude')}</span>
            <span className="font-extrabold text-slate-800 font-mono text-xs">{lng.toFixed(6)}° E</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block">{t('location.village', 'Village / Area')}</span>
            <span className="font-extrabold text-slate-800 truncate block text-xs">{village || t('common.notSpecified', 'Not specified')}</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block">{t('location.district', 'District / PIN')}</span>
            <span className="font-extrabold text-slate-800 truncate block text-xs">{district} {pincode ? `(${pincode})` : ''}</span>
          </div>
        </div>

        {address && (
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">{t('location.fullPickupAddress', 'Resolved Pickup Address')}</span>
            <p className="text-slate-800 font-medium text-xs leading-relaxed mt-0.5">{address}</p>
          </div>
        )}

        {/* Tiered Privacy Guarantee Banner */}
        <div className="flex items-start gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-950">
          <Shield className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>{t('location.privacyGuaranteeTitle', 'Location Privacy Guarantee:')}</strong>{' '}
            {t('location.privacyGuaranteeText', 'Your exact GPS coordinates and farm gate pin are kept private. They are shared ONLY with verified buyers and assigned logistics drivers after you formally accept a proposal. The public marketplace only sees your village and district.')}
          </p>
        </div>

        {/* Confirm Location Pin Button */}
        <button
          type="button"
          onClick={handleConfirmLocation}
          className={`w-full py-2.5 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            hasConfirmed
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-700 hover:bg-emerald-800 text-white'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>{hasConfirmed ? t('location.pinConfirmed', 'Farm Location Pinned & Confirmed ✓') : t('location.confirmPinBtn', 'Confirm This Farm Pickup Location')}</span>
        </button>
      </div>

    </div>
  );
}

