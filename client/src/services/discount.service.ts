/**
 * Discount Service
 * Frontend service for discount codes and loyalty tiers
 */

import api from './api';
import { DiscountCode, DiscountCalculation, LoyaltyTierInfo, LoyaltyTier } from '../types/discount.types';

class DiscountService {
  /**
   * Get customer's available discount codes
   */
  async getMyDiscountCodes(cartTotal: number = 0): Promise<{ success: boolean; data: { codes: DiscountCode[] } }> {
    const response = await api.get(`/discount-codes/my-codes?cartTotal=${cartTotal}`);
    return response.data;
  }

  /**
   * Validate a discount code
   */
  async validateDiscountCode(
    code: string,
    cartTotal: number
  ): Promise<{
    success: boolean;
    data?: {
      valid: boolean;
      code: DiscountCode;
      discount: number;
    };
    message?: string;
  }> {
    try {
      const response = await api.post('/discount-codes/validate', { code, cartTotal });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to validate discount code',
      };
    }
  }

  /**
   * Calculate loyalty tier based on completed orders
   */
  calculateLoyaltyTier(completedOrders: number): LoyaltyTierInfo {
    let tier: LoyaltyTier;
    let discountPercentage: number;
    let nextTier: LoyaltyTier | undefined;
    let nextTierDiscount: number | undefined;
    let ordersToNextTier: number | undefined;

    if (completedOrders >= 15) {
      tier = LoyaltyTier.GOLD;
      discountPercentage = 10;
      // Already at max tier
    } else if (completedOrders >= 5) {
      tier = LoyaltyTier.SILVER;
      discountPercentage = 5;
      nextTier = LoyaltyTier.GOLD;
      nextTierDiscount = 10;
      ordersToNextTier = 15 - completedOrders;
    } else {
      tier = LoyaltyTier.BRONZE;
      discountPercentage = 0;
      nextTier = LoyaltyTier.SILVER;
      nextTierDiscount = 5;
      ordersToNextTier = 5 - completedOrders;
    }

    return {
      tier,
      discountPercentage,
      ordersCompleted: completedOrders,
      nextTier,
      nextTierDiscount,
      ordersToNextTier,
    };
  }

  /**
   * Get tier display info (colors, labels, etc.)
   */
  getTierDisplayInfo(tier: LoyaltyTier): {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  } {
    switch (tier) {
      case LoyaltyTier.GOLD:
        return {
          label: 'Gold',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          icon: '👑',
        };
      case LoyaltyTier.SILVER:
        return {
          label: 'Silver',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: '⭐',
        };
      case LoyaltyTier.BRONZE:
      default:
        return {
          label: 'Bronze',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          icon: '🥉',
        };
    }
  }

  /**
   * Format discount code expiry date
   */
  formatExpiry(validUntil: string): string {
    const date = new Date(validUntil);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Expires today';
    } else if (diffDays === 1) {
      return 'Expires tomorrow';
    } else if (diffDays <= 7) {
      return `Expires in ${diffDays} days`;
    } else {
      return `Valid until ${date.toLocaleDateString()}`;
    }
  }

  /**
   * Check if discount code is still valid
   */
  isCodeValid(code: DiscountCode): boolean {
    const now = new Date();
    const validFrom = new Date(code.validFrom);
    const validUntil = new Date(code.validUntil);

    return code.isActive && now >= validFrom && now <= validUntil;
  }

  /**
   * Calculate discount amount preview
   */
  calculateDiscountPreview(code: DiscountCode, cartTotal: number): number {
    if (!this.isCodeValid(code)) return 0;
    if (cartTotal < code.minPurchaseAmount) return 0;

    let discount = 0;

    if (code.type === 'PERCENTAGE') {
      discount = (cartTotal * code.value) / 100;
      if (code.maxDiscountAmount > 0 && discount > code.maxDiscountAmount) {
        discount = code.maxDiscountAmount;
      }
    } else if (code.type === 'FIXED_AMOUNT') {
      discount = code.value;
      if (discount > cartTotal) {
        discount = cartTotal;
      }
    }

    return Math.round(discount * 100) / 100;
  }

  /**
   * Format discount for display
   */
  formatDiscountValue(code: DiscountCode): string {
    if (code.type === 'PERCENTAGE') {
      return `${code.value}% OFF`;
    } else {
      return `₹${code.value} OFF`;
    }
  }

  /**
   * Get discount type badge color
   */
  getDiscountTypeBadgeColor(type: 'TIER' | 'CODE' | 'NONE'): string {
    switch (type) {
      case 'TIER':
        return 'bg-purple-100 text-purple-700';
      case 'CODE':
        return 'bg-green-100 text-green-700';
      case 'NONE':
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }
}

export default new DiscountService();
