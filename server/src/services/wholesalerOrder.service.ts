/**
 * WholesalerOrder Service
 * Business logic for B2B orders between retailers and wholesalers
 */

import mongoose from 'mongoose';
import WholesalerOrder, { IWholesalerOrder, IWholesalerOrderItem, WholesalerOrderStatus, B2BPaymentStatus } from '../models/WholesalerOrder.model';
import Product, { ProductType } from '../models/Product.model';
import Inventory from '../models/Inventory.model';
import User from '../models/User.model';
import Wholesaler from '../models/Wholesaler.model';
import notificationService from './notification.service';
import logger from '../utils/logger';

interface CreateB2BOrderData {
  retailerId: string | mongoose.Types.ObjectId;
  wholesalerId: string | mongoose.Types.ObjectId;
  items: {
    productId: string | mongoose.Types.ObjectId;
    quantity: number;
  }[];
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  notes?: string;
}

class WholesalerOrderService {
  /**
   * Create a new B2B order from retailer to wholesaler
   */
  async createB2BOrder(data: CreateB2BOrderData): Promise<IWholesalerOrder> {
    try {
      logger.info(`📦 Creating B2B order: retailer=${data.retailerId}, wholesaler=${data.wholesalerId}`);

      // Validate retailer and wholesaler exist
      const retailer = await User.findById(data.retailerId);
      if (!retailer || retailer.userType !== 'RETAILER') {
        throw new Error('Invalid retailer');
      }

      const wholesaler = await Wholesaler.findById(data.wholesalerId);
      if (!wholesaler || wholesaler.userType !== 'WHOLESALER') {
        throw new Error('Invalid wholesaler');
      }

      // Process order items
      const orderItems: IWholesalerOrderItem[] = [];
      let totalAmount = 0;

      for (const item of data.items) {
        // Get product details
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        // Validate it's a wholesale product
        if (product.productType !== ProductType.WHOLESALE) {
          throw new Error(`Product ${product.name} is not available for wholesale`);
        }

        // Check minimum order quantity
        if (product.minimumOrderQuantity && item.quantity < product.minimumOrderQuantity) {
          throw new Error(
            `Minimum order quantity for ${product.name} is ${product.minimumOrderQuantity} ${product.unit}`
          );
        }

        // Get wholesaler's inventory
        const inventory = await Inventory.findOne({
          productId: item.productId,
          ownerId: data.wholesalerId,
        });

        if (!inventory) {
          throw new Error(`Product ${product.name} not available from this wholesaler`);
        }

        if (!inventory.availability) {
          throw new Error(`Product ${product.name} is currently unavailable`);
        }

        // Check stock availability
        const availableStock = inventory.currentStock - inventory.reservedStock;
        if (availableStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${availableStock} ${product.unit}`
          );
        }

        // Calculate volume discount
        const volumeDiscount = wholesaler.calculateDiscount(item.quantity);

        // Calculate pricing
        const unitPrice = inventory.sellingPrice;
        const discountAmount = (unitPrice * volumeDiscount) / 100;
        const finalUnitPrice = unitPrice - discountAmount;
        const subtotal = finalUnitPrice * item.quantity;

        // Reserve inventory
        inventory.reservedStock += item.quantity;
        await inventory.save();

        logger.info(
          `📦 Item added: ${product.name} x${item.quantity}, price=${unitPrice}, discount=${volumeDiscount}%, subtotal=${subtotal}`
        );

        orderItems.push({
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          unitPrice,
          volumeDiscount,
          subtotal,
        });

        totalAmount += subtotal;
      }

      // Check minimum order value
      if (wholesaler.minimumOrderValue && totalAmount < wholesaler.minimumOrderValue) {
        throw new Error(
          `Minimum order value is ₹${wholesaler.minimumOrderValue}. Current total: ₹${totalAmount}`
        );
      }

      // Create order
      const order = new WholesalerOrder({
        retailerId: data.retailerId,
        wholesalerId: data.wholesalerId,
        items: orderItems,
        totalAmount,
        deliveryAddress: {
          ...data.deliveryAddress,
          country: data.deliveryAddress.country || 'India',
        },
        notes: data.notes,
        status: WholesalerOrderStatus.PENDING,
        paymentStatus: B2BPaymentStatus.PENDING,
      });

      await order.save();

      logger.info(`✅ B2B order created: ${order.orderNumber}, total=₹${totalAmount}`);

      // Send notifications (async, don't wait)
      this.sendOrderCreatedNotifications(order).catch(err =>
        logger.error('Failed to send notifications:', err)
      );

      return order;
    } catch (error) {
      logger.error('❌ Failed to create B2B order:', error);
      throw error;
    }
  }

  /**
   * Get orders for a retailer
   */
  async getRetailerOrders(
    retailerId: string | mongoose.Types.ObjectId,
    status?: WholesalerOrderStatus,
    page: number = 1,
    limit: number = 20
  ) {
    const query: any = { retailerId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      WholesalerOrder.find(query)
        .populate('wholesalerId', 'profile.name businessName')
        .populate('items.productId', 'name images unit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WholesalerOrder.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get orders for a wholesaler
   */
  async getWholesalerOrders(
    wholesalerId: string | mongoose.Types.ObjectId,
    status?: WholesalerOrderStatus,
    page: number = 1,
    limit: number = 20
  ) {
    const query: any = { wholesalerId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      WholesalerOrder.find(query)
        .populate('retailerId', 'profile.name store.name store.address')
        .populate('items.productId', 'name images unit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WholesalerOrder.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get order details by ID
   */
  async getOrderById(orderId: string | mongoose.Types.ObjectId): Promise<IWholesalerOrder | null> {
    return WholesalerOrder.findById(orderId)
      .populate('retailerId', 'profile.name profile.phone store')
      .populate('wholesalerId', 'profile.name businessName profile.phone')
      .populate('items.productId', 'name images unit category');
  }

  /**
   * Confirm order (wholesaler accepts)
   */
  async confirmOrder(
    orderId: string | mongoose.Types.ObjectId,
    wholesalerId: string | mongoose.Types.ObjectId
  ): Promise<IWholesalerOrder> {
    const order = await WholesalerOrder.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.wholesalerId.toString() !== wholesalerId.toString()) {
      throw new Error('Unauthorized: Not your order');
    }

    await order.confirm();

    logger.info(`✅ B2B order confirmed: ${order.orderNumber}`);

    // Notify retailer
    notificationService.notifyB2BOrderConfirmed(
      order.retailerId,
      order._id.toString(),
      order.orderNumber
    ).catch(err => logger.error('Failed to send notification:', err));

    return order;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string | mongoose.Types.ObjectId,
    newStatus: WholesalerOrderStatus,
    wholesalerId: string | mongoose.Types.ObjectId,
    notes?: string
  ): Promise<IWholesalerOrder> {
    const order = await WholesalerOrder.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.wholesalerId.toString() !== wholesalerId.toString()) {
      throw new Error('Unauthorized: Not your order');
    }

    await order.updateStatus(newStatus, notes, wholesalerId as mongoose.Types.ObjectId);

    logger.info(`📦 B2B order ${order.orderNumber} status updated to ${newStatus}`);

    // If delivered, automatically complete and transfer inventory
    if (newStatus === WholesalerOrderStatus.DELIVERED) {
      await this.completeOrder(orderId);
    }

    // Notify retailer of status change
    notificationService.notifyB2BOrderStatusUpdate(
      order.retailerId,
      order._id.toString(),
      order.orderNumber,
      newStatus
    ).catch(err => logger.error('Failed to send notification:', err));

    return order;
  }

  /**
   * Complete order and transfer inventory to retailer
   */
  async completeOrder(orderId: string | mongoose.Types.ObjectId): Promise<IWholesalerOrder> {
    try {
      const order = await WholesalerOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== WholesalerOrderStatus.DELIVERED) {
        throw new Error('Can only complete delivered orders');
      }

      // Transfer inventory for each item
      for (const item of order.items) {
        // Reduce wholesaler inventory
        const wholesalerInventory = await Inventory.findOne({
          productId: item.productId,
          ownerId: order.wholesalerId,
        });

        if (wholesalerInventory) {
          wholesalerInventory.currentStock -= item.quantity;
          wholesalerInventory.reservedStock -= item.quantity;
          await wholesalerInventory.save();
        }

        // Create or update retailer inventory
        const retailerInventory = await Inventory.findOne({
          productId: item.productId,
          ownerId: order.retailerId,
        });

        if (retailerInventory) {
          // Update existing inventory
          retailerInventory.currentStock += item.quantity;
          // Update B2B tracking fields
          retailerInventory.sourceType = 'B2B_ORDER';
          retailerInventory.sourceOrderId = order._id;
          retailerInventory.wholesalerId = order.wholesalerId;
          retailerInventory.wholesalePricePaid = item.unitPrice;
          await retailerInventory.save();

          logger.info(
            `📦 Updated retailer inventory: ${item.name} +${item.quantity}, new stock=${retailerInventory.currentStock}, source=B2B`
          );
        } else {
          // Create new inventory entry for retailer
          const newInventory = new Inventory({
            productId: item.productId,
            ownerId: order.retailerId,
            currentStock: item.quantity,
            reservedStock: 0,
            reorderLevel: 10,
            sellingPrice: item.unitPrice, // Initial price = wholesale price paid
            availability: true,
            // B2B tracking
            sourceType: 'B2B_ORDER',
            sourceOrderId: order._id,
            wholesalerId: order.wholesalerId,
            wholesalePricePaid: item.unitPrice,
          });

          await newInventory.save();

          logger.info(
            `📦 Created retailer inventory: ${item.name} x${item.quantity}, price=${item.unitPrice}, source=B2B`
          );
        }
      }

      // Mark order as completed
      await order.complete();

      logger.info(`✅ B2B order completed: ${order.orderNumber}, inventory transferred`);

      // Notify retailer
      notificationService.notifyB2BOrderCompleted(
        order.retailerId,
        order._id.toString(),
        order.orderNumber
      ).catch(err => logger.error('Failed to send notification:', err));

      return order;
    } catch (error) {
      logger.error('❌ Failed to complete order:', error);
      throw error;
    }
  }

  /**
   * Cancel order (retailer cancels before confirmation)
   */
  async cancelOrder(
    orderId: string | mongoose.Types.ObjectId,
    retailerId: string | mongoose.Types.ObjectId,
    reason?: string
  ): Promise<IWholesalerOrder> {
    try {
      const order = await WholesalerOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.retailerId.toString() !== retailerId.toString()) {
        throw new Error('Unauthorized: Not your order');
      }

      // Release reserved inventory
      for (const item of order.items) {
        const inventory = await Inventory.findOne({
          productId: item.productId,
          ownerId: order.wholesalerId,
        });

        if (inventory) {
          inventory.reservedStock -= item.quantity;
          await inventory.save();
        }
      }

      await order.cancel(reason);

      logger.info(`❌ B2B order cancelled: ${order.orderNumber}`);

      // Notify wholesaler
      notificationService.notifyB2BOrderCancelled(
        order.wholesalerId,
        order._id.toString(),
        order.orderNumber
      ).catch(err => logger.error('Failed to send notification:', err));

      return order;
    } catch (error) {
      logger.error('❌ Failed to cancel order:', error);
      throw error;
    }
  }

  /**
   * Mark order as paid (wholesaler confirms payment received)
   */
  async markOrderAsPaid(
    orderId: string,
    wholesalerId: mongoose.Types.ObjectId
  ): Promise<IWholesalerOrder> {
    try {
      logger.info(`💰 Marking B2B order ${orderId} as paid by wholesaler ${wholesalerId}`);

      const order = await WholesalerOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Verify wholesaler owns this order
      if (order.wholesalerId.toString() !== wholesalerId.toString()) {
        throw new Error('You can only mark your own orders as paid');
      }

      // Mark as paid
      await order.markAsPaid();

      // Send notification to retailer
      await notificationService.notifyB2BOrderStatusUpdate(
        order.retailerId,
        order._id.toString(),
        order.orderNumber,
        'PAYMENT_RECEIVED'
      );

      logger.info(`✅ Order ${order.orderNumber} marked as paid`);

      return order;
    } catch (error: any) {
      logger.error(`❌ Mark order as paid error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notify wholesaler that payment has been sent (retailer notifies)
   */
  async notifyPaymentSent(
    orderId: string,
    retailerId: mongoose.Types.ObjectId,
    paymentMethod?: string,
    transactionReference?: string,
    notes?: string
  ): Promise<IWholesalerOrder> {
    try {
      logger.info(`📤 Retailer ${retailerId} notifying payment sent for order ${orderId}`);

      const order = await WholesalerOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Verify retailer owns this order
      if (order.retailerId.toString() !== retailerId.toString()) {
        throw new Error('You can only notify payment for your own orders');
      }

      // Can't notify if already paid
      if (order.paymentStatus === B2BPaymentStatus.COMPLETED) {
        throw new Error('Order is already marked as paid');
      }

      // Build notification message
      let notificationMessage = `Payment sent for order ${order.orderNumber}`;
      const details: string[] = [];

      if (paymentMethod) details.push(`Method: ${paymentMethod}`);
      if (transactionReference) details.push(`Ref: ${transactionReference}`);
      if (notes) details.push(`Note: ${notes}`);

      if (details.length > 0) {
        notificationMessage += ` - ${details.join(', ')}`;
      }

      // Send notification to wholesaler
      await notificationService.notifyB2BPaymentSent(
        order.wholesalerId,
        order._id.toString(),
        order.orderNumber,
        order.totalAmount,
        paymentMethod,
        transactionReference,
        notes
      );

      logger.info(`✅ Payment notification sent to wholesaler for order ${order.orderNumber}`);

      return order;
    } catch (error: any) {
      logger.error(`❌ Notify payment sent error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get wholesaler statistics
   */
  async getWholesalerStats(wholesalerId: string | mongoose.Types.ObjectId) {
    const [activeOrders, totalRevenue, totalOrders] = await Promise.all([
      WholesalerOrder.countDocuments({
        wholesalerId,
        status: {
          $in: [
            WholesalerOrderStatus.PENDING,
            WholesalerOrderStatus.CONFIRMED,
            WholesalerOrderStatus.PROCESSING,
            WholesalerOrderStatus.SHIPPED,
          ],
        },
      }),
      WholesalerOrder.getTotalRevenue(wholesalerId as mongoose.Types.ObjectId),
      WholesalerOrder.countDocuments({ wholesalerId }),
    ]);

    return {
      activeOrders,
      totalRevenue: totalRevenue.totalRevenue || 0,
      totalOrders,
    };
  }

  /**
   * Get retailer network with aggregated stats
   */
  async getRetailerNetwork(wholesalerId: string | mongoose.Types.ObjectId) {
    try {
      logger.info(`📊 Fetching retailer network for wholesaler: ${wholesalerId}`);

      // Aggregate retailer stats from orders
      const retailerStats = await WholesalerOrder.aggregate([
        {
          $match: {
            wholesalerId: new mongoose.Types.ObjectId(wholesalerId as string),
          },
        },
        {
          $group: {
            _id: '$retailerId',
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            lastOrderDate: { $max: '$createdAt' },
            statuses: { $push: '$status' },
          },
        },
      ]);

      // Get unique retailer IDs
      const retailerIds = retailerStats.map(stat => stat._id);

      // Fetch full retailer details
      const retailers = await User.find({
        _id: { $in: retailerIds },
        userType: 'RETAILER',
      }).select('email profile businessName store isActive createdAt');

      // Merge stats with retailer details
      const retailerNetwork = retailers.map(retailer => {
        const stats = retailerStats.find(s => s._id.toString() === retailer._id.toString());
        const retailerDoc = retailer as any;

        // Get business name from businessName field or store name or profile name
        const businessName = retailerDoc.businessName ||
                            retailerDoc.store?.name ||
                            retailerDoc.profile?.name ||
                            'N/A';

        // Get address from store or profile
        const address = retailerDoc.store?.address || retailerDoc.profile?.address;

        return {
          _id: retailer._id,
          email: retailer.email,
          businessName,
          profile: {
            ...retailer.profile,
            address, // Add address if available
          },
          isActive: retailer.isActive,
          totalOrders: stats?.totalOrders || 0,
          totalSpent: stats?.totalSpent || 0,
          lastOrderDate: stats?.lastOrderDate,
          createdAt: retailer.createdAt,
        };
      });

      // Sort by total spent (highest first)
      retailerNetwork.sort((a, b) => b.totalSpent - a.totalSpent);

      logger.info(`✅ Found ${retailerNetwork.length} retailers in network`);

      return retailerNetwork;
    } catch (error: any) {
      logger.error(`❌ Get retailer network error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notifications when order is created
   */
  private async sendOrderCreatedNotifications(order: IWholesalerOrder): Promise<void> {
    try {
      // Notify retailer
      await notificationService.notifyB2BOrderCreated(
        order.retailerId,
        order._id.toString(),
        order.orderNumber,
        order.totalAmount
      );

      // Notify wholesaler of new order
      await notificationService.notifyNewB2BOrder(
        order.wholesalerId,
        order._id.toString(),
        order.orderNumber,
        order.totalAmount
      );

      logger.info(`📧 Notifications sent for order ${order.orderNumber}`);
    } catch (error) {
      logger.error('Failed to send order notifications:', error);
    }
  }
}

export default new WholesalerOrderService();
