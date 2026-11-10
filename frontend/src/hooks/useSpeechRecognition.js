import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN'
};

export default function useSpeechRecognition() {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const onResultCallbackRef = useRef(null);
  const latestSpokenRef = useRef('');
  const hasEmittedFinalRef = useRef(false);

  const isSupported = typeof window !== 'undefined' && Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );

  const currentLangCode = i18n.language?.slice(0, 2) || 'en';
  const defaultLocale = LOCALE_MAP[currentLangCode] || 'en-IN';

  const stopListening = useCallback(() => {
    // If user stopped listening and there was spoken text not yet emitted as final, emit it immediately
    if (latestSpokenRef.current && !hasEmittedFinalRef.current && onResultCallbackRef.current) {
      hasEmittedFinalRef.current = true;
      const text = latestSpokenRef.current.trim();
      if (text) {
        setTranscript(prev => prev ? `${prev} ${text}` : text);
        try {
          onResultCallbackRef.current(text, text);
        } catch (e) {
          console.error('Error in onResult callback:', e);
        }
      }
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_e) {
        // Already stopped
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    latestSpokenRef.current = '';
    hasEmittedFinalRef.current = false;
    setError(null);
  }, []);

  const startListening = useCallback(({ continuous = false, onResult = null, onInterim = null } = {}) => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    // Stop previous instance if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_e) {
        // ignore abort / already stopped
      }
    }

    setError(null);
    setInterimTranscript('');
    latestSpokenRef.current = '';
    hasEmittedFinalRef.current = false;
    onResultCallbackRef.current = onResult;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = LOCALE_MAP[i18n.language?.slice(0, 2)] || 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      hasEmittedFinalRef.current = false;
    };

    recognition.onresult = (event) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          currentFinal += item[0].transcript;
        } else {
          currentInterim += item[0].transcript;
        }
      }

      if (currentInterim) {
        latestSpokenRef.current = currentInterim;
        setInterimTranscript(currentInterim);
        if (onInterim) onInterim(currentInterim);
      }

      if (currentFinal) {
        hasEmittedFinalRef.current = true;
        latestSpokenRef.current = currentFinal;
        setInterimTranscript('');
        const trimmed = currentFinal.trim();
        setTranscript((prev) => (prev ? `${prev} ${trimmed}` : trimmed));
        
        // Execute callback directly so value enters the field immediately!
        if (onResultCallbackRef.current) {
          try {
            onResultCallbackRef.current(trimmed, trimmed);
          } catch (e) {
            console.error('Error in onResult callback:', e);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('permission-denied');
      } else if (event.error === 'no-speech') {
        setError('no-speech');
      } else {
        setError(event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // If speech ended and there was an uncommitted interim text, flush it directly to callback
      if (latestSpokenRef.current && !hasEmittedFinalRef.current && onResultCallbackRef.current) {
        hasEmittedFinalRef.current = true;
        const text = latestSpokenRef.current.trim();
        if (text) {
          setTranscript(prev => prev ? `${prev} ${text}` : text);
          try {
            onResultCallbackRef.current(text, text);
          } catch (e) {
            console.error('Error in onResult callback:', e);
          }
        }
      }
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setError(err.message);
      setIsListening(false);
    }
  }, [i18n.language, isSupported]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_e) {
          // ignore cleanup abort
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    langLocale: defaultLocale
  };
}
