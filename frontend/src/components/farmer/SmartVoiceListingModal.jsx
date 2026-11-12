import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, X, Sparkles, Check } from 'lucide-react';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import { parseVoiceListing } from '../../services/voiceFormParser';

export default function SmartVoiceListingModal({ isOpen, onClose, onApplyParsed, onListingSaved }) {
  const { t, i18n } = useTranslation();
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    langLocale
  } = useSpeechRecognition();

  const [parsedData, setParsedData] = useState(null);
  const handleApplyCallback = onApplyParsed || onListingSaved;

  // Real-time parsing as speech arrives
  useEffect(() => {
    const textToParse = interimTranscript || transcript;
    if (textToParse && textToParse.trim()) {
      const parsed = parseVoiceListing(textToParse);
      if (parsed) {
        setParsedData(prev => {
          // Keep previously detected non-empty values if new parse didn't re-detect them
          return {
            ...parsed,
            cropName: parsed.cropName || prev?.cropName || '',
            quantityKg: parsed.quantityKg || prev?.quantityKg || '',
            askingPricePerKg: parsed.askingPricePerKg || prev?.askingPricePerKg || '',
            minPricePerKg: parsed.minPricePerKg || prev?.minPricePerKg || '',
            isOrganic: parsed.isOrganic || prev?.isOrganic || false,
            qualityGrade: parsed.qualityGrade || prev?.qualityGrade || 'GRADE_A'
          };
        });
      }
    }
  }, [transcript, interimTranscript]);

  if (!isOpen) return null;

  const handleStart = () => {
    resetTranscript();
    setParsedData(null);
    startListening({
      continuous: true,
      onResult: (fullText, chunk) => {
        const text = chunk || fullText;
        if (text) {
          const parsed = parseVoiceListing(text);
          if (parsed) {
            setParsedData(prev => ({
              ...parsed,
              cropName: parsed.cropName || prev?.cropName || '',
              quantityKg: parsed.quantityKg || prev?.quantityKg || '',
              askingPricePerKg: parsed.askingPricePerKg || prev?.askingPricePerKg || ''
            }));
          }
        }
      }
    });
  };

  const handleStop = () => {
    stopListening();
    const activeText = transcript || interimTranscript;
    if (activeText) {
      const parsed = parseVoiceListing(activeText);
      if (parsed) {
        setParsedData(prev => ({
          ...parsed,
          cropName: parsed.cropName || prev?.cropName || '',
          quantityKg: parsed.quantityKg || prev?.quantityKg || '',
          askingPricePerKg: parsed.askingPricePerKg || prev?.askingPricePerKg || ''
        }));
      }
    }
  };

  const handleApply = () => {
    const dataToApply = parsedData || (transcript ? parseVoiceListing(transcript) : null);
    if (dataToApply && handleApplyCallback) {
      handleApplyCallback(dataToApply);
      onClose();
    }
  };

  const currentLang = i18n.language?.slice(0, 2) || 'en';
  const examplePhrases = {
    te: '"నేను 500 కిలోల టమాటాలు కిలో 25 రూపాయలకు అమ్మాలనుకుంటున్నాను."',
    hi: '"मुझे 500 किलो टमाटर 25 रुपये प्रति किलो में बेचना है।"',
    en: '"I want to sell 500 kg of Grade A tomatoes at 25 rupees per kg."'
  };

  const hasAnyDetected = parsedData && (parsedData.cropName || parsedData.quantityKg || parsedData.askingPricePerKg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-sm">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {t('voice.smartAssistantTitle', 'Smart Voice Listing Assistant')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('voice.smartAssistantIntro', 'Speak naturally in Telugu, Hindi, or English. We will extract crop, quantity, and price automatically.')}
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopListening(); onClose(); }}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Example card */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-xs text-emerald-900">
          <p className="font-extrabold text-[11px] text-emerald-800 uppercase tracking-wider mb-1">
            Example Spoken Sentence ({langLocale})
          </p>
          <p className="italic font-medium text-emerald-950">
            {examplePhrases[currentLang] || examplePhrases.en}
          </p>
        </div>

        {/* Speech Recognition Area */}
        <div className="text-center py-2 space-y-3">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={isListening ? handleStop : handleStart}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl focus:outline-none ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-8 ring-emerald-100'
              }`}
            >
              {isListening ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-700">
              {isListening ? (
                <span className="text-rose-600 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  {t('voice.listening', 'Listening now... speak your crop details')}
                </span>
              ) : (
                <span>{t('voice.tapToSpeak', 'Tap microphone and start speaking')}</span>
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Locale: <strong>{langLocale}</strong> • Browser Web Speech API
            </p>
          </div>

          {/* Transcript preview box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[50px] text-left text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Spoken Speech:
            </span>
            <p className="text-slate-800 italic">
              {transcript || interimTranscript || (
                <span className="text-slate-400 not-italic">
                  {isListening ? 'Listening for your voice...' : 'Nothing heard yet. Tap the microphone and speak.'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Parsed Fields Preview */}
        {parsedData && (
          <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                {t('voice.extractedHeader', 'Structured Produce Fields')}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Auto-Extracted
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold">{t('voice.cropDetected', 'Crop Produce')}</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {parsedData.cropName || <span className="text-amber-600 text-xs font-medium">{t('voice.sayCropName', 'Say crop name')}</span>}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold">{t('voice.qtyDetected', 'Quantity')}</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {parsedData.quantityKg ? `${Number(parsedData.quantityKg).toLocaleString()} kg` : <span className="text-amber-600 text-xs font-medium">{t('voice.sayQuantity', 'Say quantity')}</span>}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold">{t('voice.priceDetected', 'Asking Rate')}</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {parsedData.askingPricePerKg ? `₹${parsedData.askingPricePerKg}/kg` : <span className="text-amber-600 text-xs font-medium">{t('voice.sayPriceRate', 'Say price/rate')}</span>}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold">{t('voice.gradeDetected', 'Quality Grade')}</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {parsedData.qualityGrade} {parsedData.isOrganic && '• Organic 🌿'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApply}
              disabled={!hasAnyDetected}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t('voice.applyToForm', 'Apply to Produce Listing Form')}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
