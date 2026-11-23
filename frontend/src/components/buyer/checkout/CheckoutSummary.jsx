/**
 * SasyaVahini — Checkout Summary & Review Component (Phase 5)
 *
 * Implements authoritative price breakdown, logistics calculations,
 * and the Phase 5 completion boundary review.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { useState } from 'react';
import {
  ShieldCheck, Truck, Clock, Sparkles, MapPin, CheckCircle2,
  ChevronRight, ArrowLeft, Info, Check, AlertCircle, Building2
} from 'lucide-react';

export default function CheckoutSummary({
  checkoutData,
  onBackToCart,
  onAddressChangeRequired,
}) {
  const [showPaymentNoticeModal, setShowPaymentNoticeModal] = useState(false);

  if (!checkoutData) {
    return (
      <div className="p-8 text-center bg-white border border-[#DDE5DC] rounded-xl">
        <p className="text-sm text-[#68736B]">No checkout summary data available. Please return to your cart.</p>
        <button type="button" onClick={onBackToCart} className="buyer-btn buyer-btn-primary mt-3">
          Back to Cart
        </button>
      </div>
    );
  }

  const {
    buyer,
    deliveryAddress,
    itemsCount,
    totalQuantityKg,
    costBreakdown,
    supplierGroups = [],
    nextPhaseNotice,
  } = checkoutData;

  return (
    <div className="checkout-summary-wrap" aria-label="Authoritative Checkout Summary">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left 2 Columns: Order Details & Suppliers ─────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Buyer & Delivery Destination Card */}
          <div className="p-5 bg-white border border-[#DDE5DC] rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-[#EEF2EE] pb-2.5">
              <h4 className="font-bold text-sm text-[#202820] flex items-center gap-2">
                <MapPin size={16} className="text-[#245C43]" />
                <span>Confirmed Delivery Destination</span>
              </h4>
              <button
                type="button"
                onClick={onAddressChangeRequired}
                className="text-xs font-bold text-[#245C43] hover:underline"
              >
                Change Address
              </button>
            </div>

            {deliveryAddress ? (
              <div className="text-xs text-[#202820] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#202820]">{deliveryAddress.recipientName}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    {deliveryAddress.addressType}
                  </span>
                </div>
                <p className="text-[#68736B]">Contact: {deliveryAddress.contactNumber} · Recipient Buyer: {buyer?.name}</p>
                <p className="leading-relaxed">
                  {deliveryAddress.addressLine1}
                  {deliveryAddress.addressLine2 ? `, ${deliveryAddress.addressLine2}` : ''}
                </p>
                <p className="font-medium text-[#202820]">
                  {deliveryAddress.city}, {deliveryAddress.state} — {deliveryAddress.postalCode}
                </p>
                {deliveryAddress.deliveryInstructions && (
                  <p className="text-[11px] text-[#68736B] italic mt-1">
                    Instructions: "{deliveryAddress.deliveryInstructions}"
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <AlertCircle size={14} className="inline mr-1" />
                No delivery address selected. Please select an address to compute transit charges.
              </div>
            )}
          </div>

          {/* Supplier-wise Batch Review & Logistics Calculations */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-[#202820] flex items-center gap-2">
              <Truck size={16} className="text-[#245C43]" />
              <span>Logistics & Supplier Direct Fulfilment ({supplierGroups.length} FPOs / Clusters)</span>
            </h4>

            {supplierGroups.map((group, idx) => (
              <div key={idx} className="p-5 bg-white border border-[#DDE5DC] rounded-xl shadow-sm">
                <div className="flex items-center justify-between border-b border-[#EEF2EE] pb-3 mb-3">
                  <div>
                    <h5 className="font-bold text-sm text-[#202820] flex items-center gap-1.5">
                      <span>{group.supplierName}</span>
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    </h5>
                    <p className="text-xs text-[#68736B]">
                      Origin: {group.location} · {group.supplierType === 'FPO_PRODUCER_CO' ? 'Farmer Producer Org' : 'Direct Farmer'}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    {group.supplierQuantityKg} kg allocated
                  </span>
                </div>

                {/* Items in this cluster */}
                <div className="divide-y divide-slate-100 mb-4">
                  {group.items?.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#202820]">{item.cropName}</span>
                        <span className="text-[#68736B] ml-2">({item.qualityGrade?.replace('_', ' ')})</span>
                        <span className="text-xs text-emerald-700 block">
                          ₹{item.unitPrice}/kg × {item.quantityKg} kg
                        </span>
                      </div>
                      <span className="font-bold text-sm text-[#202820]">
                        ₹{item.itemSubtotal?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Logistics Route Quote */}
                {group.delivery && (
                  <div className="p-3 bg-[#F8F8F3] border border-[#DDE5DC] rounded-lg text-xs text-[#68736B] flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-[#245C43]" />
                      <span>
                        Vehicle: <strong>{group.delivery.vehicleType}</strong> (~{group.delivery.roadKm} km)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-amber-700" />
                      <span>{group.delivery.estimatedTimeWindow}</span>
                    </div>
                    <span className="font-bold text-[#245C43]">
                      Delivery Cost: ₹{group.delivery.deliveryCost}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column: Transparent Cost Breakdown ─────────────────── */}
        <div>
          <div className="p-6 bg-white border border-[#DDE5DC] rounded-xl shadow-sm sticky top-6">
            <h3 className="font-extrabold text-base text-[#202820] mb-4 border-b border-[#DDE5DC] pb-3">
              Authoritative Cost Breakdown
            </h3>

            <div className="space-y-3 text-xs mb-5">
              <div className="flex justify-between text-[#68736B]">
                <span>Produce Net Subtotal ({itemsCount} lots, {totalQuantityKg} kg):</span>
                <strong className="text-[#202820] font-bold">
                  ₹{costBreakdown?.productSubtotal?.toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="flex justify-between text-[#68736B]">
                <span>Agricultural Road Freight:</span>
                <strong className="text-[#202820] font-bold">
                  ₹{costBreakdown?.deliveryCost?.toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="flex justify-between text-[#68736B]">
                <span>FPO Aggregation & Handling (₹0.50/kg):</span>
                <span className="text-[#202820]">
                  ₹{costBreakdown?.handlingFee?.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between text-[#68736B]">
                <span>Platform Facilitation Fee (2%):</span>
                <span className="text-[#202820]">
                  ₹{costBreakdown?.platformFee?.toLocaleString('en-IN')}
                </span>
              </div>

              {costBreakdown?.bulkDiscountApplied && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Bulk Order Incentive (3%):</span>
                  <span>-₹{costBreakdown?.bulkDiscount?.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-[#68736B]">
                <span>Applicable GST:</span>
                <span className="text-emerald-700 font-bold">₹0.00 (0% Exempt)</span>
              </div>
              <p className="text-[10px] text-[#68736B] italic -mt-1 leading-normal">
                {costBreakdown?.taxNotes}
              </p>
            </div>

            <div className="border-t-2 border-[#DDE5DC] pt-4 mb-5">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-extrabold text-[#202820] block">
                    Estimated Landed Total
                  </span>
                  <span className="text-[11px] text-[#68736B]">Full farm-to-destination quote</span>
                </div>
                <span className="text-2xl font-black text-[#245C43]">
                  ₹{costBreakdown?.estimatedTotal?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPaymentNoticeModal(true)}
              disabled={!deliveryAddress}
              className="w-full py-3.5 px-4 bg-[#245C43] hover:bg-[#173F30] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <span>Continue to Payment</span>
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={onBackToCart}
              className="w-full mt-2.5 py-2.5 text-xs font-bold text-[#68736B] hover:text-[#202820] flex items-center justify-center gap-1"
            >
              <ArrowLeft size={13} /> Back to Edit Cart
            </button>

            {/* Invariant guarantee note */}
            <div className="mt-4 pt-3 border-t border-[#EEF2EE] flex items-center gap-2 text-[11px] text-[#68736B]">
              <ShieldCheck size={14} className="text-emerald-700 flex-shrink-0" />
              <span>Authoritative server-side calculation. No hidden broker commissions.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Strict Phase Boundary Notice Modal (Section 9.4 & 16) ──────── */}
      {showPaymentNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#DDE5DC]">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#245C43] flex items-center justify-center mb-4 mx-auto">
              <CheckCircle2 size={26} />
            </div>

            <h3 className="text-center font-bold text-lg text-[#202820] mb-2">
              Checkout Preparation Complete
            </h3>

            <p className="text-xs text-[#68736B] text-center mb-4 leading-relaxed">
              {nextPhaseNotice ||
                'Checkout details are ready. Payment processing and escrow will be available in the next phase (Phase 6).'}
            </p>

            <div className="p-3 bg-[#F8F8F3] border border-[#DDE5DC] rounded-xl text-xs space-y-1.5 mb-5 text-[#202820]">
              <div className="flex justify-between">
                <span className="text-[#68736B]">Buyer:</span>
                <span className="font-semibold">{buyer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68736B]">Destination:</span>
                <span className="font-semibold">{deliveryAddress?.city}, {deliveryAddress?.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68736B]">Total Produce Lots:</span>
                <span className="font-semibold">{itemsCount} ({totalQuantityKg} kg)</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="font-bold">Total Landed Amount:</span>
                <span className="font-bold text-[#245C43]">₹{costBreakdown?.estimatedTotal?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 mb-5 flex items-start gap-2">
              <Info size={14} className="text-blue-700 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Capstone Phase Boundary:</strong> Under the project implementation plan, Phase 5 prepares and validates the checkout ledger. UPI, Escrow, and Net Banking will be initialized in Phase 6.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPaymentNoticeModal(false)}
              className="w-full buyer-btn buyer-btn-primary"
            >
              Acknowledged & Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
