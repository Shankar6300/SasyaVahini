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
const { createProduceSchema, updateProduceSchema } = require('../schemas/farmer.schema');

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

module.exports = router;