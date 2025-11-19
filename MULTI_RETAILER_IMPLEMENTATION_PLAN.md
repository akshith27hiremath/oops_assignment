# Multi-Retailer Order System - Implementation Plan (Option B)

## Executive Summary

Transform the single-retailer order system into a multi-retailer system that allows customers to order from multiple retailers in a single checkout, while maintaining all current features:
- ✅ Product-level discounts
- ✅ Tier/code discounts
- ✅ Notification system
- ✅ Data integrity
- ✅ Retailer revenue tracking

---

## Core Architecture Change

### Current: One Order = One Retailer
```
Order {
  orderId: "ORD-123",
  customerId: ObjectId,
  retailerId: ObjectId,  ← Single retailer
  items: [...],          ← All items from same retailer
  totalAmount: 150,
  discountBreakdown: {...}
}
```

### New: One Order = Multiple Sub-Orders
```
Order {
  orderId: "ORD-123",           // Master order ID (customer-facing)
  customerId: ObjectId,
  subOrders: [                  // ← One sub-order per retailer
    {
      subOrderId: "ORD-123-R1", // Retailer-facing order ID
      retailerId: ObjectId,
      items: [...],             // Items from this retailer only
      subtotal: 100,
      productDiscounts: 10,
      tierCodeDiscount: 4.5,    // Proportional share
      total: 85.5,
      status: "PENDING",
      trackingInfo: {...}
    },
    {
      subOrderId: "ORD-123-R2",
      retailerId: ObjectId,
      items: [...],
      subtotal: 60,
      productDiscounts: 5,
      tierCodeDiscount: 2.75,
      total: 52.25,
      status: "PENDING",
      trackingInfo: {...}
    }
  ],
  totalAmount: 137.75,          // Sum of all sub-orders
  masterStatus: "PENDING",      // Aggregate status
  discountBreakdown: {          // Global discount tracking
    subtotal: 160,
    productDiscountSavings: 15,
    subtotalAfterProductDiscounts: 145,
    tierDiscount: 7.25,
    codeDiscount: 0,
    finalDiscount: 7.25,
    discountType: "TIER"
  }
}
```

---

## Phase 1: Schema Updates

### 1.1 Order Model Changes

**File**: `server/src/models/Order.model.ts`

```typescript
// NEW: Sub-order interface
export interface ISubOrder {
  subOrderId: string;           // E.g., "ORD-123-R1"
  retailerId: mongoose.Types.ObjectId;
  items: IOrderItem[];

  // Pricing breakdown for this retailer
  subtotalBeforeProductDiscounts: number;
  productDiscountSavings: number;
  subtotalAfterProductDiscounts: number;
  tierCodeDiscountShare: number; // Proportional share of master discount
  totalAmount: number;           // Final amount for this retailer

  // Status tracking
  status: OrderStatus;
  trackingInfo: ITrackingInfo;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// UPDATED: Order interface
export interface IOrder extends Document {
  orderId: string;              // Master order ID
  customerId: mongoose.Types.ObjectId;

  // REMOVED: retailerId (replaced by subOrders)
  // REMOVED: items (moved to subOrders)
  // REMOVED: status (replaced by masterStatus)

  subOrders: ISubOrder[];       // ← NEW: Array of sub-orders

  orderType: OrderType;
  masterStatus: OrderStatus;    // ← NEW: Aggregate status
  paymentStatus: PaymentStatus;
  totalAmount: number;          // Sum of all sub-order totals

  deliveryAddress: { ... };     // Shared delivery address
  scheduledDate?: Date;
  upiTransactionId?: mongoose.Types.ObjectId;
  notes?: string;

  // Discount tracking (master level)
  appliedDiscountCode?: mongoose.Types.ObjectId;
  loyaltyTierAtPurchase?: string;
  discountBreakdown?: IDiscountBreakdown;  // Global discount breakdown

  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 Schema Definition

```typescript
// Sub-order Schema
const SubOrderSchema = new Schema<ISubOrder>({
  subOrderId: {
    type: String,
    required: true,
  },
  retailerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [OrderItemSchema],

  // Pricing
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

  // Status
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    required: true,
    default: OrderStatus.PENDING,
  },
  trackingInfo: TrackingInfoSchema,

}, { timestamps: true });

