/**
 * SasyaVahini — Sourcing & Total Landed Cost (TLC) Engine
 *
 * Core algorithm for intelligent multi-farmer aggregation, explainable costing,
 * constraint satisfaction, and priority-slider multi-criteria ranking.
 *
 * Owner: Member 4
 */

const config = require('../config/logistics.config');
const { batchRepo } = require('../adapters');
const { haversineKm, estimatedRoadKm } = require('../utils/geo');
const logger = require('../utils/logger');

// Grade ordinal rankings
const GRADE_RANKS = {
  GRADE_C: 1,
  GRADE_B: 2,
  GRADE_A: 3,
  ORGANIC_PREMIUM: 4,
};

const GRADE_SCORE_MAP = {
  GRADE_C: 0.5,
  GRADE_B: 0.75,
  GRADE_A: 0.9,
  ORGANIC_PREMIUM: 1.0,
};

class SourcingService {
  /**
   * Main entry point to generate sourcing plans for an order requirement
   * @param {Object} params
   * @param {string} params.crop
   * @param {number} params.qtyKg
   * @param {number} [params.maxBudget]
   * @param {string} [params.minGrade='GRADE_B']
   * @param {number} [params.minReliability=0.70]
   * @param {number} [params.priority=0.5] 0 = lowest price, 1 = best quality
   * @param {number} params.buyerLat
   * @param {number} params.buyerLng
   * @param {string} [params.buyerAddress]
   */
  async planOrder({
    crop,
    qtyKg,
    maxBudget = Infinity,
    minGrade = 'GRADE_B',
    minReliability = 0.70,
    priority = 0.5,
    buyerLat,
    buyerLng,
    buyerAddress = 'Buyer Destination Hub',
  }) {
    logger.info('Generating sourcing plans', { crop, qtyKg, maxBudget, priority });

    // 1. Fetch & Filter Candidate Batches
    const rawBatches = await batchRepo.findCandidatesByCrop(crop);

    const minGradeRank = GRADE_RANKS[minGrade] || 1;
    const maxRadius = config.searchConstraints.maxSearchRadiusKm;

    const candidates = rawBatches
      .filter((b) => {
        const gradeRank = GRADE_RANKS[b.qualityGrade] || 1;
        const reliability = b.farmerReliability ?? 0.85;
        const distToBuyer = haversineKm(buyerLat, buyerLng, b.latitude, b.longitude);

        return (
          b.availableQuantityKg > 0 &&
          gradeRank >= minGradeRank &&
          reliability >= minReliability &&
          distToBuyer <= maxRadius
        );
      })
      .map((b) => {
        const distKm = haversineKm(buyerLat, buyerLng, b.latitude, b.longitude);
        const roadDistKm = estimatedRoadKm(buyerLat, buyerLng, b.latitude, b.longitude);
        return {
          ...b,
          distKm,
          roadDistKm,
          reliability: b.farmerReliability ?? 0.85,
        };
      });

    if (candidates.length === 0) {
      return {
        crop,
        requestedQtyKg: qtyKg,
        maxBudget,
        priority,
        plans: [],
        message: 'No available farmers found matching the required grade, reliability, and radius.',
        overBudget: false,
      };
    }

    // 2. Compute Per-Farmer Normalized MATCH Score
    const scoredCandidates = this.computeMatchScores(candidates, qtyKg, maxRadius);

    // 3. Generate Candidate Plans (Single-Farmer & Multi-Farmer)
    const rawPlans = this.generateCandidatePlans(scoredCandidates, qtyKg, buyerLat, buyerLng);

    // 4. Cost each plan (Total Landed Cost) & Attach Vehicle / Savings
    const costedPlans = rawPlans.map((plan) =>
      this.costPlan(plan, qtyKg, buyerLat, buyerLng, buyerAddress),
    );

    // 5. Constraints Enforcement
    const validPlans = costedPlans.filter((p) => p.isComplete && p.totalCost <= maxBudget);

    // Over-budget handling if no plan meets the buyer budget
    if (validPlans.length === 0) {
      // Find the closest plan by budget
      const closestPlan = [...costedPlans].sort((a, b) => a.totalCost - b.totalCost)[0];
      if (closestPlan) {
        const overBudgetBy = Math.max(0, Math.round((closestPlan.totalCost - maxBudget) * 100) / 100);
        const affordableQty = Math.floor(qtyKg * (maxBudget / closestPlan.totalCost));
        return {
          crop,
          requestedQtyKg: qtyKg,
          maxBudget,
          priority,
          plans: [closestPlan],
          overBudget: true,
          overBudgetBy,
          hint: `Budget exceeded by ₹${overBudgetBy.toLocaleString('en-IN')}. Reduce requested quantity from ${qtyKg} kg to ${affordableQty} kg to fit your ₹${maxBudget.toLocaleString('en-IN')} budget.`,
        };
      }
      return {
        crop,
        requestedQtyKg: qtyKg,
        maxBudget,
        priority,
        plans: [],
        overBudget: false,
        message: 'No feasible sourcing plans could fulfill the requested quantity.',
      };
    }

    // 6. Rank Plans Based on Shifted Weights via Priority Slider
    const rankedPlans = this.rankPlans(validPlans, priority);

    // 7. Label Top Plans: BEST_VALUE, CHEAPEST, BEST_QUALITY
    const labeledPlans = this.labelTopPlans(rankedPlans);

    return {
      crop,
      requestedQtyKg: qtyKg,
      maxBudget,
      priority,
      plans: labeledPlans,
      overBudget: false,
    };
  }

