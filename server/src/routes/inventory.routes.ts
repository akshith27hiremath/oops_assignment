import { Router } from 'express';
import inventoryController from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSeller } from '../middleware/rbac.middleware';

/**
 * Inventory Routes
 * Handles stock management endpoints
 */

const router = Router();

/**
 * All routes require authentication and seller role (RETAILER or WHOLESALER)
 */

// GET /api/inventory - Get current user's inventory
router.get(
  '/',
  authenticate,
  requireSeller,
  inventoryController.getInventory
);

// POST /api/inventory - Create inventory entry for a product
router.post(
  '/',
  authenticate,
  requireSeller,
  inventoryController.createInventory
);

// PATCH /api/inventory/:id/stock - Update stock level
router.patch(
  '/:id/stock',
  authenticate,
  requireSeller,
  inventoryController.updateStock
);

// GET /api/inventory/featured - Get featured products (public, no auth needed)
router.get(
  '/featured',
  inventoryController.getFeaturedProducts
);

// GET /api/inventory/product/:productId - Get inventory by product ID
router.get(
  '/product/:productId',
  authenticate,
  requireSeller,
  inventoryController.getInventoryByProduct
);

// POST /api/inventory/:id/discount - Set product discount
router.post(
  '/:id/discount',
  authenticate,
  requireSeller,
  inventoryController.setProductDiscount
);

// DELETE /api/inventory/:id/discount - Remove product discount
router.delete(
  '/:id/discount',
  authenticate,
  requireSeller,
  inventoryController.removeProductDiscount
);

export default router;
