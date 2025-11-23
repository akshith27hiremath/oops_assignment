/**
 * Retailer Order Management Page
 * View and manage customer orders
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../../services/order.service';
import { Order, OrderStatus, PaymentStatus } from '../../types/order.types';
import toast from 'react-hot-toast';
import DarkModeToggle from '../../components/DarkModeToggle';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [shippingDate, setShippingDate] = useState<string>('');

  useEffect(() => {
    loadOrders();
  }, [currentPage]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getRetailerOrders(currentPage, 10);
      if (response.success) {
        setOrders(response.data.orders);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, subOrderId: string | undefined, newStatus: OrderStatus) => {
    try {
      setUpdatingStatus(true);

      // If we have a subOrderId, update the sub-order; otherwise update the main order
      if (subOrderId) {
        await orderService.updateSubOrderStatus(orderId, subOrderId, newStatus, shippingDate || undefined);
      } else {
        await orderService.updateOrderStatus(orderId, newStatus);
      }

      toast.success('Order status updated successfully');
      loadOrders();
      setSelectedOrder(null);
      setShippingDate(''); // Reset shipping date
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMarkAsPaid = async (orderId: string, subOrderId?: string) => {
    try {
      setMarkingPaid(true);

      if (subOrderId) {
        // Mark sub-order as paid (multi-retailer order)
        await orderService.markSubOrderAsPaid(orderId, subOrderId);
      } else {
        // Mark entire order as paid (single-retailer order - backward compatibility)
        await orderService.markOrderAsPaid(orderId);
      }

      toast.success('Order marked as paid successfully');
      loadOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to mark order as paid');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const blob = await orderService.downloadInvoice(orderId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${orderId}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to download invoice');
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED:
        return 'bg-green-100 text-green-800 dark:text-green-400';
      case OrderStatus.CANCELLED:
      case OrderStatus.REFUNDED:
        return 'bg-red-100 text-red-800';
      case OrderStatus.PROCESSING:
      case OrderStatus.SHIPPED:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.COMPLETED:
        return 'bg-green-100 text-green-800 dark:text-green-400';
      case PaymentStatus.FAILED:
      case PaymentStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case PaymentStatus.PROCESSING:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Management</h1>
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              <Link to="/retailer/dashboard" className="text-blue-600 dark:text-blue-400 hover:text-blue-700">
              Back to Dashboard
            </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {orders.length > 0 ? (
          <>
            <div className="space-y-4 mb-8">
              {orders.map((order) => {
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

                // Get items and total for THIS retailer only
                const orderItems = mySubOrder?.items || order.items || [];
                const orderTotal = mySubOrder?.totalAmount || order.totalAmount;
                const orderStatus = mySubOrder?.status || order.status;
                const orderPaymentStatus = mySubOrder?.paymentStatus || order.paymentStatus;
                const subOrderId = mySubOrder?.subOrderId;

                return (
                  <div key={order._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Order #{subOrderId || order.orderId || order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Customer: {customerName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(orderStatus)}`}>
                          {orderStatus}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(orderPaymentStatus)}`}>
                          Payment: {orderPaymentStatus}
                        </span>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">₹{orderTotal.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="border-t border-b border-gray-200 py-4 my-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Items</h4>
                      <div className="space-y-3">
                        {orderItems.map((item, index) => {
                          const product = (item as any).product || (item as any).productId;
                          const productName = product?.name || item.name || 'Unknown Product';
                          const productImage = product?.images?.[0] || 'https://via.placeholder.com/80';

                          return (
                            <div key={index} className="flex items-center space-x-4">
                              <img
                                src={productImage}
                                alt={productName}
                                className="w-16 h-16 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">{productName}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Quantity: {item.quantity}</p>
                              </div>
                              <p className="font-semibold text-gray-900 dark:text-white">₹{item.subtotal.toFixed(2)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {order.deliveryAddress && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Delivery Address</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {order.deliveryAddress.street}, {order.deliveryAddress.city}
                          <br />
                          {order.deliveryAddress.state} - {order.deliveryAddress.zipCode}
                          <br />
                          {order.deliveryAddress.country}
                        </p>

                        {/* Delivery Estimate - Show from sub-order if available, fallback to master order estimate */}
                        {(mySubOrder?.deliveryEstimate || (order as any).deliveryEstimate) && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <h5 className="text-xs font-semibold text-blue-900 dark:text-blue-300">Your Delivery Estimate</h5>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Distance:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                  {(mySubOrder?.deliveryEstimate || (order as any).deliveryEstimate).distanceText}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">ETA:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                  {(mySubOrder?.deliveryEstimate || (order as any).deliveryEstimate).durationText}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Order Notes</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{order.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                      >
                        Update Status
                      </button>
                      {orderPaymentStatus === PaymentStatus.PENDING && (
                        <button
                          onClick={() => handleMarkAsPaid(order._id, subOrderId)}
                          disabled={markingPaid}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:bg-gray-400"
                        >
                          {markingPaid ? 'Marking...' : 'Mark as Paid'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadInvoice(order._id)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
                      >
                        Download Invoice
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:bg-gray-900"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-700 dark:text-gray-200">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:bg-gray-900"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-24 w-24 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Orders from customers will appear here</p>
          </div>
        )}
      </main>

      {/* Update Status Modal */}
      {selectedOrder && (() => {
        // Get user ID from localStorage to find retailer's sub-order
        const userStr = localStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const retailerId = currentUser?._id;

        // Find this retailer's sub-order
        const mySubOrder = selectedOrder.subOrders?.find(so =>
          so.retailerId._id === retailerId || so.retailerId === retailerId
        );

        const currentStatus = mySubOrder?.status || selectedOrder.status;
        const displayOrderId = mySubOrder?.subOrderId || selectedOrder.orderId || selectedOrder.orderNumber;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Update Order Status</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Order Number</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{displayOrderId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Current Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                    {currentStatus}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Update to:</p>
                  <div className="space-y-2">
                    {currentStatus === OrderStatus.PENDING && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder._id, mySubOrder?.subOrderId, OrderStatus.CONFIRMED)}
                        disabled={updatingStatus}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
                      >
                        Confirm Order
                      </button>
                    )}
                    {currentStatus === OrderStatus.CONFIRMED && (
                      <>
                        <div>
                          <label htmlFor="shippingDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Expected Shipping Date (Optional)
                          </label>
                          <input
                            type="date"
                            id="shippingDate"
                            value={shippingDate}
                            onChange={(e) => setShippingDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Customer will receive a calendar invite when you set a shipping date
                          </p>
                        </div>
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder._id, mySubOrder?.subOrderId, OrderStatus.PROCESSING)}
                          disabled={updatingStatus}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
                        >
                          Start Processing
                        </button>
                      </>
                    )}
                    {currentStatus === OrderStatus.PROCESSING && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder._id, mySubOrder?.subOrderId, OrderStatus.SHIPPED)}
                        disabled={updatingStatus}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {currentStatus === OrderStatus.SHIPPED && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder._id, mySubOrder?.subOrderId, OrderStatus.DELIVERED)}
                        disabled={updatingStatus}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:bg-gray-400"
                      >
                        Mark as Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default OrderManagement;
