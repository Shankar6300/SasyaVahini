/**
 * SasyaVahini — Logistics API Client
 * Wraps all logistics endpoints using the shared authenticated axios instance.
 *
 * Owner: Member 4
 */

import api from './api';
import { isPreviewSession } from './auth.storage';

const PREVIEW_VEHICLES = [
  ['MH-12-QX-4012', 'Mini-Truck', 2500, 'Shivaji Mane', 'Chakan Hub', 18.7606, 73.8636],
  ['MH-12-VT-8819', 'Mini-Truck', 3500, 'Deepak Shinde', 'Narayangaon Hub', 19.1170, 73.9780],
  ['MH-14-GH-1290', 'Tempo', 1500, 'Amol Borade', 'Hadapsar Hub', 18.5089, 73.9260],
  ['MH-12-RT-6712', 'Truck', 5000, 'Sunil Jadhav', 'Manchar Hub', 18.9880, 73.9400],
  ['MH-12-PL-3310', 'Tempo', 2000, 'Ganesh Shelke', 'Junnar Hub', 19.2064, 73.8765],
].map(([vehicleNumber, vehicleType, capacityKg, driverName, hubName, currentLatitude, currentLongitude], index) => ({
  id: `veh_preview_${index + 1}`,
  vehicleNumber,
  vehicleType,
  capacityKg,
  driverName,
  hubName,
  currentLatitude,
  currentLongitude,
  status: index === 0 ? 'IN_TRANSIT' : 'AVAILABLE',
}));

const PREVIEW_SHIPMENT = {
  id: 'shp_demo_101',
  trackingNumber: 'SV-SHP-2026-0001',
  orderId: 'ord_demo_101',
  vehicleId: 'veh_preview_1',
  vehicleNumber: 'MH-12-QX-4012',
  driverName: 'Shivaji Mane',
  driverPhone: '+919822014012',
  status: 'TRANSIT',
  totalWeightKg: 2500,
  totalDistanceKm: 78.5,
  baselineDistanceKm: 142,
  savedDistanceKm: 63.5,
  estimatedFuelSavedRs: 1508.13,
  utilizationPercent: 83.3,
  estimatedMinutes: 110,
  currentLocation: { latitude: 18.7230, longitude: 73.8910, speedKmh: 44, lastPingAt: new Date().toISOString() },
  routeGeometry: {
    type: 'LineString',
    coordinates: [
      [73.9400, 18.9880],
      [73.9100, 18.8470],
      [73.8636, 18.7606],
      [73.9260, 18.5089],
    ],
  },
  coldChain: { currentTempC: 13.8, status: 'OPTIMAL', minTempC: 10, maxTempC: 16 },
  stops: [
    { id: 'stop_1', sequence: 1, stopName: 'Farmer Ramesh Kulkarni (Manchar)', latitude: 18.9880, longitude: 73.9400, quantityKg: 1500, pricePerKg: 22, grade: 'GRADE_A', status: 'COMPLETED', stopType: 'PICKUP' },
    { id: 'stop_2', sequence: 2, stopName: 'Farmer Suresh Bhor (Khed)', latitude: 18.8470, longitude: 73.9100, quantityKg: 1000, pricePerKg: 23.5, grade: 'GRADE_A', status: 'COMPLETED', stopType: 'PICKUP' },
    { id: 'stop_3', sequence: 3, stopName: 'FreshBasket Destination (Hadapsar)', latitude: 18.5089, longitude: 73.9260, quantityKg: 2500, status: 'PENDING', stopType: 'DELIVERY' },
  ],
};

const previewPlan = {
  planId: 'plan_preview_001',
  label: 'BEST VALUE',
  totalCost: 63200,
  requestedQtyKg: 2500,
  farmers: PREVIEW_SHIPMENT.stops.slice(0, 2).map((stop) => ({
    farmerId: stop.id,
    farmerName: stop.stopName,
    qtyKg: stop.quantityKg,
    pricePerKg: stop.pricePerKg,
    grade: stop.grade,
  })),
  costBreakdown: {
    productCost: 56500,
    transportCost: 2840,
    handlingCost: 1250,
    platformFee: 1130,
    aggregationFee: 350,
    riskCost: 1130,
    gst: 0,
  },
};

const previewSavings = {
  totalShipments: 1,
  baselineKm: 142,
  optimizedKm: 78.5,
  savedKm: 63.5,
  fuelSavedRs: 1508.13,
  utilizationPercent: 83.3,
  avgVehicleUtilizationPercent: 83.3,
  fleetSummary: { totalVehicles: 5, availableVehicles: 4, activeOnRoute: 1 },
};

const previewCall = (value) => isPreviewSession() ? Promise.resolve(value) : null;

