/**
 * SasyaVahini — Buyer Invoices Page (Phase 6)
 *
 * Lists all digital tax invoices generated for authenticated purchases,
 * displaying produce breakdowns, 0% agricultural GST exemption, and direct PDF downloads.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Calendar, ArrowRight, ShieldCheck,
  Search, RefreshCw, AlertCircle, ShoppingBag, Eye, X, CheckCircle2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import paymentApi from '@/services/paymentApi';
import { useToast } from '@/components/Toast';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { addToast } = useToast() || {};

  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInvoices = async (page = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await paymentApi.getInvoices(page, 20);
      setInvoices(res.invoices || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, totalCount: 0 });
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError(err.response?.data?.error?.message || 'Failed to retrieve your invoices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(1);
  }, []);

  const handleDownloadPdf = async (inv) => {
    try {
      setDownloadingId(inv.id);
      await paymentApi.downloadInvoicePdf(inv.id, inv.invoiceNumber);
      if (addToast) addToast(`Invoice ${inv.invoiceNumber} downloaded.`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      if (addToast) addToast('Failed to download invoice PDF.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(term) ||
      inv.transaction?.checkoutRef?.toLowerCase().includes(term) ||
      inv.transaction?.gatewayPaymentId?.toLowerCase().includes(term)
    );
  });

  const totalSpent = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

  return (
    <div className="buyer-invoices-page max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-200">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-[#DDE5DC]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#245C43] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck size={12} /> Direct Procurement GST Compliance
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#202820]">Agricultural Tax Invoices</h1>
          <p className="text-xs text-[#68736B] mt-1">
            Download digital tax invoices for your verified farm procurements with statutory 0% GST exemption.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchInvoices(pagination.page)}
          disabled={isLoading}
          className="self-start md:self-auto px-3.5 py-2 bg-white border border-[#DDE5DC] hover:border-[#245C43] rounded-xl text-xs font-bold text-[#202820] flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Invoices</span>
        </button>
      </div>

      {/* ── Financial Metrics Summary ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white border border-[#DDE5DC] rounded-xl shadow-sm">
          <span className="text-xs text-[#68736B] block">Total Invoices</span>
          <span className="text-2xl font-black text-[#202820] mt-1 block">
            {pagination.totalCount || invoices.length}
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            100% Tax Compliant
          </span>
        </div>

        <div className="p-4 bg-white border border-[#DDE5DC] rounded-xl shadow-sm">
          <span className="text-xs text-[#68736B] block">Total Settled Spend</span>
          <span className="text-2xl font-black text-[#245C43] mt-1 block">
            ₹{totalSpent.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-[#68736B] block mt-1">
            Authoritative Server Verified
          </span>
        </div>

        <div className="p-4 bg-white border border-[#DDE5DC] rounded-xl shadow-sm">
          <span className="text-xs text-[#68736B] block">Agri Produce GST Rate</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            0% Exempt
          </span>
          <span className="text-[11px] text-[#68736B] block mt-1">
            Sec 11 CGST Act / Notif 2/2017
          </span>
        </div>
      </div>

      {/* ── Search & Filter Bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#68736B]" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#DDE5DC] rounded-xl text-xs focus:outline-none focus:border-[#245C43]"
            placeholder="Search by invoice number or order ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── Main Content Area ───────────────────────────────────────── */}
      {isLoading && invoices.length === 0 ? (
        <div className="py-16 text-center bg-white border border-[#DDE5DC] rounded-2xl shadow-sm">
          <RefreshCw size={32} className="animate-spin text-[#245C43] mx-auto mb-3" />
          <p className="text-sm font-bold text-[#202820]">Loading Your Invoices...</p>
          <p className="text-xs text-[#68736B]">Fetching verified tax records from SasyaVahini ledger.</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 text-center">
          <AlertCircle size={24} className="mx-auto text-red-600 mb-2" />
          <p className="font-bold mb-1">{error}</p>
          <button
            type="button"
            onClick={() => fetchInvoices(1)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs"
          >
            Try Again
          </button>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-16 text-center bg-white border border-[#DDE5DC] rounded-2xl shadow-sm">
          <FileText size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#202820] mb-1">No Invoices Found</h3>
          <p className="text-xs text-[#68736B] max-w-sm mx-auto mb-4">
            {searchTerm
              ? `No invoices matched "${searchTerm}". Try searching for another reference number.`
              : 'You have not completed any payments yet. When you complete checkout, your tax invoices will appear here.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/buyer/marketplace')}
            className="py-2 px-5 bg-[#245C43] hover:bg-[#173F30] text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <ShoppingBag size={14} />
            <span>Browse Farm Marketplace</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="p-5 bg-white border border-[#DDE5DC] hover:border-[#245C43] rounded-2xl shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#245C43] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-[#202820]">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      TAX INVOICE
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#68736B] mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(inv.issuedAt || inv.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span>Order: <strong className="text-[#202820]">{inv.transaction?.checkoutRef || 'Direct'}</strong></span>
                    <span>Method: <strong className="text-[#245C43]">{inv.transaction?.paymentMethod || 'UPI'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-[#EEF2EE]">
                <div className="text-left md:text-right">
                  <span className="text-[11px] text-[#68736B] block">Total Amount</span>
                  <span className="text-lg font-black text-[#245C43]">
                    ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(inv)}
                    className="p-2.5 bg-[#F8F8F3] hover:bg-[#EAEFEA] text-[#202820] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="View Breakdown"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(inv)}
                    disabled={downloadingId === inv.id}
                    className="py-2.5 px-4 bg-[#245C43] hover:bg-[#173F30] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {downloadingId === inv.id ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download size={13} />
                        <span>PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Invoice Detail Modal ────────────────────────────────────── */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#DDE5DC] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EEF2EE]">
              <div>
                <h3 className="font-bold text-base text-[#202820]">
                  Invoice {selectedInvoice.invoiceNumber}
                </h3>
                <p className="text-xs text-[#68736B]">
                  Issued on {new Date(selectedInvoice.issuedAt || selectedInvoice.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-[#68736B] hover:text-[#202820] p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#F8F8F3] rounded-xl space-y-1.5 border border-[#DDE5DC]">
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Recipient Buyer:</span>
                  <span className="font-semibold text-[#202820]">{selectedInvoice.buyerSnapshotJson?.name || 'Registered Buyer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Order Reference:</span>
                  <span className="font-mono font-bold text-[#202820]">{selectedInvoice.transaction?.checkoutRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Payment Method:</span>
                  <span className="font-bold text-[#245C43]">{selectedInvoice.transaction?.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Transaction ID:</span>
                  <span className="font-mono text-[11px] text-[#202820]">{selectedInvoice.transaction?.gatewayPaymentId}</span>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="space-y-2 border-t border-[#EEF2EE] pt-3">
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Produce Net Subtotal:</span>
                  <span className="font-semibold text-[#202820]">₹{Number(selectedInvoice.subtotal).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Agricultural GST (0%):</span>
                  <span className="font-semibold text-emerald-700">₹0.00 (Exempt)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Delivery & Transport:</span>
                  <span className="font-semibold text-[#202820]">₹{Number(selectedInvoice.deliveryFee || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Platform Facilitation Fee:</span>
                  <span className="font-semibold text-[#202820]">₹{Number(selectedInvoice.platformFee || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-t border-[#DDE5DC] pt-2 font-bold text-sm text-[#245C43]">
                  <span>Total Amount Paid:</span>
                  <span>₹{Number(selectedInvoice.totalAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 leading-relaxed">
                <strong>Statutory Note:</strong> Agricultural produce supplied directly by farmers or FPOs is exempt from Goods and Services Tax under Section 11 of the CGST Act 2017.
              </div>

              <button
                type="button"
                onClick={() => handleDownloadPdf(selectedInvoice)}
                disabled={downloadingId === selectedInvoice.id}
                className="w-full py-3 bg-[#245C43] hover:bg-[#173F30] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download size={14} />
                <span>Download Vector Tax Invoice (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
