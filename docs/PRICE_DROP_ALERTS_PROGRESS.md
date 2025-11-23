# Price Drop Alerts & Wishlist Notifications - Implementation Progress

**Date**: 2025-01-18
**Status**: 🚧 **IN PROGRESS** - Backend Complete, Frontend Pending

---

## ✅ Completed Tasks

### Phase 1: Core Price Monitoring (COMPLETE)
- ✅ Created new Wishlist model with target price fields (`server/src/models/Wishlist.model.ts`)
- ✅ Created PriceHistory model for tracking price changes (`server/src/models/PriceHistory.model.ts`)
- ✅ Implemented price monitoring service (`server/src/services/priceMonitoring.service.ts`)
- ✅ Set up cron job for hourly price monitoring (`server/src/jobs/priceMonitoring.job.ts`)
- ✅ Integrated cron job into server startup (`server/src/app.ts`)
- ✅ Installed node-cron dependency

### Phase 2: Notification System (COMPLETE)
- ✅ Added PRICE_ALERT notification type (`server/src/models/Notification.model.ts`)
- ✅ Added price alert preferences to User model (`server/src/models/User.model.ts`)
  - enabled, emailEnabled, inAppEnabled
  - minimumDiscountPercent (default: 5%)
  - maxAlertsPerDay (default: 10)

### Phase 3: API Endpoints (COMPLETE)
- ✅ Implemented `setTargetPrice` endpoint - PUT `/api/wishlist/:productId/target-price`
- ✅ Implemented `updateItemPreferences` endpoint - PUT `/api/wishlist/:productId/preferences`
- ✅ Implemented `getPriceHistory` endpoint - GET `/api/wishlist/price-history/:productId`
- ✅ Updated wishlist routes (`server/src/routes/wishlist.routes.ts`)

---

## 🚧 Pending Tasks

### Phase 3: Frontend Components (NEXT)
- ⏳ Install chart.js and react-chartjs-2 for price history graphs
- ⏳ Create PriceHistoryChart component
- ⏳ Update wishlist page UI with target price input
- ⏳ Add price alert preferences to customer settings page

### Phase 4: Migration & Testing
- ⏳ Create migration script to convert existing Customer.wishlist to new Wishlist model
- ⏳ Test end-to-end price alert flow
- ⏳ Test cron job execution
- ⏳ Test notification delivery

---

## 🏗️ System Architecture

### Data Models

#### Wishlist Model
```typescript
interface IWishlistItem {
  productId: ObjectId;
  retailerId: ObjectId;
  addedAt: Date;
  targetPrice?: number;              // NEW
  lastNotifiedPrice?: number;        // NEW
  priceAlertEnabled: boolean;        // NEW
  notifyOnDiscount: boolean;         // NEW
  notifyOnTargetPrice: boolean;      // NEW
  notifyOnRestock: boolean;          // NEW
}

interface IWishlist {
  customerId: ObjectId;
  items: IWishlistItem[];
}
```

#### PriceHistory Model
```typescript
interface IPriceHistory {
  productId: ObjectId;
  retailerId: ObjectId;
  history: IPriceHistoryEntry[];
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  lastCheckedAt: Date;
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wishlist/price-history/:productId?days=30` | Get price history for a product |
| PUT | `/api/wishlist/:productId/target-price` | Set target price alert |
| PUT | `/api/wishlist/:productId/preferences` | Update alert preferences |

### Background Jobs

**Price Monitoring Job**:
- Runs every hour (0 * * * *)
- Checks all products in customer wishlists
- Compares current price with previous price
- Triggers notifications if:
  - Price drops below target price
  - Price drops by >= minimum discount percent
  - Item back in stock (if enabled)

### Notification Flow

```
Product Price Update
      ↓
Price Monitoring Job
      ↓
Price Change Detected?
      ↓
Check Wishlists
      ↓
Filter by User Preferences
      ↓
Send Notifications
      ↓
Update lastNotifiedPrice
```

---

## 📊 Implementation Details

### Price Monitoring Logic

