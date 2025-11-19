import { Request, Response } from 'express';
import recipeService, { CreateRecipeData } from '../services/recipe.service';
import RecipeReview from '../models/RecipeReview.model';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import {
  RecipeCategory,
  DietaryTag,
  DifficultyLevel,
  RecipeStatus,
} from '../models/Recipe.model';

/**
 * Recipe Controller
 * Handles all recipe-related operations
 */

/**
 * Browse recipes with filters
 * GET /api/recipes
 * Public access
 */
export const browseRecipes = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      cuisine,
      dietaryTags,
      difficulty,
      maxTime,
      featured,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filters: any = {
      page: Number(page),
      limit: Number(limit),
    };

    if (category) filters.category = category as RecipeCategory;
    if (cuisine) filters.cuisine = cuisine as string;
    if (difficulty) filters.difficulty = difficulty as DifficultyLevel;
    if (maxTime) filters.maxTime = Number(maxTime);
    if (search) filters.search = search as string;

    // Parse dietary tags (can be comma-separated)
    if (dietaryTags) {
      const tagsArray = typeof dietaryTags === 'string'
        ? dietaryTags.split(',').map(t => t.trim() as DietaryTag)
        : dietaryTags as DietaryTag[];
      filters.dietaryTags = tagsArray;
    }

    // Parse featured (boolean)
    if (featured !== undefined) {
      filters.featured = featured === 'true' || featured === true;
    }

    const result = await recipeService.browseRecipes(filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error browsing recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipes',
      error: error.message,
    });
  }
};

/**
 * Get recipe by ID
 * GET /api/recipes/:recipeId
 * Public access
 */
export const getRecipeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipeId } = req.params;

    // Increment view count only if not admin/creator
    const incrementView = true; // Could be conditional based on user role

    const recipe = await recipeService.getRecipeById(recipeId, incrementView);

    if (!recipe) {
      res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: recipe,
    });
  } catch (error: any) {
    logger.error('Error fetching recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipe',
      error: error.message,
    });
  }
};

/**
 * Get featured recipes
 * GET /api/recipes/featured
 * Public access
 */
export const getFeaturedRecipes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10 } = req.query;

    const recipes = await recipeService.getFeaturedRecipes(Number(limit));

    res.status(200).json({
      success: true,
      data: recipes,
    });
  } catch (error: any) {
    logger.error('Error fetching featured recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured recipes',
      error: error.message,
    });
  }
};

/**
 * Match recipe ingredients to products
 * POST /api/recipes/:recipeId/match-ingredients
 * Public access (customers need to see available products)
 */
export const matchRecipeIngredients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipeId } = req.params;
    const { servings } = req.body;

    const result = await recipeService.matchRecipeIngredients(
      recipeId,
      servings ? Number(servings) : undefined
    );

    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
      return;
    }

    // Increment cook count (user is attempting to add to cart)
    await result.recipe.incrementCookCount();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error matching recipe ingredients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to match recipe ingredients',
      error: error.message,
    });
  }
};

/**
 * Create a new recipe
 * POST /api/recipes
 * Admin only
 */
