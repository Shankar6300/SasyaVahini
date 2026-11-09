import React from 'react';
import { User, Building2 } from 'lucide-react';

const BUYER_TYPES = [
  {
    id: 'consumer',
    title: 'Individual Consumer',
    description: 'For households and individuals buying fresh agricultural produce.',
    icon: User,
  },
  {
    id: 'business',
    title: 'Business Buyer',
    description: 'For restaurants, retailers, hotels, wholesalers and other businesses.',
    icon: Building2,
  },
];

export default function BuyerTypeSelector({ value, onChange }) {
  return (
    <div className="buyer-type-section">
      <p className="buyer-type-section-title">I want to buy as</p>
      <div className="buyer-type-grid" role="radiogroup" aria-label="Buyer type">
        {BUYER_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.id;
          return (
            <button
              key={type.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`buyer-type-card${isSelected ? ' selected' : ''}`}
              onClick={() => onChange(type.id)}
            >
              <span className="buyer-type-card-radio" aria-hidden="true" />
              <span className="buyer-type-card-icon">
                <Icon size={22} />
              </span>
              <span className="buyer-type-card-title">{type.title}</span>
              <span className="buyer-type-card-desc">{type.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
