import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Order Model
 * Represents customer orders in the system
 */

export enum OrderType {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number; // Final price after product discount (what customer pays per unit)
  originalUnitPrice?: number; // Original base price before product discount
  productDiscountPercentage?: number; // Product-level discount percentage applied
  subtotal: number; // unitPrice * quantity
  discounts?: number; // Tier/code discount amount applied to this item
  hasReview?: boolean; // Track if customer has reviewed this item
  reviewId?: mongoose.Types.ObjectId; // Link to review if exists
}

export interface ITrackingInfo {
  currentStatus: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: Date;
    notes?: string;
  }[];
  estimatedDelivery?: Date;
  deliveryPersonId?: mongoose.Types.ObjectId;
}

export interface IDiscountBreakdown {
  subtotal: number; // Original price before any discounts
  productDiscountSavings?: number; // Savings from product-level discounts
  subtotalAfterProductDiscounts?: number; // Subtotal after product discounts but before tier/code
  tierDiscount: number; // Discount from loyalty tier
  codeDiscount: number; // Discount from promo code
  finalDiscount: number; // Actual tier/code discount applied (best of tier or code)
  discountType: 'TIER' | 'CODE' | 'NONE'; // Which tier/code discount was used
  tierPercentage?: number; // The tier discount percentage that was available
  codePercentage?: number; // The code discount percentage that was available
}

// NEW: Sub-order interface for multi-retailer support
export interface ISubOrder {
  subOrderId: string; // E.g., "ORD-123-R1"
  retailerId: mongoose.Types.ObjectId;
  items: IOrderItem[];

  // Pricing breakdown for this retailer
  subtotalBeforeProductDiscounts: number;
  productDiscountSavings: number;
  subtotalAfterProductDiscounts: number;
  tierCodeDiscountShare: number; // Proportional share of master discount
  totalAmount: number; // Final amount for this retailer

  // Status tracking
  status: OrderStatus;
  paymentStatus: PaymentStatus; // Payment status for this sub-order
  trackingInfo: ITrackingInfo;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrder extends Document {
  orderId: string;
  customerId: mongoose.Types.ObjectId;

  // Multi-retailer support
  retailerId?: mongoose.Types.ObjectId; // Deprecated - kept for backward compatibility
  items?: IOrderItem[]; // Deprecated - kept for backward compatibility
  subOrders: ISubOrder[]; // NEW: Array of sub-orders, one per retailer

  orderType: OrderType;
  status?: OrderStatus; // Deprecated - kept for backward compatibility
  masterStatus: OrderStatus; // NEW: Aggregate status across all sub-orders
  paymentStatus: PaymentStatus;
  totalAmount: number; // Final amount after discounts
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  scheduledDate?: Date;
  trackingInfo?: ITrackingInfo; // Deprecated - kept for backward compatibility
  upiTransactionId?: mongoose.Types.ObjectId;
  notes?: string;

  // Discount tracking fields
  appliedDiscountCode?: mongoose.Types.ObjectId; // Reference to DiscountCode if used
  loyaltyTierAtPurchase?: string; // Snapshot of customer's tier when order was placed
  discountBreakdown?: IDiscountBreakdown; // Detailed discount information

  createdAt: Date;
  updatedAt: Date;

  // Methods
  calculateMasterStatus(): OrderStatus;
}

// Order Item Schema
const OrderItemSchema = new Schema<IOrderItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  originalUnitPrice: {
    type: Number,
    min: 0,
  },
  productDiscountPercentage: {
    type: Number,
    min: 0,
    max: 100,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  discounts: {
    type: Number,
    default: 0,
    min: 0,
  },
  hasReview: {
    type: Boolean,
    default: false,
  },
  reviewId: {
    type: Schema.Types.ObjectId,
    ref: 'Review',
  },
}, { _id: false });

