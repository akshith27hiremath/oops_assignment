import { Router } from 'express';
import * as recipeController from '../controllers/recipe.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireCustomer } from '../middleware/rbac.middleware';

/**
 * Recipe Routes
 * Handles recipe and recipe review endpoints
 */

const router = Router();

/**
 * Public Routes (no authentication required)
 */

// GET /api/recipes - Browse recipes with filters
router.get('/', recipeController.browseRecipes);

// GET /api/recipes/featured - Get featured recipes
// Note: This must come before /:recipeId to avoid conflict
router.get('/featured', recipeController.getFeaturedRecipes);

// GET /api/recipes/:recipeId - Get recipe by ID
router.get('/:recipeId', recipeController.getRecipeById);

// POST /api/recipes/:recipeId/match-ingredients - Match ingredients to products
router.post('/:recipeId/match-ingredients', recipeController.matchRecipeIngredients);

// GET /api/recipes/:recipeId/reviews - Get recipe reviews
router.get('/:recipeId/reviews', recipeController.getRecipeReviews);

/**
 * Customer Routes (authentication required)
 */

// POST /api/recipes/:recipeId/reviews - Submit recipe review
router.post(
  '/:recipeId/reviews',
  authenticate,
  requireCustomer,
  recipeController.submitRecipeReview
);

/**
 * Admin Routes (authentication + admin role required)
 */

// POST /api/recipes - Create new recipe
router.post(
  '/',
  authenticate,
  requireAdmin,
  recipeController.createRecipe
);

// PUT /api/recipes/:recipeId - Update recipe
router.put(
  '/:recipeId',
  authenticate,
  requireAdmin,
  recipeController.updateRecipe
);

// DELETE /api/recipes/:recipeId - Delete recipe
router.delete(
  '/:recipeId',
  authenticate,
  requireAdmin,
  recipeController.deleteRecipe
);

// PATCH /api/recipes/:recipeId/featured - Toggle featured status
router.patch(
  '/:recipeId/featured',
  authenticate,
  requireAdmin,
  recipeController.toggleFeatured
);

// GET /api/recipes/reviews/pending - Get pending reviews for moderation
// Note: This route is intentionally placed after the specific routes above
router.get(
  '/reviews/pending',
  authenticate,
  requireAdmin,
  recipeController.getPendingReviews
);

// PATCH /api/recipes/reviews/:reviewId/approve - Approve review
router.patch(
  '/reviews/:reviewId/approve',
  authenticate,
  requireAdmin,
  recipeController.approveReview
);

// PATCH /api/recipes/reviews/:reviewId/reject - Reject review
router.patch(
  '/reviews/:reviewId/reject',
  authenticate,
  requireAdmin,
  recipeController.rejectReview
);

export default router;
