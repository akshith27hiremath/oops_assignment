# Product & Inventory Architecture

## Overview

Live MART uses an **inventory-based product system** where products are catalog items that can be sold by multiple retailers at different prices.

---

## Key Concepts

### **Products = Catalog Items**

Products are universal catalog entries. They represent items that exist in the marketplace, but they don't "belong" to anyone specifically.

```javascript
Product {
  _id: "product-123",
  name: "Premium Basmati Rice",
  description: "High-quality basmati rice",
  basePrice: 50,  // Suggested/reference price
  unit: "kg",
  productType: "RETAIL",  // Or "WHOLESALE"
  createdBy: userId,  // Who added it to catalog (tracking only)
  isActive: true
}
```

**Key Point:** `createdBy` is just for tracking who added the product to the catalog. It does NOT indicate ownership.

---

### **Inventory = Who Sells What**

Inventory entries link products to sellers (retailers/wholesalers) and define:
- Who has the product
- How much stock they have
- What price they're selling it at

```javascript
Inventory {
  productId: "product-123",
  ownerId: "retailer-456",  // THIS is the owner
  currentStock: 100,
  sellingPrice: 55,  // Retailer's price (can differ from basePrice)
  availability: true
}
```

**Key Point:** The same product can have multiple inventory entries from different retailers at different prices.

---

## How It Works

### **Example: Multiple Retailers Selling Same Product**

```
Product: "Premium Basmati Rice"
│
├─ Inventory Entry 1
│  ├─ Owner: Retailer A
│  ├─ Stock: 100kg
│  └─ Price: ₹55/kg
│
├─ Inventory Entry 2
│  ├─ Owner: Retailer B
│  ├─ Stock: 50kg
│  └─ Price: ₹52/kg
│
└─ Inventory Entry 3
   ├─ Owner: Wholesaler C
   ├─ Stock: 1000kg
   └─ Price: ₹40/kg (bulk)
```

**Customer View:**
- Sees "Premium Basmati Rice" available from Retailer A and Retailer B
- Does NOT see Wholesaler C's entry (filtered by userType)
- Can compare prices: A (₹55) vs B (₹52)

---

## Product Types

### **RETAIL Products**
- Sold to customers (B2C)
- Visible to customers when browsing
- Must have inventory from at least one retailer

### **WHOLESALE Products**
- Sold to retailers (B2B)
- Only visible in B2B Marketplace
- Used by retailers to restock inventory

**Note:** The same product can be BOTH retail and wholesale depending on the marketplace context.

---

## Database Queries

### **Customer Browse Products**

Query filters:
1. `productType = "RETAIL"`
2. Has inventory where `owner.userType = "RETAILER"`
3. `availability = true`
4. `stock > 0` (optional)

Result:
- Only shows products that retailers are actively selling
- Customers never see wholesaler inventory
- Products without retailer inventory are hidden

### **Retailer Browse B2B Marketplace**

Query filters:
1. `productType = "WHOLESALE"`
2. Has inventory where `owner.userType = "WHOLESALER"`
3. `availability = true`

Result:
- Only shows wholesale products
- Retailers can order in bulk
- Minimum order quantities apply

---

## Product Lifecycle

### **Scenario: Wholesaler to Retailer to Customer**

#### **Step 1: Wholesaler Creates Product**
```javascript
// Product created
{
  name: "Organic Tomatoes",
  productType: "WHOLESALE",
  basePrice: 30,
  minimumOrderQuantity: 50
}

// Inventory created automatically
{
  productId: "tomato-123",
  ownerId: wholesalerId,
  currentStock: 5000,
  sellingPrice: 30
}
```

#### **Step 2: Retailer Orders from Wholesaler**
```javascript
// Wholesaler's inventory updated
{
  productId: "tomato-123",
  ownerId: wholesalerId,
  currentStock: 4950  // -50kg sold to retailer
}

// NEW inventory entry for retailer created
{
  productId: "tomato-123",  // SAME product!
  ownerId: retailerId,
  currentStock: 50,
  sellingPrice: 40  // Retailer's markup
}
```

