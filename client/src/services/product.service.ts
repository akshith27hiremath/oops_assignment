/**
 * Product Service
 * Handles all product-related API calls
 */

import apiClient from './api';
import { Product, ProductFilters, ProductListResponse } from '../types/product.types';
import { ApiResponse } from '../types/auth.types';

class ProductService {
  /**
   * Get all products with filters
   */
  async getProducts(
    filters?: ProductFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<ProductListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (filters) {
      if (filters.category) params.append('category', filters.category);
      if (filters.subcategory) params.append('subcategory', filters.subcategory);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.retailerId) params.append('retailerId', filters.retailerId);
      if (filters.inStock !== undefined) params.append('inStock', filters.inStock.toString());
      if (filters.tags && filters.tags.length > 0) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }
    }

    const response = await apiClient.get<ProductListResponse>(`/products?${params.toString()}`);
    return response.data;
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.get<ApiResponse<{ product: Product }>>(`/products/${id}`);
    return response.data;
  }

  /**
   * Create a new product (Retailer/Wholesaler only)
   */
  async createProduct(data: Partial<Product>): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.post<ApiResponse<{ product: Product }>>('/products', data);
    return response.data;
  }

  /**
   * Create a new product with images (Retailer/Wholesaler only)
   */
  async createProductWithImages(formData: FormData): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.post<ApiResponse<{ product: Product }>>('/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Update a product (Retailer/Wholesaler only)
   */
  async updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.put<ApiResponse<{ product: Product }>>(`/products/${id}`, data);
    return response.data;
  }

  /**
   * Update a product with images (Retailer/Wholesaler only)
   */
  async updateProductWithImages(id: string, formData: FormData): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.put<ApiResponse<{ product: Product }>>(`/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Delete a product (Retailer/Wholesaler only)
   */
  async deleteProduct(id: string): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/products/${id}`);
    return response.data;
  }

  /**
   * Get retailer's inventory
   */
  async getInventory(): Promise<ProductListResponse> {
    // Use the seller's products endpoint
    const response = await apiClient.get<ProductListResponse>('/products/seller/my-products');
    return response.data;
  }

  /**
   * Update product stock
   */
  async updateStock(productId: string, stock: number): Promise<ApiResponse> {
    const response = await apiClient.patch<ApiResponse>(`/products/${productId}/stock`, { stock });
    return response.data;
  }

  /**
   * Get autocomplete suggestions (uses Elasticsearch)
   */
  async getAutocompleteSuggestions(query: string): Promise<Array<{ _id: string; name: string; basePrice: number; unit: string }>> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          products: Array<{ _id: string; name: string; basePrice: number; unit: string }>
        }
      }>(
        `/search/suggestions?q=${encodeURIComponent(query)}`
      );
      return response.data.data.products;
    } catch (error) {
      console.error('Autocomplete error:', error);
      return [];
    }
  }
}

export default new ProductService();
