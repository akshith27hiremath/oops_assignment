/**
 * Notification Bell Component
 * Displays notification icon with unread count badge
 */

import React, { useState, useEffect } from 'react';
import notificationService from '../../services/notification.service';

interface NotificationBellProps {
  onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    loadUnreadCount();

    // Listen for new notifications
    const handleNewNotification = () => {
      setUnreadCount((prev) => prev + 1);
      triggerAnimation();
    };

    notificationService.on('new-notification', handleNewNotification);

    return () => {
      notificationService.off('new-notification', handleNewNotification);
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      console.log('🔔 NotificationBell: Loading unread count...');
      const response = await notificationService.getUnreadCount();
      console.log('🔔 NotificationBell: Response:', response);
      if (response.success) {
        setUnreadCount(response.data.count);
        console.log('🔔 NotificationBell: Unread count set to:', response.data.count);
      }
    } catch (error) {
      console.error('❌ NotificationBell: Failed to load unread count:', error);
    }
  };

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        console.log('🔔 NotificationBell button clicked!');
        onClick();
      }}
      className={`relative p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all cursor-pointer ${
        isAnimating ? 'animate-bounce' : ''
      }`}
      aria-label="Notifications"
      style={{ pointerEvents: 'auto' }}
    >
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px] h-5 z-10">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* Pulse Animation for New Notifications */}
      {unreadCount > 0 && isAnimating && (
        <span className="absolute top-0 right-0 inline-flex h-3 w-3 transform translate-x-1/2 -translate-y-1/2 z-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
