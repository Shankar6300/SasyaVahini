import React from 'react';
import { useCompare } from '@/context/CompareContext';
import { useToast } from '@/components/Toast';
import { Scale, Check } from 'lucide-react';

/**
 * ProductCompareButton Component (Phase 4)
 * Allows buyers to toggle an agricultural listing into the comparison tray.
 */
export default function ProductCompareButton({ product, compact = false, className = '' }) {
  const { isInCompare, toggleCompare } = useCompare();
  let toast;
  try {
    toast = useToast();
  } catch (e) {
    toast = { success: () => {}, error: () => {}, warning: () => {}, info: () => {} };
  }

  if (!product || !product.id) return null;

  const isSelected = isInCompare(product.id);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const res = toggleCompare(product);
    if (res.action === 'ADDED') {
      toast.success(res.message);
      if (res.notice) {
        toast.info(res.notice, 6000);
      }
    } else if (res.action === 'REMOVED') {
      toast.info(res.message);
    } else if (res.error || res.message) {
      toast.warning(res.error || res.message);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`comparison-toggle-btn compact ${isSelected ? 'active' : ''} ${className}`}
        title={isSelected ? 'Remove from comparison' : 'Add to side-by-side comparison'}
        aria-pressed={isSelected}
        aria-label={isSelected ? `Remove ${product.cropName} from comparison` : `Compare ${product.cropName}`}
      >
        {isSelected ? <Check size={13} className="text-emerald-700" /> : <Scale size={13} />}
        <span>{isSelected ? 'In Compare' : 'Compare'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`comparison-toggle-btn standard ${isSelected ? 'active' : ''} ${className}`}
      title={isSelected ? 'Remove from comparison' : 'Add to side-by-side comparison'}
      aria-pressed={isSelected}
      aria-label={isSelected ? `Remove ${product.cropName} from comparison` : `Compare ${product.cropName}`}
    >
      {isSelected ? <Check size={15} className="text-emerald-700" /> : <Scale size={15} />}
      <span>{isSelected ? 'Selected for Comparison' : 'Add to Compare'}</span>
    </button>
  );
}
