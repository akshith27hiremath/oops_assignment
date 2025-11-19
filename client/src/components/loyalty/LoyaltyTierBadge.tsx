/**
 * Loyalty Tier Badge Component
 * Displays user's loyalty tier with visual styling
 */

import React from 'react';
import { LoyaltyTier } from '../../types/discount.types';
import discountService from '../../services/discount.service';

interface LoyaltyTierBadgeProps {
  tier: LoyaltyTier;
  completedOrders?: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const LoyaltyTierBadge: React.FC<LoyaltyTierBadgeProps> = ({
  tier,
  completedOrders,
  showProgress = false,
  size = 'md',
}) => {
  const tierInfo = discountService.calculateLoyaltyTier(completedOrders || 0);
  const displayInfo = discountService.getTierDisplayInfo(tier);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className="inline-flex flex-col gap-2">
      <div
        className={`inline-flex items-center gap-2 rounded-lg font-semibold ${displayInfo.bgColor} ${displayInfo.color} ${sizeClasses[size]}`}
      >
        <span className="text-lg">{displayInfo.icon}</span>
        <span>{displayInfo.label} Tier</span>
        {tierInfo.discountPercentage > 0 && (
          <span className="ml-1 text-xs opacity-75">({tierInfo.discountPercentage}% OFF)</span>
        )}
      </div>

      {showProgress && tierInfo.nextTier && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {tierInfo.ordersToNextTier} more order{tierInfo.ordersToNextTier !== 1 ? 's' : ''} to unlock{' '}
          <span className={discountService.getTierDisplayInfo(tierInfo.nextTier).color}>
            {tierInfo.nextTier}
          </span>{' '}
          ({tierInfo.nextTierDiscount}% OFF)
        </div>
      )}

      {showProgress && !tierInfo.nextTier && (
        <div className="text-xs text-gray-600 dark:text-gray-400">Max tier unlocked!</div>
      )}
    </div>
  );
};

export default LoyaltyTierBadge;
