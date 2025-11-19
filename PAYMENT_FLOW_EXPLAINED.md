# Payment Flow - Complete Explanation

## 📋 Payment Methods Available

### 1. **Cash on Delivery (COD)**
- Customer selects COD at checkout
- Order is placed with `paymentStatus: PENDING`
- Customer pays cash when order is delivered
- Retailer manually updates payment status after receiving cash
- **No Razorpay integration used**

### 2. **Online Payment (UPI/Card/Netbanking/Wallet)**
- Customer selects "Pay Now" at checkout
- Razorpay Checkout modal opens
- Customer completes payment
- Order is **immediately** updated to `paymentStatus: COMPLETED`
- **This is where Razorpay integration is used**

---

## 🔄 Complete Payment Flow (Online Payment)

### Scenario: Customer orders from 2 different retailers

**Cart:**
- Retailer A: 3 products, ₹500
- Retailer B: 2 products, ₹300
- **Total Order: ₹800**

---

### Step 1: Order Creation (Before Payment)

When customer clicks "Place Order":

```javascript
{
  orderId: "ORD-1234567890-ABC123",
  customerId: "CUSTOMER_ID",
  totalAmount: 800,
  paymentStatus: "PENDING", // Master order status

  subOrders: [
    {
      subOrderId: "ORD-1234567890-ABC123-R1",
      retailerId: "RETAILER_A_ID",
      items: [...], // Retailer A products
      totalAmount: 500,
      status: "PENDING",
      paymentStatus: "PENDING" // Sub-order A status
    },
    {
      subOrderId: "ORD-1234567890-ABC123-R2",
      retailerId: "RETAILER_B_ID",
      items: [...], // Retailer B products
      totalAmount: 300,
      status: "PENDING",
      paymentStatus: "PENDING" // Sub-order B status
    }
  ]
}
```

**At this point:**
- ✅ Order is created
- ⏳ Payment status = PENDING (both master and all sub-orders)
- ❌ Retailers cannot see money yet

---

### Step 2: Customer Chooses Payment Method

**Option A: Cash on Delivery**
```javascript
// No payment processed
// Order stays in PENDING state
// Customer will pay cash on delivery
// Retailer updates status manually after receiving cash
```

**Option B: Pay Now (Online)**
```javascript
// Razorpay integration kicks in
// Customer proceeds to payment
```

---

### Step 3: Payment Processing (Pay Now selected)

#### 3.1 Backend Creates Razorpay Order

```
POST /api/payments/initiate
{
  orderId: "ORDER_ID",
  gateway: "PHONEPE"
}
```

**Backend Response:**
```javascript
{
  success: true,
  data: {
    razorpayOrderId: "order_ABC123XYZ", // Razorpay's ID
    razorpayKeyId: "rzp_test_...",
    amount: 800,
    currency: "INR",
    transaction: {
      transactionId: "TXN-1234567890",
      status: "INITIATED"
    }
  }
}
```

#### 3.2 Frontend Opens Razorpay Checkout

```javascript
const rzp = new window.Razorpay({
  key: "rzp_test_RhFctwOzl2i7Up",
  amount: 80000, // In paise (800 * 100)
  currency: "INR",
  order_id: "order_ABC123XYZ",
  handler: async (response) => {
    // Payment successful callback
  }
});

rzp.open(); // Modal appears
```

#### 3.3 Customer Completes Payment

Customer enters:
- UPI ID: `success@razorpay` (for testing)
- OR Card details
- OR Netbanking credentials
- OR Wallet login

Razorpay processes payment and returns:
```javascript
{
  razorpay_order_id: "order_ABC123XYZ",
  razorpay_payment_id: "pay_XYZ789ABC",
  razorpay_signature: "abc123...xyz789"
}
```

---

### Step 4: Payment Verification

#### 4.1 Frontend Calls Verification API

```
POST /api/payments/verify-razorpay
{
  razorpayOrderId: "order_ABC123XYZ",
  razorpayPaymentId: "pay_XYZ789ABC",
  razorpaySignature: "abc123...xyz789",
  transactionId: "TXN-1234567890"
}
```

#### 4.2 Backend Verifies Signature

```javascript
// Server-side signature verification
const text = razorpayOrderId + "|" + razorpayPaymentId;
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(text)
  .digest('hex');

if (expectedSignature === razorpaySignature) {
  // ✅ Payment is genuine
  // ❌ Cannot be faked by frontend
}
```

