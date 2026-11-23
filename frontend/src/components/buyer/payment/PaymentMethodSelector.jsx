/**
 * SasyaVahini — Payment Method Selector (Phase 6)
 *
 * Implements selectable Indian payment channels:
 * UPI (GPay, PhonePe, Paytm, QR), Debit/Credit Cards (RuPay, Visa, MC),
 * Net Banking (All major Indian banks), and Agricultural Escrow.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React from 'react';
import { QrCode, CreditCard, Landmark, ShieldCheck, Check } from 'lucide-react';

const PAYMENT_METHODS = [
  {
    id: 'UPI',
    title: 'UPI / Instant QR',
    subtitle: 'Google Pay, PhonePe, Paytm, BHIM, UPI Apps',
    icon: QrCode,
    badge: 'Zero Convenience Fee',
  },
  {
    id: 'CARD',
    title: 'Debit & Credit Cards',
    subtitle: 'RuPay, Visa, MasterCard, Corporate Cards',
    icon: CreditCard,
    badge: 'RBI Tokenized',
  },
  {
    id: 'NETBANKING',
    title: 'Net Banking',
    subtitle: 'SBI, HDFC, ICICI, Axis, PNB & 50+ Banks',
    icon: Landmark,
    badge: 'Direct Bank Settlement',
  },
  {
    id: 'ESCROW',
    title: 'SasyaVahini Escrow Protection',
    subtitle: 'Funds released to farmers only upon verified delivery',
    icon: ShieldCheck,
    badge: 'Buyer Protected',
  },
];

export default function PaymentMethodSelector({ selectedMethod, onSelectMethod }) {
  return (
    <div className="payment-method-selector-section mb-6">
      <h3 className="font-bold text-sm text-[#202820] mb-3 flex items-center justify-between">
        <span>Select Payment Method</span>
        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          🔒 256-Bit SSL Encrypted
        </span>
      </h3>

      <div className="payment-method-grid">
        {PAYMENT_METHODS.map((method) => {
          const isSelected = selectedMethod === method.id;
          const Icon = method.icon;

          return (
            <div
              key={method.id}
              onClick={() => onSelectMethod(method.id)}
              className={`payment-method-card ${isSelected ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectMethod(method.id);
              }}
            >
              <div className="payment-method-icon-wrap">
                <Icon size={20} />
              </div>

              <div className="payment-method-info">
                <div className="flex items-center justify-between">
                  <p className="payment-method-title">{method.title}</p>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-[#245C43] text-white flex items-center justify-center">
                      <Check size={10} />
                    </div>
                  )}
                </div>
                <p className="payment-method-sub">{method.subtitle}</p>
                <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  {method.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