export const logisticsApi = {
  // Available shipments for dispatch/acceptance
  getAvailableShipments: async () => {
    const res = await api.get('/logistics/available-shipments');
    return res.data.data;
  },

  // Accept shipment and assign vehicle
  acceptShipment: async (shipmentId, { vehicleId, driverNotes }) => {
    const res = await api.post(`/logistics/shipments/${shipmentId}/accept`, {
      vehicleId,
      driverNotes,
    });
    return res.data.data;
  },

  // Post milestone update (ASSIGNED -> PICKUP -> TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED)
  updateMilestone: async (shipmentId, milestonePayload) => {
    const res = await api.post(`/logistics/shipments/${shipmentId}/milestones`, milestonePayload);
    return res.data.data;
  },

  // Fetch real-time tracking, live coordinates, and cold-chain temperature
  getShipmentTracking: async (shipmentId) => {
    const preview = previewCall(shipmentId === PREVIEW_SHIPMENT.id ? {
      shipmentId: PREVIEW_SHIPMENT.id,
      trackingNumber: PREVIEW_SHIPMENT.trackingNumber,
      orderId: PREVIEW_SHIPMENT.orderId,
      status: PREVIEW_SHIPMENT.status,
      vehicle: {
        vehicleNumber: PREVIEW_SHIPMENT.vehicleNumber,
        driverName: PREVIEW_SHIPMENT.driverName,
        driverPhone: PREVIEW_SHIPMENT.driverPhone,
      },
      currentLocation: PREVIEW_SHIPMENT.currentLocation,
      coldChain: PREVIEW_SHIPMENT.coldChain,
      route: {
        totalDistanceKm: PREVIEW_SHIPMENT.totalDistanceKm,
        remainingDistanceKm: 41.2,
        etaMinutes: PREVIEW_SHIPMENT.estimatedMinutes,
        geometry: {
          type: 'LineString',
          coordinates: [
            [73.9400, 18.9880],
            [73.9100, 18.8470],
            [73.8636, 18.7606],
            [73.9260, 18.5089],
          ],
        },
      },
      stops: PREVIEW_SHIPMENT.stops,
      milestonesHistory: [
        { status: 'ASSIGNED', recordedAt: new Date(Date.now() - 3600000).toISOString(), notes: 'Assigned to Shivaji Mane' },
        { status: 'PICKUP', recordedAt: new Date(Date.now() - 1800000).toISOString(), notes: 'Loaded at Manchar and Khed' },
        { status: 'TRANSIT', recordedAt: new Date(Date.now() - 600000).toISOString(), notes: 'En route to Hadapsar' },
      ],
    } : null);
    if (preview) return preview;
    const res = await api.get(`/logistics/shipments/${shipmentId}/tracking`);
    return res.data.data;
  },

  // Sourcing & Logistics optimization planning
  planOrder: async (planRequest) => {
    const preview = previewCall({
      crop: planRequest.crop || 'Tomato',
      requestedQtyKg: planRequest.qtyKg || 2500,
      plans: [previewPlan],
    });
    if (preview) return preview;
    const res = await api.post('/logistics/plan', planRequest);
    return res.data.data;
  },

  // Create shipment from confirmed order
  createShipment: async (orderId, planData = null) => {
    const res = await api.post('/logistics/shipments', { orderId, planData });
    return res.data.data;
  },

  // Paginated list of shipments
  getShipments: async (params = {}) => {
    const preview = previewCall({ shipments: [PREVIEW_SHIPMENT], meta: { total: 1, page: 1, limit: params.limit || 10 } });
    if (preview) return preview;
    const res = await api.get('/logistics/shipments', { params });
    return {
      shipments: res.data.data,
      meta: res.data.meta,
    };
  },

  // Single shipment detail
  getShipmentById: async (shipmentId) => {
    const preview = previewCall(shipmentId === PREVIEW_SHIPMENT.id ? PREVIEW_SHIPMENT : null);
    if (preview) return preview;
    const res = await api.get(`/logistics/shipments/${shipmentId}`);
    return res.data.data;
  },

  // List fleet vehicles
  getVehicles: async (params = {}) => {
    const preview = previewCall(PREVIEW_VEHICLES);
    if (preview) return preview;
    const res = await api.get('/logistics/vehicles', { params });
    return res.data.data;
  },

  // Driver GPS ping telemetry
  updateVehicleLocation: async (vehicleId, locationPayload) => {
    const res = await api.post(`/logistics/vehicles/${vehicleId}/location`, locationPayload);
    return res.data.data;
  },

  // Map visualization coordinates and route geometry for an order
  getOrderMap: async (orderId) => {
    const res = await api.get(`/logistics/map/${orderId}`);
    return res.data.data;
  },

  // CVRP Optimization Impact analytics
  getSavingsAnalytics: async () => {
    const preview = previewCall(previewSavings);
    if (preview) return preview;
    const res = await api.get('/logistics/analytics/savings');
    return res.data.data;
  },
};

export default logisticsApi;
