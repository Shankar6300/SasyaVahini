/**
 * SasyaVahini — Marketplace Routes
 *
 * Endpoints for browsing produce listings, viewing batch details, and market metrics.
 * Publicly viewable or authenticated.
 *
 * Owner: Member 3 (Buyer & Marketplace Module)
 */

const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplace.controller');

// Public or authenticated access for marketplace catalog
router.get('/produce', marketplaceController.getProduceListings);
router.get('/produce/:id', marketplaceController.getProduceListingById);
router.get('/stats', marketplaceController.getMarketplaceStats);

module.exports = router;