#### **Step 3: Product Changes to RETAIL**
```javascript
// Product updated (or keep both types)
{
  name: "Organic Tomatoes",
  productType: "RETAIL",  // Now visible to customers
  basePrice: 40
}
```

#### **Step 4: Customer Browses Products**
```javascript
// Customer sees product with retailer's info
{
  name: "Organic Tomatoes",
  basePrice: 40,
  stock: 50,
  createdBy: {  // Retailer info
    businessName: "Fresh Veggies Store",
    location: {...}
  }
}
```

#### **Step 5: Customer Orders**
```javascript
// Retailer's inventory updated
{
  productId: "tomato-123",
  ownerId: retailerId,
  currentStock: 45,  // -5kg sold to customer
  reservedStock: 5  // Reserved during checkout
}
```

---

## Benefits of This Architecture

### **1. Flexible Pricing**
- Each retailer sets their own prices
- Customers can compare prices across retailers
- Wholesalers and retailers have independent pricing

### **2. Multi-Retailer Support**
- Multiple retailers can sell the same product
- Stock is tracked per retailer
- Customers see aggregated availability

### **3. Clean Separation**
- Products are catalog data
- Inventory is transactional data
- Ownership is clear (via inventory)

### **4. B2B and B2C in One System**
- Same product model for wholesale and retail
- Filtering by `productType` and `owner.userType`
- Wholesaler operations invisible to customers

---

## API Endpoints

### **GET /api/products**
**Customer endpoint** - Shows RETAIL products with retailer inventory

Query params:
- `category`, `search`, `minPrice`, `maxPrice`
- `inStock=true` - Only show available products
- `page`, `limit` - Pagination

Returns:
```javascript
{
  products: [{
    _id: "...",
    name: "...",
    basePrice: 50,
    stock: 100,  // Aggregated from all retailers
    createdBy: {  // Primary retailer selling this
      businessName: "...",
      profile: {...}
    }
  }]
}
```

### **GET /api/products/seller/my-products**
**Retailer/Wholesaler endpoint** - Shows their own inventory

Returns products WHERE `inventory.ownerId = currentUser._id`

---

## Frontend Implementation

### **ProductBrowse Page**
```typescript
// Fetch products
const products = await productService.getProducts(filters);

// Each product shows:
// - Product name & image
// - Retailer name (from createdBy)
// - Retailer's selling price
// - Stock availability
// - Distance from customer
```

### **B2B Marketplace Page**
```typescript
// Fetch wholesale products
const products = await wholesaleService.getWholesaleProducts(filters);

// Each product shows:
// - Product name & image
// - Wholesaler name
// - Wholesale price
// - Minimum order quantity
// - Bulk pricing tiers
```

---

## Migration Notes

### **Existing Data**

All existing products work with the new system:
- Products keep their `createdBy` field
- Inventory entries link products to owners
- Frontend sees retailer info from inventory (not `createdBy`)

### **Backwards Compatibility**

The system maintains backwards compatibility:
- `createdBy` field still exists on products
- Frontend still gets retailer info in `createdBy` field
- But it's now sourced from inventory owner, not product creator

---

## Future Enhancements

1. **Multi-Retailer View**: Show all retailers selling a product with price comparison
2. **Auto-Restocking**: When retailer's inventory is low, suggest B2B orders
3. **Product Variants**: Different sizes/packages of same base product
4. **Dynamic Pricing**: Retailers adjust prices based on demand/competition

---

## Summary

✅ Products are catalog items (universal)
✅ Inventory determines who sells what
✅ Customers only see retailer inventory
✅ Retailers only see wholesaler inventory
✅ Same product, multiple sellers, different prices
✅ Clean separation of B2B and B2C
