import { Router } from 'express';
import storeController from '../controllers/store.controller';
import { authenticate } from '../middleware/auth.middleware';

/**
 * Store Routes
 * Handles store/retailer location-based operations
 */

const router = Router();

/**
 * Public routes (accessible to all authenticated users)
 */

// Get nearby stores
router.get('/nearby', authenticate, storeController.getNearbyStores);

// Get store by ID
router.get('/:id', authenticate, storeController.getStoreById);

// Search stores with advanced filters
router.post('/search', authenticate, storeController.searchStores);

export default router;
