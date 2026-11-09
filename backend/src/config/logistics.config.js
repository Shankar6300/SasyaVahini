/**
 * SasyaVahini — Logistics Configuration
 *
 * Centralized rates, weights, vehicle parameters, and state-machine transitions.
 * No logistics rates or constants should be hardcoded elsewhere.
 *
 * Owner: Member 4
 */

module.exports = {
  // Candidate Matching Algorithm Weights (Sum = 1.0)
  matchingWeights: {
    price: 0.35,
    distance: 0.25,
    quantity: 0.20,
    delivery: 0.10,
    reliability: 0.10,
  },

  // Plan Ranking Weights default baseline (modulated by buyer priority slider)
  // priority = 0 (cheapest focus) -> higher weight on cost
  // priority = 1 (quality focus)  -> higher weight on quality/reliability
  rankingBaseline: {
    wCost: 0.40,
    wQuality: 0.30,
    wReliability: 0.20,
    wTime: 0.10,
  },

  // Sourcing & Search Constraints
  searchConstraints: {
    maxSearchRadiusKm: 150,
    radiusSteps: [15, 30, 50, 80, 120],
    defaultMinReliability: 0.70,
    maxFarmersPerMultiPlan: 5,
    targetUtilizationMin: 0.75,
    targetUtilizationMax: 0.95,
  },

  // Costing & Fee Structure (Auditable Total Landed Cost)
  costing: {
    handlingFeePerKg: 0.50,        // ₹0.50 per kg handling/labor fee
    platformFeePct: 0.02,          // 2% platform facilitation fee
    aggregationFeePerExtraFarmer: 350, // ₹350 per stop beyond 1st farmer
    gstRatePct: 0.0,              // 0% for raw agricultural produce (exempt under GST)
    fuelCostPerLitre: 95.0,        // ₹95 / L diesel
    avgMileageKmPerLitre: 4.0,     // 4 km per litre for standard light commercial vehicles
    estimatedFuelCostPerKm: 23.75, // 95 / 4 = ₹23.75 per km
  },

  // Fleet & Vehicle Specifications
  vehicleTypes: {
    TEMPO: {
      type: 'Tempo',
      capacityKg: 1500,
      baseFare: 500,
      perKmRate: 18.0,
      avgSpeedKmh: 40,
    },
    MINI_TRUCK: {
      type: 'Mini-Truck',
      capacityKg: 3000,
      baseFare: 800,
      perKmRate: 24.0,
      avgSpeedKmh: 45,
    },
    MEDIUM_TRUCK: {
      type: 'Truck',
      capacityKg: 5000,
      baseFare: 1200,
      perKmRate: 32.0,
      avgSpeedKmh: 40,
    },
    REFRIGERATED: {
      type: 'Refrigerated',
      capacityKg: 4000,
      baseFare: 1600,
      perKmRate: 38.0,
      avgSpeedKmh: 45,
    },
  },

  // Milestone Finite State Machine
  milestones: {
    INITIAL: 'ASSIGNED',
    SEQUENCE: ['ASSIGNED', 'PICKUP', 'TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'],
    VALID_TRANSITIONS: {
      ASSIGNED: ['PICKUP'],
      PICKUP: ['TRANSIT'],
      TRANSIT: ['OUT_FOR_DELIVERY'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: [], // Terminal state
    },
  },

  // External Microservice & Routing Endpoints
  routing: {
    serviceUrl: process.env.ROUTING_SERVICE_URL || 'http://localhost:8001',
    osrmUrl: process.env.OSRM_URL || 'https://router.project-osrm.org',
    timeoutMs: 5000,
    haversineDetourFactor: 1.3, // Road distance multiplier for Haversine fallback
    avgTransitSpeedKmh: 40,     // For estimating transit duration
  },

  twoTier: {
    quoteTtlMinutes: Number(process.env.LOGISTICS_QUOTE_TTL_MINUTES || 15),
    nextRingImprovementPct: 0.03,
    kgTolerancePct: 0.02,
    transferHandlingMinutes: 30,
    unknownRoadClass: 'LANE',
    roadClasses: ['LANE', 'LOCAL', 'MAIN', 'STATE_HIGHWAY', 'HIGHWAY'],
    transferPointMinimumRoadClass: 'MAIN',
    trafficDelayRiskPerMinute: 1.5,
  },

  transferPoints: [
    {
      id: 'tp_chakan',
      name: 'Chakan Transfer Yard',
      lat: 18.7606,
      lng: 73.8636,
      roadAccess: 'MAIN',
      capacityKg: 10000,
      feePerKg: 0.25,
      openHours: '5-22',
      zone: 'CHAKAN',
    },
  ],

  // Environmental Config
  dataSource: process.env.LOGISTICS_DATA_SOURCE || 'mock',
};
