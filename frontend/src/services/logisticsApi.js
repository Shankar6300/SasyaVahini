/**
 * SasyaVahini — Logistics API Client
 * Wraps all logistics endpoints using the shared authenticated axios instance.
 * Supports realistic, multi-tenant partner personas (Vehicle Owner, Individual Driver, Fleet Organization).
 *
 * Owner: Member 4
 */

import api from './api';
import { getPreviewPersona, getStoredUser } from './auth.storage';
const demoCoordinates = [];

const makeStatutoryDocs = (vehicleNumber, category = 'SCV') => [
  {
    id: `doc_rc_${vehicleNumber}`,
    docType: 'RC',
    docNumber: `${vehicleNumber}-RC`,
    expiryDate: '2028-12-31',
    verificationStatus: 'VERIFIED',
    fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_rc.pdf',
    adminRemarks: 'DoCA RTO Validated',
  },
  {
    id: `doc_ins_${vehicleNumber}`,
    docType: 'INSURANCE',
    docNumber: `COMM-INS-${vehicleNumber.replace(/[^0-9]/g, '').slice(0, 5) || '44910'}`,
    expiryDate: '2026-11-30',
    verificationStatus: 'VERIFIED',
    fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_ins.pdf',
    adminRemarks: 'Comprehensive Goods Commercial Policy',
  },
  {
    id: `doc_puc_${vehicleNumber}`,
    docType: 'PUC',
    docNumber: `PUC-${vehicleNumber.replace(/[^0-9]/g, '').slice(0, 5) || '88129'}`,
    expiryDate: '2026-08-15',
    verificationStatus: 'VERIFIED',
    fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_puc.pdf',
  },
  {
    id: `doc_fit_${vehicleNumber}`,
    docType: 'FITNESS',
    docNumber: `FIT-${vehicleNumber.replace(/[^0-9]/g, '').slice(0, 5) || '33120'}`,
    expiryDate: '2027-08-20',
    verificationStatus: 'VERIFIED',
    fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_fit.pdf',
  },
  {
    id: `doc_per_${vehicleNumber}`,
    docType: 'PERMIT',
    docNumber: `PERMIT-${vehicleNumber.replace(/[^0-9]/g, '').slice(0, 5) || '4491'}`,
    expiryDate: '2029-01-10',
    verificationStatus: 'VERIFIED',
    fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_permit.pdf',
  },
  {
    id: `doc_tax_${vehicleNumber}`,
    docType: 'ROAD_TAX',
    docNumber: `MV-TAX-2026-${vehicleNumber.replace(/[^0-9]/g, '').slice(0, 3) || '99'}`,
    expiryDate: '2027-03-31',
    verificationStatus: 'VERIFIED',
    fileUrl: 'https://storage.sasyavahini.gov.in/docs/sample_tax.pdf',
  },
];

