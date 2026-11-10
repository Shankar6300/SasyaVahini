/**
 * SasyaVahini — Smart Multilingual Voice-to-Form Extraction Engine
 * 
 * Extracts structured crop listing fields (crop, quantity, price, grade)
 * from natural conversational speech in English, Hindi, and Telugu.
 * 
 * Works completely in-browser without external paid AI services.
 */

// Crop dictionary mapping multilingual names to standard crop catalog names
export const CROP_DICTIONARY = [
  // Tomato
  { standard: 'Tomato', category: 'Vegetables', patterns: [/tomat[oe]s?/i, /టమాట/i, /టమోట/i, /టమాటాలు/i, /టమాటా/i, /टमाटर/i] },
  // Onion
  { standard: 'Onion', category: 'Vegetables', patterns: [/onions?/i, /ఉల్లి/i, /ఉల్లిపాయ/i, /ఉల్లిపాయలు/i, /ఉల్లిగడ్డ/i, /प्याज/i, /कांदा/i] },
  // Potato
  { standard: 'Potato', category: 'Vegetables', patterns: [/potat[oe]s?/i, /బంగాళాదుంప/i, /ఆలుగడ్డ/i, /ఆలూ/i, /आलू/i, /बटाटा/i] },
  // Chilli / Capsicum
  { standard: 'Chilli', category: 'Spices', patterns: [/chilli/i, /chillies/i, /pepper/i, /మిరప/i, /మిర్చి/i, /పచ్చిమిర్చి/i, /ఎండుమిర్చి/i, /मिर्च/i, /हरी मिर्च/i] },
  { standard: 'Shimla Mirch (Capsicum)', category: 'Vegetables', patterns: [/capsicum/i, /బెంగళూరు మిరప/i, /శిమ్లా మిర్చి/i, /शिमला मिर्च/i] },
  // Wheat
  { standard: 'Wheat', category: 'Grains', patterns: [/wheat/i, /గోధుమ/i, /గోధుమలు/i, /गेहूं/i, /गेंहू/i] },
  // Rice / Paddy
  { standard: 'Paddy', category: 'Grains', patterns: [/rice/i, /paddy/i, /వరి/i, /వరి ధాన్యం/i, /బియ్యం/i, /ధాన్యం/i, /धान/i, /चावल/i] },
  // Cotton
  { standard: 'Cotton', category: 'Commercial', patterns: [/cotton/i, /పత్తి/i, /దూది/i, /कपास/i, /रूई/i] },
  // Maize / Corn
  { standard: 'Maize', category: 'Grains', patterns: [/maize/i, /corn/i, /మొక్కజొన్న/i, /జొన్నలు/i, /మొక్క జొన్న/i, /मक्का/i, /भुट्टा/i] },
  // Soybean
  { standard: 'Soybean', category: 'Pulses', patterns: [/soybean/i, /సోయాబీన్/i, /సోయా/i, /सोयाबीन/i] },
  // Leafy Vegetables
  { standard: 'Leafy vegetables', category: 'Vegetables', patterns: [/leafy/i, /spinach/i, /పాలకూర/i, /తోటకూర/i, /ఆకుకూరలు/i, /मेथी/i, /पालक/i, /हरी सब्जियां/i] },
  // Garlic / Ginger
  { standard: 'Garlic', category: 'Spices', patterns: [/garlic/i, /వెల్లుల్లి/i, /లహసన్/i, /लहसुन/i] },
  { standard: 'Ginger', category: 'Spices', patterns: [/ginger/i, /అల్లం/i, /अदरक/i] }
];

