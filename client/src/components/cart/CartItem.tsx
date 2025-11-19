/**
 * Cart Item Component
 * Individual item in the shopping cart
 */

import React from 'react';
import { CartItem as CartItemType } from '../../stores/cartStore';
import { useCartStore } from '../../stores/cartStore';

interface CartItemProps {
  item: CartItemType;
}

const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { updateQuantity, removeItem } = useCartStore();
  const { product, quantity } = item;

  console.log('🛒 CartItem rendering:', product.name);
  console.log('   Has retailerInventories?', !!product.retailerInventories);
  console.log('   retailerInventories count:', product.retailerInventories?.length || 0);

  // ONE-TIME ALERT for debugging
  React.useEffect(() => {
    if (product.name === 'Fresh Milk') {
      const hasInventories = !!product.retailerInventories;
      console.error(`FRESH MILK IN CART - Has inventories: ${hasInventories}`);
    }
  }, [product.name, product.retailerInventories]);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(product._id, newQuantity);
  };

  const handleRemove = () => {
    removeItem(product._id);
  };

  // Get best discount from retailer inventories
  const getBestDiscount = (): { discount: number; reason?: string } | null => {
    console.log('🔍 CartItem checking discount for:', product.name);
    console.log('   Has retailerInventories?', !!product.retailerInventories);
    console.log('   retailerInventories:', product.retailerInventories);

    // Defensive check - cart items might not have retailerInventories if they were added before discount feature
    if (!product.retailerInventories || product.retailerInventories.length === 0) {
      console.log('⚠️ Cart item missing retailerInventories:', product.name);
      return null;
    }

    console.log('✅ Has', product.retailerInventories.length, 'inventories');

    let bestDiscount = 0;
    let bestReason: string | undefined;
    const now = new Date();

    for (const inventory of product.retailerInventories) {
      console.log('   Inventory productDiscount:', inventory.productDiscount);
      if (inventory.productDiscount?.isActive && new Date(inventory.productDiscount.validUntil) > now) {
        console.log('   ✓ Valid discount:', inventory.productDiscount.discountPercentage + '%');
        if (inventory.productDiscount.discountPercentage > bestDiscount) {
          bestDiscount = inventory.productDiscount.discountPercentage;
          bestReason = inventory.productDiscount.reason;
        }
      } else {
        console.log('   ✗ Invalid or expired discount');
      }
    }

    console.log('💰 Best discount:', bestDiscount + '%');
    return bestDiscount > 0 ? { discount: bestDiscount, reason: bestReason } : null;
  };

  const discountInfo = getBestDiscount();
  const pricePerUnit = discountInfo
    ? product.basePrice * (1 - discountInfo.discount / 100)
    : product.basePrice;
  const subtotal = pricePerUnit * quantity;

  return (
    <div className="flex gap-4 py-4 border-b border-gray-200 dark:border-gray-700">
      {/* Product Image */}
      <div className="flex-shrink-0">
        <img
          src={product.images[0] || 'https://via.placeholder.com/80'}
          alt={product.name}
          className="h-20 w-20 object-cover rounded-md"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.category.name}</p>
          </div>
          <button
            onClick={handleRemove}
            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            aria-label="Remove item"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Discount Badge */}
        {discountInfo && (
          <div className="mt-1">
            <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">
              {discountInfo.discount}% OFF {discountInfo.reason && `• ${discountInfo.reason}`}
            </span>
          </div>
        )}

        {/* Price and Quantity */}
        <div className="flex items-center justify-between mt-2">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-md">
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              className="px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
              disabled={quantity <= 1}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="px-3 text-sm font-medium text-gray-900">{quantity}</span>
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              className="px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Subtotal */}
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">₹{subtotal.toFixed(2)}</p>
            {discountInfo ? (
              <div className="flex items-center gap-1 justify-end">
                <p className="text-xs text-green-600 font-medium">₹{pricePerUnit.toFixed(2)}/{product.unit}</p>
                <p className="text-xs text-gray-400 line-through">₹{product.basePrice}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">₹{product.basePrice}/{product.unit}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
