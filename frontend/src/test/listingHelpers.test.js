import { describe, it, expect } from 'vitest';
import {
  kgToQuintals,
  calculateGrossValue,
  translateHarvestDate,
  validateProduceListing
} from '../utils/listingHelpers';

describe('Farmer Produce Listing Helpers', () => {
  it('converts kilograms to quintals accurately (1 quintal = 100 kg)', () => {
    expect(kgToQuintals(100)).toBe('1.00');
    expect(kgToQuintals(1250)).toBe('12.50');
    expect(kgToQuintals(0)).toBe('0.00');
    expect(kgToQuintals(-50)).toBe('0.00');
  });

  it('calculates gross lot valuation accurately', () => {
    expect(calculateGrossValue(1000, 25)).toBe(25000);
    expect(calculateGrossValue(500, 32.5)).toBe(16250);
    expect(calculateGrossValue(0, 25)).toBe(0);
  });

  it('translates harvest date options correctly', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(translateHarvestDate('TODAY')).toBe(today);
    expect(translateHarvestDate('CUSTOM', '2026-11-15')).toBe('2026-11-15');
  });

  it('validates produce listing inputs and catches invalid quantities and prices', () => {
    const validData = {
      cropName: 'Tomato',
      quantityKg: '1500',
      askingPricePerKg: '24',
      minPricePerKg: '20',
      harvestDate: '2026-11-01'
    };
    expect(validateProduceListing(validData).isValid).toBe(true);

    const invalidData = {
      cropName: '',
      quantityKg: '-10',
      askingPricePerKg: '0',
      minPricePerKg: '10',
      harvestDate: ''
    };
    const result = validateProduceListing(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.cropName).toBeDefined();
    expect(result.errors.quantityKg).toBeDefined();
    expect(result.errors.askingPricePerKg).toBeDefined();
    expect(result.errors.harvestDate).toBeDefined();
  });
});