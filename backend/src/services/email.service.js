/**
 * SasyaVahini — Production-Ready Email Service
 *
 * Supports real SMTP delivery (Gmail, SendGrid, Amazon SES, Mailgun, Brevo, custom SMTP)
 * with robust error recovery, connection pooling, and responsive branded HTML email templates.
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
    logger.info('Email service initialized with real SMTP transporter', { host, port, user });
  } else {
    transporter = null;
  }
  return transporter;
}

const BRAND = {
  name: 'SasyaVahini',
  tagline: 'Farm to Market. Fair for Everyone.',
  primaryColor: '#07875B',
  darkColor: '#054731',
  bgColor: '#F8FAFC',
  cardBg: '#FFFFFF',
  textColor: '#1F2937',
  subtextColor: '#64748B',
  borderColor: '#E2E8F0',
  fromAddress: process.env.EMAIL_FROM || (process.env.SMTP_USER ? `SasyaVahini <${process.env.SMTP_USER}>` : 'SasyaVahini <no-reply@sasyavahini.in>'),
};

function baseTemplate({ title, content, previewText = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${BRAND.bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${BRAND.textColor}; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; padding: 24px 16px; box-sizing: border-box; }
    .header { text-align: center; padding-bottom: 24px; }
    .brand-logo { display: inline-flex; align-items: center; gap: 8px; font-size: 22px; font-weight: 800; color: ${BRAND.primaryColor}; text-decoration: none; }
    .brand-sub { font-size: 11px; color: ${BRAND.subtextColor}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .card { background-color: ${BRAND.cardBg}; border: 1px solid ${BRAND.borderColor}; border-radius: 20px; padding: 32px 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); }
    .footer { text-align: center; padding-top: 24px; font-size: 12px; color: ${BRAND.subtextColor}; line-height: 1.5; }
    .btn { display: inline-block; background-color: ${BRAND.primaryColor}; color: #ffffff !important; padding: 12px 24px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px; margin: 16px 0; }
    .badge { display: inline-block; background-color: #E8F5E9; color: ${BRAND.primaryColor}; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; }
    .alert-box { background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px; margin: 16px 0; color: #92400E; font-size: 13px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: ${BRAND.primaryColor}; background: #F0FDF4; border: 1px dashed #86EFAC; border-radius: 12px; padding: 12px 24px; text-align: center; display: inline-block; margin: 16px 0; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</div>
  <div class="wrapper">
    <div class="header">
      <div class="brand-logo">🌾 SasyaVahini</div>
      <div class="brand-sub">${BRAND.tagline}</div>
    </div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} SasyaVahini — National Agricultural Logistics & Marketplace Platform.<br>Fair prices for farmers, guaranteed supply for buyers.</p>
      <p style="font-size: 11px; color: #94A3B8;">This is an automated system notification. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends an email with graceful degradation when SMTP is not configured.
 */
async function sendMail({ to, subject, html, text }) {
  const mailer = getTransporter();

  if (!mailer) {
    logger.warn('[EMAIL_DELIVERY_DISABLED] SMTP credentials not set in .env. To enable real delivery, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM', {
      to,
      subject,
    });
    return {
      sent: false,
      reason: 'SMTP_NOT_CONFIGURED',
      message: 'SMTP credentials missing from environment configuration.',
    };
  }

  try {
    const info = await mailer.sendMail({
      from: BRAND.fromAddress,
      to,
      subject: `[SasyaVahini] ${subject}`,
      html,
      text: text || subject,
    });

    logger.info('Email sent successfully', { messageId: info.messageId, to, subject });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    logger.error('Failed to send email', { to, subject, error: err.message });
    return { sent: false, error: err.message };
  }
}

/**
 * Send OTP for Email Verification or Login
 */
