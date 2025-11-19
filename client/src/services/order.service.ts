/**
 * Order Service
 * Handles all order-related API calls
 */

import apiClient from './api';
import { Order, OrderListResponse, CreateOrderRequest } from '../types/order.types';
import { ApiResponse } from '../types/auth.types';

class OrderService {
  /**
   * Get all orders for the current user
   */
  async getOrders(page: number = 1, limit: number = 10): Promise<OrderListResponse> {
    const response = await apiClient.get<OrderListResponse>(
      `/orders?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string): Promise<ApiResponse<{ order: Order }>> {
    const response = await apiClient.get<ApiResponse<{ order: Order }>>(`/orders/${id}`);
    return response.data;
  }

  /**
   * Create a new order
   */
  async createOrder(data: CreateOrderRequest): Promise<ApiResponse<{ order: Order }>> {
    const response = await apiClient.post<ApiResponse<{ order: Order }>>('/orders', data);
    return response.data;
  }

  /**
   * Update order status (Retailer only)
   */
  async updateOrderStatus(orderId: string, status: string): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(`/orders/${orderId}/status`, { status });
    return response.data;
  }

  /**
   * Update sub-order status (Retailer only - for multi-retailer orders)
   */
  async updateSubOrderStatus(orderId: string, subOrderId: string, status: string): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(
      `/orders/${orderId}/sub-orders/${subOrderId}/status`,
      { status }
    );
    return response.data;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  }

  /**
   * Get customer order history
   */
  async getCustomerOrders(page: number = 1, limit: number = 10): Promise<OrderListResponse> {
    // Use the same endpoint as getOrders - backend determines based on user type
    const response = await apiClient.get<OrderListResponse>(
      `/orders?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Get retailer orders
   */
  async getRetailerOrders(page: number = 1, limit: number = 10): Promise<OrderListResponse> {
    // Use the same endpoint as getOrders - backend determines based on user type
    const response = await apiClient.get<OrderListResponse>(
      `/orders?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Mark order as paid (COD payment collected)
   */
  async markOrderAsPaid(orderId: string): Promise<ApiResponse<{ order: Order }>> {
    const response = await apiClient.post<ApiResponse<{ order: Order }>>(`/orders/${orderId}/mark-paid`);
    return response.data;
  }

  /**
   * Mark sub-order as paid (COD payment collected by specific retailer)
   */
  async markSubOrderAsPaid(orderId: string, subOrderId: string): Promise<ApiResponse<{ order: Order }>> {
    const response = await apiClient.post<ApiResponse<{ order: Order }>>(
      `/orders/${orderId}/sub-orders/${subOrderId}/mark-paid`
    );
    return response.data;
  }

  /**
   * Download invoice for order
   */
  async downloadInvoice(orderId: string): Promise<Blob> {
    const response = await apiClient.get(`/orders/${orderId}/invoice`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export default new OrderService();
