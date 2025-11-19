/**
 * Discount and Loyalty System Types
 */

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum DiscountScope {
  PLATFORM_WIDE = 'PLATFORM_WIDE',
  USER_SPECIFIC = 'USER_SPECIFIC',
}

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

export interface DiscountCode {
  _id: string;
  code: string;
  description: string;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  minPurchaseAmount: number;
  maxDiscountAmount: number;
  maxUsesGlobal: number;
  maxUsesPerUser: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export interface DiscountCalculation {
  tierDiscount: number;
  codeDiscount: number;
  finalDiscount: number;
  discountType: 'TIER' | 'CODE' | 'NONE';
  tierPercentage?: number;
  codePercentage?: number;
}

export interface DiscountBreakdown {
  subtotal: number;
  tierDiscount: number;
  codeDiscount: number;
  finalDiscount: number;
  discountType: 'TIER' | 'CODE' | 'NONE';
  tierPercentage?: number;
  codePercentage?: number;
}

export interface LoyaltyTierInfo {
  tier: LoyaltyTier;
  discountPercentage: number;
  ordersCompleted: number;
  ordersToNextTier?: number;
  nextTier?: LoyaltyTier;
  nextTierDiscount?: number;
}