---

### Step 5: Order Status Update (THE KEY PART!)

#### 5.1 Master Order Update

```javascript
const order = await Order.findById(transaction.orderId);

// Update master payment status
order.paymentStatus = PaymentStatus.COMPLETED;
```

#### 5.2 **ALL Sub-Orders Update (Multi-Retailer Fix)**

```javascript
// Update ALL sub-order payment statuses
if (order.subOrders && order.subOrders.length > 0) {
  order.subOrders.forEach((subOrder) => {
    subOrder.paymentStatus = PaymentStatus.COMPLETED;
  });
}

await order.save();
```

**After Update:**
```javascript
{
  orderId: "ORD-1234567890-ABC123",
  totalAmount: 800,
  paymentStatus: "COMPLETED", // ✅ Master PAID

  subOrders: [
    {
      subOrderId: "ORD-1234567890-ABC123-R1",
      retailerId: "RETAILER_A_ID",
      totalAmount: 500,
      paymentStatus: "COMPLETED" // ✅ Retailer A sees PAID
    },
    {
      subOrderId: "ORD-1234567890-ABC123-R2",
      retailerId: "RETAILER_B_ID",
      totalAmount: 300,
      paymentStatus: "COMPLETED" // ✅ Retailer B sees PAID
    }
  ]
}
```

---

### Step 6: What Each User Sees

#### **Customer Side:**
```
Order #ORD-1234567890-ABC123
Status: PENDING
Payment: COMPLETED ✅
Total: ₹800

Notification:
"Payment successful! ₹800 paid via UPI"
```

#### **Retailer A Side:**
```
Sub-Order #ORD-1234567890-ABC123-R1
Status: PENDING (awaiting confirmation)
Payment: COMPLETED ✅
Amount: ₹500

They see: "Payment received! You can now process the order."
```

#### **Retailer B Side:**
```
Sub-Order #ORD-1234567890-ABC123-R2
Status: PENDING (awaiting confirmation)
Payment: COMPLETED ✅
Amount: ₹300

They see: "Payment received! You can now process the order."
```

---

## ✅ Key Points

### 1. **Single Payment, Multiple Retailers**
- Customer pays **₹800 once** through Razorpay
- Payment is split across sub-orders
- **All retailers see their sub-orders as PAID immediately**

### 2. **Payment Status Updates Instantly**
- Master order: `COMPLETED`
- Sub-order A: `COMPLETED`
- Sub-order B: `COMPLETED`
- All happen in **one database transaction**

### 3. **Cash on Delivery Flow**
```
COD Selected → Order Created (PENDING) → Delivered →
Customer Pays Cash → Retailer Updates (COMPLETED)
```

### 4. **Online Payment Flow**
```
Pay Now → Razorpay → Payment Success →
Instant Update (COMPLETED for all sub-orders)
```

---

## 💰 Money Flow

### For Online Payments:

**Step 1: Customer Pays**
```
Customer → Razorpay → ₹800
```

**Step 2: Razorpay Settlement (T+1 days)**
```
Razorpay → Your Bank Account → ₹784 (₹800 - 2% fee)
```

**Step 3: You Distribute to Retailers** (Your responsibility)
```
Your Bank → Retailer A → ₹490 (₹500 - 2%)
Your Bank → Retailer B → ₹294 (₹300 - 2%)
```

**OR** Razorpay Route (if configured):
```
Razorpay → Retailer A Bank → ₹490
Razorpay → Retailer B Bank → ₹294
(Automatic split via Razorpay Route feature - requires setup)
```

---

## 🔐 Security Guarantees

### 1. **Frontend Cannot Fake Payments**
- Signature verification happens on **backend**
- Uses secret key (not exposed to frontend)
- Cryptographically secure HMAC SHA256

### 2. **Duplicate Payment Prevention**
```javascript
// Backend checks for existing transactions
const existingTransaction = await UPITransaction.findOne({
  orderId,
  status: { $in: ['INITIATED', 'PENDING', 'PROCESSING'] }
});

if (existingTransaction && !existingTransaction.isExpired()) {
  return existingTransaction; // Return existing, don't create new
}
```

### 3. **Webhook Verification**
```javascript
// Even webhooks are verified
const isValid = razorpayService.verifyWebhookSignature(
  webhookBody,
  signature
);

if (!isValid) {
  return 400; // Reject fake webhooks
}
```