// Multi-Tenant Persona Store for Preview Mode
const PERSONA_DATA = {
  // ─── Persona 1: Commercial Vehicle Owner (Single Truck Owner-Operator) ───
  VEHICLE_OWNER: {
    profile: {
      id: 'prof_owner_7434',
      userId: 'dev-logistics-owner',
      partnerType: 'VEHICLE_OWNER',
      ownerName: 'Ramesh Patil',
      companyName: 'Patil Agro Transport',
      phone: '+919822099881',
      email: 'owner_7434@logistics.in',
      emergencyContact: '+919822099882',
      accountHolderName: 'Ramesh Patil',
      bankName: 'HDFC Bank',
      accountNumber: '50100449102381',
      ifscCode: 'HDFC0001234',
      serviceStates: ['Maharashtra'],
      serviceDistricts: ['Pune', 'Ahmednagar'],
      verificationStatus: 'VERIFIED',
      licenseVerified: true,
      driverVerified: true,
      adminRemarks: 'DoCA RTO & Commercial Bank Verified Transporter',
    },
    vehicles: [
      {
        id: 'veh_patil_7434',
        vehicleNumber: 'MH-14-AZ-7434',
        make: 'Tata',
        model: 'Intra V30',
        vehicleType: 'Mini-Truck',
        manufacturingYear: 2023,
        category: 'SCV',
        fuelType: 'DIESEL',
        capacityKg: 1500,
        mileageKmpl: 14.5,
        dimensions: '8.8ft x 5.3ft x 5.0ft',
        baseHub: 'Chakan Agri Hub',
        hubName: 'Chakan Agri Hub',
        driverName: 'Kailash Jadhav',
        driverPhone: '+919822099881',
        currentLatitude: 18.7230,
        currentLongitude: 73.8910,
        status: 'IN_TRANSIT',
        verificationStatus: 'VERIFIED',
        rcVerified: true,
        insuranceVerified: true,
        fitnessVerified: true,
        permitVerified: true,
        pucVerified: true,
        taxVerified: true,
        documents: makeStatutoryDocs('MH-14-AZ-7434', 'SCV'),
      },
    ],
  },

  // ─── Persona 2: Individual Commercial Driver (Driver with DL & 1 Truck) ───
  INDIVIDUAL_DRIVER: {
    profile: {
      id: 'prof_driver_5029',
      userId: 'dev-logistics-driver',
      partnerType: 'INDIVIDUAL_DRIVER',
      ownerName: 'Santosh Gaikwad',
      companyName: 'Santosh Gaikwad (Commercial Driver)',
      phone: '+919833001122',
      email: 'driver_5029@logistics.in',
      drivingLicenceNo: 'MH-12-2015005029',
      licenceExpiry: '2031-10-10',
      permittedClasses: ['LMV', 'LMV-TR', 'HGMV'],
      emergencyContact: '+919833001122',
      accountHolderName: 'Santosh Gaikwad',
      bankName: 'State Bank of India',
      accountNumber: '381902847192',
      ifscCode: 'SBIN0001524',
      serviceStates: ['Maharashtra'],
      serviceDistricts: ['Pune', 'Nashik'],
      verificationStatus: 'VERIFIED',
      driverVerified: true,
      licenseVerified: true,
      adminRemarks: 'DoCA Commercial DL & Skill Verified',
    },
    vehicles: [
      {
        id: 'veh_driver_5029',
        vehicleNumber: 'MH-12-RT-5029',
        make: 'Ashok Leyland',
        model: 'Bada Dost i4',
        vehicleType: 'Mini-Truck',
        manufacturingYear: 2024,
        category: 'MCV',
        fuelType: 'CNG',
        capacityKg: 3490,
        mileageKmpl: 12.8,
        dimensions: '14ft x 6ft x 6ft',
        baseHub: 'Pune APMC Market Yard',
        hubName: 'Pune APMC Market Yard',
        driverName: 'Santosh Gaikwad',
        driverPhone: '+919833001122',
        isRefrigerated: true,
        minTempC: 8,
        maxTempC: 15,
        currentLatitude: 18.7230,
        currentLongitude: 73.8910,
        status: 'IN_TRANSIT',
        verificationStatus: 'VERIFIED',
        rcVerified: true,
        insuranceVerified: true,
        fitnessVerified: true,
        permitVerified: true,
        pucVerified: true,
        taxVerified: true,
        documents: makeStatutoryDocs('MH-12-RT-5029', 'MCV'),
      },
    ],
  },

  // ─── Persona 3: Enterprise Fleet Organization (Multi-Vehicle Company Fleet) ───
  FLEET_OPERATOR: {
    profile: {
      id: 'prof_org_sahyadri',
      userId: 'dev-logistics-org',
      partnerType: 'FLEET_OPERATOR',
      companyName: 'Sahyadri Agro Logistics Pvt Ltd',
      ownershipType: 'Private Ltd',
      businessRegNo: 'U60200PN2021PTC198234',
      cinNumber: 'U60200PN2021PTC198234',
      gstin: '27AAACS1429B1Z8',
      panNumber: 'AAACS1429B',
      phone: '+919822014000',
      email: 'dispatch@sahyadrifleet.in',
      accountHolderName: 'Sahyadri Agro Logistics Pvt Ltd',
      bankName: 'ICICI Bank',
      accountNumber: '004505018821',
      ifscCode: 'ICIC0000456',
      serviceStates: ['Maharashtra'],
      serviceDistricts: ['Pune', 'Ahmednagar', 'Nashik', 'Satara'],
      verificationStatus: 'VERIFIED',
      licenseVerified: true,
      driverVerified: true,
      adminRemarks: 'Corporate Fleet Certified with Active DoCA Aggregation License',
    },
    vehicles: [
      {
        id: 'veh_org_4012',
        vehicleNumber: 'MH-12-QX-4012',
        make: 'Tata',
        model: 'Intra V30',
        vehicleType: 'Mini-Truck',
        manufacturingYear: 2023,
        category: 'SCV',
        fuelType: 'DIESEL',
        capacityKg: 2500,
        mileageKmpl: 14.5,
        dimensions: '9ft x 5.5ft x 5.5ft',
        baseHub: 'Chakan Agri Hub',
        hubName: 'Chakan Agri Hub',
        driverName: 'Shivaji Mane',
        driverPhone: '+919822014012',
        currentLatitude: 18.7230,
        currentLongitude: 73.8910,
        status: 'IN_TRANSIT',
        verificationStatus: 'VERIFIED',
        rcVerified: true,
        insuranceVerified: true,
        fitnessVerified: true,
        permitVerified: true,
        pucVerified: true,
        taxVerified: true,
        documents: makeStatutoryDocs('MH-12-QX-4012', 'SCV'),
      },
      {
        id: 'veh_org_8819',
        vehicleNumber: 'MH-12-VT-8819',
        make: 'Ashok Leyland',
        model: 'Partner 4-Tyre',
        vehicleType: 'Mini-Truck',
        manufacturingYear: 2022,
        category: 'MCV',
        fuelType: 'DIESEL',
        capacityKg: 3500,
        mileageKmpl: 11.5,
        dimensions: '14ft x 6ft x 6ft',
        baseHub: 'Narayangaon Hub',
        hubName: 'Narayangaon Hub',
        driverName: 'Deepak Shinde',
        driverPhone: '+919822018819',
        currentLatitude: 19.1170,
        currentLongitude: 73.9780,
        status: 'AVAILABLE',
        verificationStatus: 'VERIFIED',
        rcVerified: true,
        insuranceVerified: true,
        fitnessVerified: true,
        permitVerified: true,
        pucVerified: true,
        taxVerified: true,
        documents: makeStatutoryDocs('MH-12-VT-8819', 'MCV'),
      },
      {
        id: 'veh_org_1290',
        vehicleNumber: 'MH-14-GH-1290',
        make: 'Mahindra',
        model: 'Bolero Maxi Truck Plus',
        vehicleType: 'Tempo',
        manufacturingYear: 2023,
        category: 'SCV',
        fuelType: 'DIESEL',
        capacityKg: 1500,
        mileageKmpl: 15.0,
        dimensions: '8ft x 5ft x 4.5ft',
        baseHub: 'Hadapsar Hub',
        hubName: 'Hadapsar Hub',
        driverName: 'Amol Borade',
        driverPhone: '+919822011290',
        currentLatitude: 18.5089,
        currentLongitude: 73.9260,
        status: 'AVAILABLE',
        verificationStatus: 'VERIFIED',
        rcVerified: true,
        insuranceVerified: true,
        fitnessVerified: true,
        permitVerified: true,
        pucVerified: true,
        taxVerified: true,
        documents: makeStatutoryDocs('MH-14-GH-1290', 'SCV'),
      },
    ],
  },
};

