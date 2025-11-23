# Price Drop Alerts & Wishlist Notifications - Implementation Plan

**Feature Type:** Customer Engagement & Conversion
**Priority:** ⭐ QUICK WIN
**Complexity:** Low
**Estimated Time:** 3-4 days
**Business Value:** High engagement boost with minimal development cost

---

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [System Architecture](#system-architecture)
3. [Implementation Phases](#implementation-phases)
4. [Database Schema](#database-schema)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Testing Strategy](#testing-strategy)
8. [Future Enhancements](#future-enhancements)

---

## Feature Overview

### What We're Building
A comprehensive price monitoring system that tracks wishlist items and notifies customers when:
- Items go on sale (any discount)
- Items reach their target price point
- Items get new stock (if previously out of stock)
- Items have limited-time offers

### Key Features
1. **Automatic Price Monitoring**: Background job tracks price changes
2. **Target Price Alerts**: Customers set desired prices for wishlist items
3. **Multiple Notification Channels**: In-app, email (future: SMS, push)
4. **Price History Graph**: Visual representation of price trends
5. **User Preferences**: Granular control over notification types

### User Flow
```
1. Customer adds product to wishlist
2. (Optional) Customer sets target price for product
3. System monitors price changes every hour/day
4. When price drops OR reaches target:
   → Send notification to customer
   → Show notification in app
   → (Optional) Send email
5. Customer clicks notification → Redirected to product page
6. Customer can view price history graph before purchasing
```

---

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     PRICE MONITORING SYSTEM                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌─────────────────┐                 │
│  │   Wishlist   │─────▶│ Price Monitor   │                 │
│  │   Service    │      │  Cron Job       │                 │
│  └──────────────┘      └─────────────────┘                 │
│                                │                             │
│                                ▼                             │
│                    ┌──────────────────────┐                 │
│                    │ Price Change Detector│                 │
│                    └──────────────────────┘                 │
│                                │                             │
│                    ┌───────────┴───────────┐               │
│                    ▼                       ▼                │
│          ┌──────────────────┐   ┌──────────────────┐      │
│          │  Notification    │   │  Price History   │      │
│          │    Service       │   │     Service      │      │
│          └──────────────────┘   └──────────────────┘      │
│                    │                                        │
│                    ▼                                        │
│          ┌──────────────────┐                              │
│          │  In-App + Email  │                              │
│          │  Notifications   │                              │
│          └──────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Product Price Update
        │
        ▼
  Check Wishlist
  (Who has this?)
        │
        ▼
  Compare Prices
  - Current vs Previous
  - Current vs Target
        │
        ▼
   Trigger Alert?
   ┌─────┴──────┐
   │  YES       │  NO
   ▼            ▼
Send         Skip
Notification
```

---

## Implementation Phases

### Phase 1: Core Price Monitoring (Day 1-2)
**Goal**: Track price changes and store history

**Tasks**:
1. ✅ Extend Wishlist model with target price
2. ✅ Create PriceHistory model
3. ✅ Create price monitoring service
4. ✅ Create price comparison logic
5. ✅ Add background job/cron for monitoring
6. ✅ Test price change detection

**Deliverables**:
- Database schemas updated
- Price history tracking working
- Background job running every hour

---

### Phase 2: Notification System (Day 2-3)
**Goal**: Notify customers of price drops

**Tasks**:
1. ✅ Add price alert notification types
2. ✅ Create notification trigger logic
3. ✅ Implement user notification preferences
4. ✅ Test notification delivery
5. ✅ Add notification history

**Deliverables**:
- Notifications sent on price drops
- User can control notification preferences
- Notification history visible

---

### Phase 3: Frontend UI (Day 3-4)
**Goal**: Customer-facing features

**Tasks**:
1. ✅ Add "Set Target Price" to wishlist items
2. ✅ Create price history graph component
3. ✅ Add notification preference settings
4. ✅ Create price alert badge/indicator
5. ✅ Update wishlist page UI
6. ✅ Test end-to-end flow

**Deliverables**:
- Wishlist page with target price input
- Price history graph on product pages
- Settings page for notification preferences
- Visual indicators for price drops

---

### Phase 4: Polish & Optimization (Day 4)
**Goal**: Production-ready feature

**Tasks**:
1. ✅ Add rate limiting for notifications
2. ✅ Optimize database queries
3. ✅ Add analytics tracking
4. ✅ Write documentation
5. ✅ Final testing

**Deliverables**:
- Performance optimized
- Documentation complete
- Ready for production

---

## Database Schema

### 1. Update Wishlist Model

**File**: `server/src/models/Wishlist.model.ts`

```typescript
// Extend WishlistItem interface
export interface IWishlistItem {
  productId: mongoose.Types.ObjectId;
  retailerId: mongoose.Types.ObjectId;
  addedAt: Date;

  // ✅ NEW FIELDS
  targetPrice?: number;              // Customer's desired price point
  lastNotifiedPrice?: number;        // Last price we sent notification for
  priceAlertEnabled: boolean;        // Can disable alerts per item
  notifyOnDiscount: boolean;         // Alert on any discount
  notifyOnTargetPrice: boolean;      // Alert when reaches target price
  notifyOnRestock: boolean;          // Alert when back in stock
}

// Update schema
const WishlistItemSchema = new Schema<IWishlistItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  retailerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },

  // ✅ NEW FIELDS
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
});
```

### 2. Create PriceHistory Model

**File**: `server/src/models/PriceHistory.model.ts`

```typescript
import mongoose, { Document, Schema } from 'mongoose';

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
});

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

