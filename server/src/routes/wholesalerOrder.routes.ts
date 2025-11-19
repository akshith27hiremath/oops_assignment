/**
 * WholesalerOrder Routes
 * API endpoints for B2B orders between retailers and wholesalers
 */

import express from 'express';
import wholesalerOrderController from '../controllers/wholesalerOrder.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRetailer, requireWholesaler, requireSeller } from '../middleware/rbac.middleware';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * GET /api/b2b/orders
 * Get orders (filtered by user role)
 * - Retailers see their orders
 * - Wholesalers see incoming orders
 */
router.get(
  '/',
  requireSeller, // Both retailers and wholesalers can access
  wholesalerOrderController.getOrders
);

/**
 * GET /api/b2b/orders/stats/wholesaler
 * Get wholesaler statistics (active orders, revenue)
 * Wholesaler only
 */
router.get(
  '/stats/wholesaler',
  requireWholesaler,
  wholesalerOrderController.getWholesalerStats
);

/**
 * GET /api/b2b/retailer-network
 * Get retailer network with aggregated stats
 * Wholesaler only
 */
router.get(
  '/retailer-network',
  requireWholesaler,
  wholesalerOrderController.getRetailerNetwork
);

/**
 * GET /api/b2b/orders/:id
 * Get order details by ID
 * Accessible by retailer (order owner) or wholesaler (order recipient)
 */
router.get(
  '/:id',
  requireSeller,
  wholesalerOrderController.getOrderById
);

/**
 * POST /api/b2b/orders
 * Create new B2B order
 * Retailer only
 */
router.post(
  '/',
  requireRetailer,
  wholesalerOrderController.createOrder
);

/**
 * PUT /api/b2b/orders/:id/confirm
 * Confirm order (accept)
 * Wholesaler only
 */
router.put(
  '/:id/confirm',
  requireWholesaler,
  wholesalerOrderController.confirmOrder
);

/**
 * PUT /api/b2b/orders/:id/status
 * Update order status (process, ship, deliver)
 * Wholesaler only
 */
router.put(
  '/:id/status',
  requireWholesaler,
  wholesalerOrderController.updateOrderStatus
);

/**
 * PUT /api/b2b/orders/:id/cancel
 * Cancel order
 * Retailer only (before confirmation)
 */
router.put(
  '/:id/cancel',
  requireRetailer,
  wholesalerOrderController.cancelOrder
);

/**
 * PUT /api/b2b/orders/:id/mark-paid
 * Mark order as paid (wholesaler confirms payment received)
 * Wholesaler only
 */
router.put(
  '/:id/mark-paid',
  requireWholesaler,
  wholesalerOrderController.markOrderAsPaid
);

/**
 * PUT /api/b2b/orders/:id/notify-payment-sent
 * Notify wholesaler that payment has been sent
 * Retailer only
 */
router.put(
  '/:id/notify-payment-sent',
  requireRetailer,
  wholesalerOrderController.notifyPaymentSent
);

/**
 * POST /api/b2b/orders/:id/generate-invoice
 * Generate invoice PDF for completed order
 * Both retailer and wholesaler can generate
 */
router.post(
  '/:id/generate-invoice',
  requireSeller,
  wholesalerOrderController.generateInvoice
);

/**
 * GET /api/b2b/orders/:id/invoice
 * Download invoice PDF
 * Both retailer and wholesaler can download
 */
router.get(
  '/:id/invoice',
  requireSeller,
  wholesalerOrderController.downloadInvoice
);

export default router;