// Number word dictionary for Telugu, Hindi, and English words
export const NUMBER_WORDS = {
  // Telugu Numbers
  'సున్నా': 0, 'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5,
  'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9, 'పది': 10,
  'పదకొండు': 11, 'పన్నెండు': 12, 'పదమూడు': 13, 'పద్నాలుగు': 14, 'పదిహేను': 15,
  'పదహారు': 16, 'పదిహేడు': 17, 'పద్దెనిమిది': 18, 'పంతొమ్మిది': 19,
  'ఇరవై': 20, 'ఇరవై ఒకటి': 21, 'ఇరవై రెండు': 22, 'ఇరవై మూడు': 23, 'ఇరవై నాలుగు': 24, 'ఇరవై ఐదు': 25,
  'ముప్పై': 30, 'ముప్పై ఐదు': 35, 'నలభై': 40, 'నలభై ఐదు': 45, 'యాభై': 50,
  'యాభై ఐదు': 55, 'అరవై': 60, 'డెబ్బై': 70, 'ఎనభై': 80, 'తొంభై': 90,
  'వంద': 100, 'వందల': 100, 'నూట': 100,
  'రెండు వందలు': 200, 'రెండు వందల': 200,
  'మూడు వందలు': 300, 'మూడు వందల': 300,
  'నాలుగు వందలు': 400, 'నాలుగు వందల': 400,
  'ఐదు వందలు': 500, 'ఐదు వందల': 500,
  'ఆరు వందలు': 600, 'ఆరు వందల': 600,
  'ఏడు వందలు': 700, 'ఏడు వందల': 700,
  'ఎనిమిది వందలు': 800, 'ఎనిమిది వందల': 800,
  'తొమ్మిది వందలు': 900, 'తొమ్మిది వందల': 900,
  'వెయ్యి': 1000, 'వేల': 1000,
  'రెండు వేలు': 2000, 'రెండు వేల': 2000,
  'మూడు వేలు': 3000, 'మూడు వేల': 3000,
  'ఐదు వేలు': 5000, 'ఐదు వేల': 5000,
  'పది వేలు': 10000, 'పది వేల': 10000,

  // Hindi Numbers
  'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
  'सोलह': 16, 'सत्रह': 17, 'अट्ठारह': 18, 'उन्नीस': 19,
  'बीस': 20, 'इक्कीस': 21, 'बाईस': 22, 'तेईस': 23, 'चौबीस': 24, 'पच्चीस': 25,
  'तीस': 30, 'पैंतीस': 35, 'चालीस': 40, 'पैंतालीस': 45, 'पचास': 50,
  'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
  'सौ': 100, 'दो सौ': 200, 'तीन सौ': 300, 'चार सौ': 400, 'पांच सौ': 500, 'पाँच सौ': 500,
  'छह सौ': 600, 'सात सौ': 700, 'आठ सौ': 800, 'नौ सौ': 900,
  'हज़ार': 1000, 'हजार': 1000, 'दो हजार': 2000, 'पांच हजार': 5000, 'दस हजार': 10000,

  // English Numbers
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
  'twenty': 20, 'twenty one': 21, 'twenty two': 22, 'twenty three': 23, 'twenty four': 24, 'twenty five': 25,
  'thirty': 30, 'thirty five': 35, 'forty': 40, 'forty five': 45, 'fifty': 50,
  'fifty five': 55, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  'one hundred': 100, 'hundred': 100, 'two hundred': 200, 'three hundred': 300,
  'four hundred': 400, 'five hundred': 500, 'six hundred': 600, 'seven hundred': 700,
  'eight hundred': 800, 'nine hundred': 900, 'one thousand': 1000, 'thousand': 1000,
  'two thousand': 2000, 'three thousand': 3000, 'five thousand': 5000, 'ten thousand': 10000
};

/**
 * Extracts a numeric value from spoken text in Telugu, Hindi, or English.
 * Strips commas, currency markers, and unit words.
 */
