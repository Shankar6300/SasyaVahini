import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Truck, Warehouse, Maximize2 } from 'lucide-react';

/**
 * SasyaVahini — Live Logistics Map Component
 *
 * Renders OpenStreetMap with Leaflet:
 * - Green numbered pins for farmer pickups (1, 2, 3...)
 * - Blue pin for Buyer Hub destination
 * - Purple pin for live Vehicle tracking
 * - Orange pin for FPO Consolidation Hub
 * - Road polyline connecting stops
 * - Graceful interactive SVG fallback when offline
 *
 * Owner: Member 4
 */
export default function LiveMap({
  farmers = [],
  buyer = null,
  vehicle = null,
  fpo = null,
  routeGeometry = null,
  alternativeGeometry = null,
  activeRouteMode = 'HIGHWAY',
  height = '420px',
  interactive = true,
}) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [useSvgFallback, setUseSvgFallback] = useState(false);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const coordinatesOf = (point) => ({
    lat: point?.lat ?? point?.latitude,
    lng: point?.lng ?? point?.longitude,
  });

  // Load Leaflet dynamically via CDN for 100% zero-config bundle compatibility
  useEffect(() => {
    let isMounted = true;

    const loadLeaflet = async () => {
      if (window.L) {
        if (isMounted) setMapLoaded(true);
        return;
      }

      try {
        // Link Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Script Leaflet JS
        if (!document.getElementById('leaflet-js')) {
          const script = document.createElement('script');
          script.id = 'leaflet-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => {
            if (isMounted) setMapLoaded(true);
          };
          script.onerror = () => {
            if (isMounted) {
              setMapLoadFailed(true);
              setUseSvgFallback(true);
            }
          };
          document.head.appendChild(script);
        }
      } catch (e) {
        if (isMounted) {
          setMapLoadFailed(true);
          setUseSvgFallback(true);
        }
      }
    };

    loadLeaflet();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize or update Leaflet map when data changes
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapContainerRef.current || useSvgFallback) return;

    const L = window.L;

    // Collect all coordinates to fit bounds
    const allPoints = [];
    const vehicleCoordinates = coordinatesOf(vehicle);
    if (vehicleCoordinates.lat && vehicleCoordinates.lng) {
      allPoints.push([vehicleCoordinates.lat, vehicleCoordinates.lng]);
    }
    farmers.forEach((f) => {
      const coordinates = coordinatesOf(f);
      if (coordinates.lat && coordinates.lng) allPoints.push([coordinates.lat, coordinates.lng]);
    });
    const buyerCoordinates = coordinatesOf(buyer);
    if (buyerCoordinates.lat && buyerCoordinates.lng) {
      allPoints.push([buyerCoordinates.lat, buyerCoordinates.lng]);
    }
    const fpoCoordinates = coordinatesOf(fpo);
    if (fpoCoordinates.lat && fpoCoordinates.lng) {
      allPoints.push([fpoCoordinates.lat, fpoCoordinates.lng]);
    }

    const defaultCenter = allPoints.length > 0 ? allPoints[0] : [18.7606, 73.8636];
    let resizeTimer;

    // Destroy existing instance if container re-rendered
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 10,
        scrollWheelZoom: interactive,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | SasyaVahini Logistics',
        maxZoom: 18,
      }).addTo(map);

      // Helper for custom HTML pins
      const createCustomIcon = (bgColor, textColor, label, isLarge = false) => {
        const size = isLarge ? 32 : 26;
        return L.divIcon({
          className: 'sv-map-pin',
          html: `<div style="
            background-color: ${bgColor};
            color: ${textColor};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: ${isLarge ? '14px' : '11px'};
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          ">${label}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      };

      // 1. Green Numbered Farmer Pins
      farmers.forEach((f, idx) => {
        const coordinates = coordinatesOf(f);
        if (!coordinates.lat || !coordinates.lng) return;
        const seqNumber = f.pickupSeq || idx + 1;
        const marker = L.marker([coordinates.lat, coordinates.lng], {
          icon: createCustomIcon('#07875B', '#ffffff', seqNumber),
        }).addTo(map);

        const tooltip = `
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #07875B;">Pickup Stop #${seqNumber}: ${f.name || 'Farmer'}</strong><br/>
            📍 Location: ${f.village || ''} ${f.district || ''}<br/>
            📦 Quantity: <b>${f.qtyKg || 0} kg</b><br/>
            💰 Price: ₹${f.pricePerKg || 0}/kg | Grade: <b>${f.grade || 'A'}</b><br/>
            ⭐ Match Score: ${f.matchScore ? f.matchScore + '%' : 'Optimal'}
          </div>
        `;
        marker.bindPopup(tooltip);
      });

      // 2. Blue Buyer Pin
      if (buyerCoordinates.lat && buyerCoordinates.lng) {
        const marker = L.marker([buyerCoordinates.lat, buyerCoordinates.lng], {
          icon: createCustomIcon('#2563EB', '#ffffff', '🏬', true),
        }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong style="color: #2563EB;">Delivery Destination (Buyer)</strong><br/>
            🏢 ${buyer.name || 'Consignee Hub'}<br/>
            📍 ${buyer.address || 'Pune Market Yard'}
          </div>
        `);
      }

      // 3. Purple Live Vehicle Pin
      if (vehicleCoordinates.lat && vehicleCoordinates.lng) {
        const marker = L.marker([vehicleCoordinates.lat, vehicleCoordinates.lng], {
          icon: createCustomIcon('#7C3AED', '#ffffff', '🚚', true),
        }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong style="color: #7C3AED;">Fleet Vehicle ${vehicle.vehicleNumber || ''}</strong><br/>
            👤 Driver: ${vehicle.driverName || 'Shivaji Mane'}<br/>
            ⚡ Speed: ${vehicle.speedKmh || 0} km/h<br/>
            🌡️ Cold-Chain: 14.2°C (Optimal)
          </div>
        `);
      }

      // 4. Orange FPO Hub Pin
      if (fpoCoordinates.lat && fpoCoordinates.lng) {
        const marker = L.marker([fpoCoordinates.lat, fpoCoordinates.lng], {
          icon: createCustomIcon('#D97706', '#ffffff', '🤝', true),
        }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong style="color: #D97706;">FPO Aggregation Hub</strong><br/>
            ${fpo.name || 'Pune Sahakari Krishi FPO'}
          </div>
        `);
      }

      // 5. Route Polylines (Primary Solid & Alternative Dashed)
      if (alternativeGeometry?.coordinates && alternativeGeometry.coordinates.length > 1) {
        const altLatLngs = alternativeGeometry.coordinates.map((c) => [c[1], c[0]]);
        const isAltActive = activeRouteMode === 'RURAL';
        L.polyline(altLatLngs, {
          color: isAltActive ? '#2563EB' : '#94A3B8',
          weight: isAltActive ? 5 : 3,
          opacity: isAltActive ? 0.9 : 0.45,
          dashArray: '6, 8',
        }).addTo(map);
      }
      if (routeGeometry?.coordinates && routeGeometry.coordinates.length > 1) {
        const latLngs = routeGeometry.coordinates.map((c) => [c[1], c[0]]);
        L.polyline(latLngs, {
          color: '#07875B',
          weight: 4,
          opacity: 0.85,
          dashArray: activeRouteMode === 'RURAL' ? '4, 6' : undefined,
        }).addTo(map);
      } else if (allPoints.length > 1) {
        // Fallback straight lines connecting stops in order
        L.polyline(allPoints, {
          color: '#07875B',
          weight: 3,
          opacity: 0.7,
        }).addTo(map);
      }

      // Fit map bounds to show all markers
      if (allPoints.length > 1) {
        map.fitBounds(allPoints, { padding: [40, 40] });
      }

      leafletMapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
      resizeTimer = window.setTimeout(() => map.invalidateSize(), 250);
    } catch (e) {
      setUseSvgFallback(true);
    }

    return () => {
      window.clearTimeout(resizeTimer);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapLoaded, farmers, buyer, vehicle, fpo, routeGeometry, useSvgFallback, interactive]);

  // Fallback interactive SVG canvas when network is offline
  if (useSvgFallback || mapLoadFailed) {
    return (
      <div
        className="rounded-lg border relative overflow-hidden bg-slate-900 text-white p-4 flex flex-col justify-between"
        style={{ height, borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <Navigation size={14} /> Pune Agricultural Corridor (Offline Vector View)
          </span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">OSM Fallback</span>
        </div>

        {/* Visual schematic representation */}
        <div className="my-auto flex flex-col gap-3">
          <div className="flex items-center justify-between px-6">
            {farmers.map((f, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center font-bold text-xs shadow-md">
                  {f.pickupSeq || i + 1}
                </div>
                <span className="text-[11px] text-slate-200 mt-1 font-medium">{f.name || f.village}</span>
                <span className="text-[10px] text-emerald-400 font-bold">{f.qtyKg} kg</span>
              </div>
            ))}
            {buyer && (
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center font-bold text-xs shadow-md">
                  🏬
                </div>
                <span className="text-[11px] text-slate-200 mt-1 font-medium">{buyer.name || 'Buyer'}</span>
                <span className="text-[10px] text-blue-400 font-bold">Consignee</span>
              </div>
            )}
          </div>
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-purple-500 to-blue-500 rounded-full mx-6 opacity-75" />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span className="flex items-center gap-1">🟢 Farmers: {farmers.length} stops</span>
          <span className="flex items-center gap-1">🟣 Fleet: {vehicle?.vehicleNumber || 'MH-12-QX-4012'}</span>
          <span className="flex items-center gap-1">🔵 Buyer: {buyer?.name || 'Hadapsar'}</span>
        </div>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div
        className="rounded-lg border bg-slate-900 text-white p-4 flex items-center justify-center"
        style={{ height, borderColor: 'var(--color-border)' }}
      >
        <div className="text-center">
          <Navigation size={24} className="mx-auto mb-2 text-emerald-400" />
          <p className="font-semibold">Loading live route map...</p>
          <p className="text-xs text-slate-300 mt-1">
            {farmers.length} pickup stops · {vehicle?.vehicleNumber || 'Fleet vehicle'} · Hadapsar delivery
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border shadow-sm" style={{ height, borderColor: 'var(--color-border)' }}>
      {/* Map Legend Overlay */}
      <div
        className="absolute top-2 right-2 z-[1000] bg-white/95 backdrop-blur px-2.5 py-1.5 rounded-md border text-xs shadow-sm flex items-center gap-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="flex items-center gap-1 font-medium text-gray-700">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Farmers (Pickups)
        </span>
        <span className="flex items-center gap-1 font-medium text-gray-700">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Buyer Hub
        </span>
        <span className="flex items-center gap-1 font-medium text-gray-700">
          <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" /> Live Vehicle
        </span>
      </div>

      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
