/**
 * Payment Service
 * Handles UPI payment-related API calls
 */

import apiClient from './api';

export enum UPIGatewayType {
  RAZORPAY = 'RAZORPAY',
  PHONEPE = 'PHONEPE',
  GOOGLEPAY = 'GOOGLEPAY',
  PAYTM = 'PAYTM',
  BHIM = 'BHIM',
  AMAZON_PAY = 'AMAZON_PAY',
}

export enum TransactionStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  REFUND_INITIATED = 'REFUND_INITIATED',
  REFUNDED = 'REFUNDED',
}

export interface UPITransaction {
  _id: string;
  transactionId: string;
  orderId: string | {
    _id: string;
    orderId: string;
    totalAmount: number;
    status: string;
  };
  customerId: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  gateway: UPIGatewayType;
  upiId?: string;
  merchantTransactionId: string;
  paymentLink?: string;
  qrCode?: string;
  responseCode?: string;
  responseMessage?: string;
  bankReferenceNumber?: string;
  initiatedAt: string;
  completedAt?: string;
  expiresAt: string;
  refund?: {
    refundId: string;
    amount: number;
    reason: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    initiatedAt: string;
    completedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStatistics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalAmount: number;
  successAmount: number;
  failedAmount: number;
  refundedAmount: number;
}

export interface GatewayStats {
  gateway: UPIGatewayType;
  count: number;
  amount: number;
  successRate: number;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

class PaymentService {
  /**
   * Initiate UPI payment for an order
   */
  async initiatePayment(data: {
    orderId: string;
    gateway: UPIGatewayType;
    upiId?: string;
  }): Promise<ApiResponse<{ transaction: UPITransaction }>> {
    const response = await apiClient.post<ApiResponse<{ transaction: UPITransaction }>>(
      '/payments/initiate',
      data
    );
    return response.data;
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId: string): Promise<ApiResponse<{ transaction: UPITransaction; isVerified: boolean }>> {
    const response = await apiClient.post<ApiResponse<{ transaction: UPITransaction; isVerified: boolean }>>(
      '/payments/verify',
      { transactionId }
    );
    return response.data;
  }

  /**
   * Verify Razorpay payment signature
   */
  async verifyRazorpayPayment(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    transactionId: string;
  }): Promise<ApiResponse<{ transaction: UPITransaction; payment: any }>> {
    const response = await apiClient.post<ApiResponse<{ transaction: UPITransaction; payment: any }>>(
      '/payments/verify-razorpay',
      data
    );
    return response.data;
  }

  /**
   * Mark payment as failed
   */
  async markPaymentFailed(data: {
    transactionId: string;
    errorCode?: string;
    errorDescription?: string;
  }): Promise<ApiResponse<{ transaction: UPITransaction }>> {
    const response = await apiClient.post<ApiResponse<{ transaction: UPITransaction }>>(
      '/payments/mark-failed',
      data
    );
    return response.data;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<ApiResponse<{ transaction: UPITransaction }>> {
    const response = await apiClient.get<ApiResponse<{ transaction: UPITransaction }>>(
      `/payments/transaction/${transactionId}`
    );
    return response.data;
  }

  /**
   * Get my transactions with pagination
   */
  async getMyTransactions(params?: {
    page?: number;
    limit?: number;
    status?: TransactionStatus;
  }): Promise<ApiResponse<{
    transactions: UPITransaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.get<ApiResponse<{
      transactions: UPITransaction[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    }>>(`/payments/transactions?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Initiate refund (Retailer/Wholesaler only)
   */
  async initiateRefund(data: {
    transactionId: string;
    amount: number;
    reason: string;
  }): Promise<ApiResponse<{ transaction: UPITransaction }>> {
    const response = await apiClient.post<ApiResponse<{ transaction: UPITransaction }>>(
      '/payments/refund',
      data
    );
    return response.data;
  }

  /**
   * Get payment statistics (Retailer/Wholesaler only)
   */
  async getPaymentStatistics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{
    statistics: PaymentStatistics;
    gatewayStats: GatewayStats[];
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await apiClient.get<ApiResponse<{
      statistics: PaymentStatistics;
      gatewayStats: GatewayStats[];
    }>>(`/payments/statistics?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Open UPI payment link in new window/app
   */
  openUPIPayment(paymentLink: string): void {
    if (this.isMobileDevice()) {
      // On mobile, open in same window to trigger UPI app
      window.location.href = paymentLink;
    } else {
      // On desktop, open in new window
      window.open(paymentLink, '_blank');
    }
  }

  /**
   * Check if device is mobile
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Format transaction amount
   */
  formatAmount(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Get gateway display name
   */
  getGatewayName(gateway: UPIGatewayType): string {
    const names: Record<UPIGatewayType, string> = {
      [UPIGatewayType.RAZORPAY]: 'Razorpay',
      [UPIGatewayType.PHONEPE]: 'PhonePe',
      [UPIGatewayType.GOOGLEPAY]: 'Google Pay',
      [UPIGatewayType.PAYTM]: 'Paytm',
      [UPIGatewayType.BHIM]: 'BHIM UPI',
      [UPIGatewayType.AMAZON_PAY]: 'Amazon Pay',
    };
    return names[gateway] || gateway;
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: TransactionStatus): string {
    const colors: Record<TransactionStatus, string> = {
      [TransactionStatus.INITIATED]: 'bg-blue-100 text-blue-800',
      [TransactionStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [TransactionStatus.PROCESSING]: 'bg-blue-100 text-blue-800',
      [TransactionStatus.SUCCESS]: 'bg-green-100 text-green-800',
      [TransactionStatus.FAILED]: 'bg-red-100 text-red-800',
      [TransactionStatus.TIMEOUT]: 'bg-gray-100 text-gray-800',
      [TransactionStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
      [TransactionStatus.REFUND_INITIATED]: 'bg-orange-100 text-orange-800',
      [TransactionStatus.REFUNDED]: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }
}

export default new PaymentService();
