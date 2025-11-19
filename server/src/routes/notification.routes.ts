/**
 * Notification Routes
 * Handles notification-related endpoints
 */

import express from 'express';
import notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications with pagination and filters
 * @access  Private
 */
router.get('/', notificationController.getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/all
 * @desc    Delete all notifications
 * @access  Private
 */
router.delete('/all', notificationController.deleteAllNotifications);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark specific notification as read
 * @access  Private
 */
router.put('/:id/read', notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/:id/archive
 * @desc    Archive specific notification
 * @access  Private
 */
router.put('/:id/archive', notificationController.archiveNotification);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete specific notification
 * @access  Private
 */
router.delete('/:id', notificationController.deleteNotification);

export default router;
