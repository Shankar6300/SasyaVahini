import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, AlertCircle } from 'lucide-react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

export default function VoiceInput({
  onResult,
  onTranscript,
  className = '',
  size = 'md',
  mode = 'replace',
  disabled = false,
  title = ''
}) {
  const { t, i18n } = useTranslation();
  const {
    isSupported,
    isListening,
    interimTranscript,
    error,
    startListening,
    stopListening,
    langLocale
  } = useSpeechRecognition();

  const handleResult = onResult || onTranscript;

  if (!isSupported) {
    return null; // Graceful degradation when browser lacks Web Speech API
  }

  const currentLangLabel = i18n.language === 'te' ? 'తెలుగు' : (i18n.language === 'hi' ? 'हिन्दी' : 'English');

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isListening) {
      if (interimTranscript && handleResult) {
        handleResult(interimTranscript.trim(), { mode });
      }
      stopListening();
    } else {
      startListening({
        continuous: false,
        onResult: (fullText, finalChunk) => {
          const text = (finalChunk || fullText || '').trim();
          if (text && handleResult) {
            handleResult(text, { mode });
          }
        }
      });
    }
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20
  };

  const buttonTitle = title || (isListening ? t('voice.stop', 'Stop listening') : t('voice.micTooltip', { lang: currentLangLabel, defaultValue: `Speak in ${currentLangLabel}` }));

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`rounded-xl transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
          isListening
            ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20 px-2.5 py-1.5 gap-1.5'
            : 'bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 p-2 border border-slate-200 hover:border-emerald-300'
        }`}
        aria-label={buttonTitle}
        title={buttonTitle}
      >
        {isListening ? (
          <>
            <Square size={iconSizes[size] - 2} className="fill-current" />
            <span className="text-[11px] font-black">{t('voice.stop', 'Stop')}</span>
          </>
        ) : (
          <Mic size={iconSizes[size]} />
        )}
      </button>

      {/* Real-time Listening Popover */}
      {isListening && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-56 p-2.5 bg-slate-900 text-white rounded-2xl shadow-xl text-center text-xs animate-fade-in pointer-events-none">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-emerald-400 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>{t('voice.speakNow', { lang: currentLangLabel, defaultValue: `Speak in ${currentLangLabel}` })} ({langLocale})</span>
          </div>
          <p className="text-slate-300 italic text-[11px] truncate">
            {interimTranscript || t('voice.listening', 'Listening...')}
          </p>
        </div>
      )}

      {/* Permission Denied Warning */}
      {error === 'permission-denied' && (
        <div className="absolute top-full mt-1.5 right-0 z-50 w-64 p-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl shadow-lg text-[11px] flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>{t('voice.permissionDenied', 'Microphone permission denied. Please allow microphone access in your browser.')}</span>
        </div>
      )}
    </div>
  );
}