// Indexes
PriceHistorySchema.index({ productId: 1, retailerId: 1 }, { unique: true });
PriceHistorySchema.index({ lastCheckedAt: 1 });

// Keep only last 90 days of history (to limit storage)
PriceHistorySchema.methods.pruneOldHistory = function() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  this.history = this.history.filter(
    (entry: IPriceHistoryEntry) => entry.timestamp > ninetyDaysAgo
  );
};

const PriceHistory = mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);
export default PriceHistory;
```

### 3. Update User Model (Notification Preferences)

**File**: `server/src/models/User.model.ts`

```typescript
// Add to IUser interface
export interface IUser extends Document {
  // ... existing fields

  // ✅ NEW FIELD
  notificationPreferences: {
    priceAlerts: {
      enabled: boolean;
      emailEnabled: boolean;
      inAppEnabled: boolean;
      minimumDiscountPercent: number;  // Only notify if discount >= X%
      maxAlertsPerDay: number;         // Rate limiting
    };
  };
}

// Add to UserSchema
const UserSchema = new Schema<IUser>({
  // ... existing fields

  // ✅ NEW FIELD
  notificationPreferences: {
    priceAlerts: {
      enabled: { type: Boolean, default: true },
      emailEnabled: { type: Boolean, default: false },
      inAppEnabled: { type: Boolean, default: true },
      minimumDiscountPercent: { type: Number, default: 5, min: 0, max: 100 },
      maxAlertsPerDay: { type: Number, default: 10, min: 1, max: 50 },
    },
  },
});
```

---

## Backend Implementation

### 1. Price Monitoring Service

**File**: `server/src/services/priceMonitoring.service.ts`

```typescript
import Product from '../models/Product.model';
import PriceHistory from '../models/PriceHistory.model';
import Wishlist from '../models/Wishlist.model';
import notificationService from './notification.service';
import { logger } from '../utils/logger';

interface PriceChange {
  productId: string;
  retailerId: string;
  oldPrice: number;
  newPrice: number;
  discount?: number;
  reason: string;
}

class PriceMonitoringService {
  /**
   * Main monitoring job - runs periodically (e.g., every hour)
   */
  async monitorAllPrices(): Promise<void> {
    try {
      logger.info('🔍 Starting price monitoring job...');

      // Get all products that are in someone's wishlist
      const wishlists = await Wishlist.find().populate('items.productId');
      const uniqueProductIds = new Set<string>();

      wishlists.forEach(wishlist => {
        wishlist.items.forEach(item => {
          if (item.productId) {
            uniqueProductIds.add(item.productId.toString());
          }
        });
      });

      logger.info(`📦 Monitoring ${uniqueProductIds.size} products in wishlists`);

      // Check each product for price changes
      let changesDetected = 0;
      for (const productId of uniqueProductIds) {
        const changed = await this.checkProductPrice(productId);
        if (changed) changesDetected++;
      }

      logger.info(`✅ Price monitoring complete. ${changesDetected} changes detected.`);
    } catch (error: any) {
      logger.error('❌ Price monitoring failed:', error);
      throw error;
    }
  }

