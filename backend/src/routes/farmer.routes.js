/**
 * SasyaVahini — Farmer Routes
 *
 * Endpoints for produce batch management, allocation consent, and earnings.
 * Owner: Member 2 (Farmer & FPO Portals)
 */

const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmer.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createProduceSchema,
  updateProduceSchema,
  acceptPartialContributionSchema,
  rejectContributionSchema
} = require('../schemas/farmer.schema');

const farmerOnly = [authenticate, requireRole(['FARMER', 'ADMIN'])];

// Batch / Produce CRUD
router.get('/batches', farmerOnly, farmerController.getMyProduce);
router.get('/produce', farmerOnly, farmerController.getMyProduce);

router.post('/batches', farmerOnly, validate(createProduceSchema), farmerController.addProduce);
router.post('/produce', farmerOnly, validate(createProduceSchema), farmerController.addProduce);

router.get('/batches/:id', farmerOnly, farmerController.getBatchById);
router.get('/produce/:id', farmerOnly, farmerController.getBatchById);

router.put('/batches/:id', farmerOnly, validate(updateProduceSchema), farmerController.updateProduce);
router.put('/produce/:id', farmerOnly, validate(updateProduceSchema), farmerController.updateProduce);

router.delete('/batches/:id', farmerOnly, farmerController.deleteProduce);
router.delete('/produce/:id', farmerOnly, farmerController.deleteProduce);

// Allocation Proposals & Consent
router.get('/proposals', farmerOnly, farmerController.getFarmerProposals);
router.post('/proposals/:id/accept', farmerOnly, farmerController.acceptProposal);
router.post('/proposals/:id/reject', farmerOnly, farmerController.rejectProposal);

// Profile & Earnings
router.put('/profile', farmerOnly, farmerController.updateFarmerProfile);
router.get('/earnings', farmerOnly, farmerController.getEarnings);

// FPO Membership Invitations (Workflow A — Consent Workflow)
router.get('/membership/invitations', farmerOnly, farmerController.getMembershipInvitations);
router.post('/membership/invitations/:id/accept', farmerOnly, farmerController.acceptMembershipInvitation);
router.post('/membership/invitations/:id/reject', farmerOnly, farmerController.rejectMembershipInvitation);

// FPO Directory & Join Requests (Workflow B)
router.get('/fpos', farmerOnly, farmerController.getFpoDirectory);
router.post('/fpos/:fpoId/request-join', farmerOnly, farmerController.requestJoinFpo);
router.get('/fpos/requests', farmerOnly, farmerController.getMyFpoRequests);
router.delete('/fpos/requests/:id', farmerOnly, farmerController.cancelJoinRequest);

// Phase 3: FPO Contribution Requests (Farmer Consent Actions)
router.get('/contributions', farmerOnly, farmerController.getIncomingContributions);
router.post('/contributions/:id/accept', farmerOnly, farmerController.acceptContribution);
router.post('/contributions/:id/accept-partial', farmerOnly, validate(acceptPartialContributionSchema), farmerController.acceptPartialContribution);
router.post('/contributions/:id/reject', farmerOnly, validate(rejectContributionSchema), farmerController.rejectContribution);

// Phase 6: Multi-Farmer Pickups
router.get('/pickups', farmerOnly, farmerController.getMyPickups);

// Phase 7: Farmer Settlements & Financial Ledger
router.get('/settlements', farmerOnly, farmerController.getMySettlements);

module.exports = router;