const getActiveData = () => {
  const persona = getPreviewPersona();
  return PERSONA_DATA[persona] || PERSONA_DATA.VEHICLE_OWNER;
};

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

const getActiveShipment = () => {
  const activeData = getActiveData();
  const primaryVeh = activeData.vehicles[0] || {
    id: 'veh_preview_1',
    vehicleNumber: 'MH-14-AZ-7434',
    driverName: 'Kailash Jadhav',
    driverPhone: '+919822099881',
    capacityKg: 1500,
  };

  return {
    id: 'shp_demo_101',
    legId: 'leg_demo_101',
    trackingNumber: 'SV-SHP-2026-0001',
    orderId: 'ord_demo_101',
    vehicleId: primaryVeh.id,
    vehicleNumber: primaryVeh.vehicleNumber,
    driverName: primaryVeh.driverName,
    driverPhone: primaryVeh.driverPhone,
    status: 'TRANSIT',
    totalWeightKg: Math.min(2500, primaryVeh.capacityKg || 2500),
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
};

const previewPlan = {
  planId: 'plan_preview_001',
  label: 'BEST VALUE',
  totalCost: 63200,
  requestedQtyKg: 2500,
  farmers: [
    { farmerId: 'stop_1', farmerName: 'Farmer Ramesh Kulkarni (Manchar)', qtyKg: 1500, pricePerKg: 22, grade: 'GRADE_A' },
    { farmerId: 'stop_2', farmerName: 'Farmer Suresh Bhor (Khed)', qtyKg: 1000, pricePerKg: 23.5, grade: 'GRADE_A' },
  ],
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

const getSavingsForActiveData = () => {
  const activeData = getActiveData();
  const vList = activeData.vehicles;
  return {
    totalShipments: 1,
    baselineKm: 165,
    optimizedKm: 96,
    savedKm: 69,
    fuelSavedRs: 1639,
    utilizationPercent: 100,
    avgVehicleUtilizationPercent: 100,
    fleetSummary: {
      totalVehicles: vList.length,
      availableVehicles: vList.filter((v) => v.status === 'AVAILABLE').length,
      activeOnRoute: vList.filter((v) => v.status === 'IN_TRANSIT' || v.status === 'ASSIGNED').length || 1,
    },
  };
};

const previewCall = () => {
  return null;
};

export const logisticsApi = {
  // Available shipments for dispatch/acceptance
  getAvailableShipments: async () => {
    const preview = previewCall(() => [getActiveShipment()]);
    if (preview) return preview;
    const res = await api.get('/logistics/available-shipments');
    return res.data.data;
  },

  // Accept shipment and assign vehicle
  acceptShipment: async (shipmentId, { vehicleId, driverNotes }) => {
    const preview = previewCall(() => ({ success: true, shipmentId, vehicleId, status: 'ASSIGNED' }));
    if (preview) return preview;
    const res = await api.post(`/logistics/shipments/${shipmentId}/accept`, {
      vehicleId,
      driverNotes,
    });
    return res.data.data;
  },

  // Post milestone update (ASSIGNED -> PICKUP -> TRANSIT -> DELIVERED)
  updateMilestone: async (shipmentId, milestonePayload) => {
    const preview = previewCall(() => ({ success: true, shipmentId, ...milestonePayload }));
    if (preview) return preview;
    const res = await api.post(`/logistics/shipments/${shipmentId}/milestones`, milestonePayload);
    return res.data.data;
  },

  // Fetch real-time tracking, live coordinates, and cold-chain temperature
  getShipmentTracking: async (shipmentId) => {
    const buildFallbackTracking = () => {
      const activeShipment = getActiveShipment();
      return {
        shipmentId: shipmentId || activeShipment.id,
        trackingNumber: activeShipment.trackingNumber,
        orderId: activeShipment.orderId,
        status: activeShipment.status,
        vehicle: {
          vehicleNumber: activeShipment.vehicleNumber,
          driverName: activeShipment.driverName,
          driverPhone: activeShipment.driverPhone,
        },
        currentLocation: activeShipment.currentLocation,
        primaryRoute: PREVIEW_ROUTES[0],
        alternativeRoute: PREVIEW_ROUTES[1],
        routes: PREVIEW_ROUTES,
        selectedRouteIndex: activeShipment.selectedRouteIndex || 0,
        isLocked: activeShipment.isLocked || false,
        deliveryOtp: activeShipment.deliveryOtp,
        coldChain: activeShipment.coldChain,
        route: {
          totalDistanceKm: activeShipment.totalDistanceKm,
          remainingDistanceKm: 41.2,
          etaMinutes: activeShipment.estimatedMinutes,
          geometry: {
            type: 'LineString',
            coordinates: demoCoordinates,
          },
        },
        stops: activeShipment.stops,
        milestonesHistory: [
          { status: 'ASSIGNED', recordedAt: new Date(Date.now() - 3600000).toISOString(), notes: `Assigned to ${activeShipment.driverName}` },
          { status: 'PICKUP', recordedAt: new Date(Date.now() - 1800000).toISOString(), notes: 'Loaded at Manchar and Khed' },
          { status: 'TRANSIT', recordedAt: new Date(Date.now() - 600000).toISOString(), notes: 'En route to Hadapsar' },
        ],
      };
    };

    const preview = previewCall(buildFallbackTracking);
    if (preview) return preview;

    // Try live backend API for assigned shipments
    if (shipmentId) {
      try {
        const res = await api.get(`/logistics/shipments/${shipmentId}/tracking`);
        if (res.data?.data) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('Real tracking query failed or shipment is not assigned:', err?.message);
      }
    }

    throw new Error('No live tracking data is available for this shipment.');
  },

  // Sourcing & Logistics optimization planning
  planOrder: async (planRequest) => {
    const preview = previewCall(() => ({
      crop: planRequest.crop || 'Tomato',
      requestedQtyKg: planRequest.qtyKg || 2500,
      plans: [previewPlan],
    }));
    if (preview) return preview;
    const res = await api.post('/logistics/plan', planRequest);
    return res.data.data;
  },

  // Create shipment from confirmed order
  createShipment: async (orderId, planData = null) => {
    const preview = previewCall(() => ({ ...getActiveShipment(), orderId }));
    if (preview) return preview;
    const res = await api.post('/logistics/shipments', { orderId, planData });
    return res.data.data;
  },

  // Paginated list of shipments
  getShipments: async (params = {}) => {
    const preview = previewCall(() => ({ shipments: [getActiveShipment()], meta: { total: 1, page: 1, limit: params.limit || 10 } }));
    if (preview) return preview;
    const res = await api.get('/logistics/shipments', { params });
    return {
      shipments: res.data.data,
      meta: res.data.meta,
    };
  },

  // Single shipment detail
  getShipmentById: async (shipmentId) => {
    const preview = previewCall(() => getActiveShipment());
    if (preview) return preview;
    const res = await api.get(`/logistics/shipments/${shipmentId}`);
    return res.data.data;
  },

  resolveShipmentId: async (requestedId) => {
    const preview = previewCall(() => getActiveShipment());
    if (preview) return preview.id || preview.trackingNumber;

    if (requestedId) {
      try {
        await logisticsApi.getShipmentById(requestedId);
        return requestedId;
      } catch (err) {
        if (err.response?.status !== 404) throw err;
      }
    }

    const result = await logisticsApi.getShipments({ limit: 50 });
    const shipments = result?.shipments || [];
    const matching = shipments.find(
      (shipment) => shipment.id === requestedId || shipment.trackingNumber === requestedId,
    );
    const active = matching || shipments.find((shipment) => shipment.status !== 'DELIVERED') || shipments[0];
    if (!active?.id && !active?.trackingNumber) {
      throw new Error('No shipment is available for logistics tracking');
    }
    return active.id || active.trackingNumber;
  },

  getShipmentDetailsForNavigation: async (shipmentId) => {
    const resolvedId = await logisticsApi.resolveShipmentId(shipmentId);
    return logisticsApi.getShipmentById(resolvedId);
  },

  // List fleet vehicles — strictly scoped to the active partner/organization persona
  getVehicles: async (params = {}) => {
    const preview = previewCall(() => {
      const activeData = getActiveData();
      return [...activeData.vehicles];
    });
    if (preview) return preview;
    const res = await api.get('/logistics/vehicles', { params });
    return res.data.data;
  },

  // Register new commercial vehicle with verified specifications & documents
  createVehicle: async (vehiclePayload) => {
    const preview = previewCall(() => {
      const activeData = getActiveData();
      const newVeh = {
        id: `veh_user_${Date.now()}`,
        vehicleNumber: vehiclePayload.vehicleNumber || `MH-14-AZ-${Math.floor(1000 + Math.random() * 9000)}`,
        make: vehiclePayload.make || 'Tata',
        model: vehiclePayload.model || 'Intra V30',
        vehicleType: vehiclePayload.vehicleType || 'Mini-Truck',
        manufacturingYear: parseInt(vehiclePayload.manufacturingYear, 10) || 2023,
        category: vehiclePayload.category || 'SCV',
        fuelType: vehiclePayload.fuelType || 'DIESEL',
        capacityKg: parseFloat(vehiclePayload.capacityKg) || 1500,
        mileageKmpl: parseFloat(vehiclePayload.mileageKmpl) || 14.5,
        dimensions: vehiclePayload.dimensions || '9ft x 5.5ft x 5.5ft',
        baseHub: vehiclePayload.baseHub || 'Pune Agri Zone',
        hubName: vehiclePayload.baseHub || 'Pune Agri Zone',
        driverName: vehiclePayload.driverName || activeData.profile.ownerName || 'Kailash Jadhav',
        driverPhone: vehiclePayload.driverPhone || activeData.profile.phone || '+919822099881',
        isRefrigerated: Boolean(vehiclePayload.isRefrigerated),
        minTempC: vehiclePayload.minTempC ? parseFloat(vehiclePayload.minTempC) : null,
        maxTempC: vehiclePayload.maxTempC ? parseFloat(vehiclePayload.maxTempC) : null,
        status: 'AVAILABLE',
        verificationStatus: 'PENDING',
        rcVerified: false,
        insuranceVerified: false,
        fitnessVerified: false,
        permitVerified: false,
        pucVerified: false,
        taxVerified: false,
        documents: (vehiclePayload.documents || []).length > 0
          ? vehiclePayload.documents.map((d) => ({
              id: `doc_${Date.now()}_${d.docType}`,
              docType: d.docType,
              docNumber: d.docNumber,
              expiryDate: d.expiryDate || '2028-12-31',
              verificationStatus: 'PENDING',
              fileUrl: d.fileUrl || 'https://storage.sasyavahini.gov.in/docs/sample.pdf',
            }))
          : makeStatutoryDocs(vehiclePayload.vehicleNumber || 'MH14', vehiclePayload.category),
      };
      activeData.vehicles.unshift(newVeh);
      return newVeh;
    });
    if (preview) return preview;
    const res = await api.post('/logistics/vehicles', vehiclePayload);
    return res.data.data;
  },

  // Upload or replace a statutory vehicle document (RC, Insurance, Fitness, Permit, PUC, Road Tax)
  uploadVehicleDocument: async (vehicleId, documentPayload) => {
    const preview = previewCall(() => {
      const activeData = getActiveData();
      const veh = activeData.vehicles.find((v) => v.id === vehicleId) || activeData.vehicles[0];
      if (veh) {
        if (!veh.documents) veh.documents = [];
        const existingIdx = veh.documents.findIndex((d) => d.docType === documentPayload.docType);
        const docObj = {
          id: existingIdx >= 0 ? veh.documents[existingIdx].id : `doc_${Date.now()}_${documentPayload.docType}`,
          docType: documentPayload.docType,
          docNumber: documentPayload.docNumber || `${veh.vehicleNumber}-${documentPayload.docType}`,
          expiryDate: documentPayload.expiryDate || '2028-12-31',
          fileUrl: documentPayload.fileUrl || 'https://storage.sasyavahini.gov.in/docs/sample.pdf',
          verificationStatus: 'PENDING',
          adminRemarks: 'Re-uploaded by partner. Pending DoCA regulatory review.',
        };
        if (existingIdx >= 0) {
          veh.documents[existingIdx] = docObj;
        } else {
          veh.documents.push(docObj);
        }
        veh.verificationStatus = 'PENDING';
        veh.adminRemarks = 'Document re-uploaded. Queued for DoCA officer verification.';
        return { ...veh };
      }
      return null;
    });
    if (preview) return preview;
    const res = await api.post(`/logistics/vehicles/${vehicleId}/documents`, documentPayload);
    return res.data.data;
  },

  // Detailed vehicle specifications & documents
  getVehicleDetail: async (vehicleId) => {
    const preview = previewCall(() => {
      const activeData = getActiveData();
      return activeData.vehicles.find((v) => v.id === vehicleId) || activeData.vehicles[0];
    });
    if (preview) return preview;
    const res = await api.get(`/logistics/vehicles/${vehicleId}`);
    return res.data.data;
  },

  // DoCA Admin Verification Queue for pending partners, drivers, and vehicles
  getAdminVerificationQueue: async () => {
    const preview = previewCall(() => ({
      stats: { pendingVehiclesCount: 1, verifiedVehiclesCount: 4, rejectedVehiclesCount: 0, pendingPartnersCount: 1, totalPartnersCount: 3 },
      pendingVehicles: [PERSONA_DATA.INDIVIDUAL_DRIVER.vehicles[0]],
      pendingPartners: [PERSONA_DATA.INDIVIDUAL_DRIVER.profile],
      allPartners: Object.values(PERSONA_DATA).map((p) => p.profile),
    }));
    if (preview) return preview;
    const res = await api.get('/logistics/admin/verification-queue');
    return res.data.data;
  },

  // Verify or reject vehicle
  verifyVehicle: async (vehicleId, payload) => {
    const preview = previewCall(() => {
      const activeData = getActiveData();
      const veh = activeData.vehicles.find((v) => v.id === vehicleId) || activeData.vehicles[0];
      if (veh) {
        veh.verificationStatus = payload.status || 'VERIFIED';
        veh.adminRemarks = payload.adminRemarks || 'Approved by DoCA';
        veh.rejectionReason = payload.rejectionReason || null;
        return { ...veh };
      }
      return { success: true };
    });
    if (preview) return preview;
    const res = await api.patch(`/logistics/admin/vehicles/${vehicleId}/verify`, payload);
    return res.data.data;
  },

  // Verify or reject driver / partner profile
  verifyDriver: async (profileId, payload) => {
    const preview = previewCall(() => ({ success: true, profileId, ...payload }));
    if (preview) return preview;
    const res = await api.patch(`/logistics/admin/drivers/${profileId}/verify`, payload);
    return res.data.data;
  },

  // Verify or reject single vehicle document
  verifyDocument: async (docId, payload) => {
    const preview = previewCall(() => ({ success: true, docId, ...payload }));
    if (preview) return preview;
    const res = await api.patch(`/logistics/admin/documents/${docId}/verify`, payload);
    return res.data.data;
  },

  // Get 3 comparative route options for a shipment leg
  getLegRouteOptions: async (legId) => {
    const preview = previewCall(() => {
      const activeShipment = getActiveShipment();
      return {
        legId: legId || 'leg_demo_101',
        selectedRouteIndex: activeShipment.selectedRouteIndex || 0,
        isLocked: activeShipment.isLocked || false,
        routes: PREVIEW_ROUTES,
        isEstimated: false,
      };
    });
    if (preview) return preview;
    const res = await api.get(`/logistics/legs/${legId}/route-options`);
    return res.data.data;
  },

  // Lock selected route on a leg with optional deviation reason
  selectLegRoute: async (legId, payload) => {
    const preview = previewCall(() => {
      const activeShipment = getActiveShipment();
      activeShipment.selectedRouteIndex = payload.selectedRouteIndex;
      activeShipment.isLocked = true;
      return {
        success: true,
        legId: legId || 'leg_demo_101',
        selectedRouteIndex: payload.selectedRouteIndex,
        isLocked: true,
        routeLockedAt: new Date().toISOString(),
        deviationReason: payload.deviationReason || null,
      };
    });
    if (preview) return preview;
    const res = await api.post(`/logistics/legs/${legId}/select-route`, payload);
    return res.data.data;
  },

  // Verify buyer delivery OTP
  verifyDeliveryOtp: async (shipmentId, otp) => {
    const preview = previewCall(() => {
      const activeShipment = getActiveShipment();
      if (otp !== activeShipment.deliveryOtp) {
        throw new Error('Invalid delivery OTP');
      }
      activeShipment.status = 'DELIVERED';
      return {
        verified: true,
        status: 'DELIVERED',
        deliveredAt: new Date().toISOString(),
      };
    });
    if (preview) return preview;
    const res = await api.post(`/logistics/shipments/${shipmentId}/verify-delivery-otp`, { otp });
    return res.data.data;
  },

  // Driver GPS ping telemetry
  updateVehicleLocation: async (vehicleId, locationPayload) => {
    const preview = previewCall(() => ({ success: true, vehicleId, ...locationPayload }));
    if (preview) return preview;
    const res = await api.post(`/logistics/vehicles/${vehicleId}/location`, locationPayload);
    return res.data.data;
  },

  // Map visualization coordinates and route geometry for an order
  getOrderMap: async (orderId) => {
    const preview = previewCall(() => {
      const activeShipment = getActiveShipment();
      return {
        orderId,
        shipment: activeShipment,
        routeGeometry: activeShipment.routeGeometry,
      };
    });
    if (preview) return preview;
    const res = await api.get(`/logistics/map/${orderId}`);
    return res.data.data;
  },

  // CVRP Optimization Impact analytics
  getSavingsAnalytics: async () => {
    const preview = previewCall(() => getSavingsForActiveData());
    if (preview) return preview;
    const res = await api.get('/logistics/analytics/savings');
    return res.data.data;
  },

  // Get logged-in transport partner's profile and KYC credentials
  getProfile: async () => {
    const preview = previewCall(() => {
      const activeData = getActiveData();
      const storedUser = getStoredUser();
      const vList = activeData.vehicles;
      const userName = storedUser?.name || activeData.profile.ownerName || 'Transporter Partner';
      const userEmail = storedUser?.email || activeData.profile.email;
      return {
        ...activeData.profile,
        ownerName: userName,
        companyName: activeData.profile.partnerType === 'FLEET_OPERATOR' ? (activeData.profile.companyName || `${userName} Logistics`) : `${userName} Logistics`,
        email: userEmail,
        vehicles: [...vList],
        stats: {
          totalVehicles: vList.length,
          verifiedVehicles: vList.filter((v) => v.verificationStatus === 'VERIFIED').length,
          pendingVehicles: vList.filter((v) => v.verificationStatus === 'PENDING').length,
          rejectedVehicles: vList.filter((v) => v.verificationStatus === 'REJECTED').length,
        },
      };
    });
    if (preview) return preview;
    const res = await api.get('/logistics/profile');
    return res.data.data;
  },

  // Update transport partner's profile / organization details
  updateProfile: async (payload) => {
    const preview = previewCall(() => {
      const activeData = getActiveData();
      Object.assign(activeData.profile, payload);
      return { ...activeData.profile };
    });
    if (preview) return preview;
    const res = await api.put('/logistics/profile', payload);
    return res.data.data;
  },
};

export default logisticsApi;
