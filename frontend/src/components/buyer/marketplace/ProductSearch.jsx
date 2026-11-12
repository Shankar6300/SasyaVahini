import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, MapPin, Tag, Leaf } from 'lucide-react';
import marketplaceApi from '@/services/marketplaceApi';

const RECENT_SEARCHES_KEY = 'sasyavahini_buyer_recent_searches';

export default function ProductSearch({ initialQuery = '', onSearch }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const wrapperRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {
      // fallback safely
    }
  }, []);

  // Sync internal state with external initialQuery
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Debounced search suggestions
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await marketplaceApi.getSearchSuggestions(query.trim());
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Close suggestions popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveRecentSearch = (text) => {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    const updated = [clean, ...recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    saveRecentSearch(query);
    onSearch(query.trim());
  };

  const handleSelectSuggestion = (text) => {
    setQuery(text);
    setShowSuggestions(false);
    saveRecentSearch(text);
    onSearch(text);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    onSearch('');
  };

  const getSuggestionIcon = (type) => {
    if (type === 'crop') return <Leaf size={14} className="text-[#245C43]" />;
    if (type === 'district') return <MapPin size={14} className="text-amber-600" />;
    return <Tag size={14} className="text-blue-600" />;
  };

  return (
    <div className="marketplace-search-wrapper" ref={wrapperRef}>
      <form onSubmit={handleFormSubmit} className="marketplace-search-bar">
        <Search size={18} className="text-[#68736B] flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search fresh crops, varieties, FPO lots, or farming districts (e.g. Tomato, Pune, Sharbati Wheat)..."
          className="marketplace-search-input"
          aria-label="Search produce"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="marketplace-search-clear"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}

        <button type="submit" className="marketplace-search-submit">
          Search
        </button>
      </form>

      {/* ── Autocomplete Suggestions Popover ────────────────────────── */}
      {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
        <div className="marketplace-suggestions-menu" role="listbox">
          {suggestions.map((item, index) => (
            <div
              key={`${item.type}-${item.text}-${index}`}
              onClick={() => handleSelectSuggestion(item.text)}
              className="marketplace-suggestion-item"
              role="option"
              tabIndex={0}
            >
              <div className="flex items-center gap-2.5">
                {getSuggestionIcon(item.type)}
                <span className="text-sm font-semibold text-[#202820]">{item.text}</span>
              </div>
              <span className="text-[11px] font-bold text-[#68736B] uppercase bg-[#F0F5F0] px-2 py-0.5 rounded">
                {item.type}
              </span>
            </div>
          ))}

          {recentSearches.length > 0 && (
            <div className="marketplace-recent-searches">
              <span className="text-xs font-bold text-[#68736B] flex items-center gap-1">
                <Clock size={12} /> Recent:
              </span>
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleSelectSuggestion(term)}
                  className="marketplace-recent-tag"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