// Updated Order Schema
const OrderSchema = new Schema<IOrder>({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  subOrders: [SubOrderSchema],  // ← NEW

  orderType: {
    type: String,
    enum: Object.values(OrderType),
    required: true,
  },
  masterStatus: {                // ← NEW (renamed from status)
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
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },

  deliveryAddress: { ... },
  scheduledDate: Date,
  upiTransactionId: {
    type: Schema.Types.ObjectId,
    ref: 'UPITransaction',
  },
  notes: String,

  // Discount tracking
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

// NEW: Method to calculate master status
OrderSchema.methods.calculateMasterStatus = function(): OrderStatus {
  if (this.subOrders.length === 0) return OrderStatus.PENDING;

  const statuses = this.subOrders.map(so => so.status);

  // If all delivered → DELIVERED
  if (statuses.every(s => s === OrderStatus.DELIVERED)) {
    return OrderStatus.DELIVERED;
  }

  // If any cancelled → CANCELLED (partial)
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
```

### 1.3 Indexes

```typescript
// Existing indexes still work
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ orderId: 1 }, { unique: true });
OrderSchema.index({ masterStatus: 1, paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });

// NEW: Index on sub-order retailerId for fast retailer queries
OrderSchema.index({ 'subOrders.retailerId': 1, 'subOrders.status': 1 });
OrderSchema.index({ 'subOrders.retailerId': 1, createdAt: -1 });
```

---

## Phase 2: Service Layer Updates

### 2.1 Order Creation Logic

**File**: `server/src/services/order.service.ts`

```typescript
async createOrder(data: CreateOrderData) {
  try {
    const { customerId, items, deliveryAddress, notes, discountCodeId } = data;

    // STEP 1: Group items by retailer
    const itemsByRetailer = new Map<string, {
      retailerId: mongoose.Types.ObjectId;
      items: IOrderItem[];
      subtotalBeforeProductDiscounts: number;
      subtotalAfterProductDiscounts: number;
      productDiscountSavings: number;
    }>();

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} not found or inactive`);
      }

      // Find retailer inventory
      const inventoryResult = await Inventory.aggregate([
        {
          $match: {
            productId: new mongoose.Types.ObjectId(item.productId),
            availability: true,
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'ownerId',
            foreignField: '_id',
            as: 'owner'
          }
        },
        { $unwind: '$owner' },
        {
          $match: {
            'owner.userType': 'RETAILER'
          }
        },
        { $limit: 1 }
      ]);

      if (!inventoryResult || inventoryResult.length === 0) {
        throw new Error(`Product "${product.name}" is not available from retailers`);
      }

      const inventoryData = inventoryResult[0];
      const inventory = await Inventory.findById(inventoryData._id);
      if (!inventory) {
        throw new Error(`Product "${product.name}" inventory not found`);
      }

      const retailerId = inventory.ownerId._id;
      const retailerIdStr = retailerId.toString();

      // Check stock
      const availableStock = inventory.currentStock - inventory.reservedStock;
      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${availableStock}`);
      }

      // Reserve stock
      await inventory.reserveStock(item.quantity);

      // Calculate pricing with product discount
      const basePrice = inventory.sellingPrice;
      let unitPrice = basePrice;
      let productDiscountPercentage = 0;

      if (inventory.productDiscount?.isActive && new Date(inventory.productDiscount.validUntil) > new Date()) {
        productDiscountPercentage = inventory.productDiscount.discountPercentage;
        unitPrice = basePrice * (1 - productDiscountPercentage / 100);
        unitPrice = Math.round(unitPrice * 100) / 100;
      }

      const itemSubtotalBefore = basePrice * item.quantity;
      const itemSubtotal = unitPrice * item.quantity;
      const itemProductDiscount = itemSubtotalBefore - itemSubtotal;

      // Build order item
      const orderItem: IOrderItem = {
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        originalUnitPrice: productDiscountPercentage > 0 ? basePrice : undefined,
        productDiscountPercentage: productDiscountPercentage > 0 ? productDiscountPercentage : undefined,
        subtotal: itemSubtotal,
        discounts: 0, // Tier/code discount will be added later
      };

      // Group by retailer
      if (!itemsByRetailer.has(retailerIdStr)) {
        itemsByRetailer.set(retailerIdStr, {
          retailerId,
          items: [],
          subtotalBeforeProductDiscounts: 0,
          subtotalAfterProductDiscounts: 0,
          productDiscountSavings: 0,
        });
      }

      const retailerGroup = itemsByRetailer.get(retailerIdStr)!;
      retailerGroup.items.push(orderItem);
      retailerGroup.subtotalBeforeProductDiscounts += itemSubtotalBefore;
      retailerGroup.subtotalAfterProductDiscounts += itemSubtotal;
      retailerGroup.productDiscountSavings += itemProductDiscount;
    }

    // STEP 2: Calculate global discount (tier/code)
    const globalSubtotalBefore = Array.from(itemsByRetailer.values())
      .reduce((sum, r) => sum + r.subtotalBeforeProductDiscounts, 0);
    const globalSubtotalAfter = Array.from(itemsByRetailer.values())
      .reduce((sum, r) => sum + r.subtotalAfterProductDiscounts, 0);
    const globalProductSavings = Array.from(itemsByRetailer.values())
      .reduce((sum, r) => sum + r.productDiscountSavings, 0);

    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate tier/code discount on global subtotal (after product discounts)
    const discountCalc = await discountService.calculateBestDiscount(
      customerId,
      globalSubtotalAfter,
      discountCodeId
    );

    // STEP 3: Distribute tier/code discount proportionally across retailers
    const subOrders: ISubOrder[] = [];
    const masterOrderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    let subOrderIndex = 1;
    for (const [retailerIdStr, retailerData] of itemsByRetailer) {
      // Calculate proportional share of tier/code discount
      const proportion = retailerData.subtotalAfterProductDiscounts / globalSubtotalAfter;
      const tierCodeDiscountShare = Math.round(discountCalc.finalDiscount * proportion * 100) / 100;

      // Apply tier/code discount to items in this sub-order
      const itemsWithDiscount = discountService.applyDiscountToItems(
        retailerData.items,
        tierCodeDiscountShare
      );

      const subOrderTotal = retailerData.subtotalAfterProductDiscounts - tierCodeDiscountShare;

      subOrders.push({
        subOrderId: `${masterOrderId}-R${subOrderIndex}`,
        retailerId: retailerData.retailerId,
        items: itemsWithDiscount,
        subtotalBeforeProductDiscounts: retailerData.subtotalBeforeProductDiscounts,
        productDiscountSavings: retailerData.productDiscountSavings,
        subtotalAfterProductDiscounts: retailerData.subtotalAfterProductDiscounts,
        tierCodeDiscountShare,
        totalAmount: Math.round(subOrderTotal * 100) / 100,
        status: OrderStatus.PENDING,
        trackingInfo: {
          currentStatus: OrderStatus.PENDING,
          statusHistory: [{
            status: OrderStatus.PENDING,
            timestamp: new Date(),
          }],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      subOrderIndex++;
    }

    // STEP 4: Create master order
    const masterTotalAmount = subOrders.reduce((sum, so) => sum + so.totalAmount, 0);

    const order = new Order({
      orderId: masterOrderId,
      customerId: new mongoose.Types.ObjectId(customerId),
      subOrders,
      orderType: 'ONLINE',
      masterStatus: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      totalAmount: Math.round(masterTotalAmount * 100) / 100,
      deliveryAddress: {
        ...deliveryAddress,
        country: deliveryAddress.country || 'India',
      },
      notes,
      appliedDiscountCode: discountCalc.appliedCode?._id,
      loyaltyTierAtPurchase: await customer.calculateLoyaltyTier(),
      discountBreakdown: {
        subtotal: globalSubtotalBefore,
        productDiscountSavings: globalProductSavings,
        subtotalAfterProductDiscounts: globalSubtotalAfter,
        tierDiscount: discountCalc.tierDiscount,
        codeDiscount: discountCalc.codeDiscount,
        finalDiscount: discountCalc.finalDiscount,
        discountType: discountCalc.discountType,
        tierPercentage: discountCalc.tierPercentage,
        codePercentage: discountCalc.codePercentage,
      },
    });

    await order.save();

    // STEP 5: Add to customer order history
    await customer.updateOne({
      $push: { orderHistory: order._id }
    });

    // STEP 6: Increment discount code usage
    if (discountCalc.appliedCode && discountCalc.discountType === 'CODE') {
      await discountCalc.appliedCode.incrementUsage(customerId);
    }

    // STEP 7: Send notifications to each retailer
    const customerName = customer.profile?.name || customer.email;

    for (const subOrder of order.subOrders) {
      try {
        await notificationService.notifyNewOrderForRetailer(
          subOrder.retailerId,
          order._id.toString(),
          subOrder.subOrderId, // Send sub-order ID to retailer
          customerName,
          subOrder.totalAmount  // Send retailer-specific total
        );
        logger.info(`📧 Notification sent to retailer ${subOrder.retailerId} for sub-order ${subOrder.subOrderId}`);
      } catch (notifError) {
        logger.error(`❌ Failed to send notification to retailer ${subOrder.retailerId}:`, notifError);
      }
    }

    // STEP 8: Log creation
    logger.info(`✅ Multi-retailer order created: ${order.orderId}`);
    logger.info(`   📦 Sub-orders: ${subOrders.length}`);
    logger.info(`   💰 Pricing breakdown:`);
    logger.info(`      Original subtotal: ₹${globalSubtotalBefore.toFixed(2)}`);
    logger.info(`      Product discounts: -₹${globalProductSavings.toFixed(2)}`);
    logger.info(`      After product discounts: ₹${globalSubtotalAfter.toFixed(2)}`);
    logger.info(`      ${discountCalc.discountType} discount: -₹${discountCalc.finalDiscount.toFixed(2)}`);
    logger.info(`      Final total: ₹${masterTotalAmount.toFixed(2)}`);

    for (const subOrder of subOrders) {
      logger.info(`      Sub-order ${subOrder.subOrderId}: ₹${subOrder.totalAmount.toFixed(2)}`);
    }

    return {
      success: true,
      data: { order },
      message: 'Order created successfully',
    };
  } catch (error: any) {
    logger.error(`❌ Order creation failed: ${error.message}`);
    throw error;
  }
}
```

### 2.2 Get Orders (Customer View)

```typescript
async getCustomerOrders(customerId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const orders = await Order.find({ customerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'subOrders.retailerId',
      select: 'profile.name businessName profile.location',
    })
    .populate({
      path: 'subOrders.items.productId',
      select: 'name images unit',
    });

  const total = await Order.countDocuments({ customerId });

  return {
    success: true,
    data: {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  };
}
```

### 2.3 Get Orders (Retailer View)

```typescript
async getRetailerOrders(retailerId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  // Find orders that have sub-orders for this retailer
  const orders = await Order.find({
    'subOrders.retailerId': new mongoose.Types.ObjectId(retailerId),
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('customerId', 'profile.name email profile.phone')
    .populate({
      path: 'subOrders.items.productId',
      select: 'name images unit',
    });

  // Filter to only show the retailer's sub-orders
  const filteredOrders = orders.map(order => {
    const orderObj = order.toObject();
    return {
      ...orderObj,
      // Only show sub-orders belonging to this retailer
      subOrders: orderObj.subOrders.filter(
        so => so.retailerId.toString() === retailerId
      ),
    };
  });

  const total = await Order.countDocuments({
    'subOrders.retailerId': new mongoose.Types.ObjectId(retailerId),
  });

  return {
    success: true,
    data: {
      orders: filteredOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  };
}
```

### 2.4 Update Sub-Order Status

```typescript
async updateSubOrderStatus(
  orderId: string,
  subOrderId: string,
  retailerId: string,
  status: OrderStatus,
  notes?: string
) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  // Find the sub-order
  const subOrder = order.subOrders.find(
    so => so.subOrderId === subOrderId && so.retailerId.toString() === retailerId
  );

  if (!subOrder) {
    throw new Error('Sub-order not found or access denied');
  }

  // Update sub-order status
  subOrder.status = status;
  subOrder.trackingInfo.statusHistory.push({
    status,
    timestamp: new Date(),
    notes,
  });
  subOrder.trackingInfo.currentStatus = status;
  subOrder.updatedAt = new Date();

  // Recalculate master status
  order.masterStatus = order.calculateMasterStatus();

  await order.save();

  // Notify customer of status change
  await notificationService.notifyOrderStatusUpdate(
    order.customerId,
    order._id.toString(),
    subOrderId,
    status
  );

  logger.info(`✅ Sub-order ${subOrderId} status updated to ${status}`);

  return {
    success: true,
    data: { order },
    message: 'Sub-order status updated successfully',
  };
}
```

---

## Phase 3: Controller Updates

### 3.1 Create Order Controller

**File**: `server/src/controllers/order.controller.ts`

```typescript
export const createOrder = async (req: Request, res: Response) => {
  try {
    const customerId = req.user._id;
    const { items, deliveryAddress, paymentMethod, notes, discountCodeId } = req.body;

    // Validate input
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    // Create order (now supports multi-retailer)
    const result = await orderService.createOrder({
      customerId,
      items,
      deliveryAddress,
      notes,
      discountCodeId,
    });

    const order = result.data.order;

    // Send customer notification
    try {
      await notificationService.notifyOrderPlaced(
        customerId,
        order._id.toString(),
        order.orderId
      );
      logger.info(`✅ Customer notification sent`);
    } catch (notifError) {
      logger.error(`❌ Failed to send customer notification:`, notifError);
    }

    // Retailer notifications already sent in service layer

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Order creation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create order',
    });
  }
};
```

### 3.2 Get Retailer Orders Controller

```typescript
export const getRetailerOrders = async (req: Request, res: Response) => {
  try {
    const retailerId = req.user._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as OrderStatus | undefined;

    const result = await orderService.getRetailerOrders(retailerId, page, limit, status);

    res.json(result);
  } catch (error: any) {
    logger.error('Get retailer orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders',
    });
  }
};
```

---

## Phase 4: Frontend Updates

### 4.1 Remove Cart Validation (Allow Multi-Retailer)

**File**: `client/src/stores/cartStore.ts`

```typescript
// Current addItem - NO CHANGES NEEDED!
// Already allows items from different retailers
addItem: (product: Product, quantity = 1) => {
  const existingItem = get().getItem(product._id);

  if (existingItem) {
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === product._id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ),
    }));
    toast.success(`Updated ${product.name} quantity in cart`);
  } else {
    set((state) => ({
      items: [
        ...state.items,
        {
          productId: product._id,
          product,
          quantity,
          addedAt: new Date(),
        },
      ],
    }));
    toast.success(`Added ${product.name} to cart`);
  }

  get().openCart();
}
```

### 4.2 Cart UI - Show Retailer Grouping

**File**: `client/src/components/cart/CartDrawer.tsx`

```typescript
const CartDrawer: React.FC = () => {
  const { items, isOpen, closeCart, clearCart } = useCartStore();

  // Group items by retailer
  const itemsByRetailer = items.reduce((groups, item) => {
    const retailerId = item.product.retailerInventories?.[0]?.ownerId || 'unknown';
    if (!groups[retailerId]) {
      groups[retailerId] = [];
    }
    groups[retailerId].push(item);
    return groups;
  }, {} as Record<string, CartItem[]>);

  return (
    <>
      {/* ... existing backdrop ... */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 ...">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 ...">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Shopping Cart ({items.length})
          </h2>
          {/* ... close button ... */}
        </div>

        {/* Cart Items - Grouped by Retailer */}
        <div className="flex-1 overflow-y-auto px-4">
          {Object.entries(itemsByRetailer).map(([retailerId, retailerItems]) => (
            <div key={retailerId} className="mb-6">
              {/* Retailer Header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {/* Get retailer name from first item */}
                  {retailerItems[0].product.retailerInventories?.[0]?.businessName || 'Retailer'}
                </span>
                <span className="text-xs text-gray-500">
                  ({retailerItems.length} {retailerItems.length === 1 ? 'item' : 'items'})
                </span>
              </div>

              {/* Items from this retailer */}
              {retailerItems.map((item) => (
                <CartItem key={item.productId} item={item} />
              ))}
            </div>
          ))}

          {/* Clear Cart Button */}
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="w-full text-sm text-red-600 hover:text-red-700 py-3 mt-2"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Summary */}
        {items.length > 0 && <CartSummary />}
      </div>
    </>
  );
};
```

### 4.3 Order History - Show Sub-Orders

**File**: `client/src/pages/customer/OrderHistory.tsx`

```typescript
const OrderHistory: React.FC = () => {
  // ... existing state ...

  return (
    <CustomerLayout>
      {/* ... existing header ... */}

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {/* Master Order Header */}
            <div className="flex justify-between items-start mb-4 pb-4 border-b dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Order #{order.orderId}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {order.subOrders.length} {order.subOrders.length === 1 ? 'retailer' : 'retailers'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ₹{order.totalAmount.toFixed(2)}
                </p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${getStatusColor(order.masterStatus)}`}>
                  {order.masterStatus}
                </span>
              </div>
            </div>

            {/* Sub-Orders */}
            <div className="space-y-4">
              {order.subOrders.map((subOrder) => (
                <div key={subOrder.subOrderId} className="border dark:border-gray-700 rounded-lg p-4">
                  {/* Sub-Order Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {subOrder.retailerId.businessName || 'Retailer'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        ₹{subOrder.totalAmount.toFixed(2)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(subOrder.status)}`}>
                        {subOrder.status}
                      </span>
                    </div>
                  </div>

                  {/* Sub-Order Items */}
                  <div className="space-y-2">
                    {subOrder.items.map((item) => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          ₹{item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Sub-Order Tracking */}
                  {subOrder.trackingInfo && (
                    <div className="mt-3 pt-3 border-t dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Last updated: {new Date(subOrder.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Discount Breakdown */}
            {order.discountBreakdown && order.discountBreakdown.finalDiscount > 0 && (
              <div className="mt-4 pt-4 border-t dark:border-gray-700">
                <p className="text-sm text-green-600 dark:text-green-400">
                  💰 You saved ₹{(order.discountBreakdown.productDiscountSavings + order.discountBreakdown.finalDiscount).toFixed(2)} on this order!
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </CustomerLayout>
  );
};
```

---

## Phase 5: Notification Updates

### 5.1 Update Notification Message

**File**: `server/src/services/notification.service.ts`

```typescript
async notifyNewOrderForRetailer(
  retailerId: string | mongoose.Types.ObjectId,
  orderId: string,
  subOrderId: string, // ← Changed from orderNumber
  customerName: string,
  totalAmount: number
): Promise<INotification> {
  return this.createNotification({
    userId: retailerId,
    type: NotificationType.ORDER,
    priority: NotificationPriority.HIGH,
    title: 'New Order Received',
    message: `${customerName} placed an order #${subOrderId} for ₹${totalAmount.toFixed(2)}.`, // ← Show sub-order ID
    icon: '🛒',
    link: `/retailer/orders`,
    metadata: { orderId, subOrderId, customerName, totalAmount }, // ← Include subOrderId
  });
}
```

---

## Phase 6: Data Migration

### 6.1 Migration Script

**File**: `server/src/scripts/migrate-to-multi-retailer.ts`

```typescript
import mongoose from 'mongoose';
import Order from '../models/Order.model';
import { logger } from '../utils/logger';

async function migrateToMultiRetailer() {
  try {
    logger.info('🔄 Starting migration to multi-retailer orders...');

    // Find all orders with old schema
    const oldOrders = await Order.find({
      retailerId: { $exists: true },
      subOrders: { $exists: false },
    });

    logger.info(`📦 Found ${oldOrders.length} orders to migrate`);

    for (const order of oldOrders) {
      const orderObj = order.toObject();

      // Create sub-order from old order data
      const subOrder = {
        subOrderId: `${orderObj.orderId}-R1`,
        retailerId: orderObj.retailerId,
        items: orderObj.items || [],
        subtotalBeforeProductDiscounts: orderObj.discountBreakdown?.subtotal || orderObj.totalAmount,
        productDiscountSavings: orderObj.discountBreakdown?.productDiscountSavings || 0,
        subtotalAfterProductDiscounts: orderObj.discountBreakdown?.subtotalAfterProductDiscounts || orderObj.totalAmount,
        tierCodeDiscountShare: orderObj.discountBreakdown?.finalDiscount || 0,
        totalAmount: orderObj.totalAmount,
        status: orderObj.status,
        trackingInfo: orderObj.trackingInfo || {
          currentStatus: orderObj.status,
          statusHistory: [{
            status: orderObj.status,
            timestamp: orderObj.createdAt,
          }],
        },
        createdAt: orderObj.createdAt,
        updatedAt: orderObj.updatedAt,
      };

      // Update order to new schema
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            subOrders: [subOrder],
            masterStatus: orderObj.status,
          },
          $unset: {
            retailerId: '',
            items: '',
            status: '',
            trackingInfo: '',
          },
        }
      );

      logger.info(`✅ Migrated order ${orderObj.orderId}`);
    }

    logger.info(`🎉 Migration completed! ${oldOrders.length} orders migrated.`);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => {
    logger.info('📡 Connected to MongoDB');
    return migrateToMultiRetailer();
  })
  .then(() => {
    logger.info('✨ Migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('💥 Migration failed:', error);
    process.exit(1);
  });
```

---

## Phase 7: Testing Strategy

### 7.1 Unit Tests

**Test discount distribution**:
```typescript
describe('Multi-Retailer Discount Distribution', () => {
  it('should distribute tier discount proportionally across retailers', () => {
    // Retailer A: ₹100 (50%)
    // Retailer B: ₹100 (50%)
    // Total: ₹200
    // Tier discount: ₹10 (5%)

    // Expected:
    // Retailer A discount: ₹5
    // Retailer B discount: ₹5
  });

  it('should handle uneven distribution with rounding', () => {
    // Retailer A: ₹60 (40%)
    // Retailer B: ₹90 (60%)
    // Total: ₹150
    // Tier discount: ₹7.50 (5%)

    // Expected:
    // Retailer A discount: ₹3.00
    // Retailer B discount: ₹4.50
  });
});
```

### 7.2 Integration Tests

```typescript
describe('Multi-Retailer Order Creation', () => {
  it('should create order with items from 2 retailers', async () => {
    const orderData = {
      customerId: customer._id,
      items: [
        { productId: milkFromRetailer1._id, quantity: 2 }, // ₹100
        { productId: breadFromRetailer2._id, quantity: 1 }, // ₹50
      ],
      deliveryAddress: { ... },
    };

    const result = await orderService.createOrder(orderData);

    expect(result.data.order.subOrders).toHaveLength(2);
    expect(result.data.order.subOrders[0].retailerId).toEqual(retailer1._id);
    expect(result.data.order.subOrders[1].retailerId).toEqual(retailer2._id);
  });

  it('should send notifications to both retailers', async () => {
    // ... create order ...

    const retailer1Notifications = await Notification.find({ userId: retailer1._id });
    const retailer2Notifications = await Notification.find({ userId: retailer2._id });

    expect(retailer1Notifications).toHaveLength(1);
    expect(retailer2Notifications).toHaveLength(1);
  });
});
```

### 7.3 End-to-End Test Scenarios

**Scenario 1: Simple multi-retailer order**
```
1. Customer adds Fresh Milk from Dairy Delights (₹60, 20% off → ₹48)
2. Customer adds Bread from Baker's Corner (₹50)
3. Cart total: ₹98
4. Customer is Silver tier (5%) → ₹4.90 discount
5. Discount split:
   - Dairy Delights: ₹2.40 (48/98 * 4.90)
   - Baker's Corner: ₹2.50 (50/98 * 4.90)
6. Final totals:
   - Dairy Delights: ₹45.60
   - Baker's Corner: ₹47.50
   - Grand total: ₹93.10
7. Both retailers receive notifications
```

**Scenario 2: Three retailers with code discount**
```
1. Customer adds items from 3 retailers (total ₹300 after product discounts)
2. Applies code "SAVE20" (20% off) → ₹60 discount
3. Discount distributed proportionally
4. All 3 retailers get notifications with their sub-order totals
```

---

## Implementation Timeline

### Week 1: Schema & Migration
- [ ] Update Order model schema
- [ ] Create migration script
- [ ] Test migration on development database
- [ ] Deploy migration to production

### Week 2: Backend Services
- [ ] Update orderService.createOrder()
- [ ] Update orderService.getCustomerOrders()
- [ ] Update orderService.getRetailerOrders()
- [ ] Add updateSubOrderStatus()
- [ ] Update notification service

### Week 3: Controllers & Routes
- [ ] Update order controllers
- [ ] Test API endpoints
- [ ] Update API documentation

### Week 4: Frontend Updates
- [ ] Update cart UI (retailer grouping)
- [ ] Update checkout page
- [ ] Update order history page
- [ ] Update retailer order management

### Week 5: Testing & Deployment
- [ ] Unit tests
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Production deployment
- [ ] Monitor and fix issues

---

## Rollback Plan

If issues arise:

1. **Immediate**: Feature flag to disable multi-retailer (force single retailer validation)
2. **Short-term**: Revert to previous version using git
3. **Long-term**: Run reverse migration to restore old schema

---

## Success Metrics

After implementation:

1. **Functional**:
   - ✅ Orders with items from multiple retailers can be placed
   - ✅ Each retailer receives notification for their sub-order
   - ✅ Discounts distributed correctly
   - ✅ Order tracking works per sub-order

2. **Data Integrity**:
   - ✅ Total amounts match across sub-orders and master order
   - ✅ Discount calculations remain accurate
   - ✅ No revenue loss for retailers

3. **User Experience**:
   - ✅ Customers can mix retailers in cart
   - ✅ Clear visibility of which items are from which retailer
   - ✅ Tracking per retailer delivery

---

## Conclusion

This plan maintains **100% integrity** of:
- ✅ Product-level discounts (applied per item)
- ✅ Tier/code discounts (distributed proportionally)
- ✅ Notifications (one per retailer per sub-order)
- ✅ Data tracking (complete breakdown stored)
- ✅ Retailer revenue (no mixing of funds)

The architecture is **scalable**, **maintainable**, and **backwards compatible** with proper migration.