export function extractNumberFromSpeech(transcript) {
  if (!transcript || typeof transcript !== 'string') return '';
  const clean = transcript.trim().replace(/,/g, '');

  // 1. Direct digits match: e.g. "500", "500 kg", "₹25.50", "24 / kg"
  const numMatch = clean.match(/\d+(\.\d+)?/);
  if (numMatch) return numMatch[0];

  // 2. Multilingual word dictionary match (longest word phrases first)
  const sortedWords = Object.entries(NUMBER_WORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [word, val] of sortedWords) {
    if (clean.toLowerCase().includes(word.toLowerCase())) {
      return String(val);
    }
  }

  return '';
}

/**
 * Extracts a crop definition from spoken text in Telugu, Hindi, or English.
 */
export function extractCropFromSpeech(transcript) {
  if (!transcript || typeof transcript !== 'string') return null;
  const clean = transcript.trim();
  for (const crop of CROP_DICTIONARY) {
    for (const pattern of crop.patterns) {
      if (pattern.test(clean)) {
        return crop;
      }
    }
  }
  return null;
}

/**
 * Full Conversational Parser: extracts crop, quantity, asking price, quality, organic flag.
 */
export function parseVoiceListing(transcript) {
  if (!transcript || typeof transcript !== 'string') {
    return null;
  }

  const clean = transcript.trim();
  const result = {
    cropName: '',
    category: 'Vegetables',
    quantityKg: '',
    askingPricePerKg: '',
    minPricePerKg: '',
    qualityGrade: 'GRADE_A',
    isOrganic: false,
    rawTranscript: clean,
    confidence: {
      crop: false,
      quantity: false,
      price: false
    }
  };

  // 1. EXTRACT CROP NAME
  const matchedCrop = extractCropFromSpeech(clean);
  if (matchedCrop) {
    result.cropName = matchedCrop.standard;
    result.category = matchedCrop.category;
    result.confidence.crop = true;
  }

  // 2. EXTRACT QUANTITY & UNIT
  // Regex handles: "500 kg", "500 కిలోల", "500 किलो", "500 kgs", "500 quintals"
  const qtyPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilos|కిలోలు|కిలోల|కిలో|కేజీ|కేజీల|किलो|किग्रा)/i,
    /(\d+(?:\.\d+)?)\s*(?:quintals?|క్వింటాళ్ళు|క్వింటాల్|క్వింటాళ్ల|क्विंटल)/i,
    /(\d+(?:\.\d+)?)\s*(?:tons?|టన్నులు|టన్నుల|टन)/i
  ];

  let rawQty = null;
  let unitMultiplier = 1;

  for (let idx = 0; idx < qtyPatterns.length; idx++) {
    const match = clean.match(qtyPatterns[idx]);
    if (match) {
      rawQty = parseFloat(match[1]);
      if (idx === 1) unitMultiplier = 100; // quintal = 100 kg
      if (idx === 2) unitMultiplier = 1000; // ton = 1000 kg
      break;
    }
  }

  // Fallback: check Telugu/Hindi/English number words combined with weight units
  if (!rawQty) {
    const sortedWords = Object.entries(NUMBER_WORDS).sort((a, b) => b[0].length - a[0].length);
    for (const [word, val] of sortedWords) {
      if (clean.toLowerCase().includes(word.toLowerCase())) {
        if (/కిలో|కేజీ|किलो|kg|quintal|క్వింటా|ton|టన్ను/i.test(clean)) {
          rawQty = val;
          if (/quintal|క్వింటా/i.test(clean)) unitMultiplier = 100;
          if (/ton|టన్ను/i.test(clean)) unitMultiplier = 1000;
          break;
        }
      }
    }
  }

  if (rawQty && !isNaN(rawQty) && rawQty > 0) {
    result.quantityKg = Math.round(rawQty * unitMultiplier);
    result.confidence.quantity = true;
  }

  // 3. EXTRACT ASKING PRICE
  // Regex handles: "₹25", "25 rupees", "25 రూపాయలు", "కిలో 25", "25 rs", "rate 25"
  const pricePatterns = [
    /(?:rs\.?|rupees?|inr|₹|రూపాయలు|రూపాయలకు|రూ\.|रुपये|रुपए|रेट|ధర|rate|price)\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees?|inr|₹|రూపాయలు|రూపాయలకు|रुपये|रुपए|పర్ కిలో|प्रति किलो|\/kg)/i,
    /(?:కిలో|కేజీ|किलो|per kg)\s*(\d+(?:\.\d+)?)/i
  ];

  let rawPrice = null;
  for (const pattern of pricePatterns) {
    const match = clean.match(pattern);
    if (match && match[1]) {
      const p = parseFloat(match[1]);
      // Avoid mixing up quantity with price
      if (p !== result.quantityKg && p < 10000) {
        rawPrice = p;
        break;
      }
    }
  }

  if (rawPrice && !isNaN(rawPrice) && rawPrice > 0) {
    result.askingPricePerKg = rawPrice;
    result.minPricePerKg = (rawPrice * 0.9).toFixed(1); // Default 10% tolerance
    result.confidence.price = true;
  }

  // 4. DETECT ORGANIC
  if (/organic|సేంద్రీయ|సహజ|ప్రాకృతిక|जैविक|ऑर्गेनिक/i.test(clean)) {
    result.isOrganic = true;
  }

  // 5. DETECT QUALITY GRADE
  if (/grade\s*b|గ్రేడ్\s*బి|ग्रेड\s*बी/i.test(clean)) {
    result.qualityGrade = 'GRADE_B';
  } else if (/grade\s*c|గ్రేడ్\s*సి|ग्रेड\s*सी/i.test(clean)) {
    result.qualityGrade = 'GRADE_C';
  } else if (/premium|organic premium|ఉత్తమ|సర్టిఫైడ్/i.test(clean)) {
    result.qualityGrade = 'ORGANIC_PREMIUM';
  } else {
    result.qualityGrade = 'GRADE_A';
  }

  return result;
}

