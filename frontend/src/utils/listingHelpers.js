/**
 * SasyaVahini Produce Listing Helper Functions
 * Pure calculation and validation logic shared across Quick Listing and Detailed Listing
 */

export const INITIAL_CROPS = [
  { id: 'Tomato', name: 'Tomato', vernacular: 'टमाटर', category: 'Vegetables', icon: '🍅', defaultPrice: 24 },
  { id: 'Onion', name: 'Onion', vernacular: 'प्याज', category: 'Vegetables', icon: '🧅', defaultPrice: 28 },
  { id: 'Potato', name: 'Potato', vernacular: 'आलू', category: 'Vegetables', icon: '🥔', defaultPrice: 20 },
  { id: 'Paddy', name: 'Paddy / Rice', vernacular: 'धान / चावल', category: 'Grains', icon: '🌾', defaultPrice: 32 },
  { id: 'Wheat', name: 'Wheat', vernacular: 'गेहूं', category: 'Grains', icon: '🌾', defaultPrice: 26 },
  { id: 'Maize', name: 'Maize / Corn', vernacular: 'मक्का', category: 'Grains', icon: '🌽', defaultPrice: 22 },
  { id: 'Leafy vegetables', name: 'Leafy Vegetables', vernacular: 'हरी सब्जियां', category: 'Vegetables', icon: '🥬', defaultPrice: 18 },
  { id: 'Other', name: 'Other Produce', vernacular: 'अन्य फसल', category: 'Vegetables', icon: '🌱', defaultPrice: 25 }
];

/**
 * Convert kilograms to quintals (1 quintal = 100 kg)
 */
export function kgToQuintals(quantityKg) {
  const q = parseFloat(quantityKg);
  if (isNaN(q) || q <= 0) return '0.00';
  return (q / 100).toFixed(2);
}

/**
 * Calculate estimated gross listing valuation
 * Gross Value = Quantity (kg) * Asking Price (₹/kg)
 */
export function calculateGrossValue(quantityKg, askingPricePerKg) {
  const qty = parseFloat(quantityKg);
  const price = parseFloat(askingPricePerKg);
  if (isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) return 0;
  return Math.round(qty * price);
}

/**
 * Translate quick harvest selection into ISO date string (YYYY-MM-DD)
 */
export function translateHarvestDate(option, customDate = null, baseDate = new Date()) {
  const d = new Date(baseDate);
  if (option === 'TODAY') {
    return d.toISOString().split('T')[0];
  } else if (option === 'IN_3_DAYS') {
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  } else if (option === 'NEXT_WEEK') {
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  } else if (option === 'CUSTOM' && customDate) {
    return customDate;
  }
  return d.toISOString().split('T')[0];
}

/**
 * Validate produce listing inputs
 */
export function validateProduceListing(data) {
  const errors = {};
  const cropName = data.cropName === 'Other' ? (data.customCropName || '').trim() : (data.cropName || '').trim();
  const qty = parseFloat(data.quantityKg);
  const askingPrice = parseFloat(data.askingPricePerKg);
  const minPrice = data.minPricePerKg ? parseFloat(data.minPricePerKg) : askingPrice * 0.9;

  if (!cropName) {
    errors.cropName = 'Crop name is required.';
  }

  if (isNaN(qty) || qty <= 0) {
    errors.quantityKg = 'Quantity must be a positive number greater than 0.';
  } else if (qty > 100000) {
    errors.quantityKg = 'Quantity exceeds maximum single-lot limit (100,000 kg).';
  }

  if (isNaN(askingPrice) || askingPrice <= 0) {
    errors.askingPricePerKg = 'Asking price must be greater than ₹0.';
  }

  if (isNaN(minPrice) || minPrice <= 0) {
    errors.minPricePerKg = 'Minimum acceptable price must be greater than ₹0.';
  } else if (minPrice > askingPrice) {
    errors.minPricePerKg = 'Minimum acceptable price cannot exceed the asking price.';
  }

  if (!data.harvestDate) {
    errors.harvestDate = 'Harvest date is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
