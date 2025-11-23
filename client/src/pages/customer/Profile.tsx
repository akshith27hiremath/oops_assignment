/**
 * Customer Profile Page - GroceryMart Style
 * View and edit customer profile with organized sections
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import { User } from '../../types/auth.types';
import authService from '../../services/auth.service';
import profileService, { UpdateProfileRequest, UpdatePasswordRequest } from '../../services/profile.service';
import geolocationService from '../../services/geolocation.service';
import discountService from '../../services/discount.service';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { DiscountCode, LoyaltyTier } from '../../types/discount.types';
import LoyaltyTierBadge from '../../components/loyalty/LoyaltyTierBadge';
import toast from 'react-hot-toast';

const CustomerProfile: React.FC = () => {
  const navigate = useNavigate();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  // Loyalty & Discount state
  const [loyaltyTier, setLoyaltyTier] = useState<LoyaltyTier>(LoyaltyTier.BRONZE);
  const [completedOrders, setCompletedOrders] = useState<number>(0);
  const [availableCodes, setAvailableCodes] = useState<DiscountCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.profile?.name || '',
    phone: user?.profile?.phone || '',
    bio: user?.profile?.bio || '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.profile?.name || '',
        phone: user.profile?.phone || '',
        bio: user.profile?.bio || '',
      });

      // Calculate loyalty tier
      const userData = user as any;
      const orderHistory = userData.orderHistory || [];
      setCompletedOrders(orderHistory.length);
      const tierInfo = discountService.calculateLoyaltyTier(orderHistory.length);
      setLoyaltyTier(tierInfo.tier);

      // Load available discount codes
      loadDiscountCodes();

      // Load address from coordinates (only when Google Maps is loaded)
      if (user.profile?.location?.coordinates && mapsLoaded) {
        loadAddress(user.profile.location.coordinates[1], user.profile.location.coordinates[0]);
      }
    }
  }, [user, mapsLoaded]);

  const loadAddress = async (lat: number, lng: number) => {
    try {
      setLoadingAddress(true);
      const addr = await geolocationService.reverseGeocode(lat, lng);
      setAddress(addr);
    } catch (error) {
      console.error('Failed to load address:', error);
      setAddress(null);
    } finally {
      setLoadingAddress(false);
    }
  };

  const loadDiscountCodes = async () => {
    try {
      setLoadingCodes(true);
      console.log('🔍 Loading discount codes...');
      // Pass a high cart total to show all codes (including those with minimum purchase requirements)
      const response = await discountService.getMyDiscountCodes(999999);
      console.log('📦 Discount codes response:', response);
      if (response.success) {
        setAvailableCodes(response.data.codes);
        console.log('✅ Loaded', response.data.codes.length, 'discount codes');
      } else {
        console.error('❌ Failed to load codes:', response);
      }
    } catch (error: any) {
      console.error('❌ Failed to load discount codes:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty array on error to show empty state instead of loading forever
      setAvailableCodes([]);
    } finally {
      setLoadingCodes(false);
    }
  };

  const loadUser = async () => {
    try {
      setInitialLoading(true);
      const response = await authService.getCurrentUser();
      if (response.success) {
        setUser(response.data.user);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      navigate('/login');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const updateData: UpdateProfileRequest = {
        profile: {
          name: profileData.name,
          phone: profileData.phone,
          bio: profileData.bio,
        },
      };

      const response = await profileService.updateProfile(updateData);
      if (response.success) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Profile updated successfully!');
        setEditMode(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      const response = await profileService.updatePassword(passwordData);
      if (response.success) {
        toast.success('Password updated successfully!');
        setPasswordMode(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    try {
      setUpdatingLocation(true);
      const location = await geolocationService.getCurrentPosition();

      const response = await profileService.updateLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (response.success) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Update address display
        if (mapsLoaded) {
          loadAddress(location.latitude, location.longitude);
        }

        toast.success('Location updated successfully!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to update location');
    } finally {
      setUpdatingLocation(false);
    }
  };

  const getUserInitials = () => {
    if (!user?.profile?.name) return 'U';
    return user.profile.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (initialLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading profile...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-lg">
                {getUserInitials()}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {user?.profile?.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{user?.email}</p>
              <span className="px-4 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full text-sm font-semibold">
                CUSTOMER
              </span>

              {user?.loyaltyPoints !== undefined && (
                <div className="mt-6 w-full p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Loyalty Points</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 text-center mt-1">
                    {user.loyaltyPoints.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Loyalty Tier Badge */}
              <div className="mt-6 w-full flex justify-center">
                <LoyaltyTierBadge tier={loyaltyTier} completedOrders={completedOrders} showProgress={true} size="md" />
              </div>
            </div>
          </div>

          {/* Available Discount Codes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              My Discount Codes
            </h3>

            {loadingCodes ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-green-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading codes...</p>
              </div>
            ) : availableCodes.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">No discount codes available</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Keep placing orders to unlock rewards!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableCodes.map((code) => (
                  <div
                    key={code._id}
                    className="p-4 border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-green-700 dark:text-green-400">{code.code}</span>
                          <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-semibold">
                            {discountService.formatDiscountValue(code)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{code.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                          <span>{discountService.formatExpiry(code.validUntil)}</span>
                          {code.minPurchaseAmount > 0 && (
                            <span>Min: ₹{code.minPurchaseAmount.toFixed(2)}</span>
                          )}
                          {code.maxUsesPerUser > 0 && (
                            <span>Uses: {code.maxUsesPerUser}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Account Info</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user?.isActive
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  }`}
                >
                  {user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Verified</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user?.isVerified
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {user?.isVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Member Since</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Profile Information</h3>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-gray-900 dark:bg-green-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-green-700 transition font-medium"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gray-900 dark:bg-green-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-green-700 transition font-medium disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setProfileData({
                        name: user?.profile?.name || '',
                        phone: user?.profile?.phone || '',
                        bio: user?.profile?.bio || '',
                      });
                    }}
                    className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Full Name
                  </label>
                  <p className="text-base text-gray-900 dark:text-white font-medium">{user?.profile?.name || 'Not set'}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Email
                  </label>
                  <p className="text-base text-gray-900 dark:text-white font-medium">{user?.email}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Phone Number
                  </label>
                  <p className="text-base text-gray-900 dark:text-white font-medium">{user?.phone || user?.profile?.phone || 'Not set'}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Bio</label>
                  <p className="text-base text-gray-900 dark:text-white">
                    {user?.profile?.bio || 'No bio added yet'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Saved Location
                    </label>
                    <button
                      onClick={handleUpdateLocation}
                      disabled={updatingLocation}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {updatingLocation ? 'Updating...' : 'Update Location'}
                    </button>
                  </div>
                  {user?.profile?.location?.coordinates ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1">
                          {loadingAddress ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Loading address...</p>
                            </div>
                          ) : address ? (
                            <p className="text-base text-gray-900 dark:text-white font-medium">
                              {address}
                            </p>
                          ) : (
                            <p className="text-base text-gray-900 dark:text-white font-medium">
                              Location saved
                            </p>
                          )}
                        </div>
                      </div>
                      <details className="pl-7">
                        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                          Show coordinates
                        </summary>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                          <p>Latitude: {user.profile.location.coordinates[1].toFixed(6)}</p>
                          <p>Longitude: {user.profile.location.coordinates[0].toFixed(6)}</p>
                        </div>
                      </details>
                      <p className="text-xs text-gray-500 dark:text-gray-400 pl-7">
                        Used for nearby stores and delivery estimates
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-base text-gray-900 dark:text-white">No location set</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click "Update Location" above to set your location using GPS
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Security Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Security</h3>
              {!passwordMode && (
                <button
                  onClick={() => setPasswordMode(true)}
                  className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition font-medium"
                >
                  Change Password
                </button>
              )}
            </div>

            {passwordMode ? (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                    minLength={8}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimum 8 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gray-900 dark:bg-green-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-green-700 transition font-medium disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordMode(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    }}
                    className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Keep your account secure by regularly updating your password. Use a strong password with a combination of letters, numbers, and special characters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerProfile;
