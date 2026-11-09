import { describe, it, expect } from 'vitest';
import { parseVoiceListing, extractNumberFromSpeech } from '../services/voiceFormParser';

describe('SasyaVahini Multilingual Voice-to-Form Engine', () => {

  describe('Telugu Natural Language Extraction', () => {
    it('extracts crop, quantity and price from Telugu sentence with numbers', () => {
      const sentence = 'నేను 500 కిలోల టమాటాలు కిలో 25 రూపాయలకు అమ్మాలనుకుంటున్నాను';
      const result = parseVoiceListing(sentence);

      expect(result).not.toBeNull();
      expect(result.cropName).toBe('Tomato');
      expect(Number(result.quantityKg)).toBe(500);
      expect(Number(result.askingPricePerKg)).toBe(25);
      expect(result.category).toBe('Vegetables');
    });

    it('extracts crop and organic flag from Telugu', () => {
      const sentence = 'నా దగ్గర సేంద్రీయ ఉల్లిపాయలు 1000 కిలోలు ఉన్నాయి';
      const result = parseVoiceListing(sentence);

      expect(result).not.toBeNull();
      expect(result.cropName).toBe('Onion');
      expect(Number(result.quantityKg)).toBe(1000);
      expect(result.isOrganic).toBe(true);
    });
  });

  describe('Hindi Natural Language Extraction', () => {
    it('extracts crop, quantity and price from Hindi sentence', () => {
      const sentence = 'मुझे 500 किलो टमाटर 25 रुपये प्रति किलो में बेचना है';
      const result = parseVoiceListing(sentence);

      expect(result).not.toBeNull();
      expect(result.cropName).toBe('Tomato');
      expect(Number(result.quantityKg)).toBe(500);
      expect(Number(result.askingPricePerKg)).toBe(25);
    });

    it('extracts wheat/grains in Hindi with quintals', () => {
      const sentence = 'मेरे पास 20 क्विंटल गेहूं उपलब्ध है, भाव 35 रुपये प्रति किलो';
      const result = parseVoiceListing(sentence);

      expect(result).not.toBeNull();
      expect(result.cropName).toBe('Wheat');
      // 20 quintals * 100 = 2000 kg
      expect(Number(result.quantityKg)).toBe(2000);
      expect(Number(result.askingPricePerKg)).toBe(35);
    });
  });

  describe('English Natural Language Extraction', () => {
    it('extracts crop, quantity, organic, and price from English sentence', () => {
      const sentence = 'I have 1200 kg of fresh organic potatoes for 30 rupees per kg';
      const result = parseVoiceListing(sentence);

      expect(result).not.toBeNull();
      expect(result.cropName).toBe('Potato');
      expect(Number(result.quantityKg)).toBe(1200);
      expect(Number(result.askingPricePerKg)).toBe(30);
      expect(result.isOrganic).toBe(true);
    });
  });

  describe('extractNumberFromSpeech helper', () => {
    it('extracts digit numbers from speech string', () => {
      expect(extractNumberFromSpeech('500 kg')).toBe('500');
      expect(extractNumberFromSpeech('around 25.5 rupees')).toBe('25.5');
    });

    it('extracts word numbers from Hindi and Telugu', () => {
      expect(extractNumberFromSpeech('पांच सौ')).toBe('500');
      expect(extractNumberFromSpeech('ఐదు వందలు')).toBe('500');
    });
  });
});
