/**
 * Retailer Dashboard
 * Main dashboard for retailer users
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/auth.service';
import notificationService from '../../services/notification.service';
import productService from '../../services/product.service';
import inventoryService from '../../services/inventory.service';
import orderService from '../../services/order.service';
import analyticsService from '../../services/analytics.service';
import { User } from '../../types/auth.types';
import { Product } from '../../types/product.types';
import { Order } from '../../types/order.types';
import NotificationBell from '../../components/notifications/NotificationBell';
import NotificationCenter from '../../components/notifications/NotificationCenter';
import DarkModeToggle from '../../components/DarkModeToggle';
import toast from 'react-hot-toast';

const RetailerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadDashboardData();

    // Initialize Socket.IO connection
    const token = localStorage.getItem('accessToken');
    console.log('🔌 Retailer Dashboard: Initializing Socket.IO, token exists:', !!token);
    if (token) {
      notificationService.initializeSocket(token);
      console.log('✅ Retailer Dashboard: Socket.IO initialization called');
    } else {
      console.warn('⚠️ Retailer Dashboard: No token found, Socket.IO not initialized');
    }

    return () => {
      console.log('🔌 Retailer Dashboard: Disconnecting Socket.IO');
      notificationService.disconnect();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get current user
      const userResponse = await authService.getCurrentUser();
      if (userResponse.success) {
        setUser(userResponse.data.user);
      }

      // Get inventory with reorderLevel for accurate low stock calculation
      const inventoryResponse = await inventoryService.getInventory();
      if (inventoryResponse.success) {
        const inventoryItems = inventoryResponse.data.inventory;

        // Count low stock items using same logic as inventory management page
        // Low stock = currentStock <= reorderLevel (but > 0)
        const lowStock = inventoryItems.filter(item =>
          item.currentStock <= item.reorderLevel && item.currentStock > 0
        ).length;

        setStats(prev => ({
          ...prev,
          totalProducts: inventoryItems.length,
          lowStockProducts: lowStock,
        }));
      }

      // Get recent orders
      const ordersResponse = await orderService.getRetailerOrders(1, 5);
      if (ordersResponse.success) {
        setRecentOrders(ordersResponse.data.orders);

        setStats(prev => ({
          ...prev,
          totalOrders: ordersResponse.data.pagination.totalItems,
        }));
      }

      // Get accurate revenue statistics from backend
      const analyticsResponse = await analyticsService.getRetailerAnalytics();
      if (analyticsResponse.success) {
        setStats(prev => ({
          ...prev,
          totalRevenue: analyticsResponse.data.metrics.totalRevenue,
        }));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.businessName || 'LiveMart'}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Retailer Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Dark Mode Toggle */}
              <DarkModeToggle />

              {/* Notification Bell */}
              <NotificationBell onClick={() => setShowNotifications(!showNotifications)} />

              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Low Stock Items</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.lowStockProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Link
              to="/retailer/inventory"
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            >
              <svg className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Manage Inventory</span>
            </Link>

            <Link
              to="/retailer/b2b-marketplace"
              className="flex flex-col items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
            >
              <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white">B2B Marketplace</span>
            </Link>

            <Link
              to="/retailer/b2b-orders"
              className="flex flex-col items-center p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition"
            >
              <svg className="h-8 w-8 text-teal-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white">My B2B Orders</span>
            </Link>

            <Link
              to="/retailer/analytics"
              className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
            >
              <svg className="h-8 w-8 text-green-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Sales Analytics</span>
            </Link>

            <Link
              to="/retailer/orders"
              className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
            >
              <svg className="h-8 w-8 text-purple-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white">View Orders</span>
            </Link>

            <Link
              to="/retailer/customers"
              className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
            >
              <svg className="h-8 w-8 text-orange-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Customer History</span>
            </Link>

            <Link
              to="/retailer/reviews"
              className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition"
            >
              <svg className="h-8 w-8 text-yellow-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Product Reviews</span>
            </Link>

            <Link
              to="/retailer/profile"
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <svg className="h-8 w-8 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white">My Profile</span>
            </Link>
          </div>
        </div>

        {/* Low Stock Alert */}
        {stats.lowStockProducts > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                  You have <strong>{stats.lowStockProducts}</strong> product(s) with low stock.
                  <Link to="/retailer/inventory" className="font-medium underline ml-1">
                    Update inventory
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
            <Link to="/retailer/orders" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700">
              View all
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => {
                // Handle both customer and customerId fields
                const customer = order.customer || (order as any).customerId;
                const customerName = customer?.name || customer?.profile?.name || customer?.email || 'Unknown Customer';

                // Get user ID from localStorage to find retailer's sub-order
                const userStr = localStorage.getItem('user');
                const currentUser = userStr ? JSON.parse(userStr) : null;
                const retailerId = currentUser?._id;

                // Find this retailer's sub-order
                const mySubOrder = order.subOrders?.find(so =>
                  so.retailerId._id === retailerId || so.retailerId === retailerId
                );

                // Get status and total for THIS retailer only
                const orderStatus = mySubOrder?.status || order.status;
                const orderTotal = mySubOrder?.totalAmount || order.totalAmount;
                const displayOrderId = mySubOrder?.subOrderId || order.orderId || order.orderNumber;

                return (
                  <div key={order._id} className="border dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Order #{displayOrderId}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{customerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          orderStatus === 'DELIVERED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          orderStatus === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {orderStatus}
                        </span>
                        <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">₹{orderTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-300 text-center py-4">No orders yet</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default RetailerDashboard;