// Tracking Info Schema
const TrackingInfoSchema = new Schema<ITrackingInfo>({
  currentStatus: {
    type: String,
    enum: Object.values(OrderStatus),
    required: true,
    default: OrderStatus.PENDING,
  },
  statusHistory: [{
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: String,
  }],
  estimatedDelivery: Date,
  deliveryPersonId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: false });

// Sub-Order Schema (for multi-retailer support)
const SubOrderSchema = new Schema<ISubOrder>({
  subOrderId: {
    type: String,
    required: true,
  },
  retailerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  items: {
    type: [OrderItemSchema],
    required: true,
  },
  subtotalBeforeProductDiscounts: {
    type: Number,
    required: true,
    min: 0,
  },
  productDiscountSavings: {
    type: Number,
    default: 0,
    min: 0,
  },
  subtotalAfterProductDiscounts: {
    type: Number,
    required: true,
    min: 0,
  },
  tierCodeDiscountShare: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    required: true,
    default: OrderStatus.PENDING,
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    required: true,
    default: PaymentStatus.PENDING,
  },
  trackingInfo: {
    type: TrackingInfoSchema,
    required: true,
  },
}, { timestamps: true, _id: false });

// Order Schema
const OrderSchema = new Schema<IOrder>({
  orderId: {
    type: String,
    unique: true,
    index: true,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required'],
    index: true,
  },
  // Backward compatibility fields (deprecated)
  retailerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  items: {
    type: [OrderItemSchema],
  },
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    index: true,
  },
  trackingInfo: {
    type: TrackingInfoSchema,
  },

  // NEW: Multi-retailer support
  subOrders: {
    type: [SubOrderSchema],
    default: [],
  },

  orderType: {
    type: String,
    enum: Object.values(OrderType),
    required: true,
    default: OrderType.ONLINE,
  },
  masterStatus: {
    type: String,
    enum: Object.values(OrderStatus),
    required: true,
    default: OrderStatus.PENDING,
    index: true,
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    required: true,
    default: PaymentStatus.PENDING,
    index: true,
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: 0,
  },
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'India' },
  },
  scheduledDate: Date,
  upiTransactionId: {
    type: Schema.Types.ObjectId,
    ref: 'UPITransaction',
  },
  notes: String,

  // Discount tracking fields
  appliedDiscountCode: {
    type: Schema.Types.ObjectId,
    ref: 'DiscountCode',
  },
  loyaltyTierAtPurchase: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD'],
  },
  discountBreakdown: {
    subtotal: { type: Number, default: 0 },
    productDiscountSavings: { type: Number, default: 0 },
    subtotalAfterProductDiscounts: { type: Number, default: 0 },
    tierDiscount: { type: Number, default: 0 },
    codeDiscount: { type: Number, default: 0 },
    finalDiscount: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ['TIER', 'CODE', 'NONE'],
      default: 'NONE',
    },
    tierPercentage: Number,
    codePercentage: Number,
  },
}, {
  timestamps: true,
});

/**
 * Indexes
 */
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ retailerId: 1, status: 1 }); // Backward compatibility
OrderSchema.index({ orderId: 1 }, { unique: true });
OrderSchema.index({ status: 1, paymentStatus: 1 }); // Backward compatibility
OrderSchema.index({ masterStatus: 1, paymentStatus: 1 }); // NEW
OrderSchema.index({ createdAt: -1 });

// NEW: Indexes for sub-orders
OrderSchema.index({ 'subOrders.retailerId': 1, 'subOrders.status': 1 });
OrderSchema.index({ 'subOrders.retailerId': 1, createdAt: -1 });

/**
 * Pre-save Middleware
 */