---

## 📊 Database Structure

### UPITransaction Collection:
```javascript
{
  transactionId: "TXN-1234567890",
  orderId: "ORDER_OBJECT_ID",
  customerId: "CUSTOMER_ID",
  merchantId: "RETAILER_A_ID", // First retailer (legacy)
  amount: 800, // Total payment
  status: "SUCCESS",
  gateway: "PHONEPE",
  merchantTransactionId: "order_ABC123XYZ", // Razorpay order ID
  gatewayResponseData: {
    razorpayPaymentId: "pay_XYZ789ABC",
    razorpayOrderId: "order_ABC123XYZ",
    method: "upi",
    vpa: "success@razorpay",
    email: "customer@email.com"
  }
}
```

**Note:** Single transaction for entire order (not split per retailer)

---

## 🎯 Common Scenarios

### Scenario 1: Single Retailer Order
```
Order: ₹500 from Retailer A
Payment: ₹500 via Razorpay
Result:
  - Master order.paymentStatus = COMPLETED
  - subOrders[0].paymentStatus = COMPLETED
  - Retailer A sees PAID immediately
```

### Scenario 2: Multi-Retailer Order
```
Order: ₹800 (₹500 + ₹300 from 2 retailers)
Payment: ₹800 via Razorpay (single payment)
Result:
  - Master order.paymentStatus = COMPLETED
  - subOrders[0].paymentStatus = COMPLETED (Retailer A)
  - subOrders[1].paymentStatus = COMPLETED (Retailer B)
  - Both retailers see PAID immediately
```

### Scenario 3: Payment Failure
```
Customer tries to pay → Payment fails → Razorpay returns error
Result:
  - Transaction.status = FAILED
  - order.paymentStatus = PENDING (unchanged)
  - subOrders[].paymentStatus = PENDING (unchanged)
  - Customer can retry payment
```

### Scenario 4: COD Order
```
Customer selects COD → Order created → Delivered → Cash paid
Result:
  - order.paymentStatus = PENDING (initially)
  - After delivery: Retailer marks as COMPLETED
  - subOrders[].paymentStatus = COMPLETED (manually)
```

---

## ⚙️ Configuration Required

### For Live Payments (Future):

**If you want automatic split to retailers:**
1. Enable **Razorpay Route** in dashboard
2. Add retailer bank accounts to Razorpay
3. Configure split rules:
```javascript
{
  splits: [
    {
      account: "RETAILER_A_ACCOUNT_ID",
      amount: 50000 // In paise
    },
    {
      account: "RETAILER_B_ACCOUNT_ID",
      amount: 30000 // In paise
    }
  ]
}
```

**Without Razorpay Route:**
- Money comes to your account
- You manually transfer to retailers
- Track via order.subOrders[].totalAmount

---

## 🐛 Troubleshooting

### Issue: "Retailer doesn't see payment status"
**Cause:** Sub-order payment status not updated
**Solution:** ✅ Fixed in latest code - all sub-orders update together

### Issue: "Customer paid but order still shows PENDING"
**Cause:** Webhook not received or signature verification failed
**Solution:** Check backend logs, verify webhook secret

### Issue: "Customer can pay multiple times for same order"
**Cause:** Duplicate transaction check missing
**Solution:** ✅ Already implemented - existing transactions are returned

---

## 📝 Summary

**Your Questions Answered:**

1. **"Does this only happen when customer chooses UPI instead of COD?"**
   - ✅ **YES** - Razorpay only activates for "Pay Now" option
   - COD orders stay PENDING until manual update

2. **"Is order immediately updated to paid for both customer and retailer, even for multi-retailer orders?"**
   - ✅ **YES** - After successful payment:
     - Master order: `paymentStatus = COMPLETED`
     - **ALL sub-orders**: `paymentStatus = COMPLETED`
     - Updates happen **instantly** in one database save
     - Customer sees: "Payment Successful"
     - **Retailer A sees**: "Payment Received - ₹500"
     - **Retailer B sees**: "Payment Received - ₹300"

**The Fix:**
I've updated the payment controller to iterate through all `subOrders` and mark each one as `COMPLETED` when payment succeeds. This ensures every retailer sees their portion as paid immediately!

---

**Status**: ✅ **Multi-Retailer Payment Working Correctly**
