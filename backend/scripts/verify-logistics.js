/**
 * SasyaVahini — Standalone Logistics Verification Runner
 * Runs all unit verification checks directly using Node.js assert.
 *
 * Owner: Member 4
 */

const assert = require('assert');
const { haversineKm, estimatedRoadKm } = require('../src/utils/geo');
const sourcingService = require('../src/services/sourcing.service');
const vehicleService = require('../src/services/vehicle.service');
const logisticsService = require('../src/services/logistics.service');

async function runAllChecks() {
  console.log('🧪 Starting Logistics Core Unit Checks...\n');

  // 1. Geodesic & Distance Math
  console.log('1. Checking Geodesic Math...');
  assert.strictEqual(haversineKm(18.5204, 73.8567, 18.5204, 73.8567), 0, 'Zero distance failed');
  const d = haversineKm(18.5204, 73.8567, 18.7606, 73.8636);
  assert(d > 25 && d < 35, `Direct distance ${d} not in range [25, 35]`);
  const r = estimatedRoadKm(18.5204, 73.8567, 18.7606, 73.8636);
  assert(Math.abs(r - d * 1.3) < 0.1, 'Road distance detour factor failed');
  console.log('   ✅ Geodesic Math Passed.');

  // 2. Candidate Matching & Normalization
  console.log('2. Checking Candidate Match Scoring...');
  const candidates = [
    { id: 'c1', farmerId: 'f1', pricePerKg: 20, distKm: 20, availableQuantityKg: 1000, reliability: 0.9 },
    { id: 'c2', farmerId: 'f2', pricePerKg: 30, distKm: 60, availableQuantityKg: 500, reliability: 0.8 },
  ];
  const scored = sourcingService.computeMatchScores(candidates, 1000, 100);
  assert(scored[0].matchScore > scored[1].matchScore, 'Candidate ranking failed');
  assert.strictEqual(scored[0].priceScore, 1.0, 'Best price score should be 1.0');
  assert.strictEqual(scored[1].priceScore, 0.0, 'Worst price score should be 0.0');
  console.log('   ✅ Candidate Matching Passed.');

  // 3. TLC Cost Breakdown
  console.log('3. Checking Total Landed Cost (TLC)...');
  const plan = {
    farmers: [
      { farmerId: 'f1', batchId: 'b1', qtyKg: 1000, pricePerKg: 20, grade: 'GRADE_A', reliability: 0.9, lat: 18.7606, lng: 73.8636 },
      { farmerId: 'f2', batchId: 'b2', qtyKg: 1000, pricePerKg: 22, grade: 'GRADE_A', reliability: 0.95, lat: 18.8470, lng: 73.9100 },
    ],
  };
  const costed = sourcingService.costPlan(plan, 2000, 18.5089, 73.9260, 'Hadapsar Market');
  assert.strictEqual(costed.costBreakdown.productCost, 42000, 'Product cost calculation failed');
  assert.strictEqual(costed.costBreakdown.handlingCost, 1000, 'Handling cost calculation failed');
  assert.strictEqual(costed.costBreakdown.platformFee, 840, 'Platform fee calculation failed');
  assert.strictEqual(costed.costBreakdown.aggregationFee, 350, 'Aggregation fee calculation failed');
  assert.strictEqual(costed.costBreakdown.riskCost, 3100, 'Risk cost calculation failed');
  assert(costed.totalCost > 45000, 'Total cost calculation failed');
  console.log('   ✅ Total Landed Cost Passed.');

  // 4. Single vs Multi Decision Logic
  console.log('4. Checking Single vs Multi Sourcing Decision Logic...');
  const singleResult = await sourcingService.planOrder({
    crop: 'Tomato',
    qtyKg: 1500,
    maxBudget: 60000,
    buyerLat: 18.5089,
    buyerLng: 73.9260,
  });
  assert(singleResult.plans.length > 0, 'No plans generated for 1500 kg');

  const multiResult = await sourcingService.planOrder({
    crop: 'Tomato',
    qtyKg: 4500,
    maxBudget: 200000,
    buyerLat: 18.5089,
    buyerLng: 73.9260,
  });
  assert(multiResult.plans.length > 0, 'No plans generated for 4500 kg');
  assert(multiResult.plans[0].farmers.length > 1, 'Expected multi-farmer plan for 4500 kg');
  console.log('   ✅ Single vs Multi Sourcing Passed.');

  // 5. Over Budget Hint
  console.log('5. Checking Over-Budget Handling...');
  const overBudgetRes = await sourcingService.planOrder({
    crop: 'Tomato',
    qtyKg: 3000,
    maxBudget: 20000,
    buyerLat: 18.5089,
    buyerLng: 73.9260,
  });
  assert.strictEqual(overBudgetRes.overBudget, true, 'Expected overBudget to be true');
  assert(overBudgetRes.overBudgetBy > 0, 'Expected positive overBudgetBy');
  assert(overBudgetRes.hint.includes('Reduce requested quantity'), 'Expected quantity reduction hint');
  console.log('   ✅ Over-Budget Handling Passed.');

  // 6. Vehicle Selection Policy
  console.log('6. Checking Vehicle Selection Policy...');
  const veh = await vehicleService.selectBestVehicle({
    requiredCapacityKg: 1400,
    firstPickupLat: 18.7606,
    firstPickupLng: 73.8636,
  });
  assert(veh !== null, 'No vehicle selected');
  assert(veh.capacityKg >= 1400, 'Vehicle capacity inadequate');
  console.log('   ✅ Vehicle Selection Passed.');

  // 7. Milestone State Machine
  console.log('7. Checking Milestone State Machine...');
  const shipment = await logisticsService.getShipmentById('shp_demo_101');
  shipment.status = 'ASSIGNED';
  let threw = false;
  try {
    await logisticsService.updateMilestone('shp_demo_101', { milestone: 'DELIVERED', deliveryOtp: '492810' });
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Illegal transition ASSIGNED -> DELIVERED was not blocked');
  console.log('   ✅ Milestone State Machine Passed.');

  console.log('\n🎉 ALL LOGISTICS CORE CHECKS PASSED SUCCESSFULLY!\n');
}

runAllChecks().catch((err) => {
  console.error('❌ Check Failed:', err);
  process.exit(1);
});
