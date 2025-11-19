/**
 * Wishlist Page - GroceryMart Style
 * View and manage wishlist items with clean card design
 */

import React, { useEffect, useState } from 'react';
import CustomerLayout from '../../components/layout/CustomerLayout';
import wishlistService from '../../services/wishlist.service';
import { useCartStore } from '../../stores/cartStore';
import { Product } from '../../types/product.types';
import PriceHistoryChart from '../../components/products/PriceHistoryChart';
import toast from 'react-hot-toast';

const Wishlist: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();
  const [targetPrices, setTargetPrices] = useState<Record<string, string>>({});
  const [showPriceHistory, setShowPriceHistory] = useState<string | null>(null);
  const [savingTargetPrice, setSavingTargetPrice] = useState<string | null>(null);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const response = await wishlistService.getWishlist();
      if (response.success) {
        setProducts(response.data.products || []);
      } else {
        console.error('Wishlist response not successful:', response);
        toast.error(response.message || 'Failed to load wishlist');
      }
    } catch (error: any) {
      console.error('Failed to load wishlist:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load wishlist';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await wishlistService.removeFromWishlist(productId);
      setProducts(prev => prev.filter(p => p._id !== productId));
      toast.success('Removed from wishlist');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove from wishlist');
    }
  };

  const handleAddToCart = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!product.stock || product.stock <= 0) {
        toast.error('Product is out of stock');
        return;
      }
      addItem(product, 1);
      toast.success('Added to cart');
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleAddAllToCart = async () => {
    try {
      let addedCount = 0;
      for (const product of products) {
        if (product.stock && product.stock > 0) {
          addItem(product, 1);
          addedCount++;
        }
      }
      if (addedCount > 0) {
        toast.success(`Added ${addedCount} item(s) to cart`);
      } else {
        toast.error('No items available to add');
      }
    } catch (error) {
      toast.error('Failed to add items to cart');
    }
  };

  const handleSetTargetPrice = async (productId: string) => {
    const targetPrice = targetPrices[productId];
    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      toast.error('Please enter a valid target price');
      return;
    }

    try {
      setSavingTargetPrice(productId);
      await wishlistService.setTargetPrice(productId, parseFloat(targetPrice));
      toast.success('Price alert set! You\'ll be notified when price drops.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to set price alert');
    } finally {
      setSavingTargetPrice(null);
    }
  };

  const handleTargetPriceChange = (productId: string, value: string) => {
    setTargetPrices(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading wishlist...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Wishlist</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{products.length} items saved</p>
          </div>
          {products.length > 0 && (
            <button
              onClick={handleAddAllToCart}
              className="px-6 py-3 bg-gray-900 dark:bg-green-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-green-700 transition font-medium"
            >
              Add All to Cart
            </button>
          )}
        </div>
      </div>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-xl transition-all overflow-hidden"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                  {product.images && product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Stock Badge */}
                  {(!product.stock || product.stock <= 0) && (
                    <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Out of Stock
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1 line-clamp-2 min-h-[3rem]">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {product.category?.name || 'Uncategorized'}
                  </p>

                  {/* Price */}
                  <div className="mb-4">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ₹{product.basePrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">/ {product.unit}</p>
                  </div>

                  {/* Price Alert Section */}
                  <div className="mb-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      💰 Set Price Alert
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={`Current: ₹${product.basePrice.toFixed(2)}`}
                        value={targetPrices[product._id] || ''}
                        onChange={(e) => handleTargetPriceChange(product._id, e.target.value)}
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => handleSetTargetPrice(product._id)}
                        disabled={savingTargetPrice === product._id}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingTargetPrice === product._id ? '...' : 'Set'}
                      </button>
                    </div>
                    <button
                      onClick={() => setShowPriceHistory(product._id)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      📊 View Price History
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={!product.stock || product.stock <= 0}
                      className="flex-1 py-2 bg-gray-900 dark:bg-green-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {product.stock && product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                    <button
                      onClick={(e) => handleRemoveFromWishlist(product._id, e)}
                      className="p-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:border-red-500 hover:text-red-500 dark:hover:border-red-500 dark:hover:text-red-500 transition"
                      aria-label="Remove from wishlist"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Price History Modal */}
          {showPriceHistory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Price History
                    </h2>
                    <button
                      onClick={() => setShowPriceHistory(null)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <PriceHistoryChart productId={showPriceHistory} days={30} />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <svg
            className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-gray-900 dark:text-white">Your wishlist is empty</h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Start adding products you love to your wishlist
          </p>
        </div>
      )}
    </CustomerLayout>
  );
};

export default Wishlist;
