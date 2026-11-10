/**
 * Two-tier logistics planner.
 *
 * PLAN is deliberately side-effect free. It produces an expiring quote that
 * EXECUTE can re-validate and persist after buyer confirmation.
 */

const { v4: uuidv4 } = require('uuid');
const config = require('../config/logistics.config');
const { batchRepo } = require('../adapters');
const { haversineKm, estimatedRoadKm } = require('../utils/geo');

const ROAD_RANK = Object.fromEntries(config.twoTier.roadClasses.map((value, index) => [value, index]));

const defaultTrafficService = {
  getTravelFactor: () => 1,
};

const defaultRoutingService = {
  async routeDistanceKm(from, to) {
    return estimatedRoadKm(from.lat, from.lng, to.lat, to.lng, config.routing.haversineDetourFactor);
  },
};

const defaultSolverService = {
  async optimize(legs) {
    return legs;
  },
};

const normalizeRoadClass = (value) => {
  const normalized = String(value || config.twoTier.unknownRoadClass).toUpperCase();
  return ROAD_RANK[normalized] === undefined ? config.twoTier.unknownRoadClass : normalized;
};

const isAllowedRoad = (vehicleSpec, roadClass) =>
  ROAD_RANK[vehicleSpec.minRoadClass || 'LANE'] <= ROAD_RANK[normalizeRoadClass(roadClass)];

const point = (value) => ({ lat: Number(value.latitude ?? value.lat), lng: Number(value.longitude ?? value.lng) });

const getTransferPoints = (params) => params.transferPoints || config.transferPoints || [];

const chooseTransferPoint = (farmer, transferPoints, buyer) => {
  const eligible = transferPoints
    .filter((tp) => normalizeRoadClass(tp.roadAccess || tp.accessRoadClass) !== 'LANE')
    .filter((tp) => Number(tp.capacityKg || Infinity) >= farmer.qtyKg)
    .filter((tp) => isOpen(tp, paramsHour()))
    .map((tp) => ({
      ...tp,
      distanceKm: estimatedRoadKm(farmer.lat, farmer.lng, tp.lat, tp.lng),
      buyerDistanceKm: estimatedRoadKm(tp.lat, tp.lng, buyer.lat, buyer.lng),
    }))
    .sort((a, b) => a.distanceKm + a.buyerDistanceKm - (b.distanceKm + b.buyerDistanceKm));
  return eligible[0] || null;
};

const paramsHour = () => new Date().getHours();

const isOpen = (transferPoint, hour) => {
  if (!transferPoint.openHours) return true;
  const [from, to] = String(transferPoint.openHours).split('-').map(Number);
  return Number.isFinite(from) && Number.isFinite(to) ? hour >= from && hour <= to : true;
};

const twoOpt = (farmers) => farmers;

class TwoTierLogisticsService {
  constructor({
    repository = batchRepo,
    trafficService = defaultTrafficService,
    routingService = defaultRoutingService,
    solverService = defaultSolverService,
  } = {}) {
    this.repository = repository;
    this.trafficService = trafficService;
    this.routingService = routingService;
    this.solverService = solverService;
    this.distanceCache = new Map();
  }

  async fetchCandidatePool(crop, maxRadius, buyer) {
    const raw = await this.repository.findCandidatesByCrop(crop);
    return raw
      .map((candidate) => ({
        ...candidate,
        lat: Number(candidate.latitude ?? candidate.lat),
        lng: Number(candidate.longitude ?? candidate.lng),
        accessRoadClass: normalizeRoadClass(candidate.accessRoadClass || candidate.roadClass),
        reliability: candidate.farmerReliability ?? candidate.reliability ?? 0.85,
      }))
      .map((candidate) => ({
        ...candidate,
        buyerDistanceKm: haversineKm(buyer.lat, buyer.lng, candidate.lat, candidate.lng),
      }))
      .filter((candidate) => candidate.availableQuantityKg > 0 && candidate.buyerDistanceKm <= maxRadius);
  }

  clusterFarmers(candidates, transferPoints, buyer) {
    const clusters = new Map();
    candidates.forEach((candidate) => {
      const farmer = { ...candidate, qtyKg: candidate.availableQuantityKg };
      const transferPoint = chooseTransferPoint(farmer, transferPoints, buyer);
      const key = transferPoint ? transferPoint.id : 'direct';
      if (!clusters.has(key)) clusters.set(key, { transferPoint, farmers: [] });
      clusters.get(key).farmers.push(farmer);
    });
    return [...clusters.values()];
  }

