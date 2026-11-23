/**
 * SasyaVahini — Buyer Transaction History Page (Phase 6)
 *
 * Provides a cryptographic audit log of all payment transactions,
 * gateway order references, payment channel splits, and status badges.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard, ArrowDownRight, ArrowUpRight, ShieldCheck,
  Calendar, Search, Filter, RefreshCw, AlertCircle, CheckCircle2,
  XCircle, Clock, Download, FileText, ShoppingBag, Eye, X, QrCode, Landmark
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import paymentApi from '@/services/paymentApi';
import { useToast } from '@/components/Toast';

export default function TransactionHistoryPage() {
  const navigate = useNavigate();
  const { addToast } = useToast() || {};

  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchTransactions = async (page = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await paymentApi.getTransactions(page, 20);
      setTransactions(res.transactions || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, totalCount: 0 });
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError(err.response?.data?.error?.message || 'Failed to retrieve your transaction history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, []);

  const handleDownloadInvoice = async (invoice) => {
    if (!invoice?.id) return;
    try {
      await paymentApi.downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
      if (addToast) addToast(`Invoice ${invoice.invoiceNumber} downloaded.`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      if (addToast) addToast('Failed to download invoice PDF.', 'error');
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      !searchTerm ||
      tx.checkoutRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.gatewayOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.gatewayPaymentId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || tx.status?.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const successCount = transactions.filter((t) => t.status === 'SUCCESS').length;
  const failedCount = transactions.filter((t) => t.status === 'FAILED').length;
  const settledVolume = transactions
    .filter((t) => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const getMethodIcon = (method) => {
    switch (method?.toUpperCase()) {
      case 'UPI':
        return <QrCode size={14} className="text-[#245C43]" />;
      case 'CARD':
        return <CreditCard size={14} className="text-blue-600" />;
      case 'NETBANKING':
        return <Landmark size={14} className="text-indigo-600" />;
      case 'ESCROW':
        return <ShieldCheck size={14} className="text-emerald-700" />;
      default:
        return <CreditCard size={14} className="text-slate-600" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 size={12} /> Success
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-100 px-2.5 py-0.5 rounded-full">
            <XCircle size={12} /> Failed
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  return (
    <div className="buyer-transactions-page max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-200">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-[#DDE5DC]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#245C43] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck size={12} /> HMAC-SHA256 Cryptographic Audit Ledger
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#202820]">Payment Transaction History</h1>
          <p className="text-xs text-[#68736B] mt-1">
            Detailed chronological record of all checkout authorizations, gateway IDs, and verified receipts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchTransactions(pagination.page)}
          disabled={isLoading}
          className="self-start md:self-auto px-3.5 py-2 bg-white border border-[#DDE5DC] hover:border-[#245C43] rounded-xl text-xs font-bold text-[#202820] flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* ── Transaction Metrics ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white border border-[#DDE5DC] rounded-xl shadow-sm">
          <span className="text-xs text-[#68736B] block">Total Attempts</span>
          <span className="text-2xl font-black text-[#202820] mt-1 block">
            {pagination.totalCount || transactions.length}
          </span>
        </div>

        <div className="p-4 bg-white border border-[#DDE5DC] rounded-xl shadow-sm">
          <span className="text-xs text-[#68736B] block">Successful</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {successCount}
          </span>
        </div>

        <div className="p-4 bg-white border border-[#DDE5DC] rounded-xl shadow-sm">
          <span className="text-xs text-[#68736B] block">Declined / Failed</span>
          <span className="text-2xl font-black text-red-600 mt-1 block">
            {failedCount}
          </span>
        </div>

        <div className="p-4 bg-white border border-[#DDE5DC] rounded-xl shadow-sm">
          <span className="text-xs text-[#68736B] block">Settled Volume</span>
          <span className="text-2xl font-black text-[#245C43] mt-1 block">
            ₹{settledVolume.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#68736B]" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#DDE5DC] rounded-xl text-xs focus:outline-none focus:border-[#245C43]"
            placeholder="Search by order ref, transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#68736B]" />
          <select
            className="px-3 py-2 bg-white border border-[#DDE5DC] rounded-xl text-xs font-semibold text-[#202820] focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed / Declined</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* ── Transactions List / Table ───────────────────────────────── */}
      {isLoading && transactions.length === 0 ? (
        <div className="py-16 text-center bg-white border border-[#DDE5DC] rounded-2xl shadow-sm">
          <RefreshCw size={32} className="animate-spin text-[#245C43] mx-auto mb-3" />
          <p className="text-sm font-bold text-[#202820]">Loading Transactions...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 text-center">
          <AlertCircle size={24} className="mx-auto text-red-600 mb-2" />
          <p className="font-bold mb-1">{error}</p>
          <button
            type="button"
            onClick={() => fetchTransactions(1)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs"
          >
            Retry
          </button>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="py-16 text-center bg-white border border-[#DDE5DC] rounded-2xl shadow-sm">
          <CreditCard size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#202820] mb-1">No Transactions Recorded</h3>
          <p className="text-xs text-[#68736B] max-w-sm mx-auto mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No transactions matched your search or status filter.'
              : 'You have not initiated any payments yet.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/buyer/marketplace')}
            className="py-2 px-5 bg-[#245C43] hover:bg-[#173F30] text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <ShoppingBag size={14} />
            <span>Go to Marketplace</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="p-5 bg-white border border-[#DDE5DC] hover:border-[#245C43] rounded-2xl shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#F8F8F3] border border-[#DDE5DC] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getMethodIcon(tx.paymentMethod)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-[#202820]">
                      {tx.checkoutRef}
                    </span>
                    {getStatusBadge(tx.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#68736B] mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(tx.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>Method: <strong className="text-[#245C43]">{tx.paymentMethod || 'UPI'}</strong></span>
                    {tx.gatewayPaymentId && (
                      <span className="font-mono text-[11px] truncate max-w-[150px]">
                        ID: {tx.gatewayPaymentId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-[#EEF2EE]">
                <div className="text-left md:text-right">
                  <span className="text-[11px] text-[#68736B] block">Amount</span>
                  <span className={`text-lg font-black ${tx.status === 'SUCCESS' ? 'text-[#245C43]' : 'text-slate-600'}`}>
                    ₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTx(tx)}
                    className="p-2.5 bg-[#F8F8F3] hover:bg-[#EAEFEA] text-[#202820] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">Audit</span>
                  </button>

                  {tx.invoice && (
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(tx.invoice)}
                      className="py-2.5 px-3 bg-white border border-[#DDE5DC] hover:border-[#245C43] text-[#245C43] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Download Invoice PDF"
                    >
                      <Download size={13} />
                      <span>Invoice</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Transaction Audit Modal ─────────────────────────────────── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#DDE5DC]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EEF2EE]">
              <div>
                <h3 className="font-bold text-base text-[#202820]">
                  Transaction Audit Record
                </h3>
                <p className="text-xs text-[#68736B]">
                  ID: <span className="font-mono">{selectedTx.id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-[#68736B] hover:text-[#202820] p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-[#F8F8F3] rounded-xl border border-[#DDE5DC]">
                <span className="text-[#68736B]">Status:</span>
                {getStatusBadge(selectedTx.status)}
              </div>

              <div className="p-3 bg-white border border-[#DDE5DC] rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Checkout Ref:</span>
                  <span className="font-mono font-bold text-[#202820]">{selectedTx.checkoutRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Gateway Order ID:</span>
                  <span className="font-mono text-[#202820]">{selectedTx.gatewayOrderId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Gateway Payment ID:</span>
                  <span className="font-mono text-[#202820]">{selectedTx.gatewayPaymentId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Payment Method:</span>
                  <span className="font-bold text-[#245C43]">{selectedTx.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Verified Amount:</span>
                  <span className="font-black text-[#245C43] text-sm">₹{Number(selectedTx.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68736B]">Created At:</span>
                  <span>{new Date(selectedTx.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {selectedTx.errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800">
                  <span className="font-bold block mb-1">Gateway Error:</span>
                  <span>{selectedTx.errorMessage}</span>
                </div>
              )}

              {selectedTx.invoice && (
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(selectedTx.invoice)}
                  className="w-full py-2.5 bg-[#245C43] hover:bg-[#173F30] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Download size={14} />
                  <span>Download Associated Invoice ({selectedTx.invoice.invoiceNumber})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
