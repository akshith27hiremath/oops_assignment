# Complete B2B Wholesaler-Retailer System Implementation Plan

## Architecture Summary
**Three-Tier Supply Chain:** Wholesaler → Retailer → Customer
- Single Product catalog with RETAIL/WHOLESALE types
- Multi-seller inventory (one product, many sellers with own prices/stock)
- Separate WholesalerOrder model for B2B transactions
- Immediate payment (reuse existing payment system)
- Retailers set retail prices later in inventory management

---

## Phase 1: Core B2B Ordering System (Backend)

### 1.1 Create WholesalerOrder Model
**File:** `server/src/models/WholesalerOrder.model.ts`
- Order schema for Retailer → Wholesaler transactions
- Fields: orderNumber, retailerId, wholesalerId, items[], status, payment, delivery
- Status workflow: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → COMPLETED
- Auto-generate order number like existing Order model
- Relationships to User (retailer/wholesaler), Product, Transaction

### 1.2 Create WholesalerOrder Service
**File:** `server/src/services/wholesalerOrder.service.ts`
- `createB2BOrder()`: Create new B2B order with validation
  - Validate minimum order quantities (strict enforcement)
  - Calculate volume discounts from wholesaler.volumeDiscounts
  - Check wholesaler inventory availability
  - Reserve wholesaler inventory
- `getRetailerOrders()`: Get orders for logged-in retailer
- `getWholesalerOrders()`: Get orders for logged-in wholesaler
- `confirmOrder()`: Wholesaler confirms order
- `updateOrderStatus()`: Progress through workflow
- `completeOrder()`: Transfer inventory to retailer on completion
  - Create/update retailer Inventory entry (stock added, price = wholesale price initially)
  - Reduce wholesaler inventory

### 1.3 Create WholesalerOrder Controller
**File:** `server/src/controllers/wholesalerOrder.controller.ts`
- `POST /api/b2b/orders` - Create B2B order (retailer only)
- `GET /api/b2b/orders` - List orders (filtered by role: retailer sees their orders, wholesaler sees incoming)
- `GET /api/b2b/orders/:id` - Get order details
- `PUT /api/b2b/orders/:id/confirm` - Confirm order (wholesaler only)
- `PUT /api/b2b/orders/:id/status` - Update status (wholesaler only)
- `PUT /api/b2b/orders/:id/cancel` - Cancel order (retailer before confirmation)
- Proper authorization checks using RBAC middleware

### 1.4 Create Routes
**File:** `server/src/routes/wholesalerOrder.routes.ts`
- Register all controller endpoints
- Apply authentication middleware
- Apply RBAC: requireRetailer for order creation, requireWholesaler for confirmations

### 1.5 Register Routes
**File:** `server/src/routes/index.ts`
- Add `router.use('/b2b/orders', wholesalerOrderRoutes)`

### 1.6 Add Notifications Integration
- In WholesalerOrder service, trigger notifications:
  - Order created → notify wholesaler
  - Order confirmed → notify retailer
  - Status updates → notify retailer
  - Order completed → notify both parties

---

## Phase 2: B2B Frontend (Retailer Ordering)

### 2.1 Create B2B Order Service
**File:** `client/src/services/b2bOrder.service.ts`
- API methods: createOrder, getOrders, getOrderDetails, cancelOrder
- Type definitions matching backend

### 2.2 Add "Add to Cart" to B2B Marketplace
**File:** `client/src/pages/retailer/B2BMarketplace.tsx`
- Add cart state management (simple state, not persistent)
- "Add to Cart" button (validate min order quantity)
- Cart badge showing item count
- Cart modal/sidebar showing selected products
- Quantity adjustments with min order validation

