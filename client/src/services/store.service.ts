import apiClient from './api';
import {
  Store,
  StoreFilters,
  StoreSearchParams,
  NearbyStoresResponse,
  StoreDetailResponse,
} from '../types/store.types';

/**
 * Store Service
 * Handles store/retailer location-based API calls
 */

class StoreService {
  /**
   * Get nearby stores based on user location
   */
  async getNearbyStores(
    latitude: number,
    longitude: number,
    filters?: StoreFilters
  ): Promise<NearbyStoresResponse> {
    const params = new URLSearchParams();
    params.append('lat', latitude.toString());
    params.append('lng', longitude.toString());

    if (filters?.radius) {
      params.append('radius', filters.radius.toString());
    }
    if (filters?.category) {
      params.append('category', filters.category);
    }
    if (filters?.minRating) {
      params.append('minRating', filters.minRating.toString());
    }
    if (filters?.openNow !== undefined) {
      params.append('openNow', filters.openNow.toString());
    }

    const response = await apiClient.get<NearbyStoresResponse>(
      `/stores/nearby?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get store details by ID
   */
  async getStoreById(
    storeId: string,
    userLatitude?: number,
    userLongitude?: number
  ): Promise<StoreDetailResponse> {
    const params = new URLSearchParams();
    if (userLatitude !== undefined && userLongitude !== undefined) {
      params.append('userLat', userLatitude.toString());
      params.append('userLng', userLongitude.toString());
    }

    const queryString = params.toString();
    const url = queryString ? `/stores/${storeId}?${queryString}` : `/stores/${storeId}`;

    const response = await apiClient.get<StoreDetailResponse>(url);
    return response.data;
  }

  /**
   * Search stores with advanced filters
   */
  async searchStores(searchParams: StoreSearchParams): Promise<NearbyStoresResponse> {
    const response = await apiClient.post<NearbyStoresResponse>(
      '/stores/search',
      searchParams
    );
    return response.data;
  }
}

export default new StoreService();
