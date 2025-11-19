/**
 * Customer Dashboard - GroceryMart Style
 * Modern dashboard with stats cards, recent orders, and quick actions
 */
import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import FeaturedProducts from '../../components/customer/FeaturedProducts';
import authService from '../../services/auth.service';
import orderService from '../../services/order.service';
import wishlistService from '../../services/wishlist.service';
import productService from '../../services/product.service';
import { useCartStore } from '../../stores/cartStore';
import { User } from '../../types/auth.types';
import toast from 'react-hot-toast';

interface DashboardStats {
  cartItems: number;
  wishlistItems: number;
  activeOrders: number;
  totalSpent: number;
  totalOrders: number;
  loyaltyPoints: number;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  items: Array<{ product: { name: string }; quantity: number }>;
}

const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    cartItems: 0,
    wishlistItems: 0,
    activeOrders: 0,
    totalSpent: 0,
    totalOrders: 0,
    loyaltyPoints: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ _id: string; name: string; basePrice: number; unit: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const { items } = useCartStore();

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Fetch autocomplete suggestions with debounce
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length >= 2) {
        try {
          const results = await productService.getAutocompleteSuggestions(searchQuery);
          setSuggestions(results);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(-1);
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle clicks outside the search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load user
      const userResponse = await authService.getCurrentUser();
      if (!userResponse.success) {
        toast.error('Failed to load user data');
        return;
      }
      setUser(userResponse.data.user);

      // Load wishlist count (don't fail if this errors)
      let wishlistCount = 0;
      try {
        const wishlistResponse = await wishlistService.getWishlist();
        wishlistCount = wishlistResponse.success ? wishlistResponse.data.items.length : 0;
      } catch (error) {
        console.log('Failed to load wishlist, using default value');
      }

      // Load orders (don't fail if this errors)
      let activeCount = 0;
      let totalSpent = 0;
      let totalOrders = 0;
      try {
        const ordersResponse = await orderService.getCustomerOrders({ page: 1, limit: 10 });
        if (ordersResponse.success) {
          // Filter to show only pending orders (not cancelled or delivered)
          const pendingOrders = ordersResponse.data.orders.filter((o: RecentOrder) => {
            const effectiveStatus = (o as any).masterStatus || o.status;
            return effectiveStatus !== 'CANCELLED' && effectiveStatus !== 'DELIVERED';
          });
          setRecentOrders(pendingOrders.slice(0, 3)); // Show up to 3 pending orders

          // Count active orders (all non-cancelled, non-delivered)
          activeCount = ordersResponse.data.orders.filter((o: RecentOrder) => {
            const effectiveStatus = (o as any).masterStatus || o.status;
            return effectiveStatus !== 'CANCELLED' && effectiveStatus !== 'DELIVERED';
          }).length;

          // Calculate total spent from delivered orders only
          totalSpent = ordersResponse.data.orders
            .filter((o: RecentOrder) => {
              const effectiveStatus = (o as any).masterStatus || o.status;
              return effectiveStatus === 'DELIVERED';
            })
            .reduce((sum: number, order: RecentOrder) => sum + order.totalAmount, 0);

          totalOrders = ordersResponse.data.totalOrders || ordersResponse.data.orders.length;
        }
      } catch (error) {
        console.log('Failed to load orders, using default values');
      }

      // Update stats with whatever data we have
      setStats({
        cartItems: items.length,
        wishlistItems: wishlistCount,
        activeOrders: activeCount,
        totalSpent: totalSpent,
        totalOrders: totalOrders,
        loyaltyPoints: userResponse.data.user?.loyaltyPoints || 0,
      });
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent, query?: string) => {
    e.preventDefault();
    const searchText = query || searchQuery.trim();
    if (searchText) {
      // Navigate to browse page with search query as state
      navigate('/customer/browse', { state: { searchQuery: searchText } });
      setShowSuggestions(false);
    } else {
      navigate('/customer/browse');
    }
  };

  const handleSuggestionClick = (productId: string, productName: string) => {
    setSearchQuery(productName);
    // Navigate to browse page with product ID to open modal directly
    navigate('/customer/browse', { state: { openProductId: productId } });
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0) {
        const product = suggestions[selectedSuggestionIndex];
        handleSuggestionClick(product._id, product.name);
      } else {
        handleSearch(e);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      DELIVERED: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', label: 'Delivered' },
      OUT_FOR_DELIVERY: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', label: 'In Transit' },
      SHIPPED: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', label: 'In Transit' },
      PROCESSING: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', label: 'Processing' },
      CONFIRMED: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', label: 'Confirmed' },
      PENDING: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', label: 'Pending' },
      CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', label: 'Cancelled' },
    };
    const badge = statusMap[status] || statusMap.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading dashboard...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back!</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here's what's happening with your orders today.
        </p>
      </div>

      {/* Search Bar with Autocomplete */}
      <div className="mb-8">
        <div ref={searchRef} className="relative max-w-2xl">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => searchQuery.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search for products..."
              className="w-full pl-12 pr-24 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white shadow-sm"
              autoComplete="off"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-gray-900 dark:bg-green-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-green-700 transition-colors font-medium"
            >
              Search
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {suggestions.map((product, index) => (
                <button
                  key={product._id}
                  onClick={() => handleSuggestionClick(product._id, product.name)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group ${
                    index === selectedSuggestionIndex
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <svg
                      className="w-4 h-4 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span className="text-gray-900 dark:text-white truncate">{product.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      ₹{product.basePrice.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      /{product.unit}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Items in Cart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Items in Cart</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.cartItems}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Wishlist Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Wishlist Items</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.wishlistItems}</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-lg">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Active Orders</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeOrders}</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Spent</p>
              <p className="text-3xl font-bold text-green-600 mt-2">₹{stats.totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-lg">
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products Section */}
      <div className="mb-8">
        <FeaturedProducts />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Orders Pending</h2>
                <Link
                  to="/customer/orders"
                  className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
                >
                  View All Orders
                </Link>
              </div>
            </div>
            <div className="divide-y dark:divide-gray-700">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => {
                  const effectiveStatus = (order as any).masterStatus || order.status;

                  // Calculate total items count (support both old and new order formats)
                  let totalItems = 0;
                  if ((order as any).subOrders && (order as any).subOrders.length > 0) {
                    // New multi-retailer format
                    totalItems = (order as any).subOrders.reduce(
                      (sum: number, subOrder: any) => sum + (subOrder.items?.length || 0),
                      0
                    );
                  } else if (order.items) {
                    // Old single-retailer format
                    totalItems = order.items.length;
                  }

                  // Get order number (support both orderId and orderNumber)
                  const orderDisplayId = (order as any).orderId || order.orderNumber;

                  return (
                    <div key={order._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Order #{orderDisplayId}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString()} • {totalItems} item{totalItems !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">₹{order.totalAmount.toFixed(2)}</p>
                          <div className="mt-1">{getStatusBadge(effectiveStatus)}</div>
                        </div>
                      </div>
                      <Link
                        to={`/customer/orders`}
                        className="inline-flex items-center text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium"
                      >
                        View Details
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No pending orders</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">All your orders have been delivered or cancelled</p>
                  <Link to="/customer/browse" className="text-green-600 hover:text-green-700 font-medium mt-3 inline-block">
                    Start shopping
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Shopping Summary */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/customer/browse"
                className="block w-full bg-gray-900 dark:bg-green-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-green-700 transition-colors"
              >
                Browse Products
              </Link>
              <Link
                to="/customer/checkout"
                className="block w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center py-3 rounded-lg font-semibold border-2 border-gray-300 dark:border-gray-600 hover:border-green-600 dark:hover:border-green-500 transition-colors"
              >
                View Cart
              </Link>
            </div>
          </div>

          {/* Shopping Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Shopping Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Orders</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.totalOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Pending Reviews</span>
                <span className="font-semibold text-gray-900 dark:text-white">3</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Loyalty Points</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{stats.loyaltyPoints.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerDashboard;
