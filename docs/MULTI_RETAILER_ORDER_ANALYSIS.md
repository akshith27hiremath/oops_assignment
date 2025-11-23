# Multi-Retailer Order System - Current State & Issues

## Current Limitation: Single Retailer Per Order

### Code Evidence

**server/src/services/order.service.ts:94-98**
```typescript
// Set retailerId from first product (all items must be from same retailer for now)
if (!retailerId) {
  retailerId = inventory.ownerId._id;
} else if (retailerId.toString() !== inventory.ownerId._id.toString()) {
  throw new Error('All items must be from the same retailer');
}
```

**server/src/models/Order.model.ts:72**
```typescript
retailerId: mongoose.Types.ObjectId; // SINGLE retailer only
```

---

## Current Behavior

### ❌ What DOES NOT Work
1. **Customer adds products from multiple retailers to cart**
   - Frontend: ✅ Allows it (no validation)
   - Backend: ❌ Throws error at checkout: `"All items must be from the same retailer"`
   - UX: 🔴 POOR - Error only shows when placing order

2. **Notifications**
   - Method exists: `notificationService.notifyNewOrderForRetailer()`
   - But it's **NEVER CALLED** when order is created
   - Retailers don't get notified of new orders 🔴

3. **Multi-retailer orders**
   - Not supported at all
   - Order model has single `retailerId` field

---

## Architectural Problems

### 1. Cart Allows Multi-Retailer, Backend Rejects It

**Frontend** (`client/src/stores/cartStore.ts`)
```typescript
addItem: (product: Product, quantity = 1) => {
  // NO validation for retailer
  // Customer can add products from any retailer
  set((state) => ({
    items: [...state.items, { productId, product, quantity, addedAt: new Date() }]
  }));
}
```

**Backend** (`server/src/services/order.service.ts:98`)
```typescript
throw new Error('All items must be from the same retailer');
```

**Problem**: User doesn't know they can't mix retailers until checkout fails!

---

### 2. Missing Notification System

**Order creation** (`server/src/services/order.service.ts:202-220`)
```typescript
await order.save();

// Add order to customer's order history
await customer.updateOne({ $push: { orderHistory: order._id } });

// Increment discount code usage
if (discountCalc.appliedCode) {
  await discountCalc.appliedCode.incrementUsage(customerId);
}

logger.info(`✅ Order created: ${order.orderId}`);

// ❌ NO NOTIFICATION SENT TO RETAILER!

return { success: true, data: { order } };
```

**Available but unused method** (`notification.service.ts:364-381`)
```typescript
async notifyNewOrderForRetailer(
  retailerId: string | mongoose.Types.ObjectId,
  orderId: string,
  orderNumber: string,
  customerName: string,
  totalAmount: number
): Promise<INotification> {
  return this.createNotification({
    userId: retailerId,
    type: NotificationType.ORDER,
    priority: NotificationPriority.HIGH,
    title: 'New Order Received',
    message: `${customerName} placed an order #${orderNumber} for ₹${totalAmount.toFixed(2)}.`,
    icon: '🛒',
    link: `/retailer/orders`,
  });
}
```

---

## Two Possible Solutions

### Option A: Enforce Single Retailer (Quick Fix)

**Add frontend validation in cart**

```typescript
// client/src/stores/cartStore.ts
addItem: (product: Product, quantity = 1) => {
  const state = get();

  // Check if cart has items from different retailer
  if (state.items.length > 0) {
    const firstItemRetailerId = state.items[0].product.retailerInventories?.[0]?.ownerId;
    const newItemRetailerId = product.retailerInventories?.[0]?.ownerId;

    if (firstItemRetailerId !== newItemRetailerId) {
      toast.error('You can only order from one retailer at a time. Please clear your cart first.');
      return;
    }
  }

  // Add item
  set((state) => ({
    items: [...state.items, { productId, product, quantity, addedAt: new Date() }]
  }));
}
```

**Pros**:
- Quick to implement
- No database schema changes
- User sees error immediately

**Cons**:
- Poor UX - customer must place separate orders for different retailers
- Not scalable
- Not real-world (Amazon/grocery apps allow multi-vendor orders)

---

### Option B: Support Multi-Retailer Orders (Proper Fix)

**Architecture change needed**

1. **Split order into sub-orders per retailer**

```typescript
// New interface
export interface ISubOrder {
  retailerId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  discounts: number;
  total: number;
  status: OrderStatus;
  trackingInfo: ITrackingInfo;
}

