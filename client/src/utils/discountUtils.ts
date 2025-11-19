/**
 * Centralized Discount Utilities
 * Single source of truth for all discount calculations
 */

import { Product, RetailerInventory } from '../types/product.types';

export interface ProductDiscountInfo {
  hasDiscount: boolean;
  discountPercentage: number;
  originalPrice: number;
  discountedPrice: number;
  savings: number;
  reason?: string;
}

/**
 * Get the best product-level discount from retailer inventories
 */
export const getProductDiscount = (product: Product): ProductDiscountInfo => {
  const originalPrice = product.basePrice;

  // Default: no discount
  const noDiscount: ProductDiscountInfo = {
    hasDiscount: false,
    discountPercentage: 0,
    originalPrice,
    discountedPrice: originalPrice,
    savings: 0,
  };

  // Check if product has retailer inventories with discounts
  if (!product.retailerInventories || product.retailerInventories.length === 0) {
    return noDiscount;
  }

  let bestDiscount = 0;
  let bestReason: string | undefined;
  const now = new Date();

  // Find the best discount from all retailer inventories
  for (const inventory of product.retailerInventories) {
    if (inventory.productDiscount?.isActive && new Date(inventory.productDiscount.validUntil) > now) {
      if (inventory.productDiscount.discountPercentage > bestDiscount) {
        bestDiscount = inventory.productDiscount.discountPercentage;
        bestReason = inventory.productDiscount.reason;
      }
    }
  }

  if (bestDiscount === 0) {
    return noDiscount;
  }

  // Calculate discounted price
  const discountedPrice = originalPrice * (1 - bestDiscount / 100);
  const savings = originalPrice - discountedPrice;

  return {
    hasDiscount: true,
    discountPercentage: bestDiscount,
    originalPrice,
    discountedPrice: Math.round(discountedPrice * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    reason: bestReason,
  };
};

/**
 * Calculate cart subtotal with product-level discounts applied
 */
export const calculateCartSubtotal = (items: Array<{ product: Product; quantity: number }>): {
  subtotalBeforeDiscount: number;
  subtotalAfterProductDiscounts: number;
  totalProductDiscountSavings: number;
} => {
  let subtotalBeforeDiscount = 0;
  let subtotalAfterProductDiscounts = 0;

  for (const item of items) {
    const discountInfo = getProductDiscount(item.product);
    subtotalBeforeDiscount += discountInfo.originalPrice * item.quantity;
    subtotalAfterProductDiscounts += discountInfo.discountedPrice * item.quantity;
  }

  return {
    subtotalBeforeDiscount: Math.round(subtotalBeforeDiscount * 100) / 100,
    subtotalAfterProductDiscounts: Math.round(subtotalAfterProductDiscounts * 100) / 100,
    totalProductDiscountSavings: Math.round((subtotalBeforeDiscount - subtotalAfterProductDiscounts) * 100) / 100,
  };
};

/**
 * Calculate final total with tier/code discounts applied ON TOP of product discounts
 */
export const calculateFinalTotal = (
  cartSubtotalAfterProductDiscounts: number,
  tierDiscountPercentage: number,
  codeDiscountPercentage: number
): {
  finalTotal: number;
  tierDiscount: number;
  codeDiscount: number;
  appliedDiscountType: 'TIER' | 'CODE' | 'NONE';
  appliedDiscountPercentage: number;
} => {
  // Calculate both discounts
  const tierDiscount = (cartSubtotalAfterProductDiscounts * tierDiscountPercentage) / 100;
  const codeDiscount = (cartSubtotalAfterProductDiscounts * codeDiscountPercentage) / 100;

  // Apply the better discount (no stacking)
  let appliedDiscount = 0;
  let appliedDiscountType: 'TIER' | 'CODE' | 'NONE' = 'NONE';
  let appliedDiscountPercentage = 0;

  if (codeDiscount > tierDiscount && codeDiscount > 0) {
    appliedDiscount = codeDiscount;
    appliedDiscountType = 'CODE';
    appliedDiscountPercentage = codeDiscountPercentage;
  } else if (tierDiscount > 0) {
    appliedDiscount = tierDiscount;
    appliedDiscountType = 'TIER';
    appliedDiscountPercentage = tierDiscountPercentage;
  }

  const finalTotal = cartSubtotalAfterProductDiscounts - appliedDiscount;

  return {
    finalTotal: Math.round(finalTotal * 100) / 100,
    tierDiscount: Math.round(tierDiscount * 100) / 100,
    codeDiscount: Math.round(codeDiscount * 100) / 100,
    appliedDiscountType,
    appliedDiscountPercentage,
  };
};
