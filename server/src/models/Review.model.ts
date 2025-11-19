import mongoose, { Document, Schema, Model } from 'mongoose';
import { logger } from '../utils/logger';

/**
 * Review Model
 * Customer reviews and ratings for products from delivered orders
 */

// Review Interface
export interface IReview extends Document {
  // Core Fields
  reviewId: string;
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;

  // Review Content
  rating: number; // 1-5 stars (required)
  title?: string; // Short headline (optional, max 50 chars)
  comment?: string; // Text review (optional, max 2000 chars)
  images: string[]; // Array of image URLs (max 5)

  // Status & Verification
  isVerifiedPurchase: boolean; // True if from actual order
  isModerated: boolean; // True if reviewed by admin
  isApproved: boolean; // True if visible to public
  isFlagged: boolean; // True if reported
  flagReason?: string; // Reason for flagging
  flaggedBy: mongoose.Types.ObjectId[]; // Users who flagged this review

  // Interaction
  helpfulCount: number; // Number of helpful votes
  notHelpfulCount: number; // Number of not helpful votes
  helpfulVotes: mongoose.Types.ObjectId[]; // Users who voted helpful
  notHelpfulVotes: mongoose.Types.ObjectId[]; // Users who voted not helpful

  // Retailer Response
  retailerResponse?: {
    responderId: mongoose.Types.ObjectId;
    responseText: string;
    responseDate: Date;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date; // Last edit timestamp

  // Virtual fields
  canEdit: boolean;

  // Methods
  markHelpful(userId: mongoose.Types.ObjectId, isHelpful: boolean): Promise<void>;
  addRetailerResponse(retailerId: mongoose.Types.ObjectId, responseText: string): Promise<void>;
  flagAsInappropriate(userId: mongoose.Types.ObjectId, reason: string): Promise<void>;
}

/**
 * Review Schema
 */
const ReviewSchema = new Schema<IReview>(
  {
    reviewId: {
      type: String,
      required: true,
      unique: true,
      default: () => `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5',
      },
    },
    title: {
      type: String,
      trim: true,
      maxlength: [50, 'Review title cannot exceed 50 characters'],
    },
    comment: {
      type: String,
      trim: true,
      minlength: [10, 'Review comment must be at least 10 characters'],
      maxlength: [2000, 'Review comment cannot exceed 2000 characters'],
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images: string[]) => images.length <= 5,
        message: 'Maximum 5 images allowed per review',
      },
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },
    isModerated: {
      type: Boolean,
      default: false,
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: true, // Auto-approve verified purchases
      index: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flagReason: {
      type: String,
      trim: true,
    },
    flaggedBy: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulVotes: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    notHelpfulVotes: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    retailerResponse: {
      responderId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      responseText: {
        type: String,
        trim: true,
        maxlength: [500, 'Response cannot exceed 500 characters'],
      },
      responseDate: {
        type: Date,
        default: Date.now,
      },
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for efficient queries
 */

// Prevent duplicate reviews (one review per product per order per user)
ReviewSchema.index({ userId: 1, productId: 1, orderId: 1 }, { unique: true });

// For product page queries (approved reviews, sorted by date)
ReviewSchema.index({ productId: 1, isApproved: 1, createdAt: -1 });

// For user review history
ReviewSchema.index({ userId: 1, createdAt: -1 });

// For rating filters
ReviewSchema.index({ productId: 1, rating: 1, isApproved: 1 });

// For moderation (flagged and unapproved reviews)
ReviewSchema.index({ isApproved: 1, isFlagged: 1 });

// For helpful sorting
ReviewSchema.index({ productId: 1, helpfulCount: -1 });

/**
 * Virtual Fields
 */

// Check if review can be edited (within 48 hours of creation)
ReviewSchema.virtual('canEdit').get(function () {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  return this.createdAt > fortyEightHoursAgo;
});

/**
 * Instance Methods
 */

// Mark review as helpful or not helpful
ReviewSchema.methods.markHelpful = async function (
  userId: mongoose.Types.ObjectId,
  isHelpful: boolean
): Promise<void> {
  const userIdStr = userId.toString();
  const helpfulIndex = this.helpfulVotes.findIndex((id: mongoose.Types.ObjectId) => id.toString() === userIdStr);
  const notHelpfulIndex = this.notHelpfulVotes.findIndex(
    (id: mongoose.Types.ObjectId) => id.toString() === userIdStr
  );

  if (isHelpful) {
    // Remove from not helpful if present
    if (notHelpfulIndex > -1) {
      this.notHelpfulVotes.splice(notHelpfulIndex, 1);
      this.notHelpfulCount = Math.max(0, this.notHelpfulCount - 1);
    }

    // Toggle helpful vote
    if (helpfulIndex > -1) {
      // Remove vote
      this.helpfulVotes.splice(helpfulIndex, 1);
      this.helpfulCount = Math.max(0, this.helpfulCount - 1);
    } else {
      // Add vote
      this.helpfulVotes.push(userId);
      this.helpfulCount += 1;
    }
  } else {
    // Remove from helpful if present
    if (helpfulIndex > -1) {
      this.helpfulVotes.splice(helpfulIndex, 1);
      this.helpfulCount = Math.max(0, this.helpfulCount - 1);
    }

    // Toggle not helpful vote
    if (notHelpfulIndex > -1) {
      // Remove vote
      this.notHelpfulVotes.splice(notHelpfulIndex, 1);
      this.notHelpfulCount = Math.max(0, this.notHelpfulCount - 1);
    } else {
      // Add vote
      this.notHelpfulVotes.push(userId);
      this.notHelpfulCount += 1;
    }
  }

  await this.save();
  logger.info(`✅ Review ${this.reviewId} marked as ${isHelpful ? 'helpful' : 'not helpful'} by user ${userIdStr}`);
};

// Add retailer response to review
ReviewSchema.methods.addRetailerResponse = async function (
  retailerId: mongoose.Types.ObjectId,
  responseText: string
): Promise<void> {
  // Check if there's already a response with actual text
  if (this.retailerResponse && this.retailerResponse.responseText) {
    throw new Error('Review already has a retailer response');
  }

  this.retailerResponse = {
    responderId: retailerId,
    responseText: responseText.trim(),
    responseDate: new Date(),
  };

  await this.save();
  logger.info(`✅ Retailer response added to review ${this.reviewId}`);
};

// Flag review as inappropriate
ReviewSchema.methods.flagAsInappropriate = async function (
  userId: mongoose.Types.ObjectId,
  reason: string
): Promise<void> {
  const userIdStr = userId.toString();
  const alreadyFlagged = this.flaggedBy.some((id: mongoose.Types.ObjectId) => id.toString() === userIdStr);

  if (alreadyFlagged) {
    throw new Error('You have already flagged this review');
  }

  this.flaggedBy.push(userId);
  this.flagReason = reason;

  // Auto-flag if 3 or more users report
  if (this.flaggedBy.length >= 3) {
    this.isFlagged = true;
    this.isApproved = false; // Hide from public until moderated
    logger.warn(`⚠️ Review ${this.reviewId} auto-flagged after ${this.flaggedBy.length} reports`);
  }

  await this.save();
  logger.info(`🚩 Review ${this.reviewId} flagged by user ${userIdStr}: ${reason}`);
};

/**
 * Static Methods
 */

// Get rating distribution for a product
ReviewSchema.statics.getRatingDistribution = async function (productId: mongoose.Types.ObjectId) {
  const distribution = await this.aggregate([
    { $match: { productId, isApproved: true } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);

  // Convert to object { 5: count, 4: count, ... }
  const result: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((item) => {
    result[item._id] = item.count;
  });

  return result;
};

// Get review stats for a product
ReviewSchema.statics.getProductStats = async function (productId: mongoose.Types.ObjectId) {
  const reviews = await this.find({ productId, isApproved: true });
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      verifiedPurchaseCount: 0,
    };
  }

  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  const averageRating = sum / totalReviews;
  const verifiedPurchaseCount = reviews.filter((r) => r.isVerifiedPurchase).length;
  const ratingDistribution = await this.getRatingDistribution(productId);

  return {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalReviews,
    ratingDistribution,
    verifiedPurchaseCount,
  };
};

/**
 * Create and export Review model
 */
const Review: Model<IReview> = mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