  /**
   * Normalize and calculate match scores for candidate batches
   */
  computeMatchScores(candidates, needQty, maxRadius) {
    const prices = candidates.map((c) => c.pricePerKg);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const { matchingWeights } = config;

    return candidates.map((c) => {
      // Price score: 1.0 = cheapest, 0.0 = highest price
      const price_s = maxPrice === minPrice ? 1.0 : 1 - (c.pricePerKg - minPrice) / (maxPrice - minPrice);
      // Distance score: 1.0 = closest to buyer, 0.0 = at max radius
      const dist_s = Math.max(0, 1 - c.distKm / maxRadius);
      // Quantity coverage score: min(stock, need) / need
      const qty_s = Math.min(c.availableQuantityKg, needQty) / needQty;
      // Delivery freshness score (default 0.95 or harvest date based)
      const delivery_s = 0.95;
      // Reliability score
      const rel_s = c.reliability;

      const rawScore =
        matchingWeights.price * price_s +
        matchingWeights.distance * dist_s +
        matchingWeights.quantity * qty_s +
        matchingWeights.delivery * delivery_s +
        matchingWeights.reliability * rel_s;

      const matchScore = Math.round(rawScore * 1000) / 10; // 0 to 100.0

      return {
        ...c,
        matchScore,
        priceScore: Math.round(price_s * 100) / 100,
        distScore: Math.round(dist_s * 100) / 100,
        qtyScore: Math.round(qty_s * 100) / 100,
      };
    });
  }

  /**
   * Generates candidate single-farmer and greedy multi-farmer plans
   */
  generateCandidatePlans(candidates, needQty, buyerLat, buyerLng) {
    const candidatePlans = [];
    const seenPlanSignatures = new Set();

    // Strategy A: Single-Farmer Plans (every farmer whose stock >= needQty)
    candidates.forEach((c) => {
      if (c.availableQuantityKg >= needQty) {
        const plan = {
          isSingleSource: true,
          farmers: [
            {
              farmerId: c.farmerId,
              batchId: c.id,
              name: c.farmerName,
              village: c.village,
              district: c.district,
              qtyKg: needQty,
              pricePerKg: c.pricePerKg,
              grade: c.qualityGrade,
              reliability: c.reliability,
              matchScore: c.matchScore,
              lat: c.latitude,
              lng: c.longitude,
              pickupSeq: 1,
            },
          ],
        };
        const signature = `single-${c.id}`;
        seenPlanSignatures.add(signature);
        candidatePlans.push(plan);
      }
    });

    // Strategy B: Multi-Farmer Plans (Greedy under 4 orderings)
    const orderings = [
      { name: 'cheapest', sortFn: (a, b) => a.pricePerKg - b.pricePerKg },
      { name: 'nearest', sortFn: (a, b) => a.distKm - b.distKm },
      { name: 'best_score', sortFn: (a, b) => b.matchScore - a.matchScore },
      { name: 'most_reliable', sortFn: (a, b) => b.reliability - a.reliability },
    ];

    const maxStops = config.searchConstraints.maxFarmersPerMultiPlan || 5;

    orderings.forEach(({ name, sortFn }) => {
      const sorted = [...candidates].sort(sortFn);
      let remNeed = needQty;
      const selected = [];

      for (const c of sorted) {
        if (remNeed <= 0 || selected.length >= maxStops) break;
        const takeQty = Math.min(c.availableQuantityKg, remNeed);
        if (takeQty > 0) {
          selected.push({
            farmerId: c.farmerId,
            batchId: c.id,
            name: c.farmerName,
            village: c.village,
            district: c.district,
            qtyKg: takeQty,
            pricePerKg: c.pricePerKg,
            grade: c.qualityGrade,
            reliability: c.reliability,
            matchScore: c.matchScore,
            lat: c.latitude,
            lng: c.longitude,
          });
          remNeed -= takeQty;
        }
      }

      if (remNeed === 0 && selected.length > 0) {
        // Optimize pickup sequence (simple nearest neighbor starting from furthest or buyer-centric)
        const sequenced = this.sequencePickups(selected, buyerLat, buyerLng);
        const signature = sequenced
          .map((s) => s.batchId)
          .sort()
          .join('-');

        if (!seenPlanSignatures.has(signature)) {
          seenPlanSignatures.add(signature);
          candidatePlans.push({
            isSingleSource: sequenced.length === 1,
            farmers: sequenced,
            strategy: name,
          });
        }
      }
    });

    return candidatePlans;
  }

