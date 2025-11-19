import Product from '../models/Product.model';
import PriceHistory, { IPriceHistory } from '../models/PriceHistory.model';
import Wishlist from '../models/Wishlist.model';
import User from '../models/User.model';
import notificationService from './notification.service';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

interface PriceChange {
  productId: string;
  retailerId: string;
  oldPrice: number;
  newPrice: number;
  discount?: number;
  reason: string;
}

class PriceMonitoringService {
  /**
   * Main monitoring job - runs periodically (e.g., every hour)
   */
  async monitorAllPrices(): Promise<void> {
    try {
      logger.info('🔍 Starting price monitoring job...');

      // Get all products that are in someone's wishlist (don't populate)
      const wishlists = await Wishlist.find();
      const uniqueProductIds = new Set<string>();

      wishlists.forEach(wishlist => {
        wishlist.items.forEach(item => {
          if (item.productId) {
            // item.productId is already an ObjectId, convert to string
            uniqueProductIds.add(item.productId.toString());
          }
        });
      });

      logger.info(`📦 Monitoring ${uniqueProductIds.size} products in wishlists`);

      // Check each product for price changes
      let changesDetected = 0;
      for (const productId of uniqueProductIds) {
        try {
          const changed = await this.checkProductPrice(productId);
          if (changed) changesDetected++;
        } catch (error: any) {
          logger.error(`❌ Error checking price for product ${productId}:`, error.message);
        }
      }

      logger.info(`✅ Price monitoring complete. ${changesDetected} changes detected.`);
    } catch (error: any) {
      logger.error('❌ Price monitoring failed:', error);
      throw error;
    }
  }

