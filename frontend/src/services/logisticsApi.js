/**
 * SasyaVahini — Logistics API Client
 * Wraps all logistics endpoints using the shared authenticated axios instance.
 *
 * Owner: Member 4
 */

import api from './api';
import { isPreviewSession } from './auth.storage';
import demoCoordinates from '../assets/demoRouteCoordinates.json';

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

const PREVIEW_ROUTES = [
  {
    routeIndex: 0,
    label: 'Route 1 – Highway Corridor (NH-60)',
    description: 'Fastest 4-lane bypass with minimal truck vibration and optimal cooling',
    distanceKm: 96.0,
    etaMin: 110,
    fuelLitres: 23.4,
    fuelCostRs: 2223.0,
    tollsRs: 120.0,
    driverNetEarningsRs: 2157.0,
    roadBreakdown: { highwayKm: 72, stateHighwayKm: 18, ruralKm: 6 },
    spoilageRisk: 'LOW',
    isRecommended: true,
    isEstimated: false,
    googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&origin=18.9880,73.9400&destination=18.5089,73.9260&travelmode=driving',
    geometry: {
      type: 'LineString',
      coordinates: demoCoordinates,
    },
  },
  {
    routeIndex: 1,
    label: 'Route 2 – Main Roads (SH-54 / Talegaon)',
    description: 'Balanced state highway corridor with zero toll booths',
    distanceKm: 88.4,
    etaMin: 135,
    fuelLitres: 25.1,
    fuelCostRs: 2385.0,
    tollsRs: 0.0,
    driverNetEarningsRs: 2115.0,
    roadBreakdown: { highwayKm: 22, stateHighwayKm: 52, ruralKm: 14.4 },
    spoilageRisk: 'MODERATE',
    isRecommended: false,
    isEstimated: false,
    googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&origin=18.9880,73.9400&destination=18.5089,73.9260&travelmode=driving',
    geometry: {
      type: 'LineString',
      coordinates: demoCoordinates.filter((_, idx) => idx % 3 === 0).map(([lng, lat], i, arr) => (i > 0 && i < arr.length - 1 ? [Number((lng + 0.007).toFixed(6)), Number((lat - 0.005).toFixed(6))] : [lng, lat])),
    },
  },
  {
    routeIndex: 2,
    label: 'Route 3 – Rural Direct (Khed-Alandi Lane)',
    description: 'Shortest distance through agricultural belts with narrow lanes',
    distanceKm: 82.5,
    etaMin: 185,
    fuelLitres: 29.8,
    fuelCostRs: 2831.0,
    tollsRs: 0.0,
    driverNetEarningsRs: 1669.0,
    roadBreakdown: { highwayKm: 8, stateHighwayKm: 28, ruralKm: 46.5 },
    spoilageRisk: 'ELEVATED',
    isRecommended: false,
    isEstimated: false,
    googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&origin=18.9880,73.9400&destination=18.5089,73.9260&travelmode=driving',
    geometry: {
      type: 'LineString',
      coordinates: demoCoordinates.filter((_, idx) => idx % 4 === 0).map(([lng, lat], i, arr) => (i > 0 && i < arr.length - 1 ? [Number((lng - 0.010).toFixed(6)), Number((lat + 0.008).toFixed(6))] : [lng, lat])),
    },
  },
];

