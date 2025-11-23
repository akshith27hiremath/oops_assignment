# Discount System - End-to-End Verification

## System Architecture

### Discount Hierarchy (Applied in Order)
```
1. Product-Level Discounts (e.g., 20% OFF on Fresh Milk)
   ↓
2. Tier/Code Discounts (Applied to already-discounted subtotal)
   - Silver Tier: 5%
   - Code: Variable %
   - Best discount wins (no stacking)
   ↓
3. Tax (8% on final discounted price)
```

## Data Flow

### Frontend Flow

#### 1. Product Browse (`client/src/pages/customer/ProductBrowse.tsx`)
```typescript
// Lines 344-370
const getBestDiscount = (product: Product) => {
  // Checks product.retailerInventories for productDiscount
  // Returns best discount from all inventories
}

const getDiscountedPrice = (product: Product) => {
  const discountInfo = getBestDiscount(product);
  return product.basePrice * (1 - discountInfo.discount / 100);
}
```
**Display**: Shows discount badge, crossed-out original price, discounted price

---

#### 2. Cart Item (`client/src/components/cart/CartItem.tsx`)
```typescript
// Lines 40-72
const getBestDiscount = () => {
  // Same logic as ProductBrowse
  // Checks product.retailerInventories
}

const pricePerUnit = discountInfo
  ? product.basePrice * (1 - discountInfo.discount / 100)
  : product.basePrice;
```
**Display**: Discount badge, discounted unit price, item subtotal

---

#### 3. Cart Summary (`client/src/components/cart/CartSummary.tsx`)
**UNIFIED WITH CHECKOUT**

```typescript
// Lines 40-57
// Step 1: Product discounts
const { subtotalBeforeDiscount, subtotalAfterProductDiscounts, totalProductDiscountSavings }
  = calculateCartSubtotal(items);

// Step 2: Load user tier
const tierInfo = discountService.calculateLoyaltyTier(orderHistory.length);

// Step 3: Apply tier discount to already-discounted subtotal
const { finalTotal, tierDiscount }
  = calculateFinalTotal(subtotalAfterProductDiscounts, tierDiscountPercentage, 0);

// Step 4: Tax on final amount
const tax = finalTotal * 0.08;
const total = finalTotal + tax;
```

**Display**:
- Original subtotal (crossed out if discounts exist)
- Product discounts: -₹X
- Discounted subtotal: ₹Y
- Silver tier (5%): -₹Z
- Tax (8%): ₹T
- **Total**: ₹(Y - Z + T)

---

#### 4. Checkout Page (`client/src/pages/customer/Checkout.tsx`)
**IDENTICAL LOGIC TO CART SUMMARY**

```typescript
// Lines 226-261
// Step 1: Product discounts
const { subtotalBeforeDiscount, subtotalAfterProductDiscounts, totalProductDiscountSavings }
  = calculateCartSubtotal(items);

// Step 2: Tier and code discounts on discounted subtotal
const tierDiscountPercentage = tierInfo.discountPercentage;
const codeDiscountPercentage = appliedDiscountCode?.discountValue || 0;

// Step 3: Best discount wins
const { finalTotal, tierDiscount, codeDiscount, appliedDiscountType }
  = calculateFinalTotal(subtotalAfterProductDiscounts, tierDiscountPercentage, codeDiscountPercentage);

// Step 4: Tax
const tax = finalTotal * 0.08;
const total = finalTotal + tax;
```

**Display**: Same as cart summary + per-item discount details + code discount option

---

### Backend Flow

#### 5. Order Service (`server/src/services/order.service.ts`)

```typescript
// Lines 110-141
for (const item of items) {
  const inventory = await Inventory.findById(...);
  const basePrice = inventory.sellingPrice;
  let unitPrice = basePrice;
  let productDiscountPercentage = 0;

  // Check product discount
  if (inventory.productDiscount?.isActive && validUntil > now) {
    productDiscountPercentage = inventory.productDiscount.discountPercentage;
    unitPrice = basePrice * (1 - productDiscountPercentage / 100);
  }

  // Track both original and discounted prices
  orderItems.push({
    productId: product._id,
    name: product.name,
    quantity: item.quantity,
    unitPrice, // Discounted price
    originalUnitPrice: productDiscountPercentage > 0 ? basePrice : undefined,
    productDiscountPercentage: productDiscountPercentage > 0 ? productDiscountPercentage : undefined,
    subtotal: unitPrice * quantity,
    discounts: 0, // Tier/code discount added later
  });

  cartSubtotalAfterProductDiscounts += unitPrice * quantity;
}
```

