# LiveMart E-Commerce Application - Comprehensive Testing Strategy

## Table of Contents
1. [Testing Overview](#testing-overview)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End Tests](#end-to-end-tests)
5. [Test Infrastructure](#test-infrastructure)
6. [Testing Tools & Frameworks](#testing-tools--frameworks)
7. [Test Data Management](#test-data-management)
8. [CI/CD Integration](#cicd-integration)

---

## Testing Overview

### Testing Pyramid
```
           /\
          /  \  E2E Tests (10-20%)
         /    \
        /------\  Integration Tests (20-30%)
       /        \
      /----------\  Unit Tests (50-70%)
     /____________\
```

### Test Coverage Goals
- **Unit Tests**: 80% code coverage
- **Integration Tests**: Cover all API endpoints and service integrations
- **E2E Tests**: Cover critical user journeys for all user types

### Testing Environments
- **Local Development**: Docker Compose with test databases
- **CI/CD**: GitHub Actions with containerized services
- **Staging**: Pre-production environment with production-like data

---

## Unit Tests

### Backend Unit Tests (Jest + Supertest)

#### 1. Authentication & Authorization (`server/src/tests/unit/auth/`)

**auth.service.test.ts**
- [ ] `registerUser()` - Creates user with valid data
- [ ] `registerUser()` - Throws error for duplicate email
- [ ] `registerUser()` - Throws error for duplicate phone
- [ ] `registerUser()` - Hashes password correctly
- [ ] `registerUser()` - Creates customer profile for CUSTOMER user type
- [ ] `registerUser()` - Creates retailer profile for RETAILER user type
- [ ] `registerUser()` - Creates wholesaler profile for WHOLESALER user type
- [ ] `login()` - Returns tokens for valid credentials
- [ ] `login()` - Throws error for invalid email
- [ ] `login()` - Throws error for invalid password
- [ ] `login()` - Throws error for unverified retailer/wholesaler
- [ ] `refreshToken()` - Returns new access token with valid refresh token
- [ ] `refreshToken()` - Throws error for blacklisted token
- [ ] `logout()` - Blacklists token successfully
- [ ] `logoutAll()` - Blacklists all user tokens
- [ ] `forgotPassword()` - Sends reset email
- [ ] `resetPassword()` - Resets password with valid token
- [ ] `resetPassword()` - Throws error for expired token
- [ ] `verifyEmail()` - Marks email as verified
- [ ] `updateProfile()` - Updates user profile data
- [ ] `updatePassword()` - Changes password successfully
- [ ] `updatePassword()` - Throws error for incorrect old password

**otp.service.test.ts**
- [ ] `generateOTP()` - Generates 6-digit OTP
- [ ] `generateOTP()` - Stores OTP in Redis with expiry
- [ ] `sendOTP()` - Sends SMS via Twilio successfully
- [ ] `sendOTP()` - Falls back to email if SMS fails
- [ ] `verifyOTP()` - Returns true for valid OTP
- [ ] `verifyOTP()` - Returns false for invalid OTP
- [ ] `verifyOTP()` - Returns false for expired OTP
- [ ] `verifyOTP()` - Deletes OTP after successful verification
- [ ] `resendOTP()` - Rate limits OTP requests (max 3 per 10 min)
- [ ] `resendOTP()` - Extends expiry on resend

**oauth.service.test.ts**
- [ ] `handleGoogleOAuth()` - Creates/updates user with Google profile
- [ ] `handleGoogleOAuth()` - Links Google account to existing user
- [ ] `handleFacebookOAuth()` - Creates/updates user with Facebook profile
- [ ] `generateOAuthTokens()` - Returns access and refresh tokens

**jwt.utils.test.ts**
- [ ] `generateAccessToken()` - Creates valid JWT with user payload
- [ ] `generateRefreshToken()` - Creates refresh token with extended expiry
- [ ] `verifyToken()` - Validates token signature
- [ ] `verifyToken()` - Throws error for expired token
- [ ] `verifyToken()` - Throws error for malformed token
- [ ] `decodeToken()` - Extracts payload without verification

---

#### 2. User Management (`server/src/tests/unit/user/`)

**user.service.test.ts**
- [ ] `getUserById()` - Returns user by ID
- [ ] `getUserById()` - Throws error for non-existent user
- [ ] `getUserByEmail()` - Returns user by email
- [ ] `updateUser()` - Updates user fields
- [ ] `updateUser()` - Validates email uniqueness on update
- [ ] `deleteUser()` - Soft deletes user (isActive = false)
- [ ] `getUserProfile()` - Returns public profile info
- [ ] `updateLocation()` - Updates user GeoJSON coordinates
- [ ] `updateLocation()` - Validates coordinates range

**customer.service.test.ts**
- [ ] `createCustomerProfile()` - Creates customer with default values
- [ ] `addToWishlist()` - Adds product to wishlist array
- [ ] `addToWishlist()` - Prevents duplicate products in wishlist
- [ ] `removeFromWishlist()` - Removes product from wishlist
- [ ] `addLoyaltyPoints()` - Increments loyalty points
- [ ] `redeemLoyaltyPoints()` - Decrements loyalty points
- [ ] `redeemLoyaltyPoints()` - Throws error for insufficient points

**retailer.service.test.ts**
- [ ] `createRetailerProfile()` - Creates retailer with store info
- [ ] `updateStoreInfo()` - Updates store details
- [ ] `updateOperatingHours()` - Updates business hours
- [ ] `updateDeliveryRadius()` - Sets delivery radius in km
- [ ] `calculateStoreRating()` - Computes average rating

**wholesaler.service.test.ts**
- [ ] `createWholesalerProfile()` - Creates wholesaler profile
- [ ] `addDistributionCenter()` - Adds new location
- [ ] `removeDistributionCenter()` - Removes location
- [ ] `updatePricingStrategy()` - Changes pricing strategy
- [ ] `setRetailerCreditLimit()` - Sets credit limit for retailer
- [ ] `checkCreditLimit()` - Validates available credit

---

#### 3. Product Management (`server/src/tests/unit/product/`)

**product.service.test.ts**
- [ ] `createProduct()` - Creates product with all fields
- [ ] `createProduct()` - Sets default values for optional fields
- [ ] `createProduct()` - Validates required fields
- [ ] `createProduct()` - Associates product with creator
- [ ] `updateProduct()` - Updates product details
- [ ] `updateProduct()` - Only allows owner to update
- [ ] `deleteProduct()` - Soft deletes product (isActive = false)
- [ ] `getProductById()` - Returns product with populated fields
- [ ] `getProductsByCategory()` - Filters by category
- [ ] `getProductsByCategory()` - Filters by subcategory
- [ ] `getSellerProducts()` - Returns products by creator
- [ ] `updateProductRating()` - Recalculates average rating
- [ ] `updateProductRating()` - Updates review count

**product.validation.test.ts**
- [ ] Validates product name (required, 3-200 chars)
- [ ] Validates base price (required, positive number)
- [ ] Validates unit (required, valid enum)
- [ ] Validates category structure
- [ ] Validates image URLs (valid URL format)
- [ ] Validates bulk pricing tiers (ascending quantity)
- [ ] Validates minimum order quantity (positive integer)

---

#### 4. Search & Elasticsearch (`server/src/tests/unit/search/`)

**elasticsearch.service.test.ts**
- [ ] `indexProduct()` - Adds product to Elasticsearch
- [ ] `updateProduct()` - Updates indexed product
- [ ] `deleteProduct()` - Removes product from index
- [ ] `searchProducts()` - Performs fuzzy text search
- [ ] `searchProducts()` - Applies category filter
- [ ] `searchProducts()` - Applies price range filter
- [ ] `searchProducts()` - Applies rating filter
- [ ] `searchProducts()` - Sorts by relevance score
- [ ] `searchProducts()` - Sorts by price (asc/desc)
- [ ] `searchProducts()` - Sorts by rating
- [ ] `searchProducts()` - Paginates results
- [ ] `getAutocompleteSuggestions()` - Returns top 10 suggestions
- [ ] `getAutocompleteSuggestions()` - Uses edge n-grams
- [ ] `searchNearby()` - Performs geospatial search
- [ ] `searchNearby()` - Filters by distance radius
- [ ] `comparePrices()` - Finds same product across sellers
- [ ] `syncAllProducts()` - Bulk indexes products from MongoDB

**searchParser.utils.test.ts**
- [ ] `parseSearchQuery()` - Extracts keywords
- [ ] `parseSearchQuery()` - Identifies category filters
- [ ] `parseSearchQuery()` - Identifies price ranges ("under 100", "50-100")
- [ ] `parseSearchQuery()` - Identifies location queries ("near me")
- [ ] `buildElasticsearchQuery()` - Constructs bool query
- [ ] `buildElasticsearchQuery()` - Adds fuzzy matching
- [ ] `buildElasticsearchQuery()` - Adds boosting for exact matches

---

#### 5. Order Management (`server/src/tests/unit/order/`)

**order.service.test.ts**
- [ ] `createOrder()` - Creates order from cart items
- [ ] `createOrder()` - Reserves inventory stock
- [ ] `createOrder()` - Calculates total price correctly
- [ ] `createOrder()` - Applies discounts
- [ ] `createOrder()` - Validates stock availability
- [ ] `createOrder()` - Throws error for out-of-stock items
- [ ] `updateOrderStatus()` - Updates status and adds tracking entry
- [ ] `updateOrderStatus()` - Only allows valid status transitions
- [ ] `updateOrderStatus()` - Sends notification on status change
- [ ] `cancelOrder()` - Cancels order and releases reserved stock
- [ ] `cancelOrder()` - Only allows cancellation in PENDING/CONFIRMED status
- [ ] `cancelOrder()` - Initiates refund if payment completed
- [ ] `markOrderAsPaid()` - Updates payment status to COMPLETED
- [ ] `getOrderById()` - Returns order with populated items
- [ ] `getCustomerOrders()` - Returns customer's orders
- [ ] `getSellerOrders()` - Returns seller's orders
- [ ] `getReviewableItems()` - Returns delivered items without reviews

**order.validation.test.ts**
- [ ] Validates order items array (not empty)
- [ ] Validates delivery address (required fields)
- [ ] Validates payment method (valid enum)
- [ ] Validates quantities (positive integers)
- [ ] Validates scheduled delivery date (future date)

---

#### 6. B2B Wholesale Orders (`server/src/tests/unit/wholesalerOrder/`)

**wholesalerOrder.service.test.ts**
- [ ] `createB2BOrder()` - Creates wholesale order
- [ ] `createB2BOrder()` - Applies volume discounts
- [ ] `createB2BOrder()` - Validates minimum order value
- [ ] `createB2BOrder()` - Checks retailer credit limit
- [ ] `confirmOrder()` - Wholesaler confirms order
- [ ] `confirmOrder()` - Only allows wholesaler to confirm
- [ ] `rejectOrder()` - Wholesaler rejects with reason
- [ ] `updateOrderStatus()` - Updates status with tracking
- [ ] `cancelOrder()` - Retailer cancels order
- [ ] `cancelOrder()` - Only allows cancellation before SHIPPED
- [ ] `markAsPaid()` - Wholesaler marks payment received
- [ ] `notifyPaymentSent()` - Retailer notifies payment sent
- [ ] `generateInvoice()` - Creates PDF invoice
- [ ] `getRetailerNetwork()` - Returns wholesaler's retailers
- [ ] `getWholesalerStats()` - Calculates sales metrics

---

#### 7. Payment Processing (`server/src/tests/unit/payment/`)

**payment.service.test.ts**
- [ ] `initiatePayment()` - Creates UPI transaction
- [ ] `initiatePayment()` - Generates QR code
- [ ] `initiatePayment()` - Creates payment deep link
- [ ] `initiatePayment()` - Sets expiry (15 minutes)
- [ ] `verifyPayment()` - Checks payment status with gateway
- [ ] `verifyPayment()` - Updates transaction status
- [ ] `verifyPayment()` - Updates order payment status
- [ ] `handleCallback()` - Processes gateway webhook
- [ ] `handleCallback()` - Validates signature
- [ ] `handleCallback()` - Handles success response
- [ ] `handleCallback()` - Handles failure response
- [ ] `handleCallback()` - Handles timeout
- [ ] `initiateRefund()` - Creates refund transaction
- [ ] `initiateRefund()` - Updates payment status to REFUND_INITIATED
- [ ] `processRefund()` - Completes refund
- [ ] `getTransactionById()` - Returns transaction details
- [ ] `getPaymentStatistics()` - Calculates seller payment metrics

**upiTransaction.model.test.ts**
- [ ] `isExpired()` - Returns true after 15 minutes
- [ ] `canRefund()` - Returns true for SUCCESS status
- [ ] `calculateFees()` - Computes gateway fees

---

#### 8. Inventory Management (`server/src/tests/unit/inventory/`)

**inventory.service.test.ts**
- [ ] `createInventory()` - Creates inventory entry
- [ ] `updateStock()` - Updates current stock
- [ ] `reserveStock()` - Reserves stock for order
- [ ] `reserveStock()` - Throws error if insufficient stock
- [ ] `releaseReservedStock()` - Releases reserved stock
- [ ] `confirmReservedStock()` - Confirms reservation on order completion
- [ ] `getStockStatus()` - Returns OUT_OF_STOCK, LOW_STOCK, or IN_STOCK
- [ ] `checkReorderLevel()` - Triggers alert if below threshold
- [ ] `applyDiscount()` - Applies discount to price
- [ ] `calculateFinalPrice()` - Returns price after discount
- [ ] `getSellerInventory()` - Returns seller's inventory
- [ ] `trackB2BOrder()` - Links inventory to B2B source

---

#### 9. Review System (`server/src/tests/unit/review/`)

**review.service.test.ts**
- [ ] `createReview()` - Creates review for verified purchase
- [ ] `createReview()` - Throws error for non-verified purchase
- [ ] `createReview()` - Throws error for duplicate review (same product/order)
- [ ] `createReview()` - Updates product rating
- [ ] `updateReview()` - Updates review within 48 hours
- [ ] `updateReview()` - Throws error after edit window
- [ ] `updateReview()` - Only allows owner to update
- [ ] `deleteReview()` - Deletes review
- [ ] `deleteReview()` - Updates product rating
- [ ] `voteHelpful()` - Adds helpful vote
- [ ] `voteHelpful()` - Removes vote if already voted
- [ ] `voteNotHelpful()` - Adds not helpful vote
- [ ] `flagReview()` - Flags review with reason
- [ ] `flagReview()` - Auto-hides after 3 flags
- [ ] `addRetailerResponse()` - Only allows product owner to respond
- [ ] `moderateReview()` - Admin approves/rejects flagged review
- [ ] `getProductReviews()` - Returns paginated reviews
- [ ] `getUserReviews()` - Returns user's reviews
- [ ] `getRatingDistribution()` - Calculates star distribution

**review.validation.test.ts**
- [ ] Validates rating (required, 1-5 range)
- [ ] Validates title (max 100 chars)
- [ ] Validates comment (max 2000 chars)
- [ ] Validates images (max 5, valid URLs)
- [ ] Validates flag reason (required for flagging)

---

#### 10. Notification System (`server/src/tests/unit/notification/`)

**notification.service.test.ts**
- [ ] `createNotification()` - Creates notification
- [ ] `createNotification()` - Emits via Socket.IO if user online
- [ ] `sendOrderNotification()` - Sends ORDER type notification
- [ ] `sendPaymentNotification()` - Sends PAYMENT type notification
- [ ] `sendDeliveryNotification()` - Sends DELIVERY type notification
- [ ] `markAsRead()` - Marks single notification as read
- [ ] `markAllAsRead()` - Marks all user notifications as read
- [ ] `archiveNotification()` - Archives notification
- [ ] `deleteNotification()` - Deletes notification
- [ ] `getUnreadCount()` - Returns count of unread notifications
- [ ] `getNotifications()` - Returns paginated notifications
- [ ] `deleteExpired()` - Removes expired notifications (cron job)

**socket.service.test.ts**
- [ ] `emitToUser()` - Sends event to user room
- [ ] `joinUserRoom()` - Adds socket to user-specific room
- [ ] `leaveUserRoom()` - Removes socket from room
- [ ] `broadcastOrderUpdate()` - Notifies all parties (customer, retailer)
- [ ] `handleConnection()` - Handles new Socket.IO connection
- [ ] `handleDisconnection()` - Handles disconnect event

---

#### 11. Analytics (`server/src/tests/unit/analytics/`)

**analytics.service.test.ts**
- [ ] `getCustomerAnalytics()` - Returns spending, order count, favorites
- [ ] `getCustomerAnalytics()` - Filters by date range
- [ ] `getRetailerAnalytics()` - Returns sales, revenue, customer count
- [ ] `getRetailerAnalytics()` - Returns top products
- [ ] `getRetailerAnalytics()` - Returns sales trends
- [ ] `getWholesalerAnalytics()` - Returns B2B metrics
- [ ] `getWholesalerAnalytics()` - Returns top retailers
- [ ] `getWholesalerAnalytics()` - Returns volume trends
- [ ] `calculateRevenue()` - Sums order totals
- [ ] `calculateGrowth()` - Computes growth percentage

---

#### 12. Store & Location (`server/src/tests/unit/store/`)

**store.service.test.ts**
- [ ] `findNearbyStores()` - Uses MongoDB geospatial query
- [ ] `findNearbyStores()` - Filters by max distance
- [ ] `findNearbyStores()` - Sorts by distance
- [ ] `findNearbyStores()` - Filters by open/closed status
- [ ] `getStoreById()` - Returns store details
- [ ] `searchStores()` - Searches by name, category, rating
- [ ] `calculateDistance()` - Computes distance between coordinates
- [ ] `isStoreOpen()` - Checks operating hours

**geolocation.utils.test.ts**
- [ ] `validateCoordinates()` - Validates lat/lng range
- [ ] `calculateDistance()` - Uses Haversine formula
- [ ] `createGeoJSON()` - Creates MongoDB GeoJSON Point

---

#### 13. Middleware (`server/src/tests/unit/middleware/`)

**auth.middleware.test.ts**
- [ ] `authenticate()` - Validates JWT token
- [ ] `authenticate()` - Extracts user from token
- [ ] `authenticate()` - Throws 401 for missing token
- [ ] `authenticate()` - Throws 401 for invalid token
- [ ] `authenticate()` - Throws 401 for blacklisted token
- [ ] `optionalAuth()` - Allows unauthenticated requests
- [ ] `optionalAuth()` - Authenticates if token provided

**rbac.middleware.test.ts**
- [ ] `requireRole()` - Allows matching role
- [ ] `requireRole()` - Throws 403 for mismatched role
- [ ] `requireRole()` - Allows multiple roles
- [ ] `requireOwnership()` - Validates resource ownership
- [ ] `requireOwnership()` - Throws 403 for non-owner
- [ ] `requireVerified()` - Checks isVerified status
- [ ] `requireVerified()` - Throws 403 for unverified seller

**validation.middleware.test.ts**
- [ ] `validateRegistration()` - Validates registration input
- [ ] `validateLogin()` - Validates login input
- [ ] `validateEmail()` - Checks email format
- [ ] `validatePhone()` - Checks phone number format
- [ ] `validatePassword()` - Enforces password rules (8+ chars, uppercase, number)

---

### Frontend Unit Tests (Jest + React Testing Library)

#### 1. Authentication Components (`client/src/tests/unit/auth/`)

**Login.test.tsx**
- [ ] Renders login form with email and password fields
- [ ] Shows validation error for invalid email
- [ ] Shows validation error for empty password
- [ ] Calls authService.login() on form submit
- [ ] Redirects to dashboard on successful login
- [ ] Displays error toast on login failure
- [ ] Shows loading spinner during login
- [ ] "Remember me" checkbox works
- [ ] OAuth buttons navigate to correct endpoints

**Register.test.tsx**
- [ ] Renders user type selection (Customer, Retailer, Wholesaler)
- [ ] Shows appropriate fields for each user type
- [ ] Validates password confirmation match
- [ ] Validates email format
- [ ] Validates phone number format
- [ ] Calls authService.register() on submit
- [ ] Shows OTP verification for customers
- [ ] Sends verification email for retailers/wholesalers
- [ ] Displays error for duplicate email

**OTPVerification.test.tsx**
- [ ] Renders 6 OTP input boxes
- [ ] Auto-focuses next input on digit entry
- [ ] Auto-focuses previous input on backspace
- [ ] Calls verifyOTP() when all 6 digits entered
- [ ] Shows resend button after 60 seconds
- [ ] Disables resend button during countdown
- [ ] Displays error for invalid OTP

**ForgotPassword.test.tsx**
- [ ] Renders email input field
- [ ] Validates email format
- [ ] Calls authService.forgotPassword() on submit
- [ ] Shows success message on email sent
- [ ] Shows error message on failure

---

#### 2. Product Components (`client/src/tests/unit/product/`)

**ProductCard.test.tsx**
- [ ] Renders product image
- [ ] Renders product name and price
- [ ] Renders category and unit
- [ ] Shows rating stars
- [ ] Shows "Out of Stock" badge when stock <= 0
- [ ] Shows "Add to Cart" button when stock > 0
- [ ] Calls addToCart() on button click
- [ ] Shows discount badge if discount exists
- [ ] Navigates to product detail on card click

**ProductBrowse.test.tsx**
- [ ] Renders product grid
- [ ] Renders search bar
- [ ] Renders category filters
- [ ] Renders price range slider
- [ ] Renders rating filter
- [ ] Renders sort dropdown
- [ ] Calls productService.searchProducts() on filter change
- [ ] Shows loading spinner during search
- [ ] Shows "No products found" when results empty
- [ ] Pagination works correctly
- [ ] Opens product modal on card click

**ProductModal.test.tsx**
- [ ] Renders product details (name, price, description)
- [ ] Renders image carousel
- [ ] Renders specifications table
- [ ] Renders reviews section
- [ ] Shows quantity selector
- [ ] Adds to cart with selected quantity
- [ ] Adds to wishlist on heart icon click
- [ ] Shows nearby stores selling product
- [ ] Closes modal on close button click

---

#### 3. Cart Components (`client/src/tests/unit/cart/`)

**CartIcon.test.tsx**
- [ ] Renders cart icon
- [ ] Displays item count badge
- [ ] Badge shows correct count from store
- [ ] Opens cart drawer on click

**CartDrawer.test.tsx**
- [ ] Renders cart items
- [ ] Renders cart summary
- [ ] Shows "Cart is empty" when no items
- [ ] Updates quantity on +/- button click
- [ ] Removes item on delete button click
- [ ] Calculates subtotal correctly
- [ ] Calculates tax correctly
- [ ] Calculates total correctly
- [ ] "Checkout" button navigates to checkout page
- [ ] Closes drawer on close button click

**Checkout.test.tsx**
- [ ] Renders cart items summary
- [ ] Renders delivery address selector
- [ ] Renders payment method selector
- [ ] Shows order summary
- [ ] Validates address before placing order
- [ ] Calls orderService.createOrder() on submit
- [ ] Opens UPI payment modal for UPI payment
- [ ] Shows COD option
- [ ] Shows success message on order placement

---

#### 4. Order Components (`client/src/tests/unit/order/`)

**OrderHistory.test.tsx**
- [ ] Renders order list
- [ ] Renders order status badges
- [ ] Filters orders by status
- [ ] Shows order date and total
- [ ] Navigates to order detail on click
- [ ] Shows "No orders yet" when empty

**OrderDetail.test.tsx**
- [ ] Renders order items
- [ ] Renders tracking timeline
- [ ] Renders delivery address
- [ ] Renders payment details
- [ ] Shows "Cancel Order" button for PENDING status
- [ ] Hides "Cancel Order" for shipped orders
- [ ] Calls orderService.cancelOrder() on cancel
- [ ] Shows "Leave Review" button for delivered items

---

#### 5. Review Components (`client/src/tests/unit/review/`)

**ReviewForm.test.tsx**
- [ ] Renders star rating selector
- [ ] Renders title input
- [ ] Renders comment textarea
- [ ] Renders image upload (max 5)
- [ ] Validates rating (required)
- [ ] Validates comment length (max 2000 chars)
- [ ] Calls reviewService.createReview() on submit
- [ ] Shows success toast on submission
- [ ] Clears form after successful submission

**ReviewCard.test.tsx**
- [ ] Renders reviewer name and avatar
- [ ] Renders star rating
- [ ] Renders review title and comment
- [ ] Renders review images (clickable)
- [ ] Shows "Verified Purchase" badge
- [ ] Shows helpful/not helpful vote buttons
- [ ] Updates vote count on button click
- [ ] Shows retailer response if exists
- [ ] Shows edit button for own reviews (within 48 hours)
- [ ] Shows delete button for own reviews
- [ ] Shows flag button for other reviews

**StarRating.test.tsx**
- [ ] Renders 5 stars
- [ ] Shows filled stars up to rating value
- [ ] Shows empty stars after rating value
- [ ] Handles decimal ratings (e.g., 3.5 shows half star)
- [ ] Interactive mode: highlights stars on hover
- [ ] Interactive mode: calls onChange on click
- [ ] Read-only mode: no interaction

---

#### 6. Notification Components (`client/src/tests/unit/notification/`)

**NotificationBell.test.tsx**
- [ ] Renders bell icon
- [ ] Displays unread count badge
- [ ] Badge updates from store
- [ ] Calls onClick handler on click
- [ ] Animates on new notification

**NotificationCenter.test.tsx**
- [ ] Renders notification list
- [ ] Renders notification with icon and title
- [ ] Shows timestamp (relative time)
- [ ] Highlights unread notifications
- [ ] Marks as read on click
- [ ] "Mark all as read" button works
- [ ] Archive notification on archive button
- [ ] Delete notification on delete button
- [ ] Shows "No notifications" when empty
- [ ] Loads more on scroll (infinite scroll)

---

#### 7. Wishlist Components (`client/src/tests/unit/wishlist/`)

**Wishlist.test.tsx**
- [ ] Renders wishlist items in grid
- [ ] Shows product image, name, price
- [ ] "Add to Cart" button adds item to cart
- [ ] "Remove" button removes from wishlist
- [ ] "Add All to Cart" button adds all items
- [ ] Shows "Wishlist is empty" when no items
- [ ] Disables "Add to Cart" for out-of-stock items

---

#### 8. Store State Management (`client/src/tests/unit/stores/`)

**cartStore.test.ts**
- [ ] `addItem()` - Adds item to cart
- [ ] `addItem()` - Increments quantity if item exists
- [ ] `removeItem()` - Removes item from cart
- [ ] `updateQuantity()` - Updates item quantity
- [ ] `clearCart()` - Empties cart
- [ ] `calculateSubtotal()` - Sums item prices
- [ ] `calculateTax()` - Computes tax (e.g., 5%)
- [ ] `calculateTotal()` - Returns subtotal + tax
- [ ] `getItemCount()` - Returns total item count
- [ ] `persistToLocalStorage()` - Saves cart to localStorage (user-specific)
- [ ] `loadFromLocalStorage()` - Loads cart on mount
- [ ] `clearOnLogout()` - Clears cart on logout

---

#### 9. Service Layer (`client/src/tests/unit/services/`)

**auth.service.test.ts**
- [ ] `login()` - Sends POST to /api/auth/login
- [ ] `login()` - Stores tokens in localStorage
- [ ] `register()` - Sends POST to /api/auth/register
- [ ] `logout()` - Clears tokens from localStorage
- [ ] `logout()` - Calls /api/auth/logout endpoint
- [ ] `refreshToken()` - Refreshes access token
- [ ] `getCurrentUser()` - Returns user from /api/auth/me
- [ ] `updateProfile()` - Updates user profile
- [ ] `forgotPassword()` - Sends password reset email

**product.service.test.ts**
- [ ] `getProducts()` - Fetches product list
- [ ] `getProductById()` - Fetches single product
- [ ] `searchProducts()` - Searches with filters
- [ ] `getAutocompleteSuggestions()` - Fetches suggestions
- [ ] `createProduct()` - Creates new product (seller)
- [ ] `updateProduct()` - Updates product (seller)
- [ ] `deleteProduct()` - Deletes product (seller)

**order.service.test.ts**
- [ ] `createOrder()` - Creates order from cart
- [ ] `getOrders()` - Fetches order list
- [ ] `getOrderById()` - Fetches order details
- [ ] `cancelOrder()` - Cancels order
- [ ] `trackOrder()` - Gets tracking info

**payment.service.test.ts**
- [ ] `initiatePayment()` - Initiates UPI payment
- [ ] `verifyPayment()` - Verifies payment status
- [ ] `getTransactions()` - Fetches transaction list

**wishlist.service.test.ts**
- [ ] `getWishlist()` - Fetches wishlist
- [ ] `addToWishlist()` - Adds product
- [ ] `removeFromWishlist()` - Removes product
- [ ] `clearWishlist()` - Clears all items

---

#### 10. Utility Functions (`client/src/tests/unit/utils/`)

**deliveryTime.test.ts**
- [ ] `calculateEstimatedDelivery()` - Returns date range
- [ ] `formatDeliveryTime()` - Formats as "X-Y days"
- [ ] `isExpressDeliveryAvailable()` - Checks eligibility

**formatters.test.ts**
- [ ] `formatCurrency()` - Formats as ₹X,XXX.XX
- [ ] `formatDate()` - Formats date (DD MMM YYYY)
- [ ] `formatRelativeTime()` - Formats as "2 hours ago"
- [ ] `formatPhoneNumber()` - Formats phone (+91 XXXXX XXXXX)

**validators.test.ts**
- [ ] `isValidEmail()` - Validates email format
- [ ] `isValidPhone()` - Validates Indian phone number
- [ ] `isValidPassword()` - Enforces password rules
- [ ] `isValidGSTIN()` - Validates GSTIN format
- [ ] `isValidPAN()` - Validates PAN format

---

## Integration Tests

### Backend Integration Tests (Jest + Supertest)

#### 1. API Endpoint Tests (`server/src/tests/integration/api/`)

**auth.routes.test.ts**
- [ ] POST /api/auth/register - Creates user and sends OTP
- [ ] POST /api/auth/register - Returns 400 for duplicate email
- [ ] POST /api/auth/verify-otp - Verifies OTP successfully
- [ ] POST /api/auth/verify-otp - Returns 400 for invalid OTP
- [ ] POST /api/auth/login - Returns tokens for valid credentials
- [ ] POST /api/auth/login - Returns 401 for invalid credentials
- [ ] POST /api/auth/refresh - Refreshes access token
- [ ] POST /api/auth/logout - Blacklists token
- [ ] GET /api/auth/me - Returns current user
- [ ] GET /api/auth/me - Returns 401 without token
- [ ] PUT /api/auth/profile - Updates user profile
- [ ] PUT /api/auth/password - Changes password
- [ ] POST /api/auth/forgot-password - Sends reset email
- [ ] POST /api/auth/reset-password - Resets password with valid token

**product.routes.test.ts**
- [ ] GET /api/products - Returns product list
- [ ] GET /api/products - Filters by category
- [ ] GET /api/products - Filters by price range
- [ ] GET /api/products - Sorts by price
- [ ] GET /api/products/:id - Returns product details
- [ ] POST /api/products - Creates product (Retailer)
- [ ] POST /api/products - Returns 403 for Customer
- [ ] PUT /api/products/:id - Updates product (Owner only)
- [ ] PUT /api/products/:id - Returns 403 for non-owner
- [ ] DELETE /api/products/:id - Soft deletes product

**search.routes.test.ts**
- [ ] GET /api/search/products - Searches products with fuzzy matching
- [ ] GET /api/search/products - Handles typos (e.g., "aple" → "apple")
- [ ] GET /api/search/suggestions - Returns autocomplete suggestions
- [ ] POST /api/search/nearby - Finds products near location
- [ ] GET /api/search/compare-prices - Compares prices across sellers

**order.routes.test.ts**
- [ ] POST /api/orders - Creates order
- [ ] POST /api/orders - Reserves inventory stock
- [ ] POST /api/orders - Returns 400 for out-of-stock items
- [ ] GET /api/orders - Returns customer's orders
- [ ] GET /api/orders/:id - Returns order details
- [ ] PUT /api/orders/:id/status - Updates order status (Retailer)
- [ ] PUT /api/orders/:id/status - Returns 403 for non-seller
- [ ] POST /api/orders/:id/cancel - Cancels order (Customer)
- [ ] POST /api/orders/:id/cancel - Releases reserved stock

**payment.routes.test.ts**
- [ ] POST /api/payments/initiate - Initiates UPI payment
- [ ] POST /api/payments/initiate - Generates QR code
- [ ] POST /api/payments/verify - Verifies payment status
- [ ] POST /api/payments/callback - Handles gateway webhook
- [ ] POST /api/payments/refund - Initiates refund (Seller)
- [ ] GET /api/payments/transactions - Returns user transactions

**review.routes.test.ts**
- [ ] GET /api/reviews/product/:productId - Returns product reviews
- [ ] POST /api/reviews - Creates review (verified purchase)
- [ ] POST /api/reviews - Returns 403 for non-verified purchase
- [ ] PUT /api/reviews/:id - Updates review within 48 hours
- [ ] PUT /api/reviews/:id - Returns 403 after edit window
- [ ] DELETE /api/reviews/:id - Deletes review
- [ ] POST /api/reviews/:id/helpful - Votes helpful
- [ ] POST /api/reviews/:id/flag - Flags review
- [ ] POST /api/reviews/:id/reply - Adds retailer response

**wishlist.routes.test.ts**
- [ ] GET /api/wishlist - Returns wishlist
- [ ] GET /api/wishlist - Auto-creates customer profile if missing
- [ ] POST /api/wishlist - Adds product to wishlist
- [ ] POST /api/wishlist - Prevents duplicate products
- [ ] DELETE /api/wishlist/:productId - Removes product
- [ ] DELETE /api/wishlist - Clears wishlist

**b2b.routes.test.ts**
- [ ] GET /api/b2b/orders - Returns retailer's orders (Retailer)
- [ ] GET /api/b2b/orders - Returns wholesaler's orders (Wholesaler)
- [ ] POST /api/b2b/orders - Creates B2B order (Retailer)
- [ ] POST /api/b2b/orders - Applies volume discounts
- [ ] PUT /api/b2b/orders/:id/confirm - Confirms order (Wholesaler)
- [ ] PUT /api/b2b/orders/:id/status - Updates status (Wholesaler)
- [ ] POST /api/b2b/orders/:id/generate-invoice - Generates PDF

**notification.routes.test.ts**
- [ ] GET /api/notifications - Returns user notifications
- [ ] GET /api/notifications - Paginates results
- [ ] GET /api/notifications/unread-count - Returns unread count
- [ ] PUT /api/notifications/read-all - Marks all as read
- [ ] PUT /api/notifications/:id/read - Marks single as read

---

#### 2. Database Integration (`server/src/tests/integration/database/`)

**user.model.test.ts**
- [ ] Creates user with all fields
- [ ] Enforces unique email constraint
- [ ] Enforces unique phone constraint
- [ ] Hashes password on save
- [ ] Compares password correctly
- [ ] Creates indexes (email, phone, location)
- [ ] Discriminator pattern works (Customer, Retailer, Wholesaler)

**product.model.test.ts**
- [ ] Creates product with required fields
- [ ] Populates createdBy field
- [ ] Text index on name, description, tags
- [ ] Category index for filtering
- [ ] Updates rating on review creation

**order.model.test.ts**
- [ ] Creates order with items
- [ ] Populates items.product field
- [ ] Populates customerId and sellerId
- [ ] Adds tracking entries
- [ ] Compound index on customer and status

**geospatial.test.ts**
- [ ] 2dsphere index on User.location
- [ ] 2dsphere index on Retailer.store.location
- [ ] $near query returns nearest stores
- [ ] $geoWithin query filters by radius
- [ ] Distance calculation is accurate

**aggregation.test.ts**
- [ ] Customer analytics aggregation pipeline
- [ ] Retailer sales aggregation pipeline
- [ ] Review rating distribution aggregation
- [ ] Product search aggregation with text score

---

#### 3. Third-Party Service Integration (`server/src/tests/integration/services/`)

**elasticsearch.integration.test.ts**
- [ ] Connects to Elasticsearch cluster
- [ ] Creates product index with mappings
- [ ] Indexes product from MongoDB
- [ ] Updates indexed product
- [ ] Deletes product from index
- [ ] Searches with fuzzy matching
- [ ] Autocomplete with edge n-grams
- [ ] Geospatial search
- [ ] Syncs all products from MongoDB

**redis.integration.test.ts**
- [ ] Connects to Redis
- [ ] Stores OTP with TTL
- [ ] Retrieves OTP
- [ ] OTP expires after TTL
- [ ] Blacklists token
- [ ] Checks token blacklist

**twilio.integration.test.ts**
- [ ] Sends SMS OTP successfully
- [ ] Handles Twilio API errors
- [ ] Falls back to email on SMS failure
- [ ] Validates phone number format

**aws-ses.integration.test.ts**
- [ ] Sends transactional email
- [ ] Sends password reset email
- [ ] Sends order confirmation email
- [ ] Handles SES errors

**socket-io.integration.test.ts**
- [ ] Client connects to Socket.IO server
- [ ] Client joins user-specific room
- [ ] Server emits notification to user
- [ ] Client receives notification
- [ ] Client disconnects cleanly

---

#### 4. Middleware Integration (`server/src/tests/integration/middleware/`)

**auth-flow.test.ts**
- [ ] authenticate middleware extracts user from JWT
- [ ] authenticate middleware rejects blacklisted token
- [ ] authenticate middleware rejects expired token
- [ ] optionalAuth allows unauthenticated requests

**rbac-flow.test.ts**
- [ ] requireRole(['CUSTOMER']) allows Customer
- [ ] requireRole(['CUSTOMER']) rejects Retailer
- [ ] requireRole(['RETAILER', 'WHOLESALER']) allows both
- [ ] requireOwnership validates resource ownership
- [ ] requireVerified rejects unverified sellers

---

### Frontend Integration Tests (React Testing Library + MSW)

#### 1. User Flow Tests (`client/src/tests/integration/flows/`)

**authentication.flow.test.tsx**
- [ ] Complete registration → OTP verification → Login flow
- [ ] Login → Access protected route → Logout flow
- [ ] Forgot password → Reset password flow
- [ ] OAuth login → Callback → Redirect to dashboard

**product-discovery.flow.test.tsx**
- [ ] Search → Filter → Sort → View product → Add to cart flow
- [ ] Browse category → View product → Add to wishlist flow
- [ ] Search autocomplete → Select suggestion → View product

**checkout.flow.test.tsx**
- [ ] Add to cart → View cart → Checkout → Select address → Initiate payment
- [ ] Add to cart → Update quantity → Remove item → Continue shopping

**order.flow.test.tsx**
- [ ] Place order → Track order → View order details → Leave review

**review.flow.test.tsx**
- [ ] View product → Read reviews → Vote helpful → Write review

**b2b.flow.test.tsx**
- [ ] Retailer: Browse B2B marketplace → Add to cart → Place wholesale order
- [ ] Wholesaler: View orders → Confirm order → Update status → Mark paid

---

#### 2. API Client Tests (`client/src/tests/integration/api/`)

**auth.api.test.ts**
- [ ] authService.login() makes correct API call
- [ ] authService.login() stores tokens in localStorage
- [ ] authService.logout() clears tokens
- [ ] authService.refreshToken() refreshes on 401

**product.api.test.ts**
- [ ] productService.searchProducts() with filters
- [ ] productService.getAutocompleteSuggestions()
- [ ] productService.createProduct() (Retailer)

**order.api.test.ts**
- [ ] orderService.createOrder() with cart items
- [ ] orderService.getOrders() with pagination
- [ ] orderService.cancelOrder()

**payment.api.test.ts**
- [ ] paymentService.initiatePayment()
- [ ] paymentService.verifyPayment()

---

#### 3. State Management Integration (`client/src/tests/integration/stores/`)

**cart-persistence.test.ts**
- [ ] Cart persists to localStorage
- [ ] Cart loads from localStorage on app mount
- [ ] Cart is user-specific (different users have different carts)
- [ ] Cart clears on logout

**notification-sync.test.ts**
- [ ] Notifications update from Socket.IO events
- [ ] Unread count updates on new notification
- [ ] Notifications mark as read on API call

---

## End-to-End Tests

### E2E Test Framework: Playwright or Cypress

#### 1. Critical Customer Journeys (`e2e/customer/`)

**customer-registration-and-purchase.spec.ts**
```typescript
test('Complete customer journey from registration to purchase', async ({ page }) => {
  // 1. Navigate to registration
  await page.goto('/register');

  // 2. Select CUSTOMER user type
  await page.click('[data-testid="user-type-customer"]');

  // 3. Fill registration form
  await page.fill('[name="email"]', 'customer@test.com');
  await page.fill('[name="phone"]', '+919876543210');
  await page.fill('[name="password"]', 'Test@1234');
  await page.fill('[name="confirmPassword"]', 'Test@1234');
  await page.fill('[name="profile.name"]', 'Test Customer');

  // 4. Submit registration
  await page.click('[data-testid="register-button"]');

  // 5. Verify OTP (mock OTP service)
  await page.waitForSelector('[data-testid="otp-input"]');
  await page.fill('[data-testid="otp-input-0"]', '1');
  await page.fill('[data-testid="otp-input-1"]', '2');
  await page.fill('[data-testid="otp-input-2"]', '3');
  await page.fill('[data-testid="otp-input-3"]', '4');
  await page.fill('[data-testid="otp-input-4"]', '5');
  await page.fill('[data-testid="otp-input-5"]', '6');

  // 6. Should redirect to dashboard
  await page.waitForURL('/customer/dashboard');

  // 7. Search for product
  await page.fill('[data-testid="global-search"]', 'apple');
  await page.waitForSelector('[data-testid="autocomplete-suggestion"]');
  await page.click('[data-testid="autocomplete-suggestion"]', { nth: 0 });

  // 8. Product modal should open
  await page.waitForSelector('[data-testid="product-modal"]');

  // 9. Add to cart
  await page.click('[data-testid="add-to-cart"]');

  // 10. Verify cart badge updates
  await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');

  // 11. Open cart
  await page.click('[data-testid="cart-icon"]');

  // 12. Proceed to checkout
  await page.click('[data-testid="checkout-button"]');

  // 13. Should be on checkout page
  await page.waitForURL('/customer/checkout');

  // 14. Select delivery address
  await page.click('[data-testid="address-selector"]', { nth: 0 });

  // 15. Select payment method (COD)
  await page.click('[data-testid="payment-method-cod"]');

  // 16. Place order
  await page.click('[data-testid="place-order"]');

  // 17. Wait for success message
  await page.waitForSelector('[data-testid="order-success"]');

  // 18. Navigate to orders
  await page.click('[data-testid="nav-orders"]');

  // 19. Verify order appears
  await expect(page.locator('[data-testid="order-item"]')).toBeVisible();
});
```

**customer-product-review.spec.ts**
- [ ] Login as customer
- [ ] Navigate to My Reviews
- [ ] Select delivered order
- [ ] Write review with rating and comment
- [ ] Upload review images
- [ ] Submit review
- [ ] Verify review appears on product page

**customer-wishlist.spec.ts**
- [ ] Login as customer
- [ ] Search for product
- [ ] Add to wishlist
- [ ] Navigate to Wishlist page
- [ ] Verify product appears
- [ ] Add all to cart
- [ ] Verify cart updated

---

#### 2. Retailer Journeys (`e2e/retailer/`)

**retailer-inventory-management.spec.ts**
- [ ] Login as retailer
- [ ] Navigate to Inventory
- [ ] Add new product
- [ ] Set price and stock
- [ ] Configure discount
- [ ] Save product
- [ ] Verify product appears in inventory list

**retailer-order-fulfillment.spec.ts**
- [ ] Login as retailer
- [ ] View incoming customer order
- [ ] Confirm order
- [ ] Update status to PROCESSING
- [ ] Update status to SHIPPED
- [ ] Mark COD payment as received
- [ ] Download invoice

**retailer-b2b-ordering.spec.ts**
- [ ] Login as retailer
- [ ] Navigate to B2B Marketplace
- [ ] Browse wholesale products
- [ ] Add products to cart
- [ ] Checkout B2B order
- [ ] Wait for wholesaler confirmation
- [ ] Track delivery
- [ ] Notify payment sent

---

#### 3. Wholesaler Journeys (`e2e/wholesaler/`)

**wholesaler-b2b-order-management.spec.ts**
- [ ] Login as wholesaler
- [ ] View pending B2B orders
- [ ] Confirm order
- [ ] Update delivery status
- [ ] Mark payment as received
- [ ] Generate invoice PDF
- [ ] Download invoice

**wholesaler-retailer-network.spec.ts**
- [ ] Login as wholesaler
- [ ] View retailer network
- [ ] View retailer order history
- [ ] Set credit limit for retailer
- [ ] View analytics for retailer

---

#### 4. Cross-Role Scenarios (`e2e/cross-role/`)

**product-lifecycle.spec.ts**
- [ ] Retailer creates product
- [ ] Product indexed in Elasticsearch
- [ ] Customer searches and finds product
- [ ] Customer adds to cart and orders
- [ ] Retailer fulfills order
- [ ] Customer leaves review
- [ ] Review appears on product page

**payment-flow.spec.ts**
- [ ] Customer initiates UPI payment
- [ ] Payment gateway mock processes payment
- [ ] Payment callback received
- [ ] Order status updates to PAID
- [ ] Notification sent to customer and retailer

**real-time-notifications.spec.ts**
- [ ] Customer places order
- [ ] Retailer receives real-time notification
- [ ] Retailer updates order status
- [ ] Customer receives real-time status update

---

#### 5. Mobile E2E Tests (`e2e/mobile/`)

**mobile-customer-journey.spec.ts**
- [ ] Test on mobile viewport (375x667)
- [ ] Navigation menu works
- [ ] Product cards display correctly
- [ ] Search autocomplete works on mobile
- [ ] Cart drawer works
- [ ] Checkout flow on mobile

---

#### 6. Browser Compatibility (`e2e/compatibility/`)

**cross-browser.spec.ts**
- [ ] Run all critical flows on Chrome
- [ ] Run all critical flows on Firefox
- [ ] Run all critical flows on Safari
- [ ] Run all critical flows on Edge

---

## Test Infrastructure

### 1. Test Databases

**MongoDB Test Database**
```yaml
# docker-compose.test.yml
services:
  mongodb-test:
    image: mongo:6.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: testuser
      MONGO_INITDB_ROOT_PASSWORD: testpass
      MONGO_INITDB_DATABASE: livemart_test
    ports:
      - "27018:27017"
```

**Redis Test Instance**
```yaml
  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
```

**Elasticsearch Test Cluster**
```yaml
  elasticsearch-test:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9201:9200"
```

---

### 2. Test Data Seeding

**Seed Script** (`server/src/tests/seed/`)
```typescript
// seedTestData.ts
export async function seedTestData() {
  // Clear existing data
  await User.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});

  // Create test users
  const customer = await User.create({
    email: 'customer@test.com',
    password: 'Test@1234',
    userType: 'CUSTOMER',
    profile: { name: 'Test Customer', phone: '+919876543210' }
  });

  const retailer = await User.create({
    email: 'retailer@test.com',
    password: 'Test@1234',
    userType: 'RETAILER',
    isVerified: true,
    // ... retailer fields
  });

  // Create test products
  const product = await Product.create({
    name: 'Test Apple',
    basePrice: 120,
    unit: 'kg',
    category: { name: 'Fruits' },
    createdBy: retailer._id,
    stock: 100
  });

  return { customer, retailer, product };
}
```

---

### 3. Mock Services

**Mock Twilio** (`server/src/tests/mocks/twilio.mock.ts`)
```typescript
export class TwilioMock {
  static async sendSMS(phone: string, message: string) {
    console.log(`[MOCK] Sending SMS to ${phone}: ${message}`);
    return { success: true, sid: 'mock-sid-123' };
  }
}
```

**Mock AWS SES** (`server/src/tests/mocks/ses.mock.ts`)
```typescript
export class SESMock {
  static async sendEmail(to: string, subject: string, body: string) {
    console.log(`[MOCK] Sending email to ${to}: ${subject}`);
    return { MessageId: 'mock-message-id' };
  }
}
```

**Mock Payment Gateway** (`server/src/tests/mocks/payment.mock.ts`)
```typescript
export class PaymentGatewayMock {
  static async initiatePayment(amount: number) {
    return {
      transactionId: 'mock-txn-123',
      qrCode: 'data:image/png;base64,mock-qr',
      deepLink: 'upi://pay?mock=true'
    };
  }

  static async verifyPayment(transactionId: string) {
    return { status: 'SUCCESS', gatewayRef: 'mock-ref' };
  }
}
```

**MSW (Mock Service Worker)** for frontend tests
```typescript
// client/src/tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          user: { email: 'test@test.com', userType: 'CUSTOMER' },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        }
      })
    );
  }),

  rest.get('/api/products', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          products: [
            { _id: '1', name: 'Apple', basePrice: 120, unit: 'kg' }
          ]
        }
      })
    );
  })
];
```

---

## Testing Tools & Frameworks

### Backend Testing Stack
- **Jest**: Test runner and assertion library
- **Supertest**: HTTP assertion library for API testing
- **MongoDB Memory Server**: In-memory MongoDB for fast tests
- **Redis Mock**: In-memory Redis for testing
- **Faker.js**: Generate fake data for tests
- **Nock**: HTTP mocking library

### Frontend Testing Stack
- **Jest**: Test runner
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking
- **Playwright**: E2E testing
- **Cypress** (alternative): E2E testing
- **jest-localstorage-mock**: Mock localStorage

### Test Coverage
- **Istanbul/NYC**: Code coverage reporting
- **Codecov**: Coverage visualization and tracking

---

## Test Data Management

### Test User Accounts
```json
{
  "customer": {
    "email": "customer@test.com",
    "password": "Test@1234",
    "phone": "+919876543210"
  },
  "retailer": {
    "email": "retailer@test.com",
    "password": "Test@1234",
    "phone": "+919876543211"
  },
  "wholesaler": {
    "email": "wholesaler@test.com",
    "password": "Test@1234",
    "phone": "+919876543212"
  }
}
```

### Test Products
- Fresh Organic Apples (Fruits, ₹120/kg)
- Whole Wheat Bread (Bakery, ₹40/piece)
- Full Cream Milk (Dairy, ₹60/liter)
- Basmati Rice (Grains, ₹150/kg)

### Test Orders
- Order #1: 2 kg Apples, Total: ₹240, Status: DELIVERED
- Order #2: 1 Bread, Total: ₹40, Status: SHIPPED
- Order #3: 2 liters Milk, Total: ₹120, Status: PENDING

---

## CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/test.yml`)
```yaml
name: Test Suite

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  backend-unit-tests:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017
        env:
          MONGO_INITDB_ROOT_USERNAME: testuser
          MONGO_INITDB_ROOT_PASSWORD: testpass

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

      elasticsearch:
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        ports:
          - 9200:9200
        env:
          discovery.type: single-node

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./server
        run: npm ci

      - name: Run unit tests
        working-directory: ./server
        run: npm run test:unit
        env:
          MONGODB_URI: mongodb://testuser:testpass@localhost:27017/livemart_test
          REDIS_URL: redis://localhost:6379
          ELASTICSEARCH_URL: http://localhost:9200

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./server/coverage/lcov.info
          flags: backend-unit

  backend-integration-tests:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:6.0
        # ... same as above

    steps:
      # ... similar to unit tests

      - name: Run integration tests
        working-directory: ./server
        run: npm run test:integration

  frontend-unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./client
        run: npm ci

      - name: Run unit tests
        working-directory: ./client
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./client/coverage/lcov.info
          flags: frontend-unit

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Start services
        run: docker-compose -f docker/docker-compose.test.yml up -d

      - name: Wait for services
        run: |
          sleep 30
          curl --retry 10 --retry-delay 5 http://localhost:5000/api/health

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Execution Commands

### Backend Tests
```bash
# Run all backend tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run specific test file
npm run test -- user.service.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Frontend Tests
```bash
# Run all frontend tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test customer-registration-and-purchase.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug
```

---

## Test Coverage Requirements

### Backend Coverage Targets
- **Overall**: 80%
- **Controllers**: 85%
- **Services**: 90%
- **Models**: 95%
- **Utils**: 90%
- **Middleware**: 95%

### Frontend Coverage Targets
- **Overall**: 75%
- **Components**: 80%
- **Services**: 85%
- **Stores**: 90%
- **Utils**: 90%

---

## Performance Testing

### Load Testing (k6)
```javascript
// loadTests/product-search.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
  },
};

export default function () {
  let res = http.get('http://localhost:5000/api/search/products?q=apple');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### Stress Testing
```javascript
// loadTests/stress-test.js
export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
};
```

---

## Security Testing

### OWASP ZAP Integration
```bash
# Run ZAP baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000
```

### Snyk Security Scanning
```bash
# Scan for vulnerabilities
npm run security:scan
snyk test
```

### Penetration Testing Checklist
- [ ] SQL Injection (NoSQL injection)
- [ ] XSS (Cross-Site Scripting)
- [ ] CSRF (Cross-Site Request Forgery)
- [ ] Authentication bypass
- [ ] Session hijacking
- [ ] Privilege escalation
- [ ] API rate limiting bypass
- [ ] File upload vulnerabilities
- [ ] JWT token manipulation

---

## Accessibility Testing

### Axe-Core Integration
```javascript
// client/src/tests/a11y/accessibility.test.tsx
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import ProductCard from '../components/ProductCard';

expect.extend(toHaveNoViolations);

test('ProductCard has no accessibility violations', async () => {
  const { container } = render(<ProductCard product={mockProduct} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Visual Regression Testing

### Percy Integration (Playwright)
```typescript
// e2e/visual/product-page.spec.ts
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('Product page visual snapshot', async ({ page }) => {
  await page.goto('/customer/browse');
  await percySnapshot(page, 'Product Browse Page');
});
```

---

## Test Maintenance

### Regular Tasks
1. **Weekly**: Review and update test data
2. **Monthly**: Review code coverage reports
3. **Quarterly**: Update E2E test scenarios
4. **On feature release**: Add tests for new features

### Test Hygiene
- Remove flaky tests or fix them immediately
- Keep test execution time under 10 minutes for unit/integration
- Parallelize E2E tests
- Archive obsolete tests

---

## Summary

This comprehensive test plan covers:
- **500+ unit tests** across backend and frontend
- **100+ integration tests** for APIs and services
- **50+ E2E tests** for critical user journeys
- **Security, performance, and accessibility testing**
- **CI/CD automation with GitHub Actions**

**Estimated Implementation Time**: 4-6 weeks with 2-3 developers

**Priority Order**:
1. ✅ Unit tests for core services (auth, product, order)
2. ✅ Integration tests for critical API endpoints
3. ✅ E2E tests for customer purchase flow
4. ✅ E2E tests for retailer and wholesaler flows
5. ✅ Performance and security testing
