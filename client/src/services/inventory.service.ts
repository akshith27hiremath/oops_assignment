/**
 * Inventory Service
 * Handles all inventory-related API calls
 */

import apiClient from './api';
import { ApiResponse } from '../types/auth.types';

export interface ProductDiscount {
  isActive: boolean;
  discountPercentage: number;
  validUntil: Date;
  reason?: string;
}

export interface Inventory {
  _id: string;
  productId: {
    _id: string;
    name: string;
    category: {
      categoryId: string;
      name: string;
      subcategory?: string;
    };
    basePrice: number;
    unit: string;
    images: string[];
  };
  ownerId: string | {
    _id: string;
    profile?: {
      name: string;
      location?: string;
    };
    businessName?: string;
  };
  currentStock: number;
  reservedStock: number;
  reorderLevel: number;
  sellingPrice: number;
  productDiscount?: ProductDiscount;
  availability: boolean;
  expectedAvailabilityDate?: Date | string;
  lastRestocked: Date;
  // B2B tracking fields
  sourceType?: 'SELF_CREATED' | 'B2B_ORDER';
  sourceOrderId?: {
    _id: string;
    orderNumber: string;
    createdAt: string;
  };
  wholesalerId?: {
    _id: string;
    profile?: {
      name: string;
    };
    businessName?: string;
  };
  wholesalePricePaid?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryListResponse extends ApiResponse {
  data: {
    inventory: Inventory[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

class InventoryService {
  /**
   * Get current user's inventory
   */
  async getInventory(page: number = 1, limit: number = 20): Promise<InventoryListResponse> {
    const response = await apiClient.get<InventoryListResponse>(`/inventory?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Create inventory entry for a product
   */
  async createInventory(data: {
    productId: string;
    currentStock: number;
    reorderLevel?: number;
    sellingPrice?: number;
  }): Promise<ApiResponse<{ inventory: Inventory }>> {
    const response = await apiClient.post<ApiResponse<{ inventory: Inventory }>>('/inventory', data);
    return response.data;
  }

  /**
   * Update stock level
   */
  async updateStock(inventoryId: string, currentStock: number): Promise<ApiResponse<{ inventory: Inventory }>> {
    const response = await apiClient.patch<ApiResponse<{ inventory: Inventory }>>(
      `/inventory/${inventoryId}/stock`,
      { currentStock }
    );
    return response.data;
  }

  /**
   * Update expected availability date
   */
  async updateExpectedAvailability(inventoryId: string, expectedAvailabilityDate: Date | null): Promise<ApiResponse<{ inventory: Inventory }>> {
    const response = await apiClient.patch<ApiResponse<{ inventory: Inventory }>>(
      `/inventory/${inventoryId}/availability-date`,
      { expectedAvailabilityDate }
    );
    return response.data;
  }

  /**
   * Get inventory by product ID
   */
  async getInventoryByProduct(productId: string): Promise<ApiResponse<{ inventory: Inventory }>> {
    const response = await apiClient.get<ApiResponse<{ inventory: Inventory }>>(`/inventory/product/${productId}`);
    return response.data;
  }

  /**
   * Set product discount
   */
  async setProductDiscount(
    inventoryId: string,
    discountPercentage: number,
    validUntil: Date,
    reason?: string
  ): Promise<ApiResponse<{ inventory: Inventory }>> {
    const response = await apiClient.post<ApiResponse<{ inventory: Inventory }>>(
      `/inventory/${inventoryId}/discount`,
      { discountPercentage, validUntil, reason }
    );
    return response.data;
  }

  /**
   * Remove product discount
   */
  async removeProductDiscount(inventoryId: string): Promise<ApiResponse<{ inventory: Inventory }>> {
    const response = await apiClient.delete<ApiResponse<{ inventory: Inventory }>>(
      `/inventory/${inventoryId}/discount`
    );
    return response.data;
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 10): Promise<ApiResponse<{ products: Inventory[] }>> {
    const response = await apiClient.get<ApiResponse<{ products: Inventory[] }>>(
      `/inventory/featured?limit=${limit}`
    );
    return response.data;
  }

  /**
   * Calculate discounted price
   */
  getDiscountedPrice(inventory: Inventory): number {
    if (!inventory.productDiscount || !inventory.productDiscount.isActive) {
      return inventory.sellingPrice;
    }

    const now = new Date();
    const validUntil = new Date(inventory.productDiscount.validUntil);
    if (validUntil < now) {
      return inventory.sellingPrice;
    }

    const discount = (inventory.sellingPrice * inventory.productDiscount.discountPercentage) / 100;
    return Math.round((inventory.sellingPrice - discount) * 100) / 100;
  }
}

export default new InventoryService();