### 2.3 Create B2B Checkout Page
**File:** `client/src/pages/retailer/B2BCheckout.tsx`
- Review cart items
- Show volume discounts applied
- Display total amount
- Delivery address selection (use retailer's registered address)
- Order notes/special requests field
- Payment integration (reuse existing UPI/payment system)
- "Place Order" button

### 2.4 Create B2B Order History
**File:** `client/src/pages/retailer/B2BOrderHistory.tsx`
- List all B2B orders placed by retailer
- Filter by status: All, Pending, Confirmed, Shipped, Delivered
- Search by order number or product
- Show: order date, wholesaler name, total amount, status, items count

### 2.5 Create B2B Order Details
**File:** `client/src/pages/retailer/B2BOrderDetails.tsx`
- Full order information
- Items list with quantities and prices
- Volume discounts breakdown
- Status timeline
- Delivery tracking
- Cancel button (if status = PENDING)
- Invoice download (when completed)

### 2.6 Update Retailer Dashboard
**File:** `client/src/pages/retailer/Dashboard.tsx`
- Add quick action for "Browse Wholesale Products"
- Add "My B2B Orders" link
- Show stat: "Pending B2B Orders" count

---

## Phase 3: Wholesaler Order Management

### 3.1 Update Bulk Orders Page
**File:** `client/src/pages/wholesaler/BulkOrders.tsx`
- **Remove all mock data**
- Integrate with real API (`b2bOrder.service.ts`)
- Load actual incoming orders from retailers
- Display: order number, retailer name, order date, items, total, status
- Filters: status, date range, retailer
- Actions per order:
  - Confirm order (if PENDING)
  - Update status dropdown (CONFIRMED → PROCESSING → SHIPPED → DELIVERED)
  - View full details modal

### 3.2 Update Wholesaler Dashboard
**File:** `client/src/pages/wholesaler/Dashboard.tsx`
- Replace TODO comments with real API calls
- Fetch stats: total retailers (from retailerNetwork), active orders (from WholesalerOrder), total revenue
- Load recent orders from B2B orders API
- Top retailers by order volume

### 3.3 Update Retailer Network Page
**File:** `client/src/pages/wholesaler/RetailerNetwork.tsx`
- Replace TODO with real API to fetch full retailer details
- Display: retailer name, business name, location, total orders, total spent
- Actions: view order history with specific retailer

---

## Phase 4: Inventory Transfer & Pricing

### 4.1 Inventory Transfer on Order Completion
**Already planned in service layer (1.2):**
- When wholesaler marks order COMPLETED
- System automatically creates/updates Inventory entry for retailer
- `sellingPrice` initially set to wholesale price paid
- Retailer can change price later

### 4.2 Update Retailer Inventory Management
**File:** `client/src/pages/retailer/InventoryManagement.tsx` (if exists, otherwise create)**
- Display retailer's inventory (products they own)
- Show source: "Created by me" vs "From wholesaler [name]"
- Edit selling price for each product
- Update stock levels
- Mark products active/inactive

---

## Phase 5: Invoice Generation

### 5.1 Create Invoice Service
**File:** `server/src/services/b2bInvoice.service.ts`
- Generate B2B invoice PDF for completed orders
- Include: wholesaler details (GSTIN, PAN), retailer details, itemized list, volume discounts, GST calculation
- Store invoice URL in WholesalerOrder model

### 5.2 Add Invoice Endpoint
**In:** `server/src/controllers/wholesalerOrder.controller.ts`
- `GET /api/b2b/orders/:id/invoice` - Download invoice PDF

---

## Implementation Order (Step-by-Step)

1. **Backend Core** (Day 1-2): Models, service, controller, routes for WholesalerOrder
2. **Test Backend** (Day 2): Use Postman/curl to test B2B order creation, confirmation, status updates
3. **B2B Frontend Cart & Checkout** (Day 3-4): Add cart to marketplace, checkout page
4. **Order History & Details** (Day 4-5): Retailer views their orders
5. **Wholesaler Order Management** (Day 5-6): Update BulkOrders page with real data
6. **Notifications** (Day 6): Integrate notification triggers
7. **Dashboard Stats** (Day 7): Fix TODOs with real data
8. **Inventory Transfer Logic** (Day 7): Auto-create retailer inventory on completion
9. **Invoice Generation** (Day 8+): PDF generation and download

---

## Files to Create
```
server/src/
├── models/WholesalerOrder.model.ts          [NEW]
├── services/wholesalerOrder.service.ts      [NEW]
├── controllers/wholesalerOrder.controller.ts [NEW]
├── routes/wholesalerOrder.routes.ts         [NEW]
└── services/b2bInvoice.service.ts          [NEW - Phase 5]

client/src/
├── services/b2bOrder.service.ts            [NEW]
├── pages/retailer/B2BCheckout.tsx          [NEW]
├── pages/retailer/B2BOrderHistory.tsx      [NEW]
├── pages/retailer/B2BOrderDetails.tsx      [NEW]
└── pages/retailer/InventoryManagement.tsx  [NEW or UPDATE]
```

## Files to Modify
```
server/src/routes/index.ts                   [Register new routes]

client/src/
├── pages/retailer/B2BMarketplace.tsx       [Add cart functionality]
├── pages/retailer/Dashboard.tsx            [Add B2B order links]
├── pages/wholesaler/BulkOrders.tsx         [Remove mocks, use API]
├── pages/wholesaler/Dashboard.tsx          [Fix TODOs, real stats]
└── pages/wholesaler/RetailerNetwork.tsx    [Fetch full retailer details]
```

---

## Design Decisions Made

1. **Pricing Flow**: Retailer sets retail price later in inventory management (not during order)
2. **Order Model**: Separate WholesalerOrder model (not extending existing Order)
3. **Payment Terms**: Immediate payment like B2C (simpler, reuse existing system)
4. **Min Order Qty**: Strict enforcement (must meet minimum, no exceptions)

---

This plan creates a complete B2B ordering system that integrates seamlessly with the existing marketplace architecture while maintaining the three-tier supply chain design.