  /**
   * Check a single product for price changes
   */
  async checkProductPrice(productId: string): Promise<boolean> {
    try {
      const product = await Product.findById(productId);
      if (!product) return false;

      // Get price history
      let priceHistory = await PriceHistory.findOne({
        productId: product._id,
        retailerId: product.createdBy,
      });

      const currentPrice = this.calculateCurrentPrice(product);

      // First time tracking this product
      if (!priceHistory) {
        priceHistory = new PriceHistory({
          productId: product._id,
          retailerId: product.createdBy,
          currentPrice,
          lowestPrice: currentPrice,
          highestPrice: currentPrice,
          averagePrice: currentPrice,
          history: [{
            price: currentPrice,
            discount: product.discount,
            timestamp: new Date(),
            reason: 'REGULAR_UPDATE',
          }],
        });
        await priceHistory.save();
        return false;
      }

      // Price hasn't changed
      if (Math.abs(priceHistory.currentPrice - currentPrice) < 0.01) {
        priceHistory.lastCheckedAt = new Date();
        await priceHistory.save();
        return false;
      }

      // Price changed - record it
      const priceChange: PriceChange = {
        productId: product._id.toString(),
        retailerId: product.createdBy.toString(),
        oldPrice: priceHistory.currentPrice,
        newPrice: currentPrice,
        discount: product.discount,
        reason: this.determinePriceChangeReason(priceHistory.currentPrice, currentPrice, product.discount),
      };

      await this.recordPriceChange(priceHistory, priceChange);
      await this.notifyAffectedCustomers(product, priceChange);

      return true;
    } catch (error: any) {
      logger.error(`❌ Error checking price for product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Calculate current effective price (after discounts)
   */
  private calculateCurrentPrice(product: any): number {
    const basePrice = product.basePrice || product.pricing?.basePrice || product.price || 0;
    const discount = product.discount || 0;
    return basePrice * (1 - discount / 100);
  }

  /**
   * Determine reason for price change
   */
  private determinePriceChangeReason(oldPrice: number, newPrice: number, discount?: number): string {
    if (discount && discount > 0 && newPrice < oldPrice) {
      return 'DISCOUNT_APPLIED';
    } else if (!discount && newPrice > oldPrice) {
      return 'DISCOUNT_REMOVED';
    } else {
      return 'PRICE_CHANGE';
    }
  }

  /**
   * Record price change in history
   */
  private async recordPriceChange(priceHistory: IPriceHistory, change: PriceChange): Promise<void> {
    // Add to history
    priceHistory.history.push({
      price: change.newPrice,
      discount: change.discount,
      timestamp: new Date(),
      reason: change.reason as any,
    });

    // Update stats
    priceHistory.currentPrice = change.newPrice;
    priceHistory.lowestPrice = Math.min(priceHistory.lowestPrice, change.newPrice);
    priceHistory.highestPrice = Math.max(priceHistory.highestPrice, change.newPrice);
    priceHistory.averagePrice = this.calculateAveragePrice(priceHistory.history);
    priceHistory.lastCheckedAt = new Date();

    // Prune old history (keep only 90 days)
    priceHistory.pruneOldHistory();

    await priceHistory.save();

    logger.info(`💰 Price changed: ₹${change.oldPrice.toFixed(2)} → ₹${change.newPrice.toFixed(2)} (${change.reason})`);
  }

  /**
   * Calculate average price from history
   */
  private calculateAveragePrice(history: any[]): number {
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, entry) => acc + entry.price, 0);
    return sum / history.length;
  }

  /**
   * Notify customers who have this product in wishlist
   */
  private async notifyAffectedCustomers(product: any, change: PriceChange): Promise<void> {
    try {
      // Find all wishlists containing this product
      const wishlists = await Wishlist.find({
        'items.productId': product._id,
      }).populate('customerId');

      logger.info(`📧 Notifying ${wishlists.length} customers about price change`);

      for (const wishlist of wishlists) {
        const wishlistItem = wishlist.items.find(
          (item: any) => item.productId.toString() === product._id.toString()
        );

        if (!wishlistItem || !wishlistItem.priceAlertEnabled) {
          logger.info(`⏭️  Skipping wishlist ${wishlist._id}: alerts disabled or item not found`);
          continue; // Skip if alerts disabled
        }

        // Get user preferences
        const user = await User.findById(wishlist.customerId);
        if (!user) {
          logger.info(`⏭️  Skipping wishlist ${wishlist._id}: user not found`);
          continue;
        }

        // Use defaults if prefs not set
        const prefs = user.notificationPreferences?.priceAlerts || {
          enabled: true,
          emailEnabled: false,
          inAppEnabled: true,
          minimumDiscountPercent: 5,
          maxAlertsPerDay: 10,
        };

        if (!prefs.enabled || !prefs.inAppEnabled) {
          logger.info(`⏭️  Skipping user ${user.email}: price alerts disabled in preferences`);
          continue; // Skip if price alerts disabled
        }

        // Determine if we should notify
        const shouldNotify = this.shouldNotifyCustomer(
          wishlistItem,
          change,
          prefs.minimumDiscountPercent
        );

        logger.info(`🔍 Should notify ${user.email}? ${shouldNotify} (drop: ${((change.oldPrice - change.newPrice) / change.oldPrice * 100).toFixed(1)}%, min: ${prefs.minimumDiscountPercent}%)`);

        if (shouldNotify) {
          await this.sendPriceAlertNotification(user._id, product, change, wishlistItem);

          // Update last notified price
          wishlistItem.lastNotifiedPrice = change.newPrice;
          await wishlist.save();
        }
      }
    } catch (error: any) {
      logger.error('❌ Error notifying customers:', error);
    }
  }

  /**
   * Determine if customer should be notified
   */
  private shouldNotifyCustomer(
    wishlistItem: any,
    change: PriceChange,
    minimumDiscountPercent: number
  ): boolean {
    const priceDropPercent = ((change.oldPrice - change.newPrice) / change.oldPrice) * 100;

    // Price increased - don't notify
    if (change.newPrice >= change.oldPrice) {
      return false;
    }

    // Already notified at this price or lower
    if (wishlistItem.lastNotifiedPrice && change.newPrice >= wishlistItem.lastNotifiedPrice) {
      return false;
    }

    // Check target price
    if (wishlistItem.notifyOnTargetPrice && wishlistItem.targetPrice) {
      if (change.newPrice <= wishlistItem.targetPrice) {
        return true; // Hit target price!
      }
    }

    // Check discount threshold
    if (wishlistItem.notifyOnDiscount) {
      if (priceDropPercent >= minimumDiscountPercent) {
        return true; // Discount meets minimum
      }
    }

    return false;
  }

  /**
   * Send price alert notification
   */
  private async sendPriceAlertNotification(
    userId: mongoose.Types.ObjectId,
    product: any,
    change: PriceChange,
    wishlistItem: any
  ): Promise<void> {
    const priceDropPercent = Math.round(((change.oldPrice - change.newPrice) / change.oldPrice) * 100);
    const savings = change.oldPrice - change.newPrice;

    let message = '';
    let title = '';

    if (wishlistItem.targetPrice && change.newPrice <= wishlistItem.targetPrice) {
      // Hit target price
      title = '🎯 Target Price Reached!';
      message = `${product.name} is now ₹${change.newPrice.toFixed(2)} - your target price! Was ₹${change.oldPrice.toFixed(2)}.`;
    } else {
      // Regular price drop
      title = `💰 Price Drop: ${priceDropPercent}% Off`;
      message = `${product.name} dropped from ₹${change.oldPrice.toFixed(2)} to ₹${change.newPrice.toFixed(2)}. Save ₹${savings.toFixed(2)}!`;
    }

    await notificationService.createNotification({
      userId,
      type: 'PRICE_ALERT' as any,
      priority: 'MEDIUM',
      title,
      message,
      icon: '💰',
      link: `/products/${product._id}`,
      metadata: {
        productId: product._id,
        oldPrice: change.oldPrice,
        newPrice: change.newPrice,
        priceDropPercent,
        savings,
      },
    });

    logger.info(`✅ Price alert sent to user ${userId} for product ${product.name}`);
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(productId: string, days: number = 30): Promise<any> {
    const priceHistory = await PriceHistory.findOne({ productId });

    if (!priceHistory) {
      return null;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentHistory = priceHistory.history.filter(
      (entry: any) => entry.timestamp > cutoffDate
    );

    return {
      currentPrice: priceHistory.currentPrice,
      lowestPrice: priceHistory.lowestPrice,
      highestPrice: priceHistory.highestPrice,
      averagePrice: priceHistory.averagePrice,
      history: recentHistory,
    };
  }
}

export default new PriceMonitoringService();
