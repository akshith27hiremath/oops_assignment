/**
 * B2B Order Details Page
 * View complete details of a bulk order
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import b2bOrderService, { WholesalerOrder, WholesalerOrderStatus } from '../../services/b2bOrder.service';
import toast from 'react-hot-toast';
import DarkModeToggle from '../../components/DarkModeToggle';

const B2BOrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<WholesalerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: '',
    transactionReference: '',
    notes: '',
  });

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await b2bOrderService.getOrderById(orderId!);

      if (response.success) {
        setOrder(response.data.order);
      } else {
        toast.error('Order not found');
        navigate('/retailer/b2b-orders');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load order details');
      navigate('/retailer/b2b-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyPaymentSent = async () => {
    if (!order) return;

    try {
      await b2bOrderService.notifyPaymentSent(
        orderId!,
        paymentForm.paymentMethod || undefined,
        paymentForm.transactionReference || undefined,
        paymentForm.notes || undefined
      );
      toast.success('Payment notification sent to wholesaler!');
      setShowPaymentModal(false);
      setPaymentForm({ paymentMethod: '', transactionReference: '', notes: '' });
      loadOrderDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;

    setCancelling(true);

    try {
      const response = await b2bOrderService.cancelOrder(order._id, reason);

      if (response.success) {
        toast.success('Order cancelled successfully');
        loadOrderDetails(); // Reload to get updated status
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;

    try {
      await b2bOrderService.downloadInvoice(order._id);
      toast.success('Invoice downloaded successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to download invoice');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const wholesaler = typeof order.wholesalerId === 'object' ? order.wholesalerId : null;
  const canCancel = order.status === WholesalerOrderStatus.PENDING;

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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Details</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Order #{order.orderNumber}</p>
            </div>
            <div className="flex gap-3">
              <DarkModeToggle />
              {/* Invoice download button for completed orders */}
              {order.status === WholesalerOrderStatus.COMPLETED && (
                <button
                  onClick={handleDownloadInvoice}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Invoice
                </button>
              )}
              {/* Show payment sent button if payment is pending */}
              {order.paymentStatus !== 'COMPLETED' &&
               order.status !== WholesalerOrderStatus.PENDING &&
               order.status !== WholesalerOrderStatus.CANCELLED &&
               order.status !== WholesalerOrderStatus.REJECTED && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  💸 I've Sent Payment
                </button>
              )}
              {canCancel && (
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}
              <Link
                to="/retailer/b2b-orders"
                className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300"
              >
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Status</h2>
              <div className="flex items-center justify-between mb-6">
                <span className={`inline-block px-4 py-2 rounded-full text-lg font-semibold ${getStatusBadgeColor(order.status)}`}>
                  {b2bOrderService.getStatusLabel(order.status)}
                </span>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Payment Status</p>
                  <p className={`font-semibold ${
                    order.paymentStatus === 'COMPLETED' ? 'text-green-600' :
                    order.isPaymentOverdue ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {b2bOrderService.getPaymentStatusLabel(order.paymentStatus)}
                    {order.isPaymentOverdue && ' (OVERDUE)'}
                  </p>
                  {order.paymentDueDate && order.paymentStatus !== 'COMPLETED' && (
                    <p className={`text-xs mt-1 ${order.isPaymentOverdue ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'}`}>
                      Due: {new Date(order.paymentDueDate).toLocaleDateString()}
                      {order.daysUntilDue !== null && (
                        <span className="ml-1">
                          ({order.daysUntilDue > 0
                            ? `${order.daysUntilDue} days left`
                            : `${Math.abs(order.daysUntilDue)} days overdue`
                          })
                        </span>
                      )}
                    </p>
                  )}
                  {order.paymentCompletedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Paid on {new Date(order.paymentCompletedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Status History */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Status History</h3>
                {order.trackingInfo.statusHistory.map((history, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">{b2bOrderService.getStatusLabel(history.status)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(history.timestamp).toLocaleString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {history.notes && <p className="text-sm text-gray-500 italic">{history.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 border-b pb-4 last:border-b-0">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-300">Quantity</p>
                          <p className="font-semibold">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-300">Unit Price</p>
                          <p className="font-semibold">₹{item.unitPrice.toFixed(2)}</p>
                        </div>
                        {item.volumeDiscount > 0 && (
                          <div>
                            <p className="text-gray-600 dark:text-gray-300">Volume Discount</p>
                            <p className="font-semibold text-green-600">{item.volumeDiscount}%</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-600 dark:text-gray-300">Subtotal</p>
                          <p className="font-bold text-lg">₹{item.subtotal.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">₹{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Address</h2>
              <div className="text-gray-700 dark:text-gray-200">
                <p>{order.deliveryAddress.street}</p>
                <p>{order.deliveryAddress.city}, {order.deliveryAddress.state}</p>
                <p>{order.deliveryAddress.zipCode}, {order.deliveryAddress.country}</p>
              </div>
            </div>

            {/* Order Notes */}
            {order.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Notes</h2>
                <p className="text-gray-700 dark:text-gray-200">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Supplier Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Supplier Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Business Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {wholesaler?.businessName || wholesaler?.profile?.name || 'Unknown'}
                  </p>
                </div>
                {wholesaler?.profile?.phone && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Contact</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{wholesaler.profile.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Order Date:</span>
                  <span className="font-semibold">
                    {new Date(order.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Total Items:</span>
                  <span className="font-semibold">{order.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Total Quantity:</span>
                  <span className="font-semibold">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                {order.trackingInfo.estimatedDelivery && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Est. Delivery:</span>
                    <span className="font-semibold">
                      {new Date(order.trackingInfo.estimatedDelivery).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
                {order.trackingInfo.actualDelivery && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Delivered On:</span>
                    <span className="font-semibold text-green-600">
                      {new Date(order.trackingInfo.actualDelivery).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
              <div className="space-y-3">
                {order.status === WholesalerOrderStatus.COMPLETED && (
                  <Link
                    to="/retailer/inventory"
                    className="block w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-center"
                  >
                    View Inventory
                  </Link>
                )}
                <button
                  onClick={loadOrderDetails}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Payment Sent Notification Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Notify Payment Sent</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Let the wholesaler know you've sent the payment. They'll be notified and can verify and mark the order as paid.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Payment Method <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  placeholder="e.g., Bank Transfer, UPI, Cheque"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Transaction Reference <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  placeholder="e.g., Transaction ID, Cheque Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Notes <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Any additional details..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentForm({ paymentMethod: '', transactionReference: '', notes: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleNotifyPaymentSent}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BOrderDetails;
