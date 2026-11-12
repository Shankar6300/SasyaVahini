/**
 * SasyaVahini Produce Listing Helper Functions
 * Pure calculation and validation logic shared across Quick Listing and Detailed Listing
 */

export const INITIAL_CROPS = [
  { id: 'Tomato', name: 'Tomato', vernacular: 'टमाटर', category: 'Vegetables', icon: '🍅', defaultPrice: 30 },
  { id: 'Onion', name: 'Onion', vernacular: 'प्याज', category: 'Vegetables', icon: '🧅', defaultPrice: 54 },
  { id: 'Potato', name: 'Potato', vernacular: 'आलू', category: 'Vegetables', icon: '🥔', defaultPrice: 21 },
  { id: 'Rice', name: 'Rice / Paddy', vernacular: 'चावल / धान', category: 'Grains', icon: '🌾', defaultPrice: 45 },
  { id: 'Wheat', name: 'Wheat', vernacular: 'गेहूं', category: 'Grains', icon: '🌾', defaultPrice: 28 },
  { id: 'Maize', name: 'Maize / Corn', vernacular: 'मक्का', category: 'Grains', icon: '🌽', defaultPrice: 26 },
  { id: 'Chilli', name: 'Chilli', vernacular: 'मिर्च', category: 'Spices', icon: '🌶️', defaultPrice: 48 },
  { id: 'Garlic', name: 'Garlic', vernacular: 'लहसुन', category: 'Spices', icon: '🧄', defaultPrice: 165 },
  { id: 'Ginger', name: 'Ginger', vernacular: 'अदरक', category: 'Spices', icon: '🫚', defaultPrice: 92 },
  { id: 'Turmeric', name: 'Turmeric', vernacular: 'हल्दी', category: 'Spices', icon: '🌿', defaultPrice: 155 },
  { id: 'Soybean', name: 'Soybean', vernacular: 'सोयाबीन', category: 'Oilseeds', icon: '🌱', defaultPrice: 45 },
  { id: 'Cotton', name: 'Cotton', vernacular: 'कपास', category: 'Commercial', icon: '☁️', defaultPrice: 88 },
  { id: 'Sugarcane', name: 'Sugarcane', vernacular: 'गन्ना', category: 'Commercial', icon: '🎋', defaultPrice: 4 },
  { id: 'Banana', name: 'Banana', vernacular: 'केला', category: 'Fruits', icon: '🍌', defaultPrice: 48 },
  { id: 'Grapes', name: 'Grapes', vernacular: 'अंगूर', category: 'Fruits', icon: '🍇', defaultPrice: 105 },
  { id: 'Pomegranate', name: 'Pomegranate', vernacular: 'अनार', category: 'Fruits', icon: '🍎', defaultPrice: 140 },
  { id: 'Mango', name: 'Mango', vernacular: 'आम', category: 'Fruits', icon: '🥭', defaultPrice: 120 },
  { id: 'Papaya', name: 'Papaya', vernacular: 'पपीता', category: 'Fruits', icon: '🍈', defaultPrice: 26 },
  { id: 'Lemon', name: 'Lemon', vernacular: 'नींबू', category: 'Fruits', icon: '🍋', defaultPrice: 56 },
  { id: 'Capsicum', name: 'Capsicum', vernacular: 'शिमला मिर्च', category: 'Vegetables', icon: '🫑', defaultPrice: 46 },
  { id: 'Brinjal', name: 'Brinjal / Eggplant', vernacular: 'बैंगन', category: 'Vegetables', icon: '🍆', defaultPrice: 22 },
  { id: 'Cauliflower', name: 'Cauliflower', vernacular: 'फूलगोभी', category: 'Vegetables', icon: '🥦', defaultPrice: 20 },
  { id: 'Cabbage', name: 'Cabbage', vernacular: 'पत्तागोभी', category: 'Vegetables', icon: '🥬', defaultPrice: 16 },
  { id: 'Cucumber', name: 'Cucumber', vernacular: 'खीरा', category: 'Vegetables', icon: '🥒', defaultPrice: 22 },
  { id: 'Other', name: 'Other Produce', vernacular: 'अन्य फसल', category: 'Vegetables', icon: '🌱', defaultPrice: 25 },
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
