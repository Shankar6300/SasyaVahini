/**
 * SasyaVahini — Centralized Notification Service
 *
 * Handles creation of database notifications with multi-channel dispatch
 * (in-app, responsive HTML email, and SMS).
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const emailService = require('./email.service');
const smsService = require('./sms.service');

const VALID_PRISMA_NOTIFICATION_TYPES = ['INFO', 'ORDER_UPDATE', 'PROPOSAL', 'PAYMENT', 'ALERT', 'SYSTEM'];

function mapToPrismaNotificationType(type) {
  if (VALID_PRISMA_NOTIFICATION_TYPES.includes(type)) return type;
  if (!type) return 'INFO';
  if (String(type).includes('PROPOSAL')) return 'PROPOSAL';
  if (String(type).includes('ORDER')) return 'ORDER_UPDATE';
  if (String(type).includes('PAYMENT')) return 'PAYMENT';
  if (String(type).includes('ALERT')) return 'ALERT';
  return 'SYSTEM';
}

class NotificationService {
  /**
   * Create an in-app notification and optionally trigger email/SMS asynchronously
   */
  async createNotification({
    userId,
    type = 'SYSTEM',
    title,
    message,
    proposalId = null,
    metadata = null,
    sendEmail = false,
    sendSms = false,
    emailPayload = null,
    smsPayload = null
  }) {
    const dbType = mapToPrismaNotificationType(type);
    try {
      // Idempotency Check: Prevent duplicate notifications on event retries
      if (proposalId) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            proposalId,
            type: dbType
          }
        });
        if (existing) {
          logger.info('Duplicate notification event suppressed (idempotent)', { userId, proposalId, type: dbType });
          return existing;
        }
      }

      const notifBody = message || title || 'Notification';
      const record = await prisma.notification.create({
        data: {
          userId,
          type: dbType,
          title,
          body: notifBody,
          proposalId,
          metadata: metadata || undefined
        }
      });

      // Asynchronous multi-channel dispatch (fire-and-forget, non-blocking)
      setImmediate(async () => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, phone: true, preferredLocale: true }
          });

          if (!user) return;

          // Dispatch Email if requested
          if (sendEmail && user.email) {
            try {
              if (emailPayload?.customFn) {
                await emailPayload.customFn(user);
              } else {
                await emailService.sendMail({
                  to: user.email,
                  subject: `[SasyaVahini] ${title}`,
                  html: `
                    <div style="font-family: sans-serif; padding: 16px; color: #1e293b;">
                      <h2 style="color: #07875b; margin-top: 0;">${title}</h2>
                      <p>${message}</p>
                      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                      <p style="font-size: 12px; color: #64748b;">SasyaVahini — Farm to Market. Fair for Everyone.</p>
                    </div>
                  `
                });
              }
            } catch (mailErr) {
              logger.warn('Failed to dispatch notification email:', { userId, error: mailErr.message });
            }
          }

          // Dispatch SMS if requested
          if (sendSms && user.phone) {
            try {
              if (smsPayload?.text) {
                await smsService.sendSms(user.phone, smsPayload.text);
              } else {
                await smsService.sendSms(user.phone, `SasyaVahini: ${title} - ${message}`);
              }
            } catch (smsErr) {
              logger.warn('Failed to dispatch notification SMS:', { userId, error: smsErr.message });
            }
          }
        } catch (dispatchErr) {
          logger.warn('Error during multi-channel notification dispatch:', dispatchErr.message);
        }
      });

      return record;
    } catch (err) {
      logger.error('Error creating database notification:', err);
      throw err;
    }
  }

  /**
   * Notify farmer of an incoming Buyer Produce Request with strict 30-min countdown
   */
  async notifyBuyerProduceRequest({ farmerUser, proposal, items = [], deadlineMinutes = 30 }) {
    if (!farmerUser?.id) return null;

    const cropSummary = items.map(i => `${i.cropName} (${i.quantityKg} kg @ ₹${i.pricePerKg}/kg)`).join(', ') || 'Agricultural produce';
    const title = 'New Buyer Produce Request';
    const message = `A buyer has requested ${cropSummary}. Please accept within ${deadlineMinutes} minutes before the request expires.`;

    return this.createNotification({
      userId: farmerUser.id,
      type: 'PROPOSAL_CREATED',
      title,
      message,
      proposalId: proposal.id,
      metadata: { items, deadlineMinutes, consentDeadline: proposal.consentDeadline },
      sendEmail: true,
      sendSms: true,
      emailPayload: {
        customFn: async (user) => {
          await emailService.sendBuyerProduceRequestEmail({
            farmerName: user.name,
            farmerEmail: user.email,
            proposalId: proposal.id,
            items,
            deadlineMinutes,
            actionUrl: `${process.env.APP_URL || 'http://localhost:3000'}/farmer/proposals`
          });
        }
      },
      smsPayload: {
        text: `SasyaVahini: New Buyer Produce Request for ${items[0]?.cropName || 'produce'}! Review & accept within ${deadlineMinutes} mins at sasyavahini.in`
      }
    });
  }

  /**
   * Notify buyer and farmer when a proposal is successfully accepted
   */
  async notifyProposalAccepted({ farmerUser, buyerUser, proposal, items = [] }) {
    // Notify Farmer
    if (farmerUser?.id) {
      await this.createNotification({
        userId: farmerUser.id,
        type: 'PROPOSAL_ACCEPTED',
        title: 'Order Confirmed',
        message: `You accepted proposal #${proposal.id.slice(0, 8)}. Logistics will be scheduled shortly.`,
        proposalId: proposal.id,
        metadata: { status: 'ACCEPTED' },
        sendEmail: true,
        emailPayload: {
          customFn: async (user) => {
            await emailService.sendRequestAcceptedEmail({
              userName: user.name,
              userEmail: user.email,
              proposalId: proposal.id,
              cropName: items[0]?.cropName || 'Produce',
              quantityKg: items.reduce((acc, i) => acc + (i.quantityKg || 0), 0),
              totalAmount: items.reduce((acc, i) => acc + ((i.quantityKg || 0) * (i.pricePerKg || 0)), 0),
              role: 'FARMER'
            });
          }
        }
      });
    }

    // Notify Buyer
    if (buyerUser?.id) {
      await this.createNotification({
        userId: buyerUser.id,
        type: 'PROPOSAL_ACCEPTED',
        title: 'Produce Request Accepted by Farmer',
        message: `Farmer has accepted your produce request for proposal #${proposal.id.slice(0, 8)}. Order is confirmed!`,
        proposalId: proposal.id,
        metadata: { status: 'ACCEPTED' },
        sendEmail: true,
        emailPayload: {
          customFn: async (user) => {
            await emailService.sendRequestAcceptedEmail({
              userName: user.name,
              userEmail: user.email,
              proposalId: proposal.id,
              cropName: items[0]?.cropName || 'Produce',
              quantityKg: items.reduce((acc, i) => acc + (i.quantityKg || 0), 0),
              totalAmount: items.reduce((acc, i) => acc + ((i.quantityKg || 0) * (i.pricePerKg || 0)), 0),
              role: 'BUYER'
            });
          }
        }
      });
    }
  }

  /**
   * Notify farmer and buyer when a 30-min produce request expires
   */
  async notifyProposalExpired({ farmerUser, buyerUser, proposal, items = [] }) {
    // Notify Farmer
    if (farmerUser?.id) {
      await this.createNotification({
        userId: farmerUser.id,
        type: 'PROPOSAL_EXPIRED',
        title: 'Produce Request Expired',
        message: `The 30-minute response window for proposal #${proposal.id.slice(0, 8)} has elapsed. Your produce remains listed for other buyers.`,
        proposalId: proposal.id,
        metadata: { status: 'EXPIRED' },
        sendEmail: true,
        emailPayload: {
          customFn: async (user) => {
            await emailService.sendRequestExpiredEmail({
              userName: user.name,
              userEmail: user.email,
              proposalId: proposal.id,
              cropName: items[0]?.cropName || 'Produce',
              reason: 'The 30-minute response deadline elapsed before confirmation.'
            });
          }
        }
      });
    }

    // Notify Buyer
    if (buyerUser?.id) {
      await this.createNotification({
        userId: buyerUser.id,
        type: 'PROPOSAL_EXPIRED',
        title: 'Produce Request Expired',
        message: `Proposal #${proposal.id.slice(0, 8)} expired after 30 minutes without farmer confirmation. You may explore other active listings on the marketplace.`,
        proposalId: proposal.id,
        metadata: { status: 'EXPIRED' },
        sendEmail: true,
        emailPayload: {
          customFn: async (user) => {
            await emailService.sendRequestExpiredEmail({
              userName: user.name,
              userEmail: user.email,
              proposalId: proposal.id,
              cropName: items[0]?.cropName || 'Produce',
              reason: 'The farmer did not confirm within the 30-minute window.'
            });
          }
        }
      });
    }
  }
}

module.exports = new NotificationService();
