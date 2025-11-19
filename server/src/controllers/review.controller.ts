import { Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import { logger } from '../utils/logger';
import { uploadMultipleImages } from '../utils/cloudinary.upload';

/**
 * Review Controller
 * Handles review-related requests
 */

/**
 * Create a new review
 * POST /api/reviews
 */
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    const { orderId, productId, rating, title, comment } = req.body;

    if (!orderId || !productId || !rating) {
      res.status(400).json({
        success: false,
        message: 'Order ID, Product ID, and Rating are required',
      });
      return;
    }

    // Handle uploaded image files
    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      try {
        imageUrls = await uploadMultipleImages(req.files as Express.Multer.File[], {
          folder: 'reviews',
        });
      } catch (uploadError: any) {
        logger.error('❌ Image upload error:', uploadError);
        res.status(400).json({
          success: false,
          message: 'Failed to upload images',
        });
        return;
      }
    }

    const review = await reviewService.createReview({
      userId,
      orderId,
      productId,
      rating,
      title,
      comment,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review },
    });
  } catch (error: any) {
    logger.error('❌ Create review controller error:', error);

    const statusCode = error.message.includes('already reviewed') ? 409 : 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create review',
    });
  }
};

/**
 * Get all reviews for a product
 * GET /api/reviews/product/:productId
 */
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { rating, isVerifiedPurchase, sort, page, limit } = req.query;

    const filters: any = {};
    if (rating) filters.rating = parseInt(rating as string);
    if (isVerifiedPurchase !== undefined) filters.isVerifiedPurchase = isVerifiedPurchase === 'true';
    if (sort) filters.sort = sort as string;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;

    const result = await reviewService.getProductReviews(productId, filters, pageNum, limitNum);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('❌ Get product reviews controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get product reviews',
    });
  }
};

/**
 * Get current user's reviews
 * GET /api/reviews/user
 */
export const getUserReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    const { page, limit } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;

    const result = await reviewService.getUserReviews(userId, pageNum, limitNum);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('❌ Get user reviews controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user reviews',
    });
  }
};

/**
 * Get single review by ID
 * GET /api/reviews/:reviewId
 */
export const getReviewById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;

    const review = await reviewService.getReviewById(reviewId);

    if (!review) {
      res.status(404).json({
        success: false,
        message: 'Review not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { review },
    });
  } catch (error: any) {
    logger.error('❌ Get review by ID controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get review',
    });
  }
};

/**
 * Update a review
 * PUT /api/reviews/:reviewId
 */
export const updateReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;

    // Handle uploaded image files
    let imageUrls: string[] | undefined;
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      try {
        imageUrls = await uploadMultipleImages(req.files as Express.Multer.File[], {
          folder: 'reviews',
        });
      } catch (uploadError: any) {
        logger.error('❌ Image upload error:', uploadError);
        res.status(400).json({
          success: false,
          message: 'Failed to upload images',
        });
        return;
      }
    }

    const review = await reviewService.updateReview(reviewId, userId, {
      rating,
      title,
      comment,
      images: imageUrls,
    });

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: { review },
    });
  } catch (error: any) {
    logger.error('❌ Update review controller error:', error);

    const statusCode = error.message.includes('48 hours') ? 403 :
                       error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update review',
    });
  }
};

/**
 * Delete a review
 * DELETE /api/reviews/:reviewId
 */
export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    const { reviewId } = req.params;
    const userType = (req.user as any).userType;
    const isAdmin = userType === 'ADMIN';

    await reviewService.deleteReview(reviewId, userId, isAdmin);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error: any) {
    logger.error('❌ Delete review controller error:', error);

    const statusCode = error.message.includes('not found') ? 404 : 403;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete review',
    });
  }
};

/**
 * Vote review as helpful or not helpful
 * POST /api/reviews/:reviewId/helpful
 */
export const voteHelpful = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    const { reviewId } = req.params;
    const { isHelpful } = req.body;

    if (isHelpful === undefined) {
      res.status(400).json({
        success: false,
        message: 'isHelpful field is required',
      });
      return;
    }

    const review = await reviewService.voteHelpful(reviewId, userId, isHelpful);

    res.status(200).json({
      success: true,
      message: 'Vote recorded successfully',
      data: { review },
    });
  } catch (error: any) {
    logger.error('❌ Vote helpful controller error:', error);

    const statusCode = error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to record vote',
    });
  }
};

/**
 * Flag review as inappropriate
 * POST /api/reviews/:reviewId/flag
 */
export const flagReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        message: 'Reason is required',
      });
      return;
    }

    const review = await reviewService.flagReview(reviewId, userId, reason);

    res.status(200).json({
      success: true,
      message: 'Review flagged successfully',
      data: { review },
    });
  } catch (error: any) {
    logger.error('❌ Flag review controller error:', error);

    const statusCode = error.message.includes('already flagged') ? 409 :
                       error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to flag review',
    });
  }
};

/**
 * Add retailer response to review
 * POST /api/reviews/:reviewId/reply
 */
export const addRetailerResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const retailerId = (req.user as any)._id.toString();
    const { reviewId } = req.params;
    const { responseText } = req.body;

    if (!responseText) {
      res.status(400).json({
        success: false,
        message: 'Response text is required',
      });
      return;
    }

    const review = await reviewService.addRetailerResponse(reviewId, retailerId, responseText);

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: { review },
    });
  } catch (error: any) {
    logger.error('❌ Add retailer response controller error:', error);

    const statusCode = error.message.includes('already has') ? 409 :
                       error.message.includes('not found') ? 404 :
                       error.message.includes('only respond') ? 403 : 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to add response',
    });
  }
};

/**
 * Get reviewable items from an order
 * GET /api/orders/:orderId/reviewable-items
 */
export const getReviewableItems = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    const { orderId } = req.params;

    const items = await reviewService.getReviewableItems(orderId, userId);

    res.status(200).json({
      success: true,
      data: { items },
    });
  } catch (error: any) {
    logger.error('❌ Get reviewable items controller error:', error);

    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('only view') ? 403 : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get reviewable items',
    });
  }
};

/**
 * Get flagged reviews for moderation (Admin only)
 * GET /api/reviews/pending-moderation
 */
export const getFlaggedReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;

    const result = await reviewService.getFlaggedReviews(pageNum, limitNum);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('❌ Get flagged reviews controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get flagged reviews',
    });
  }
};

/**
 * Moderate review (Admin only)
 * PUT /api/reviews/:reviewId/moderate
 */
export const moderateReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const { isApproved, moderationNotes } = req.body;

    if (isApproved === undefined) {
      res.status(400).json({
        success: false,
        message: 'isApproved field is required',
      });
      return;
    }

    const review = await reviewService.moderateReview(reviewId, isApproved, moderationNotes);

    res.status(200).json({
      success: true,
      message: `Review ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: { review },
    });
  } catch (error: any) {
    logger.error('❌ Moderate review controller error:', error);

    const statusCode = error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to moderate review',
    });
  }
};

export default {
  createReview,
  getProductReviews,
  getUserReviews,
  getReviewById,
  updateReview,
  deleteReview,
  voteHelpful,
  flagReview,
  addRetailerResponse,
  getReviewableItems,
  getFlaggedReviews,
  moderateReview,
};
