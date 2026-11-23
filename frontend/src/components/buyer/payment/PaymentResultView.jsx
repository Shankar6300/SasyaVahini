/**
 * SasyaVahini — Payment Result & Invoice Confirmation View (Phase 6)
 *
 * Displays verified transaction details, digital tax invoice summary,
 * one-click PDF invoice download, and navigation actions.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Download, FileText, ArrowRight, ShieldCheck,
  ShoppingBag, ExternalLink, Calendar, CreditCard, RefreshCw, AlertCircle
} from 'lucide-react';
import paymentApi from '@/services/paymentApi';
import { useToast } from '@/components/Toast';

export default function PaymentResultView({
  resultData,
  onReset,
}) {
  const navigate = useNavigate();
  const { addToast } = useToast() || {};
  const [isDownloading, setIsDownloading] = useState(false);

  const transaction = resultData?.transaction || {};
  const invoice = resultData?.invoice || {};

  const handleDownloadPdf = async () => {
    if (!invoice?.id) {
      if (addToast) addToast('Invoice identifier not available.', 'error');
      return;
    }
    try {
      setIsDownloading(true);
      await paymentApi.downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
      if (addToast) addToast('Tax invoice PDF downloaded successfully.', 'success');
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      if (addToast) addToast('Could not download invoice PDF. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="payment-result-container animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* ── Success Header ─────────────────────────────────────────── */}
      <div className="payment-success-card">
        <div className="payment-success-icon-wrap">
          <CheckCircle2 size={48} className="text-[#245C43]" />
        </div>
        <h2 className="payment-success-title">Payment Confirmed & Verified</h2>
        <p className="payment-success-subtitle">
          Your payment has been securely authorized and verified via HMAC-SHA256 signature verification.
          Farmer allocation has been locked and your digital tax invoice is generated.
        </p>

        {/* Amount Badge */}
        <div className="payment-amount-pill">
          <span className="text-xs uppercase tracking-wider text-[#68736B] block">Total Amount Paid</span>
          <span className="text-3xl font-black text-[#245C43]">
            ₹{Number(transaction.amount || invoice.totalAmount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">
            Status: {transaction.status || 'SUCCESS'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* ── Transaction Details Card ─────────────────────────────── */}
        <div className="p-5 bg-white border border-[#DDE5DC] rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#EEF2EE]">
            <CreditCard size={18} className="text-[#245C43]" />
            <h3 className="font-bold text-sm text-[#202820]">Transaction Details</h3>
          </div>

          <dl className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <dt className="text-[#68736B]">Order / Checkout Ref</dt>
              <dd className="font-mono font-bold text-[#202820]">{transaction.checkoutRef || 'N/A'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-[#68736B]">Gateway Order ID</dt>
              <dd className="font-mono text-[#202820] truncate max-w-[180px]">{transaction.gatewayOrderId || 'N/A'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-[#68736B]">Gateway Payment ID</dt>
              <dd className="font-mono text-[#202820] truncate max-w-[180px]">{transaction.gatewayPaymentId || 'N/A'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-[#68736B]">Payment Method</dt>
              <dd className="font-bold text-[#245C43]">{transaction.paymentMethod || 'UPI'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-[#68736B]">Date & Time</dt>
              <dd className="text-[#202820]">
                {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}
              </dd>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#F0F4F0]">
              <dt className="text-[#68736B]">Verification Protocol</dt>
              <dd className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck size={14} /> HMAC-SHA256 Match
              </dd>
            </div>
          </dl>
        </div>

        {/* ── Invoice Summary Card ─────────────────────────────────── */}
        <div className="p-5 bg-white border border-[#DDE5DC] rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EEF2EE]">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#245C43]" />
                <h3 className="font-bold text-sm text-[#202820]">Agricultural Tax Invoice</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#F0F4F0] text-[#245C43] rounded-md">
                {invoice.invoiceNumber || 'INV-2026'}
              </span>
            </div>

            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#68736B]">Produce Subtotal</dt>
                <dd className="font-semibold text-[#202820]">
                  ₹{Number(invoice.subtotal || 0).toLocaleString('en-IN')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#68736B]">GST (Agri Produce Exempt)</dt>
                <dd className="font-semibold text-[#202820]">₹0.00 (0%)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#68736B]">Delivery & Transport</dt>
                <dd className="font-semibold text-[#202820]">
                  ₹{Number(invoice.deliveryFee || 0).toLocaleString('en-IN')}
                </dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#EEF2EE] font-bold text-sm text-[#245C43]">
                <dt>Total Invoice Amount</dt>
                <dd>₹{Number(invoice.totalAmount || 0).toLocaleString('en-IN')}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 pt-4 border-t border-[#EEF2EE]">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading || !invoice?.id}
              className="w-full py-2.5 px-4 bg-[#245C43] hover:bg-[#173F30] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Generating Vector PDF...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download Tax Invoice (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Navigation Actions ────────────────────────────────────── */}
      <div className="mt-8 pt-6 border-t border-[#DDE5DC] flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/buyer/marketplace')}
          className="py-2.5 px-5 bg-white border border-[#DDE5DC] hover:border-[#245C43] text-[#202820] rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"
        >
          <ShoppingBag size={14} />
          <span>Return to Marketplace</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/buyer/transactions')}
            className="py-2.5 px-4 bg-[#F8F8F3] hover:bg-[#EAEFEA] text-[#245C43] rounded-xl font-bold text-xs transition-colors"
          >
            All Transactions
          </button>
          <button
            type="button"
            onClick={() => navigate('/buyer/invoices')}
            className="py-2.5 px-5 bg-[#245C43] hover:bg-[#173F30] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>My Invoices</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
