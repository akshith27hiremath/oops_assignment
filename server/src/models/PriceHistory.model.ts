import mongoose, { Document, Schema } from 'mongoose';

/**
 * Price History Model
 * Tracks price changes over time for products
 */

export interface IPriceHistoryEntry {
  price: number;
  discount?: number;
  timestamp: Date;
  reason: 'REGULAR_UPDATE' | 'DISCOUNT_APPLIED' | 'DISCOUNT_REMOVED' | 'PRICE_CHANGE' | 'STOCK_CHANGE';
}

export interface IPriceHistory extends Document {
  productId: mongoose.Types.ObjectId;
  retailerId: mongoose.Types.ObjectId;
  history: IPriceHistoryEntry[];
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  lastCheckedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  pruneOldHistory(): void;
}

const PriceHistoryEntrySchema = new Schema<IPriceHistoryEntry>({
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    enum: ['REGULAR_UPDATE', 'DISCOUNT_APPLIED', 'DISCOUNT_REMOVED', 'PRICE_CHANGE', 'STOCK_CHANGE'],
    required: true,
  },
}, { _id: false });

const PriceHistorySchema = new Schema<IPriceHistory>(
  {
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
    history: {
      type: [PriceHistoryEntrySchema],
      default: [],
    },
    currentPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lowestPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    highestPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    averagePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes
 */
PriceHistorySchema.index({ productId: 1, retailerId: 1 }, { unique: true });
PriceHistorySchema.index({ lastCheckedAt: 1 });
PriceHistorySchema.index({ productId: 1 });

/**
 * Instance Methods
 */

// Keep only last 90 days of history (to limit storage)
PriceHistorySchema.methods.pruneOldHistory = function(): void {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  this.history = this.history.filter(
    (entry: IPriceHistoryEntry) => entry.timestamp > ninetyDaysAgo
  );
};

const PriceHistory = mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);
export default PriceHistory;
