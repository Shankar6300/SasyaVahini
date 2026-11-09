/**
 * SasyaVahini — Routing & Route Optimization Service
 *
 * Provides:
 * 1. HTTP integration with Python OR-Tools CVRP microservice (with 5 s timeout)
 * 2. Pure-Node Nearest-Neighbor + 2-Opt fallback (works standalone without Python)
 * 3. OSRM road geometry & distance matrix caching with Haversine x 1.3 fallback
 * 4. Exported pure function `computeRoute(stops, vehicles)` for Member 5
 *
 * Uses native fetch (Node 18+) with zero external dependencies.
 *
 * Owner: Member 4
 */

const config = require('../config/logistics.config');
const { haversineKm, estimatedRoadKm } = require('../utils/geo');
const logger = require('../utils/logger');

// In-memory route & distance cache
const osrmCache = new Map();

class RoutingService {
  /**
   * Pure function for routing computation — exported for Member 5 ML optimal-route integration
   * @param {Array} stops - Array of { id, lat, lng, qtyKg, name }
   * @param {Array|Object} vehicles - Vehicle or array of vehicles
   * @param {Object} [buyerNode] - Destination { lat, lng, address }
   */
  async computeRoute(stops, vehicles, buyerNode = null) {
    const vehicleList = Array.isArray(vehicles) ? vehicles : [vehicles];
    const buyer = buyerNode || {
      lat: 18.5089,
      lng: 73.9260,
      name: 'Buyer Central Hub (Hadapsar)',
    };

    // Try Python OR-Tools microservice first
    try {
      const optimized = await this.callOrToolsMicroservice(stops, vehicleList, buyer);
      if (optimized && optimized.routes && optimized.routes.length > 0) {
        logger.info('Route successfully optimized via Python OR-Tools CVRP service');
        return optimized;
      }
    } catch (err) {
      logger.warn('Python OR-Tools routing service unavailable, using Node 2-opt fallback', {
        reason: err.message,
      });
    }

    // Node 2-opt nearest-neighbor fallback
    return this.solveVrpNodeFallback(stops, vehicleList, buyer);
  }

