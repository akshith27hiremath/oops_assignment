/**
 * Order History Page - GroceryMart Style
 * View past orders with status badges and clean design
 */

import React, { useEffect, useState } from 'react';
import CustomerLayout from '../../components/layout/CustomerLayout';
import orderService from '../../services/order.service';
import { Order, OrderStatus, PaymentStatus } from '../../types/order.types';
import ReviewForm from '../../components/reviews/ReviewForm';
import toast from 'react-hot-toast';

const OrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reviewingProduct, setReviewingProduct] = useState<{ orderId: string; productId: string; productName: string } | null>(null);

  useEffect(() => {
    loadOrders();
  }, [currentPage]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getCustomerOrders(currentPage, 10);
      if (response.success) {
        // Filter out cancelled orders (typically from abandoned UPI payments)
        const activeOrders = response.data.orders.filter(
          (order: Order) => {
            const effectiveStatus = order.masterStatus || order.status;
            return effectiveStatus !== OrderStatus.CANCELLED;
          }
        );
        setOrders(activeOrders);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSuccess = () => {
    toast.success('Review submitted successfully!');
    setReviewingProduct(null);
    loadOrders();
  };

  const handleCancelOrder = async () => {
    if (!cancellingOrder) return;

    try {
      setCancelling(true);
      await orderService.cancelOrder(cancellingOrder._id, cancelReason || undefined);
      toast.success('Order cancelled successfully');
      setCancellingOrder(null);
      setCancelReason('');
      loadOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
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

  const getStatusBadge = (status: OrderStatus) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      DELIVERED: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', label: 'Delivered' },
      OUT_FOR_DELIVERY: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', label: 'In Transit' },
      SHIPPED: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', label: 'Shipped' },
      PROCESSING: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', label: 'Processing' },
      CONFIRMED: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', label: 'Confirmed' },
      PENDING: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', label: 'Pending' },
      CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', label: 'Cancelled' },
      REFUNDED: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', label: 'Refunded' },
    };
    const badge = statusMap[status] || statusMap.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      COMPLETED: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
      PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' },
      PROCESSING: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
      FAILED: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
      CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
      REFUNDED: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
    };
    const badge = statusMap[status] || statusMap.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading orders...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Orders</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage your orders</p>
      </div>

      {orders.length > 0 ? (
        <>
          {/* Orders List */}
          <div className="space-y-4 mb-8">
            {orders.map((order) => (
              <div key={order._id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                {/* Order Header */}
                <div className="p-6 border-b dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Order #{order.orderId || order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">${order.totalAmount.toFixed(2)}</p>
                      <div className="flex gap-2 mt-2">
                        {getStatusBadge(order.masterStatus || order.status!)}
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </div>
                    </div>
                  </div>

                  {/* Order Items - Support both old and new formats */}
                  <div className="space-y-3">
                    {order.subOrders && order.subOrders.length > 0 ? (
                      // New multi-retailer format
                      order.subOrders.map((subOrder, subOrderIndex) => (
                        <div key={subOrder.subOrderId} className="mb-4">
                          {/* Sub-order Header */}
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {subOrder.retailerId.businessName || subOrder.retailerId.profile?.name || 'Retailer'}
                            </span>
                            {getStatusBadge(subOrder.status)}
                            <span className="text-sm font-semibold text-gray-900 dark:text-white ml-auto">
                              ${subOrder.totalAmount.toFixed(2)}
                            </span>
                          </div>

                          {/* Items for this sub-order */}
                          {subOrder.items.map((item, index) => {
                            const product = (item as any).product || (item as any).productId;
                            const productId = product?._id || (item as any).productId;
                            const productName = product?.name || (item as any).name || 'Unknown Product';
                            const productImage = product?.images?.[0];
                            const hasReview = (item as any).hasReview;
                            const canReview = subOrder.status === OrderStatus.DELIVERED && !hasReview && productId;

                            return (
                              <div key={`${subOrder.subOrderId}-${index}`} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg ml-6">
                                {productImage && (
                                  <img
                                    src={productImage}
                                    alt={productName}
                                    className="w-16 h-16 object-cover rounded-lg"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white">{productName}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Qty: {item.quantity}</p>
                                  {hasReview && (
                                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Reviewed
                                    </span>
                                  )}
                                </div>
                                <p className="font-semibold text-gray-900 dark:text-white">${item.subtotal.toFixed(2)}</p>
                                {canReview && (
                                  <button
                                    onClick={() => setReviewingProduct({ orderId: order._id, productId, productName })}
                                    className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition whitespace-nowrap"
                                  >
                                    Write Review
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      // Old single-retailer format
                      order.items?.map((item, index) => {
                        const product = (item as any).product || (item as any).productId;
                        const productId = product?._id || (item as any).productId;
                        const productName = product?.name || (item as any).name || 'Unknown Product';
                        const productImage = product?.images?.[0];
                        const hasReview = (item as any).hasReview;
                        const canReview = order.status === OrderStatus.DELIVERED && !hasReview && productId;

                        return (
                          <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            {productImage && (
                              <img
                                src={productImage}
                                alt={productName}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{productName}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Qty: {item.quantity}</p>
                              {hasReview && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Reviewed
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-white">${item.subtotal.toFixed(2)}</p>
                            {canReview && (
                              <button
                                onClick={() => setReviewingProduct({ orderId: order._id, productId, productName })}
                                className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition whitespace-nowrap"
                              >
                                Write Review
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Order Footer Actions */}
                <div className="p-6 bg-gray-50 dark:bg-gray-700/30">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-4 py-2 bg-gray-900 dark:bg-green-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-green-700 transition font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDownloadInvoice(order._id)}
                      className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-600 dark:hover:border-green-500 transition font-medium"
                    >
                      Download Invoice
                    </button>
                    {(() => {
                      const effectiveStatus = order.masterStatus || order.status;
                      return (effectiveStatus === OrderStatus.PENDING || effectiveStatus === OrderStatus.CONFIRMED) &&
                             order.paymentStatus !== PaymentStatus.COMPLETED &&
                             order.paymentStatus !== PaymentStatus.REFUNDED && (
                        <button
                          onClick={() => setCancellingOrder(order)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                        >
                          Cancel Order
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
              >
                Previous
              </button>
              <span className="text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No orders yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Start shopping to see your orders here!</p>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Order Number</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.orderId || selectedOrder.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Status</p>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Delivery Address</p>
                <p className="text-gray-900 dark:text-white">
                  {selectedOrder.deliveryAddress.street}, {selectedOrder.deliveryAddress.city}<br />
                  {selectedOrder.deliveryAddress.state} - {selectedOrder.deliveryAddress.zipCode}<br />
                  {selectedOrder.deliveryAddress.country}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">${selectedOrder.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cancel Order</h2>
              <button
                onClick={() => {
                  setCancellingOrder(null);
                  setCancelReason('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Order Number</p>
                <p className="font-semibold text-gray-900 dark:text-white">{cancellingOrder.orderId || cancellingOrder.orderNumber}</p>
              </div>

              <div>
                <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="e.g., Changed my mind, Found a better price, etc."
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Note:</strong> Cancelling this order will release the reserved stock and you cannot undo this action.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setCancellingOrder(null);
                    setCancelReason('');
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition"
                  disabled={cancelling}
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {cancelling ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cancelling...
                    </span>
                  ) : (
                    'Cancel Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Form Modal */}
      {reviewingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
            <ReviewForm
              productId={reviewingProduct.productId}
              productName={reviewingProduct.productName}
              orderId={reviewingProduct.orderId}
              onSuccess={handleReviewSuccess}
              onCancel={() => setReviewingProduct(null)}
            />
          </div>
        </div>
      )}
    </CustomerLayout>
  );
};

export default OrderHistory;