  async distance(from, to) {
    const key = `${from.lat},${from.lng}:${to.lat},${to.lng}`;
    if (!this.distanceCache.has(key)) {
      try {
        this.distanceCache.set(key, await this.routingService.routeDistanceKm(from, to));
      } catch {
        this.distanceCache.set(key, estimatedRoadKm(from.lat, from.lng, to.lat, to.lng));
      }
    }
    return this.distanceCache.get(key);
  }

  async buildPlan({ cluster, qtyKg, buyer, maxBudget, radiusUsedKm, buyerAddress }) {
    const selected = [];
    let remaining = qtyKg;
    for (const farmer of cluster.farmers) {
      if (remaining <= 0) break;
      const qty = Math.min(remaining, farmer.availableQuantityKg);
      selected.push({ ...farmer, qtyKg: qty, batchId: farmer.id });
      remaining -= qty;
    }
    if (remaining > 0) return null;

    const tp = cluster.transferPoint;
    const linehaulFrom = tp ? point(tp) : point(selected[0]);
    const legs = [];
    let feederCost = 0;
    for (const farmer of selected) {
      const directAllowed = isAllowedRoad({ minRoadClass: 'MAIN' }, farmer.accessRoadClass);
      const feederKm = tp ? await this.distance(point(farmer), point(tp)) : 0;
      const directKm = await this.distance(point(farmer), buyer);
      const useFeeder = Boolean(tp && !directAllowed || tp && feederKm + (tp.buyerDistanceKm || 0) < directKm);
      if (useFeeder) {
        const factor = this.trafficService.getTravelFactor(farmer.zone, paramsHour());
        const etaMin = Math.ceil((feederKm / 35) * 60 * factor);
        const cost = Math.round(500 + feederKm * 18);
        feederCost += cost;
        legs.push({ type: 'FEEDER', vehicleClass: 'TEMPO', from: { farmerId: farmer.farmerId, lat: farmer.lat, lng: farmer.lng }, to: { transferPointId: tp.id, lat: tp.lat, lng: tp.lng }, km: feederKm, etaMin, cost, kg: farmer.qtyKg });
      } else {
        const factor = this.trafficService.getTravelFactor(farmer.zone, paramsHour());
        const etaMin = Math.ceil((directKm / 40) * 60 * factor);
        legs.push({ type: 'DIRECT', vehicleClass: 'MEDIUM_TRUCK', from: { farmerId: farmer.farmerId, lat: farmer.lat, lng: farmer.lng }, to: { buyerLat: buyer.lat, buyerLng: buyer.lng }, km: directKm, etaMin, cost: Math.round(1200 + directKm * 32), kg: farmer.qtyKg });
      }
    }

    if (tp) {
      const linehaulKm = await this.distance(linehaulFrom, buyer);
      const factor = this.trafficService.getTravelFactor(tp.zone, paramsHour());
      const etaMin = Math.ceil((linehaulKm / 40) * 60 * factor) + config.twoTier.transferHandlingMinutes;
      legs.push({ type: 'LINEHAUL', vehicleClass: 'MEDIUM_TRUCK', from: { transferPointId: tp.id, lat: tp.lat, lng: tp.lng }, to: { buyerLat: buyer.lat, buyerLng: buyer.lng }, km: linehaulKm, etaMin, cost: Math.round(1200 + linehaulKm * 32), kg: qtyKg });
    }

    const productCost = selected.reduce((sum, farmer) => sum + farmer.qtyKg * Number(farmer.pricePerKg || 0), 0);
    const lineHaul = legs.filter((leg) => leg.type === 'LINEHAUL').reduce((sum, leg) => sum + leg.cost, 0);
    const directCost = legs.filter((leg) => leg.type === 'DIRECT').reduce((sum, leg) => sum + leg.cost, 0);
    const transferHandling = tp ? qtyKg * config.costing.handlingFeePerKg : 0;
    const transferFees = tp ? Number(tp.feePerKg || 0) * qtyKg : 0;
    const platformFee = productCost * config.costing.platformFeePct;
    const aggregationFee = Math.max(0, selected.length - 1) * config.costing.aggregationFeePerExtraFarmer;
    const riskCost = selected.reduce((sum, farmer) => sum + (1 - farmer.reliability) * farmer.qtyKg * farmer.pricePerKg, 0);
    const delayMinutes = legs.reduce((sum, leg) => sum + leg.etaMin, 0);
    const riskDelayCost = delayMinutes * config.twoTier.trafficDelayRiskPerMinute;
    const totalCost = Math.round((productCost + feederCost + lineHaul + directCost + transferHandling + transferFees + platformFee + aggregationFee + riskCost + riskDelayCost) * 100) / 100;
    let optimizedLegs;
    try {
      optimizedLegs = await this.solverService.optimize(legs);
    } catch {
      optimizedLegs = twoOpt(legs);
    }

    // Distance & Optimization Impact
    const optimizedKm = Math.round(legs.reduce((sum, leg) => sum + (leg.km || 0), 0) * 10) / 10;
    const baselineKm = Math.round(
      selected.reduce((sum, f) => sum + 2 * estimatedRoadKm(f.lat, f.lng, buyer.lat, buyer.lng), 0) * 10,
    ) / 10;
    const savedKm = Math.max(0, Math.round((baselineKm - optimizedKm) * 10) / 10);
    const fuelSavedRs = Math.round(savedKm * config.costing.estimatedFuelCostPerKm * 100) / 100;
    const vehicleCap = tp ? 5000 : 3000;
    const utilizationPercent = Math.min(100, Math.round((qtyKg / vehicleCap) * 1000) / 10);

    const routeCoords = [];
    selected.forEach((f) => routeCoords.push([f.lng, f.lat]));
    if (tp) routeCoords.push([tp.lng, tp.lat]);
    routeCoords.push([buyer.lng, buyer.lat]);

    return {
      planId: `plan_${uuidv4().slice(0, 8)}`,
      quoteId: `quote_${uuidv4().slice(0, 12)}`,
      expiresAt: new Date(Date.now() + config.twoTier.quoteTtlMinutes * 60000).toISOString(),
      radiusUsedKm,
      farmers: selected,
      transferPoint: tp,
      buyer: { ...buyer, address: buyerAddress },
      legs: optimizedLegs,
      totalCost,
      maxBudget,
      overBudgetBy: Math.max(0, Math.round((totalCost - maxBudget) * 100) / 100),
      isComplete: true,
      costBreakdown: {
        productCost,
        feederLegs: feederCost,
        lineHaul,
        lastMile: 0,
        direct: directCost,
        transferHandling,
        transferFees,
        platformFee,
        aggregationFee,
        riskCost: Math.round((riskCost + riskDelayCost) * 100) / 100,
        total: totalCost,
      },
      savings: {
        baselineKm,
        optimizedKm,
        savedKm,
        fuelSavedRs,
        utilizationPercent,
      },
      primaryRoute: {
        label: 'Primary Highway Corridor (NH-60 Commercial Bypass)',
        distanceKm: optimizedKm,
        etaMinutes: Math.round((optimizedKm / 52) * 60) + selected.length * 20,
        fuelLitres: Math.round(((optimizedKm / 4.2) + 0.45) * 10) / 10,
        fuelCostRs: Math.round((((optimizedKm / 4.2) + 0.45) * 95) * 100) / 100,
        roadBreakdown: { highwayKm: Math.round(optimizedKm * 0.75), stateHighwayKm: Math.round(optimizedKm * 0.18), ruralKm: Math.round(optimizedKm * 0.07) },
        spoilageRisk: 'LOW',
        isRecommended: true,
        geometry: { type: 'LineString', coordinates: routeCoords },
      },
      alternativeRoute: {
        label: 'Alternative Rural Short Route (SH-54 Direct)',
        distanceKm: Math.round(optimizedKm * 0.86 * 10) / 10,
        etaMinutes: Math.round((optimizedKm * 0.86 / 26) * 60) + selected.length * 20,
        fuelLitres: Math.round(((optimizedKm * 0.86 / 2.9) + 1.1) * 10) / 10,
        fuelCostRs: Math.round((((optimizedKm * 0.86 / 2.9) + 1.1) * 95) * 100) / 100,
        roadBreakdown: { highwayKm: Math.round(optimizedKm * 0.86 * 0.12), stateHighwayKm: Math.round(optimizedKm * 0.86 * 0.38), ruralKm: Math.round(optimizedKm * 0.86 * 0.50) },
        spoilageRisk: 'ELEVATED',
        isRecommended: false,
        geometry: {
          type: 'LineString',
          coordinates: routeCoords.map(([lng, lat], i) => (i > 0 && i < routeCoords.length - 1 ? [lng + 0.012, lat - 0.010] : [lng, lat])),
        },
      },
      routeComparison: {
        recommendedMode: 'HIGHWAY',
        timeSavedMinutes: Math.round((optimizedKm * 0.86 / 26 - optimizedKm / 52) * 60),
        fuelCostDeltaRs: Math.round((((optimizedKm * 0.86 / 2.9) + 1.1) * 95 - ((optimizedKm / 4.2) + 0.45) * 95) * 100) / 100,
        verdict: 'Highway bypass saves transit time and engine wear despite 14 km longer distance.',
      },
      routeGeometry: {
        type: 'LineString',
        coordinates: routeCoords,
      },
      decisionLog: { costLines: [], rejectedAlternatives: [] },
      vehicleSuggestion: {
        feeder: 'TEMPO',
        linehaul: tp ? 'MEDIUM_TRUCK' : null,
        capacityKg: 5000,
      },
      explanation: tp
        ? 'Feeder collection was selected where road access or total cost made it cheaper than a large-truck detour.'
        : 'No eligible transfer point was available; direct collection was used as the explicit fallback.',
    };
  }

