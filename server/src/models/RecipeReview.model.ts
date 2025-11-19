import mongoose, { Document, Schema } from 'mongoose';

// ==================== INTERFACES ====================

export interface IRecipeReview extends Document {
  recipeId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  rating: number; // 1-5
  comment?: string;
  images?: string[]; // User can upload images of their cooking

  // Engagement
  helpfulCount: number; // How many found this review helpful
  reportedCount: number; // Moderation flag

  // Verification
  verified: boolean; // Did user actually order the ingredients?
  orderId?: mongoose.Types.ObjectId; // Link to order (if verified)

  // Status
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationNotes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ==================== SCHEMA ====================

const RecipeReviewSchema = new Schema<IRecipeReview>(
  {
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    images: [{ type: String }],

    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    verified: {
      type: Boolean,
      default: false,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },

    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: {
      type: Date,
    },
    moderationNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

// Compound indexes for common queries
RecipeReviewSchema.index({ recipeId: 1, status: 1, createdAt: -1 }); // Get approved reviews for recipe
RecipeReviewSchema.index({ customerId: 1, recipeId: 1 }, { unique: true }); // One review per customer per recipe
RecipeReviewSchema.index({ status: 1, createdAt: -1 }); // Moderation queue
RecipeReviewSchema.index({ verified: 1, rating: -1 }); // Verified reviews

// ==================== PRE-SAVE HOOKS ====================

RecipeReviewSchema.pre('save', async function (next) {
  // If review is being approved or rejected for first time
  if (this.isModified('status') && this.status !== 'PENDING') {
    this.moderatedAt = new Date();
  }

  next();
});

// ==================== POST-SAVE HOOKS ====================

RecipeReviewSchema.post('save', async function (doc) {
  // Update recipe rating when review is approved
  if (doc.status === 'APPROVED') {
    const Recipe = mongoose.model('Recipe');
    const recipe = await Recipe.findById(doc.recipeId);

    if (recipe) {
      await recipe.updateRating(doc.rating);
    }
  }
});

// ==================== POST-DELETE HOOKS ====================

RecipeReviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc && doc.status === 'APPROVED') {
    // Recalculate recipe rating when approved review is deleted
    const Recipe = mongoose.model('Recipe');
    const RecipeReview = mongoose.model('RecipeReview');

    const recipe = await Recipe.findById(doc.recipeId);
    if (recipe) {
      // Get all approved reviews for this recipe
      const reviews = await RecipeReview.find({
        recipeId: doc.recipeId,
        status: 'APPROVED',
      });

      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        recipe.averageRating = totalRating / reviews.length;
        recipe.ratingCount = reviews.length;
      } else {
        recipe.averageRating = 0;
        recipe.ratingCount = 0;
      }

      await recipe.save();
    }
  }
});

// ==================== STATIC METHODS ====================

RecipeReviewSchema.statics.getRecipeReviews = function (
  recipeId: mongoose.Types.ObjectId,
  options?: {
    onlyVerified?: boolean;
    minRating?: number;
    limit?: number;
    skip?: number;
  }
) {
  const query: any = {
    recipeId,
    status: 'APPROVED',
  };

  if (options?.onlyVerified) {
    query.verified = true;
  }

  if (options?.minRating) {
    query.rating = { $gte: options.minRating };
  }

  return this.find(query)
    .sort({ helpfulCount: -1, createdAt: -1 })
    .limit(options?.limit || 20)
    .skip(options?.skip || 0)
    .populate('customerId', 'profile.name email')
    .populate('orderId', 'orderId createdAt');
};

RecipeReviewSchema.statics.getPendingReviews = function (limit: number = 50) {
  return this.find({ status: 'PENDING' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('customerId', 'profile.name email')
    .populate('recipeId', 'title coverImage');
};

RecipeReviewSchema.statics.getUserReview = function (
  customerId: mongoose.Types.ObjectId,
  recipeId: mongoose.Types.ObjectId
) {
  return this.findOne({ customerId, recipeId })
    .populate('orderId', 'orderId createdAt');
};

// ==================== INSTANCE METHODS ====================

RecipeReviewSchema.methods.approve = async function (moderatorId: mongoose.Types.ObjectId) {
  this.status = 'APPROVED';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  await this.save();
};

RecipeReviewSchema.methods.reject = async function (
  moderatorId: mongoose.Types.ObjectId,
  reason: string
) {
  this.status = 'REJECTED';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  this.moderationNotes = reason;
  await this.save();
};

RecipeReviewSchema.methods.markHelpful = async function () {
  this.helpfulCount += 1;
  await this.save();
};

RecipeReviewSchema.methods.report = async function () {
  this.reportedCount += 1;

  // Auto-hide if too many reports
  if (this.reportedCount >= 5 && this.status === 'APPROVED') {
    this.status = 'PENDING';
    this.moderationNotes = 'Auto-flagged due to multiple reports';
  }

  await this.save();
};

// ==================== MODEL ====================

const RecipeReview = mongoose.model<IRecipeReview>('RecipeReview', RecipeReviewSchema);

export default RecipeReview;
