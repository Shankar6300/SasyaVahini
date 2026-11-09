import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', locale: 'en-IN', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi',   nativeName: 'हिन्दी',  locale: 'hi-IN', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',  nativeName: 'తెలుగు',  locale: 'te-IN', flag: '🇮🇳' }
];

export default function LanguageSelector({ className = '', compact = false }) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === (i18n.language?.slice(0, 2) || 'en')) || SUPPORTED_LANGUAGES[0];

  const handleSelect = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('sv_language', langCode);
    setIsOpen(false);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('common.language')}
      >
        <Globe className="w-3.5 h-3.5 text-emerald-600" />
        <span className="font-bold">{compact ? currentLang.code.toUpperCase() : currentLang.nativeName}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-2xl bg-white shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            {t('common.language')}
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLang.code === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors ${
                  isSelected ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
                role="menuitem"
              >
                <div className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <div>
                    <span className="font-bold block">{lang.nativeName}</span>
                    <span className="text-[10px] text-slate-400 block">{lang.name}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

