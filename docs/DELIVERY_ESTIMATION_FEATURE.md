# Delivery Time Estimation Feature

## Overview

This feature uses Google Maps Geocoding API and Routes API to automatically calculate delivery time and distance from the retailer's location to the customer's delivery address. The estimate is calculated when an order is created and displayed to both retailers and customers.

## Architecture

### Flow Diagram

```
Customer Checkout
    ↓
Enters Delivery Address (text fields)
    ↓
Backend: Order Creation
    ↓
1. Geocode Address → Coordinates
2. Get Retailer Location
3. Calculate Route (Routes API v2)
4. Store estimate in Order
    ↓
Display to Retailer (always)
Display to Customer (when status = SHIPPED)
```

## Implementation Details

### 1. Order Model Updates

**File**: `server/src/models/Order.model.ts`

**New Fields Added**:
```typescript
deliveryCoordinates?: {
  latitude: number;
  longitude: number;
}

deliveryEstimate?: {
  distanceMeters: number;
  distanceText: string;      // "5.2 km" or "850 m"
  durationSeconds: number;
  durationText: string;       // "15 mins" or "1 hr 20 mins"
  calculatedAt: Date;
}
```

### 2. Delivery Service

**File**: `server/src/services/delivery.service.ts`

**Key Methods**:

#### `geocodeAddress(address)`
- **Input**: Delivery address object (street, city, state, zipCode, country)
- **Output**: Coordinates {latitude, longitude} or null
- **API**: Google Maps Geocoding API
- **Endpoint**: `https://maps.googleapis.com/maps/api/geocode/json`

#### `calculateDeliveryEstimate(originLat, originLng, destLat, destLng)`
- **Input**: Origin and destination coordinates
- **Output**: DeliveryEstimate object or null
- **API**: Google Maps Routes API v2
- **Endpoint**: `https://routes.googleapis.com/directions/v2:computeRoutes`
- **Features**:
  - Travel mode: DRIVE
  - Routing preference: TRAFFIC_AWARE (considers real-time traffic)
  - Returns distance in meters and duration in seconds
  - Formats human-readable text

