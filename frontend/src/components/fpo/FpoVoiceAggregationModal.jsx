import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, X, Sparkles, Check, Calculator } from 'lucide-react';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import { parseFpoBulkVoice } from '../../services/voiceFormParser';

export default function FpoVoiceAggregationModal({ isOpen, onClose, onApplyLots }) {
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

  const [parsedEntries, setParsedEntries] = useState([]);
  const [showFormula] = useState(true);

  if (!isOpen) return null;

  const currentLang = i18n.language?.slice(0, 2) || 'en';

  const handleStart = () => {
    resetTranscript();
    setParsedEntries([]);
    startListening({
      continuous: true,
      onResult: (fullText, chunk) => {
        const text = chunk || fullText;
        if (text) {
          const results = parseFpoBulkVoice(text);
          if (results.length > 0) {
            setParsedEntries(results);
          }
        }
      }
    });
  };

  const handleStop = () => {
    stopListening();
    const activeText = transcript || interimTranscript;
    if (activeText) {
      const results = parseFpoBulkVoice(activeText);
      if (results.length > 0) {
        setParsedEntries(results);
      }
    }
  };

  // Calculate live weighted average rate
  const totalQty = parsedEntries.reduce((s, e) => s + (parseFloat(e.quantityKg) || 0), 0);
  const totalValuation = parsedEntries.reduce((s, e) => s + ((parseFloat(e.quantityKg) || 0) * (parseFloat(e.askingPricePerKg) || 0)), 0);
  const weightedRate = totalQty > 0 ? (totalValuation / totalQty).toFixed(2) : '0.00';

  const handleConfirm = () => {
    if (parsedEntries.length > 0 && onApplyLots) {
      onApplyLots(parsedEntries, weightedRate);
      onClose();
    }
  };

  const exampleVoicePhrases = {
    te: '"రామయ్య 500 కిలోల టమాటాలు కిలో 24 రూపాయలు, లక్ష్మి 300 కిలోల టమాటాలు కిలో 25 రూపాయలు"',
    hi: '"रामैया 500 किलो टमाटर 24 रुपये, लक्ष्मी 300 किलो टमाटर 25 रुपये"',
    en: '"Ramayya 500 kg Tomato at 24 rupees, Lakshmi 300 kg Tomato at 25 rupees"'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200 shadow-sm">
              <Sparkles className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {t('fpo.smartVoiceAggTitle', 'FPO Smart Voice Aggregation')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('fpo.smartVoiceAggIntro', 'Dictate multiple member farmer contributions. Natural language extracts name, crop, quantity, and asking rates.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { stopListening(); onClose(); }}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Spoken example banner */}
        <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-3 text-xs text-sky-950">
          <p className="font-extrabold text-[11px] text-sky-800 uppercase tracking-wider mb-1">
            Example Spoken Input ({langLocale})
          </p>
          <p className="italic font-medium text-sky-900">
            {exampleVoicePhrases[currentLang] || exampleVoicePhrases.en}
          </p>
        </div>

        {/* Microphone Recording Area */}
        <div className="text-center py-2 space-y-3">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={isListening ? handleStop : handleStart}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl focus:outline-none cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-200'
                  : 'bg-sky-700 hover:bg-sky-800 text-white ring-8 ring-sky-100'
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
                  {t('voice.listening', 'Listening now... speak member contributions')}
                </span>
              ) : (
                <span>{t('voice.tapToSpeak', 'Tap microphone to speak member lots')}</span>
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Locale: <strong>{langLocale}</strong>
            </p>
          </div>

          {/* Transcript box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[50px] text-left text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Spoken Input:
            </span>
            <p className="text-slate-800 italic">
              {transcript || interimTranscript || (
                <span className="text-slate-400 not-italic">
                  {isListening ? 'Listening for farmer contributions...' : 'Tap microphone and start speaking.'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Parsed Member Contributions Table */}
        {parsedEntries.length > 0 && (
          <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                Parsed Member Contributions ({parsedEntries.length})
              </span>
              <span className="text-[10px] font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                Auto-Extracted
              </span>
            </div>

            <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200 overflow-hidden">
              {parsedEntries.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-black text-slate-900 block">{item.farmerName || `Farmer ${idx + 1}`}</span>
                    <span className="text-slate-500 text-[11px]">{item.cropName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 block">{item.quantityKg} kg</span>
                    <span className="font-extrabold text-emerald-700 text-xs">₹{item.askingPricePerKg}/kg</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Weighted Calculation Card */}
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">{t('fpo.totalAggregatedConsignment', 'Total Aggregated Consignment')}</span>
                  <span className="font-black text-slate-900 text-base">{totalQty.toLocaleString()} kg</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">{t('fpo.consolidatedWeightedRate', 'Consolidated Weighted Asking Rate')}</span>
                  <span className="font-black text-emerald-700 text-lg">₹{weightedRate}/kg</span>
                </div>
              </div>

              {/* Formula & Step-by-Step Walkthrough */}
              {showFormula && (
                <div className="pt-2 border-t border-emerald-200 text-[11px] text-emerald-950 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                    {t('fpo.mathematicalProof', 'Mathematical Proof:')}
                  </p>
                  <p className="font-mono bg-white/80 p-2 rounded-lg border border-emerald-200">
                    Weighted Rate = Σ(Quantity × Price) ÷ Σ(Quantity)
                    <br />
                    = ₹{totalValuation.toLocaleString()} ÷ {totalQty.toLocaleString()} kg = <strong>₹{weightedRate}/kg</strong>
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Standard DoCA/SFAC compliance: Ensures farmers with larger volume or higher minimums receive proportional settlement without undercutting.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Add {parsedEntries.length} Contributions to Aggregation Pool</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