async function sendOtpEmail({
  to,
  toEmail,
  name,
  userName = 'Farmer Partner',
  code,
  otp,
  purpose = 'EMAIL_VERIFY',
  expiresInMinutes = 5
}) {
  const recipient = to || toEmail;
  const recipientName = name || userName;
  const passcode = code || otp;

  const purposeMap = {
    EMAIL_VERIFY: 'Verify your email address',
    PHONE_VERIFY: 'Verify your contact number',
    LOGIN: 'Your one-time login passcode',
    PASSWORD_RESET: 'Password reset request',
  };

  const purposeTitle = purposeMap[purpose] || 'One-Time Verification Code';

  const content = `
    <span class="badge">Security Verification</span>
    <h1 style="font-size: 20px; font-weight: 800; margin: 12px 0 8px 0; color: ${BRAND.textColor};">${purposeTitle}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.subtextColor};">
      Hello <strong>${recipientName}</strong>,<br>
      Use the following secure one-time passcode (OTP) to complete your verification on the SasyaVahini Farmer & FPO platform:
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <div class="otp-code">${passcode}</div>
    </div>
    <div class="alert-box">
      ⏱️ <strong>Valid for ${expiresInMinutes} minutes only.</strong><br>
      Never share this OTP with anyone, including SasyaVahini support staff or buyers.
    </div>
    <p style="font-size: 12px; color: ${BRAND.subtextColor}; margin-top: 20px;">
      If you did not initiate this request, you can safely ignore this email or review your account security settings.
    </p>
  `;

  return sendMail({
    to: recipient,
    subject: `${passcode} is your SasyaVahini verification code`,
    html: baseTemplate({ title: purposeTitle, content, previewText: `Your SasyaVahini verification code is ${passcode}` }),
    text: `Your SasyaVahini verification code is ${passcode}. It expires in ${expiresInMinutes} minutes. Never share this code.`,
  });
}

/**
 * Send Buyer Produce Request Notification with strict 30-Minute Countdown Notice
 */
async function sendBuyerProduceRequestEmail({
  to,
  farmerEmail,
  farmerName = 'Farmer',
  buyerName = 'Institutional Buyer',
  cropName,
  quantityKg,
  offeredPricePerKg,
  items = [],
  proposalId,
  expiryMinutes,
  deadlineMinutes = 30,
  actionUrl,
  dashboardUrl = 'http://localhost:3000/farmer#proposals',
}) {
  const recipient = to || farmerEmail;
  const effectiveExpiry = expiryMinutes || deadlineMinutes || 30;
  const effectiveUrl = actionUrl || dashboardUrl;
  const effectiveCrop = cropName || (items.length > 0 ? items.map(i => i.cropName).join(', ') : 'Agricultural Produce');
  const effectiveQty = quantityKg !== undefined ? quantityKg : (items.reduce((s, i) => s + (i.quantityKg || 0), 0));
  const effectivePrice = offeredPricePerKg !== undefined ? offeredPricePerKg : (items[0]?.pricePerKg || 0);
  const totalValue = effectiveQty * effectivePrice;

  const content = `
    <span class="badge" style="background-color: #FEF3C7; color: #92400E;">⚡ Urgent Buyer Request</span>
    <h1 style="font-size: 20px; font-weight: 800; margin: 12px 0 8px 0; color: ${BRAND.textColor};">
      New Purchase Request for ${effectiveCrop}
    </h1>
    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.subtextColor};">
      Hello <strong>${farmerName}</strong>,<br>
      A verified buyer, <strong>${buyerName}</strong>, has requested to purchase your registered crop lot via SasyaVahini's fair allocation system:
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Crop Requested:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0F172A; text-align: right;">${effectiveCrop}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Quantity:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0F172A; text-align: right;">${Number(effectiveQty).toLocaleString()} kg</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Offered Price:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #07875B; text-align: right;">₹${effectivePrice} / kg</td>
        </tr>
        <tr style="border-top: 1px dashed #CBD5E1;">
          <td style="padding: 10px 0 4px 0; font-weight: 700; color: #0F172A;">Total Value:</td>
          <td style="padding: 10px 0 4px 0; font-weight: 800; font-size: 16px; color: #07875B; text-align: right;">₹${Number(totalValue).toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <div class="alert-box" style="background-color: #FEF2F2; border-color: #FCA5A5; color: #991B1B;">
      ⏰ <strong>STRICT 30-MINUTE VALIDITY WINDOW</strong><br>
      To guarantee market reliability, this request will automatically expire in <strong>${effectiveExpiry} minutes</strong> if not accepted. Please review and respond promptly.
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${effectiveUrl}" class="btn" style="background-color: #07875B;">View & Respond in Dashboard →</a>
    </div>

    <p style="font-size: 12px; color: ${BRAND.subtextColor};">
      Request Ref: <code>${proposalId || 'SV-PROP-' + Date.now().toString().slice(-6)}</code>
    </p>
  `;

  return sendMail({
    to: recipient,
    subject: `🚨 Urgent (${effectiveExpiry}m validity): Buyer Request for ${effectiveQty}kg of ${effectiveCrop}`,
    html: baseTemplate({
      title: `Buyer Produce Request: ${effectiveCrop}`,
      content,
      previewText: `New request from ${buyerName} for ${effectiveQty}kg ${effectiveCrop}. Valid for 30 minutes.`,
    }),
    text: `New Buyer Request: ${buyerName} requested ${effectiveQty}kg of ${effectiveCrop} at ₹${effectivePrice}/kg (Total ₹${totalValue}). Valid for 30 minutes only. Respond at: ${effectiveUrl}`,
  });
}

