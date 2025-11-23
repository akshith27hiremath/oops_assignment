# Google Maps API Setup Guide

## 🚨 Quick Fix for "REQUEST_DENIED" Error

If you're getting `"API keys with referer restrictions cannot be used with this API"`:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Click on your API key
3. Under **Application restrictions**:
   - Change from "HTTP referrers" to **None**
4. Click **Save** and wait 1-2 minutes

## Required APIs for Delivery Estimation

For the delivery estimation feature to work, you need to enable these APIs in Google Cloud Console:

### 1. **Geocoding API**
- **Purpose**: Convert delivery addresses to GPS coordinates
- **Endpoint**: `https://maps.googleapis.com/maps/api/geocode/json`
- **Required for**: Converting "123 Street, City" → (lat, lng)

### 2. **Routes API (Directions API v2)**
- **Purpose**: Calculate driving time and distance between two points
- **Endpoint**: `https://routes.googleapis.com/directions/v2:computeRoutes`
- **Required for**: Getting actual driving distance/time with traffic

## Setup Steps

### Step 1: Enable APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Library**
4. Search and enable:
   - ✅ **Geocoding API**
   - ✅ **Routes API** (or **Directions API**)

### Step 2: Configure API Key Restrictions (CRITICAL!)

**IMPORTANT**: The error "API keys with referer restrictions cannot be used with this API" means you have **HTTP referrer restrictions** enabled. This MUST be removed for backend API calls.

#### Option A: No Restrictions (Recommended for Development)
1. Go to **APIs & Services** → **Credentials**
2. Click on your API key (e.g., "Browser key (auto created by Firebase)")
3. Under **Application restrictions**:
   - ⚠️ **MUST** select **None** (not "HTTP referrers")
   - Backend servers cannot send referrer headers
4. Under **API restrictions**:
   - Select **Don't restrict key** (easiest for testing)
   - OR select **Restrict key** and enable:
     - ✅ Geocoding API
     - ✅ Routes API
5. Click **Save**
6. Wait 1-2 minutes for changes to propagate

#### Option B: Separate Keys for Frontend/Backend (Production)
Create TWO API keys:

**Backend API Key** (for server):
- Application restrictions: **None**
- API restrictions: Geocoding API, Routes API
- Use in: docker-compose.dev.yml

**Frontend API Key** (for browser):
- Application restrictions: **HTTP referrers** (e.g., `localhost:3000/*`, `yourdomain.com/*`)
- API restrictions: Maps JavaScript API, Places API
- Use in: React app environment variables

### Step 3: Check API Quotas
1. Go to **APIs & Services** → **Enabled APIs**
2. Click on each API
3. Check quotas:
   - **Geocoding API**: Free tier = 40,000 requests/month
   - **Routes API**: Pricing varies, check current rates

### Step 4: Enable Billing (Required!)
**CRITICAL**: Google Maps APIs require billing to be enabled, even if you stay within free tier.

1. Go to **Billing** in Google Cloud Console
2. Link a billing account (credit card required)
3. Google provides $200/month free credit for Maps Platform

### Step 5: Verify API Key
Run this curl command to test:

```bash
# Test Geocoding API
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Hyderabad,India&key=YOUR_API_KEY"

# Expected response: status: "OK"
# Error response: status: "REQUEST_DENIED" (billing not enabled or API not enabled)
```

## Common Error Messages

### REQUEST_DENIED
**Cause**:
- Billing not enabled
- API not enabled in project
- API key restrictions blocking the request

**Solution**:
1. Enable billing
2. Enable Geocoding API and Routes API
3. Remove API key restrictions temporarily for testing

### ZERO_RESULTS
**Cause**: Address not found or too vague

**Solution**: Use real, specific addresses:
- ✅ Good: "HITEC City, Hyderabad, Telangana, India"
- ❌ Bad: "123 Test Street, Jubilee Hills"

### OVER_QUERY_LIMIT
**Cause**: Exceeded free tier limits

**Solution**:
- Check quotas in Cloud Console
- Enable billing if not already enabled

## Testing Addresses for Hyderabad

Use these real addresses for testing:

### Retailer Locations (already in database)
- **Dairy Delights**: Banjara Hills, Hyderabad (coordinates in profile)
- **Spice Market**: HITEC City, Hyderabad (coordinates in profile)

### Test Delivery Addresses
1. **Gachibowli**: "Gachibowli, Hyderabad, Telangana 500032, India"
2. **Madhapur**: "Madhapur, Hyderabad, Telangana 500081, India"
3. **Kondapur**: "Kondapur, Hyderabad, Telangana 500084, India"
4. **Kukatpally**: "Kukatpally, Hyderabad, Telangana 500072, India"

## Current Implementation

### Fallback System
The delivery service now has a 3-tier fallback:

1. **Primary**: Google Maps Routes API (most accurate, includes traffic)
2. **Fallback 1**: Haversine distance calculation (direct distance)
3. **Fallback 2**: Order creation succeeds without delivery estimate

This ensures orders are NEVER blocked by API failures.

## Verification Commands

```bash
# Check if API key is set in Docker
docker exec livemart-api-dev printenv | grep GOOGLE_MAPS_API_KEY

# Check backend logs for geocoding
docker logs livemart-api-dev --tail 50 | grep -i geocod

# Check for delivery estimate logs
docker logs livemart-api-dev --tail 50 | grep "📍"
```

## Expected Log Output (Success)

```
[info]: 📍 Sub-order ORD-XXX-R1 delivery estimate: 2.5 km, 12 mins
[info]: 📍 Sub-order ORD-XXX-R2 delivery estimate: 8.3 km, 28 mins
[info]: 📍 Master delivery estimate set from first sub-order: 12 mins
```

## Expected Log Output (Fallback)

```
[warn]: Google Maps API failed, using Haversine distance fallback
[info]: 📍 Sub-order ORD-XXX-R1 delivery estimate (fallback): 2.5 km, 8 mins
```

## Cost Estimation

### Free Tier (with $200 monthly credit)
- **Geocoding**: $5 per 1000 requests (after free 40k/month)
- **Routes API**: $5-$10 per 1000 requests
- **Typical usage**: ~100 orders/day = ~6000 API calls/month = FREE

### Production Costs (1000 orders/month)
- Geocoding: ~2000 calls = $10
- Routes: ~2000 calls = $10-20
- **Total**: ~$20-30/month (well under $200 free credit)

## Recommendations

1. ✅ Enable billing (required even for free tier)
2. ✅ Enable both Geocoding API and Routes API
3. ✅ Use "Don't restrict key" for development
4. ✅ Use real addresses for testing
5. ✅ Monitor usage in Cloud Console weekly
6. ✅ Set up budget alerts at $50, $100, $150

## Next Steps After Setup

1. Restart the API container: `docker-compose -f docker/docker-compose.dev.yml restart api`
2. Test order creation with real Hyderabad address
3. Check logs for successful delivery estimate calculation
4. Verify estimates appear in retailer and customer UIs
