# Live MART - 20 Minute Video Demo Script

## Overview
This script covers all major features in a logical flow that tells a complete story from wholesaler → retailer → customer.

**Total Time: 20 minutes**

---

## 🎬 INTRODUCTION (1 minute)

### Visual
- Desktop with browser open to localhost:3000

### Script
> "Hello! Today I'm presenting **Live MART**, a comprehensive multi-stakeholder e-commerce platform that connects wholesalers, retailers, and customers in a seamless marketplace ecosystem."

> "Unlike traditional e-commerce platforms that only connect buyers and sellers, Live MART implements a complete B2B2C supply chain model where wholesalers supply products to retailers, who then sell to end customers."

> "Let me walk you through the complete system by demonstrating the journey of a product from wholesaler to customer."

**Talking Points:**
- Multi-stakeholder platform (3 user types)
- Complete supply chain integration
- Real-time inventory management
- Location-based services
- Advanced discount system

---

## 📦 PART 1: WHOLESALER FLOW (4 minutes)

### 1.1 Registration & Login (1 min)

**Action:**
1. Navigate to Sign Up page
2. Select "Wholesaler" user type
3. Fill in details:
   - Email: `farmfresh@wholesaler.com`
   - Password: `Test123!`
   - Business Name: "Farm Fresh Wholesale"
   - GSTIN: `29AAAAA1234A1Z5`
   - Name: "Farm Fresh Co."
   - Phone: `9876543210`
4. Click Register

**Script:**
> "Let's start as a wholesaler. Wholesalers are the suppliers in our system. Notice the role-based registration with specific fields like GSTIN for tax compliance and business verification."