/**
 * Send Notification when Request is Accepted
 */
async function sendRequestAcceptedEmail({
  to,
  userEmail,
  recipientName,
  userName,
  cropName = 'Produce',
  quantityKg = 0,
  totalAmount,
  counterpartName = 'Verified Partner',
  role = 'FARMER'
}) {
  const recipient = to || userEmail;
  const name = recipientName || userName || 'Partner';

  const content = `
    <span class="badge" style="background-color: #ECFDF5; color: #047857;">✓ Allocation Confirmed</span>
    <h1 style="font-size: 20px; font-weight: 800; margin: 12px 0 8px 0; color: ${BRAND.textColor};">
      Produce Request Accepted
    </h1>
    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.subtextColor};">
      Hello <strong>${name}</strong>,<br>
      The produce allocation for <strong>${quantityKg} kg of ${cropName}</strong> with <strong>${counterpartName}</strong> has been confirmed.
      Available inventory has been locked in the <strong>RESERVED</strong> state for logistics scheduling.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="http://localhost:3000/${role.toLowerCase()}" class="btn">View Order Status →</a>
    </div>
  `;

  return sendMail({
    to: recipient,
    subject: `Allocation Confirmed: ${quantityKg}kg ${cropName}`,
    html: baseTemplate({ title: 'Allocation Confirmed', content, previewText: `Allocation confirmed for ${quantityKg}kg ${cropName}` }),
  });
}

/**
 * Send Notification when Request Expired
 */
async function sendRequestExpiredEmail({
  to,
  userEmail,
  recipientName,
  userName,
  cropName = 'Produce',
  quantityKg = 0,
  role = 'FARMER',
  reason
}) {
  const recipient = to || userEmail;
  const name = recipientName || userName || 'Partner';

  const content = `
    <span class="badge" style="background-color: #F1F5F9; color: #475569;">⏰ Offer Expired</span>
    <h1 style="font-size: 20px; font-weight: 800; margin: 12px 0 8px 0; color: ${BRAND.textColor};">
      Produce Request Validity Expired
    </h1>
    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.subtextColor};">
      Hello <strong>${name}</strong>,<br>
      The purchase request for <strong>${quantityKg} kg of ${cropName}</strong> has reached its 30-minute validity limit without confirmation and has been marked as <strong>EXPIRED</strong>.
      ${reason ? `<br><br><em>Reason: ${reason}</em><br>` : ''}
      ${role === 'FARMER' ? 'Your inventory remains completely available for future matching.' : 'You can browse other suppliers in the marketplace to fulfill your requirements.'}
    </p>
  `;

  return sendMail({
    to: recipient,
    subject: `Notice: Purchase request for ${cropName} has expired`,
    html: baseTemplate({ title: 'Request Expired', content, previewText: `Request for ${cropName} expired after 30 minutes` }),
  });
}

module.exports = {
  sendMail,
  sendOtpEmail,
  sendBuyerProduceRequestEmail,
  sendRequestAcceptedEmail,
  sendRequestExpiredEmail,
};
