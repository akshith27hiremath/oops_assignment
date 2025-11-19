import mongoose, { Document, Schema } from 'mongoose';

/**
 * Wishlist Model
 * Stores customer wishlists with price alert preferences
 */

export interface IWishlistItem {
  productId: mongoose.Types.ObjectId;
  retailerId: mongoose.Types.ObjectId;
  addedAt: Date;

  // Price Alert Fields
  targetPrice?: number;              // Customer's desired price point
  lastNotifiedPrice?: number;        // Last price we sent notification for
  priceAlertEnabled: boolean;        // Can disable alerts per item
  notifyOnDiscount: boolean;         // Alert on any discount
  notifyOnTargetPrice: boolean;      // Alert when reaches target price
  notifyOnRestock: boolean;          // Alert when back in stock
}

export interface IWishlist extends Document {
  customerId: mongoose.Types.ObjectId;
  items: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;

  // Methods
  addItem(productId: mongoose.Types.ObjectId, retailerId: mongoose.Types.ObjectId): Promise<void>;
  removeItem(productId: mongoose.Types.ObjectId): Promise<void>;
  setTargetPrice(productId: mongoose.Types.ObjectId, targetPrice: number): Promise<void>;
  updateItemPreferences(productId: mongoose.Types.ObjectId, preferences: Partial<IWishlistItem>): Promise<void>;
}

const WishlistItemSchema = new Schema<IWishlistItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  retailerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  targetPrice: {
    type: Number,
    min: 0,
  },
  lastNotifiedPrice: {
    type: Number,
    min: 0,
  },
  priceAlertEnabled: {
    type: Boolean,
    default: true,
  },
  notifyOnDiscount: {
    type: Boolean,
    default: true,
  },
  notifyOnTargetPrice: {
    type: Boolean,
    default: true,
  },
  notifyOnRestock: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const WishlistSchema = new Schema<IWishlist>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: {
      type: [WishlistItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes
 */
WishlistSchema.index({ customerId: 1 }, { unique: true });
WishlistSchema.index({ 'items.productId': 1 });
WishlistSchema.index({ 'items.priceAlertEnabled': 1 });

/**
 * Instance Methods
 */

// Add item to wishlist
WishlistSchema.methods.addItem = async function(
  productId: mongoose.Types.ObjectId,
  retailerId: mongoose.Types.ObjectId
): Promise<void> {
  const exists = this.items.some((item: IWishlistItem) =>
    item.productId.equals(productId)
  );

  if (!exists) {
    this.items.push({
      productId,
      retailerId,
      addedAt: new Date(),
      priceAlertEnabled: true,
      notifyOnDiscount: true,
      notifyOnTargetPrice: true,
      notifyOnRestock: true,
    });
    await this.save();
  }
};

// Remove item from wishlist
WishlistSchema.methods.removeItem = async function(
  productId: mongoose.Types.ObjectId
): Promise<void> {
  this.items = this.items.filter(
    (item: IWishlistItem) => !item.productId.equals(productId)
  );
  await this.save();
};

// Set target price for an item
WishlistSchema.methods.setTargetPrice = async function(
  productId: mongoose.Types.ObjectId,
  targetPrice: number
): Promise<void> {
  const item = this.items.find((item: IWishlistItem) =>
    item.productId.equals(productId)
  );

  if (item) {
    item.targetPrice = targetPrice;
    item.notifyOnTargetPrice = true;
    await this.save();
  }
};

// Update item preferences
WishlistSchema.methods.updateItemPreferences = async function(
  productId: mongoose.Types.ObjectId,
  preferences: Partial<IWishlistItem>
): Promise<void> {
  const item = this.items.find((item: IWishlistItem) =>
    item.productId.equals(productId)
  );

  if (item) {
    Object.assign(item, preferences);
    await this.save();
  }
};

const Wishlist = mongoose.model<IWishlist>('Wishlist', WishlistSchema);
export default Wishlist;
