# Database Analysis Report - LiveMart

**Generated**: November 11, 2025
**Total Collections Analyzed**: Users, Products, Inventory, Orders (B2C & B2B)

---

## 📊 Summary Statistics

### Users
- **Total Users**: 18
  - Customers: 8
  - Retailers: 7
  - Wholesalers: 3

### Products
- **Total Products**: 33
- Created by various retailers and 1 wholesaler

### Orders
- **B2C Orders**: 15 (9 cancelled, 4 delivered, 1 confirmed, 1 pending)
- **B2B Orders**: 2 (both completed)

### Inventory
- **Total Entries**: 34
- **Zero Stock Items**: 0
- **Missing SourceType**: 32 entries (legacy data)

---

## ⚠️ Issues Found

### 1. **Users Without Location Data** (9 users)
Location data is critical for distance calculations and nearby store features.

**Affected Users:**
- `customer@test.com` (CUSTOMER) - Created: Oct 21, 2025
- `wholesaler@test.com` (WHOLESALER) - Created: Oct 21, 2025
- `akshith.hiremath@gmail.com` (CUSTOMER) - Created: Oct 21, 2025
- `frankathon@gmail.com` (CUSTOMER) - Created: Oct 22, 2025
- `wholesaler2@test.com` (WHOLESALER) - Created: Oct 25, 2025 ⚠️ **ACTIVE USER**
- `jimjameater123@gmail.com` (CUSTOMER) - Created: Oct 30, 2025
- `bitsstudent@gmail.com` (CUSTOMER) - Created: Oct 30, 2025
- `test@gmail.com` (CUSTOMER) - Created: Oct 30, 2025
- `wholesalertest@gmail.com` (WHOLESALER) - Created: Nov 10, 2025

**Impact**:
- Cannot use geospatial queries
- Nearby stores feature won't work for these customers
- Distance-based features broken

**Recommendation**:
- ⚠️ **KEEP** `wholesaler2@test.com` (has active B2B orders)
- ⚠️ **KEEP** `wholesalertest@gmail.com` (recent creation)
- **DELETE** other test accounts with no location

---

### 2. **Legacy Inventory Entries** (32 entries)
Inventory entries created before the B2B tracking feature was added.

**Issue**:
- `sourceType` field is `null` instead of "SELF_CREATED" or "B2B_ORDER"
- Missing B2B tracking metadata

**Example Affected Entries:**
- moremegastore@gmail.com: Jim Jams, Red Apples
- freshveggies@hyderabad.com: Fresh Tomatoes
- (and 29 more entries)

**Recommendation**:
- **UPDATE** all null `sourceType` to "SELF_CREATED" (default value)

---

### 3. **Cancelled Orders** (9 orders)
High number of cancelled orders, likely from testing.

**Pattern**:
- Mostly from `amazingaky123@gmail.com` and `f20242001@hyderabad.bits-pilani.ac.in`
- All cancelled on Oct 30-31, 2025
- Retailers: dairydelights@hyderabad.com, moremegastore@gmail.com

**Recommendation**:
- **KEEP** for analytics/history
- Consider archiving orders older than 90 days

---

### 4. **Test/Inactive Users** (Potential Cleanup Candidates)

**Customers with No Activity:**
- `customer@test.com` - Test account, no location
- `akshith.hiremath@gmail.com` - No location
- `frankathon@gmail.com` - No location
- `jimjameater123@gmail.com` - No location
- `bitsstudent@gmail.com` - No location
- `test@gmail.com` - Generic test account, no location

**Wholesalers:**
- `wholesaler@test.com` - Test account, no location, no products

**Retailers:**
- All retailers have complete data and inventory ✓

---

## 🎯 Cleanup Recommendations

### Priority 1: Fix Data Integrity Issues
1. ✅ **Update Inventory SourceType**
   - Set all `null` sourceType to "SELF_CREATED"
   - Ensures consistency with schema

### Priority 2: Remove Inactive Test Users
2. ⚠️ **Delete Test Customers** (5-6 users)
   - Remove customers with no location AND no order history
   - Keep: Users with actual purchase history

3. ⚠️ **Delete Inactive Wholesaler**
   - `wholesaler@test.com` - Has no products, no location

### Priority 3: Archive Old Test Data
4. 📦 **Archive Cancelled Orders**
   - Consider moving to archive collection
   - Keep recent ones (< 30 days)

---

## ✅ Clean Accounts (Keep)

### Active Production Retailers (All have location + GSTIN):
- `dairydelights@hyderabad.com` ✓
- `freshveggies@hyderabad.com` ✓
- `fruitparadise@hyderabad.com` ✓
- `organicbazaar@hyderabad.com` ✓
- `spicemarket@hyderabad.com` ✓
- `moremegastore@gmail.com` ✓
- `buymycarrots@gmail.com` ✓

### Active Wholesalers:
- `wholesaler2@test.com` ✓ (Has B2B orders - needs location update)
- `wholesalertest@gmail.com` ✓ (Recent creation)

### Active Customers with Orders:
- `amazingaky123@gmail.com` ✓ (Has order history)
- `f20242001@hyderabad.bits-pilani.ac.in` ✓ (Has order history)

---

## 📝 Next Steps

1. **Run Cleanup Script** to fix inventory sourceType
2. **Update** `wholesaler2@test.com` with location data
3. **Delete** identified test accounts (after backup)
4. **Monitor** for any orphaned references after cleanup
