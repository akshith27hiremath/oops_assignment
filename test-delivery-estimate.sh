#!/bin/bash

echo "=========================================="
echo "Testing Multi-Retailer Delivery Estimation"
echo "=========================================="
echo ""

# Get auth token for customer
echo "1. Logging in as customer..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "akshith.hiremath@gmail.com",
    "password": "aVdjwcf2ut.Q!xM"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo $LOGIN_RESPONSE | jq '.'
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Create order with items from both retailers
echo "2. Creating multi-retailer order..."
echo "   - Fresh Milk from Dairy Delights (4.2km)"
echo "   - Garam Masala from Spice Market (10.0km)"
echo "   - Delivery to: Gachibowli, Hyderabad"
echo ""

ORDER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      {
        "productId": "678e67e0ab1bfc7ed31f4631",
        "quantity": 1
      },
      {
        "productId": "678e67e0ab1bfc7ed31f4643",
        "quantity": 1
      }
    ],
    "deliveryAddress": {
      "street": "DLF Cyber City",
      "city": "Hyderabad",
      "state": "Telangana",
      "zipCode": "500032",
      "country": "India"
    },
    "notes": "Test order for delivery estimation"
  }')

ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"orderId":"[^"]*' | cut -d'"' -f4)

if [ -z "$ORDER_ID" ]; then
  echo "❌ Order creation failed"
  echo $ORDER_RESPONSE | jq '.'
  exit 1
fi

echo "✅ Order created: $ORDER_ID"
echo ""

# Get order details to check delivery estimates
echo "3. Fetching order details..."
echo ""

ORDER_DETAILS=$(curl -s -X GET "http://localhost:5000/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "📦 Order Details:"
echo "=================="
echo $ORDER_DETAILS | jq '{
  orderId: .data.order.orderId,
  masterStatus: .data.order.masterStatus,
  totalAmount: .data.order.totalAmount,
  deliveryAddress: .data.order.deliveryAddress,
  deliveryEstimate: .data.order.deliveryEstimate,
  subOrders: [
    .data.order.subOrders[] | {
      subOrderId: .subOrderId,
      retailerId: .retailerId.businessName,
      items: [.items[] | .name],
      totalAmount: .totalAmount,
      deliveryEstimate: .deliveryEstimate
    }
  ]
}'

echo ""
echo "=========================================="
echo "Check backend logs for delivery estimate calculation:"
echo "docker logs livemart-api-dev --tail 50 | grep -E '(📍|delivery|estimate)'"
echo "=========================================="
