/**
 * SasyaVahini — Payment Gateway Service (Phase 6)
 *
 * Implements an extensible Payment Gateway Adapter supporting Razorpay
 * and a high-fidelity Sandbox mode with authentic HMAC-SHA256 cryptographic verification.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

class PaymentGatewayService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_sasyavahini_sandbox';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'secret_sasyavahini_sandbox_2026';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_sasyavahini_2026';
    this.isLive = process.env.PAYMENT_GATEWAY_MODE === 'live' && Boolean(process.env.RAZORPAY_KEY_ID);
  }

  /**
   * Create an authoritative gateway payment order
   * @param {Object} params - { amount, currency, receipt, notes }
   */
  async createPaymentOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    // Amount in paise (1 INR = 100 paise) as standard across Indian gateways
    const amountInPaise = Math.round(amount * 100);

    if (this.isLive) {
      try {
        const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.description || 'Gateway order creation failed');
        }

        return {
          gateway: 'Razorpay',
          gatewayOrderId: data.id,
          amount: data.amount / 100,
          currency: data.currency,
          keyId: this.keyId,
          receipt: data.receipt,
          status: data.status,
        };
      } catch (err) {
        logger.error('Live Razorpay order creation error:', err.message);
        throw err;
      }
    }

    // High-fidelity Sandbox Gateway Order
    const randomHex = crypto.randomBytes(8).toString('hex');
    const gatewayOrderId = `order_sbox_${Date.now()}_${randomHex}`;

    return {
      gateway: 'Razorpay_Sandbox',
      gatewayOrderId,
      amount,
      currency,
      keyId: this.keyId,
      receipt: receipt || `rcpt_sbox_${Date.now()}`,
      status: 'created',
      mockHint: 'Simulated Sandbox Mode Active',
    };
  }

  /**
   * Generate an authentic HMAC-SHA256 signature for test/sandbox scenarios
   */
  generateSandboxSignature(orderId, paymentId) {
    const payload = `${orderId}|${paymentId}`;
    return crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify official gateway payment signature (HMAC-SHA256)
   * @param {Object} params - { orderId, paymentId, signature }
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const actualBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (err) {
      logger.error('Signature verification error:', err.message);
      return false;
    }
  }

  /**
   * Verify incoming gateway webhook signature
   * @param {string|Buffer} rawBody - Raw unparsed webhook request payload
   * @param {string} signature - Signature header from gateway
   */
  verifyWebhookSignature(rawBody, signature) {
    if (!rawBody || !signature) return false;

    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(bodyStr)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const actualBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (err) {
      logger.error('Webhook signature verification error:', err.message);
      return false;
    }
  }
}

module.exports = new PaymentGatewayService();
