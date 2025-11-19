/**
 * Discount Code Routes
 * API endpoints for discount code management
 */

import express from 'express';
import discountCodeController from '../controllers/discountCode.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserType } from '../models/User.model';

const router = express.Router();

/**
 * Customer Routes - Available discount codes and validation
 */

// Get customer's available discount codes
router.get(
  '/my-codes',
  authenticate,
  requireRole([UserType.CUSTOMER]),
  discountCodeController.getMyDiscountCodes
);

// Validate a discount code before checkout
router.post(
  '/validate',
  authenticate,
  requireRole([UserType.CUSTOMER]),
  discountCodeController.validateDiscountCode
);

/**
 * Admin Routes - Discount code management
 */

// Create a new discount code
router.post(
  '/',
  authenticate,
  requireRole([UserType.ADMIN]),
  discountCodeController.createDiscountCode
);

// Get all discount codes (admin view)
router.get(
  '/',
  authenticate,
  requireRole([UserType.ADMIN]),
  discountCodeController.getAllDiscountCodes
);

// Update a discount code
router.put(
  '/:id',
  authenticate,
  requireRole([UserType.ADMIN]),
  discountCodeController.updateDiscountCode
);

// Deactivate a discount code
router.delete(
  '/:id',
  authenticate,
  requireRole([UserType.ADMIN]),
  discountCodeController.deactivateDiscountCode
);

// Assign discount code to specific user
router.post(
  '/:id/assign',
  authenticate,
  requireRole([UserType.ADMIN]),
  discountCodeController.assignDiscountCodeToUser
);

export default router;
