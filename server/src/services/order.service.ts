/**
 * Order Service
 * Handles order creation, updates, and management
 */

import Order, { OrderStatus, PaymentStatus, IOrderItem, ISubOrder } from '../models/Order.model';
import Inventory from '../models/Inventory.model';
import Product from '../models/Product.model';
import Customer from '../models/Customer.model';
import User from '../models/User.model';
import notificationService from './notification.service';
import discountService from './discount.service';
import deliveryService from './delivery.service';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export interface CreateOrderData {
  customerId: string;
  items: {
    productId: string;
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
  discountCodeId?: string; // Optional discount code to apply
}

class OrderService {
  /**
   * Create a new order
   * - Validates stock availability
   * - Reserves inventory
   * - Creates order record
   */
  async createOrder(data: CreateOrderData) {
    try {
      const { customerId, items, deliveryAddress, notes, discountCodeId } = data;

      // STEP 1: Group items by retailer
      const itemsByRetailer = new Map<string, {
        retailerId: mongoose.Types.ObjectId;
        items: IOrderItem[];
        subtotalBeforeProductDiscounts: number;
        subtotalAfterProductDiscounts: number;
        productDiscountSavings: number;
      }>();

      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product || !product.isActive) {
          throw new Error(`Product ${item.productId} not found or inactive`);
        }

        // Find retailer inventory
        const inventoryResult = await Inventory.aggregate([
          {
            $match: {
              productId: new mongoose.Types.ObjectId(item.productId),
              availability: true,
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'ownerId',
              foreignField: '_id',
              as: 'owner'
            }
          },
          { $unwind: '$owner' },
          {
            $match: {
              'owner.userType': 'RETAILER'
            }
          },
          { $limit: 1 }
        ]);

        if (!inventoryResult || inventoryResult.length === 0) {
          throw new Error(`Product "${product.name}" is not available from retailers`);
        }

        const inventoryData = inventoryResult[0];
        const inventory = await Inventory.findById(inventoryData._id);
        if (!inventory) {
          throw new Error(`Product "${product.name}" inventory not found`);
        }

        const retailerId = inventory.ownerId._id;
        const retailerIdStr = retailerId.toString();

        // Check stock
        const availableStock = inventory.currentStock - inventory.reservedStock;
        if (availableStock < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${availableStock}`);
        }

        // Reserve stock
        await inventory.reserveStock(item.quantity);

        // Calculate pricing with product discount
        const basePrice = inventory.sellingPrice;
        let unitPrice = basePrice;
        let productDiscountPercentage = 0;

        if (inventory.productDiscount?.isActive && new Date(inventory.productDiscount.validUntil) > new Date()) {
          productDiscountPercentage = inventory.productDiscount.discountPercentage;
          unitPrice = basePrice * (1 - productDiscountPercentage / 100);
          unitPrice = Math.round(unitPrice * 100) / 100;
        }

        const itemSubtotalBefore = basePrice * item.quantity;
        const itemSubtotal = unitPrice * item.quantity;
        const itemProductDiscount = itemSubtotalBefore - itemSubtotal;

        // Build order item
        const orderItem: IOrderItem = {
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          unitPrice,
          originalUnitPrice: productDiscountPercentage > 0 ? basePrice : undefined,
          productDiscountPercentage: productDiscountPercentage > 0 ? productDiscountPercentage : undefined,
          subtotal: itemSubtotal,
          discounts: 0,
        };

        // Group by retailer
        if (!itemsByRetailer.has(retailerIdStr)) {
          itemsByRetailer.set(retailerIdStr, {
            retailerId,
            items: [],
            subtotalBeforeProductDiscounts: 0,
            subtotalAfterProductDiscounts: 0,
            productDiscountSavings: 0,
          });
        }

        const retailerGroup = itemsByRetailer.get(retailerIdStr)!;
        retailerGroup.items.push(orderItem);
        retailerGroup.subtotalBeforeProductDiscounts += itemSubtotalBefore;
        retailerGroup.subtotalAfterProductDiscounts += itemSubtotal;
        retailerGroup.productDiscountSavings += itemProductDiscount;
      }

      // STEP 2: Calculate global discount
      const globalSubtotalBefore = Array.from(itemsByRetailer.values())
        .reduce((sum, r) => sum + r.subtotalBeforeProductDiscounts, 0);
      const globalSubtotalAfter = Array.from(itemsByRetailer.values())
        .reduce((sum, r) => sum + r.subtotalAfterProductDiscounts, 0);
      const globalProductSavings = Array.from(itemsByRetailer.values())
        .reduce((sum, r) => sum + r.productDiscountSavings, 0);

      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const discountCalc = await discountService.calculateBestDiscount(
        customerId,
        globalSubtotalAfter,
        discountCodeId
      );

      // STEP 3: Create sub-orders
      const subOrders: ISubOrder[] = [];
      const masterOrderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      let subOrderIndex = 1;
      for (const [retailerIdStr, retailerData] of itemsByRetailer) {
        // Proportional discount share
        const proportion = retailerData.subtotalAfterProductDiscounts / globalSubtotalAfter;
        const tierCodeDiscountShare = Math.round(discountCalc.finalDiscount * proportion * 100) / 100;

        // Apply to items
        const itemsWithDiscount = discountService.applyDiscountToItems(
          retailerData.items,
          tierCodeDiscountShare
        );

        const subOrderTotal = retailerData.subtotalAfterProductDiscounts - tierCodeDiscountShare;

        subOrders.push({
          subOrderId: `${masterOrderId}-R${subOrderIndex}`,
          retailerId: retailerData.retailerId,
          items: itemsWithDiscount,
          subtotalBeforeProductDiscounts: retailerData.subtotalBeforeProductDiscounts,
          productDiscountSavings: retailerData.productDiscountSavings,
          subtotalAfterProductDiscounts: retailerData.subtotalAfterProductDiscounts,
          tierCodeDiscountShare,
          totalAmount: Math.round(subOrderTotal * 100) / 100,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          trackingInfo: {
            currentStatus: OrderStatus.PENDING,
            statusHistory: [{
              status: OrderStatus.PENDING,
              timestamp: new Date(),
            }],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        subOrderIndex++;
      }

      // STEP 4: Calculate delivery estimate for EACH sub-order
      let deliveryCoordinates: { latitude: number; longitude: number } | undefined;
      let deliveryEstimate: any;

      if (subOrders.length > 0) {
        // Calculate estimate for each retailer
        for (const subOrder of subOrders) {
          try {
            const retailer = await User.findById(subOrder.retailerId);

            if (retailer?.profile?.location?.coordinates) {
              const retailerLocation = {
                latitude: retailer.profile.location.coordinates[1],
                longitude: retailer.profile.location.coordinates[0],
              };

              const estimateResult = await deliveryService.getDeliveryEstimate(
                retailerLocation,
                {
                  ...deliveryAddress,
                  country: deliveryAddress.country || 'India',
                }
              );

              if (estimateResult.estimate) {
                // Set delivery estimate for THIS sub-order
                subOrder.deliveryEstimate = estimateResult.estimate;
                logger.info(`📍 Sub-order ${subOrder.subOrderId} delivery estimate: ${estimateResult.estimate.distanceText}, ${estimateResult.estimate.durationText}`);
              }
            }
          } catch (deliveryError) {
            logger.warn(`Failed to calculate delivery estimate for sub-order ${subOrder.subOrderId}:`, deliveryError);
            // Don't fail order creation if delivery estimate fails for one retailer
          }
        }

        // Set master-level delivery coordinates and estimate from FIRST sub-order for backward compatibility
        if (subOrders[0].deliveryEstimate) {
          const firstRetailer = await User.findById(subOrders[0].retailerId);
          if (firstRetailer?.profile?.location?.coordinates) {
            deliveryCoordinates = {
              latitude: firstRetailer.profile.location.coordinates[1],
              longitude: firstRetailer.profile.location.coordinates[0],
            };
          }
          deliveryEstimate = subOrders[0].deliveryEstimate;
          logger.info(`📍 Master delivery estimate set from first sub-order: ${deliveryEstimate.durationText}`);
        }
      }

      // STEP 5: Create master order
      const masterTotalAmount = subOrders.reduce((sum, so) => sum + so.totalAmount, 0);

      const order = new Order({
        orderId: masterOrderId,
        customerId: new mongoose.Types.ObjectId(customerId),
        subOrders,
        orderType: 'ONLINE',
        masterStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        totalAmount: Math.round(masterTotalAmount * 100) / 100,
        deliveryAddress: {
          ...deliveryAddress,
          country: deliveryAddress.country || 'India',
        },
        deliveryCoordinates,
        deliveryEstimate,
        notes,
        appliedDiscountCode: discountCalc.appliedCode?._id,
        loyaltyTierAtPurchase: await customer.calculateLoyaltyTier(),
        discountBreakdown: {
          subtotal: globalSubtotalBefore,
          productDiscountSavings: globalProductSavings,
          subtotalAfterProductDiscounts: globalSubtotalAfter,
          tierDiscount: discountCalc.tierDiscount,
          codeDiscount: discountCalc.codeDiscount,
          finalDiscount: discountCalc.finalDiscount,
          discountType: discountCalc.discountType,
          tierPercentage: discountCalc.tierPercentage,
          codePercentage: discountCalc.codePercentage,
        },
      });

      await order.save();

      // STEP 6: Update customer history
      await customer.updateOne({
        $push: { orderHistory: order._id }
      });

      // STEP 7: Increment discount code usage
      if (discountCalc.appliedCode && discountCalc.discountType === 'CODE') {
        await discountCalc.appliedCode.incrementUsage(customerId);
      }

      // STEP 8: Send notifications to each retailer
      const customerName = customer.profile?.name || customer.email;

      for (const subOrder of order.subOrders) {
        try {
          await notificationService.notifyNewOrderForRetailer(
            subOrder.retailerId,
            order._id.toString(),
            subOrder.subOrderId,
            customerName,
            subOrder.totalAmount,
            subOrder.items // Pass items for notification
          );
          logger.info(`📧 Notification sent to retailer ${subOrder.retailerId} for sub-order ${subOrder.subOrderId}`);
        } catch (notifError) {
          logger.error(`❌ Failed to send notification to retailer ${subOrder.retailerId}:`, notifError);
        }
      }

      // STEP 9: Log
      logger.info(`✅ Multi-retailer order created: ${order.orderId}`);
      logger.info(`   📦 Sub-orders: ${subOrders.length}`);
      logger.info(`   💰 Pricing breakdown:`);
      logger.info(`      Original subtotal: ₹${globalSubtotalBefore.toFixed(2)}`);
      logger.info(`      Product discounts: -₹${globalProductSavings.toFixed(2)}`);
      logger.info(`      After product discounts: ₹${globalSubtotalAfter.toFixed(2)}`);
      logger.info(`      ${discountCalc.discountType} discount: -₹${discountCalc.finalDiscount.toFixed(2)}`);
      logger.info(`      Final total: ₹${masterTotalAmount.toFixed(2)}`);

      for (const subOrder of subOrders) {
        logger.info(`      Sub-order ${subOrder.subOrderId}: ₹${subOrder.totalAmount.toFixed(2)}`);
      }

      return {
        success: true,
        data: { order },
        message: 'Order created successfully',
      };
    } catch (error: any) {
      logger.error(`❌ Order creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, userId: string) {
    try {
      const order = await Order.findById(orderId)
        .populate('customerId', 'profile.name email profile.phone')
        .populate('retailerId', 'profile.name businessName profile.location') // Backward compatibility
        .populate('items.productId', 'name images unit') // Backward compatibility
        .populate('subOrders.retailerId', 'profile.name businessName profile.location')
        .populate('subOrders.items.productId', 'name images unit');

      if (!order) {
        throw new Error('Order not found');
      }

      // Check access (customer or retailer)
      const userIdObj = new mongoose.Types.ObjectId(userId);
      const isCustomer = order.customerId._id.equals(userIdObj);

      // Check if user is a retailer for any sub-order
      let isRetailer = false;
      if (order.retailerId && order.retailerId._id.equals(userIdObj)) {
        isRetailer = true; // Backward compatibility
      } else if (order.subOrders && order.subOrders.length > 0) {
        isRetailer = order.subOrders.some(so => so.retailerId._id.equals(userIdObj));
      }

      if (!isCustomer && !isRetailer) {
        throw new Error('Unauthorized to view this order');
      }

      return {
        success: true,
        data: { order },
      };
    } catch (error: any) {
      logger.error(`❌ Get order error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get customer orders
   */
  async getCustomerOrders(customerId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find({ customerId: new mongoose.Types.ObjectId(customerId) })
          .populate('retailerId', 'profile.name businessName') // Backward compatibility
          .populate('subOrders.retailerId', 'profile.name businessName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments({ customerId: new mongoose.Types.ObjectId(customerId) }),
      ]);

      return {
        success: true,
        data: {
          orders,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      logger.error(`❌ Get customer orders error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get retailer orders
   */
  async getRetailerOrders(
    retailerId: string,
    status?: OrderStatus,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;
      const retailerIdObj = new mongoose.Types.ObjectId(retailerId);

      // Query for both old format (retailerId field) and new format (subOrders)
      const baseQuery: any = {
        $or: [
          { retailerId: retailerIdObj }, // Old format
          { 'subOrders.retailerId': retailerIdObj }, // New format
        ],
      };

      // Add status filter if provided
      let query: any = baseQuery;
      if (status) {
        query = {
          $and: [
            baseQuery,
            {
              $or: [
                { status }, // Old format
                { 'subOrders.status': status }, // New format
              ],
            },
          ],
        };
      }

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('customerId', 'profile.name email profile.phone')
          .populate('subOrders.retailerId', 'profile.name businessName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(query),
      ]);

      return {
        success: true,
        data: {
          orders,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      logger.error(`❌ Get retailer orders error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update sub-order status (for multi-retailer orders)
   */
  async updateSubOrderStatus(
    orderId: string,
    subOrderId: string,
    newStatus: OrderStatus,
    userId: string,
    notes?: string,
    expectedShippingDate?: Date
  ) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      // Find the sub-order
      const subOrder = order.subOrders.find(so => so.subOrderId === subOrderId);
      if (!subOrder) {
        throw new Error('Sub-order not found');
      }

      // Only the specific retailer can update their sub-order
      const userIdObj = new mongoose.Types.ObjectId(userId);
      if (!subOrder.retailerId.equals(userIdObj)) {
        throw new Error('Only the retailer can update their sub-order status');
      }

      // Update sub-order status
      subOrder.status = newStatus;
      subOrder.trackingInfo.currentStatus = newStatus;
      subOrder.trackingInfo.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        notes,
      });

      // Update expected shipping date if provided (typically when status moves to PROCESSING)
      if (expectedShippingDate) {
        subOrder.expectedShippingDate = expectedShippingDate;
        logger.info(`📅 Expected shipping date set to: ${expectedShippingDate.toISOString()}`);

        // Populate retailer info for notification
        await order.populate('subOrders.retailerId', 'businessName profile.name');
        const retailer: any = subOrder.retailerId;
        const retailerName = retailer.businessName || retailer.profile?.name || 'Retailer';

        // Send notification to customer about shipping date
        try {
          await notificationService.notifyShippingDateSet(
            order.customerId,
            order._id.toString(),
            subOrderId,
            retailerName,
            expectedShippingDate,
            subOrder.items
          );
          logger.info(`📧 Shipping date notification sent to customer`);
        } catch (notifError: any) {
          logger.error(`❌ Failed to send shipping date notification:`, notifError);
        }
      }

      // Update master status based on all sub-orders
      order.masterStatus = order.calculateMasterStatus();

      await order.save();

      // If sub-order is delivered, confirm reserved stock for this retailer's items
      if (newStatus === OrderStatus.DELIVERED) {
        for (const item of subOrder.items) {
          const inventory = await Inventory.findOne({
            productId: item.productId,
            ownerId: subOrder.retailerId,
          });

          if (inventory) {
            await inventory.confirmReservedStock(item.quantity);
          }
        }

        // Check if ALL sub-orders are delivered to trigger milestone check
        const allDelivered = order.subOrders.every(so => so.status === OrderStatus.DELIVERED);
        if (allDelivered) {
          await discountService.checkMilestones(order.customerId.toString());
        }
      }

      logger.info(`✅ Sub-order ${subOrderId} status updated to ${newStatus}`);
      logger.info(`   Master order ${order.orderId} status: ${order.masterStatus}`);

      return {
        success: true,
        data: { order },
        message: 'Sub-order status updated successfully',
      };
    } catch (error: any) {
      logger.error(`❌ Update sub-order status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update order status (for backward compatibility with single-retailer orders)
   */
  async updateOrderStatus(orderId: string, newStatus: OrderStatus, userId: string, notes?: string) {
    try {
      const order = await Order.findById(orderId).populate('retailerId');

      if (!order) {
        throw new Error('Order not found');
      }

      // Only retailer can update status
      const userIdObj = new mongoose.Types.ObjectId(userId);
      if (!order.retailerId._id.equals(userIdObj)) {
        throw new Error('Only the retailer can update order status');
      }

      await order.updateStatus(newStatus, notes);

      // If order is delivered, confirm reserved stock and check for milestones
      if (newStatus === OrderStatus.DELIVERED) {
        for (const item of order.items) {
          const inventory = await Inventory.findOne({
            productId: item.productId,
            ownerId: order.retailerId._id,
          });

          if (inventory) {
            await inventory.confirmReservedStock(item.quantity);
          }
        }

        // Check if customer reached any milestones and auto-assign reward codes
        await discountService.checkMilestones(order.customerId.toString());
      }

      logger.info(`✅ Order ${order.orderId} status updated to ${newStatus}`);

      return {
        success: true,
        data: { order },
        message: 'Order status updated successfully',
      };
    } catch (error: any) {
      logger.error(`❌ Update order status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel order (supports both single-retailer and multi-retailer orders)
   */
  async cancelOrder(orderId: string, userId: string, reason?: string) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      // Check access
      const userIdObj = new mongoose.Types.ObjectId(userId);
      const isCustomer = order.customerId.equals(userIdObj);
      let isRetailer = false;

      // Check if user is retailer (old or new format)
      if (order.retailerId && order.retailerId.equals(userIdObj)) {
        isRetailer = true;
      } else if (order.subOrders && order.subOrders.length > 0) {
        isRetailer = order.subOrders.some(so => so.retailerId.equals(userIdObj));
      }

      if (!isCustomer && !isRetailer) {
        throw new Error('Unauthorized to cancel this order');
      }

      // Explicit payment status validation
      if (order.paymentStatus === PaymentStatus.COMPLETED) {
        throw new Error('Cannot cancel order with completed payment. Please request a refund instead.');
      }

      if (order.paymentStatus === PaymentStatus.REFUNDED) {
        throw new Error('Order payment has already been refunded');
      }

      // Allow cancellation for failed or pending payments regardless of order status
      const allowedPaymentStatusesForCancellation = [
        PaymentStatus.PENDING,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
      ];

      if (!allowedPaymentStatusesForCancellation.includes(order.paymentStatus)) {
        logger.error(`❌ Cannot cancel order ${order.orderId}: paymentStatus=${order.paymentStatus} not in allowed list`);
        throw new Error('Order cannot be cancelled - payment already processed');
      }

      // Check if can cancel based on order status (handle both single and multi-retailer orders)
      const cancellableOrderStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
      const currentStatus = (order as any).masterStatus || order.status;

      if (!cancellableOrderStatuses.includes(currentStatus)) {
        logger.error(`❌ Cannot cancel order ${order.orderId}: order status=${currentStatus} not cancellable`);
        throw new Error('Order cannot be cancelled at this stage');
      }

      // Release reserved inventory based on order format
      if (order.subOrders && order.subOrders.length > 0) {
        // Multi-retailer: release inventory for all sub-orders
        for (const subOrder of order.subOrders) {
          for (const item of subOrder.items) {
            const inventory = await Inventory.findOne({
              productId: item.productId,
              ownerId: subOrder.retailerId,
            });

            if (inventory) {
              await inventory.releaseReservedStock(item.quantity);
            }
          }
        }
      } else if (order.items && order.retailerId) {
        // Single-retailer (backward compatibility)
        for (const item of order.items) {
          const inventory = await Inventory.findOne({
            productId: item.productId,
            ownerId: order.retailerId,
          });

          if (inventory) {
            await inventory.releaseReservedStock(item.quantity);
          }
        }
      }

      // Cancel order
      await order.cancel(reason);

      logger.info(`✅ Order ${order.orderId} cancelled`);

      // Only send notifications if payment was not pending (i.e., user actually placed the order)
      // Skip notifications for abandoned UPI payments
      if (order.paymentStatus !== PaymentStatus.PENDING) {
        try {
          // Send notifications based on order format
          if (order.subOrders && order.subOrders.length > 0) {
            // Multi-retailer: notify all retailers
            for (const subOrder of order.subOrders) {
              await notificationService.notifyOrderCancelled(
                order.customerId,
                subOrder.retailerId,
                order._id.toString(),
                order.orderId,
                reason || 'Order cancelled by customer'
              );
            }
          } else if (order.retailerId) {
            // Single-retailer (backward compatibility)
            await notificationService.notifyOrderCancelled(
              order.customerId,
              order.retailerId,
              order._id.toString(),
              order.orderId,
              reason || 'Order cancelled by customer'
            );
          }
          logger.info(`✅ Cancellation notifications sent for order ${order.orderId}`);
        } catch (notifError: any) {
          logger.error(`❌ Failed to send cancellation notifications:`, notifError);
        }
      } else {
        logger.info(`ℹ️ Skipping notifications for order ${order.orderId} (payment was pending - likely abandoned UPI payment)`);
      }

      return {
        success: true,
        data: { order },
        message: 'Order cancelled successfully',
      };
    } catch (error: any) {
      logger.error(`❌ Cancel order error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get order statistics for retailer
   */
  async getOrderStatistics(retailerId: string, startDate?: Date, endDate?: Date) {
    try {
      const retailerObjectId = new mongoose.Types.ObjectId(retailerId);

      // Build date match condition
      const dateMatch: any = {};
      if (startDate || endDate) {
        dateMatch.createdAt = {};
        if (startDate) dateMatch.createdAt.$gte = startDate;
        if (endDate) dateMatch.createdAt.$lte = endDate;
      }

      // Aggregation pipeline for multi-retailer orders
      const pipeline: any[] = [
        // Match orders containing this retailer's sub-orders
        {
          $match: {
            'subOrders.retailerId': retailerObjectId,
            ...dateMatch,
          },
        },
        // Unwind sub-orders array
        { $unwind: '$subOrders' },
        // Filter for only this retailer's sub-orders
        { $match: { 'subOrders.retailerId': retailerObjectId } },
        // Project needed fields
        {
          $project: {
            status: '$subOrders.status',
            totalAmount: '$subOrders.totalAmount',
            createdAt: 1,
          },
        },
      ];

      // Stats by status
      const statsByStatus = await Order.aggregate([
        ...pipeline,
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { revenue: -1 } },
      ]);

      // Overall stats
      const overallStats = await Order.aggregate([
        ...pipeline,
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
          },
        },
      ]);

      return {
        success: true,
        data: {
          byStatus: statsByStatus,
          overall: overallStats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
        },
      };
    } catch (error: any) {
      logger.error(`❌ Get order statistics error: ${error.message}`);
      throw error;
    }
  }
}

export default new OrderService();
