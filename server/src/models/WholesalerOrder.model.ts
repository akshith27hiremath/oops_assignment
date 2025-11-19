import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * WholesalerOrder Model
 * Represents B2B orders from retailers to wholesalers
 */

export enum WholesalerOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum B2BPaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface IWholesalerOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  volumeDiscount: number; // Discount percentage applied
  subtotal: number; // After discount
}

export interface IB2BTrackingInfo {
  currentStatus: WholesalerOrderStatus;
  statusHistory: {
    status: WholesalerOrderStatus;
    timestamp: Date;
    notes?: string;
    updatedBy?: mongoose.Types.ObjectId;
  }[];
  estimatedDelivery?: Date;
  actualDelivery?: Date;
}

export interface IWholesalerOrder extends Document {
  orderNumber: string;
  retailerId: mongoose.Types.ObjectId;
  wholesalerId: mongoose.Types.ObjectId;
  items: IWholesalerOrderItem[];
  status: WholesalerOrderStatus;
  paymentStatus: B2BPaymentStatus;
  paymentDueDate?: Date;
  paymentCompletedAt?: Date;
  totalAmount: number;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingInfo: IB2BTrackingInfo;
  upiTransactionId?: mongoose.Types.ObjectId;
  notes?: string;
  invoiceUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  isPaymentOverdue: boolean;
  daysUntilDue: number;

  // Instance methods
  updateStatus(newStatus: WholesalerOrderStatus, notes?: string, updatedBy?: mongoose.Types.ObjectId): Promise<void>;
  calculateTotal(): number;
  cancel(reason?: string): Promise<void>;
  confirm(): Promise<void>;
  complete(): Promise<void>;
  markAsPaid(): Promise<void>;
}

