/**
 * SasyaVahini — 30-Minute Proposal Expiry Service
 *
 * Enforces the strict 30-minute buyer produce request countdown.
 * Automatically marks proposals past their consent deadline as EXPIRED,
 * releases reservations, and dispatches notifications.
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');

const PROPOSAL_LIFETIME_MINUTES = 30;

class ProposalExpiryService {
  /**
   * Sweeps and expires all pending proposals past their 30-minute window
   */
  async sweepExpiredProposals() {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - PROPOSAL_LIFETIME_MINUTES * 60 * 1000);
    try {
      // Find proposals with pending status whose consentDeadline < now
      const expiredProposals = await prisma.allocationProposal.findMany({
        where: {
          status: 'PENDING',
          consentDeadline: { lt: now }
        },
        include: {
          items: {
            include: {
              listing: {
                include: { farmer: { include: { user: true } } }
              }
            }
          },
          requirement: {
            include: { buyer: { include: { user: true } } }
          }
        }
      });

      for (const proposal of expiredProposals) {
        await this.expireProposal(proposal.id, '30-minute farmer consent window elapsed');
      }

      return expiredProposals.length;
    } catch (err) {
      logger.error('Error sweeping expired proposals:', err);
      return 0;
    }
  }

  /**
   * Atomically mark a single proposal as EXPIRED and notify both parties
   */
  async expireProposal(proposalId, reason = 'Response deadline elapsed') {
    const now = new Date();
    try {
      return await prisma.$transaction(async (tx) => {
        const proposal = await tx.allocationProposal.findUnique({
          where: { id: proposalId },
          include: {
            items: {
              include: {
                listing: {
                  include: { farmer: { include: { user: true } } }
                }
              }
            },
            requirement: {
              include: { buyer: { include: { user: true } } }
            }
          }
        });

        if (!proposal || proposal.status === 'EXPIRED' || proposal.status === 'ACCEPTED') {
          return proposal;
        }

        // 1. Mark proposal as EXPIRED
        const updatedProposal = await tx.allocationProposal.update({
          where: { id: proposalId },
          data: { status: 'EXPIRED' }
        });

        // 2. Mark allocation items as EXPIRED
        await tx.allocationItem.updateMany({
          where: { proposalId },
          data: { status: 'EXPIRED' }
        });

        // 3. For any reserved listing, check if reservations need release
        for (const item of proposal.items) {
          const listing = item.listing;
          if (listing && (listing.status === 'RESERVED' || listing.status === 'PARTIALLY_RESERVED')) {
            const reservedToRelease = item.allocatedKg || item.allocatedQtyKg || 0;
            const newReserved = Math.max(0, listing.reservedQty - reservedToRelease);
            const newStatus = newReserved === 0 ? 'AVAILABLE' : 'PARTIALLY_RESERVED';

            await tx.produceListing.update({
              where: { id: listing.id },
              data: {
                reservedQty: newReserved,
                status: newStatus
              }
            });
          }
        }

        // 4. Asynchronously notify farmer and buyer
        setImmediate(async () => {
          try {
            const farmerUser = proposal.items[0]?.listing?.farmer?.user;
            const buyerUser = proposal.requirement?.buyer?.user;
            const items = proposal.items.map(i => ({
              cropName: i.listing?.cropName || 'Produce',
              quantityKg: i.allocatedKg || i.allocatedQtyKg || 0,
              pricePerKg: i.agreedPricePerKg || i.proposedPricePerKg || 0
            }));

            await notificationService.notifyProposalExpired({
              farmerUser,
              buyerUser,
              proposal: updatedProposal,
              items
            });
          } catch (notifErr) {
            logger.warn('Failed to send proposal expired notification:', notifErr.message);
          }
        });

        logger.info('Proposal marked EXPIRED', { proposalId, reason });
        return updatedProposal;
      });
    } catch (err) {
      logger.error('Failed to expire proposal:', { proposalId, error: err.message });
      throw err;
    }
  }

  /**
   * Helper to compute proposal deadline and remaining seconds
   */
  getDeadlineInfo(proposalCreatedAt, existingDeadline = null) {
    const createdAt = new Date(proposalCreatedAt || Date.now());
    const deadline = existingDeadline ? new Date(existingDeadline) : new Date(createdAt.getTime() + PROPOSAL_LIFETIME_MINUTES * 60 * 1000);
    const now = new Date();
    const remainingMs = deadline.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const isExpired = remainingSeconds <= 0;

    return {
      consentDeadline: deadline.toISOString(),
      expiresInSeconds: remainingSeconds,
      isExpired,
      totalDurationMinutes: PROPOSAL_LIFETIME_MINUTES
    };
  }
}

module.exports = new ProposalExpiryService();
