/**
 * Notification Service
 * Handles creation and management of in-app notifications
 */

import mongoose from 'mongoose';
import Notification, {
  INotification,
  NotificationType,
  NotificationPriority,
} from '../models/Notification.model';
import { getIO } from './socket.service';
import emailService from './email.service';
import User from '../models/User.model';
import { logger } from '../utils/logger';

export interface CreateNotificationData {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  icon?: string;
  link?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

class NotificationService {
  /**
   * Helper: Format item names for notifications
   * - Single item: "Product Name"
   * - Two items: "Product A and Product B"
   * - Three+ items: "Product A, Product B and 2 more items"
   */
  private formatItemNames(items: Array<{ name: string; quantity: number }>): string {
    if (!items || items.length === 0) {
      return 'your items';
    }

    if (items.length === 1) {
      const item = items[0];
      return item.quantity > 1 ? `${item.name} (×${item.quantity})` : item.name;
    }

    if (items.length === 2) {
      const item1 = items[0];
      const item2 = items[1];
      const name1 = item1.quantity > 1 ? `${item1.name} (×${item1.quantity})` : item1.name;
      const name2 = item2.quantity > 1 ? `${item2.name} (×${item2.quantity})` : item2.name;
      return `${name1} and ${name2}`;
    }

    // 3+ items: show first item and count
    const firstItem = items[0];
    const firstName = firstItem.quantity > 1 ? `${firstItem.name} (×${firstItem.quantity})` : firstItem.name;
    const remainingCount = items.length - 1;
    return `${firstName} and ${remainingCount} more item${remainingCount > 1 ? 's' : ''}`;
  }

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData): Promise<INotification> {
    const notification = new Notification({
      userId: data.userId,
      type: data.type,
      priority: data.priority || NotificationPriority.MEDIUM,
      title: data.title,
      message: data.message,
      icon: data.icon,
      link: data.link,
      metadata: data.metadata,
      expiresAt: data.expiresAt,
    });

    await notification.save();

    // Emit real-time notification via Socket.IO
    this.emitNotification(notification);

    // Send email notification
    try {
      const user = await User.findById(data.userId).select('email');
      if (user && user.email) {
        await emailService.sendNotificationEmail(
          user.email,
          data.title,
          data.message,
          data.type,
          data.link
        );
      }
    } catch (error: any) {
      logger.error(`Failed to send notification email to user ${data.userId}:`, error.message);
      // Don't throw - email failure shouldn't break notification creation
    }

    return notification;
  }

  /**
   * Create multiple notifications (bulk)
   */
  async createBulkNotifications(
    notificationsData: CreateNotificationData[]
  ): Promise<INotification[]> {
    const notifications = await Notification.insertMany(notificationsData);

    // Emit real-time notifications and send emails
    for (const notification of notifications) {
      // Emit via Socket.IO
      this.emitNotification(notification);

      // Send email notification
      try {
        const user = await User.findById(notification.userId).select('email');
        if (user && user.email) {
          await emailService.sendNotificationEmail(
            user.email,
            notification.title,
            notification.message,
            notification.type,
            notification.link
          );
        }
      } catch (error: any) {
        logger.error(`Failed to send notification email to user ${notification.userId}:`, error.message);
        // Don't throw - email failure shouldn't break notification creation
      }
    }

    return notifications;
  }