export interface IOrder extends Document {
  orderId: string; // Master order ID
  customerId: mongoose.Types.ObjectId;
  subOrders: ISubOrder[]; // ← One per retailer
  totalAmount: number;
  deliveryAddress: { ... };
  // Discount applied at master order level
  discountBreakdown: IDiscountBreakdown;
  masterStatus: OrderStatus; // Completed when all sub-orders complete
}
```

2. **Order creation logic**

```typescript
async createOrder(data: CreateOrderData) {
  // Group items by retailer
  const itemsByRetailer = new Map<string, IOrderItem[]>();

  for (const item of items) {
    const inventory = await Inventory.findById(...);
    const retailerId = inventory.ownerId._id.toString();

    if (!itemsByRetailer.has(retailerId)) {
      itemsByRetailer.set(retailerId, []);
    }

    itemsByRetailer.get(retailerId).push({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: inventory.getDiscountedPrice(),
      subtotal: ...,
    });
  }

  // Create sub-orders for each retailer
  const subOrders: ISubOrder[] = [];

  for (const [retailerId, items] of itemsByRetailer) {
    subOrders.push({
      retailerId: new mongoose.Types.ObjectId(retailerId),
      items,
      subtotal: calculateSubtotal(items),
      status: OrderStatus.PENDING,
      trackingInfo: { ... },
    });
  }

  // Create master order
  const order = new Order({
    orderId: generateOrderId(),
    customerId,
    subOrders,
    totalAmount: calculateTotal(subOrders) - discounts + tax,
    discountBreakdown: { ... },
  });

  await order.save();

  // Notify each retailer about their sub-order
  for (const subOrder of subOrders) {
    await notificationService.notifyNewOrderForRetailer(
      subOrder.retailerId,
      order._id,
      order.orderId,
      customerName,
      subOrder.total
    );
  }
}
```

3. **Discount logic change**

- Product discounts: Apply per item ✅ (already works)
- Tier/code discounts: Apply to TOTAL cart (all retailers combined)
- Split tier/code discount proportionally across sub-orders

**Pros**:
- Real-world UX
- Scalable
- Each retailer gets their own sub-order
- Customer sees unified order tracking

**Cons**:
- Requires schema migration
- More complex logic
- Delivery coordination (if different retailers)

---

## Immediate Fix Required: Add Notifications

**Regardless of which option, this MUST be fixed NOW:**

### Add to order.service.ts after line 202:

```typescript
await order.save();

// Add order to customer's order history
await customer.updateOne({
  $push: { orderHistory: order._id }
});

// ✅ NOTIFY RETAILER OF NEW ORDER
const customerName = customer.profile?.name || customer.email;
await notificationService.notifyNewOrderForRetailer(
  retailerId,
  order._id.toString(),
  order.orderId,
  customerName,
  totalAmount
);

logger.info(`📧 Notification sent to retailer ${retailerId}`);
```

---

## Current Answer to User's Question

> "does ordering from multiple retailers work. it notifies all retailers separately? about the same order?"

**Answer**: ❌ **NO**

1. **Multi-retailer ordering does NOT work**
   - System throws error: `"All items must be from the same retailer"`
   - Frontend allows it but backend rejects it
   - Poor UX

2. **Notifications are NOT sent**
   - Method exists but is never called
   - Retailers are NOT notified when they receive orders
   - This is a bug that needs immediate fixing

3. **It's a single order, not "same order to multiple retailers"**
   - Current model: One order = One retailer
   - If multi-retailer is implemented, it would be:
     - One master order for customer
     - Multiple sub-orders (one per retailer)
     - Each retailer notified about their specific sub-order

---

## Recommended Immediate Actions

### Priority 1: Fix Missing Notifications (CRITICAL BUG)
- Add `notificationService.notifyNewOrderForRetailer()` call in `order.service.ts`
- This is broken regardless of multi-retailer support

### Priority 2: Add Frontend Validation
- Warn users they can't mix retailers
- Show which retailer's products are in cart
- Option to clear cart when adding from different retailer

### Priority 3: Decide on Multi-Retailer Support
- If YES → Implement Option B (sub-orders architecture)
- If NO → Keep single retailer limit but improve UX

---

## Testing Current System

### Test 1: Single Retailer Order + Notification
```bash
# 1. Add product from Dairy Delights to cart
# 2. Place order
# 3. Check server logs - should see notification sent
# 4. Login as retailer - should see notification bell
```

**Expected**: ✅ Order created, ✅ Retailer notified
**Current**: ✅ Order created, ❌ NO notification

### Test 2: Multi-Retailer Cart
```bash
# 1. Add product from Retailer A to cart
# 2. Add product from Retailer B to cart
# 3. Try to checkout
```

**Expected**: Should either:
- Option A: Warning at step 2, can't add
- Option B: Creates two sub-orders, notifies both retailers

**Current**: ❌ Error at step 3: "All items must be from the same retailer"

---

## Schema Changes Needed (If implementing Option B)

### Order.model.ts
```typescript
// Before
retailerId: mongoose.Types.ObjectId;
items: IOrderItem[];
status: OrderStatus;

// After
subOrders: [{
  retailerId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  status: OrderStatus;
  trackingInfo: ITrackingInfo;
}];
masterStatus: OrderStatus; // NEW
```

### Migration needed
```javascript
// Existing orders need migration
db.orders.updateMany(
  { retailerId: { $exists: true } },
  {
    $set: {
      subOrders: [{
        retailerId: "$retailerId",
        items: "$items",
        status: "$status",
        trackingInfo: "$trackingInfo"
      }],
      masterStatus: "$status"
    },
    $unset: { retailerId: "", items: "" }
  }
);
```
