import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN'
};

export default function useSpeechSynthesis() {
  const { i18n } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState([]);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const currentLang = i18n.language?.slice(0, 2) || 'en';
  const targetLocale = LOCALE_MAP[currentLang] || 'en-IN';
  const utteranceRef = useRef(null);

  // Load available speech synthesis voices
  useEffect(() => {
    if (!isSupported) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const findBestVoice = useCallback((langLocale) => {
    if (!voices.length) return null;
    const langPrefix = langLocale.slice(0, 2);

    // Exact match (e.g. te-IN)
    let match = voices.find(v => v.lang.toLowerCase() === langLocale.toLowerCase() || v.lang.replace('_', '-').toLowerCase() === langLocale.toLowerCase());
    if (match) return match;

    // Language prefix match (e.g. te)
    match = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
    if (match) return match;

    // Fallback Indian voice or default
    match = voices.find(v => v.lang.toLowerCase().includes('in') || v.lang.toLowerCase().startsWith('en'));
    return match || voices[0] || null;
  }, [voices]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported]);

  const speak = useCallback((text, { rate = 0.95, pitch = 1.0, lang = null } = {}) => {
    if (!isSupported || !text) return;

    // Cancel any ongoing utterance
    stop();

    const localeToUse = lang || targetLocale;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = localeToUse;
    utterance.rate = rate;
    utterance.pitch = pitch;

    const voice = findBestVoice(localeToUse);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [findBestVoice, isSupported, stop, targetLocale]);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    speak,
    stop,
    pause,
    resume
  };
}

