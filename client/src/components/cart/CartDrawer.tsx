/**
 * Cart Drawer Component
 * Slide-out cart panel from the right side
 */

import React, { useEffect } from 'react';
import { useCartStore } from '../../stores/cartStore';
import CartItem from './CartItem';
import CartSummary from './CartSummary';

const CartDrawer: React.FC = () => {
  const { items, isOpen, closeCart, clearCart } = useCartStore();

  console.log('🛒 CartDrawer render - isOpen:', isOpen, 'items:', items.length);
  if (items.length > 0) {
    items.forEach(item => {
      console.log('  - Item:', item.product.name, 'has retailerInventories:', !!item.product.retailerInventories);
    });
  }

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[60] transition-opacity"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-[70] flex flex-col transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Shopping Cart ({items.length})
          </h2>
          <button
            onClick={closeCart}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close cart"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <svg
                className="h-24 w-24 text-gray-300 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Your cart is empty</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add items to get started</p>
              <button
                onClick={closeCart}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Group items by retailer */}
              {(() => {
                // Group items by retailer
                const itemsByRetailer = items.reduce((acc, item) => {
                  // Get retailer info from inventory owner, not product creator
                  let retailerId = 'unknown';
                  let retailerName = 'Unknown Retailer';

                  console.log('🛒 Processing item:', item.product.name);
                  console.log('   - retailerInventories:', item.product.retailerInventories);

                  if (item.product.retailerInventories && item.product.retailerInventories.length > 0) {
                    // Get retailer from inventory (the actual seller)
                    const inventory = item.product.retailerInventories[0];
                    console.log('   - inventory.owner:', inventory.owner);

                    if (inventory.owner) {
                      // Convert to string to avoid object comparison issues
                      retailerId = typeof inventory.owner._id === 'string'
                        ? inventory.owner._id
                        : inventory.owner._id.toString();

                      retailerName = inventory.owner.businessName ||
                                    inventory.owner.profile?.name ||
                                    'Retailer';

                      console.log('   ✅ Found retailer:', retailerName, 'ID:', retailerId);
                    } else {
                      console.log('   ❌ No owner in inventory');
                    }
                  } else if (item.product.createdBy?.userType === 'RETAILER') {
                    // Direct retail product
                    retailerId = typeof item.product.createdBy._id === 'string'
                      ? item.product.createdBy._id
                      : item.product.createdBy._id.toString();

                    retailerName = item.product.createdBy.businessName ||
                                  item.product.createdBy.profile?.name ||
                                  'Retailer';

                    console.log('   ✅ Direct retail product from:', retailerName);
                  } else {
                    console.log('   ❌ No retailer found for', item.product.name);
                  }

                  if (!acc[retailerId]) {
                    acc[retailerId] = {
                      retailerName,
                      items: []
                    };
                  }
                  acc[retailerId].items.push(item);
                  return acc;
                }, {} as Record<string, { retailerName: string; items: typeof items }>);

                const retailers = Object.entries(itemsByRetailer);

                return retailers.map(([retailerId, { retailerName, items: retailerItems }]) => (
                  <div key={retailerId} className="mb-4">
                    {/* Retailer Header - only show if multiple retailers */}
                    {retailers.length > 1 && (
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {retailerName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({retailerItems.length} {retailerItems.length === 1 ? 'item' : 'items'})
                        </span>
                      </div>
                    )}

                    {/* Items for this retailer */}
                    {retailerItems.map((item) => (
                      <CartItem key={item.productId} item={item} />
                    ))}
                  </div>
                ));
              })()}

              {/* Clear Cart Button */}
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="w-full text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 py-3 mt-2 transition-colors"
                >
                  Clear Cart
                </button>
              )}
            </>
          )}
        </div>

        {/* Summary - Only show if cart has items */}
        {items.length > 0 && <CartSummary />}
      </div>
    </>
  );
};

export default CartDrawer;
