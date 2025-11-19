/**
 * Notification Controller
 * Handles notification-related HTTP requests
 */

import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import { NotificationType } from '../models/Notification.model';

class NotificationController {
  /**
   * Get user's notifications
   * GET /api/notifications
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user._id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
      const type = req.query.type as NotificationType | undefined;
      const includeArchived = req.query.includeArchived === 'true';

      console.log('📋 getNotifications - userId:', userId, 'page:', page, 'limit:', limit, 'isRead:', isRead);

      const result = await notificationService.getUserNotifications(userId, {
        page,
        limit,
        isRead,
        type,
        includeArchived,
      });

      console.log('📋 getNotifications - Found', result.notifications.length, 'notifications, total:', result.pagination.total);

      res.status(200).json({
        success: true,
        data: {
          notifications: result.notifications,
          pagination: result.pagination,
        },
      });
    } catch (error: any) {
      console.error('❌ Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message,
      });
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user._id;
      console.log('🔔 getUnreadCount - userId:', userId);

      const count = await notificationService.getUnreadCount(userId);

      console.log('🔔 getUnreadCount - Unread count:', count);

      res.status(200).json({
        success: true,
        data: {
          count,
        },
      });
    } catch (error: any) {
      console.error('❌ Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch unread count',
        error: error.message,
      });
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:id/read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;

      const notification = await notificationService.markAsRead(id);

      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
        return;
      }

      // Verify ownership
      if (notification.userId.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: { notification },
      });
    } catch (error: any) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message,
      });
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/read-all
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user._id;

      await notificationService.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error: any) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message,
      });
    }
  }

  /**
   * Archive notification
   * PUT /api/notifications/:id/archive
   */
  async archiveNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;

      const notification = await notificationService.archiveNotification(id);

      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
        return;
      }

      // Verify ownership
      if (notification.userId.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification archived',
        data: { notification },
      });
    } catch (error: any) {
      console.error('Archive notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to archive notification',
        error: error.message,
      });
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;

      // First verify ownership
      const notification = await notificationService.getUserNotifications(userId, {
        page: 1,
        limit: 1,
      });

      const deleted = await notificationService.deleteNotification(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error: any) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message,
      });
    }
  }

  /**
   * Delete all notifications
   * DELETE /api/notifications/all
   */
  async deleteAllNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user._id;

      await notificationService.deleteAllNotifications(userId);

      res.status(200).json({
        success: true,
        message: 'All notifications deleted',
      });
    } catch (error: any) {
      console.error('Delete all notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete all notifications',
        error: error.message,
      });
    }
  }
}

export default new NotificationController();