  /**
   * Sort pickup stops in geometric sequence towards buyer
   */
  sequencePickups(stops, buyerLat, buyerLng) {
    if (stops.length <= 1) {
      return stops.map((s, idx) => ({ ...s, pickupSeq: idx + 1 }));
    }

    // Sort by distance to buyer descending (furthest farmer first, consolidating on way to buyer)
    const sorted = [...stops].sort((a, b) => {
      const distA = haversineKm(buyerLat, buyerLng, a.lat, a.lng);
      const distB = haversineKm(buyerLat, buyerLng, b.lat, b.lng);
      return distB - distA;
    });

    return sorted.map((s, idx) => ({
      ...s,
      pickupSeq: idx + 1,
    }));
  }

  /**
   * Calculates Total Landed Cost (TLC) breakdown and road metrics
   */
  costPlan(plan, requestedQtyKg, buyerLat, buyerLng, buyerAddress) {
    const { costing, vehicleTypes } = config;

    const farmerCount = plan.farmers.length;
    const isSingleSource = plan.isSingleSource !== undefined ? plan.isSingleSource : farmerCount === 1;
    const coveredQty = plan.farmers.reduce((sum, f) => sum + f.qtyKg, 0);
    const isComplete = coveredQty >= requestedQtyKg;

    // 1. Product Cost
    const productCost = plan.farmers.reduce((sum, f) => sum + f.pricePerKg * f.qtyKg, 0);

    // 2. Vehicle Selection (Smallest vehicle that fits total qty)
    const vehicleType = this.selectVehicleType(coveredQty);

    // 3. Route Distance & Baseline Distance
    const { optimizedKm, baselineKm, routeCoordinates } = this.estimatePlanRoute(
      plan.farmers,
      buyerLat,
      buyerLng,
    );

    // 4. Transport Cost
    const transportCost = vehicleType.baseFare + optimizedKm * vehicleType.perKmRate;

    // 5. Handling Cost
    const handlingCost = coveredQty * costing.handlingFeePerKg;

    // 6. Platform Facilitation Fee (2% of product cost)
    const platformFee = Math.round(productCost * costing.platformFeePct * 100) / 100;

    // 7. Aggregation Fee (applied per extra farmer beyond the 1st)
    const aggregationFee = farmerCount > 1 ? (farmerCount - 1) * costing.aggregationFeePerExtraFarmer : 0;

    // 8. Risk Cost: Expected loss sum((1 - reliability) * price * qty)
    const riskCost = plan.farmers.reduce((sum, f) => {
      const expectedLoss = (1 - f.reliability) * f.pricePerKg * f.qtyKg;
      return sum + expectedLoss;
    }, 0);

    // 9. GST
    const taxableServices = transportCost + handlingCost + platformFee;
    const gst = Math.round(taxableServices * costing.gstRatePct * 100) / 100;

    // Total Landed Cost
    const totalCost = Math.round(
      (productCost + transportCost + handlingCost + platformFee + aggregationFee + riskCost + gst) * 100,
    ) / 100;

    const effectivePricePerKg = Math.round((totalCost / coveredQty) * 100) / 100;

    // Quality & Reliability Averages
    const avgGradeRank =
      plan.farmers.reduce((sum, f) => sum + (GRADE_RANKS[f.grade] || 2) * f.qtyKg, 0) / coveredQty;
    const avgGrade =
      avgGradeRank >= 3.5
        ? 'ORGANIC_PREMIUM'
        : avgGradeRank >= 2.5
        ? 'GRADE_A'
        : avgGradeRank >= 1.5
        ? 'GRADE_B'
        : 'GRADE_C';

    const avgReliability =
      Math.round(
        (plan.farmers.reduce((sum, f) => sum + f.reliability * f.qtyKg, 0) / coveredQty) * 1000,
      ) / 1000;

    // Estimated transit time (at 40 km/h + 20 min per pickup)
    const transitMinutes = Math.round((optimizedKm / config.routing.avgTransitSpeedKmh) * 60);
    const handlingMinutes = farmerCount * 20; // 20 mins per farm loading
    const etaMinutes = transitMinutes + handlingMinutes;

    // Savings Calculation
    const savedKm = Math.max(0, Math.round((baselineKm - optimizedKm) * 10) / 10);
    const fuelSavedRs = Math.round(savedKm * costing.estimatedFuelCostPerKm * 100) / 100;
    const utilizationPercent = Math.min(100, Math.round((coveredQty / vehicleType.capacityKg) * 1000) / 10);

    return {
      ...plan,
      isSingleSource,
      isComplete,
      totalCost,
      effectivePricePerKg,
      avgGrade,
      avgGradeScore: GRADE_SCORE_MAP[avgGrade] || 0.8,
      avgReliability,
      etaMinutes,
      routeKm: optimizedKm,
      costBreakdown: {
        productCost: Math.round(productCost * 100) / 100,
        transportCost: Math.round(transportCost * 100) / 100,
        handlingCost: Math.round(handlingCost * 100) / 100,
        platformFee,
        aggregationFee,
        riskCost: Math.round(riskCost * 100) / 100,
        gst,
        totalCost,
      },
      savings: {
        baselineKm,
        optimizedKm,
        savedKm,
        fuelSavedRs,
        utilizationPercent,
      },
      vehicleSuggestion: {
        vehicleType: vehicleType.type,
        capacityKg: vehicleType.capacityKg,
        targetUtilization: utilizationPercent,
        baseFare: vehicleType.baseFare,
        perKmRate: vehicleType.perKmRate,
      },
      routeGeometry: {
        type: 'LineString',
        coordinates: routeCoordinates,
      },
      destination: {
        address: buyerAddress,
        lat: buyerLat,
        lng: buyerLng,
      },
    };
  }

