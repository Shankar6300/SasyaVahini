/**
 * SasyaVahini — FPO Routes
 *
 * Endpoints for FPO collective management, aggregation, and proposals.
 * Owner: Member 2 (Farmer & FPO Portals)
 */

const express = require('express');
const router = express.Router();
const fpoController = require('../controllers/fpo.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  aggregateProduceSchema,
  updateFpoProfileSchema,
  addFpoMemberSchema,
  requestContributionSchema,
  createProduceLotSchema,
  updateLotStatusSchema,
  allocateLotSchema,
  createQuotationSchema,
  rejectQuotationSchema,
  createDeliverySchema,
  updateStopStatusSchema,
  generateSettlementSchema,
  recordSettlementPaymentSchema
} = require('../schemas/farmer.schema');

const fpoOnly = [authenticate, requireRole(['FPO', 'ADMIN'])];

router.get('/dashboard', fpoOnly, fpoController.getFPODashboard);
router.get('/members', fpoOnly, fpoController.getMembers);
router.post('/members', fpoOnly, validate(addFpoMemberSchema), fpoController.addMember);
router.delete('/members/:id', fpoOnly, fpoController.removeMember);
router.patch('/members/:id/verify', fpoOnly, fpoController.verifyMember);
router.patch('/members/:id/suspend', fpoOnly, fpoController.suspendMember);
router.patch('/members/:id/reactivate', fpoOnly, fpoController.reactivateMember);

// Farmer Search & Invitations (Workflow A)
router.get('/farmers/search', fpoOnly, fpoController.searchFarmers);
router.get('/invitations', fpoOnly, fpoController.getSentInvitations);
router.delete('/invitations/:id', fpoOnly, fpoController.cancelInvitation);

// Incoming Farmer Join Requests (Workflow B)
router.get('/join-requests', fpoOnly, fpoController.getJoinRequests);
router.post('/join-requests/:id/approve', fpoOnly, fpoController.approveJoinRequest);
router.post('/join-requests/:id/reject', fpoOnly, fpoController.rejectJoinRequest);

// Phase 3: Member Produce & Contribution Requests
router.get('/member-produce', fpoOnly, fpoController.getMemberProduce);
router.post('/contributions/request', fpoOnly, validate(requestContributionSchema), fpoController.requestContribution);
router.get('/contributions', fpoOnly, fpoController.getFpoContributions);
router.delete('/contributions/:id', fpoOnly, fpoController.cancelFpoContribution);
router.post('/contributions/:id/release', fpoOnly, fpoController.releaseContributionReservation);

// Phase 4: Stock Aggregation & Produce Lot Management
router.get('/contributions/confirmed', fpoOnly, fpoController.getConfirmedContributions);
router.post('/lots', fpoOnly, validate(createProduceLotSchema), fpoController.createProduceLot);
router.get('/lots', fpoOnly, fpoController.getProduceLots);
router.get('/lots/:id', fpoOnly, fpoController.getProduceLotById);
router.patch('/lots/:id/status', fpoOnly, validate(updateLotStatusSchema), fpoController.updateProduceLotStatus);
router.delete('/lots/:id', fpoOnly, fpoController.cancelProduceLot);
router.post('/lots/:id/cancel', fpoOnly, fpoController.cancelProduceLot);
router.post('/lots/:id/allocate', fpoOnly, validate(allocateLotSchema), fpoController.allocateProduceLot);

router.post('/aggregate', fpoOnly, validate(aggregateProduceSchema), fpoController.aggregateProduce);
router.post('/pools', fpoOnly, validate(aggregateProduceSchema), fpoController.aggregateProduce);

// Phase 5: Bulk Procurement, Matching & Quotations
router.get('/directory', authenticate, fpoController.getFpoDirectory);
router.get('/requirements', fpoOnly, fpoController.getFpoBulkRequirements);
router.get('/requirements/:id', fpoOnly, fpoController.getFpoBulkRequirementById);
router.post('/quotations', fpoOnly, validate(createQuotationSchema), fpoController.createFpoQuotation);
router.get('/quotations', fpoOnly, fpoController.getFpoQuotations);
router.get('/quotations/:id', authenticate, fpoController.getFpoQuotationById);
router.post('/quotations/:id/withdraw', fpoOnly, fpoController.withdrawFpoQuotation);
router.post('/quotations/:id/accept', authenticate, requireRole(['BUYER', 'ADMIN', 'FPO']), fpoController.acceptFpoQuotation);
router.post('/quotations/:id/reject', authenticate, requireRole(['BUYER', 'ADMIN', 'FPO']), validate(rejectQuotationSchema), fpoController.rejectFpoQuotation);

// Phase 6: Multi-Farmer Pickup Logistics Integration
router.get('/orders', fpoOnly, fpoController.getFpoOrders);
router.get('/orders/:id/delivery-plan', fpoOnly, fpoController.getFpoOrderDeliveryPlan);
router.post('/orders/:id/deliveries', fpoOnly, validate(createDeliverySchema), fpoController.createFpoOrderDelivery);
router.get('/deliveries', fpoOnly, fpoController.getFpoDeliveries);
router.get('/deliveries/:id', fpoOnly, fpoController.getFpoDeliveryById);
router.patch('/deliveries/:id/stops/:stopId', fpoOnly, validate(updateStopStatusSchema), fpoController.updateFpoDeliveryStop);

// Phase 7: Farmer Settlements & Payment Management
router.get('/settlements', fpoOnly, fpoController.getFpoSettlements);
router.get('/settlements/:id', fpoOnly, fpoController.getFpoSettlementById);
router.post('/orders/:id/settlements/generate', fpoOnly, validate(generateSettlementSchema), fpoController.generateOrderSettlements);
router.post('/settlements/:id/payments', fpoOnly, validate(recordSettlementPaymentSchema), fpoController.recordSettlementPayment);

router.get('/proposals', fpoOnly, fpoController.getFpoProposals);
router.put('/profile', fpoOnly, validate(updateFpoProfileSchema), fpoController.updateFpoProfile);

module.exports = router;