/**
 * FPO Bulk Voice Aggregator Parser:
 * Parses multi-member batch contributions spoken in natural language.
 * E.g., "Ramayya 500kg Tomato at 25 rupees, Lakshmi 300kg Tomato at 26 rupees"
 */
export function parseFpoBulkVoice(transcript) {
  if (!transcript || typeof transcript !== 'string') return [];
  const entries = [];
  const segments = transcript.split(/[,;\n]|మరియు|and|तथा|और/i).map(s => s.trim()).filter(Boolean);

  for (const seg of segments) {
    const parsed = parseVoiceListing(seg);
    if (parsed && (parsed.cropName || parsed.quantityKg || parsed.askingPricePerKg)) {
      // Look for a member name at the start
      // eslint-disable-next-line no-misleading-character-class
      const nameMatch = seg.match(/^([A-Za-z\u0C00-\u0C7F\u0900-\u097F]+)/);
      const farmerName = nameMatch ? nameMatch[1].trim() : '';
      entries.push({
        farmerName,
        cropName: parsed.cropName || 'Tomato',
        quantityKg: parsed.quantityKg || 100,
        askingPricePerKg: parsed.askingPricePerKg || 25,
        rawSegment: seg
      });
    }
  }

  return entries;
}

/**
 * Volume-Weighted Asking Rate Formula:
 * Weighted Rate = Σ(Quantity_i × Asking_Price_i) ÷ Σ(Quantity_i)
 */
export function calculateWeightedAskingRate(lots) {
  if (!Array.isArray(lots) || lots.length === 0) return '0.00';
  const totalQty = lots.reduce((s, e) => s + (parseFloat(e.quantityKg) || 0), 0);
  const totalValuation = lots.reduce((s, e) => s + ((parseFloat(e.quantityKg) || 0) * (parseFloat(e.askingPricePerKg) || 0)), 0);
  return totalQty > 0 ? (totalValuation / totalQty).toFixed(2) : '0.00';
}
