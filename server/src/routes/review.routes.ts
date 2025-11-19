import { Router } from 'express';
import reviewController from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireCustomer, requireRetailer, requireRole } from '../middleware/rbac.middleware';
import { uploadReviewImages } from '../middleware/upload.middleware';

/**
 * Review Routes
 * Handles review-related endpoints
 */

const router = Router();

/**
 * Base route - Review API info
 */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Review API',
    endpoints: {
      public: [
        'GET /api/reviews/product/:productId - Get reviews for a product',
        'GET /api/reviews/:reviewId - Get single review by ID',
      ],
      customer: [
        'POST /api/reviews - Create a review',
        'GET /api/reviews/user - Get current user\'s reviews',
        'PUT /api/reviews/:reviewId - Update own review',
        'DELETE /api/reviews/:reviewId - Delete own review',
        'POST /api/reviews/:reviewId/helpful - Vote review as helpful/not helpful',
        'POST /api/reviews/:reviewId/flag - Flag review as inappropriate',
      ],
      retailer: [
        'POST /api/reviews/:reviewId/reply - Add retailer response to review',
      ],
      admin: [
        'GET /api/reviews/pending-moderation - Get flagged reviews',
        'PUT /api/reviews/:reviewId/moderate - Moderate review (approve/reject)',
        'DELETE /api/reviews/:reviewId - Delete any review',
      ],
      order: [
        'GET /api/orders/:orderId/reviewable-items - Get items that can be reviewed',
      ],
    },
  });
});

/**
 * IMPORTANT: Specific routes (like /user, /product/:id, /pending-moderation)
 * MUST be defined BEFORE generic routes (like /:reviewId) to avoid route collisions
 */

/**
 * Public Routes (no authentication required)
 */

// GET /api/reviews/product/:productId - Get all reviews for a product
router.get('/product/:productId', reviewController.getProductReviews);

/**
 * Customer Protected Routes (authentication + customer role required)
 */

// POST /api/reviews - Create a new review (with image upload support)
router.post('/', authenticate, requireCustomer, uploadReviewImages, reviewController.createReview);

// GET /api/reviews/user - Get current user's reviews
router.get('/user', authenticate, requireCustomer, reviewController.getUserReviews);

/**
 * Admin Protected Routes (authentication + admin role required)
 */

// GET /api/reviews/pending-moderation - Get flagged reviews for moderation
router.get(
  '/pending-moderation',
  authenticate,
  requireRole('ADMIN' as any),
  reviewController.getFlaggedReviews
);

/**
 * Generic ID-based routes (MUST be after specific routes)
 */

// GET /api/reviews/:reviewId - Get single review by ID
router.get('/:reviewId', reviewController.getReviewById);

// PUT /api/reviews/:reviewId - Update a review (with image upload support)
router.put('/:reviewId', authenticate, requireCustomer, uploadReviewImages, reviewController.updateReview);

// DELETE /api/reviews/:reviewId - Delete a review (customer can delete own, admin can delete any)
router.delete('/:reviewId', authenticate, reviewController.deleteReview);

// POST /api/reviews/:reviewId/helpful - Vote review as helpful or not helpful
router.post('/:reviewId/helpful', authenticate, reviewController.voteHelpful);

// POST /api/reviews/:reviewId/flag - Flag review as inappropriate
router.post('/:reviewId/flag', authenticate, reviewController.flagReview);

/**
 * Retailer Protected Routes (authentication + retailer role required)
 */

// POST /api/reviews/:reviewId/reply - Add retailer response to review
router.post('/:reviewId/reply', authenticate, requireRetailer, reviewController.addRetailerResponse);

// PUT /api/reviews/:reviewId/moderate - Moderate review (approve/reject)
router.put(
  '/:reviewId/moderate',
  authenticate,
  requireRole('ADMIN' as any),
  reviewController.moderateReview
);

export default router;
