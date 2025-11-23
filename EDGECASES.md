# Edge Case Handling - Live MART E-Commerce Platform

## Overview

This document outlines how the Live MART platform handles edge cases and error scenarios across all major features. Proper edge case handling ensures a robust, user-friendly experience and prevents system failures.

---

## 1. AUTHENTICATION & REGISTRATION

### 1.1 Duplicate Email Registration

**Edge Case**: User tries to register with an email that already exists

**Handling**:
- **Location**: `server/src/services/auth.service.ts:61-65`
- **Validation**: Database query checks for existing email before registration
- **Response**: HTTP 409 (Conflict) with message "User with this email already exists"
- **User Impact**: Clear error message prompting user to log in or use different email

**Code**:
```typescript
const existingUser = await User.findOne({ email: data.email });
if (existingUser) {
  throw new Error('User with this email already exists');
}
```

---

### 1.2 OAuth with Existing Email

**Edge Case**: User signs in with Google/Facebook OAuth using an email that's already registered with password

**Handling**:
- **Location**: `server/src/services/oauth.service.ts:55-73`
- **Validation**: Checks for existing user by email OR OAuth provider ID
- **Behavior**:
  - If email exists: Links OAuth account to existing user (doesn't create duplicate)
  - Updates OAuth data in existing user profile
  - Returns existing user's tokens
- **User Impact**: Seamless login experience, no duplicate accounts

**Code**:
```typescript
let user = await User.findOne({
  $or: [
    { 'oauth.google.id': profile.id },
    { email: profile.emails?.[0]?.value },
  ],
});

if (user) {
  // Link OAuth to existing account
  if (!user.oauth?.google?.id) {
    user.oauth = {
      ...user.oauth,
      google: { id: profile.id, email: profile.emails?.[0]?.value || '' },
    };
    await user.save();
  }
}
```

---

### 1.3 Password Mismatch

**Edge Case**: User enters different values for password and confirm password during registration

**Handling**:
- **Location**: `server/src/services/auth.service.ts:50-53`
- **Validation**: Compares password and confirmPassword before processing
- **Response**: HTTP 400 with message "Passwords do not match"
- **User Impact**: Immediate feedback before any database operations

**Code**:
```typescript
if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
  throw new Error('Passwords do not match');
}
```

---

### 1.4 Invalid Email Format

**Edge Case**: User enters malformed email address (e.g., "user@", "email.com", "user@domain")

**Handling**:
- **Location**: `server/src/services/auth.service.ts:55-59`
- **Validation**: Regex pattern validation
- **Response**: HTTP 400 with message "Invalid email format"
- **User Impact**: Prevents registration with unusable email addresses

**Code**:
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(data.email)) {
  throw new Error('Invalid email format');
}
```

---

### 1.5 Duplicate Phone Number

**Edge Case**: Customer tries to register with a phone number already in use

**Handling**:
- **Location**: `server/src/services/auth.service.ts:71-76`
- **Validation**: Database query checks for existing phone number
- **Response**: HTTP 409 with message "Phone number already registered"
- **User Impact**: Prevents SMS OTP conflicts and duplicate accounts

---

### 1.6 Invalid/Expired Tokens

**Edge Case**: User tries to access protected routes with expired or invalid JWT tokens

**Handling**:
- **Location**: `server/src/middleware/auth.middleware.ts`
- **Validation**: JWT signature and expiration verification
- **Response**: HTTP 401 (Unauthorized) with message "Token expired" or "Invalid token"
- **User Impact**: Automatic redirect to login page on frontend

---

### 1.7 Deactivated User Login

**Edge Case**: User account has been deactivated by admin but user tries to log in

**Handling**:
- **Location**: `server/src/services/auth.service.ts` (login method)
- **Validation**: Checks `isActive` flag on user account
- **Response**: HTTP 403 (Forbidden) with message "Account has been deactivated"
- **User Impact**: Clear message that account is disabled, can contact support

---

## 2. ORDER MANAGEMENT

### 2.1 Empty Cart/Order

**Edge Case**: User tries to place order with no items

**Handling**:
- **Location**: `server/src/controllers/order.controller.ts:33-36`
- **Validation**: Checks if items array exists and has length > 0
- **Response**: HTTP 400 with message "Order must contain at least one item"
- **User Impact**: Cannot proceed with empty order

**Code**:
```typescript
if (!items || !Array.isArray(items) || items.length === 0) {
  res.status(400).json({ success: false, message: 'Order must contain at least one item' });
  return;
}
```

---

### 2.2 Negative or Zero Quantity

**Edge Case**: User somehow submits order with quantity ≤ 0 or non-integer quantity

**Handling**:
- **Location**: `server/src/controllers/order.controller.ts:44-51`
- **Validation**: Checks each item's quantity is positive integer
- **Response**: HTTP 400 with specific message about invalid quantity
- **User Impact**: Order rejected before inventory reservation

**Code**:
```typescript
if (!item.quantity || item.quantity <= 0) {
  res.status(400).json({ success: false, message: 'Item quantity must be greater than 0' });
  return;
}
if (!Number.isInteger(item.quantity)) {
  res.status(400).json({ success: false, message: 'Item quantity must be a whole number' });
  return;
}
```

---

### 2.3 Out of Stock Items

**Edge Case**: Product goes out of stock between adding to cart and checkout

**Handling**:
- **Location**: `server/src/services/order.service.ts:98-102`
- **Validation**: Real-time stock check during order creation
- **Behavior**:
  - Calculates available stock (currentStock - reservedStock)
  - Compares with requested quantity
  - Rejects order if insufficient
- **Response**: HTTP 400 with message "Insufficient stock for [Product]. Available: X"
- **User Impact**: Clear error message with available quantity

**Code**:
```typescript
const availableStock = inventory.currentStock - inventory.reservedStock;
if (availableStock < item.quantity) {
  throw new Error(`Insufficient stock for "${product.name}". Available: ${availableStock}`);
}
```

---

### 2.4 Missing Product ID

**Edge Case**: Order item submitted without product ID

**Handling**:
- **Location**: `server/src/controllers/order.controller.ts:40-43`
- **Validation**: Checks each item has productId field
- **Response**: HTTP 400 with message "Each item must have a productId"
- **User Impact**: Prevents malformed orders from being created

---

### 2.5 Incomplete Delivery Address

**Edge Case**: User submits order with missing address fields (no street, city, etc.)

**Handling**:
- **Location**: `server/src/controllers/order.controller.ts:54-57`
- **Validation**: Checks required address fields (street, city)
- **Response**: HTTP 400 with message "Complete delivery address is required"
- **User Impact**: Cannot proceed without full address

---

### 2.6 Order Cancellation After Shipment

**Edge Case**: Customer tries to cancel order that has already shipped

**Handling**:
- **Location**: `server/src/models/Order.model.ts:496-506` (cancel method)
- **Validation**: Checks order status before cancellation
- **Response**: Error "Cannot cancel delivered order"
- **User Impact**: Clear message that order is too far in fulfillment process

---

## 3. INVENTORY MANAGEMENT

### 3.1 Negative Stock Values

**Edge Case**: Retailer tries to set negative stock quantity

**Handling**:
- **Location**: `server/src/controllers/inventory.controller.ts:77-83`
- **Validation**: Checks currentStock ≥ 0 and is integer
- **Response**: HTTP 400 with message "Current stock must be a non-negative integer"
- **User Impact**: Prevents inventory database corruption

**Code**:
```typescript
if (currentStock !== undefined && (currentStock < 0 || !Number.isInteger(currentStock))) {
  res.status(400).json({
    success: false,
    message: 'Current stock must be a non-negative integer',
  });
  return;
}
```

---

### 3.2 Negative Selling Price

**Edge Case**: Retailer tries to set negative price for product

**Handling**:
- **Location**: `server/src/controllers/inventory.controller.ts:93-99`
- **Validation**: Checks sellingPrice ≥ 0
- **Response**: HTTP 400 with message "Selling price must be non-negative"
- **User Impact**: Prevents pricing errors

---

### 3.3 Duplicate Inventory Creation

**Edge Case**: Retailer tries to create inventory for a product they already have in inventory

**Handling**:
- **Location**: `server/src/controllers/inventory.controller.ts:95-107`
- **Validation**: Database query checks for existing inventory entry
- **Response**: HTTP 400 with message "Inventory already exists for this product"
- **User Impact**: User should update existing inventory instead

---

### 3.4 Invalid Reorder Level

**Edge Case**: Setting non-integer or negative reorder threshold

**Handling**:
- **Location**: `server/src/controllers/inventory.controller.ts:85-91`
- **Validation**: Checks reorderLevel ≥ 0 and is integer
- **Response**: HTTP 400 with message "Reorder level must be a non-negative integer"
- **User Impact**: Ensures low-stock alerts work correctly

---

## 4. PRODUCT REVIEWS

### 4.1 Duplicate Reviews

**Edge Case**: Customer tries to review the same product from the same order twice

**Handling**:
- **Location**: `server/src/services/review.service.ts:77-85`
- **Validation**: Checks for existing review by user for product in specific order
- **Database**: Compound unique index prevents duplicates
- **Response**: HTTP 409 with message "You have already reviewed this product from this order"
- **User Impact**: One review per product per order (can review same product from different orders)

---

### 4.2 Invalid Rating Range

**Edge Case**: User submits rating outside 1-5 range or non-numeric rating

**Handling**:
- **Location**: `server/src/controllers/review.controller.ts:36-44`
- **Validation**: Parses rating and checks 1 ≤ rating ≤ 5
- **Response**: HTTP 400 with message "Rating must be a number between 1 and 5"
- **User Impact**: Only valid star ratings accepted

**Code**:
```typescript
const ratingNum = parseFloat(rating);
if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
  res.status(400).json({
    success: false,
    message: 'Rating must be a number between 1 and 5',
  });
  return;
}
```

---

### 4.3 Review Before Delivery

**Edge Case**: Customer tries to review product before order is delivered

**Handling**:
- **Location**: `server/src/services/review.service.ts:70-76`
- **Validation**: Checks order status is DELIVERED
- **Response**: Error "Can only review delivered orders"
- **User Impact**: Must wait until product is received

---

### 4.4 Reviewing Product Not in Order

**Edge Case**: User tries to review a product they didn't actually purchase

**Handling**:
- **Location**: `server/src/services/review.service.ts`
- **Validation**: Verifies product exists in specified order
- **Response**: Error "Product not found in order"
- **User Impact**: Can only review purchased products

---

## 5. DISCOUNT & PROMO CODES

### 5.1 Expired Promo Code

**Edge Case**: Customer applies promo code that has expired

**Handling**:
- **Location**: `server/src/services/discount.service.ts`
- **Validation**: Checks current date against code's validFrom and validUntil
- **Response**: Error "Promo code has expired"
- **User Impact**: Cannot use expired codes

---

### 5.2 Promo Code Usage Limit Exceeded

**Edge Case**: Customer tries to use promo code that has reached maximum usage

**Handling**:
- **Location**: `server/src/services/discount.service.ts`
- **Validation**: Checks usageCount against maxUsage
- **Response**: Error "Promo code usage limit exceeded"
- **User Impact**: Code no longer applicable

---

### 5.3 Minimum Order Not Met

**Edge Case**: Promo code requires minimum order value of ₹500, cart is only ₹300

**Handling**:
- **Location**: `server/src/services/discount.service.ts`
- **Validation**: Compares order total against minOrderValue
- **Response**: Error "Minimum order value of ₹X required for this code"
- **User Impact**: User must add more items to qualify

---

## 6. PAYMENT PROCESSING

### 6.1 Payment Gateway Timeout

**Edge Case**: Razorpay API times out during payment processing

**Handling**:
- **Location**: `server/src/services/razorpay.service.ts`
- **Behavior**:
  - Error caught and logged
  - Order status remains PENDING
  - Payment status marked as FAILED
- **User Impact**: User can retry payment for same order

---

### 6.2 Payment Verification Mismatch

**Edge Case**: Razorpay signature verification fails (potential fraud attempt)

**Handling**:
- **Location**: `server/src/services/razorpay.service.ts`
- **Validation**: Compares received signature with generated signature
- **Behavior**: Rejects payment, marks as FAILED
- **Security**: Prevents payment manipulation attacks

---

### 6.3 Double Payment Prevention

**Edge Case**: User clicks "Pay" button multiple times

**Handling**:
- **Location**: Frontend button disabling + backend idempotency
- **Validation**: Checks if order already has completed payment
- **Response**: Error "Order payment already completed"
- **User Impact**: No duplicate charges

---

## 7. REAL-TIME FEATURES

### 7.1 WebSocket Connection Failure

**Edge Case**: Socket.IO connection fails or disconnects

**Handling**:
- **Location**: `client/src/contexts/SocketContext.tsx`
- **Behavior**:
  - Automatic reconnection attempts
  - Fallback to polling
  - Offline notifications queued in database
- **User Impact**: Notifications still delivered via page refresh or email/SMS

---

### 7.2 Notification Send Failure

**Edge Case**: Email or SMS notification fails to send

**Handling**:
- **Location**: `server/src/services/notification.service.ts`
- **Behavior**:
  - Error logged but doesn't block order processing
  - In-app notification still created
  - User can still check order status manually
- **User Impact**: Core functionality unaffected

---

## 8. FILE UPLOADS

### 8.1 Oversized Image Upload

**Edge Case**: User tries to upload 50MB product image

**Handling**:
- **Location**: Multer middleware configuration
- **Validation**: File size limit (e.g., 5MB per file)
- **Response**: HTTP 400 with message "File size exceeds limit"
- **User Impact**: Must resize image before upload

---

### 8.2 Invalid File Type

**Edge Case**: User uploads .exe file as product image

**Handling**:
- **Location**: Multer file filter
- **Validation**: Checks file mimetype (image/jpeg, image/png, etc.)
- **Response**: HTTP 400 with message "Only image files are allowed"
- **User Impact**: Only valid image formats accepted

---

### 8.3 Cloudinary Upload Failure

**Edge Case**: Cloudinary API fails or quota exceeded

**Handling**:
- **Location**: `server/src/utils/cloudinary.upload.ts`
- **Behavior**:
  - Error caught and logged
  - Returns error to user
  - No database entry created
- **User Impact**: Clear error message, can retry

---

## 9. SEARCH & FILTERING

### 9.1 No Search Results

**Edge Case**: User searches for "fidget spinners" but no products match

**Handling**:
- **Location**: `client/src/pages/customer/ProductBrowse.tsx`
- **UI**: Displays "No products found" message with search tips
- **Behavior**: Suggests checking spelling or broadening search
- **User Impact**: Friendly empty state instead of blank page

---

### 9.2 Invalid Price Range

**Edge Case**: User sets min price > max price (e.g., ₹1000 - ₹500)

**Handling**:
- **Location**: Frontend validation
- **Behavior**: Automatically swaps values or shows validation error
- **User Impact**: Logical price filtering

---

### 9.3 Elasticsearch Connection Failure

**Edge Case**: Elasticsearch service is down

**Handling**:
- **Location**: `server/src/services/elasticsearch.service.ts`
- **Fallback**: Switch to MongoDB text search
- **User Impact**: Search still works, just slower and less accurate

---

## 10. MULTI-RETAILER ORDERS

### 10.1 One Retailer Out of Stock

**Edge Case**: Cart has items from Retailer A (in stock) and Retailer B (out of stock)

**Handling**:
- **Location**: `server/src/services/order.service.ts`
- **Behavior**:
  - Order creation fails entirely
  - Clear error message identifies which product is unavailable
  - No partial order creation
- **User Impact**: User must remove out-of-stock items to proceed

---

### 10.2 Different Shipping Dates

**Edge Case**: Two retailers set different expected shipping dates for same order

**Handling**:
- **Location**: Calendar integration system
- **Behavior**:
  - Separate calendar events created for each sub-order
  - Customer receives multiple calendar invites
  - Each shows respective retailer's shipping date
- **User Impact**: Clear visibility into each package's timeline

---

## 11. LOCATION-BASED FEATURES

### 11.1 Invalid Coordinates

**Edge Case**: Google Maps returns invalid lat/lng for address

**Handling**:
- **Location**: `server/src/services/location.service.ts`
- **Behavior**:
  - Validation check for valid coordinate ranges
  - Fallback to city-level geocoding
- **User Impact**: Estimated delivery still calculated

---

### 11.2 Address Geocoding Failure

**Edge Case**: Delivery address "123 Fake Street, Nowhere" cannot be geocoded

**Handling**:
- **Location**: `server/src/services/delivery.service.ts`
- **Fallback**:
  - Tries simplified address (just city)
  - Uses city center coordinates
  - Haversine distance calculation
- **User Impact**: Order still created, rough delivery estimate provided

---

## 12. B2B MARKETPLACE

### 12.1 Retailer Orders from Self

**Edge Case**: Retailer tries to place B2B order for their own products

**Handling**:
- **Location**: B2B order service
- **Validation**: Checks retailerId !== wholesalerId
- **Response**: Error "Cannot order from yourself"
- **User Impact**: Prevented circular ordering

---

## 13. CONCURRENT OPERATIONS

### 13.1 Race Condition on Last Item

**Edge Case**: Two customers try to buy the last item simultaneously

**Handling**:
- **Location**: `server/src/models/Inventory.model.ts` (reserveStock method)
- **Mechanism**: Atomic MongoDB operations with optimistic locking
- **Behavior**:
  - First request succeeds
  - Second request gets "Insufficient stock" error
- **User Impact**: Fair first-come-first-served

---

### 13.2 Simultaneous Inventory Updates

**Edge Case**: Retailer updates stock while customer is placing order

**Handling**:
- **Location**: Database transaction with inventory locking
- **Mechanism**: MongoDB atomic operations
- **Behavior**: Operations queued, no data corruption
- **User Impact**: Consistent inventory state

---

## SUMMARY

### Edge Cases Handled: 40+

### Categories Covered:
1. ✅ Authentication (7 edge cases)
2. ✅ Orders (6 edge cases)
3. ✅ Inventory (4 edge cases)
4. ✅ Reviews (4 edge cases)
5. ✅ Discounts (3 edge cases)
6. ✅ Payments (3 edge cases)
7. ✅ Real-time (2 edge cases)
8. ✅ File Uploads (3 edge cases)
9. ✅ Search (3 edge cases)
10. ✅ Multi-Retailer (2 edge cases)
11. ✅ Location (2 edge cases)
12. ✅ B2B (1 edge case)
13. ✅ Concurrency (2 edge cases)

### Validation Levels:
- **Frontend**: Basic UI validation (prevents common errors)
- **Backend**: Comprehensive server-side validation (security & data integrity)
- **Database**: Schema constraints & unique indexes (final safety net)

### Error Response Format:
All edge cases return consistent error responses:
```json
{
  "success": false,
  "message": "Clear, user-friendly error description"
}
```

### HTTP Status Codes Used:
- **400** (Bad Request): Invalid input, validation failure
- **401** (Unauthorized): Authentication required
- **403** (Forbidden): Permission denied
- **404** (Not Found): Resource doesn't exist
- **409** (Conflict): Duplicate entry, constraint violation
- **500** (Server Error): Unexpected system failure

---

## TESTING RECOMMENDATIONS

### Manual Testing Checklist:
- [ ] Try registering with existing email
- [ ] Submit order with 0 quantity
- [ ] Apply expired promo code
- [ ] Upload oversized image
- [ ] Search for non-existent product
- [ ] Set negative inventory stock
- [ ] Submit review with rating 0 or 10
- [ ] Place order for out-of-stock item
- [ ] Cancel order after delivery
- [ ] Enter mismatched passwords during registration

### Automated Testing:
Consider adding integration tests for critical edge cases:
- Authentication flows
- Order creation with invalid data
- Inventory stock validation
- Payment verification

---

**Document Created**: November 23, 2025
**Last Updated**: November 23, 2025
**Coverage**: 40+ edge cases across 13 feature categories
