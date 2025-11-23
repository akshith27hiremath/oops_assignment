import { Router } from 'express';
import orderController from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireCustomer, requireRetailer } from '../middleware/rbac.middleware';

/**
 * Order Routes
 * Handles order-related endpoints
 */

const router = Router();

/**
 * Protected Routes (authentication required)
 */

// POST /api/orders - Create new order
// Requires: CUSTOMER role
router.post(
  '/',
  authenticate,
  requireCustomer,
  orderController.createOrder
);

// GET /api/orders - Get my orders
// Requires: Authentication (customer sees their orders, retailer sees store orders)
router.get(
  '/',
  authenticate,
  orderController.getMyOrders
);

// GET /api/orders/:id - Get order by ID
// Requires: Order owner (customer or retailer)
router.get(
  '/:id',
  authenticate,
  orderController.getOrderById
);

// PUT /api/orders/:id/status - Update order status
// Requires: RETAILER role (order owner only)
router.put(
  '/:id/status',
  authenticate,
  requireRetailer,
  orderController.updateOrderStatus
);

// PUT /api/orders/:id/sub-orders/:subOrderId/status - Update sub-order status
// Requires: RETAILER role (sub-order owner only)
router.put(
  '/:id/sub-orders/:subOrderId/status',
  authenticate,
  requireRetailer,
  orderController.updateSubOrderStatus
);

// POST /api/orders/:id/cancel - Cancel order
// Requires: CUSTOMER role (order owner only)
router.post(
  '/:id/cancel',
  authenticate,
  requireCustomer,
  orderController.cancelOrder
);

// GET /api/orders/:id/tracking - Get order tracking info
// Requires: Order owner (customer or retailer)
router.get(
  '/:id/tracking',
  authenticate,
  orderController.getOrderTracking
);

// POST /api/orders/:id/mark-paid - Mark order as paid (COD)
// Requires: RETAILER role (order owner only)
router.post(
  '/:id/mark-paid',
  authenticate,
  requireRetailer,
  orderController.markOrderAsPaid
);

// POST /api/orders/:id/sub-orders/:subOrderId/mark-paid - Mark sub-order as paid (COD)
// Requires: RETAILER role (sub-order owner only)
router.post(
  '/:id/sub-orders/:subOrderId/mark-paid',
  authenticate,
  requireRetailer,
  orderController.markSubOrderAsPaid
);

// GET /api/orders/:id/invoice - Download invoice
// Requires: Order owner (customer or retailer)
router.get(
  '/:id/invoice',
  authenticate,
  orderController.downloadInvoice
);

// GET /api/orders/:id/sub-orders/:subOrderId/calendar - Download shipping calendar event
// Requires: CUSTOMER role (order owner only)
router.get(
  '/:id/sub-orders/:subOrderId/calendar',
  authenticate,
  requireCustomer,
  orderController.downloadShippingCalendar
);

// GET /api/orders/:id/reviewable-items - Get items that can be reviewed
// Requires: CUSTOMER role (order owner only)
router.get(
  '/:orderId/reviewable-items',
  authenticate,
  requireCustomer,
  async (req, res) => {
    try {
      const { reviewController } = await import('../controllers/review.controller');
      await reviewController.getReviewableItems(req, res);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get reviewable items',
      });
    }
  }
);

export default router;