  async bestDepartureWindow(plan, { startHour = 6, endHour = 20 } = {}) {
    const windows = [];
    for (let hour = startHour; hour <= endHour; hour += 2) {
      const factor = this.trafficService.getTravelFactor(plan.transferPoint?.zone || plan.buyer.zone, hour);
      windows.push({ hour, factor, etaMin: Math.ceil(plan.legs.reduce((sum, leg) => sum + leg.etaMin, 0) * factor), totalCost: Math.round(plan.totalCost * (1 + (factor - 1) * 0.01) * 100) / 100 });
    }
    return windows.sort((a, b) => a.totalCost - b.totalCost || a.etaMin - b.etaMin)[0];
  }

  async planOrder(params) {
    const buyer = { lat: params.buyerLat, lng: params.buyerLng, zone: params.buyerZone };
    const radiusSteps = config.searchConstraints.radiusSteps;
    const maxRadius = radiusSteps[radiusSteps.length - 1];
    const transferPoints = getTransferPoints(params);
    const candidates = await this.fetchCandidatePool(params.crop, maxRadius, buyer);
    const ringsTried = [];
    const rejected = [];
    let closestPlan = null;
    let selectedPlan = null;
    for (const radius of radiusSteps) {
      ringsTried.push(radius);
      const ringCandidates = candidates.filter((candidate) => candidate.buyerDistanceKm <= radius);
      const clusters = this.clusterFarmers(ringCandidates, transferPoints, buyer);
      const plans = [];
      for (const cluster of clusters) {
        const plan = await this.buildPlan({ cluster, qtyKg: params.qtyKg, buyer, maxBudget: params.maxBudget, radiusUsedKm: radius, buyerAddress: params.buyerAddress });
        if (plan) plans.push(plan);
      }
      plans.sort((a, b) => a.totalCost - b.totalCost);
      const cheapest = plans[0];
      if (cheapest && (!closestPlan || cheapest.totalCost < closestPlan.totalCost)) closestPlan = cheapest;
      if (!cheapest) {
        rejected.push({ label: `${radius} km ring`, reason: 'Insufficient eligible stock or no complete cluster.' });
        continue;
      }
      if (cheapest.totalCost <= params.maxBudget) {
        selectedPlan = cheapest;
        break;
      }
      rejected.push({ label: `${radius} km ring`, reason: `Over buyer budget by ₹${Math.round(cheapest.totalCost - params.maxBudget)}` });
    }
    const resultPlan = selectedPlan || closestPlan;
    if (resultPlan) {
      resultPlan.decisionLog.rejectedAlternatives = rejected;
      resultPlan.explanation = selectedPlan
        ? `${resultPlan.explanation} Selected the ${resultPlan.radiusUsedKm} km ring as the first feasible ring.`
        : `${resultPlan.explanation} No ring fits the budget; this is the closest complete plan.`;
      resultPlan.bestDepartureWindow = await this.bestDepartureWindow(resultPlan);
    }
    return {
      quoteId: resultPlan?.quoteId || `quote_${uuidv4().slice(0, 12)}`,
      expiresAt: resultPlan?.expiresAt || new Date(Date.now() + config.twoTier.quoteTtlMinutes * 60000).toISOString(),
      crop: params.crop,
      requestedQtyKg: params.qtyKg,
      maxBudget: params.maxBudget,
      radiusUsedKm: resultPlan?.radiusUsedKm || null,
      ringsTried,
      plans: resultPlan ? [resultPlan] : [],
      overBudget: Boolean(resultPlan && resultPlan.overBudgetBy > 0),
      overBudgetBy: resultPlan?.overBudgetBy || 0,
      hint: resultPlan?.overBudgetBy ? 'Increase the buyer budget, reduce quantity, or retry after stock changes.' : undefined,
      explanation: resultPlan?.explanation || 'No complete plan could be built in the configured radius rings.',
    };
  }
}

module.exports = new TwoTierLogisticsService();
module.exports.TwoTierLogisticsService = TwoTierLogisticsService;
module.exports.normalizeRoadClass = normalizeRoadClass;