  /**
   * Select smallest vehicle capable of carrying total load
   */
  selectVehicleType(totalKg) {
    const { vehicleTypes } = config;
    const types = Object.values(vehicleTypes).sort((a, b) => a.capacityKg - b.capacityKg);
    const match = types.find((t) => t.capacityKg >= totalKg);
    return match || types[types.length - 1]; // largest if exceeds all
  }

  /**
   * Estimate sequenced route km vs baseline direct trips km
   */
  estimatePlanRoute(farmers, buyerLat, buyerLng) {
    if (farmers.length === 0) {
      return { optimizedKm: 0, baselineKm: 0, routeCoordinates: [] };
    }

    // Baseline: Separate back-and-forth round trips or individual direct trips from each farmer to buyer
    const baselineKm = Math.round(
      farmers.reduce((sum, f) => sum + 2 * estimatedRoadKm(f.lat, f.lng, buyerLat, buyerLng), 0) * 10,
    ) / 10;

    // Optimized multi-stop sequenced route:
    // Farmer 1 -> Farmer 2 -> ... -> Farmer N -> Buyer
    let optimizedKm = 0;
    const coordinates = [];

    coordinates.push([farmers[0].lng, farmers[0].lat]);

    for (let i = 0; i < farmers.length - 1; i++) {
      const legKm = estimatedRoadKm(farmers[i].lat, farmers[i].lng, farmers[i + 1].lat, farmers[i + 1].lng);
      optimizedKm += legKm;
      coordinates.push([farmers[i + 1].lng, farmers[i + 1].lat]);
    }

    // Final leg: last farmer to buyer
    const lastFarmer = farmers[farmers.length - 1];
    const finalLegKm = estimatedRoadKm(lastFarmer.lat, lastFarmer.lng, buyerLat, buyerLng);
    optimizedKm += finalLegKm;
    coordinates.push([buyerLng, buyerLat]);

    return {
      optimizedKm: Math.round(optimizedKm * 10) / 10,
      baselineKm,
      routeCoordinates: coordinates,
    };
  }

  /**
   * Rank plans using weighted sum modulated by priority slider
   */
  rankPlans(plans, priority) {
    if (plans.length === 0) return [];

    const costs = plans.map((p) => p.totalCost);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);

