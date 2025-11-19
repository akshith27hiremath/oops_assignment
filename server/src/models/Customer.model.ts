import mongoose, { Schema } from 'mongoose';
import User, { IUser, UserType } from './User.model';

/**
 * Customer Model
 * Extends base User model with customer-specific fields
 */

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

export interface ICustomer extends IUser {
  wishlist: mongoose.Types.ObjectId[]; // Product IDs
  orderHistory: mongoose.Types.ObjectId[]; // Order IDs
  loyaltyPoints: number;
  cart?: mongoose.Types.ObjectId; // ShoppingCart ID (will be created later)
  assignedDiscountCodes: mongoose.Types.ObjectId[]; // DiscountCode IDs

  // Virtual field
  loyaltyTier: LoyaltyTier;

  // Methods
  calculateLoyaltyTier(): LoyaltyTier;
  getLoyaltyDiscount(): number;
  getCompletedOrderCount(): Promise<number>;
  assignDiscountCode(codeId: mongoose.Types.ObjectId): Promise<void>;
}

// Customer-specific schema (only additional fields)
const CustomerSchema = new Schema<ICustomer>({
  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
  }],
  orderHistory: [{
    type: Schema.Types.ObjectId,
    ref: 'Order',
  }],
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  cart: {
    type: Schema.Types.ObjectId,
    ref: 'ShoppingCart',
    default: null,
  },
  assignedDiscountCodes: [{
    type: Schema.Types.ObjectId,
    ref: 'DiscountCode',
  }],
});

/**
 * Instance Methods
 */

// Add product to wishlist
CustomerSchema.methods.addToWishlist = async function(productId: mongoose.Types.ObjectId): Promise<void> {
  if (!this.wishlist.includes(productId)) {
    this.wishlist.push(productId);
    await this.save();
  }
};

// Remove product from wishlist
CustomerSchema.methods.removeFromWishlist = async function(productId: mongoose.Types.ObjectId): Promise<void> {
  this.wishlist = this.wishlist.filter((id: mongoose.Types.ObjectId) => !id.equals(productId));
  await this.save();
};

// Add loyalty points
CustomerSchema.methods.addLoyaltyPoints = async function(points: number): Promise<void> {
  this.loyaltyPoints += points;
  await this.save();
};

// Redeem loyalty points
CustomerSchema.methods.redeemLoyaltyPoints = async function(points: number): Promise<boolean> {
  if (this.loyaltyPoints >= points) {
    this.loyaltyPoints -= points;
    await this.save();
    return true;
  }
  return false;
};

// Get completed order count (delivered orders only)
CustomerSchema.methods.getCompletedOrderCount = async function(): Promise<number> {
  const Order = mongoose.model('Order');
  const count = await Order.countDocuments({
    customerId: this._id,
    status: 'DELIVERED',
  });
  return count;
};

// Calculate loyalty tier based on completed orders
// NOTE: This is synchronous and uses orderHistory length as a fallback
// For accurate count, use getCompletedOrderCount() async method
CustomerSchema.methods.calculateLoyaltyTier = async function(): Promise<LoyaltyTier> {
  // Get actual delivered order count from database
  const orderCount = await this.getCompletedOrderCount();

  if (orderCount >= 15) {
    return LoyaltyTier.GOLD;
  } else if (orderCount >= 5) {
    return LoyaltyTier.SILVER;
  } else {
    return LoyaltyTier.BRONZE;
  }
};

// Get loyalty tier discount percentage
CustomerSchema.methods.getLoyaltyDiscount = async function(): Promise<number> {
  const tier = await this.calculateLoyaltyTier();

  switch (tier) {
    case LoyaltyTier.GOLD:
      return 10; // 10%
    case LoyaltyTier.SILVER:
      return 5; // 5%
    case LoyaltyTier.BRONZE:
    default:
      return 0; // 0%
  }
};

// Assign a discount code to this customer
CustomerSchema.methods.assignDiscountCode = async function(codeId: mongoose.Types.ObjectId): Promise<void> {
  if (!this.assignedDiscountCodes.includes(codeId)) {
    this.assignedDiscountCodes.push(codeId);
    await this.save();
  }
};

/**
 * Virtual Fields
 */

// Virtual field for loyalty tier (calculated dynamically)
CustomerSchema.virtual('loyaltyTier').get(function() {
  return this.calculateLoyaltyTier();
});

/**
 * Static Methods
 */

// Find customers with loyalty points above threshold
CustomerSchema.statics.findByLoyaltyPoints = function(minPoints: number) {
  return this.find({
    userType: UserType.CUSTOMER,
    loyaltyPoints: { $gte: minPoints },
    isActive: true,
  }).sort({ loyaltyPoints: -1 });
};

/**
 * Indexes
 */
CustomerSchema.index({ loyaltyPoints: -1 });
CustomerSchema.index({ 'wishlist': 1 });

/**
 * Create Customer model as a discriminator of User
 */
const Customer = User.discriminator<ICustomer>(UserType.CUSTOMER, CustomerSchema);

export default Customer;
