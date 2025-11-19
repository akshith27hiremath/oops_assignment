/**
 * Discount Code Model
 * Handles both platform-wide and user-specific discount codes
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum DiscountScope {
  PLATFORM_WIDE = 'PLATFORM_WIDE',
  USER_SPECIFIC = 'USER_SPECIFIC',
}

export interface IDiscountCodeUsage {
  userId: mongoose.Types.ObjectId;
  usageCount: number;
  lastUsedAt: Date;
}

export interface IDiscountCode extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  description: string;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  assignedUsers: mongoose.Types.ObjectId[];
  minPurchaseAmount: number;
  maxDiscountAmount: number;
  maxUsesGlobal: number;
  maxUsesPerUser: number;
  usageTracking: IDiscountCodeUsage[];
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  validateCode(userId: string, cartTotal: number): Promise<{ valid: boolean; reason?: string }>;
  calculateDiscount(cartTotal: number): number;
  incrementUsage(userId: string): Promise<void>;
  getUserUsageCount(userId: string): number;
  canUserUse(userId: string): boolean;
}

const DiscountCodeUsageSchema = new Schema<IDiscountCodeUsage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usageCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const DiscountCodeSchema = new Schema<IDiscountCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    scope: {
      type: String,
      enum: Object.values(DiscountScope),
      required: true,
      default: DiscountScope.PLATFORM_WIDE,
    },
    assignedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    minPurchaseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxUsesGlobal: {
      type: Number,
      default: 0, // 0 means unlimited
      min: 0,
    },
    maxUsesPerUser: {
      type: Number,
      default: 1,
      min: 0,
    },
    usageTracking: [DiscountCodeUsageSchema],
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
DiscountCodeSchema.index({ code: 1, isActive: 1 });
DiscountCodeSchema.index({ scope: 1, isActive: 1 });
DiscountCodeSchema.index({ validFrom: 1, validUntil: 1 });

// Virtual for total usage count
DiscountCodeSchema.virtual('totalUsageCount').get(function () {
  return this.usageTracking.reduce((sum, usage) => sum + usage.usageCount, 0);
});

/**
 * Validate if code can be used by user for given cart total
 */
DiscountCodeSchema.methods.validateCode = async function (
  userId: string,
  cartTotal: number
): Promise<{ valid: boolean; reason?: string }> {
  const userIdObj = new mongoose.Types.ObjectId(userId);

  // Check if code is active
  if (!this.isActive) {
    return { valid: false, reason: 'This discount code is currently inactive' };
  }

  // Check date validity
  const now = new Date();
  if (now < this.validFrom) {
    return { valid: false, reason: 'This discount code is not yet valid' };
  }
  if (now > this.validUntil) {
    return { valid: false, reason: 'This discount code has expired' };
  }

  // Check scope and user assignment
  if (this.scope === DiscountScope.USER_SPECIFIC) {
    const isAssigned = this.assignedUsers.some((id) => id.equals(userIdObj));
    if (!isAssigned) {
      return { valid: false, reason: 'This discount code is not available to you' };
    }
  }

  // Check minimum purchase amount
  if (cartTotal < this.minPurchaseAmount) {
    return {
      valid: false,
      reason: `Minimum purchase of ₹${this.minPurchaseAmount.toFixed(2)} required`,
    };
  }

  // Check global usage limit
  if (this.maxUsesGlobal > 0) {
    const totalUses = this.usageTracking.reduce((sum, u) => sum + u.usageCount, 0);
    if (totalUses >= this.maxUsesGlobal) {
      return { valid: false, reason: 'This discount code has reached its usage limit' };
    }
  }

  // Check per-user usage limit
  if (this.maxUsesPerUser > 0) {
    const userUsage = this.getUserUsageCount(userId);
    if (userUsage >= this.maxUsesPerUser) {
      return { valid: false, reason: 'You have already used this discount code the maximum number of times' };
    }
  }

  return { valid: true };
};

/**
 * Calculate discount amount for given cart total
 */
DiscountCodeSchema.methods.calculateDiscount = function (cartTotal: number): number {
  let discount = 0;

  if (this.type === DiscountType.PERCENTAGE) {
    discount = (cartTotal * this.value) / 100;
    // Apply max discount cap if set
    if (this.maxDiscountAmount > 0 && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else if (this.type === DiscountType.FIXED_AMOUNT) {
    discount = this.value;
    // Discount cannot exceed cart total
    if (discount > cartTotal) {
      discount = cartTotal;
    }
  }

  return Math.round(discount * 100) / 100; // Round to 2 decimal places
};

/**
 * Increment usage count for a user
 */
DiscountCodeSchema.methods.incrementUsage = async function (userId: string): Promise<void> {
  const userIdObj = new mongoose.Types.ObjectId(userId);
  const existingUsage = this.usageTracking.find((u) => u.userId.equals(userIdObj));

  if (existingUsage) {
    existingUsage.usageCount += 1;
    existingUsage.lastUsedAt = new Date();
  } else {
    this.usageTracking.push({
      userId: userIdObj,
      usageCount: 1,
      lastUsedAt: new Date(),
    });
  }

  await this.save();
};

/**
 * Get usage count for specific user
 */
DiscountCodeSchema.methods.getUserUsageCount = function (userId: string): number {
  const userIdObj = new mongoose.Types.ObjectId(userId);
  const usage = this.usageTracking.find((u) => u.userId.equals(userIdObj));
  return usage ? usage.usageCount : 0;
};

/**
 * Check if user can use this code (simplified check without cart total)
 */
DiscountCodeSchema.methods.canUserUse = function (userId: string): boolean {
  const userIdObj = new mongoose.Types.ObjectId(userId);

  // Check active and date range
  const now = new Date();
  if (!this.isActive || now < this.validFrom || now > this.validUntil) {
    return false;
  }

  // Check scope
  if (this.scope === DiscountScope.USER_SPECIFIC) {
    const isAssigned = this.assignedUsers.some((id) => id.equals(userIdObj));
    if (!isAssigned) return false;
  }

  // Check usage limits
  if (this.maxUsesPerUser > 0) {
    const userUsage = this.getUserUsageCount(userId);
    if (userUsage >= this.maxUsesPerUser) return false;
  }

  if (this.maxUsesGlobal > 0) {
    const totalUses = this.usageTracking.reduce((sum, u) => sum + u.usageCount, 0);
    if (totalUses >= this.maxUsesGlobal) return false;
  }

  return true;
};

/**
 * Static method: Find all valid codes for a user and cart total
 */
DiscountCodeSchema.statics.findValidCodes = async function (
  userId: string,
  cartTotal: number
): Promise<IDiscountCode[]> {
  const userIdObj = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  // Find all potentially applicable codes
  const codes = await this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    minPurchaseAmount: { $lte: cartTotal },
    $or: [
      { scope: DiscountScope.PLATFORM_WIDE },
      { scope: DiscountScope.USER_SPECIFIC, assignedUsers: userIdObj },
    ],
  });

  // Filter by usage limits
  const validCodes = codes.filter((code) => {
    // Check global usage
    if (code.maxUsesGlobal > 0) {
      const totalUses = code.usageTracking.reduce((sum, u) => sum + u.usageCount, 0);
      if (totalUses >= code.maxUsesGlobal) return false;
    }

    // Check per-user usage
    if (code.maxUsesPerUser > 0) {
      const userUsage = code.getUserUsageCount(userId);
      if (userUsage >= code.maxUsesPerUser) return false;
    }

    return true;
  });

  return validCodes;
};

const DiscountCode = mongoose.model<IDiscountCode>('DiscountCode', DiscountCodeSchema);

export default DiscountCode;
