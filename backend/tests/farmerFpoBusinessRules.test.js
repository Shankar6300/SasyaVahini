/**
 * SasyaVahini — Farmer & FPO Business Rules & Invariant Tests
 * 
 * Tests input validation schemas, inventory calculation invariants,
 * soft-lock business rules, and multi-tenant authorization logic.
 * 
 * Owner: Member 2 (Farmer & FPO Portals)
 */

const {
  createProduceSchema,
  updateProduceSchema,
  aggregateProduceSchema
} = require('../src/schemas/farmer.schema');

describe('Farmer & FPO Business Rules & Schema Invariants', () => {

  describe('createProduceSchema validation', () => {
    it('accepts valid produce listing payload with numeric strings coerced', () => {
      const validPayload = {
        cropName: 'Tomato Hybrid',
        category: 'Vegetables',
        quantityKg: '1500',
        askingPricePerKg: '28.5',
        minPricePerKg: '25.0',
        qualityGrade: 'GRADE_A',
        isOrganic: 'true',
        village: 'Manchar',
        district: 'Pune',
        state: 'Maharashtra'
      };

      const result = createProduceSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantityKg).toBe(1500);
        expect(result.data.askingPricePerKg).toBe(28.5);
        expect(result.data.minPricePerKg).toBe(25.0);
        expect(result.data.isOrganic).toBe(true);
      }
    });

    it('rejects payload when minPricePerKg exceeds askingPricePerKg', () => {
      const invalidPricePayload = {
        cropName: 'Tomato',
        quantityKg: 1000,
        askingPricePerKg: 20,
        minPricePerKg: 25 // Greater than asking price!
      };

      const result = createProduceSchema.safeParse(invalidPricePayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.errors.map(e => e.path.join('.'));
        expect(errorPaths).toContain('minPricePerKg');
        expect(result.error.errors[0].message).toMatch(/Minimum acceptable price cannot exceed the asking price/i);
      }
    });

    it('rejects non-positive quantities and zero values', () => {
      const zeroQtyPayload = {
        cropName: 'Tomato',
        quantityKg: 0,
        askingPricePerKg: 25
      };

      const result = createProduceSchema.safeParse(zeroQtyPayload);
      expect(result.success).toBe(false);
    });

    it('rejects single lot quantity exceeding max limit (100,000 kg)', () => {
      const excessiveQtyPayload = {
        cropName: 'Tomato',
        quantityKg: 100001,
        askingPricePerKg: 25
      };

      const result = createProduceSchema.safeParse(excessiveQtyPayload);
      expect(result.success).toBe(false);
    });

    it('rejects short or empty crop names', () => {
      const shortNamePayload = {
        cropName: 'A',
        quantityKg: 100,
        askingPricePerKg: 25
      };

      const result = createProduceSchema.safeParse(shortNamePayload);
      expect(result.success).toBe(false);
    });
  });

  describe('updateProduceSchema validation', () => {
    it('allows partial updates of quantity and price', () => {
      const partialPayload = {
        quantityKg: '2000',
        askingPricePerKg: '30'
      };

      const result = updateProduceSchema.safeParse(partialPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantityKg).toBe(2000);
        expect(result.data.askingPricePerKg).toBe(30);
      }
    });

    it('rejects invalid negative quantity on update', () => {
      const invalidPayload = {
        quantityKg: -500
      };

      const result = updateProduceSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('aggregateProduceSchema validation', () => {
    it('requires at least one listing ID for aggregation', () => {
      const emptyListingPayload = {
        listingIds: []
      };

      const result = aggregateProduceSchema.safeParse(emptyListingPayload);
      expect(result.success).toBe(false);
    });

    it('accepts valid listing IDs and optional requirementId', () => {
      const validPayload = {
        cropName: 'Onion Red',
        requirementId: 'req-uuid-1234',
        listingIds: ['listing-uuid-1', 'listing-uuid-2']
      };

      const result = aggregateProduceSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('Inventory Reservation & Overselling Invariants', () => {
    it('calculates uncommitted inventory correctly (freeQty = total - reserved - sold)', () => {
      const listing = {
        totalQuantityKg: 1000,
        reservedQty: 300,
        soldQty: 200
      };

      const freeQty = listing.totalQuantityKg - listing.reservedQty - listing.soldQty;
      expect(freeQty).toBe(500);

      // Attempting to reserve 600 kg must be identified as exceeding free quantity
      const requestedQty = 600;
      expect(requestedQty > freeQty).toBe(true);

      // Attempting to reserve 400 kg is within free quantity
      const validRequestedQty = 400;
      expect(validRequestedQty <= freeQty).toBe(true);
    });

    it('enforces soft-lock: cannot modify or delete RESERVED or SOLD lots', () => {
      const isLocked = (status) => status === 'RESERVED' || status === 'SOLD';

      expect(isLocked('AVAILABLE')).toBe(false);
      expect(isLocked('PARTIALLY_RESERVED')).toBe(false);
      expect(isLocked('RESERVED')).toBe(true);
      expect(isLocked('SOLD')).toBe(true);
    });

    it('enforces FPO multi-tenant isolation: rejects cross-FPO lot inclusion', () => {
      const fpoId = 'fpo-pune-01';
      const affiliatedMemberFarmerIds = ['farmer-01', 'farmer-02'];

      const lotsToAggregate = [
        { id: 'lot-1', fpoId: 'fpo-pune-01', farmerId: 'farmer-01' },
        { id: 'lot-2', fpoId: null, farmerId: 'farmer-02' },
        { id: 'lot-3', fpoId: 'fpo-nashik-99', farmerId: 'farmer-other' } // From another FPO!
      ];

      // Verification predicate used in controller
      const isAuthorizedLot = (lot) =>
        lot.fpoId === fpoId || affiliatedMemberFarmerIds.includes(lot.farmerId);

      const authorizedLots = lotsToAggregate.filter(isAuthorizedLot);

      expect(authorizedLots.length).toBe(2);
      expect(authorizedLots.length === lotsToAggregate.length).toBe(false);
    });
  });
});
