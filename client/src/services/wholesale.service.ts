/**
 * Wholesale Service
 * Handles all B2B marketplace API calls for retailers
 */

import apiClient from './api';
import { Product, ProductListResponse } from '../types/product.types';
import { ApiResponse } from '../types/auth.types';

export interface WholesaleProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface WholesaleCategory {
  name: string;
  count: number;
  subcategories: string[];
}

class WholesaleService {
  /**
   * Get all wholesale products (B2B Marketplace)
   */
  async getWholesaleProducts(
    filters?: WholesaleProductFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<ProductListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (filters) {
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    }

    const response = await apiClient.get<ProductListResponse>(`/wholesale/products?${params.toString()}`);
    return response.data;
  }

  /**
   * Get wholesale product by ID
   */
  async getWholesaleProductById(id: string): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.get<ApiResponse<{ product: Product }>>(`/wholesale/products/${id}`);
    return response.data;
  }

  /**
   * Get wholesale product categories
   */
  async getWholesaleCategories(): Promise<ApiResponse<{ categories: WholesaleCategory[] }>> {
    const response = await apiClient.get<ApiResponse<{ categories: WholesaleCategory[] }>>('/wholesale/categories');
    return response.data;
  }
}

export default new WholesaleService();
