import { Router } from 'express';
import * as wholesaleController from '../controllers/wholesale.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSeller } from '../middleware/rbac.middleware';

const router = Router();

/**
 * B2B Marketplace Routes
 * All routes require authentication and RETAILER or WHOLESALER role
 */

/**
 * GET /api/wholesale/products
 * Get all wholesale products for B2B marketplace
 */
router.get(
  '/products',
  authenticate,
  requireSeller,
  wholesaleController.getWholesaleProducts
);

/**
 * GET /api/wholesale/products/:id
 * Get wholesale product details by ID
 */
router.get(
  '/products/:id',
  authenticate,
  requireSeller,
  wholesaleController.getWholesaleProductById
);

/**
 * GET /api/wholesale/categories
 * Get all wholesale product categories
 */
router.get(
  '/categories',
  authenticate,
  requireSeller,
  wholesaleController.getWholesaleCategories
);

export default router;
