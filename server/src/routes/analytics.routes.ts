/**
 * Analytics Routes
 * API endpoints for analytics data across all user types
 */

import express from 'express';
import analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireCustomer, requireRetailer, requireWholesaler } from '../middleware/rbac.middleware';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * GET /api/analytics/customer
 * Get customer analytics (orders, spending, favorites)
 * Customer only
 */
router.get(
  '/customer',
  requireCustomer,
  analyticsController.getCustomerAnalytics
);

/**
 * GET /api/analytics/retailer
 * Get retailer analytics (sales, customers, products)
 * Retailer only
 */
router.get(
  '/retailer',
  requireRetailer,
  analyticsController.getRetailerAnalytics
);

/**
 * GET /api/analytics/wholesaler
 * Get wholesaler analytics (B2B sales, retailers, orders)
 * Wholesaler only
 */
router.get(
  '/wholesaler',
  requireWholesaler,
  analyticsController.getWholesalerAnalytics
);

export default router;
