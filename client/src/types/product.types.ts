/**
 * Product Types
 * Type definitions for products and inventory
 */

export enum ProductType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE'
}

export interface BulkPricing {
  minQuantity: number;
  maxQuantity?: number;
  pricePerUnit: number;
}

export interface ProductDiscount {
  isActive: boolean;
  discountPercentage: number;
  validUntil: string;
  reason?: string;
}

export interface RetailerInventory {
  _id: string;
  ownerId: string;
  currentStock: number;
  reservedStock: number;
  sellingPrice: number;
  productDiscount?: ProductDiscount;
  availability: boolean;
  owner?: {
    _id: string;
    profile?: {
      name: string;
    };
    businessName?: string;
  };
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  category: {
    categoryId: string;
    name: string;
    subcategory?: string;
  };
  basePrice: number;
  unit: string;
  images: string[];
  tags?: string[];
  retailer?: {
    _id: string;
    businessName: string;
    rating: number;
  };
  createdBy?: {
    _id: string;
    email: string;
    profile: {
      name: string;
      location?: {
        coordinates: [number, number];
      };
    };
    businessName?: string;
    userType: string;
  };
  stock?: number;
  productType: ProductType; // NEW: RETAIL or WHOLESALE
  // Wholesale-specific fields
  minimumOrderQuantity?: number; // NEW: Minimum quantity for bulk orders
  bulkPricing?: BulkPricing[]; // NEW: Volume-based pricing tiers
  availableForRetailers?: boolean; // NEW: Can retailers see this in B2B marketplace
  isActive: boolean;
  averageRating?: number;
  reviewCount?: number;
  retailerInventories?: RetailerInventory[]; // Inventory data with discounts
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  search?: string;
  retailerId?: string;
  inStock?: boolean;
  productType?: ProductType; // NEW: Filter by product type
}

export interface ProductListResponse {
  success: boolean;
  message: string;
  data: {
    products: Product[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface InventoryItem extends Product {
  stock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  salesCount: number;
  revenue: number;
}
