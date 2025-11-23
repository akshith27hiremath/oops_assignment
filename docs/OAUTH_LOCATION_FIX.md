# OAuth Customer Location Update - Implementation

## Problem

OAuth customers (who register via Google/Facebook) bypass the normal registration form, which means they never provide:
- Phone number (can be updated via Profile page)
- **Location/GPS coordinates** (was NOT saveable to database)

Previously, the Nearby Stores page only saved location to `localStorage`, not to the database. This meant:
- Location was lost when localStorage was cleared
- Location was not available across devices
- Location was not available for checkout address auto-fill

## Solution Implemented

### 1. **NearbyStores Page** (`client/src/pages/customer/NearbyStores.tsx`)

**Changes:**
- Added `profileService` import
- Added `saveLocationToBackend()` helper function that:
  - Calls `profileService.updateLocation()` API
  - Updates user object in localStorage
  - Silent failure (doesn't break UI if API call fails)
- Updated `loadUserLocation()` to save to backend when GPS is detected
- Updated `handleUseCurrentLocation()` to save to backend when user clicks "Use Current Location"

**User Flow:**
1. Customer visits `/customer/nearby-stores`
2. Page detects GPS location automatically
3. Location is saved to:
   - localStorage (for immediate use)
   - Backend database (for persistence)
4. Toast message: "Location detected successfully"

OR

1. Customer clicks "Use Current Location" button in filters
2. GPS location is detected
3. Location saved to both localStorage and database
4. Toast message: "Location updated and saved to your profile"

### 2. **Profile Page** (`client/src/pages/customer/Profile.tsx`)

**Changes:**
- Added `updatingLocation` state variable
- Added `handleUpdateLocation()` function that:
  - Gets current GPS position
  - Calls `profileService.updateLocation()` API
  - Updates user state and localStorage
  - Refreshes address display
- Added "Update Location" button in Saved Location section
- Updated empty state message to guide users

**User Flow:**
1. Customer visits `/customer/profile`
2. Scrolls to "Saved Location" section
3. Clicks "Update Location" button
4. Browser requests location permission
5. Location saved to database and displayed
6. Toast message: "Location updated successfully!"

## Backend API

**Endpoint:** `PUT /api/auth/location`

**Request Body:**
```json
{
  "latitude": 17.385,
  "longitude": 78.4867
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "user": {
      // Updated user object with location in profile.location.coordinates
    }
  }
}
```

**Authentication:** Required (JWT token)

**Implementation:** `server/src/controllers/auth.controller.ts:654-707`

## Testing Checklist

- [x] OAuth user can update location from Profile page
- [x] OAuth user location auto-saves when visiting Nearby Stores
- [x] Location persists across browser sessions
- [x] Location available for checkout address auto-fill
- [x] Location displays correctly on Profile page
- [x] Coordinates stored in correct GeoJSON format `[longitude, latitude]`
- [x] Toast notifications work correctly
- [x] Loading states display properly
- [x] Error handling works (silent fail for backend, user-facing for GPS permission)

## Files Modified

1. `client/src/pages/customer/NearbyStores.tsx`
   - Added backend location save on GPS detection
   - Added backend location save on "Use Current Location"

2. `client/src/pages/customer/Profile.tsx`
   - Added "Update Location" button
   - Added location update handler
   - Updated empty state guidance

3. Backend (no changes needed)
   - API endpoint already existed: `PUT /api/auth/location`
   - OAuth users already have profile object initialized

## How OAuth Users Now Provide Location

| Method | Page | Action |
|--------|------|--------|
| **Automatic** | Nearby Stores | Visits page → GPS auto-detected → Saved to DB |
| **Manual Button** | Nearby Stores | Clicks "Use Current Location" → GPS detected → Saved to DB |
| **Manual Button** | Profile | Clicks "Update Location" → GPS detected → Saved to DB |

All three methods now save location to the database permanently.

## Notes

- OAuth users created via `oauth.service.ts` have profile object initialized (line 79-83)
- Phone number stored at `user.phone` NOT `user.profile.phone` (legacy issue)
- Profile page already had logic to check both locations: `user?.phone || user?.profile?.phone`
- Location saved in GeoJSON Point format: `{ type: 'Point', coordinates: [lng, lat] }`
