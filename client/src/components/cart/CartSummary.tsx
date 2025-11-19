/**
 * Cart Summary Component
 * Shows total, taxes, and checkout button with all discounts
 */

import React, { useState, useEffect } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { useNavigate } from 'react-router-dom';
import { calculateCartSubtotal, calculateFinalTotal } from '../../utils/discountUtils';
import authService from '../../services/auth.service';
import discountService from '../../services/discount.service';
import { LoyaltyTier } from '../../types/discount.types';

const CartSummary: React.FC = () => {
  const { items, getItemCount, closeCart } = useCartStore();
  const navigate = useNavigate();
  const [loyaltyTier, setLoyaltyTier] = useState<LoyaltyTier>(LoyaltyTier.BRONZE);
  const [tierDiscountPercentage, setTierDiscountPercentage] = useState(0);

  // Load user tier
  useEffect(() => {
    const loadUserTier = async () => {
      try {
        const response = await authService.getCurrentUser();
        if (response.success) {
          const userData = response.data.user as any;
          const orderHistory = userData.orderHistory || [];
          const tierInfo = discountService.calculateLoyaltyTier(orderHistory.length);
          setLoyaltyTier(tierInfo.tier);
          setTierDiscountPercentage(tierInfo.discountPercentage);
        }
      } catch (error) {
        console.error('Failed to load user tier:', error);
      }
    };
    loadUserTier();
  }, []);

  // Calculate cart totals with product discounts
  const {
    subtotalBeforeDiscount,
    subtotalAfterProductDiscounts,
    totalProductDiscountSavings,
  } = calculateCartSubtotal(items);

  // Calculate tier discount on already-discounted subtotal
  const {
    finalTotal: totalAfterTierDiscount,
    tierDiscount,
    appliedDiscountType,
  } = calculateFinalTotal(subtotalAfterProductDiscounts, tierDiscountPercentage, 0);

  const taxRate = 0.08; // 8% tax (unified with checkout)
  const tax = totalAfterTierDiscount * taxRate;
  const total = totalAfterTierDiscount + tax;
  const itemCount = getItemCount();
  const totalSavings = totalProductDiscountSavings + tierDiscount;

  const handleCheckout = () => {
    closeCart();
    navigate('/customer/checkout');
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-4">
      {/* Summary Details */}
      <div className="space-y-2 mb-4">
        {/* Show original subtotal if there are product discounts */}
        {totalProductDiscountSavings > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
            <span className="font-medium text-gray-400 dark:text-gray-500 line-through">₹{subtotalBeforeDiscount.toFixed(2)}</span>
          </div>
        )}

        {/* Product discount savings */}
        {totalProductDiscountSavings > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600 dark:text-green-400">Product Discounts</span>
            <span className="font-medium text-green-600 dark:text-green-400">-₹{totalProductDiscountSavings.toFixed(2)}</span>
          </div>
        )}

        {/* Subtotal after product discounts */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {totalProductDiscountSavings > 0 ? 'Discounted Subtotal' : `Subtotal (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">₹{subtotalAfterProductDiscounts.toFixed(2)}</span>
        </div>

        {/* Tier discount */}
        {tierDiscountPercentage > 0 && tierDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-600 dark:text-gray-400">
                {discountService.getTierDisplayInfo(loyaltyTier).icon}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {discountService.getTierDisplayInfo(loyaltyTier).label} ({tierDiscountPercentage}%)
              </span>
            </div>
            <span className="font-medium text-green-600 dark:text-green-400">-₹{tierDiscount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Tax (8%)</span>
          <span className="font-medium text-gray-900 dark:text-white">₹{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Delivery</span>
          <span className="font-medium text-green-600 dark:text-green-400">FREE</span>
        </div>
        <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-300 dark:border-gray-600">
          <span className="text-gray-900 dark:text-white">Total</span>
          <span className="text-gray-900 dark:text-white">₹{total.toFixed(2)}</span>
        </div>

        {/* Savings badge */}
        {totalSavings > 0 && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
            <p className="text-xs text-green-700 dark:text-green-400 text-center font-medium">
              You're saving ₹{totalSavings.toFixed(2)} on this order!
            </p>
          </div>
        )}
      </div>

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        Proceed to Checkout
      </button>

      {/* Continue Shopping */}
      <button
        onClick={closeCart}
        className="w-full text-gray-600 text-sm mt-2 py-2 hover:text-gray-900 transition-colors"
      >
        Continue Shopping
      </button>
    </div>
  );
};

export default CartSummary;
