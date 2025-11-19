/**
 * Notification Model
 * Stores in-app notifications for users
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

export enum NotificationType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  PRODUCT = 'PRODUCT',
  REVIEW = 'REVIEW',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM',
  DELIVERY = 'DELIVERY',
  PRICE_ALERT = 'PRICE_ALERT',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  icon?: string;
  link?: string;
  metadata?: {
    orderId?: string;
    productId?: string;
    transactionId?: string;
    reviewId?: string;
    [key: string]: any;
  };
  isRead: boolean;
  readAt?: Date;
  isArchived: boolean;
  archivedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    icon: {
      type: String,
      default: '🔔',
    },
    link: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isArchived: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

// Index for automatic deletion of expired notifications
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
NotificationSchema.methods.markAsRead = function (): Promise<INotification> {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

NotificationSchema.methods.archive = function (): Promise<INotification> {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

// Static methods
NotificationSchema.statics.getUnreadCount = async function (
  userId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    userId,
    isRead: false,
    isArchived: false,
  });
};

NotificationSchema.statics.markAllAsRead = async function (
  userId: mongoose.Types.ObjectId
): Promise<any> {
  return this.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

NotificationSchema.statics.deleteOldNotifications = async function (
  daysOld: number = 30
): Promise<any> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isArchived: true,
  });
};

const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);

export default Notification;