const PREVIEW_SHIPMENT = {
  id: 'shp_demo_101',
  legId: 'leg_demo_101',
  trackingNumber: 'SV-SHP-2026-0001',
  orderId: 'ord_demo_101',
  vehicleId: 'veh_preview_1',
  vehicleNumber: 'MH-12-QX-4012',
  driverName: 'Shivaji Mane',
  driverPhone: '+919822014012',
  status: 'TRANSIT',
  totalWeightKg: 2500,
  totalDistanceKm: 96,
  baselineDistanceKm: 165,
  savedDistanceKm: 69,
  estimatedFuelSavedRs: 1639,
  utilizationPercent: 100,
  estimatedMinutes: 110,
  selectedRouteIndex: 0,
  isLocked: false,
  deliveryOtp: '482910',
  currentLocation: { latitude: 18.7230, longitude: 73.8910, speedKmh: 44, lastPingAt: new Date().toISOString() },
  routeGeometry: {
    type: 'LineString',
    coordinates: demoCoordinates,
  },
  routes: PREVIEW_ROUTES,
  primaryRoute: PREVIEW_ROUTES[0],
  alternativeRoute: PREVIEW_ROUTES[1],
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
  baselineKm: 165,
  optimizedKm: 96,
  savedKm: 69,
  fuelSavedRs: 1639,
  utilizationPercent: 100,
  avgVehicleUtilizationPercent: 100,
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
      primaryRoute: PREVIEW_ROUTES[0],
      alternativeRoute: PREVIEW_ROUTES[1],
      routes: PREVIEW_ROUTES,
      selectedRouteIndex: PREVIEW_SHIPMENT.selectedRouteIndex || 0,
      isLocked: PREVIEW_SHIPMENT.isLocked || false,
      deliveryOtp: PREVIEW_SHIPMENT.deliveryOtp,
      coldChain: PREVIEW_SHIPMENT.coldChain,
      route: {
        totalDistanceKm: PREVIEW_SHIPMENT.totalDistanceKm,
        remainingDistanceKm: 41.2,
        etaMinutes: PREVIEW_SHIPMENT.estimatedMinutes,
        geometry: {
          type: 'LineString',
          coordinates: demoCoordinates,
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

  // Register new commercial vehicle with verified specifications & documents
  createVehicle: async (vehiclePayload) => {
    const res = await api.post('/logistics/vehicles', vehiclePayload);
    return res.data.data;
  },

  // Upload or replace a statutory vehicle document (RC, Insurance, Fitness, Permit, PUC, Road Tax)
  uploadVehicleDocument: async (vehicleId, documentPayload) => {
    const res = await api.post(`/logistics/vehicles/${vehicleId}/documents`, documentPayload);
    return res.data.data;
  },

  // Detailed vehicle specifications & documents
  getVehicleDetail: async (vehicleId) => {
    const res = await api.get(`/logistics/vehicles/${vehicleId}`);
    return res.data.data;
  },

  // DoCA Admin Verification Queue for pending partners, drivers, and vehicles
  getAdminVerificationQueue: async () => {
    const res = await api.get('/logistics/admin/verification-queue');
    return res.data.data;
  },

  // Verify or reject vehicle
  verifyVehicle: async (vehicleId, payload) => {
    const res = await api.patch(`/logistics/admin/vehicles/${vehicleId}/verify`, payload);
    return res.data.data;
  },

  // Verify or reject driver / partner profile
  verifyDriver: async (profileId, payload) => {
    const res = await api.patch(`/logistics/admin/drivers/${profileId}/verify`, payload);
    return res.data.data;
  },

  // Verify or reject single vehicle document
  verifyDocument: async (docId, payload) => {
    const res = await api.patch(`/logistics/admin/documents/${docId}/verify`, payload);
    return res.data.data;
  },

  // Get 3 comparative route options for a shipment leg
  getLegRouteOptions: async (legId) => {
    const preview = previewCall({
      legId: legId || 'leg_demo_101',
      selectedRouteIndex: PREVIEW_SHIPMENT.selectedRouteIndex,
      isLocked: PREVIEW_SHIPMENT.isLocked,
      routes: PREVIEW_ROUTES,
      isEstimated: false,
    });
    if (preview) return preview;
    const res = await api.get(`/logistics/legs/${legId}/route-options`);
    return res.data.data;
  },

  // Lock selected route on a leg with optional deviation reason
  selectLegRoute: async (legId, payload) => {
    const preview = previewCall({
      success: true,
      legId: legId || 'leg_demo_101',
      selectedRouteIndex: payload.selectedRouteIndex,
      isLocked: true,
      routeLockedAt: new Date().toISOString(),
      deviationReason: payload.deviationReason || null,
    });
    if (preview) {
      PREVIEW_SHIPMENT.selectedRouteIndex = payload.selectedRouteIndex;
      PREVIEW_SHIPMENT.isLocked = true;
      return preview;
    }
    const res = await api.post(`/logistics/legs/${legId}/select-route`, payload);
    return res.data.data;
  },

  // Verify buyer delivery OTP
  verifyDeliveryOtp: async (shipmentId, otp) => {
    const preview = previewCall({
      verified: true,
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
    });
    if (preview) {
      if (otp !== PREVIEW_SHIPMENT.deliveryOtp) {
        throw new Error('Invalid delivery OTP');
      }
      PREVIEW_SHIPMENT.status = 'DELIVERED';
      return preview;
    }
    const res = await api.post(`/logistics/shipments/${shipmentId}/verify-delivery-otp`, { otp });
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

  // Get logged-in transport partner's profile and KYC credentials
  getProfile: async () => {
    const res = await api.get('/logistics/profile');
    return res.data.data;
  },

  // Update transport partner's profile / organization details
  updateProfile: async (payload) => {
    const res = await api.put('/logistics/profile', payload);
    return res.data.data;
  },
};

export default logisticsApi;
