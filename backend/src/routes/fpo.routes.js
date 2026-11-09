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
const { aggregateProduceSchema } = require('../schemas/farmer.schema');

const fpoOnly = [authenticate, requireRole(['FPO', 'ADMIN'])];

router.get('/dashboard', fpoOnly, fpoController.getFPODashboard);
router.get('/members', fpoOnly, fpoController.getMembers);

router.post('/aggregate', fpoOnly, validate(aggregateProduceSchema), fpoController.aggregateProduce);
router.post('/pools', fpoOnly, validate(aggregateProduceSchema), fpoController.aggregateProduce);

router.get('/proposals', fpoOnly, fpoController.getFpoProposals);
router.put('/profile', fpoOnly, fpoController.updateFpoProfile);

module.exports = router;