  /**
   * Calls the Python FastAPI + OR-Tools microservice using native fetch
   */
  async callOrToolsMicroservice(stops, vehicles, buyer) {
    const payload = {
      depots: vehicles.map((v) => ({
        id: v.id || v.vehicleNumber,
        lat: v.currentLatitude || 18.7606,
        lng: v.currentLongitude || 73.8636,
      })),
      pickups: stops.map((s, idx) => ({
        id: s.id || s.farmerId || `stop_${idx}`,
        name: s.name || `Pickup ${idx + 1}`,
        lat: s.lat || s.latitude,
        lng: s.lng || s.longitude,
        demandKg: s.qtyKg || s.quantityKg || 0,
      })),
      buyer: {
        id: 'buyer_node',
        lat: buyer.lat || buyer.latitude,
        lng: buyer.lng || buyer.longitude,
        name: buyer.name || buyer.address || 'Buyer Destination',
      },
      vehicles: vehicles.map((v) => ({
        id: v.id || v.vehicleNumber,
        capacityKg: v.capacityKg || 3000,
      })),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.routing.timeoutMs);

    try {
      const res = await fetch(`${config.routing.serviceUrl}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const json = await res.json();
      if (json && json.success) {
        return json.data;
      }
    } finally {
      clearTimeout(timer);
    }

    throw new Error('Microservice returned unsuccessful response');
  }

  /**
   * Pure Node.js Nearest-Neighbor with 2-Opt refinement fallback.
   * Runs locally with zero dependencies.
   */
  async solveVrpNodeFallback(stops, vehicles, buyer) {
    if (!stops || stops.length === 0) {
      return {
        routes: [],
        totalKm: 0,
        baselineKm: 0,
        savedKm: 0,
        fuelSavedRs: 0,
        geometry: { type: 'LineString', coordinates: [] },
      };
    }

    const assignedVehicle = vehicles[0] || {
      vehicleNumber: 'MH-12-QX-4012',
      capacityKg: 3000,
      currentLatitude: 18.7606,
      currentLongitude: 73.8636,
    };

    const buyerLat = buyer.lat || buyer.latitude;
    const buyerLng = buyer.lng || buyer.longitude;

    // 1. Build initial route via Nearest Neighbor starting from vehicle depot
    let currentLat = assignedVehicle.currentLatitude || stops[0].lat;
    let currentLng = assignedVehicle.currentLongitude || stops[0].lng;

    const remainingStops = [...stops];
    const orderedPickups = [];

    while (remainingStops.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remainingStops.length; i++) {
        const s = remainingStops[i];
        const sLat = s.lat || s.latitude;
        const sLng = s.lng || s.longitude;
        const d = haversineKm(currentLat, currentLng, sLat, sLng);
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = i;
        }
      }

      const nextStop = remainingStops.splice(nearestIdx, 1)[0];
      orderedPickups.push(nextStop);
      currentLat = nextStop.lat || nextStop.latitude;
      currentLng = nextStop.lng || nextStop.longitude;
    }

    // 2. Apply 2-Opt local search improvement if >= 3 stops
    const optimizedSequence = this.twoOpt(orderedPickups, buyerLat, buyerLng);

    // 3. Fetch real road geometry (from OSRM or fallback interpolator)
    const waypoints = [
      { lat: assignedVehicle.currentLatitude || optimizedSequence[0].lat, lng: assignedVehicle.currentLongitude || optimizedSequence[0].lng },
      ...optimizedSequence.map((s) => ({ lat: s.lat || s.latitude, lng: s.lng || s.longitude })),
      { lat: buyerLat, lng: buyerLng },
    ];

    const { distanceKm, geometry } = await this.getRoadGeometry(waypoints);

    // 4. Calculate baseline direct trips
    const baselineKm = Math.round(
      optimizedSequence.reduce((sum, s) => {
        const sLat = s.lat || s.latitude;
        const sLng = s.lng || s.longitude;
        return sum + 2 * estimatedRoadKm(sLat, sLng, buyerLat, buyerLng);
      }, 0) * 10,
    ) / 10;

    const savedKm = Math.max(0, Math.round((baselineKm - distanceKm) * 10) / 10);
    const fuelSavedRs = Math.round(savedKm * config.costing.estimatedFuelCostPerKm * 100) / 100;
    const totalLoadKg = optimizedSequence.reduce((sum, s) => sum + (s.qtyKg || s.demandKg || 0), 0);
    const utilizationPercent = Math.min(
      100,
      Math.round((totalLoadKg / (assignedVehicle.capacityKg || 3000)) * 1000) / 10,
    );

    return {
      routes: [
        {
          vehicleId: assignedVehicle.id || assignedVehicle.vehicleNumber,
          vehicleNumber: assignedVehicle.vehicleNumber,
          stops: optimizedSequence.map((s, idx) => ({
            sequence: idx + 1,
            farmerId: s.farmerId || s.id,
            name: s.name,
            qtyKg: s.qtyKg || s.demandKg || 0,
            lat: s.lat || s.latitude,
            lng: s.lng || s.longitude,
          })),
          destination: { lat: buyerLat, lng: buyerLng, address: buyer.name || buyer.address },
          distanceKm,
          loadKg: totalLoadKg,
          geometry,
        },
      ],
      totalKm: distanceKm,
      baselineKm,
      savedKm,
      fuelSavedRs,
      utilizationPercent,
      geometry,
      solver: 'NODE_2OPT_FALLBACK',
    };
  }

  /**
   * 2-Opt local search improvement for pickup stops
   */
  twoOpt(stops, buyerLat, buyerLng) {
    if (stops.length <= 2) return stops;

    let best = [...stops];
    let improved = true;

    const routeDistance = (seq) => {
      let d = 0;
      for (let i = 0; i < seq.length - 1; i++) {
        d += haversineKm(seq[i].lat, seq[i].lng, seq[i + 1].lat, seq[i + 1].lng);
      }
      d += haversineKm(seq[seq.length - 1].lat, seq[seq.length - 1].lng, buyerLat, buyerLng);
      return d;
    };

    let bestDist = routeDistance(best);

    while (improved) {
      improved = false;
      for (let i = 0; i < best.length - 1; i++) {
        for (let k = i + 1; k < best.length; k++) {
          const newRoute = [
            ...best.slice(0, i),
            ...best.slice(i, k + 1).reverse(),
            ...best.slice(k + 1),
          ];
          const newDist = routeDistance(newRoute);
          if (newDist < bestDist - 0.01) {
            best = newRoute;
            bestDist = newDist;
            improved = true;
          }
        }
      }
    }

    return best;
  }

  /**
   * Fetch real road geometry from OSRM table / route API with in-memory caching
   */
  async getRoadGeometry(waypoints) {
    if (!waypoints || waypoints.length < 2) {
      return { distanceKm: 0, geometry: { type: 'LineString', coordinates: [] } };
    }

    const cacheKey = waypoints.map((w) => `${w.lng.toFixed(4)},${w.lat.toFixed(4)}`).join(';');

    if (osrmCache.has(cacheKey)) {
      return osrmCache.get(cacheKey);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
      const coordString = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
      const url = `${config.routing.osrmUrl}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();

      if (data && data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const result = {
          distanceKm,
          geometry: route.geometry,
        };
        osrmCache.set(cacheKey, result);
        return result;
      }
    } catch (err) {
      logger.warn('OSRM route fetch failed or timed out, generating road fallback geometry', {
        error: err.message,
      });
    } finally {
      clearTimeout(timer);
    }

    // Fallback: Compute estimated road distance and interpolated curved road geometry
    let totalKm = 0;
    const coordinates = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const legKm = estimatedRoadKm(p1.lat, p1.lng, p2.lat, p2.lng);
      totalKm += legKm;

      // Add points with minor curvature to simulate real road shape on map
      coordinates.push([p1.lng, p1.lat]);
      const midLat = (p1.lat + p2.lat) / 2 + 0.004;
      const midLng = (p1.lng + p2.lng) / 2 - 0.003;
      coordinates.push([midLng, midLat]);
    }
    const last = waypoints[waypoints.length - 1];
    coordinates.push([last.lng, last.lat]);

    const fallbackResult = {
      distanceKm: Math.round(totalKm * 10) / 10,
      geometry: {
        type: 'LineString',
        coordinates,
      },
    };

    osrmCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }
}

const service = new RoutingService();

module.exports = service;
module.exports.computeRoute = service.computeRoute.bind(service);
