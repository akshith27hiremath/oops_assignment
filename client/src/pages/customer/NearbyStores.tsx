import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import GoogleMapComponent from '../../components/maps/GoogleMapComponent';
import StoreCard from '../../components/maps/StoreCard';
import storeService from '../../services/store.service';
import geolocationService from '../../services/geolocation.service';
import profileService from '../../services/profile.service';
import { Store, GeoLocation, StoreFilters } from '../../types/store.types';
import toast from 'react-hot-toast';
import DarkModeToggle from '../../components/DarkModeToggle';

const NearbyStores: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [filters, setFilters] = useState<StoreFilters>({
    radius: 10,
    openNow: false,
    minRating: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadNearbyStores();
    }
  }, [userLocation, filters]);

  const saveLocationToBackend = async (location: GeoLocation) => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        // Only save to backend if user is logged in
        await profileService.updateLocation({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        // Update user in localStorage
        const user = JSON.parse(userStr);
        user.profile.location = {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
        };
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Failed to save location to backend:', error);
      // Don't show error to user - localStorage save is still successful
    }
  };

  const loadUserLocation = async () => {
    try {
      // First try to get location from logged-in user's profile
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.profile?.location?.coordinates) {
          // Convert from GeoJSON to {latitude, longitude}
          const profileLocation = {
            latitude: user.profile.location.coordinates[1],
            longitude: user.profile.location.coordinates[0],
          };
          setUserLocation(profileLocation);
          geolocationService.saveLocation(profileLocation);
          return;
        }
      }

      // Try to get saved location from localStorage
      const savedLocation = geolocationService.getSavedLocation();
      if (savedLocation) {
        setUserLocation(savedLocation);
        return;
      }

      // Request current position from browser
      const location = await geolocationService.getCurrentPosition();
      setUserLocation(location);
      geolocationService.saveLocation(location);

      // Save to backend database if user is logged in
      await saveLocationToBackend(location);

      toast.success('Location detected successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to get your location');
      // Default to Hyderabad city center
      const defaultLocation = { latitude: 17.385, longitude: 78.4867 };
      setUserLocation(defaultLocation);
    }
  };

  const loadNearbyStores = async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      const response = await storeService.getNearbyStores(
        userLocation.latitude,
        userLocation.longitude,
        filters
      );

      if (response.success) {
        setStores(response.data.stores);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load nearby stores');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      const location = await geolocationService.getCurrentPosition();
      setUserLocation(location);
      geolocationService.saveLocation(location);

      // Save to backend database if user is logged in
      await saveLocationToBackend(location);

      toast.success('Location updated and saved to your profile');
    } catch (error: any) {
      toast.error(error.message || 'Failed to get your location');
    }
  };

  const handleRadiusChange = (value: number) => {
    setFilters(prev => ({ ...prev, radius: value }));
  };

  const handleOpenNowToggle = () => {
    setFilters(prev => ({ ...prev, openNow: !prev.openNow }));
  };

  const handleMinRatingChange = (value: number) => {
    setFilters(prev => ({ ...prev, minRating: value }));
  };

  const mapMarkers = useMemo(() => {
    const markers = [];

    // Add store markers (green for open, red for closed)
    stores.forEach(store => {
      markers.push({
        position: store.location,
        title: store.name,
        icon: store.isOpen
          ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
          : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        onClick: () => setSelectedStore(store),
      });
    });

    // Add user location marker LAST so it renders on top
    if (userLocation) {
      markers.push({
        position: userLocation,
        title: 'You Are Here',
        icon: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
      });
    }

    return markers;
  }, [userLocation, stores]);

  if (loading && !userLocation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nearby Stores</h1>
              <p className="text-sm text-gray-500 mt-1">
                Found {stores.length} store{stores.length !== 1 ? 's' : ''} within{' '}
                {filters.radius} km
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DarkModeToggle />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filters
              </button>
              <Link
                to="/customer/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-88px)]">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>

            {/* Radius Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Search Radius: {filters.radius} km
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={filters.radius}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>

            {/* Open Now Toggle */}
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.openNow}
                  onChange={handleOpenNowToggle}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Open now only</span>
              </label>
            </div>

            {/* Min Rating Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Minimum Rating
              </label>
              <select
                value={filters.minRating}
                onChange={(e) => handleMinRatingChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={0}>Any</option>
                <option value={3}>3+ stars</option>
                <option value={4}>4+ stars</option>
                <option value={4.5}>4.5+ stars</option>
              </select>
            </div>

            {/* Current Location Button */}
            <button
              onClick={handleUseCurrentLocation}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Use Current Location
            </button>
          </div>
        )}

        {/* Map View */}
        <div className="flex-1 relative">
          {userLocation && (
            <GoogleMapComponent
              center={userLocation}
              markers={mapMarkers}
              className="w-full h-full"
            />
          )}

          {/* Selected Store Info Window */}
          {selectedStore && (
            <div className="absolute top-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
              <button
                onClick={() => setSelectedStore(null)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <StoreCard store={selectedStore} />
            </div>
          )}
        </div>

        {/* Store List */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              {stores.length} Store{stores.length !== 1 ? 's' : ''}
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">Loading stores...</p>
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-2 text-gray-600 dark:text-gray-300">No stores found nearby</p>
                <p className="text-sm text-gray-500 mt-1">
                  Try increasing the search radius
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stores.map(store => (
                  <div
                    key={store._id}
                    onClick={() => setSelectedStore(store)}
                    className="cursor-pointer"
                  >
                    <StoreCard store={store} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NearbyStores;
