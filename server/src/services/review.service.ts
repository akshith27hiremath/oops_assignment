import mongoose from 'mongoose';
import Review, { IReview } from '../models/Review.model';
import Order, { OrderStatus } from '../models/Order.model';
import Product from '../models/Product.model';
import User from '../models/User.model';
import { logger } from '../utils/logger';

/**
 * Review Service
 * Handles all review-related business logic
 */

export interface CreateReviewData {
  userId: string;
  orderId: string;
  productId: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export interface UpdateReviewData {
  rating?: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export interface ReviewFilters {
  rating?: number;
  isVerifiedPurchase?: boolean;
  sort?: 'helpful' | 'recent' | 'rating-high' | 'rating-low';
}

class ReviewService {
  /**
   * Check if user can review a product from an order
   */
  async canReview(userId: string, orderId: string, productId: string): Promise<{ canReview: boolean; reason?: string }> {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        return { canReview: false, reason: 'Order not found' };
      }

      // Check if user owns the order
      if (order.customerId.toString() !== userId) {
        return { canReview: false, reason: 'You can only review items from your own orders' };
      }

      // Check if order is delivered (handle both single and multi-retailer orders)
      const currentStatus = (order as any).masterStatus || order.status;
      if (currentStatus !== OrderStatus.DELIVERED) {
        return { canReview: false, reason: 'Order must be delivered before reviewing' };
      }

      // Check if product is in the order (handle both single and multi-retailer orders)
      let orderItem;

      // Check in main items (single-retailer)
      orderItem = order.items.find((item) => item.productId.toString() === productId);

      // If not found, check in sub-orders (multi-retailer)
      if (!orderItem && (order as any).subOrders) {
        for (const subOrder of (order as any).subOrders) {
          orderItem = subOrder.items.find((item: any) => item.productId.toString() === productId);
          if (orderItem) break;
        }
      }

      if (!orderItem) {
        return { canReview: false, reason: 'Product not found in this order' };
      }

      // Check if already reviewed
      const existingReview = await Review.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        orderId: new mongoose.Types.ObjectId(orderId),
        productId: new mongoose.Types.ObjectId(productId),
      });

      if (existingReview) {
        return { canReview: false, reason: 'You have already reviewed this product from this order' };
      }