  /**
   * Emit notification via Socket.IO
   */
  private emitNotification(notification: INotification): void {
    try {
      const io = getIO();
      if (io) {
        const userIdString = notification.userId.toString();
        io.to(`user:${userIdString}`).emit('notification', {
          id: notification._id,
          type: notification.type,
          priority: notification.priority,
          title: notification.title,
          message: notification.message,
          icon: notification.icon,
          link: notification.link,
          metadata: notification.metadata,
          createdAt: notification.createdAt,
        });
      }
    } catch (error) {
      console.error('Error emitting notification:', error);
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string | mongoose.Types.ObjectId,
    options: {
      page?: number;
      limit?: number;
      isRead?: boolean;
      type?: NotificationType;
      includeArchived?: boolean;
    } = {}
  ): Promise<{
    notifications: INotification[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { userId };

    if (options.isRead !== undefined) {
      query.isRead = options.isRead;
    }

    if (options.type) {
      query.type = options.type;
    }

    if (!options.includeArchived) {
      query.isArchived = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    return {
      notifications: notifications as INotification[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string | mongoose.Types.ObjectId): Promise<number> {
    return Notification.countDocuments({
      userId,
      isRead: false,
      isArchived: false,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<INotification | null> {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return null;
    }
    return notification.markAsRead();
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string | mongoose.Types.ObjectId): Promise<void> {
    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string): Promise<INotification | null> {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return null;
    }
    return notification.archive();
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    const result = await Notification.findByIdAndDelete(notificationId);
    return !!result;
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string | mongoose.Types.ObjectId): Promise<void> {
    await Notification.deleteMany({ userId });
  }

  // ===== Notification Templates =====

  /**
   * Order-related notifications
   */
  async notifyOrderCreated(
    userId: string | mongoose.Types.ObjectId,
    orderId: string,
    orderNumber: string,
    items?: Array<{ name: string; quantity: number }>
  ): Promise<INotification> {
    const itemsText = items ? this.formatItemNames(items) : 'your order';

    return this.createNotification({
      userId,
      type: NotificationType.ORDER,
      priority: NotificationPriority.HIGH,
      title: 'Order Placed Successfully',
      message: `Your order for ${itemsText} has been placed successfully.`,
      icon: '📦',
      link: `/customer/orders`,
      metadata: { orderId, orderNumber },
    });
  }

  async notifyOrderStatusUpdated(
    userId: string | mongoose.Types.ObjectId,
    orderId: string,
    orderNumber: string,
    status: string,
    items?: Array<{ name: string; quantity: number }>
  ): Promise<INotification> {
    const itemsText = items ? this.formatItemNames(items) : 'your order';

    const statusMessages: Record<string, { title: string; message: string; icon: string }> = {
      CONFIRMED: {
        title: 'Order Confirmed',
        message: `Your order for ${itemsText} has been confirmed by the retailer.`,
        icon: '✅',
      },
      PROCESSING: {
        title: 'Order Processing',
        message: `Your order for ${itemsText} is being prepared.`,
        icon: '⚙️',
      },
      SHIPPED: {
        title: 'Order Shipped',
        message: `Your order for ${itemsText} has been shipped.`,
        icon: '🚚',
      },
      DELIVERED: {
        title: 'Order Delivered',
        message: `Your order for ${itemsText} has been delivered. Enjoy!`,
        icon: '🎉',
      },
      CANCELLED: {
        title: 'Order Cancelled',
        message: `Your order for ${itemsText} has been cancelled.`,
        icon: '❌',
      },
    };

    const statusInfo =
      statusMessages[status] || statusMessages.CONFIRMED;

    return this.createNotification({
      userId,
      type: NotificationType.ORDER,
      priority: NotificationPriority.HIGH,
      title: statusInfo.title,
      message: statusInfo.message,
      icon: statusInfo.icon,
      link: `/customer/orders`,
      metadata: { orderId, orderNumber, status },
    });
  }

  async notifyOrderCancelled(
    userId: string | mongoose.Types.ObjectId,
    orderId: string,
    retailerId: string
  ): Promise<INotification> {
    return this.createNotification({
      userId,
      type: NotificationType.ORDER,
      priority: NotificationPriority.HIGH,
      title: 'Order Cancelled',
      message: `Order #${orderId} has been cancelled.`,
      icon: '❌',
      link: `/retailer/orders`,
      metadata: { orderId, retailerId },
    });
  }

  /**
   * Payment-related notifications
   */
  async notifyPaymentSuccess(
    userId: string | mongoose.Types.ObjectId,
    transactionId: string,
    amount: number,
    orderId: string
  ): Promise<INotification> {
    return this.createNotification({
      userId,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      title: 'Payment Successful',
      message: `Your payment of ₹${amount.toFixed(2)} was successful.`,
      icon: '💳',
      link: `/customer/transactions`,
      metadata: { transactionId, amount, orderId },
    });
  }

  async notifyPaymentFailed(
    userId: string | mongoose.Types.ObjectId,
    transactionId: string,
    amount: number,
    orderId: string
  ): Promise<INotification> {
    return this.createNotification({
      userId,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.URGENT,
      title: 'Payment Failed',
      message: `Your payment of ₹${amount.toFixed(2)} failed. Please try again.`,
      icon: '⚠️',
      link: `/customer/orders`,
      metadata: { transactionId, amount, orderId },
    });
  }

  /**
   * Review-related notifications
   */
  async notifyNewReview(
    retailerId: string | mongoose.Types.ObjectId,
    productName: string,
    rating: number,
    reviewId: string
  ): Promise<INotification> {
    return this.createNotification({
      userId: retailerId,
      type: NotificationType.REVIEW,
      priority: NotificationPriority.MEDIUM,
      title: 'New Review Received',
      message: `${productName} received a ${rating}-star review.`,
      icon: '⭐',
      link: `/retailer/reviews`,
      metadata: { productName, rating, reviewId },
    });
  }

  /**
   * Product-related notifications
   */
  async notifyLowStock(
    retailerId: string | mongoose.Types.ObjectId,
    productName: string,
    stockLevel: number,
    productId: string
  ): Promise<INotification> {
    return this.createNotification({
      userId: retailerId,
      type: NotificationType.PRODUCT,
      priority: NotificationPriority.HIGH,
      title: 'Low Stock Alert',
      message: `${productName} is running low (${stockLevel} units remaining).`,
      icon: '📉',
      link: `/retailer/inventory`,
      metadata: { productName, stockLevel, productId },
    });
  }

  /**
   * Retailer order notifications
   */
  async notifyNewOrderForRetailer(
    retailerId: string | mongoose.Types.ObjectId,
    orderId: string,
    subOrderId: string,
    customerName: string,
    totalAmount: number,
    items?: Array<{ name: string; quantity: number }>
  ): Promise<INotification> {
    const itemsText = items ? this.formatItemNames(items) : 'items';

    return this.createNotification({
      userId: retailerId,
      type: NotificationType.ORDER,
      priority: NotificationPriority.HIGH,
      title: 'New Order Received',
      message: `${customerName} ordered ${itemsText} for ₹${totalAmount.toFixed(2)}.`,
      icon: '🛒',
      link: `/retailer/orders`,
      metadata: { orderId, subOrderId, customerName, totalAmount },
    });
  }

  /**
   * Promotion notifications
   */
  async notifyPromotion(
    userId: string | mongoose.Types.ObjectId,
    title: string,
    message: string,
    link?: string
  ): Promise<INotification> {
    return this.createNotification({
      userId,
      type: NotificationType.PROMOTION,
      priority: NotificationPriority.LOW,
      title,
      message,
      icon: '🎁',
      link,
    });
  }

  /**
   * System notifications
   */
  async notifySystem(
    userId: string | mongoose.Types.ObjectId,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<INotification> {
    return this.createNotification({
      userId,
      type: NotificationType.SYSTEM,
      priority,
      title,
      message,
      icon: 'ℹ️',
    });
  }

  /**
   * B2B Order notifications (Retailer → Wholesaler)
   */
  async notifyB2BOrderCreated(
    retailerId: string | mongoose.Types.ObjectId,
    orderId: string,
    orderNumber: string,
    totalAmount: number
  ): Promise<INotification> {
    return this.createNotification({
      userId: retailerId,
      type: NotificationType.ORDER,
      priority: NotificationPriority.HIGH,
      title: 'B2B Order Placed',
      message: `Your bulk order #${orderNumber} for ₹${totalAmount.toFixed(2)} has been placed successfully.`,
      icon: '📦',
      link: `/retailer/b2b-orders`,
      metadata: { orderId, orderNumber, totalAmount, orderType: 'B2B' },
    });
  }

  async notifyNewB2BOrder(
    wholesalerId: string | mongoose.Types.ObjectId,
    orderId: string,
    orderNumber: string,
    totalAmount: number
  ): Promise<INotification> {
    return this.createNotification({
      userId: wholesalerId,
      type: NotificationType.ORDER,
      priority: NotificationPriority.HIGH,
      title: 'New Bulk Order Received',
      message: `New bulk order #${orderNumber} for ₹${totalAmount.toFixed(2)} from a retailer.`,
      icon: '🛒',
      link: `/wholesaler/bulk-orders`,
      metadata: { orderId, orderNumber, totalAmount, orderType: 'B2B' },
    });
  }

  async notifyB2BOrderConfirmed(
    retailerId: string | mongoose.Types.ObjectId,
    orderId: string,
    orderNumber: string
  ): Promise<INotification> {
    return this.createNotification({
      userId: retailerId,
      type: NotificationType.ORDER,
      priority: NotificationPriority.HIGH,
      title: 'B2B Order Confirmed',
      message: `Your bulk order #${orderNumber} has been confirmed by the wholesaler.`,
      icon: '✅',
      link: `/retailer/b2b-orders`,
      metadata: { orderId, orderNumber, orderType: 'B2B' },
    });
  }

  async notifyB2BOrderStatusUpdate(
    retailerId: string | mongoose.Types.ObjectId,
    orderId: string,
    orderNumber: string,
    status: string
  ): Promise<INotification> {
    const statusMessages: Record<string, { title: string; message: string; icon: string }> = {
      PROCESSING: {
        title: 'Order Processing',
        message: `Your bulk order #${orderNumber} is being processed.`,
        icon: '⚙️',
      },
      SHIPPED: {
        title: 'Order Shipped',
        message: `Your bulk order #${orderNumber} has been shipped.`,
        icon: '🚚',
      },
      DELIVERED: {
        title: 'Order Delivered',
        message: `Your bulk order #${orderNumber} has been delivered.`,
        icon: '🎉',
      },
      CANCELLED: {
        title: 'Order Cancelled',
        message: `Your bulk order #${orderNumber} has been cancelled.`,
        icon: '❌',
      },
    };

    const statusInfo = statusMessages[status] || {
      title: 'Order Status Updated',
      message: `Your bulk order #${orderNumber} status: ${status}`,
      icon: '📦',
    };

    return this.createNotification({
      userId: retailerId,
      type: NotificationType.ORDER,
      priority: NotificationPriority.HIGH,
      title: statusInfo.title,
      message: statusInfo.message,
      icon: statusInfo.icon,
      link: `/retailer/b2b-orders`,
      metadata: { orderId, orderNumber, status, orderType: 'B2B' },
    });
  }

  async notifyB2BOrderCompleted(
    retailerId: string | mongoose.Types.ObjectId,
    orderId: string,
    orderNumber: string
  ): Promise<INotification> {
    return this.createNotification({
      userId: retailerId,
      type: NotificationType.ORDER,
      priority: NotificationPriority.HIGH,
      title: 'Inventory Received',
      message: `Bulk order #${orderNumber} completed! Inventory has been added to your store.`,
      icon: '✅',
      link: `/retailer/inventory`,
      metadata: { orderId, orderNumber, orderType: 'B2B' },
    });
  }

  async notifyB2BOrderCancelled(
    wholesalerId: string | mongoose.Types.ObjectId,
    orderId: string,
    orderNumber: string
  ): Promise<INotification> {
    return this.createNotification({
      userId: wholesalerId,
      type: NotificationType.ORDER,
      priority: NotificationPriority.MEDIUM,
      title: 'B2B Order Cancelled',
      message: `Bulk order #${orderNumber} has been cancelled by the retailer.`,
      icon: '❌',
      link: `/wholesaler/bulk-orders`,
      metadata: { orderId, orderNumber, orderType: 'B2B' },
    });
  }

  async notifyB2BPaymentSent(
    wholesalerId: string | mongoose.Types.ObjectId,
    orderId: string,
    orderNumber: string,
    amount: number,
    paymentMethod?: string,
    transactionReference?: string,
    notes?: string
  ): Promise<INotification> {
    let message = `Retailer has sent payment of ₹${amount.toLocaleString()} for order #${orderNumber}.`;

    const details: string[] = [];
    if (paymentMethod) details.push(`Method: ${paymentMethod}`);
    if (transactionReference) details.push(`Ref: ${transactionReference}`);
    if (notes) details.push(`Note: ${notes}`);

    if (details.length > 0) {
      message += ` ${details.join(' | ')}`;
    }

    message += ' Please verify and mark as paid.';

    return this.createNotification({
      userId: wholesalerId,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      title: '💸 Payment Sent - Action Required',
      message,
      icon: '💰',
      link: `/wholesaler/b2b-orders/${orderId}`,
      metadata: {
        orderId,
        orderNumber,
        orderType: 'B2B',
        amount,
        paymentMethod,
        transactionReference,
        notes
      },
    });
  }
}

export default new NotificationService();
