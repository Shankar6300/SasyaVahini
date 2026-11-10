import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX, Pause, Play, RotateCcw, Sparkles, ChevronUp, FileText, Info } from 'lucide-react';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';

export default function VoiceAssistant({
  guideType = 'farmer', // 'farmer' | 'listing' | 'proposals' | 'fpo' | 'fpoMembers' | 'fpoAggregation' | 'marketIntelligence'
  customText = null,
  className = '',
  buttonVariant = 'default' // 'default' | 'pill' | 'card'
}) {
  const { t } = useTranslation();
  const [showTranscript, setShowTranscript] = useState(false);
  const {
    isSupported,
    isSpeaking,
    isPaused,
    hasNativeVoice,
    currentLang,
    speak,
    stop,
    pause,
    resume,
    repeat
  } = useSpeechSynthesis();

  if (!isSupported) {
    return null;
  }

  const getGuideText = () => {
    if (customText) return customText;
    switch (guideType) {
      case 'farmer':
        return t('voice.guideFarmerDashboard');
      case 'listing':
        return t('voice.guideListingPrompt');
      case 'proposals':
      case 'consent':
        return t('voice.guideConsentPrompt');
      case 'fpo':
        return t('voice.guideFpoPrompt');
      case 'fpoMembers':
        return t('voice.guideFpoMembersPrompt');
      case 'fpoAggregation':
        return t('voice.guideFpoAggregationPrompt');
      case 'marketIntelligence':
        return t('voice.guideMarketIntelligencePrompt');
      default:
        return t('voice.guideFarmerDashboard');
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

  const textToRead = getGuideText();

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
          <>
            <button
              type="button"
              onClick={repeat}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              title={t('voice.repeatSpeech', 'Repeat')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={stop}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              title={t('voice.stopSpeech')}
            >
              <VolumeX className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col rounded-2xl bg-emerald-50/90 border border-emerald-200/80 shadow-sm transition-all ${className}`}>
      <div className="flex items-center gap-2 p-2.5">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-extrabold text-emerald-950 leading-none truncate">
            {t('voice.voiceAssistantTitle', 'SasyaVahini Voice Guide')}
          </p>
          <p className="text-[10px] text-emerald-700 mt-0.5 truncate">
            {isSpeaking ? (isPaused ? t('voice.paused', 'Paused') : t('voice.speaking', 'Speaking...')) : t('voice.listenGuide', 'Listen to instructions')}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleToggle}
            className={`p-2 rounded-xl border text-xs font-bold transition-colors shadow-sm flex items-center gap-1 ${
              isSpeaking
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
            title={isSpeaking ? (isPaused ? t('voice.resumeSpeech', 'Resume') : t('voice.pauseSpeech', 'Pause')) : t('voice.listenGuide', 'Listen')}
            aria-label={t('voice.listenGuide', 'Listen')}
          >
            {isSpeaking ? (
              isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {isSpeaking && (
            <>
              <button
                type="button"
                onClick={repeat}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
                title={t('voice.repeatSpeech', 'Repeat')}
                aria-label={t('voice.repeatSpeech', 'Repeat')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={stop}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm"
                title={t('voice.stopSpeech', 'Stop')}
                aria-label={t('voice.stopSpeech', 'Stop')}
              >
                <VolumeX className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
            title={t('voice.toggleText', 'Read instructions text')}
            aria-label={t('voice.toggleText', 'Read instructions text')}
          >
            {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Transcript Text Drawer */}
      {showTranscript && (
        <div className="border-t border-emerald-200/60 p-3 bg-white/95 rounded-b-2xl text-xs space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 border-b border-slate-100 pb-1">
            <span>{t('voice.guideTranscriptTitle', 'Audio Guide Instructions')}</span>
            <span className="text-[10px] text-slate-500 uppercase">{currentLang}</span>
          </div>
          <p className="text-slate-800 leading-relaxed font-medium whitespace-pre-line text-xs">
            {textToRead}
          </p>
          {!hasNativeVoice && currentLang === 'te' && (
            <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                {t('voice.browserTeluguVoiceNote', 'గమనిక: మీ బ్రౌజర్‌లో తెలుగు స్వరం లేకపోతే, పై సూచనలను ఇక్కడ స్పష్టంగా చదువుకోవచ్చు.')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
