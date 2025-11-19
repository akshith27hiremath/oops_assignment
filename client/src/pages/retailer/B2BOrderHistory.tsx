/**
 * B2B Order History Page
 * View all bulk orders placed with wholesalers
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import b2bOrderService, { WholesalerOrder, WholesalerOrderStatus } from '../../services/b2bOrder.service';
import toast from 'react-hot-toast';
import DarkModeToggle from '../../components/DarkModeToggle';

const B2BOrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<WholesalerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<WholesalerOrderStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadOrders();
  }, [selectedStatus, page]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await b2bOrderService.getOrders(
        selectedStatus || undefined,
        page,
        10
      );

      if (response.success) {
        setOrders(response.data.orders);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      (typeof order.wholesalerId === 'object' &&
        order.wholesalerId.businessName?.toLowerCase().includes(query))
    );
  });

  const getStatusBadgeColor = (status: WholesalerOrderStatus) => {
    const color = b2bOrderService.getStatusColor(status);
    const colorClasses: Record<string, string> = {
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      purple: 'bg-purple-100 text-purple-800',
      green: 'bg-green-100 text-green-800 dark:text-green-400',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100',
    };
    return colorClasses[color] || colorClasses.gray;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My B2B Orders</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">View and manage your bulk orders</p>
            </div>
            <div className="flex gap-3">
              <DarkModeToggle />
              <Link
                to="/retailer/b2b-marketplace"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Browse Marketplace
              </Link>
              <Link
                to="/retailer/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order number or supplier..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as WholesalerOrderStatus | '');
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value={WholesalerOrderStatus.PENDING}>Pending</option>
                <option value={WholesalerOrderStatus.CONFIRMED}>Confirmed</option>
                <option value={WholesalerOrderStatus.PROCESSING}>Processing</option>
                <option value={WholesalerOrderStatus.SHIPPED}>Shipped</option>
                <option value={WholesalerOrderStatus.DELIVERED}>Delivered</option>
                <option value={WholesalerOrderStatus.COMPLETED}>Completed</option>
                <option value={WholesalerOrderStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={loadOrders}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading orders...</p>
            </div>
          </div>
        ) : filteredOrders.length > 0 ? (
          <>
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const wholesaler = typeof order.wholesalerId === 'object' ? order.wholesalerId : null;
                return (
                  <div key={order._id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <Link
                            to={`/retailer/b2b-orders/${order._id}`}
                            className="text-xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800"
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(order.status)}`}>
                            {b2bOrderService.getStatusLabel(order.status)}
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                            Payment: <span className={`font-semibold ${order.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {b2bOrderService.getPaymentStatusLabel(order.paymentStatus)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Supplier</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {wholesaler?.businessName || wholesaler?.profile?.name || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Items</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{order.items.length} products</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Total Amount</p>
                          <p className="text-xl font-bold text-green-600">₹{order.totalAmount.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {order.trackingInfo.currentStatus && (
                            <span>
                              Current Status: <strong>{b2bOrderService.getStatusLabel(order.trackingInfo.currentStatus)}</strong>
                            </span>
                          )}
                        </div>
                        <Link
                          to={`/retailer/b2b-orders/${order._id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
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
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No orders found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery ? 'Try adjusting your search' : 'You haven\'t placed any bulk orders yet'}
            </p>
            {!searchQuery && (
              <Link
                to="/retailer/b2b-marketplace"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Browse Marketplace
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default B2BOrderHistory;
