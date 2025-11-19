/**
 * Notification Service
 * Handles notification-related API calls and Socket.IO connection
 */

import apiClient from './api';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  _id: string;
  userId: string;
  type: 'ORDER' | 'PAYMENT' | 'PRODUCT' | 'REVIEW' | 'PROMOTION' | 'SYSTEM' | 'DELIVERY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  icon?: string;
  link?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

class NotificationService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Initialize Socket.IO connection
   */
  initializeSocket(token: string): void {
    console.log('🔌 NotificationService: initializeSocket called');

    if (this.socket?.connected) {
      console.log('⚠️ NotificationService: Socket already connected, skipping');
      return;
    }

    // Socket.IO connects to base URL, not /api endpoint
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    console.log('🔌 NotificationService: Connecting to', baseUrl);

    this.socket = io(baseUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });

    this.socket.on('notification', (notification: Notification) => {
      console.log('🔔 New real-time notification received:', notification);
      this.emit('new-notification', notification);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    this.socket.on('error', (error: any) => {
      console.error('❌ Socket.IO error:', error);
    });

    console.log('🔌 NotificationService: Socket.IO initialization complete');
  }

  /**
   * Disconnect Socket.IO
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event)!.forEach((callback) => callback(data));
  }

  /**
   * Get notifications with pagination
   */
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: string;
    includeArchived?: boolean;
  }): Promise<ApiResponse<{
    notifications: Notification[];
    pagination: NotificationPagination;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.includeArchived) queryParams.append('includeArchived', 'true');

    const response = await apiClient.get<ApiResponse<{
      notifications: Notification[];
      pagination: NotificationPagination;
    }>>(`/notifications?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return response.data;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResponse<{ notification: Notification }>> {
    const response = await apiClient.put<ApiResponse<{ notification: Notification }>>(
      `/notifications/${notificationId}/read`
    );
    return response.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<ApiResponse<{}>> {
    const response = await apiClient.put<ApiResponse<{}>>('/notifications/read-all');
    return response.data;
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string): Promise<ApiResponse<{ notification: Notification }>> {
    const response = await apiClient.put<ApiResponse<{ notification: Notification }>>(
      `/notifications/${notificationId}/archive`
    );
    return response.data;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<ApiResponse<{}>> {
    const response = await apiClient.delete<ApiResponse<{}>>(`/notifications/${notificationId}`);
    return response.data;
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(): Promise<ApiResponse<{}>> {
    const response = await apiClient.delete<ApiResponse<{}>>('/notifications/all');
    return response.data;
  }

  /**
   * Get icon for notification type
   */
  getIconForType(type: string): string {
    const icons: Record<string, string> = {
      ORDER: '📦',
      PAYMENT: '💳',
      PRODUCT: '🛒',
      REVIEW: '⭐',
      PROMOTION: '🎁',
      SYSTEM: 'ℹ️',
      DELIVERY: '🚚',
    };
    return icons[type] || '🔔';
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      LOW: 'text-gray-600',
      MEDIUM: 'text-blue-600',
      HIGH: 'text-orange-600',
      URGENT: 'text-red-600',
    };
    return colors[priority] || 'text-gray-600';
  }

  /**
   * Format time ago
   */
  formatTimeAgo(date: string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const seconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return notificationDate.toLocaleDateString();
  }
}

export default new NotificationService();
