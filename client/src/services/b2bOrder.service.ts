/**
 * B2B Order Service
 * Handles API calls for retailer-wholesaler orders
 */

import apiClient from './api';

export enum WholesalerOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum B2BPaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface WholesalerOrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  volumeDiscount: number;
  subtotal: number;
}

export interface TrackingInfo {
  currentStatus: WholesalerOrderStatus;
  statusHistory: {
    status: WholesalerOrderStatus;
    timestamp: string;
    notes?: string;
    updatedBy?: string;
  }[];
  estimatedDelivery?: string;
  actualDelivery?: string;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface WholesalerOrder {
  _id: string;
  orderNumber: string;
  retailerId: string | {
    _id: string;
    profile: {
      name: string;
      phone: string;
    };
    store?: {
      name: string;
      address: any;
    };
  };
  wholesalerId: string | {
    _id: string;
    profile: {
      name: string;
      phone: string;
    };
    businessName: string;
  };
  items: WholesalerOrderItem[];
  status: WholesalerOrderStatus;
  paymentStatus: B2BPaymentStatus;
  paymentDueDate?: string;
  paymentCompletedAt?: string;
  isPaymentOverdue?: boolean;
  daysUntilDue?: number;
  totalAmount: number;
  deliveryAddress: DeliveryAddress;
  trackingInfo: TrackingInfo;
  upiTransactionId?: string;
  notes?: string;
  invoiceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateB2BOrderData {
  wholesalerId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  deliveryAddress: DeliveryAddress;
  notes?: string;
}

export interface B2BOrdersResponse {
  success: boolean;
  data: {
    orders: WholesalerOrder[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface B2BOrderResponse {
  success: boolean;
  data: {
    order: WholesalerOrder;
  };
  message?: string;
}

export interface B2BStatsResponse {
  success: boolean;
  data: {
    activeOrders: number;
    totalRevenue: number;
    totalOrders: number;
  };
}

class B2BOrderService {
  /**
   * Create a new B2B order
   */
  async createOrder(orderData: CreateB2BOrderData): Promise<B2BOrderResponse> {
    const response = await apiClient.post<B2BOrderResponse>('/b2b/orders', orderData);
    return response.data;
  }

  /**
   * Get all B2B orders for the logged-in user
   */
  async getOrders(
    status?: WholesalerOrderStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<B2BOrdersResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get<B2BOrdersResponse>(`/b2b/orders?${params}`);
    return response.data;
  }

  /**
   * Get order details by ID
   */
  async getOrderById(orderId: string): Promise<B2BOrderResponse> {
    const response = await apiClient.get<B2BOrderResponse>(`/b2b/orders/${orderId}`);
    return response.data;
  }

  /**
   * Cancel order (retailer only, before confirmation)
   */
  async cancelOrder(orderId: string, reason?: string): Promise<B2BOrderResponse> {
    const response = await apiClient.put<B2BOrderResponse>(`/b2b/orders/${orderId}/cancel`, {
      reason,
    });
    return response.data;
  }

  /**
   * Confirm order (wholesaler only)
   */
  async confirmOrder(orderId: string): Promise<B2BOrderResponse> {
    const response = await apiClient.put<B2BOrderResponse>(`/b2b/orders/${orderId}/confirm`);
    return response.data;
  }

  /**
   * Update order status (wholesaler only)
   */
  async updateOrderStatus(
    orderId: string,
    status: WholesalerOrderStatus,
    notes?: string
  ): Promise<B2BOrderResponse> {
    const response = await apiClient.put<B2BOrderResponse>(`/b2b/orders/${orderId}/status`, {
      status,
      notes,
    });
    return response.data;
  }

  /**
   * Mark order as paid (wholesaler only)
   */
  async markOrderAsPaid(orderId: string): Promise<B2BOrderResponse> {
    const response = await apiClient.put<B2BOrderResponse>(`/b2b/orders/${orderId}/mark-paid`);
    return response.data;
  }

  /**
   * Notify wholesaler that payment has been sent (retailer only)
   */
  async notifyPaymentSent(
    orderId: string,
    paymentMethod?: string,
    transactionReference?: string,
    notes?: string
  ): Promise<B2BOrderResponse> {
    const response = await apiClient.put<B2BOrderResponse>(
      `/b2b/orders/${orderId}/notify-payment-sent`,
      { paymentMethod, transactionReference, notes }
    );
    return response.data;
  }

  /**
   * Generate invoice for order
   */
  async generateInvoice(orderId: string): Promise<{ success: boolean; data: { invoiceUrl: string } }> {
    const response = await apiClient.post(`/b2b/orders/${orderId}/generate-invoice`);
    return response.data;
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoice(orderId: string): Promise<void> {
    try {
      const response = await apiClient.get(`/b2b/orders/${orderId}/invoice`, {
        responseType: 'blob',
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download invoice:', error);
      throw error;
    }
  }

  /**
   * Get wholesaler statistics
   */
  async getWholesalerStats(): Promise<B2BStatsResponse> {
    const response = await apiClient.get<B2BStatsResponse>('/b2b/orders/stats/wholesaler');
    return response.data;
  }

  /**
   * Get retailer network with aggregated stats
   */
  async getRetailerNetwork(): Promise<{
    success: boolean;
    data: {
      retailers: Array<{
        _id: string;
        email: string;
        businessName: string;
        profile: {
          phone: string;
          address?: {
            city?: string;
            state?: string;
          };
        };
        isActive: boolean;
        totalOrders: number;
        totalSpent: number;
        lastOrderDate?: string;
      }>;
      totalRetailers: number;
      activeRetailers: number;
    };
  }> {
    const response = await apiClient.get('/b2b/orders/retailer-network');
    return response.data;
  }

  /**
   * Format order status for display
   */
  getStatusLabel(status: WholesalerOrderStatus): string {
    const labels: Record<WholesalerOrderStatus, string> = {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      PROCESSING: 'Processing',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      REJECTED: 'Rejected',
    };
    return labels[status] || status;
  }

  /**
   * Get status color for display
   */
  getStatusColor(status: WholesalerOrderStatus): string {
    const colors: Record<WholesalerOrderStatus, string> = {
      PENDING: 'yellow',
      CONFIRMED: 'blue',
      PROCESSING: 'indigo',
      SHIPPED: 'purple',
      DELIVERED: 'green',
      COMPLETED: 'green',
      CANCELLED: 'red',
      REJECTED: 'red',
    };
    return colors[status] || 'gray';
  }

  /**
   * Format payment status for display
   */
  getPaymentStatusLabel(status: B2BPaymentStatus): string {
    const labels: Record<B2BPaymentStatus, string> = {
      PENDING: 'Pending',
      PROCESSING: 'Processing',
      COMPLETED: 'Paid',
      FAILED: 'Failed',
      REFUNDED: 'Refunded',
    };
    return labels[status] || status;
  }

  /**
   * Get payment status color
   */
  getPaymentStatusColor(status: B2BPaymentStatus): string {
    const colors: Record<B2BPaymentStatus, string> = {
      PENDING: 'yellow',
      PROCESSING: 'blue',
      COMPLETED: 'green',
      FAILED: 'red',
      REFUNDED: 'gray',
    };
    return colors[status] || 'gray';
  }
}

export default new B2BOrderService();
