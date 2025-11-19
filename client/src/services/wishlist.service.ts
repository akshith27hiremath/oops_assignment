/**
 * Wishlist Service
 * Handles all wishlist-related API calls
 */

import apiClient from './api';
import { Product } from '../types/product.types';
import { ApiResponse } from '../types/auth.types';

class WishlistService {
  /**
   * Get user's wishlist
   */
  async getWishlist(): Promise<ApiResponse<{ products: Product[]; count: number }>> {
    const response = await apiClient.get<ApiResponse<{ products: Product[]; count: number }>>('/wishlist');
    return response.data;
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(productId: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>('/wishlist', { productId });
    return response.data;
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(productId: string): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/wishlist/${productId}`);
    return response.data;
  }

  /**
   * Check if product is in wishlist
   */
  async isInWishlist(productId: string): Promise<ApiResponse<{ isInWishlist: boolean }>> {
    const response = await apiClient.get<ApiResponse<{ isInWishlist: boolean }>>(
      `/wishlist/check/${productId}`
    );
    return response.data;
  }

  /**
   * Clear wishlist
   */
  async clearWishlist(): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>('/wishlist');
    return response.data;
  }

  /**
   * Set target price for wishlist item
   */
  async setTargetPrice(productId: string, targetPrice: number): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(
      `/wishlist/${productId}/target-price`,
      { targetPrice }
    );
    return response.data;
  }

  /**
   * Update wishlist item preferences
   */
  async updateItemPreferences(
    productId: string,
    preferences: {
      priceAlertEnabled?: boolean;
      notifyOnDiscount?: boolean;
      notifyOnTargetPrice?: boolean;
      notifyOnRestock?: boolean;
    }
  ): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(
      `/wishlist/${productId}/preferences`,
      preferences
    );
    return response.data;
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(productId: string, days: number = 30): Promise<ApiResponse<any>> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/wishlist/price-history/${productId}?days=${days}`
    );
    return response.data;
  }
}

export default new WishlistService();
