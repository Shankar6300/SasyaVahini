/**
 * SasyaVahini — Smart Multilingual Voice-to-Form Extraction Engine
 * 
 * Extracts structured crop listing fields (crop, quantity, price, grade)
 * from natural conversational speech in English, Hindi, and Telugu.
 * 
 * Works completely in-browser without external paid AI services.
 */

// Crop dictionary mapping multilingual names to standard crop catalog names
const CROP_DICTIONARY = [
  // Tomato
  { standard: 'Tomato', category: 'Vegetables', patterns: [/tomat[oe]s?/i, /టమాట/i, /టమోట/i, /టమాటాలు/i, /टमाटर/i] },
  // Onion
  { standard: 'Onion', category: 'Vegetables', patterns: [/onions?/i, /ఉల్లి/i, /ఉల్లిపాయ/i, /ఉల్లిపాయలు/i, /प्याज/i, /कांदा/i] },
  // Potato
  { standard: 'Potato', category: 'Vegetables', patterns: [/potat[oe]s?/i, /బంగాళాదుంప/i, /ఆలుగడ్డ/i, /ఆలూ/i, /आलू/i, /बटाटा/i] },
  // Chilli / Capsicum
  { standard: 'Chilli', category: 'Spices', patterns: [/chilli/i, /chillies/i, /pepper/i, /మిరప/i, /మిర్చి/i, /పచ్చిమిర్చి/i, /मिर्च/i, /हरी मिर्च/i] },
  { standard: 'Shimla Mirch (Capsicum)', category: 'Vegetables', patterns: [/capsicum/i, /బెంగళూరు మిరప/i, /శిమ్లా మిర్చి/i, /शिमला मिर्च/i] },
  // Wheat
  { standard: 'Wheat', category: 'Grains', patterns: [/wheat/i, /గోధుమ/i, /గోధుమలు/i, /गेहूं/i, /गेंहू/i] },
  // Rice / Paddy
  { standard: 'Paddy (Rice)', category: 'Grains', patterns: [/rice/i, /paddy/i, /వరి/i, /వరి ధాన్యం/i, /బియ్యం/i, /धान/i, /चावल/i] },
  // Cotton
  { standard: 'Cotton', category: 'Commercial', patterns: [/cotton/i, /పత్తి/i, /దూది/i, /कपास/i, /रूई/i] },
  // Maize / Corn
  { standard: 'Maize', category: 'Grains', patterns: [/maize/i, /corn/i, /మొక్కజొన్న/i, /జొన్నలు/i, /मक्का/i, /भुट्टा/i] },
  // Soybean
  { standard: 'Soybean', category: 'Pulses', patterns: [/soybean/i, /సోయాబీన్/i, /సోయా/i, /सोयाबीन/i] }
];

// Number word dictionary for Telugu and Hindi words
const NUMBER_WORDS = {
  // Telugu
  'వంద': 100, 'నూట': 100, 'రెండు వందలు': 200, 'ఐదు వందలు': 500, 'వెయ్యి': 1000,
  'యాభై': 50, 'ఇరవై': 20, 'ఇరవై ఐదు': 25, 'ముప్పై': 30, 'నలభై': 40,
  // Hindi
  'सौ': 100, 'दो सौ': 200, 'पांच सौ': 500, 'पाँच सौ': 500, 'हज़ार': 1000, 'हजार': 1000,
  'पचास': 50, 'बीस': 20, 'पच्चीस': 25, 'तीस': 30, 'चालीस': 40, 'पैंतालीस': 45
};

export function extractNumberFromSpeech(transcript) {
  if (!transcript || typeof transcript !== 'string') return '';
  const numMatch = transcript.match(/\b\d+(\.\d+)?\b/);
  if (numMatch) return numMatch[0];
  const sortedWords = Object.entries(NUMBER_WORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [word, val] of sortedWords) {
    if (transcript.includes(word)) return String(val);
  }
  return transcript.trim();
}

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
  for (const crop of CROP_DICTIONARY) {
    for (const pattern of crop.patterns) {
      if (pattern.test(clean)) {
        result.cropName = crop.standard;
        result.category = crop.category;
        result.confidence.crop = true;
        break;
      }
    }
    if (result.confidence.crop) break;
  }

  // 2. EXTRACT QUANTITY & UNIT
  // Regex handles: "500 kg", "500 కిలోల", "500 किलो", "500 kgs", "500 quintals"
  const qtyPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilos|కిలోలు|కిలోల|కిలో|కేజీ|కేజీల|किलो|किग्रा)/i,
    /(\d+(?:\.\d+)?)\s*(?:quintals?|క్వింటాళ్ళు|క్వింటాల్|क्विंटल)/i,
    /(\d+(?:\.\d+)?)\s*(?:tons?|టన్నులు|टन)/i
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

  // Fallback: check Telugu/Hindi number words
  if (!rawQty) {
    for (const [word, val] of Object.entries(NUMBER_WORDS)) {
      if (clean.includes(word) && (clean.includes('కిలో') || clean.includes('किलो') || clean.includes('kg'))) {
        rawQty = val;
        break;
      }
    }
  }

  if (rawQty && !isNaN(rawQty) && rawQty > 0) {
    result.quantityKg = Math.round(rawQty * unitMultiplier);
    result.confidence.quantity = true;
  }

  // 3. EXTRACT ASKING PRICE
  // Regex handles: "₹25", "25 rupees", "25 روپے", "25 రూపాయలు", "కిలో 25", "25 rs", "rate 25"
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
      // Avoid mixing up 500 kg quantity with price
      if (p !== result.quantityKg && p < 10000) {
        rawPrice = p;
        break;
      }
    }
  }

  if (rawPrice && !isNaN(rawPrice) && rawPrice > 0) {
    result.askingPricePerKg = rawPrice;
    result.minPricePerKg = Math.round(rawPrice * 0.9); // Default 10% tolerance
    result.confidence.price = true;
  }

  // 4. DETECT ORGANIC
  if (/organic|సేంద్రీయ|సహజ|जैविक|ऑर्गेनिक/i.test(clean)) {
    result.isOrganic = true;
  }

  // 5. DETECT QUALITY GRADE
  if (/grade\s*b|గ్రేడ్\s*బి|ग्रेड\s*बी/i.test(clean)) {
    result.qualityGrade = 'GRADE_B';
  } else if (/premium|organic premium|ఉత్తమ/i.test(clean)) {
    result.qualityGrade = 'ORGANIC_PREMIUM';
  } else {
    result.qualityGrade = 'GRADE_A';
  }

  return result;
}