```typescript
// Lines 152-167
// Calculate tier/code discount on already-discounted subtotal
const discountCalc = await discountService.calculateBestDiscount(
  customerId,
  cartSubtotalAfterProductDiscounts, // ← Uses discounted subtotal!
  discountCodeId
);

// Apply tier/code discount proportionally to items
const itemsWithDiscounts = discountService.applyDiscountToItems(
  orderItems,
  discountCalc.finalDiscount
);

const totalAmount = cartSubtotalAfterProductDiscounts - discountCalc.finalDiscount;
```

```typescript
// Lines 187-197
// Store complete breakdown
discountBreakdown: {
  subtotal: cartSubtotalBeforeProductDiscounts,
  productDiscountSavings: totalProductDiscountSavings,
  subtotalAfterProductDiscounts: cartSubtotalAfterProductDiscounts,
  tierDiscount: discountCalc.tierDiscount,
  codeDiscount: discountCalc.codeDiscount,
  finalDiscount: discountCalc.finalDiscount,
  discountType: discountCalc.discountType,
  tierPercentage: discountCalc.tierPercentage,
  codePercentage: discountCalc.codePercentage,
}
```

---

## Data Integrity Verification

### Order Item Schema (`server/src/models/Order.model.ts`)
```typescript
// Lines 33-44
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number; // Final price after product discount
  originalUnitPrice?: number; // Base price before product discount
  productDiscountPercentage?: number; // Product discount %
  subtotal: number; // unitPrice * quantity
  discounts?: number; // Tier/code discount applied to this item
}
```

### Discount Breakdown Schema
```typescript
// Lines 55-65
export interface IDiscountBreakdown {
  subtotal: number; // Original total before any discounts
  productDiscountSavings?: number; // Total product discount savings
  subtotalAfterProductDiscounts?: number; // Subtotal after product discounts
  tierDiscount: number; // Tier discount amount
  codeDiscount: number; // Code discount amount
  finalDiscount: number; // Applied tier/code discount
  discountType: 'TIER' | 'CODE' | 'NONE';
  tierPercentage?: number;
  codePercentage?: number;
}
```

---

## Single Source of Truth

### Centralized Discount Utility (`client/src/utils/discountUtils.ts`)

```typescript
// Lines 20-67
export const getProductDiscount = (product: Product): ProductDiscountInfo => {
  // Finds best product discount from retailerInventories
  // Returns: hasDiscount, discountPercentage, originalPrice, discountedPrice, savings
}

// Lines 72-91
export const calculateCartSubtotal = (items: Array<{ product: Product; quantity: number }>) => {
  let subtotalBeforeDiscount = 0;
  let subtotalAfterProductDiscounts = 0;

  for (const item of items) {
    const discountInfo = getProductDiscount(item.product);
    subtotalBeforeDiscount += discountInfo.originalPrice * item.quantity;
    subtotalAfterProductDiscounts += discountInfo.discountedPrice * item.quantity;
  }

  return { subtotalBeforeDiscount, subtotalAfterProductDiscounts, totalProductDiscountSavings };
}

// Lines 96-135
export const calculateFinalTotal = (
  cartSubtotalAfterProductDiscounts: number,
  tierDiscountPercentage: number,
  codeDiscountPercentage: number
) => {
  const tierDiscount = (cartSubtotalAfterProductDiscounts * tierDiscountPercentage) / 100;
  const codeDiscount = (cartSubtotalAfterProductDiscounts * codeDiscountPercentage) / 100;

  // Best discount wins
  let appliedDiscount = Math.max(tierDiscount, codeDiscount);
  let appliedDiscountType = codeDiscount > tierDiscount ? 'CODE' : 'TIER';

  const finalTotal = cartSubtotalAfterProductDiscounts - appliedDiscount;

  return { finalTotal, tierDiscount, codeDiscount, appliedDiscountType, appliedDiscountPercentage };
}
```

**Used By**:
- ✅ CartSummary
- ✅ Checkout
- ✅ All discount calculations

---

## Consistency Checklist

### ✅ Frontend Consistency
- [x] ProductBrowse shows product discounts
- [x] CartItem shows product discounts
- [x] CartSummary shows product + tier discounts
- [x] Checkout shows product + tier/code discounts
- [x] Same tax rate (8%) in cart and checkout
- [x] Same calculation logic (centralized utility)