// Wholesaler Order Item Schema
const WholesalerOrderItemSchema = new Schema<IWholesalerOrderItem>({
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
  volumeDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

// B2B Tracking Info Schema
const B2BTrackingInfoSchema = new Schema<IB2BTrackingInfo>({
  currentStatus: {
    type: String,
    enum: Object.values(WholesalerOrderStatus),
    required: true,
    default: WholesalerOrderStatus.PENDING,
  },
  statusHistory: [{
    status: {
      type: String,
      enum: Object.values(WholesalerOrderStatus),
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: String,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  estimatedDelivery: Date,
  actualDelivery: Date,
}, { _id: false });

// Wholesaler Order Schema
const WholesalerOrderSchema = new Schema<IWholesalerOrder>({
  orderNumber: {
    type: String,
    unique: true,
    index: true,
  },
  retailerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Retailer ID is required'],
    index: true,
  },
  wholesalerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Wholesaler ID is required'],
    index: true,
  },
  items: {
    type: [WholesalerOrderItemSchema],
    required: true,
    validate: [
      (v: IWholesalerOrderItem[]) => v.length > 0,
      'Order must have at least one item',
    ],
  },
  status: {
    type: String,
    enum: Object.values(WholesalerOrderStatus),
    required: true,
    default: WholesalerOrderStatus.PENDING,
    index: true,
  },
  paymentStatus: {
    type: String,
    enum: Object.values(B2BPaymentStatus),
    required: true,
    default: B2BPaymentStatus.PENDING,
    index: true,
  },
  paymentDueDate: {
    type: Date,
    index: true,
  },
  paymentCompletedAt: {
    type: Date,
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
  trackingInfo: {
    type: B2BTrackingInfoSchema,
    required: true,
    default: () => ({
      currentStatus: WholesalerOrderStatus.PENDING,
      statusHistory: [{
        status: WholesalerOrderStatus.PENDING,
        timestamp: new Date(),
      }],
    }),
  },
  upiTransactionId: {
    type: Schema.Types.ObjectId,
    ref: 'UPITransaction',
  },
  notes: String,
  invoiceUrl: String,
}, {
  timestamps: true,
});

/**
 * Indexes
 */
WholesalerOrderSchema.index({ retailerId: 1, createdAt: -1 });
WholesalerOrderSchema.index({ wholesalerId: 1, status: 1 });
WholesalerOrderSchema.index({ orderNumber: 1 }, { unique: true });
WholesalerOrderSchema.index({ status: 1, paymentStatus: 1 });
WholesalerOrderSchema.index({ paymentDueDate: 1, paymentStatus: 1 });
WholesalerOrderSchema.index({ createdAt: -1 });

/**
 * Virtual Properties
 */

// Check if payment is overdue
WholesalerOrderSchema.virtual('isPaymentOverdue').get(function() {
  if (!this.paymentDueDate || this.paymentStatus === B2BPaymentStatus.COMPLETED) {
    return false;
  }
  return new Date() > this.paymentDueDate;
});

// Days until payment due (negative if overdue)
WholesalerOrderSchema.virtual('daysUntilDue').get(function() {
  if (!this.paymentDueDate || this.paymentStatus === B2BPaymentStatus.COMPLETED) {
    return null;
  }
  const now = new Date();
  const diffTime = this.paymentDueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

/**
 * Pre-save Middleware
 */
WholesalerOrderSchema.pre('save', function(next) {
  // Generate order number if not exists
  if (!this.orderNumber) {
    this.orderNumber = `B2B-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  // Set payment due date on creation (30 days from order date)
  if (this.isNew && !this.paymentDueDate) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days net terms
    this.paymentDueDate = dueDate;
  }

  next();
});

/**
 * Instance Methods
 */

// Update order status
WholesalerOrderSchema.methods.updateStatus = async function(
  newStatus: WholesalerOrderStatus,
  notes?: string,
  updatedBy?: mongoose.Types.ObjectId
): Promise<void> {
  this.status = newStatus;
  this.trackingInfo.currentStatus = newStatus;
  this.trackingInfo.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    notes,
    updatedBy,
  });

  // Set actual delivery date when delivered
  if (newStatus === WholesalerOrderStatus.DELIVERED && !this.trackingInfo.actualDelivery) {
    this.trackingInfo.actualDelivery = new Date();
  }

  await this.save();
};

// Calculate total
WholesalerOrderSchema.methods.calculateTotal = function(): number {
  return this.items.reduce((total, item) => total + item.subtotal, 0);
};

// Cancel order
WholesalerOrderSchema.methods.cancel = async function(reason?: string): Promise<void> {
  if (this.status === WholesalerOrderStatus.DELIVERED || this.status === WholesalerOrderStatus.COMPLETED) {
    throw new Error('Cannot cancel delivered or completed order');
  }
  await this.updateStatus(WholesalerOrderStatus.CANCELLED, reason);
  this.paymentStatus = B2BPaymentStatus.REFUNDED;
  await this.save();
};

// Confirm order (wholesaler accepts)
WholesalerOrderSchema.methods.confirm = async function(): Promise<void> {
  if (this.status !== WholesalerOrderStatus.PENDING) {
    throw new Error('Can only confirm pending orders');
  }
  await this.updateStatus(WholesalerOrderStatus.CONFIRMED, 'Order confirmed by wholesaler');
};

// Complete order (inventory transferred)
WholesalerOrderSchema.methods.complete = async function(): Promise<void> {
  if (this.status !== WholesalerOrderStatus.DELIVERED) {
    throw new Error('Can only complete delivered orders');
  }
  await this.updateStatus(WholesalerOrderStatus.COMPLETED, 'Order completed and inventory transferred');
};

// Mark as paid
WholesalerOrderSchema.methods.markAsPaid = async function(): Promise<void> {
  if (this.paymentStatus === B2BPaymentStatus.COMPLETED) {
    throw new Error('Order is already paid');
  }
  this.paymentStatus = B2BPaymentStatus.COMPLETED;
  this.paymentCompletedAt = new Date();
  await this.save();
};

/**
 * Static Methods
 */

// Find orders by retailer
WholesalerOrderSchema.statics.findByRetailer = function(
  retailerId: mongoose.Types.ObjectId,
  status?: WholesalerOrderStatus
) {
  const query: any = { retailerId };
  if (status) query.status = status;
  return this.find(query)
    .populate('wholesalerId', 'profile.name businessName')
    .populate('items.productId', 'name images unit')
    .sort({ createdAt: -1 });
};

// Find orders by wholesaler
WholesalerOrderSchema.statics.findByWholesaler = function(
  wholesalerId: mongoose.Types.ObjectId,
  status?: WholesalerOrderStatus
) {
  const query: any = { wholesalerId };
  if (status) query.status = status;
  return this.find(query)
    .populate('retailerId', 'profile.name store.name store.address')
    .populate('items.productId', 'name images unit')
    .sort({ createdAt: -1 });
};

// Find pending orders for wholesaler
WholesalerOrderSchema.statics.findPendingForWholesaler = function(wholesalerId: mongoose.Types.ObjectId) {
  return this.find({
    wholesalerId,
    status: WholesalerOrderStatus.PENDING,
  })
    .populate('retailerId', 'profile.name store.name')
    .populate('items.productId', 'name')
    .sort({ createdAt: -1 });
};

// Get statistics for wholesaler
WholesalerOrderSchema.statics.getStatistics = async function(
  wholesalerId: mongoose.Types.ObjectId,
  dateRange?: { start: Date; end: Date }
) {
  const match: any = { wholesalerId };
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

// Get total revenue for wholesaler
WholesalerOrderSchema.statics.getTotalRevenue = async function(
  wholesalerId: mongoose.Types.ObjectId,
  dateRange?: { start: Date; end: Date }
) {
  const match: any = {
    wholesalerId,
    status: { $in: [WholesalerOrderStatus.DELIVERED, WholesalerOrderStatus.COMPLETED] },
    paymentStatus: B2BPaymentStatus.COMPLETED,
  };

  if (dateRange) {
    match.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  return result[0] || { totalRevenue: 0, orderCount: 0 };
};

/**
 * Virtual fields
 */
WholesalerOrderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

WholesalerOrderSchema.virtual('canCancel').get(function() {
  return this.status === WholesalerOrderStatus.PENDING;
});

WholesalerOrderSchema.virtual('canConfirm').get(function() {
  return this.status === WholesalerOrderStatus.PENDING;
});

WholesalerOrderSchema.virtual('canComplete').get(function() {
  return this.status === WholesalerOrderStatus.DELIVERED;
});

/**
 * Create and export WholesalerOrder model
 */
const WholesalerOrder: Model<IWholesalerOrder> = mongoose.model<IWholesalerOrder>(
  'WholesalerOrder',
  WholesalerOrderSchema
);

export default WholesalerOrder;
