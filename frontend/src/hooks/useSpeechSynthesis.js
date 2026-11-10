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
  const [lastSpokenText, setLastSpokenText] = useState('');

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const currentLang = (i18n.language || 'en').slice(0, 2).toLowerCase();
  const targetLocale = LOCALE_MAP[currentLang] || 'en-IN';
  const utteranceRef = useRef(null);
  const audioRef = useRef(null);

  // Load available speech synthesis voices
  useEffect(() => {
    if (!isSupported) return;

    const updateVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        setVoices(available || []);
      } catch (_e) {
        setVoices([]);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current = null;
        } catch (_e) {}
      }
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (_e) {}
      }
    };
  }, [isSupported]);

  // Find native voice specifically matching the language
  const findNativeVoice = useCallback((langCode) => {
    if (!voices.length) return null;
    const prefix = langCode.slice(0, 2).toLowerCase();

    return voices.find(v => {
      const vLang = (v.lang || '').toLowerCase();
      const vName = (v.name || '').toLowerCase();

      if (vLang === `${prefix}-in` || vLang.replace('_', '-') === `${prefix}-in`) return true;
      if (vLang.startsWith(prefix)) return true;

      // Specific language name markers
      if (prefix === 'te' && (vName.includes('telugu') || vName.includes('తెలుగు') || vName.includes('mohan') || vName.includes('shruti'))) {
        return true;
      }
      if (prefix === 'hi' && (vName.includes('hindi') || vName.includes('हिन्दी') || vName.includes('kalpana') || vName.includes('hemant') || vName.includes('madhur') || vName.includes('swara'))) {
        return true;
      }
      return false;
    }) || null;
  }, [voices]);

  const hasNativeVoice = Boolean(findNativeVoice(currentLang));

  const stop = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      } catch (_e) {}
    }
    if (isSupported && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_e) {}
    }
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPaused(true);
      return;
    }
    if (isSupported && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsPaused(false);
      return;
    }
    if (isSupported && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported]);

  const speak = useCallback((text, { rate = 0.95, pitch = 1.0, lang = null } = {}) => {
    if (!text || !text.trim()) return;

    // Stop ongoing speech
    stop();
    setLastSpokenText(text);

    const langCode = (lang || currentLang).slice(0, 2).toLowerCase();
    const localeToUse = LOCALE_MAP[langCode] || targetLocale;
    const nativeVoice = findNativeVoice(langCode);

    // If native voice is found in browser or if language is English, use Web Speech API
    if (nativeVoice || langCode === 'en') {
      try {
        // Resume any pending speech synthesis state
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = localeToUse;
        utterance.rate = rate;
        utterance.pitch = pitch;

        if (nativeVoice) {
          utterance.voice = nativeVoice;
        } else if (langCode === 'en') {
          // Best English Indian voice or default
          const enVoice = voices.find(v => (v.lang || '').toLowerCase().includes('in')) || voices[0];
          if (enVoice) utterance.voice = enVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          setIsPaused(false);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          utteranceRef.current = null;
        };

        utterance.onerror = (e) => {
          console.warn('Web Speech API synthesis error, trying audio fallback:', e);
          setIsSpeaking(false);
          setIsPaused(false);
          // Fall back to audio service
          playAudioFallback(text, langCode);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn('SpeechSynthesis failed, using audio fallback:', err);
      }
    }

    // High quality server-assisted audio fallback for languages without local OS voices (e.g. Telugu on Windows)
    playAudioFallback(text, langCode);
  }, [currentLang, findNativeVoice, isSupported, stop, targetLocale, voices]);

  const playAudioFallback = (text, langCode) => {
    try {
      const audioUrl = `/api/tts?lang=${encodeURIComponent(langCode)}&text=${encodeURIComponent(text)}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        audioRef.current = null;
      };

      audio.onerror = (err) => {
        console.warn('Audio fallback error:', err);
        setIsSpeaking(false);
        setIsPaused(false);
        audioRef.current = null;
      };

      audio.play().catch((playErr) => {
        console.warn('Audio playback could not start automatically:', playErr);
        setIsSpeaking(false);
        setIsPaused(false);
        audioRef.current = null;
      });
    } catch (e) {
      console.error('Audio fallback initialization failed:', e);
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const repeat = useCallback(() => {
    if (lastSpokenText) {
      speak(lastSpokenText);
    }
  }, [lastSpokenText, speak]);

  return {
    isSupported: true, // Always supported via audio fallback + Web Speech API
    isSpeaking,
    isPaused,
    hasNativeVoice,
    currentLang,
    speak,
    stop,
    pause,
    resume,
    repeat
  };
}
