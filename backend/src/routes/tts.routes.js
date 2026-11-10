/**
 * SasyaVahini — Text-to-Speech (TTS) Proxy Route
 *
 * Provides high-quality multilingual speech synthesis audio streams (especially Telugu 'te'
 * and Hindi 'hi') for browsers/devices lacking native OS voice packs.
 */

const express = require('express');
const https = require('https');
const router = express.Router();
const logger = require('../utils/logger');

// In-memory cache for frequently played guide texts (e.g., dashboard instructions)
const ttsCache = new Map();
const MAX_CACHE_ENTRIES = 100;

function fetchAudioChunk(chunk, lang) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`TTS provider returned status ${res.statusCode}`));
      }
      const data = [];
      res.on('data', (d) => data.push(d));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

function splitTextIntoChunks(text, maxLen = 140) {
  if (!text || text.length <= maxLen) return [text];

  const sentences = text.match(/[^.!?।\n]+[.!?।\n]+|[^.!?।\n]+$/g) || [text];
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if ((current + ' ' + trimmed).trim().length <= maxLen) {
      current = (current + ' ' + trimmed).trim();
    } else {
      if (current) chunks.push(current);
      if (trimmed.length <= maxLen) {
        current = trimmed;
      } else {
        // Words breakdown for very long single sentences
        const words = trimmed.split(/\s+/);
        let wordChunk = '';
        for (const w of words) {
          if ((wordChunk + ' ' + w).trim().length <= maxLen) {
            wordChunk = (wordChunk + ' ' + w).trim();
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = w;
          }
        }
        current = wordChunk;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

router.get('/', async (req, res) => {
  try {
    const text = (req.query.text || '').trim();
    const lang = (req.query.lang || 'te').toLowerCase().slice(0, 2);

    if (!text) {
      return res.status(400).json({ success: false, error: 'text query parameter is required' });
    }

    const cacheKey = `${lang}:${text}`;
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached);
    }

    const chunks = splitTextIntoChunks(text);
    const audioBuffers = [];

    for (const chunk of chunks) {
      try {
        const buf = await fetchAudioChunk(chunk, lang);
        audioBuffers.push(buf);
      } catch (err) {
        logger.warn('TTS chunk fetch failed, skipping chunk', { lang, chunk, error: err.message });
      }
    }

    if (!audioBuffers.length) {
      return res.status(502).json({ success: false, error: 'Failed to synthesize speech audio' });
    }

    const combinedAudio = Buffer.concat(audioBuffers);

    if (ttsCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = ttsCache.keys().next().value;
      ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, combinedAudio);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', combinedAudio.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(combinedAudio);
  } catch (err) {
    logger.error('TTS service error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Speech synthesis error' });
  }
});

module.exports = router;
