/**
 * Featured Products Component
 * Displays products with active discounts on the customer dashboard
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import inventoryService, { Inventory } from '../../services/inventory.service';
import toast from 'react-hot-toast';

const FeaturedProducts: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getFeaturedProducts(8); // Show top 8
      if (response.success && response.data) {
        setFeaturedProducts(response.data.products);
      }
    } catch (error: any) {
      console.error('Failed to load featured products:', error);
      // Don't show toast error - this is not critical
    } finally {
      setLoading(false);
    }
  };

  const getDiscountedPrice = (item: Inventory): number => {
    return inventoryService.getDiscountedPrice(item);
  };

  const calculateSavings = (item: Inventory): number => {
    return item.sellingPrice - getDiscountedPrice(item);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            🏷️ Featured Products
          </h2>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading featured products...</p>
        </div>
      </div>
    );
  }

  if (!featuredProducts || featuredProducts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            🏷️ Featured Products
          </h2>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">No featured products available at the moment.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Check back later for amazing deals!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              🏷️ Featured Products
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Limited time offers - grab them before they're gone!
            </p>
          </div>
          <Link
            to="/customer/products"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            View All →
          </Link>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredProducts.map((item) => {
            const discountedPrice = getDiscountedPrice(item);
            const savings = calculateSavings(item);
            const discount = item.productDiscount!;

            return (
              <Link
                key={item._id}
                to="/customer/browse"
                state={{ openProductId: item.productId._id }}
                className="group bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
              >
                {/* Product Image */}
                <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <img
                    src={item.productId.images[0] || 'https://via.placeholder.com/200'}
                    alt={item.productId.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                  />
                  {/* Discount Badge */}
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {discount.discountPercentage}% OFF
                  </div>
                  {/* Retailer Badge */}
                  {typeof item.ownerId === 'object' && (
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                      {item.ownerId.businessName || item.ownerId.profile?.name || 'Retailer'}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
                    {item.productId.name}
                  </h3>

                  {/* Category */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {item.productId.category.name}
                    {item.productId.category.subcategory && ` · ${item.productId.category.subcategory}`}
                  </p>

                  {/* Price */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          ₹{discountedPrice}
                        </span>
                        <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
                          ₹{item.sellingPrice}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">per {item.productId.unit}</p>
                    </div>
                  </div>

                  {/* Savings */}
                  <div className="bg-green-50 dark:bg-green-900 px-2 py-1 rounded text-xs text-green-700 dark:text-green-300 font-medium mb-2">
                    Save ₹{savings.toFixed(2)}
                  </div>

                  {/* Discount Reason */}
                  {discount.reason && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 italic mb-2">
                      🔥 {discount.reason}
                    </p>
                  )}

                  {/* Stock Status */}
                  {item.currentStock > 0 ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.currentStock} {item.productId.unit} available
                      </span>
                      {item.currentStock <= item.reorderLevel && (
                        <span className="text-orange-600 dark:text-orange-400 font-medium">
                          Low stock!
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Out of stock</span>
                  )}

                  {/* Valid Until */}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    ⏰ Offer ends {new Date(discount.validUntil).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeaturedProducts;