#### `getDeliveryEstimate(retailerLocation, deliveryAddress)`
- **Combines**: Geocoding + Route calculation
- **Returns**: Both coordinates and estimate
- **Error handling**: Silent failures (doesn't break order creation)

### 3. Order Service Integration

**File**: `server/src/services/order.service.ts`

**Integration Point**: STEP 4 in `createOrder()`

```typescript
// STEP 4: Calculate delivery estimate
const firstRetailerId = subOrders[0].retailerId;
const retailer = await User.findById(firstRetailerId);

if (retailer?.profile?.location?.coordinates) {
  const retailerLocation = {
    latitude: retailer.profile.location.coordinates[1],
    longitude: retailer.profile.location.coordinates[0],
  };

  const estimateResult = await deliveryService.getDeliveryEstimate(
    retailerLocation,
    deliveryAddress
  );

  if (estimateResult.coordinates) {
    deliveryCoordinates = estimateResult.coordinates;
  }

  if (estimateResult.estimate) {
    deliveryEstimate = estimateResult.estimate;
  }
}
```

**Notes**:
- Uses the **first retailer's location** (in multi-retailer orders)
- Wrapped in try-catch to prevent order creation failures
- Logs estimate to console: `📍 Delivery estimate calculated: 5.2 km, 15 mins`

### 4. Environment Configuration

**File**: `docker/docker-compose.dev.yml`

Added Google Maps API key to backend environment:
```yaml
environment:
  - GOOGLE_MAPS_API_KEY=AIzaSyBw4Jss4Nlr2wWzgPWsElawaOIfEEtwcUQ
```

**Security Note**: This key is already used in the frontend. For production, use separate keys with appropriate API restrictions.

### 5. Frontend Display - Retailer View

**File**: `client/src/pages/retailer/OrderManagement.tsx`

**Location**: Inside delivery address section

**Display**:
```tsx
{(order as any).deliveryEstimate && (
  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <h5>Delivery Estimate</h5>
    <div className="grid grid-cols-2 gap-2">
      <div>Distance: {deliveryEstimate.distanceText}</div>
      <div>ETA: {deliveryEstimate.durationText}</div>
    </div>
  </div>
)}
```

**Visibility**: Always visible to retailer for all orders

**Purpose**: Helps retailer:
- Plan delivery logistics
- Estimate delivery costs
- Prioritize nearby orders
- Set realistic delivery expectations

### 6. Frontend Display - Customer View

**File**: `client/src/pages/customer/OrderHistory.tsx`

**Location**: Inside delivery address section in order details modal

**Display**:
```tsx
{((order.masterStatus === 'SHIPPED' || order.status === 'SHIPPED') &&
  (order as any).deliveryEstimate && (
  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
    <h5>On The Way!</h5>
    <p>Distance: {deliveryEstimate.distanceText}</p>
    <p>Estimated Time: {deliveryEstimate.durationText}</p>
  </div>
))}
```

**Visibility**: Only when order status = SHIPPED

**Purpose**: Informs customer:
- Order is on the way
- How far the delivery is
- Approximate time to arrival

## API Usage

### Google Maps Geocoding API

**Request**:
```http
GET https://maps.googleapis.com/maps/api/geocode/json
?address=123+Main+St,+Hyderabad,+Telangana+500001,+India
&key=YOUR_API_KEY
```

**Response** (simplified):
```json
{
  "status": "OK",
  "results": [{
    "geometry": {
      "location": {
        "lat": 17.385044,
        "lng": 78.486671
      }
    }
  }]
}
```

### Google Maps Routes API v2

**Request**:
```http
POST https://routes.googleapis.com/directions/v2:computeRoutes
Headers:
  Content-Type: application/json
  X-Goog-Api-Key: YOUR_API_KEY
  X-Goog-FieldMask: routes.duration,routes.distanceMeters

Body:
{
  "origin": {
    "location": {
      "latLng": {
        "latitude": 17.385044,
        "longitude": 78.486671
      }
    }
  },
  "destination": {
    "location": {
      "latLng": {
        "latitude": 17.445044,
        "longitude": 78.356671
      }
    }
  },
  "travelMode": "DRIVE",
  "routingPreference": "TRAFFIC_AWARE"
}
```

**Response** (simplified):
```json
{
  "routes": [{
    "distanceMeters": 8500,
    "duration": "900s"
  }]
}
```

## Error Handling

1. **Geocoding Failure**:
   - Returns null coordinates
   - Order creation continues without estimate
   - Logged as warning

2. **Routes API Failure**:
   - Returns null estimate
   - Order creation continues
   - Logged as warning

3. **Missing Retailer Location**:
   - Skip estimate calculation
   - Order creation continues
   - No error logged (expected scenario)

4. **Network Errors**:
   - Caught in try-catch
   - Logged as error
   - Order creation continues

**Philosophy**: Delivery estimate is a **nice-to-have** feature, not required for order processing.

## Data Flow Example

### Order Creation
```
Customer places order
  ├─ Delivery Address: "123 Main St, Hyderabad, TS 500001"
  └─ Backend receives order
      ├─ Find retailer location: [17.385044, 78.486671]
      ├─ Geocode delivery address → [17.445044, 78.356671]
      ├─ Calculate route
      │   ├─ Distance: 8500 meters → "8.5 km"
      │   └─ Duration: 900 seconds → "15 mins"
      └─ Save to order:
          ├─ deliveryCoordinates: {lat: 17.445044, lng: 78.356671}
          └─ deliveryEstimate: {
                distanceMeters: 8500,
                distanceText: "8.5 km",
                durationSeconds: 900,
                durationText: "15 mins"
              }
```

### Display to Retailer
```
Retailer views order
  └─ Shows delivery estimate box
      ├─ "Distance: 8.5 km"
      └─ "ETA: 15 mins"
```

### Display to Customer (when shipped)
```
Customer views order
  └─ Status changes to SHIPPED
      └─ Shows "On The Way!" box
          ├─ "Distance: 8.5 km"
          └─ "Estimated Time: 15 mins"
```

## Testing

### Manual Testing

1. **Create Order**:
   - Place an order with a valid delivery address
   - Check backend logs for: `📍 Delivery estimate calculated`
   - Verify order has `deliveryEstimate` field in database

2. **Retailer View**:
   - Login as retailer
   - View order in Order Management
   - Verify delivery estimate box appears

3. **Customer View**:
   - Login as customer
   - View order in My Orders
   - Verify NO estimate shown initially
   - Change order status to SHIPPED (via retailer)
   - Refresh customer view
   - Verify "On The Way!" box appears

### Edge Cases

1. **Invalid Address**: Geocoding fails, no estimate stored
2. **No Retailer Location**: Estimate not calculated
3. **API Key Missing**: Logs warning, continues without estimate
4. **API Rate Limit**: Returns error, order still created

## Performance Considerations

1. **API Calls**: 2 calls per order (Geocoding + Routes)
2. **Response Time**: ~500ms - 2s depending on Google's API
3. **Caching**: Not implemented (each order is unique)
4. **Async**: Calculation is synchronous during order creation (could be optimized to run async in background)

## Future Enhancements

1. **Real-Time Updates**: Recalculate estimate when status changes to SHIPPED
2. **Multiple Retailers**: Calculate separate estimates for each sub-order
3. **Delivery Window**: Provide time window instead of single estimate
4. **Traffic Updates**: Re-calculate with current traffic when shipped
5. **Alternative Routes**: Show fastest vs shortest route options
6. **Delivery Person Tracking**: Integrate with GPS tracking
7. **SMS Notifications**: Send estimate via SMS when shipped

## Cost Considerations

### Google Maps API Pricing (as of 2024)

- **Geocoding API**: $5 per 1,000 requests
- **Routes API**: $5 per 1,000 requests
- **Total per Order**: ~$0.01 (2 API calls)

**Monthly Estimates**:
- 100 orders/month: ~$1
- 1,000 orders/month: ~$10
- 10,000 orders/month: ~$100

**Free Tier**: $200/month credit = ~20,000 orders/month free

## Troubleshooting

### Estimate Not Showing

1. Check if `GOOGLE_MAPS_API_KEY` is set in environment
2. Verify retailer has location set (`user.profile.location.coordinates`)
3. Check delivery address is valid and geocodable
4. Review backend logs for errors during order creation

### Incorrect Estimate

1. Verify retailer location is accurate
2. Check if delivery address was geocoded correctly
3. Consider traffic conditions (estimate uses TRAFFIC_AWARE mode)
4. Distance/duration is calculated, not real delivery time

### API Errors

1. Check API key has correct permissions enabled:
   - Geocoding API
   - Routes API
2. Verify no API quota limits reached
3. Check network connectivity from server to Google APIs

## Files Modified

### Backend
- `server/src/models/Order.model.ts` - Added delivery fields
- `server/src/services/delivery.service.ts` - NEW: Delivery estimation logic
- `server/src/services/order.service.ts` - Integrated delivery calculation
- `docker/docker-compose.dev.yml` - Added GOOGLE_MAPS_API_KEY

### Frontend
- `client/src/pages/retailer/OrderManagement.tsx` - Display estimate (always)
- `client/src/pages/customer/OrderHistory.tsx` - Display estimate (when shipped)

## Summary

This feature enhances the order experience by providing realistic delivery estimates using Google Maps APIs. It helps retailers plan logistics and keeps customers informed when their order is on the way. The implementation is resilient - if the estimate fails to calculate, order processing continues normally.
