import { Router } from 'express';
import paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireCustomer, requireSeller } from '../middleware/rbac.middleware';

/**
 * Payment Routes
 * Handles UPI payment-related endpoints
 */

const router = Router();

/**
 * Public Routes (for gateway callbacks)
 */

// POST /api/payments/razorpay-webhook - Razorpay webhook
router.post('/razorpay-webhook', paymentController.razorpayWebhook);

// POST /api/payments/callback - Payment gateway callback/webhook
router.post('/callback', paymentController.paymentCallback);

/**
 * Protected Routes (authentication required)
 */

// POST /api/payments/initiate - Initiate UPI payment
// Requires: CUSTOMER role
router.post(
  '/initiate',
  authenticate,
  requireCustomer,
  paymentController.initiatePayment
);

// POST /api/payments/verify - Verify payment status
// Requires: CUSTOMER role
router.post(
  '/verify',
  authenticate,
  requireCustomer,
  paymentController.verifyPayment
);

// POST /api/payments/verify-razorpay - Verify Razorpay payment signature
// Requires: CUSTOMER role
router.post(
  '/verify-razorpay',
  authenticate,
  requireCustomer,
  paymentController.verifyRazorpayPayment
);

// POST /api/payments/mark-failed - Mark payment as failed
// Requires: CUSTOMER role
router.post(
  '/mark-failed',
  authenticate,
  requireCustomer,
  paymentController.markPaymentFailed
);

// GET /api/payments/transaction/:id - Get transaction by ID
// Requires: Authentication (customer or merchant)
router.get(
  '/transaction/:id',
  authenticate,
  paymentController.getTransaction
);

// GET /api/payments/transactions - Get my transactions
// Requires: Authentication
router.get(
  '/transactions',
  authenticate,
  paymentController.getMyTransactions
);

// POST /api/payments/refund - Initiate refund
// Requires: RETAILER or WHOLESALER role
router.post(
  '/refund',
  authenticate,
  requireSeller,
  paymentController.initiateRefund
);

// GET /api/payments/statistics - Get payment statistics
// Requires: RETAILER or WHOLESALER role
router.get(
  '/statistics',
  authenticate,
  requireSeller,
  paymentController.getPaymentStatistics
);

export default router;