OrderSchema.pre('save', function(next) {
  // Generate order ID if not exists
  if (!this.orderId) {
    this.orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

/**
 * Instance Methods
 */

// Update order status
OrderSchema.methods.updateStatus = async function(newStatus: OrderStatus, notes?: string): Promise<void> {
  // Handle both single-retailer (status + trackingInfo) and multi-retailer (masterStatus) orders
  if (this.masterStatus !== undefined) {
    // Multi-retailer order
    this.masterStatus = newStatus;
  } else {
    // Single-retailer order
    this.status = newStatus;
    if (this.trackingInfo) {
      this.trackingInfo.currentStatus = newStatus;
      this.trackingInfo.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        notes,
      });
    }
  }
  await this.save();
};

// Calculate total
OrderSchema.methods.calculateTotal = function(): number {
  return this.items.reduce((total, item) => total + item.subtotal, 0);
};

// NEW: Calculate master status from sub-orders
OrderSchema.methods.calculateMasterStatus = function(): OrderStatus {
  if (!this.subOrders || this.subOrders.length === 0) {
    // Backward compatibility: use old status field
    return this.status || OrderStatus.PENDING;
  }

  const statuses = this.subOrders.map(so => so.status);

  // If all delivered → DELIVERED
  if (statuses.every(s => s === OrderStatus.DELIVERED)) {
    return OrderStatus.DELIVERED;
  }

  // If any cancelled → CANCELLED (partial cancellation)
  if (statuses.some(s => s === OrderStatus.CANCELLED)) {
    return OrderStatus.CANCELLED;
  }

  // If all shipped or delivered → SHIPPED
  if (statuses.every(s => [OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(s))) {
    return OrderStatus.SHIPPED;
  }

  // If any confirmed → CONFIRMED
  if (statuses.some(s => s === OrderStatus.CONFIRMED)) {
    return OrderStatus.CONFIRMED;
  }

  return OrderStatus.PENDING;
};

// Cancel order
OrderSchema.methods.cancel = async function(reason?: string): Promise<void> {
  // Check status for both single and multi-retailer orders
  const currentStatus = this.masterStatus || this.status;
  if (currentStatus === OrderStatus.DELIVERED) {
    throw new Error('Cannot cancel delivered order');
  }
  await this.updateStatus(OrderStatus.CANCELLED, reason);
  this.paymentStatus = PaymentStatus.CANCELLED;
  await this.save();
};

// Mark as paid
OrderSchema.methods.markAsPaid = async function(): Promise<void> {
  this.paymentStatus = PaymentStatus.COMPLETED;
  await this.save();
};

/**
 * Static Methods
 */

// Find orders by customer
OrderSchema.statics.findByCustomer = function(customerId: mongoose.Types.ObjectId) {
  return this.find({ customerId })
    .populate('retailerId', 'profile.name store')
    .sort({ createdAt: -1 });
};

// Find orders by retailer
OrderSchema.statics.findByRetailer = function(retailerId: mongoose.Types.ObjectId, status?: OrderStatus) {
  const query: any = { retailerId };
  if (status) query.status = status;
  return this.find(query)
    .populate('customerId', 'profile.name profile.phone')
    .sort({ createdAt: -1 });
};

// Find pending orders
OrderSchema.statics.findPending = function() {
  return this.find({
    status: { $in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING] },
  })
    .populate('customerId retailerId')
    .sort({ createdAt: -1 });
};

// Get order statistics
OrderSchema.statics.getStatistics = async function(retailerId: mongoose.Types.ObjectId, dateRange?: { start: Date; end: Date }) {
  const match: any = { retailerId };
  if (dateRange) {
    match.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
      },
    },
  ]);
};

/**
 * Virtual fields
 */
OrderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

OrderSchema.virtual('canCancel').get(function() {
  // Only allow cancellation for PENDING and CONFIRMED orders
  const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];

  // Prevent cancellation ONLY if payment is already completed or refunded
  // Allow cancellation if payment is PENDING, FAILED, or CANCELLED
  const nonCancellablePaymentStatuses = [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED];

  return cancellableStatuses.includes(this.status) &&
         !nonCancellablePaymentStatuses.includes(this.paymentStatus);
});

OrderSchema.virtual('canReview').get(function() {
  // Only delivered orders can be reviewed
  return this.status === OrderStatus.DELIVERED;
});

/**
 * Create and export Order model
 */
const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
