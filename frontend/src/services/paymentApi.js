/**
 * SasyaVahini — Buyer Payments & Invoices API Service (Phase 6)
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import api from './api';

export const paymentApi = {
  /**
   * Initiate payment with backend amount calculation and gateway order creation
   */
  async initiatePayment(addressId, paymentMethod = 'UPI') {
    const res = await api.post('/buyer/payments/initiate', { addressId, paymentMethod });
    return res.data?.data;
  },

  /**
   * Authoritatively verify gateway payment response and signature on backend
   */
  async verifyPayment(payload) {
    const res = await api.post('/buyer/payments/verify', payload);
    return res.data?.data;
  },

  /**
   * Fetch buyer's payment transaction history
   */
  async getTransactions() {
    const res = await api.get('/buyer/transactions');
    return res.data?.data;
  },

  /**
   * Fetch details of a single transaction
   */
  async getTransactionDetails(transactionId) {
    const res = await api.get(`/buyer/transactions/${transactionId}`);
    return res.data?.data;
  },

  /**
   * Fetch list of all generated invoices for authenticated buyer
   */
  async getInvoices() {
    const res = await api.get('/buyer/invoices');
    return res.data?.data;
  },

  /**
   * Fetch details of an invoice
   */
  async getInvoiceDetails(invoiceId) {
    const res = await api.get(`/buyer/invoices/${invoiceId}`);
    return res.data?.data;
  },

  /**
   * Download invoice PDF
   */
  async downloadInvoicePdf(invoiceId, invoiceNumber) {
    const response = await api.get(`/buyer/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber || 'SasyaVahini-Invoice'}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default paymentApi;
