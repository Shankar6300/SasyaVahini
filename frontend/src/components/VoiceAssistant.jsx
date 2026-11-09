import React from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX, Pause, Play, Sparkles } from 'lucide-react';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';

export default function VoiceAssistant({
  guideType = 'listing', // 'listing' | 'consent' | 'fpo'
  customText = null,
  className = '',
  buttonVariant = 'default' // 'default' | 'pill' | 'card'
}) {
  const { t } = useTranslation();
  const { isSupported, isSpeaking, isPaused, speak, stop, pause, resume } = useSpeechSynthesis();

  if (!isSupported) {
    return null;
  }

  const getGuideText = () => {
    if (customText) return customText;
    switch (guideType) {
      case 'consent':
        return t('voice.guideConsentPrompt');
      case 'fpo':
        return t('voice.guideFpoPrompt');
      case 'listing':
      default:
        return t('voice.guideListingPrompt');
    }
  };

  const handleToggle = () => {
    if (isSpeaking) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      speak(getGuideText());
    }
  };

  if (buttonVariant === 'pill') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={handleToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
            isSpeaking
              ? 'bg-emerald-600 text-white animate-pulse'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}
          aria-label={t('voice.listenGuide')}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{isSpeaking ? (isPaused ? t('voice.pauseSpeech') : t('voice.speaking')) : t('voice.listenGuide')}</span>
        </button>
        {isSpeaking && (
          <button
            type="button"
            onClick={stop}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
            title={t('voice.stopSpeech')}
          >
            <VolumeX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 ${className}`}>
      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
        <Sparkles className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-extrabold text-emerald-900 leading-none">{t('voice.voiceAssistantTitle')}</p>
        <p className="text-[10px] text-emerald-700 mt-0.5 truncate">
          {isSpeaking ? t('voice.speaking') : t('voice.listenGuide')}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleToggle}
          className="p-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-sm"
          title={isSpeaking ? (isPaused ? 'Resume' : 'Pause') : t('voice.listenGuide')}
          aria-label={t('voice.listenGuide')}
        >
          {isSpeaking ? (
            isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>

        {isSpeaking && (
          <button
            type="button"
            onClick={stop}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm"
            title={t('voice.stopSpeech')}
          >
            <VolumeX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