### ✅ Backend Consistency
- [x] Product discounts detected from inventory
- [x] Product discounts applied to unitPrice
- [x] Tier/code discounts applied to discounted subtotal (not original)
- [x] Complete breakdown stored in order
- [x] Retailer can see original price vs discounted price

### ✅ Data Integrity
- [x] Order stores originalUnitPrice + productDiscountPercentage
- [x] Order stores tier/code discount separately in `discounts` field
- [x] Complete breakdown in `discountBreakdown`
- [x] No data loss - all discount layers tracked

---

## Example Calculation

### Scenario
- Fresh Milk: ₹100 base price, 20% product discount
- Quantity: 2
- Customer: Silver tier (5% discount)

### Frontend (Cart & Checkout)
```
Step 1: Product Discount
  Base price: ₹100
  Product discount: 20%
  Discounted price: ₹80
  Quantity: 2
  Item subtotal: ₹160

Step 2: Cart Subtotal
  Original: ₹200 (₹100 × 2)
  After product discount: ₹160 (₹80 × 2)
  Product savings: ₹40

Step 3: Tier Discount
  Applies to: ₹160 (not ₹200!)
  Silver tier: 5%
  Tier discount: ₹8

Step 4: Tax
  Subtotal after all discounts: ₹152 (₹160 - ₹8)
  Tax (8%): ₹12.16
  Final total: ₹164.16

Total savings: ₹40 + ₹8 = ₹48
```

### Backend (Order Creation)
```javascript
// Order item
{
  name: "Fresh Milk",
  quantity: 2,
  unitPrice: 80, // After product discount
  originalUnitPrice: 100, // Base price
  productDiscountPercentage: 20,
  subtotal: 160, // ₹80 × 2
  discounts: 8, // Tier discount (5% of ₹160)
}

// Discount breakdown
{
  subtotal: 200, // Original
  productDiscountSavings: 40,
  subtotalAfterProductDiscounts: 160,
  tierDiscount: 8,
  codeDiscount: 0,
  finalDiscount: 8, // Applied discount
  discountType: 'TIER',
  tierPercentage: 5
}

// Total amount
totalAmount: 152 // ₹160 - ₹8
```

### Retailer View
When retailer sees this order:
- Item shows: ₹80/unit (originalUnitPrice: ₹100, productDiscount: 20%)
- They understand: Customer paid ₹80/unit, but there was a 20% product discount
- Subtotal: ₹160
- Additional discount: ₹8 (tier discount)
- **Retailer receives**: ₹152 (before tax)

---

## Verification Tests

### Test 1: Cart Drawer = Checkout
1. Add discounted product to cart
2. Open cart drawer → note total
3. Go to checkout → compare total
4. **Expected**: Identical totals (including tier discount)

### Test 2: Backend Matches Frontend
1. Place order with discounted product + tier discount
2. Check server logs for pricing breakdown
3. Query database for order document
4. **Expected**: All values match frontend calculation

### Test 3: Retailer Data Integrity
1. Create order with product discount + tier discount
2. Query order from retailer perspective
3. Check `originalUnitPrice` and `productDiscountPercentage`
4. **Expected**: Retailer sees both base price and discount info

### Test 4: No Discount Stacking
1. Product with 20% discount: ₹100 → ₹80
2. Tier 5% should apply to ₹80, not ₹100
3. **Expected**: Tier discount = ₹4 (not ₹5)

---

## Tax Rate Unification
- **Previous**: Cart (5%), Checkout (8%) ❌
- **Current**: Both use 8% ✅
- **Location**:
  - `CartSummary.tsx:53` → `const taxRate = 0.08;`
  - `Checkout.tsx:255` → `const taxRate = 0.08;`

---

## Logging

Backend logs complete breakdown on order creation:
```
✅ Order created: ORD-1234567890-ABC123 for customer 507f1f77bcf86cd799439011
   💰 Pricing breakdown:
      Original subtotal: ₹200.00
      Product discounts: -₹40.00
      After product discounts: ₹160.00
      TIER discount: -₹8.00
      Final total: ₹152.00
```

---

## Summary

### ✅ System is Unified
- Single calculation logic (discountUtils.ts)
- Cart drawer and checkout show identical values
- Backend applies same logic
- No disagreements

### ✅ Data Integrity Maintained
- All discount layers tracked separately
- No information loss
- Retailer can see complete pricing breakdown
- Audit trail preserved

### ✅ Correct Discount Stacking
- Product discounts apply first
- Tier/code discounts apply to already-discounted prices
- No percentage stacking
- Best of tier/code wins
