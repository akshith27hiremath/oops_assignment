import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist,
  moveWishlistToCart,
  setTargetPrice,
  updateItemPreferences,
  getPriceHistory,
} from '../controllers/wishlist.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * Wishlist Routes
 * All routes require authentication
 */

// GET /api/wishlist - Get user's wishlist
router.get('/', authenticate, getWishlist);

// POST /api/wishlist - Add product to wishlist
router.post('/', authenticate, addToWishlist);

// DELETE /api/wishlist - Clear entire wishlist
router.delete('/', authenticate, clearWishlist);

// GET /api/wishlist/check/:productId - Check if product is in wishlist
router.get('/check/:productId', authenticate, checkWishlist);

// GET /api/wishlist/price-history/:productId - Get price history
router.get('/price-history/:productId', authenticate, getPriceHistory);

// PUT /api/wishlist/:productId/target-price - Set target price for item
router.put('/:productId/target-price', authenticate, setTargetPrice);

// PUT /api/wishlist/:productId/preferences - Update item preferences
router.put('/:productId/preferences', authenticate, updateItemPreferences);

// DELETE /api/wishlist/:productId - Remove product from wishlist
router.delete('/:productId', authenticate, removeFromWishlist);

// POST /api/wishlist/move-to-cart - Get wishlist items to add to cart
router.post('/move-to-cart', authenticate, moveWishlistToCart);

export default router;