  /**
   * Check a single product for price changes
   */
  async checkProductPrice(productId: string): Promise<boolean> {
    try {
      const product = await Product.findById(productId);
      if (!product) return false;

      // Get price history
      let priceHistory = await PriceHistory.findOne({
        productId: product._id,
        retailerId: product.retailerId,
      });

      const currentPrice = this.calculateCurrentPrice(product);

      // First time tracking this product
      if (!priceHistory) {
        priceHistory = new PriceHistory({
          productId: product._id,
          retailerId: product.retailerId,
          currentPrice,
          lowestPrice: currentPrice,
          highestPrice: currentPrice,
          averagePrice: currentPrice,
          history: [{
            price: currentPrice,
            discount: product.discount,
            timestamp: new Date(),
            reason: 'REGULAR_UPDATE',
          }],
        });
        await priceHistory.save();
        return false;
      }

      // Price hasn't changed
      if (priceHistory.currentPrice === currentPrice) {
        priceHistory.lastCheckedAt = new Date();
        await priceHistory.save();
        return false;
      }

      // Price changed - record it
      const priceChange: PriceChange = {
        productId: product._id.toString(),
        retailerId: product.retailerId.toString(),
        oldPrice: priceHistory.currentPrice,
        newPrice: currentPrice,
        discount: product.discount,
        reason: this.determinePriceChangeReason(priceHistory.currentPrice, currentPrice, product.discount),
      };

      await this.recordPriceChange(priceHistory, priceChange);
      await this.notifyAffectedCustomers(product, priceChange);

      return true;
    } catch (error: any) {
      logger.error(`❌ Error checking price for product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Calculate current effective price (after discounts)
   */
  private calculateCurrentPrice(product: any): number {
    const basePrice = product.pricing?.basePrice || product.price || 0;
    const discount = product.discount || 0;
    return basePrice * (1 - discount / 100);
  }

  /**
   * Determine reason for price change
   */
  private determinePriceChangeReason(oldPrice: number, newPrice: number, discount?: number): string {
    if (discount && discount > 0 && newPrice < oldPrice) {
      return 'DISCOUNT_APPLIED';
    } else if (!discount && newPrice > oldPrice) {
      return 'DISCOUNT_REMOVED';
    } else {
      return 'PRICE_CHANGE';
    }
  }

  /**
   * Record price change in history
   */
  private async recordPriceChange(priceHistory: any, change: PriceChange): Promise<void> {
    // Add to history
    priceHistory.history.push({
      price: change.newPrice,
      discount: change.discount,
      timestamp: new Date(),
      reason: change.reason,
    });

    // Update stats
    priceHistory.currentPrice = change.newPrice;
    priceHistory.lowestPrice = Math.min(priceHistory.lowestPrice, change.newPrice);
    priceHistory.highestPrice = Math.max(priceHistory.highestPrice, change.newPrice);
    priceHistory.averagePrice = this.calculateAveragePrice(priceHistory.history);
    priceHistory.lastCheckedAt = new Date();

    // Prune old history (keep only 90 days)
    priceHistory.pruneOldHistory();

    await priceHistory.save();

    logger.info(`💰 Price changed: ${change.oldPrice} → ${change.newPrice} (${change.reason})`);
  }

  /**
   * Calculate average price from history
   */
  private calculateAveragePrice(history: any[]): number {
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, entry) => acc + entry.price, 0);
    return sum / history.length;
  }

  /**
   * Notify customers who have this product in wishlist
   */
  private async notifyAffectedCustomers(product: any, change: PriceChange): Promise<void> {
    try {
      // Find all wishlists containing this product
      const wishlists = await Wishlist.find({
        'items.productId': product._id,
      }).populate('customerId');

      logger.info(`📧 Notifying ${wishlists.length} customers about price change`);

      for (const wishlist of wishlists) {
        const wishlistItem = wishlist.items.find(
          item => item.productId.toString() === product._id.toString()
        );

        if (!wishlistItem || !wishlistItem.priceAlertEnabled) {
          continue; // Skip if alerts disabled
        }

        // Check notification preferences
        const user = wishlist.customerId;
        const prefs = user.notificationPreferences?.priceAlerts;

        if (!prefs?.enabled || !prefs?.inAppEnabled) {
          continue; // Skip if price alerts disabled
        }

        // Determine if we should notify
        const shouldNotify = this.shouldNotifyCustomer(
          wishlistItem,
          change,
          prefs.minimumDiscountPercent
        );

        if (shouldNotify) {
          await this.sendPriceAlertNotification(user._id, product, change, wishlistItem);

          // Update last notified price
          wishlistItem.lastNotifiedPrice = change.newPrice;
          await wishlist.save();
        }
      }
    } catch (error: any) {
      logger.error('❌ Error notifying customers:', error);
    }
  }

  /**
   * Determine if customer should be notified
   */
  private shouldNotifyCustomer(
    wishlistItem: any,
    change: PriceChange,
    minimumDiscountPercent: number
  ): boolean {
    const priceDropPercent = ((change.oldPrice - change.newPrice) / change.oldPrice) * 100;

    // Price increased - don't notify
    if (change.newPrice >= change.oldPrice) {
      return false;
    }

    // Already notified at this price or lower
    if (wishlistItem.lastNotifiedPrice && change.newPrice >= wishlistItem.lastNotifiedPrice) {
      return false;
    }

    // Check target price
    if (wishlistItem.notifyOnTargetPrice && wishlistItem.targetPrice) {
      if (change.newPrice <= wishlistItem.targetPrice) {
        return true; // Hit target price!
      }
    }

    // Check discount threshold
    if (wishlistItem.notifyOnDiscount) {
      if (priceDropPercent >= minimumDiscountPercent) {
        return true; // Discount meets minimum
      }
    }

    return false;
  }

  /**
   * Send price alert notification
   */
  private async sendPriceAlertNotification(
    userId: string,
    product: any,
    change: PriceChange,
    wishlistItem: any
  ): Promise<void> {
    const priceDropPercent = Math.round(((change.oldPrice - change.newPrice) / change.oldPrice) * 100);
    const savings = change.oldPrice - change.newPrice;

    let message = '';
    let title = '';

    if (wishlistItem.targetPrice && change.newPrice <= wishlistItem.targetPrice) {
      // Hit target price
      title = '🎯 Target Price Reached!';
      message = `${product.name} is now ₹${change.newPrice.toFixed(2)} - your target price! Was ₹${change.oldPrice.toFixed(2)}.`;
    } else {
      // Regular price drop
      title = `💰 Price Drop: ${priceDropPercent}% Off`;
      message = `${product.name} dropped from ₹${change.oldPrice.toFixed(2)} to ₹${change.newPrice.toFixed(2)}. Save ₹${savings.toFixed(2)}!`;
    }

    await notificationService.createNotification({
      userId,
      type: 'PRICE_ALERT',
      priority: 'MEDIUM',
      title,
      message,
      icon: '💰',
      link: `/products/${product._id}`,
      metadata: {
        productId: product._id,
        oldPrice: change.oldPrice,
        newPrice: change.newPrice,
        priceDropPercent,
        savings,
      },
    });

    logger.info(`✅ Price alert sent to user ${userId} for product ${product.name}`);
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(productId: string, days: number = 30): Promise<any> {
    const priceHistory = await PriceHistory.findOne({ productId });

    if (!priceHistory) {
      return null;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentHistory = priceHistory.history.filter(
      entry => entry.timestamp > cutoffDate
    );

    return {
      currentPrice: priceHistory.currentPrice,
      lowestPrice: priceHistory.lowestPrice,
      highestPrice: priceHistory.highestPrice,
      averagePrice: priceHistory.averagePrice,
      history: recentHistory,
    };
  }
}

export default new PriceMonitoringService();
```

### 2. Cron Job Setup

**File**: `server/src/jobs/priceMonitoring.job.ts`

```typescript
import cron from 'node-cron';
import priceMonitoringService from '../services/priceMonitoring.service';
import { logger } from '../utils/logger';

/**
 * Schedule price monitoring job
 * Runs every hour at :00 minutes
 */
export function schedulePriceMonitoring(): void {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('⏰ Price monitoring cron job triggered');
      await priceMonitoringService.monitorAllPrices();
    } catch (error: any) {
      logger.error('❌ Price monitoring cron job failed:', error);
    }
  });

  logger.info('✅ Price monitoring cron job scheduled (runs hourly)');
}

/**
 * Run price monitoring immediately (for testing)
 */
export async function runPriceMonitoringNow(): Promise<void> {
  await priceMonitoringService.monitorAllPrices();
}
```

### 3. Update Notification Service

**File**: `server/src/services/notification.service.ts`

Add new notification type:

```typescript
// Add to NotificationType enum
export enum NotificationType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  REVIEW = 'REVIEW',
  PRODUCT = 'PRODUCT',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM',
  PRICE_ALERT = 'PRICE_ALERT',  // ✅ NEW
}
```

### 4. API Endpoints

**File**: `server/src/routes/wishlist.routes.ts`

```typescript
// Update wishlist item with target price
router.put(
  '/items/:productId/target-price',
  authenticate,
  requireCustomer,
  wishlistController.setTargetPrice
);

// Get price history for a product
router.get(
  '/price-history/:productId',
  authenticate,
  wishlistController.getPriceHistory
);

// Update notification preferences for wishlist item
router.put(
  '/items/:productId/preferences',
  authenticate,
  requireCustomer,
  wishlistController.updateItemPreferences
);
```

**File**: `server/src/controllers/wishlist.controller.ts`

```typescript
/**
 * Set target price for wishlist item
 * PUT /api/wishlist/items/:productId/target-price
 */
export const setTargetPrice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { targetPrice } = req.body;
    const customerId = req.user._id;

    const wishlist = await Wishlist.findOne({ customerId });

    if (!wishlist) {
      res.status(404).json({ success: false, message: 'Wishlist not found' });
      return;
    }

    const item = wishlist.items.find(
      item => item.productId.toString() === productId
    );

    if (!item) {
      res.status(404).json({ success: false, message: 'Product not in wishlist' });
      return;
    }

    item.targetPrice = targetPrice;
    item.notifyOnTargetPrice = true;
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: 'Target price set successfully',
      data: { item },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get price history for a product
 * GET /api/wishlist/price-history/:productId
 */
export const getPriceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;

    const history = await priceMonitoringService.getPriceHistory(
      productId,
      Number(days)
    );

    if (!history) {
      res.status(404).json({ success: false, message: 'No price history found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { history },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## Frontend Implementation

### 1. Wishlist Page Updates

**File**: `client/src/pages/customer/Wishlist.tsx`

Add target price input to each wishlist item:

```typescript
// Inside wishlist item rendering
<div className="flex items-center gap-4 mt-2">
  <div className="flex-1">
    <label className="text-sm text-gray-600 dark:text-gray-400">
      Target Price (Optional)
    </label>
    <div className="flex gap-2 mt-1">
      <input
        type="number"
        min="0"
        step="0.01"
        value={item.targetPrice || ''}
        onChange={(e) => handleTargetPriceChange(item.productId, e.target.value)}
        placeholder={`Current: ₹${item.currentPrice}`}
        className="flex-1 px-3 py-2 border rounded-lg"
      />
      <button
        onClick={() => saveTargetPrice(item.productId)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Set Alert
      </button>
    </div>
  </div>

  {item.targetPrice && (
    <div className="flex items-center gap-2">
      <span className="text-sm text-green-600">
        🎯 Alert set at ₹{item.targetPrice}
      </span>
      <button
        onClick={() => removeTargetPrice(item.productId)}
        className="text-red-600 hover:text-red-700"
      >
        ✕
      </button>
    </div>
  )}
</div>

// Show price drop indicator
{item.priceDropPercent > 0 && (
  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg mt-2">
    <span className="text-green-600 font-semibold">
      💰 {item.priceDropPercent}% OFF
    </span>
    <span className="text-sm text-gray-600 dark:text-gray-400">
      Was ₹{item.oldPrice}
    </span>
  </div>
)}
```

### 2. Price History Graph Component

**File**: `client/src/components/products/PriceHistoryChart.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import wishlistService from '../../services/wishlist.service';

interface PriceHistoryChartProps {
  productId: string;
  days?: number;
}

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ productId, days = 30 }) => {
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [productId, days]);

  const loadHistory = async () => {
    try {
      const response = await wishlistService.getPriceHistory(productId, days);
      if (response.success) {
        setHistory(response.data.history);
      }
    } catch (error) {
      console.error('Failed to load price history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading price history...</div>;
  }

  if (!history || history.history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No price history available yet
      </div>
    );
  }

  const chartData = {
    labels: history.history.map((entry: any) =>
      new Date(entry.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Price (₹)',
        data: history.history.map((entry: any) => entry.price),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `₹${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: any) => `₹${value}`,
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Price History ({days} days)</h3>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Lowest: </span>
            <span className="font-semibold text-green-600">₹{history.lowestPrice}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Highest: </span>
            <span className="font-semibold text-red-600">₹{history.highestPrice}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Average: </span>
            <span className="font-semibold">₹{history.averagePrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <Line data={chartData} options={options} />

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Current Price: <span className="font-semibold text-blue-600">₹{history.currentPrice}</span></p>
      </div>
    </div>
  );
};

export default PriceHistoryChart;
```

### 3. Notification Preferences

**File**: `client/src/pages/customer/Settings.tsx`

Add price alert preferences section:

```typescript
<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
  <h2 className="text-xl font-semibold mb-4">Price Alert Preferences</h2>

  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium">Enable Price Alerts</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Receive notifications when wishlist items go on sale
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={preferences.priceAlerts.enabled}
          onChange={(e) => handlePreferenceChange('priceAlerts.enabled', e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
      </label>
    </div>

    {preferences.priceAlerts.enabled && (
      <>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Email Notifications</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Receive price alerts via email
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.priceAlerts.emailEnabled}
              onChange={(e) => handlePreferenceChange('priceAlerts.emailEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Minimum Discount Threshold
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={preferences.priceAlerts.minimumDiscountPercent}
            onChange={(e) => handlePreferenceChange('priceAlerts.minimumDiscountPercent', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Only notify if discount is at least {preferences.priceAlerts.minimumDiscountPercent}%
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Maximum Alerts Per Day
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={preferences.priceAlerts.maxAlertsPerDay}
            onChange={(e) => handlePreferenceChange('priceAlerts.maxAlertsPerDay', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </>
    )}
  </div>
</div>
```

### 4. Update Product Page

**File**: `client/src/pages/customer/ProductDetail.tsx`

Add price history graph below product details:

```typescript
import PriceHistoryChart from '../../components/products/PriceHistoryChart';

// Inside component
<div className="mt-8">
  <PriceHistoryChart productId={product._id} days={30} />
</div>
```

---

## Testing Strategy

### Unit Tests

**File**: `server/src/tests/priceMonitoring.test.ts`

```typescript
describe('Price Monitoring Service', () => {
  it('should detect price drops', async () => {
    // Test implementation
  });

  it('should not notify if price increases', async () => {
    // Test implementation
  });

  it('should respect minimum discount threshold', async () => {
    // Test implementation
  });

  it('should notify when target price is reached', async () => {
    // Test implementation
  });

  it('should rate limit notifications', async () => {
    // Test implementation
  });
});
```

### Integration Tests

1. **End-to-End Price Alert Flow**
   - Add product to wishlist
   - Set target price
   - Change product price in database
   - Run monitoring job
   - Verify notification sent
   - Verify notification appears in UI

2. **Price History Tracking**
   - Add product
   - Change price multiple times
   - Verify history recorded correctly
   - Verify graph displays correctly

### Manual Testing Checklist

- [ ] Add product to wishlist
- [ ] Set target price below current price
- [ ] Manually trigger price monitoring
- [ ] Verify notification received
- [ ] Check notification contains correct data
- [ ] Verify price history graph displays
- [ ] Test notification preferences
- [ ] Test rate limiting
- [ ] Test with multiple products
- [ ] Test with multiple customers

---

## Future Enhancements (Phase 5+)

### 1. Email Notifications
- Integrate with email service (SendGrid, AWS SES)
- HTML email templates for price alerts
- Daily/weekly price summary emails

### 2. SMS Notifications
- Integrate with Twilio or similar
- SMS for high-priority alerts only
- User can set SMS threshold

### 3. Push Notifications
- Web push notifications
- Mobile app push notifications
- Notification grouping/batching

### 4. Advanced Features
- Price prediction ML model
- "Best time to buy" recommendations
- Price comparison with competitors
- Group buying / bulk discount alerts
- Share price drops with friends

### 5. Analytics Dashboard
- Price trends across categories
- Most wished products
- Alert effectiveness metrics
- Customer engagement metrics

---

## Dependencies

### New NPM Packages

```json
{
  "dependencies": {
    "node-cron": "^3.0.3",        // Cron job scheduling
    "chart.js": "^4.4.1",         // Charts for frontend
    "react-chartjs-2": "^5.2.0"   // React wrapper for Chart.js
  }
}
```

Install:
```bash
cd server && npm install node-cron
cd client && npm install chart.js react-chartjs-2
```

---

## Deployment Checklist

- [ ] Database migrations complete
- [ ] Cron job scheduled and tested
- [ ] Notification types added
- [ ] Frontend components tested
- [ ] Performance optimized
- [ ] Rate limiting configured
- [ ] Monitoring and logging setup
- [ ] Documentation updated
- [ ] User guide created
- [ ] Analytics tracking added

---

## Performance Considerations

1. **Database Indexing**
   - Index on `PriceHistory.lastCheckedAt` for efficient queries
   - Index on `PriceHistory.productId + retailerId` for lookups
   - Index on `Wishlist.items.productId` for notifications

2. **Caching**
   - Cache price history for frequently viewed products
   - Cache user notification preferences

3. **Rate Limiting**
   - Maximum alerts per customer per day
   - Batch notifications instead of real-time
   - Throttle monitoring for low-demand products

4. **Data Retention**
   - Keep only 90 days of price history
   - Archive old notifications
   - Clean up stale wishlist items

---

## Success Metrics

### Key Performance Indicators (KPIs)

1. **Engagement**
   - % of wishlist users who set target prices
   - % of users who enable price alerts
   - Notification open rate
   - Notification click-through rate

2. **Conversion**
   - % of price alert recipients who purchase within 24h
   - Revenue attributed to price alerts
   - Average order value from alert-driven purchases

3. **System Health**
   - Monitoring job completion time
   - Notification delivery success rate
   - Price history storage usage

### Target Goals

- 30% of wishlist users set target prices within first month
- 15% conversion rate from price alert to purchase
- <5 minute average monitoring job runtime
- >95% notification delivery success rate

---

## Risk Analysis

### Potential Issues

1. **False Positives**
   - **Risk**: Notifying for insignificant price changes
   - **Mitigation**: Minimum discount threshold, rate limiting

2. **Performance Degradation**
   - **Risk**: Monitoring job takes too long with many products
   - **Mitigation**: Batch processing, optimize queries, limit history

3. **Notification Fatigue**
   - **Risk**: Too many alerts annoy customers
   - **Mitigation**: User preferences, rate limiting, smart grouping

4. **Data Storage Growth**
   - **Risk**: Price history grows unbounded
   - **Mitigation**: 90-day retention, archiving, cleanup jobs

---

## Conclusion

This feature provides high business value with relatively low implementation complexity. By leveraging the existing notification infrastructure and adding focused price monitoring capabilities, we can significantly boost customer engagement and conversion rates.

**Estimated ROI**: High - Converts wishlist browsers into buyers
**Implementation Time**: 3-4 days
**Maintenance Overhead**: Low - Automated monitoring with minimal manual intervention

---

**Next Steps**:
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular check-ins during development
5. User acceptance testing before launch