      return { canReview: true };
    } catch (error: any) {
      logger.error('❌ Error checking review eligibility:', error);
      throw error;
    }
  }

  /**
   * Create a new review
   */
  async createReview(data: CreateReviewData): Promise<IReview> {
    try {
      const { userId, orderId, productId, rating, title, comment, images } = data;

      // Check eligibility
      const eligibility = await this.canReview(userId, orderId, productId);
      if (!eligibility.canReview) {
        throw new Error(eligibility.reason || 'Cannot create review');
      }

      // Create review
      const review = await Review.create({
        userId: new mongoose.Types.ObjectId(userId),
        orderId: new mongoose.Types.ObjectId(orderId),
        productId: new mongoose.Types.ObjectId(productId),
        rating,
        title: title?.trim(),
        comment: comment?.trim(),
        images: images || [],
        isVerifiedPurchase: true, // Always true for order-based reviews
        isApproved: true, // Auto-approve verified purchases
      });

      // Update order item to mark as reviewed (handle both single and multi-retailer orders)
      const order = await Order.findById(orderId);

      // Try updating in main items (single-retailer)
      let updated = await Order.updateOne(
        { _id: orderId, 'items.productId': productId },
        {
          $set: {
            'items.$.hasReview': true,
            'items.$.reviewId': review._id,
          },
        }
      );

      // If not updated and has subOrders, update in subOrders (multi-retailer)
      if (updated.modifiedCount === 0 && (order as any)?.subOrders) {
        for (let i = 0; i < (order as any).subOrders.length; i++) {
          const updateResult = await Order.updateOne(
            { _id: orderId, [`subOrders.${i}.items.productId`]: productId },
            {
              $set: {
                [`subOrders.${i}.items.$.hasReview`]: true,
                [`subOrders.${i}.items.$.reviewId`]: review._id,
              },
            }
          );
          if (updateResult.modifiedCount > 0) break;
        }
      }

      // Recalculate product rating
      await Product.recalculateRating(new mongoose.Types.ObjectId(productId));

      logger.info(`✅ Review created: ${review.reviewId} for product ${productId} by user ${userId}`);

      return review;
    } catch (error: any) {
      logger.error('❌ Error creating review:', error);
      throw error;
    }
  }

  /**
   * Get reviews for a product with filters and pagination
   */
  async getProductReviews(
    productId: string,
    filters: ReviewFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: IReview[]; pagination: any; stats: any }> {
    try {
      const query: any = {
        productId: new mongoose.Types.ObjectId(productId),
        isApproved: true,
      };

      // Apply filters
      if (filters.rating) {
        query.rating = filters.rating;
      }

      if (filters.isVerifiedPurchase !== undefined) {
        query.isVerifiedPurchase = filters.isVerifiedPurchase;
      }

      // Determine sort order
      let sort: any = { createdAt: -1 }; // Default: most recent
      switch (filters.sort) {
        case 'helpful':
          sort = { helpfulCount: -1, createdAt: -1 };
          break;
        case 'rating-high':
          sort = { rating: -1, createdAt: -1 };
          break;
        case 'rating-low':
          sort = { rating: 1, createdAt: -1 };
          break;
        case 'recent':
        default:
          sort = { createdAt: -1 };
      }

      // Get total count
      const total = await Review.countDocuments(query);

      // Get reviews with pagination
      const reviews = await Review.find(query)
        .populate('userId', 'profile.name profile.avatar')
        .populate('retailerResponse.responderId', 'businessName profile.name')
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      // Get rating distribution and stats
      const stats = await (Review as any).getProductStats(new mongoose.Types.ObjectId(productId));

      const pagination = {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        limit,
      };

      return { reviews: reviews as IReview[], pagination, stats };
    } catch (error: any) {
      logger.error('❌ Error getting product reviews:', error);
      throw error;
    }
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(userId: string, page: number = 1, limit: number = 10): Promise<{ reviews: IReview[]; pagination: any }> {
    try {
      const query = { userId: new mongoose.Types.ObjectId(userId) };

      const total = await Review.countDocuments(query);

      const reviews = await Review.find(query)
        .populate('userId', 'profile.name profile.avatar')
        .populate('productId', 'name images')
        .populate('orderId', 'orderId')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      const pagination = {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        limit,
      };

      return { reviews: reviews as IReview[], pagination };
    } catch (error: any) {
      logger.error('❌ Error getting user reviews:', error);
      throw error;
    }
  }

  /**
   * Get single review by ID
   */
  async getReviewById(reviewId: string): Promise<IReview | null> {
    try {
      const review = await Review.findById(reviewId)
        .populate('userId', 'profile.name profile.avatar')
        .populate('productId', 'name images')
        .populate('retailerResponse.responderId', 'businessName profile.name');

      return review;
    } catch (error: any) {
      logger.error('❌ Error getting review:', error);
      throw error;
    }
  }

  /**
   * Update a review (only within 48 hours)
   */
  async updateReview(reviewId: string, userId: string, updates: UpdateReviewData): Promise<IReview> {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw new Error('Review not found');
      }

      // Check ownership
      if (review.userId.toString() !== userId) {
        throw new Error('You can only update your own reviews');
      }

      // Check 48-hour window
      if (!review.canEdit) {
        throw new Error('Reviews can only be edited within 48 hours of creation');
      }

      // Update fields
      if (updates.rating !== undefined) review.rating = updates.rating;
      if (updates.title !== undefined) review.title = updates.title?.trim();
      if (updates.comment !== undefined) review.comment = updates.comment?.trim();
      if (updates.images !== undefined) review.images = updates.images;

      review.editedAt = new Date();
      await review.save();

      // Recalculate product rating if rating changed
      if (updates.rating !== undefined) {
        await Product.recalculateRating(review.productId);
      }

      logger.info(`✅ Review updated: ${review.reviewId}`);

      return review;
    } catch (error: any) {
      logger.error('❌ Error updating review:', error);
      throw error;
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string, userId: string, isAdmin: boolean = false): Promise<boolean> {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw new Error('Review not found');
      }

      // Check permission (owner or admin)
      if (!isAdmin && review.userId.toString() !== userId) {
        throw new Error('You can only delete your own reviews');
      }

      const productId = review.productId;
      const orderId = review.orderId;
      const productIdInOrder = review.productId;

      // Delete review
      await Review.findByIdAndDelete(reviewId);

      // Update order item
      await Order.updateOne(
        { _id: orderId, 'items.productId': productIdInOrder },
        {
          $set: {
            'items.$.hasReview': false,
          },
          $unset: {
            'items.$.reviewId': '',
          },
        }
      );

      // Recalculate product rating
      await Product.recalculateRating(productId);

      logger.info(`✅ Review deleted: ${review.reviewId}`);

      return true;
    } catch (error: any) {
      logger.error('❌ Error deleting review:', error);
      throw error;
    }
  }

  /**
   * Vote review as helpful or not helpful
   */
  async voteHelpful(reviewId: string, userId: string, isHelpful: boolean): Promise<IReview> {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw new Error('Review not found');
      }

      await review.markHelpful(new mongoose.Types.ObjectId(userId), isHelpful);

      return review;
    } catch (error: any) {
      logger.error('❌ Error voting on review:', error);
      throw error;
    }
  }

  /**
   * Add retailer response to review
   */
  async addRetailerResponse(reviewId: string, retailerId: string, responseText: string): Promise<IReview> {
    try {
      const review = await Review.findById(reviewId).populate('productId');

      if (!review) {
        throw new Error('Review not found');
      }

      // Verify retailer owns the product
      const product: any = review.productId;
      if (product.createdBy.toString() !== retailerId) {
        throw new Error('You can only respond to reviews of your own products');
      }

      await review.addRetailerResponse(new mongoose.Types.ObjectId(retailerId), responseText);

      logger.info(`✅ Retailer response added to review ${review.reviewId}`);

      return review;
    } catch (error: any) {
      logger.error('❌ Error adding retailer response:', error);
      throw error;
    }
  }

  /**
   * Flag review as inappropriate
   */
  async flagReview(reviewId: string, userId: string, reason: string): Promise<IReview> {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw new Error('Review not found');
      }

      await review.flagAsInappropriate(new mongoose.Types.ObjectId(userId), reason);

      return review;
    } catch (error: any) {
      logger.error('❌ Error flagging review:', error);
      throw error;
    }
  }

  /**
   * Moderate review (admin only)
   */
  async moderateReview(reviewId: string, isApproved: boolean, moderationNotes?: string): Promise<IReview> {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw new Error('Review not found');
      }

      review.isApproved = isApproved;
      review.isModerated = true;
      review.isFlagged = false; // Clear flag after moderation

      await review.save();

      // Recalculate product rating
      await Product.recalculateRating(review.productId);

      logger.info(`✅ Review ${review.reviewId} ${isApproved ? 'approved' : 'rejected'} by admin`);

      return review;
    } catch (error: any) {
      logger.error('❌ Error moderating review:', error);
      throw error;
    }
  }

  /**
   * Get reviewable items from an order
   */
  async getReviewableItems(orderId: string, userId: string): Promise<any[]> {
    try {
      const order = await Order.findById(orderId).populate('items.productId');

      if (!order) {
        throw new Error('Order not found');
      }

      // Check ownership
      if (order.customerId.toString() !== userId) {
        throw new Error('You can only view items from your own orders');
      }

      // Check if order is delivered (handle both single and multi-retailer orders)
      const currentStatus = (order as any).masterStatus || order.status;
      if (currentStatus !== OrderStatus.DELIVERED) {
        return [];
      }

      // Get items from both single-retailer and multi-retailer orders
      let allItems: any[] = [];

      // Get items from main items array (single-retailer)
      if (order.items && order.items.length > 0) {
        allItems = [...order.items];
      }

      // Get items from sub-orders (multi-retailer)
      if ((order as any).subOrders && (order as any).subOrders.length > 0) {
        for (const subOrder of (order as any).subOrders) {
          if (subOrder.items) {
            allItems.push(...subOrder.items);
          }
        }
      }

      // Filter items that haven't been reviewed
      const reviewableItems = allItems.filter((item) => !item.hasReview);

      // Populate product details if not already populated
      const populatedItems = await Promise.all(
        reviewableItems.map(async (item) => {
          if (typeof item.productId === 'string' || item.productId instanceof mongoose.Types.ObjectId) {
            const product = await Product.findById(item.productId);
            return {
              ...item.toObject ? item.toObject() : item,
              productId: product,
            };
          }
          return item;
        })
      );

      return populatedItems;
    } catch (error: any) {
      logger.error('❌ Error getting reviewable items:', error);
      throw error;
    }
  }

  /**
   * Get flagged reviews for moderation (admin only)
   */
  async getFlaggedReviews(page: number = 1, limit: number = 20): Promise<{ reviews: IReview[]; pagination: any }> {
    try {
      const query = { isFlagged: true };

      const total = await Review.countDocuments(query);

      const reviews = await Review.find(query)
        .populate('userId', 'profile.name email')
        .populate('productId', 'name images')
        .populate('flaggedBy', 'profile.name email')
        .sort({ updatedAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const pagination = {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        limit,
      };

      return { reviews: reviews as IReview[], pagination };
    } catch (error: any) {
      logger.error('❌ Error getting flagged reviews:', error);
      throw error;
    }
  }
}

export const reviewService = new ReviewService();
export default reviewService;