**Talking Points:**
- Role-based authentication
- Input validation (email format, password strength)
- Business verification fields (GSTIN)
- Edge case: Try registering with same email → Shows duplicate email error (EDGECASES.md #1)

---

### 1.2 Product Creation (2 min)

**Action:**
1. Navigate to Dashboard
2. Click "Products" → "Add New Product"
3. Create wholesale product:
   - Name: "Premium Basmati Rice 25kg"
   - Category: "Grains"
   - Base Price: ₹1500
   - Unit: "bag"
   - Description: "Premium quality Basmati rice in bulk"
   - Upload product image
   - Tags: "Wholesale", "Bulk"
   - Product Type: "WHOLESALE"
   - Minimum Order Quantity: 10 bags
4. Add bulk pricing tiers:
   - 10-50 bags: ₹1500/bag
   - 51-100 bags: ₹1450/bag
   - 100+ bags: ₹1400/bag
5. Click "Create Product"

**Script:**
> "As a wholesaler, I can create products with bulk pricing tiers. Notice the minimum order quantity - this ensures retailers purchase in bulk amounts. The tiered pricing incentivizes larger orders."

**Talking Points:**
- Cloudinary image upload integration
- Bulk pricing tiers for B2B
- Minimum order quantities
- Category-based organization

---

### 1.3 View B2B Marketplace Orders (1 min)

**Action:**
1. Navigate to "Orders" section
2. Show incoming orders from retailers
3. Click on an order to see details
4. Show order fulfillment workflow

**Script:**
> "Wholesalers can track all retailer orders in one place. The system automatically manages inventory reservations and updates stock levels when orders are confirmed."

**Talking Points:**
- B2B order tracking
- Multi-retailer order management
- Automated inventory reservations

---

## 🏪 PART 2: RETAILER FLOW (6 minutes)

### 2.1 Retailer Registration (1 min)

**Action:**
1. Logout from wholesaler account
2. Register as Retailer:
   - Email: `dairydelights@hyderabad.com`
   - Business Name: "Dairy Delights"
   - GSTIN: `36EEEEE5555E5Z5`
   - Enable location services (or enter manually: Hyderabad coordinates)

**Script:**
> "Now let's switch to a retailer's perspective. Retailers purchase from wholesalers and sell to customers. Notice we're capturing the store location - this enables location-based delivery estimation for customers."

**Talking Points:**
- OAuth location integration (Google Maps API)
- Multi-step registration with location
- Store profile setup

---

### 2.2 Browse B2B Marketplace & Order from Wholesaler (2 min)

**Action:**
1. Navigate to "B2B Marketplace"
2. Browse wholesale products
3. Find "Premium Basmati Rice 25kg"
4. Add 25 bags to cart (shows bulk pricing: ₹1500/bag)
5. Try adding 60 bags → Shows discounted price (₹1450/bag)
6. Checkout and place B2B order
7. Navigate to "My Orders" → Show order status

**Script:**
> "Retailers can browse products from multiple wholesalers in the B2B Marketplace. Notice how the price automatically updates based on quantity - this is our dynamic bulk pricing system. The minimum order quantity is enforced to ensure wholesale quantities."

**Talking Points:**
- B2B marketplace separate from B2C
- Dynamic bulk pricing calculation
- Minimum order validation (EDGECASES.md #B2B)
- Order tracking with status updates

---

### 2.3 Inventory Management (2 min)

**Action:**
1. Navigate to "Inventory Management"
2. Show received wholesale products now in inventory
3. Click "Add Product" → Create retail product:
   - Name: "Fresh Milk"
   - Category: "Dairy"
   - Base Price: ₹60/liter
   - Current Stock: 100
   - Upload image
4. Set up a **Product Discount**:
   - Discount: 20%
   - Valid Until: Tomorrow
   - Reason: "Season End Sale"
5. Show another product with 0 stock
6. Set **Expected Availability Date** for out-of-stock item:
   - Click calendar icon in Status column
   - Select date: 3 days from now
7. Show low stock alerts (products below reorder level)

**Script:**
> "Inventory management is the heart of the retailer dashboard. Retailers can add their own products or sell items purchased from wholesalers. Notice our smart discount system - retailers can set temporary discounts with custom reasons that customers will see."

> "For out-of-stock items, retailers can set expected availability dates, which are displayed to customers. This improves customer experience by managing expectations."

**Talking Points:**
- Real-time inventory tracking
- Product discount system with validity dates
- Expected availability dates (STOCK_DISPLAY_FEATURE.md)
- Low stock alerts with reorder level
- Multi-source inventory (self-created + B2B orders)

---

### 2.4 Dashboard Analytics (1 min)

**Action:**
1. Navigate to "Dashboard"
2. Show revenue statistics
3. Show order charts
4. Show top-selling products
5. Show recent orders

**Script:**
> "The retailer dashboard provides comprehensive analytics including revenue tracking, order trends, and top-selling products. This helps retailers make data-driven inventory decisions."

**Talking Points:**
- Revenue analytics
- Order visualization with charts
- Product performance metrics
- Real-time statistics

---

## 🛒 PART 3: CUSTOMER FLOW (7 minutes)

### 3.1 Customer Registration (1 min)

**Action:**
1. Logout from retailer
2. Register as Customer:
   - Email: `customer@test.com`
   - Name: "John Doe"
   - Phone: `9123456789`
   - Enable location or enter address manually

**Script:**
> "Now let's experience the platform from a customer's perspective. Customers have the simplest registration process - just basic details and location for delivery estimation."

**Talking Points:**
- Simplified customer registration
- Location-based services
- Address management

---

### 3.2 Browse Products & Stock Display Feature (2 min)

**Action:**
1. Navigate to "Browse Products"
2. Show product grid with multiple retailers
3. Point out **Stock Display Indicators**:
   - Product with stock: "5 in stock" (green checkmark ✅)
   - Product with 0 stock + date: "Back Jan 28" (orange clock 🕐)
   - Product with 0 stock no date: "OUT OF STOCK" (red X ❌) with red overlay
4. Apply "In Stock Only" filter → Out-of-stock products disappear
5. Try to add out-of-stock item to cart → Disabled button with tooltip
6. Show product with active discount:
   - Original price crossed out
   - Discounted price in green
   - Red badge showing "20% OFF"
   - Discount reason displayed: "🔥 Season End Sale"

**Script:**
> "This is our enhanced product browsing experience. Notice the prominent stock indicators - customers immediately know if items are available, and when out-of-stock items will be restocked. The 'In Stock Only' filter helps customers see only available products."

> "Products with discounts show clear visual indicators - the original price is crossed out, discount percentage is highlighted, and the retailer's reason for the discount is displayed. This transparency builds trust."

**Talking Points:**
- Stock display feature with 3 states (STOCK_DISPLAY_FEATURE.md)
- Expected availability dates visible to customers
- Out-of-stock items can't be added to cart (EDGECASES.md)
- Multi-retailer product display
- Discount visualization with reasons
- "In Stock Only" filter functionality

---

### 3.3 Location-Based Features (1 min)

**Action:**
1. Point out retailer distance: "2.5km away"
2. Point out delivery estimation: "Delivery: 30-45 mins"
3. Sort by "Fastest Delivery"
4. Navigate to "Nearby Stores"
5. Show store map with markers
6. Click on a store marker → Show store details

**Script:**
> "Live MART uses advanced geolocation to calculate real-time distance and delivery estimates. Customers can see how far each retailer is and estimated delivery time based on actual distance calculations using the Haversine formula."

**Talking Points:**
- Real-time distance calculation
- Delivery time estimation based on distance
- Google Maps integration for nearby stores
- Sort by delivery speed

---

### 3.4 Shopping & Cart (1 min)

**Action:**
1. Add multiple products to cart
2. Navigate to Cart
3. Show multi-retailer cart breakdown:
   - Products grouped by retailer
   - Subtotals per retailer
   - Discount calculations applied
4. Update quantities
5. Show total calculation

**Script:**
> "The cart intelligently groups products by retailer. Notice how discounts are automatically applied - the 20% discount from 'Season End Sale' is reflected in the total. Each retailer's subtotal is calculated separately."

**Talking Points:**
- Multi-retailer cart support
- Automatic discount application
- Real-time total calculation
- Quantity validation (no negative/decimal quantities - EDGECASES.md)

---

### 3.5 Checkout & Order Placement (1 min)

**Action:**
1. Click "Proceed to Checkout"
2. Show address autofill from Google Places API
3. Select delivery address (or add new with autofill)
4. Select shipping date from calendar (show unavailable dates grayed out)
5. Choose payment method: Razorpay
6. Complete mock payment
7. Show order confirmation

**Script:**
> "The checkout process includes Google Places API integration for address autofill - customers can start typing and select from suggestions. The calendar shows available shipping dates, with weekends and past dates disabled for realistic scheduling."

**Talking Points:**
- Address autofill with Google Places API
- Calendar-based shipping date selection
- Razorpay payment integration
- Order confirmation

---

### 3.6 Order Tracking & Reviews (1 min)

**Action:**
1. Navigate to "Order History"
2. Show order with multiple retailers (split into suborders)
3. Click on delivered order
4. Submit review with:
   - 5-star rating
   - Upload review image
   - Comment: "Excellent quality, fast delivery!"
5. Navigate back to product page
6. Show review displayed with image

**Script:**
> "Orders from multiple retailers are automatically split into suborders, each tracked separately. After delivery, customers can leave reviews with images. Reviews display average ratings and help other customers make informed decisions."

**Talking Points:**
- Multi-retailer order splitting
- Order status tracking
- Review system with image upload (Cloudinary)
- Rating aggregation

---

## 🔥 PART 4: ADVANCED FEATURES (4 minutes)

### 4.1 Price Drop Alerts (1 min)

**Action:**
1. Browse a product
2. Click "Set Price Alert"
3. Set target price: ₹50 (current price: ₹60)
4. Show "Price Alert Created" notification
5. Navigate to "Price Alerts" page
6. Show active alerts list
7. (Admin action) Retailer reduces price to ₹48
8. Show alert notification: "Price dropped! Fresh Milk now ₹48"
9. Click notification → Navigate to product

**Script:**
> "Customers can set price alerts for products they're watching. When a retailer reduces the price below the target, customers receive real-time notifications via our notification system. This feature runs on a background cron job that monitors prices every hour."

**Talking Points:**
- Price monitoring system with cron jobs
- Real-time notifications
- Customer engagement feature
- Automated price tracking

---

### 4.2 Wishlist (30 sec)

**Action:**
1. Browse products
2. Click heart icon to add to wishlist
3. Navigate to "Wishlist"
4. Show saved products
5. Move item from wishlist to cart

**Script:**
> "The wishlist lets customers save products for later. It's synced to their account, so they can access it from any device."

**Talking Points:**
- Persistent wishlist storage
- Quick add to cart from wishlist
- Account synchronization

---

### 4.3 Real-time Notifications (30 sec)

**Action:**
1. Show notification bell
2. Open notification dropdown
3. Show different notification types:
   - Order status updates
   - Price drop alerts
   - Low stock alerts (retailer)
   - Payment confirmations
4. Click on notification → Navigate to relevant page

**Script:**
> "Our notification system keeps all stakeholders informed in real-time. Customers get order updates, retailers get low stock warnings, and wholesalers track B2B orders - all through a unified notification center."

**Talking Points:**
- Real-time notification system
- Type-based notifications
- Click-through navigation
- Notification persistence

---

### 4.4 Search & Filters (30 sec)

**Action:**
1. Use search bar: Type "rice"
2. Show autocomplete suggestions
3. Apply filters:
   - Category: "Grains"
   - Price range: ₹100-₹500
   - In Stock Only
4. Show filtered results
5. Sort by price (low to high)

**Script:**
> "The search system includes autocomplete for quick product discovery. Customers can combine multiple filters - category, price range, and stock availability - to find exactly what they need."

**Talking Points:**
- Elasticsearch autocomplete (if implemented) OR basic search
- Multiple filter combinations
- Stock filtering (validates STOCK_DISPLAY_FEATURE)
- Sort options

---

### 4.5 Dark Mode & Responsive Design (30 sec)

**Action:**
1. Toggle dark mode
2. Navigate through pages in dark mode
3. Resize browser window to mobile size
4. Show responsive navigation
5. Browse products in mobile view

**Script:**
> "The entire application supports dark mode for better user experience. It's fully responsive, providing an optimized experience across desktop, tablet, and mobile devices."

**Talking Points:**
- Dark mode support throughout app
- Responsive design
- Mobile-first approach
- Accessibility considerations

---

### 4.6 Edge Case Handling Demo (1 min)

**Action:**
1. Try to register with existing email → Show error
2. Try to add negative quantity to cart → Validation error
3. Try to checkout with empty cart → Blocked
4. Show out-of-stock product can't be added to cart
5. Try invalid email format in registration → Validation error

**Script:**
> "We've implemented comprehensive edge case handling throughout the application. Every input is validated, preventing common errors like duplicate emails, negative quantities, invalid formats, and adding out-of-stock items to cart. These validations are documented in our EDGECASES.md and covered by our test suite."

**Talking Points:**
- 40+ edge cases handled (EDGECASES.md)
- Input validation at multiple layers
- User-friendly error messages
- Production-grade reliability

---

## 🧪 PART 5: TECHNICAL EXCELLENCE (2 minutes)

### 5.1 Testing (30 sec)

**Action:**
1. Open terminal
2. Run: `docker exec livemart-api-dev npm test`
3. Show test results:
   - Unit tests: 15/15 passed
   - Integration tests: 7/7 passed
   - Total: 22 tests passed

**Script:**
> "We've implemented comprehensive testing with 22 passing tests. Unit tests validate business logic like price calculations and stock management, while integration tests ensure our API endpoints handle edge cases correctly. Every test connects to our documented features."

**Talking Points:**
- 22 passing tests (TESTING_IMPLEMENTATION.md)
- Unit + Integration test coverage
- Edge case validation
- CI/CD ready

---

### 5.2 Architecture Overview (1 min)

**Action:**
1. Show VS Code with project structure
2. Briefly show:
   - `server/` - Backend (Node.js + Express + MongoDB)
   - `client/` - Frontend (React + TypeScript + TailwindCSS)
   - `docker/` - Docker containerization
   - `docs/` - Comprehensive documentation

**Script:**
> "The application uses a modern MERN stack architecture. The backend is built with Node.js, Express, and MongoDB with Mongoose ODM. The frontend uses React with TypeScript for type safety and TailwindCSS for styling. Everything runs in Docker containers for consistent development and deployment environments."

**Talking Points:**
- MERN stack (MongoDB, Express, React, Node.js)
- TypeScript for type safety
- Docker containerization
- Microservices-ready architecture
- RESTful API design

---

### 5.3 Documentation (30 sec)

**Action:**
1. Open `docs/` folder
2. Show documentation files:
   - `EDGECASES.md` - 40+ edge cases
   - `STOCK_DISPLAY_FEATURE.md` - Feature specification
   - `TESTING_IMPLEMENTATION.md` - Test documentation
   - `REPORTPLAN.md` - Comprehensive feature list
   - `VIDEO_DEMO_SCRIPT.md` - This script

**Script:**
> "We've created comprehensive documentation covering every feature, edge case, and technical decision. This includes detailed specifications for complex features like stock display and price alerts, complete edge case documentation, and testing guides."

**Talking Points:**
- Comprehensive documentation
- Feature specifications
- Edge case catalog
- Developer guides

---

## 🎯 CONCLUSION (1 minute)

### Script
> "To summarize, Live MART is a production-ready e-commerce platform that goes beyond traditional marketplaces by implementing a complete B2B2C supply chain model."

**Key Achievements:**
1. ✅ **Multi-Stakeholder System**: Wholesalers, Retailers, and Customers with distinct workflows
2. ✅ **Advanced Inventory**: Real-time stock management with expected availability dates
3. ✅ **Smart Pricing**: Dynamic bulk pricing tiers and flexible discount system
4. ✅ **Location Intelligence**: Real-time distance calculation and delivery estimation
5. ✅ **Customer Engagement**: Price alerts, wishlists, reviews with images
6. ✅ **Production Quality**:
   - 22 passing tests covering all edge cases
   - 40+ documented edge cases handled
   - Comprehensive input validation
   - Full TypeScript type safety
7. ✅ **Modern Tech Stack**: MERN + Docker + Cloudinary + Google Maps + Razorpay
8. ✅ **Professional Documentation**: Feature specs, edge cases, testing guides

> "This platform demonstrates not just feature completeness, but production-grade software engineering practices including testing, documentation, edge case handling, and scalable architecture."

> "Thank you for watching this demonstration of Live MART!"

---

## 📋 QUICK REFERENCE CHECKLIST

Print this and check off during recording:

**Wholesaler:**
- ☐ Registration with GSTIN
- ☐ Create wholesale product with bulk pricing
- ☐ View B2B orders

**Retailer:**
- ☐ Registration with location
- ☐ Browse B2B marketplace
- ☐ Place wholesale order
- ☐ Add retail product to inventory
- ☐ Set product discount with reason
- ☐ Set expected availability date for out-of-stock item
- ☐ View dashboard analytics

**Customer:**
- ☐ Registration
- ☐ Browse products with stock indicators (green/orange/red)
- ☐ Show "In Stock Only" filter
- ☐ Try adding out-of-stock item (disabled)
- ☐ View discounted product with reason
- ☐ See distance and delivery time
- ☐ Sort by delivery speed
- ☐ View nearby stores map
- ☐ Add to cart (multi-retailer)
- ☐ Checkout with address autofill
- ☐ Select shipping date from calendar
- ☐ Complete payment
- ☐ View order history (multi-retailer suborders)
- ☐ Submit review with image
- ☐ Set price alert
- ☐ Add to wishlist

**Advanced Features:**
- ☐ Price alert notification
- ☐ Real-time notifications
- ☐ Search with autocomplete
- ☐ Filters (category, price, stock)
- ☐ Dark mode toggle
- ☐ Mobile responsive view
- ☐ Edge case validation demos

**Technical:**
- ☐ Run test suite
- ☐ Show project structure
- ☐ Show documentation

---

## 💡 TIPS FOR RECORDING

1. **Preparation:**
   - Clear browser cache and cookies
   - Use incognito/private mode for each user type
   - Have all user credentials written down
   - Pre-populate some data (products, orders) for wholesaler/retailer demos
   - Test the entire flow once before recording

2. **During Recording:**
   - Speak clearly and at moderate pace
   - Pause briefly between major sections
   - Zoom in on important UI elements
   - Use cursor highlights or annotations
   - If you make a mistake, pause and continue - edit later

3. **Screen Recording Settings:**
   - 1920x1080 resolution
   - 30 FPS
   - Record system audio for notification sounds
   - Use Zoom's recording feature or OBS Studio

4. **Post-Production:**
   - Add title slides for each major section
   - Add subtle background music (low volume)
   - Add text annotations for key features
   - Speed up slow parts (database operations) with time-lapse
   - Add smooth transitions between sections

---

**Total Estimated Time: 20 minutes**
**Actual may vary: 18-22 minutes is acceptable**

Good luck with your demo! 🚀
