import { Router } from 'express';
import productController from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSeller } from '../middleware/rbac.middleware';
import { uploadReviewImages } from '../middleware/upload.middleware';

/**
 * Product Routes
 * Handles product-related endpoints
 */

const router = Router();

/**
 * Public Routes (no authentication required)
 */

// GET /api/products - Get all products (with filters)
router.get('/', productController.getAllProducts);

// GET /api/products/category/:category - Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// GET /api/products/:id - Get product by ID
router.get('/:id', productController.getProductById);

/**
 * Protected Routes (authentication required)
 */

// GET /api/products/seller/my-products - Get seller's own products
// Requires: RETAILER or WHOLESALER
router.get(
  '/seller/my-products',
  authenticate,
  requireSeller,
  productController.getMyProducts
);

// POST /api/products - Create new product (with image upload support)
// Requires: RETAILER or WHOLESALER
router.post(
  '/',
  authenticate,
  requireSeller,
  uploadReviewImages,
  productController.createProduct
);

// PUT /api/products/:id - Update product (with image upload support)
// Requires: Owner (creator) of the product
router.put(
  '/:id',
  authenticate,
  requireSeller,
  uploadReviewImages,
  productController.updateProduct
);

// DELETE /api/products/:id - Delete product (soft delete)
// Requires: Owner (creator) of the product
router.delete(
  '/:id',
  authenticate,
  requireSeller,
  productController.deleteProduct
);

export default router;