export const createRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const recipeData: CreateRecipeData = req.body;

    const recipe = await recipeService.createRecipe(
      recipeData,
      new mongoose.Types.ObjectId(req.user._id)
    );

    logger.info(`Recipe created: ${recipe.recipeId} by admin ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: 'Recipe created successfully',
      data: recipe,
    });
  } catch (error: any) {
    logger.error('Error creating recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create recipe',
      error: error.message,
    });
  }
};

/**
 * Update a recipe
 * PUT /api/recipes/:recipeId
 * Admin only
 */
export const updateRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipeId } = req.params;
    const updates: Partial<CreateRecipeData> = req.body;

    const recipe = await recipeService.updateRecipe(recipeId, updates);

    if (!recipe) {
      res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
      return;
    }

    logger.info(`Recipe updated: ${recipeId} by admin ${req.user?._id}`);

    res.status(200).json({
      success: true,
      message: 'Recipe updated successfully',
      data: recipe,
    });
  } catch (error: any) {
    logger.error('Error updating recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update recipe',
      error: error.message,
    });
  }
};

/**
 * Delete a recipe
 * DELETE /api/recipes/:recipeId
 * Admin only
 */
export const deleteRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipeId } = req.params;

    const deleted = await recipeService.deleteRecipe(recipeId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
      return;
    }

    logger.info(`Recipe deleted: ${recipeId} by admin ${req.user?._id}`);

    res.status(200).json({
      success: true,
      message: 'Recipe deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete recipe',
      error: error.message,
    });
  }
};

/**
 * Toggle recipe featured status
 * PATCH /api/recipes/:recipeId/featured
 * Admin only
 */
export const toggleFeatured = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipeId } = req.params;

    const recipe = await recipeService.toggleFeatured(recipeId);

    if (!recipe) {
      res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
      return;
    }

    logger.info(`Recipe ${recipeId} featured status: ${recipe.featured}`);

    res.status(200).json({
      success: true,
      message: `Recipe ${recipe.featured ? 'featured' : 'unfeatured'} successfully`,
      data: recipe,
    });
  } catch (error: any) {
    logger.error('Error toggling recipe featured status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update featured status',
      error: error.message,
    });
  }
};

/**
 * Get recipe reviews
 * GET /api/recipes/:recipeId/reviews
 * Public access
 */
export const getRecipeReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipeId } = req.params;
    const {
      onlyVerified,
      minRating,
      page = 1,
      limit = 20,
    } = req.query;

    const result = await recipeService.getRecipeReviews(recipeId, {
      onlyVerified: onlyVerified === 'true',
      minRating: minRating ? Number(minRating) : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error fetching recipe reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

/**
 * Submit a recipe review
 * POST /api/recipes/:recipeId/reviews
 * Customer only
 */
export const submitRecipeReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { recipeId } = req.params;
    const { rating, comment, images, orderId } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
      return;
    }

    // Get recipe to verify it exists
    const recipe = await recipeService.getRecipeById(recipeId);
    if (!recipe) {
      res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
      return;
    }

    // Check if user already reviewed this recipe
    const existingReview = await (RecipeReview as any).getUserReview(
      new mongoose.Types.ObjectId(req.user._id),
      recipe._id
    );

    if (existingReview) {
      res.status(400).json({
        success: false,
        message: 'You have already reviewed this recipe',
      });
      return;
    }

    // Create review
    const review = new RecipeReview({
      recipeId: recipe._id,
      customerId: new mongoose.Types.ObjectId(req.user._id),
      rating,
      comment,
      images,
      orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
      verified: !!orderId, // Verified if linked to an order
      status: 'PENDING', // Needs admin approval
    });

    await review.save();

    logger.info(`Recipe review submitted: ${recipeId} by customer ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be published after moderation.',
      data: review,
    });
  } catch (error: any) {
    logger.error('Error submitting recipe review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: error.message,
    });
  }
};

/**
 * Approve a recipe review
 * PATCH /api/recipes/reviews/:reviewId/approve
 * Admin only
 */
export const approveReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { reviewId } = req.params;

    const review = await RecipeReview.findById(reviewId);
    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    await (review as any).approve(new mongoose.Types.ObjectId(req.user._id));

    logger.info(`Recipe review approved: ${reviewId} by admin ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'Review approved successfully',
      data: review,
    });
  } catch (error: any) {
    logger.error('Error approving review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve review',
      error: error.message,
    });
  }
};

/**
 * Reject a recipe review
 * PATCH /api/recipes/reviews/:reviewId/reject
 * Admin only
 */
export const rejectReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
      return;
    }

    const review = await RecipeReview.findById(reviewId);
    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    await (review as any).reject(new mongoose.Types.ObjectId(req.user._id), reason);

    logger.info(`Recipe review rejected: ${reviewId} by admin ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'Review rejected successfully',
      data: review,
    });
  } catch (error: any) {
    logger.error('Error rejecting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject review',
      error: error.message,
    });
  }
};

/**
 * Get pending reviews (for moderation)
 * GET /api/recipes/reviews/pending
 * Admin only
 */
export const getPendingReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50 } = req.query;

    const reviews = await (RecipeReview as any).getPendingReviews(Number(limit));

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    logger.error('Error fetching pending reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending reviews',
      error: error.message,
    });
  }
};
