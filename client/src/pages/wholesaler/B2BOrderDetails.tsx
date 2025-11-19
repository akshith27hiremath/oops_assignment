/**
 * Wholesaler B2B Order Details Page
 * View and manage a specific B2B order from a retailer
 */

import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import b2bOrderService, { WholesalerOrder, WholesalerOrderStatus } from '../../services/b2bOrder.service';
import DarkModeToggle from '../../components/DarkModeToggle';

const B2BOrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<WholesalerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await b2bOrderService.getOrderById(orderId!);
      setOrder(response.data.order);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch order details');
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!window.confirm('Confirm this order? This will reserve the inventory for this retailer.')) return;

    try {
      setProcessing(true);
      await b2bOrderService.confirmOrder(orderId!);
      await fetchOrderDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to confirm order');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectOrder = async () => {
    const reason = window.prompt('Enter reason for rejection:');
    if (!reason) return;

    try {
      setProcessing(true);
      await b2bOrderService.updateOrderStatus(orderId!, WholesalerOrderStatus.REJECTED, reason);
      await fetchOrderDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject order');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (newStatus: WholesalerOrderStatus) => {
    const notes = window.prompt(`Update order to ${b2bOrderService.getStatusLabel(newStatus)}? Add notes (optional):`);
    if (notes === null) return; // User cancelled

    try {
      setProcessing(true);
      await b2bOrderService.updateOrderStatus(orderId!, newStatus, notes || undefined);
      await fetchOrderDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!window.confirm('Mark this order as paid? This confirms you have received payment from the retailer.')) return;

    try {
      setProcessing(true);
      await b2bOrderService.markOrderAsPaid(orderId!);
      await fetchOrderDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark order as paid');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;

    try {
      await b2bOrderService.downloadInvoice(order._id);
      alert('Invoice downloaded successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download invoice');
    }
  };

  const getRetailerInfo = () => {
    if (!order) return { name: '', phone: '', storeName: '' };
    if (typeof order.retailerId === 'object') {
      return {
        name: order.retailerId.profile.name,
        phone: order.retailerId.profile.phone,
        storeName: order.retailerId.store?.name || '',
      };
    }
    return { name: 'Unknown', phone: '', storeName: '' };
  };

  const getStatusColor = (status: WholesalerOrderStatus): string => {
    const color = b2bOrderService.getStatusColor(status);
    return `bg-${color}-100 text-${color}-800`;
  };

  const getNextStatus = (currentStatus: WholesalerOrderStatus): WholesalerOrderStatus | null => {
    const statusFlow: Record<WholesalerOrderStatus, WholesalerOrderStatus | null> = {
      [WholesalerOrderStatus.PENDING]: null,
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
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Details</h1>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Order not found'}
          </div>
          <Link to="/wholesaler/bulk-orders" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800">
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const retailerInfo = getRetailerInfo();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order {order.orderNumber}</h1>
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
              <Link to="/wholesaler/bulk-orders" className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300">
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Order Status</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {b2bOrderService.getStatusLabel(order.status)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {order.status === WholesalerOrderStatus.PENDING && (
                  <>
                    <button
                      onClick={handleConfirmOrder}
                      disabled={processing}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Processing...' : 'Confirm Order'}
                    </button>
                    <button
                      onClick={handleRejectOrder}
                      disabled={processing}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject Order
                    </button>
                  </>
                )}

                {getNextStatus(order.status) && (
                  <button
                    onClick={() => handleUpdateStatus(getNextStatus(order.status)!)}
                    disabled={processing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Updating...' : `Mark as ${b2bOrderService.getStatusLabel(getNextStatus(order.status)!)}`}
                  </button>
                )}

                {/* Mark as Paid button - show if payment is pending */}
                {order.paymentStatus !== 'COMPLETED' &&
                 order.status !== WholesalerOrderStatus.PENDING &&
                 order.status !== WholesalerOrderStatus.CANCELLED &&
                 order.status !== WholesalerOrderStatus.REJECTED && (
                  <button
                    onClick={handleMarkAsPaid}
                    disabled={processing}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Processing...' : '💰 Mark as Paid'}
                  </button>
                )}
              </div>

              {/* Status Timeline */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Order Timeline</h3>
                <div className="space-y-4">
                  {order.trackingInfo.statusHistory.map((history, index) => (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                        }`}>
                          <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {b2bOrderService.getStatusLabel(history.status)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(history.timestamp).toLocaleString()}
                        </p>
                        {history.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            Note: {history.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</h3>
                      <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                      <p className="text-xs text-gray-500">Unit Price: ₹{item.unitPrice.toLocaleString()}</p>
                      {item.volumeDiscount > 0 && (
                        <p className="text-xs text-green-600">
                          Volume Discount: {item.volumeDiscount}%
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{item.subtotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">Total Amount</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    ₹{order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Address</h2>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p>{order.deliveryAddress.street}</p>
                <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}</p>
                <p>{order.deliveryAddress.country}</p>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Order Notes</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Retailer Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Retailer Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Store Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {retailerInfo.storeName || retailerInfo.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Contact Person</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{retailerInfo.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{retailerInfo.phone}</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Payment Status</p>
                  <p className={`text-sm font-medium ${
                    order.paymentStatus === 'COMPLETED' ? 'text-green-600' :
                    order.isPaymentOverdue ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {b2bOrderService.getPaymentStatusLabel(order.paymentStatus)}
                    {order.isPaymentOverdue && ' (OVERDUE)'}
                  </p>
                </div>
                {order.paymentDueDate && order.paymentStatus !== 'COMPLETED' && (
                  <div>
                    <p className="text-xs text-gray-500">Payment Due Date</p>
                    <p className={`text-sm font-medium ${
                      order.isPaymentOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white'
                    }`}>
                      {new Date(order.paymentDueDate).toLocaleDateString()}
                      {order.daysUntilDue !== null && (
                        <span className="text-xs ml-2">
                          ({order.daysUntilDue > 0
                            ? `${order.daysUntilDue} days left`
                            : `${Math.abs(order.daysUntilDue)} days overdue`
                          })
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {order.paymentCompletedAt && (
                  <div>
                    <p className="text-xs text-gray-500">Payment Received On</p>
                    <p className="text-sm font-medium text-green-600">
                      {new Date(order.paymentCompletedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {order.upiTransactionId && (
                  <div>
                    <p className="text-xs text-gray-500">UPI Transaction ID</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{order.upiTransactionId}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ₹{order.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Metadata */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Order Number</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Order Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(order.updatedAt).toLocaleString()}
                  </p>
                </div>
                {order.trackingInfo.estimatedDelivery && (
                  <div>
                    <p className="text-xs text-gray-500">Estimated Delivery</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(order.trackingInfo.estimatedDelivery).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {order.trackingInfo.actualDelivery && (
                  <div>
                    <p className="text-xs text-gray-500">Actual Delivery</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(order.trackingInfo.actualDelivery).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default B2BOrderDetails;
