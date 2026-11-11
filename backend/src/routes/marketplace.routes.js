/**
 * SasyaVahini — Marketplace Routes (Phase 3)
 *
 * Endpoints for browsing produce listings, categories, search suggestions,
 * and supplier/FPO public profiles.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplace.controller');

// Phase 4: Supplier Comparison & Total Landed Cost
router.get('/compare', marketplaceController.getComparisonData);
router.post('/compare/calculate', marketplaceController.calculateLandedCost);
router.get('/compare/price-history', marketplaceController.getPriceHistory);

// Categories
router.get('/categories', marketplaceController.getCategories);

// Product Catalog (search, filter, sort, paginate)
router.get('/products', marketplaceController.getProducts);
router.get('/products/:id', marketplaceController.getProductById);

// Search typeahead suggestions
router.get('/search/suggestions', marketplaceController.getSearchSuggestions);

// Supplier public profiles & products
router.get('/suppliers/:supplierId', marketplaceController.getSupplierProfile);
router.get('/suppliers/:supplierId/products', marketplaceController.getSupplierProducts);

// Marketplace metrics & stats
router.get('/stats', marketplaceController.getMarketplaceStats);

// Backward compatibility routes for earlier Phase 1 & 2 callers
router.get('/produce', marketplaceController.getProducts);
router.get('/produce/:id', marketplaceController.getProductById);

module.exports = router;
