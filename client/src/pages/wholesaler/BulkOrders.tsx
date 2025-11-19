/**
 * Bulk Orders Page
 * Manage bulk orders from retailers
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import b2bOrderService, { WholesalerOrder, WholesalerOrderStatus } from '../../services/b2bOrder.service';
import notificationService from '../../services/notification.service';
import NotificationBell from '../../components/notifications/NotificationBell';
import NotificationCenter from '../../components/notifications/NotificationCenter';
import DarkModeToggle from '../../components/DarkModeToggle';

const BulkOrders: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const retailerIdFilter = searchParams.get('retailerId');

  const [orders, setOrders] = useState<WholesalerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WholesalerOrderStatus | ''>('');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch orders on component mount and when filter changes
  useEffect(() => {
    fetchOrders();

    // Initialize socket connection
    const token = localStorage.getItem('token');
    if (token) {
      notificationService.initializeSocket(token);
    }

    return () => {
      notificationService.disconnect();
    };
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await b2bOrderService.getOrders(
        statusFilter || undefined,
        1,
        50
      );

      // Filter by retailer if retailerIdFilter is present
      let filteredOrders = response.data.orders;
      if (retailerIdFilter) {
        filteredOrders = filteredOrders.filter(order => {
          const retailerId = typeof order.retailerId === 'object'
            ? order.retailerId._id
            : order.retailerId;
          return retailerId === retailerIdFilter;
        });
      }

      setOrders(filteredOrders);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to confirm this order?')) return;

    try {
      setProcessingOrderId(orderId);
      await b2bOrderService.confirmOrder(orderId);
      // Refresh orders list
      await fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to confirm order');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = window.prompt('Enter reason for rejection:');
    if (!reason) return;

    try {
      setProcessingOrderId(orderId);
      await b2bOrderService.updateOrderStatus(orderId, WholesalerOrderStatus.REJECTED, reason);
      // Refresh orders list
      await fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject order');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: WholesalerOrderStatus) => {
    try {
      setProcessingOrderId(orderId);
      await b2bOrderService.updateOrderStatus(orderId, newStatus);
      // Refresh orders list
      await fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const getRetailerName = (order: WholesalerOrder): string => {
    if (typeof order.retailerId === 'object') {
      return order.retailerId.store?.name || order.retailerId.profile.name;
    }
    return 'Unknown Retailer';
  };

  const getStatusColor = (status: WholesalerOrderStatus): string => {
    const color = b2bOrderService.getStatusColor(status);
    return `bg-${color}-100 text-${color}-800`;
  };

  const getNextStatus = (currentStatus: WholesalerOrderStatus): WholesalerOrderStatus | null => {
    const statusFlow: Record<WholesalerOrderStatus, WholesalerOrderStatus | null> = {
      [WholesalerOrderStatus.PENDING]: null, // Use confirm/reject instead
      [WholesalerOrderStatus.CONFIRMED]: WholesalerOrderStatus.PROCESSING,
      [WholesalerOrderStatus.PROCESSING]: WholesalerOrderStatus.SHIPPED,
      [WholesalerOrderStatus.SHIPPED]: WholesalerOrderStatus.DELIVERED,
      [WholesalerOrderStatus.DELIVERED]: WholesalerOrderStatus.COMPLETED,
      [WholesalerOrderStatus.COMPLETED]: null,
      [WholesalerOrderStatus.CANCELLED]: null,
      [WholesalerOrderStatus.REJECTED]: null,
    };
    return statusFlow[currentStatus];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading orders...</p>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Orders Management</h1>
            <div className="flex items-center gap-4">
              

              {/* Dark Mode Toggle */}

              <DarkModeToggle />

              <NotificationBell onClick={() => setShowNotifications(!showNotifications)} />
              <Link to="/wholesaler/dashboard" className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Retailer Filter Banner */}
        {retailerIdFilter && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  Showing orders from specific retailer
                </span>
              </div>
              <Link
                to="/wholesaler/bulk-orders"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                Clear filter
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Filter by Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as WholesalerOrderStatus | '')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Orders</option>
              <option value={WholesalerOrderStatus.PENDING}>Pending</option>
              <option value={WholesalerOrderStatus.CONFIRMED}>Confirmed</option>
              <option value={WholesalerOrderStatus.PROCESSING}>Processing</option>
              <option value={WholesalerOrderStatus.SHIPPED}>Shipped</option>
              <option value={WholesalerOrderStatus.DELIVERED}>Delivered</option>
              <option value={WholesalerOrderStatus.COMPLETED}>Completed</option>
              <option value={WholesalerOrderStatus.REJECTED}>Rejected</option>
              <option value={WholesalerOrderStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{orders.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {orders.filter(o => o.status === WholesalerOrderStatus.PENDING).length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Active</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {orders.filter(o => [
                WholesalerOrderStatus.CONFIRMED,
                WholesalerOrderStatus.PROCESSING,
                WholesalerOrderStatus.SHIPPED
              ].includes(o.status)).length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Value</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ₹{orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter ? 'Try changing the filter to see more orders.' : 'Retailers have not placed any orders yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Order {order.orderNumber}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{getRetailerName(order)}</p>
                    <p className="text-xs text-gray-500">
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {b2bOrderService.getStatusLabel(order.status)}
                    </span>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">₹{order.totalAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Total Items: <span className="font-semibold">{order.items.length}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Payment: <span className={`font-semibold ${order.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {b2bOrderService.getPaymentStatusLabel(order.paymentStatus)}
                        </span>
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => navigate(`/wholesaler/b2b-orders/${order._id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        View Details
                      </button>

                      {/* Actions for PENDING orders */}
                      {order.status === WholesalerOrderStatus.PENDING && (
                        <>
                          <button
                            onClick={() => handleConfirmOrder(order._id)}
                            disabled={processingOrderId === order._id}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingOrderId === order._id ? 'Processing...' : 'Confirm Order'}
                          </button>
                          <button
                            onClick={() => handleRejectOrder(order._id)}
                            disabled={processingOrderId === order._id}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* Actions for orders in progress */}
                      {getNextStatus(order.status) && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, getNextStatus(order.status)!)}
                          disabled={processingOrderId === order._id}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingOrderId === order._id
                            ? 'Updating...'
                            : `Mark as ${b2bOrderService.getStatusLabel(getNextStatus(order.status)!)}`
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BulkOrders;
