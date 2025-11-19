/**
 * Discount Breakdown Component
 * Shows pricing breakdown with tier and code discounts
 */

import React from 'react';
import { DiscountCode, LoyaltyTier } from '../../types/discount.types';
import discountService from '../../services/discount.service';

interface DiscountBreakdownProps {
  subtotal: number;
  tier: LoyaltyTier;
  tierDiscount: number;
  appliedCode: DiscountCode | null;
  codeDiscount: number;
  finalDiscount: number;
  discountType: 'TIER' | 'CODE' | 'NONE';
  total: number;
}

const DiscountBreakdown: React.FC<DiscountBreakdownProps> = ({
  subtotal,
  tier,
  tierDiscount,
  appliedCode,
  codeDiscount,
  finalDiscount,
  discountType,
  total,
}) => {
  const tierInfo = discountService.getTierDisplayInfo(tier);

  return (
    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {/* Subtotal */}
      <div className="flex justify-between text-gray-700 dark:text-gray-300">
        <span>Subtotal</span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>

      {/* Loyalty Tier Discount */}
      {tierDiscount > 0 && (
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <span className={tierInfo.color}>{tierInfo.icon}</span>
            <span className="text-gray-600 dark:text-gray-400">
              {tierInfo.label} Tier Discount
            </span>
            {discountType !== 'TIER' && (
              <span className="text-xs text-gray-500">(not applied)</span>
            )}
          </div>
          <span className={discountType === 'TIER' ? 'text-green-600 font-semibold' : 'text-gray-500 line-through'}>
            -₹{tierDiscount.toFixed(2)}
          </span>
        </div>
      )}

      {/* Code Discount */}
      {appliedCode && codeDiscount > 0 && (
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">
              Code: {appliedCode.code}
            </span>
            {discountType !== 'CODE' && (
              <span className="text-xs text-gray-500">(not applied)</span>
            )}
          </div>
          <span className={discountType === 'CODE' ? 'text-green-600 font-semibold' : 'text-gray-500 line-through'}>
            -₹{codeDiscount.toFixed(2)}
          </span>
        </div>
      )}

      {/* Best Discount Info */}
      {finalDiscount > 0 && (discountType === 'TIER' || discountType === 'CODE') && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {discountType === 'TIER'
                ? `Your ${tierInfo.label} tier discount is better!`
                : `Code "${appliedCode?.code}" gives you a better discount!`
              }
            </span>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-300 dark:border-gray-600"></div>

      {/* Final Discount */}
      {finalDiscount > 0 && (
        <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
          <span>Total Discount</span>
          <span>-₹{finalDiscount.toFixed(2)}</span>
        </div>
      )}

      {/* Total */}
      <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-300 dark:border-gray-600">
        <span>Total</span>
        <span>₹{total.toFixed(2)}</span>
      </div>

      {/* Savings Message */}
      {finalDiscount > 0 && (
        <div className="text-center text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-2 rounded-lg">
          🎉 You're saving ₹{finalDiscount.toFixed(2)} on this order!
        </div>
      )}
    </div>
  );
};

export default DiscountBreakdown;
