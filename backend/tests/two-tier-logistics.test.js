const fs = require('fs');
const path = require('path');
const { TwoTierLogisticsService } = require('../src/services/twoTierLogistics.service');

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'prisma', 'logistics-mock-data-v2.json'), 'utf8'),
);

const makeService = (overrides = {}) => new TwoTierLogisticsService({
  repository: {
    findCandidatesByCrop: async () => fixture.farmers,
  },
  trafficService: {
    getTravelFactor: overrides.getTravelFactor || (() => 1),
  },
  routingService: overrides.routingService,
  solverService: overrides.solverService,
});

const baseRequest = {
  crop: 'Onion',
  qtyKg: 1800,
  maxBudget: 100000,
  buyerLat: 18.5089,
  buyerLng: 73.9260,
  buyerAddress: 'Pune APMC',
  transferPoints: fixture.transferPoints,
};

describe('Two-tier logistics scenarios S9-S13', () => {
  it('S9: stops at the first feasible radius ring', async () => {
    const result = await makeService().planOrder(baseRequest);
    expect(result.ringsTried[0]).toBe(15);
    expect(result.radiusUsedKm).toBeGreaterThan(0);
    expect(result.explanation).toMatch(/first feasible ring/i);
  });

  it('S10: uses a feeder leg for lane-access farmers', async () => {
    const result = await makeService().planOrder(baseRequest);
    expect(result.plans[0].legs.some((leg) => leg.type === 'FEEDER')).toBe(true);
  });

  it('S11: returns the cheapest departure window using traffic factors', async () => {
    const service = makeService({
      getTravelFactor: (_zone, hour) => (hour === 14 ? 1 : 1.6),
    });
    const result = await service.planOrder(baseRequest);
    expect(result.plans[0].bestDepartureWindow.hour).toBe(14);
  });

  it('S12: returns an over-budget closest plan with a hint', async () => {
    const result = await makeService().planOrder({ ...baseRequest, maxBudget: 1000 });
    expect(result.overBudget).toBe(true);
    expect(result.overBudgetBy).toBeGreaterThan(0);
    expect(result.hint).toMatch(/budget/i);
  });

  it('S13: falls back to Haversine when the routing service fails', async () => {
    const result = await makeService({
      routingService: {
        routeDistanceKm: async () => {
          throw new Error('OSRM unavailable');
        },
      },
    }).planOrder(baseRequest);
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0].legs.every((leg) => Number.isFinite(leg.km))).toBe(true);
  });

  it('S13: falls back to Node 2-opt when the solver fails', async () => {
    const result = await makeService({
      solverService: {
        optimize: async () => {
          throw new Error('Python solver unavailable');
        },
      },
    }).planOrder(baseRequest);
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0].legs.length).toBeGreaterThan(0);
  });

  it('S13: falls back to direct delivery when no transfer point is available', async () => {
    const result = await makeService().planOrder({ ...baseRequest, transferPoints: [] });
    expect(result.plans[0].transferPoint).toBeNull();
    expect(result.plans[0].legs.some((leg) => leg.type === 'DIRECT')).toBe(true);
  });
});