```typescript
// Calculate effective price
const currentPrice = basePrice * (1 - discount / 100);

// Determine if customer should be notified
if (targetPrice && currentPrice <= targetPrice) {
  return true; // Hit target price!
}

if (priceDropPercent >= minimumDiscountPercent) {
  return true; // Discount meets threshold
}

// Don't notify if already notified at this price
if (lastNotifiedPrice && currentPrice >= lastNotifiedPrice) {
  return false;
}
```

### Notification Messages

**Target Price Reached**:
> 🎯 Target Price Reached!
> Cheese Slices is now ₹360.00 - your target price! Was ₹400.00.

**Price Drop**:
> 💰 Price Drop: 20% Off
> Cheese Slices dropped from ₹400.00 to ₹320.00. Save ₹80.00!

---

## 🔧 Technical Decisions

### 1. Why Separate Wishlist Model?
**Decision**: Created new Wishlist model instead of extending Customer.wishlist array

**Reasons**:
- More flexible schema for rich item data
- Better indexing for price alert queries
- Easier to add item-level preferences
- Cleaner separation of concerns

**Migration Strategy**:
- New model coexists with old Customer.wishlist
- Migration script will copy data from Customer.wishlist to Wishlist
- Controllers check both sources for backward compatibility

### 2. Why Hourly Monitoring?
**Decision**: Run cron job every hour instead of real-time

**Reasons**:
- Reduces database load (products don't change prices constantly)
- Prevents notification spam
- More predictable resource usage
- Can batch multiple price changes

**Trade-off**: Up to 1-hour delay before customers get alerts (acceptable for grocery shopping)

### 3. Why 90-Day History Limit?
**Decision**: Keep only last 90 days of price history

**Reasons**:
- Limits storage growth
- 90 days is sufficient for price trends
- Older data less relevant for grocery prices
- Can extend if needed

---

## 🎯 Next Steps

1. **Install Frontend Dependencies**
   ```bash
   cd client
   docker exec livemart-client-dev npm install chart.js react-chartjs-2
   ```

2. **Create PriceHistoryChart Component**
   - Line chart showing price over time
   - Highlight lowest/highest prices
   - Show discount periods

3. **Update Wishlist Page**
   - Add target price input for each item
   - Show "Set Alert" button
   - Display price drop indicators
   - Show current alerts

4. **Create Migration Script**
   - Copy Customer.wishlist → Wishlist model
   - Initialize default preferences
   - Preserve retailer relationships

5. **Testing**
   - Manually change product prices
   - Trigger cron job
   - Verify notifications sent
   - Check price history recorded

---

## 📝 Files Created

### Backend
1. `server/src/models/Wishlist.model.ts` - New wishlist model with price alerts
2. `server/src/models/PriceHistory.model.ts` - Price tracking model
3. `server/src/services/priceMonitoring.service.ts` - Price monitoring logic
4. `server/src/jobs/priceMonitoring.job.ts` - Cron job scheduler

### Modified
1. `server/src/models/User.model.ts` - Added price alert preferences
2. `server/src/models/Notification.model.ts` - Added PRICE_ALERT type
3. `server/src/controllers/wishlist.controller.ts` - Added 3 new endpoints
4. `server/src/routes/wishlist.routes.ts` - Added 3 new routes
5. `server/src/app.ts` - Integrated cron job

### Pending
1. `client/src/components/products/PriceHistoryChart.tsx` - TO CREATE
2. `client/src/pages/customer/Wishlist.tsx` - TO UPDATE
3. `client/src/services/wishlist.service.ts` - TO UPDATE
4. `server/src/scripts/migrate-wishlist.ts` - TO CREATE

---

## ⚠️ Important Notes

### Migration Required
The existing Customer.wishlist (array of Product IDs) needs to be migrated to the new Wishlist model (structured items with preferences). This migration is **required** before the feature can work properly.

### Backward Compatibility
Controllers currently check both:
- Old: `Customer.wishlist` (array of IDs)
- New: `Wishlist.items` (structured data)

This allows gradual migration without breaking existing functionality.

### Cron Job Status
The cron job is **scheduled** but won't have any effect until:
1. Wishlist data is migrated
2. Customers set target prices
3. Product prices actually change

---

**Last Updated**: 2025-01-18
**Status**: Backend Complete ✅ | Frontend Pending 🚧 | Testing Pending ⏳