    const kms = plans.map((p) => p.routeKm);
    const minKm = Math.min(...kms);
    const maxKm = Math.max(...kms);

    // Shift weights via priority slider (0 = cheapest, 1 = best quality)
    // Priority = 0: wCost ~ 0.60, wQuality ~ 0.15, wReliability ~ 0.15, wTime ~ 0.10
    // Priority = 1: wCost ~ 0.15, wQuality ~ 0.50, wReliability ~ 0.25, wTime ~ 0.10
    const wCost = 0.60 * (1 - priority) + 0.15 * priority;
    const wQuality = 0.15 * (1 - priority) + 0.50 * priority;
    const wReliability = 0.15 * (1 - priority) + 0.25 * priority;
    const wTime = 0.10;
    const totalW = wCost + wQuality + wReliability + wTime;

    return plans.map((p) => {
      // Normalized cost score (lower cost = higher score)
      const costScore = maxCost === minCost ? 1.0 : 1 - (p.totalCost - minCost) / (maxCost - minCost);
      // Quality score (0.5 to 1.0)
      const qualityScore = p.avgGradeScore;
      // Reliability score (0 to 1.0)
      const reliabilityScore = p.avgReliability;
      // Time score (lower km/time = higher score)
      const timeScore = maxKm === minKm ? 1.0 : 1 - (p.routeKm - minKm) / (maxKm - minKm);

      const finalScore =
        (wCost * costScore + wQuality * qualityScore + wReliability * reliabilityScore + wTime * timeScore) /
        totalW;

      return {
        ...p,
        scores: {
          costScore: Math.round(costScore * 100) / 100,
          qualityScore: Math.round(qualityScore * 100) / 100,
          reliabilityScore: Math.round(reliabilityScore * 100) / 100,
          timeScore: Math.round(timeScore * 100) / 100,
          finalScore: Math.round(finalScore * 1000) / 1000,
        },
      };
    });
  }

  /**
   * Pick and label up to 3 plans: BEST_VALUE, CHEAPEST, BEST_QUALITY
   */
  labelTopPlans(rankedPlans) {
    if (rankedPlans.length === 0) return [];

    // Sort candidates for each category
    const byBestValue = [...rankedPlans].sort((a, b) => b.scores.finalScore - a.scores.finalScore);
    const byCheapest = [...rankedPlans].sort((a, b) => a.totalCost - b.totalCost);
    const byQuality = [...rankedPlans].sort((a, b) => {
      const qA = a.scores.qualityScore * 0.6 + a.scores.reliabilityScore * 0.4;
      const qB = b.scores.qualityScore * 0.6 + b.scores.reliabilityScore * 0.4;
      return qB - qA;
    });

    const labeled = [];
    const usedSignatures = new Set();

    // 1. BEST_VALUE
    const bestValue = byBestValue[0];
    const bestSig = bestValue.farmers.map((f) => f.batchId).join('-');
    labeled.push({ ...bestValue, planId: 'plan_best_val', label: 'BEST_VALUE' });
    usedSignatures.add(bestSig);

    // 2. CHEAPEST
    const cheapest = byCheapest.find((p) => {
      const sig = p.farmers.map((f) => f.batchId).join('-');
      return !usedSignatures.has(sig);
    });
    if (cheapest) {
      const cheapSig = cheapest.farmers.map((f) => f.batchId).join('-');
      labeled.push({ ...cheapest, planId: 'plan_cheapest', label: 'CHEAPEST' });
      usedSignatures.add(cheapSig);
    }

    // 3. BEST_QUALITY
    const bestQuality = byQuality.find((p) => {
      const sig = p.farmers.map((f) => f.batchId).join('-');
      return !usedSignatures.has(sig);
    });
    if (bestQuality) {
      labeled.push({ ...bestQuality, planId: 'plan_best_quality', label: 'BEST_QUALITY' });
    }

    // If still less than 3 plans and more ranked plans exist, fill with remaining distinct
    if (labeled.length < 3 && rankedPlans.length > labeled.length) {
      const remaining = byBestValue.filter((p) => {
        const sig = p.farmers.map((f) => f.batchId).join('-');
        return !usedSignatures.has(sig);
      });
      remaining.slice(0, 3 - labeled.length).forEach((rem, idx) => {
        labeled.push({
          ...rem,
          planId: `plan_alt_${idx + 1}`,
          label: rem.isSingleSource ? 'DIRECT_SINGLE_FARMER' : 'BALANCED_ALTERNATIVE',
        });
      });
    }

    return labeled;
  }
}

module.exports = new SourcingService();
