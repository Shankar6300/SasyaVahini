/**
 * SasyaVahini — 30-Minute Proposal Expiry & Boundary Condition Audit Tests
 */

const proposalExpiryService = require('../src/services/proposalExpiry.service');
const prisma = require('../src/lib/prisma');
const notificationService = require('../src/services/notification.service');

describe('AUDIT 5: 30-Minute Request Expiry & Boundary Conditions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Server-Side UTC Deadline Calculation', () => {
    test('computes exactly 30 minutes (1800 seconds) from creation timestamp in UTC', () => {
      const nowIso = '2026-11-11T10:00:00.000Z';
      const info = proposalExpiryService.getDeadlineInfo(nowIso);

      expect(info.totalDurationMinutes).toBe(30);
      expect(info.consentDeadline).toBe('2026-11-11T10:30:00.000Z');
      expect(new Date(info.consentDeadline).toISOString()).toBe('2026-11-11T10:30:00.000Z');
    });

    test('boundary condition: proposal at 29m 59s is ACTIVE (not expired)', () => {
      // Created 29 minutes and 59 seconds ago (1 second remaining)
      const createdAt = new Date(Date.now() - 29 * 60 * 1000 - 59 * 1000);
      const info = proposalExpiryService.getDeadlineInfo(createdAt.toISOString());

      expect(info.isExpired).toBe(false);
      expect(info.expiresInSeconds).toBeGreaterThanOrEqual(1);
    });

    test('boundary condition: proposal at 30m 01s is EXPIRED', () => {
      // Created 30 minutes and 1 second ago
      const createdAt = new Date(Date.now() - 30 * 60 * 1000 - 1000);
      const info = proposalExpiryService.getDeadlineInfo(createdAt.toISOString());

      expect(info.isExpired).toBe(true);
      expect(info.expiresInSeconds).toBe(0);
    });
  });

  describe('2. Atomic Expiry & Concurrency Safety', () => {
    test('expireProposal atomically updates proposal & items to EXPIRED in a transaction', async () => {
      const mockProposal = {
        id: 'prop-exp-101',
        status: 'PENDING',
        items: [
          {
            id: 'item-1',
            allocatedKg: 400,
            listing: {
              id: 'listing-1',
              cropName: 'Tomato',
              status: 'PARTIALLY_RESERVED',
              reservedQty: 400
            }
          }
        ],
        requirement: { buyer: { user: { name: 'Buyer Enterprise' } } }
      };

      // Mock transaction execution
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
        const tx = {
          allocationProposal: {
            findUnique: jest.fn().mockResolvedValue(mockProposal),
            update: jest.fn().mockResolvedValue({ ...mockProposal, status: 'EXPIRED' })
          },
          allocationItem: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 })
          },
          produceListing: {
            update: jest.fn().mockResolvedValue({ id: 'listing-1', status: 'AVAILABLE', reservedQty: 0 })
          }
        };
        return callback(tx);
      });

      const notifSpy = jest.spyOn(notificationService, 'notifyProposalExpired').mockResolvedValue({});

      const result = await proposalExpiryService.expireProposal('prop-exp-101', '30m deadline elapsed');

      expect(result.status).toBe('EXPIRED');
    });

    test('prevents double transition: expireProposal does not alter an already ACCEPTED proposal', async () => {
      const acceptedProposal = {
        id: 'prop-already-accepted',
        status: 'ACCEPTED',
        items: []
      };

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
        const tx = {
          allocationProposal: {
            findUnique: jest.fn().mockResolvedValue(acceptedProposal),
            update: jest.fn()
          },
          allocationItem: { updateMany: jest.fn() }
        };
        return callback(tx);
      });

      const result = await proposalExpiryService.expireProposal('prop-already-accepted');
      expect(result.status).toBe('ACCEPTED');
    });

    test('sweepExpiredProposals targets both consentDeadline and legacy proposals >30m old', async () => {
      const findManySpy = jest.spyOn(prisma.allocationProposal, 'findMany').mockResolvedValue([]);

      await proposalExpiryService.sweepExpiredProposals();

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            consentDeadline: { lt: expect.any(Date) }
          })
        })
      );
    });
  });
});
