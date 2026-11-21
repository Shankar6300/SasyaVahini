/**
 * SasyaVahini — Production-Ready SMS Service
 *
 * Dispatches real SMS notifications via Twilio, Fast2SMS, or custom gateway.
 * Safely degrades with helpful logging when SMS provider credentials are not yet configured.
 */

const https = require('https');
const logger = require('../utils/logger');

async function sendSms({ to, message }) {
  if (!to || !message) return { sent: false, error: 'Missing recipient or message' };

  const cleanPhone = to.replace(/[^0-9+]/g, '');

  // 1. Twilio Integration (if configured)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const postData = new URLSearchParams({
        To: cleanPhone,
        From: twilioFrom,
        Body: message,
      }).toString();

      return new Promise((resolve) => {
        const req = https.request(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                logger.info('Twilio SMS sent successfully', { to: cleanPhone });
                resolve({ sent: true, provider: 'twilio' });
              } else {
                logger.error('Twilio SMS API error', { status: res.statusCode, data });
                resolve({ sent: false, error: data });
              }
            });
          }
        );
        req.on('error', (e) => {
          logger.error('Twilio network error', { error: e.message });
          resolve({ sent: false, error: e.message });
        });
        req.write(postData);
        req.end();
      });
    } catch (err) {
      logger.error('Twilio SMS dispatch exception', { error: err.message });
      return { sent: false, error: err.message };
    }
  }

  // 2. Fast2SMS / Indian SMS Gateway (if configured)
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  if (fast2SmsKey) {
    try {
      const indianPhone = cleanPhone.replace(/^\+91/, '').slice(-10);
      const postData = JSON.stringify({
        route: 'v3',
        sender_id: 'TXTIND',
        message,
        language: 'english',
        flash: 0,
        numbers: indianPhone,
      });

      return new Promise((resolve) => {
        const req = https.request('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: fast2SmsKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        }, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            if (res.statusCode === 200) {
              logger.info('Fast2SMS dispatched successfully', { to: indianPhone });
              resolve({ sent: true, provider: 'fast2sms' });
            } else {
              logger.error('Fast2SMS error', { status: res.statusCode, data });
              resolve({ sent: false, error: data });
            }
          });
        });
        req.on('error', (e) => {
          logger.error('Fast2SMS network error', { error: e.message });
          resolve({ sent: false, error: e.message });
        });
        req.write(postData);
        req.end();
      });
    } catch (err) {
      logger.error('Fast2SMS dispatch exception', { error: err.message });
      return { sent: false, error: err.message };
    }
  }

  // When no SMS provider is configured, log transparent diagnostic without pretending delivery
  logger.warn(
    '[SMS_DELIVERY_DISABLED] SMS provider credentials missing from .env. To enable real SMS delivery, configure TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN or FAST2SMS_API_KEY in .env.',
    { to: cleanPhone }
  );
  return {
    sent: false,
    reason: 'SMS_PROVIDER_NOT_CONFIGURED',
    message: 'SMS provider not configured in environment variables.',
  };
}

async function sendOtpSms(phone, otp, purpose = 'LOGIN') {
  const purposeName = purpose.replace(/_/g, ' ');
  const message = `SasyaVahini: Your ${purposeName} verification code is ${otp}. Valid for 5 minutes. Never share this OTP with anyone.`;
  return sendSms({ to: phone, message });
}

async function sendProduceRequestSms(phone, cropName = 'Produce', deadlineMinutes = 30) {
  const message = `SasyaVahini: Urgent! New Buyer Request for your ${cropName}. Please review & accept within ${deadlineMinutes} minutes at sasyavahini.in`;
  return sendSms({ to: phone, message });
}

module.exports = { sendSms, sendOtpSms, sendProduceRequestSms };
