import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompare } from '@/context/CompareContext';
import { Scale, X, ArrowRight, Trash2, AlertCircle } from 'lucide-react';

/**
 * ComparisonSelectionBar Component (Phase 4)
 * Floating bottom tray displayed when 1 to 4 produce lots are selected for comparison.
 */
export default function ComparisonSelectionBar() {
  const navigate = useNavigate();
  const { selectedListings, removeFromCompare, clearCompare, canCompare, maxLimit } = useCompare();

  if (!selectedListings || selectedListings.length === 0) return null;

  return (
    <div
      className="comparison-floating-bar"
      role="region"
      aria-label="Produce comparison tray"
    >
      <div className="comparison-bar-container">
        {/* Left: Indicator & Count */}
        <div className="comparison-bar-info">
          <div className="comparison-bar-badge">
            <Scale size={18} className="text-[#245C43]" />
            <span>
              Compare Produce (<strong>{selectedListings.length}</strong>/{maxLimit})
            </span>
          </div>
          {!canCompare && (
            <p className="comparison-bar-hint">
              <AlertCircle size={12} className="inline mr-1 text-amber-600" />
              Select at least 2 produce lots to unlock side-by-side comparison.
            </p>
          )}
        </div>

        {/* Center: Selected Produce Thumbnails */}
        <div className="comparison-bar-items">
          {selectedListings.map((item) => (
            <div key={item.id} className="comparison-bar-chip">
              <span className="comparison-chip-crop">{item.cropName}</span>
              <span className="comparison-chip-price">₹{item.askingPricePerKg}/kg</span>
              <button
                type="button"
                onClick={() => removeFromCompare(item.id)}
                className="comparison-chip-remove"
                title={`Remove ${item.cropName} from comparison`}
                aria-label={`Remove ${item.cropName}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="comparison-bar-actions">
          <button
            type="button"
            onClick={clearCompare}
            className="comparison-bar-btn-clear"
            title="Clear all selected produce lots"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>

          <button
            type="button"
            disabled={!canCompare}
            onClick={() => {
              navigate('/buyer/compare');
            }}
            className={`comparison-bar-btn-compare ${!canCompare ? 'disabled' : ''}`}
            title={canCompare ? 'View side-by-side comparison' : 'Select at least 2 items'}
          >
            <span>Compare Now</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
