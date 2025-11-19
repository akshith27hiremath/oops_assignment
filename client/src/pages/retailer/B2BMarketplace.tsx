/**
 * B2B Marketplace Page
 * Retailers browse and order wholesale products from wholesalers
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import wholesaleService, { WholesaleCategory } from '../../services/wholesale.service';
import { Product } from '../../types/product.types';
import DarkModeToggle from '../../components/DarkModeToggle';
import toast from 'react-hot-toast';

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  minimumOrderQuantity: number;
  availableStock: number;
  wholesalerId: string;
  wholesalerName: string;
  image: string;
}

const B2BMarketplace: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<WholesaleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, page]);

  const loadCategories = async () => {
    try {
      const response = await wholesaleService.getWholesaleCategories();
      if (response.success) {
        setCategories(response.data.categories);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load categories');
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (selectedCategory) filters.category = selectedCategory;
      if (searchQuery) filters.search = searchQuery;
      if (priceRange.min) filters.minPrice = Number(priceRange.min);
      if (priceRange.max) filters.maxPrice = Number(priceRange.max);

      const response = await wholesaleService.getWholesaleProducts(filters, page, 12);
      if (response.success) {
        setProducts(response.data.products);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadProducts();
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setPriceRange({ min: '', max: '' });
    setPage(1);
  };

  // Cart functions
  const addToCart = (product: any) => {
    const wholesalerId = product.wholesaler?._id || product.wholesalerId;
    const wholesalerName = product.wholesaler?.businessName || product.wholesaler?.profile?.name || 'Unknown Supplier';

    // Check if different wholesaler
    if (cart.length > 0 && cart[0].wholesalerId !== wholesalerId) {
      toast.error('You can only order from one wholesaler at a time. Please checkout or clear your cart first.');
      return;
    }

    // Check if product already in cart
    const existingItem = cart.find((item) => item.productId === product._id);
    if (existingItem) {
      toast.error('Product already in cart. Adjust quantity in cart.');
      setShowCart(true);
      return;
    }

    const cartItem: CartItem = {
      productId: product._id,
      name: product.name,
      quantity: product.minimumOrderQuantity || 1,
      unitPrice: product.basePrice,
      unit: product.unit,
      minimumOrderQuantity: product.minimumOrderQuantity || 1,
      availableStock: product.availableStock,
      wholesalerId,
      wholesalerName,
      image: product.images[0] || '',
    };

    setCart([...cart, cartItem]);
    toast.success(`${product.name} added to cart`);
    setShowCart(true);
  };

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    const item = cart.find((i) => i.productId === productId);
    if (!item) return;

    if (newQuantity < item.minimumOrderQuantity) {
      toast.error(`Minimum order quantity is ${item.minimumOrderQuantity} ${item.unit}`);
      return;
    }

    if (newQuantity > item.availableStock) {
      toast.error(`Only ${item.availableStock} ${item.unit} available`);
      return;
    }

    setCart(cart.map((i) => (i.productId === productId ? { ...i, quantity: newQuantity } : i)));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    setShowCart(false);
    toast.success('Cart cleared');
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    // Store cart in sessionStorage to pass to checkout
    sessionStorage.setItem('b2bCart', JSON.stringify(cart));
    navigate('/retailer/b2b-checkout');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">B2B Marketplace</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Browse wholesale products from suppliers</p>
            </div>
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              {/* Cart Button */}
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Cart
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
              <Link
                to="/retailer/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
                >
                  Clear All
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search products..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Categories */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Category</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      selectedCategory === ''
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        selectedCategory === cat.name
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-900'
                      }`}
                    >
                      {cat.name} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Price Range (₹)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    placeholder="Min"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    placeholder="Max"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSearch}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-300">Loading products...</p>
                </div>
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {products.map((product: any) => (
                    <div key={product._id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition">
                      <img
                        src={product.images[0] || 'https://via.placeholder.com/300'}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{product.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{product.category.name}</p>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>

                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <p className="text-2xl font-bold text-green-600">₹{product.basePrice}</p>
                            <p className="text-xs text-gray-500">per {product.unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              Min Order: {product.minimumOrderQuantity} {product.unit}
                            </p>
                            {product.availableStock > 0 ? (
                              <p className="text-xs text-green-600">
                                Stock: {product.availableStock} {product.unit}
                              </p>
                            ) : (
                              <p className="text-xs text-red-600">Out of Stock</p>
                            )}
                          </div>
                        </div>

                        {product.wholesaler && (
                          <div className="border-t pt-3 mb-3">
                            <p className="text-xs text-gray-500">Supplier</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              {product.wholesaler.businessName || product.wholesaler.profile?.name || 'Unknown'}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => addToCart(product)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          disabled={!product.availableStock || product.availableStock === 0}
                        >
                          {product.availableStock > 0 ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:bg-gray-900"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700 dark:text-gray-200">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:bg-gray-900"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No wholesale products found</h3>
                <p className="mt-2 text-sm text-gray-500">Try adjusting your filters or check back later</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowCart(false)}
          ></div>

          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Your Cart ({cart.length})</h2>
              <button onClick={() => setShowCart(false)} className="text-white hover:text-gray-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-4 text-gray-600 dark:text-gray-300">Your cart is empty</p>
                </div>
              ) : (
                <>
                  {/* Supplier Info */}
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Ordering from</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{cart[0].wholesalerName}</p>
                  </div>

                  {/* Cart Items List */}
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.productId} className="border rounded-lg p-3">
                        <div className="flex gap-3">
                          <img
                            src={item.image || 'https://via.placeholder.com/80'}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{item.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">₹{item.unitPrice} / {item.unit}</p>
                            <p className="text-xs text-gray-500">Min: {item.minimumOrderQuantity} {item.unit}</p>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                                disabled={item.quantity <= item.minimumOrderQuantity}
                                className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateCartItemQuantity(item.productId, parseInt(e.target.value) || item.minimumOrderQuantity)}
                                className="w-16 px-2 py-1 border rounded text-center"
                                min={item.minimumOrderQuantity}
                                max={item.availableStock}
                              />
                              <button
                                onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                                disabled={item.quantity >= item.availableStock}
                                className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                              <span className="text-sm text-gray-600 dark:text-gray-300">{item.unit}</span>
                            </div>

                            <div className="flex justify-between items-center mt-2">
                              <p className="font-bold text-gray-900 dark:text-white">₹{(item.unitPrice * item.quantity).toFixed(2)}</p>
                              <button
                                onClick={() => removeFromCart(item.productId)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="border-t p-4 bg-gray-50 dark:bg-gray-900">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-green-600">₹{getCartTotal().toFixed(2)}</span>
                </div>
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
                >
                  Proceed to Checkout
                </button>
                <button
                  onClick={clearCart}
                  className="w-full mt-2 px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300"
                >
                  Clear Cart
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default B2BMarketplace;
