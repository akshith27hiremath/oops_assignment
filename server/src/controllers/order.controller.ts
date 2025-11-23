import { Request, Response } from 'express';
import Order, { OrderStatus, PaymentStatus } from '../models/Order.model';
import Product from '../models/Product.model';
import orderService from '../services/order.service';
import invoiceService from '../services/invoice.service';
import notificationService from '../services/notification.service';
import calendarService from '../services/calendar.service';
import { logger } from '../utils/logger';

/**
 * Order Controller
 * Handles all order-related operations
 */

/**
 * Create order
 * POST /api/orders
 * Requires: CUSTOMER role
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { items, deliveryAddress, notes, discountCodeId } = req.body;

    // Validate request
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Order must contain at least one item' });
      return;
    }

    // Validate item quantities
    for (const item of items) {
      if (!item.productId) {
        res.status(400).json({ success: false, message: 'Each item must have a productId' });
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        res.status(400).json({ success: false, message: 'Item quantity must be greater than 0' });
        return;
      }
      if (!Number.isInteger(item.quantity)) {
        res.status(400).json({ success: false, message: 'Item quantity must be a whole number' });
        return;
      }
    }

    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city) {
      res.status(400).json({ success: false, message: 'Complete delivery address is required' });
      return;
    }

    // Use order service (handles inventory reservation, discount calculation, and notifications)
    const result = await orderService.createOrder({
      customerId: req.user._id.toString(),
      items,
      deliveryAddress,
      notes,
      discountCodeId, // Optional discount code
    });

    // Send notification to customer
    if (result.success && result.data?.order) {
      const order = result.data.order;

      try {
        logger.info(`📧 Sending order created notification to customer: ${order.customerId}`);

        // Collect all items from all sub-orders for customer notification
        const allItems = order.subOrders?.length > 0
          ? order.subOrders.flatMap(so => so.items)
          : order.items || [];

        await notificationService.notifyOrderCreated(
          order.customerId,
          order._id.toString(),
          order.orderId,
          allItems
        );
        logger.info(`✅ Customer notification sent successfully`);
      } catch (notifError: any) {
        logger.error(`❌ Failed to send customer notification:`, notifError);
      }

      // NOTE: Retailer notifications are now sent by orderService.createOrder()
      // for each retailer in multi-retailer orders
    }

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('❌ Create order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create order',
    });
  }
};

/**
 * Get all orders for current user
 * GET /api/orders
 * Requires: Authentication
 */
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build query based on user type
    const query: any = {};

    if (req.user.userType === 'CUSTOMER') {
      query.customerId = req.user._id;
      if (status) {
        query.masterStatus = status;
      }
    } else if (req.user.userType === 'RETAILER') {
      // Support both old and new format
      query.$or = [
        { retailerId: req.user._id }, // Old format
        { 'subOrders.retailerId': req.user._id }, // New format
      ];
      if (status) {
        query.$and = [
          { $or: query.$or },
          {
            $or: [
              { status }, // Old format
              { 'subOrders.status': status }, // New format
            ],
          },
        ];
        delete query.$or;
      }
    } else {
      res.status(403).json({
        success: false,
        message: 'Invalid user type for orders',
      });
      return;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('customerId', 'email profile.name userType')
        .populate('retailerId', 'email profile.name businessName userType') // Backward compatibility
        .populate('items.productId', 'name images') // Backward compatibility
        .populate('subOrders.retailerId', 'email profile.name businessName userType')
        .populate('subOrders.items.productId', 'name images')
        .select('-__v'),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    logger.error('❌ Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders',
    });
  }
};

/**
 * Get order by ID
 * GET /api/orders/:id
 * Requires: Customer or Retailer (owner only)
 */
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('customerId', 'email profile.name userType')
      .populate('retailerId', 'email profile.name businessName userType') // Backward compatibility
      .populate('items.productId', 'name images basePrice') // Backward compatibility
      .populate('subOrders.retailerId', 'email profile.name businessName userType')
      .populate('subOrders.items.productId', 'name images basePrice')
      .populate('upiTransactionId')
      .select('-__v');

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Check access permission
    const isCustomer = order.customerId._id.toString() === req.user._id.toString();

    // Check if user is a retailer for this order (old or new format)
    let isRetailer = false;
    if (order.retailerId && order.retailerId._id.toString() === req.user._id.toString()) {
      isRetailer = true; // Old format
    } else if (order.subOrders && order.subOrders.length > 0) {
      // New format: check if user is a retailer for any sub-order
      isRetailer = order.subOrders.some(so =>
        so.retailerId._id.toString() === req.user._id.toString()
      );
    }

    if (!isCustomer && !isRetailer) {
      res.status(403).json({
        success: false,
        message: 'You do not have access to this order',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error: any) {
    logger.error('❌ Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order',
    });
  }
};

/**
 * Update order status
 * PUT /api/orders/:id/status
 * Requires: RETAILER role (order owner only)
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Check if retailer owns this order
    if (order.retailerId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own orders',
      });
      return;
    }

    // Update status
    order.status = status;
    order.trackingInfo.currentStatus = status;
    order.trackingInfo.statusHistory.push({
      status,
      timestamp: new Date(),
      notes: notes || `Status updated to ${status}`,
    });

    // Update payment status if delivered
    if (status === OrderStatus.DELIVERED) {
      order.paymentStatus = PaymentStatus.COMPLETED;
    }

    await order.save();

    logger.info(`✅ Order ${order.orderId} status updated to ${status} by ${req.user.email}`);

    // Send notification to customer about status change
    try {
      logger.info(`📧 Sending status update notification to customer: ${order.customerId}`);

      // Get items for notification (handle both single and multi-retailer orders)
      const items = order.items || [];

      await notificationService.notifyOrderStatusUpdated(
        order.customerId,
        order._id.toString(),
        order.orderId,
        status,
        items
      );
      logger.info(`✅ Status update notification sent successfully`);
    } catch (notifError: any) {
      logger.error(`❌ Failed to send status update notification:`, notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: { order },
    });
  } catch (error: any) {
    logger.error('❌ Update order status error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update order status',
    });
  }
};

/**
 * Update sub-order status (for multi-retailer orders)
 * PUT /api/orders/:id/sub-orders/:subOrderId/status
 * Requires: RETAILER role (sub-order owner only)
 */
export const updateSubOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id, subOrderId } = req.params;
    const { status, notes, expectedShippingDate } = req.body;

    // Use order service to update sub-order status
    const result = await orderService.updateSubOrderStatus(
      id,
      subOrderId,
      status,
      req.user._id.toString(),
      notes,
      expectedShippingDate ? new Date(expectedShippingDate) : undefined
    );

    // Send notification to customer about status change
    if (result.success && result.data?.order) {
      const order = result.data.order;
      try {
        logger.info(`📧 Sending sub-order status update notification to customer: ${order.customerId}`);

        // Find the specific sub-order to get its items
        const subOrder = order.subOrders?.find(so => so.subOrderId === subOrderId);
        const items = subOrder?.items || [];

        await notificationService.notifyOrderStatusUpdated(
          order.customerId,
          order._id.toString(),
          subOrderId,
          status,
          items
        );
        logger.info(`✅ Status update notification sent successfully`);
      } catch (notifError: any) {
        logger.error(`❌ Failed to send status update notification:`, notifError);
      }
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('❌ Update sub-order status error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update sub-order status',
    });
  }
};

/**
 * Cancel order
 * POST /api/orders/:id/cancel
 * Requires: CUSTOMER role (order owner only)
 */
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    // Use order service (handles inventory release)
    const result = await orderService.cancelOrder(id, req.user._id.toString(), reason);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('❌ Cancel order error:', error);
    const statusCode = error.message.includes('Unauthorized') || error.message.includes('cannot') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to cancel order',
    });
  }
};

/**
 * Get order tracking info
 * GET /api/orders/:id/tracking
 * Requires: Customer or Retailer (order owner only)
 */
export const getOrderTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const order = await Order.findById(id).select('orderId trackingInfo status customerId retailerId');

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Check access permission
    const isCustomer = order.customerId.toString() === req.user._id.toString();

    // Check if retailer owns this order (support both old and new format)
    const isRetailer = order.retailerId?.toString() === req.user._id.toString() ||
      order.subOrders?.some(so => so.retailerId.toString() === req.user._id.toString());

    if (!isCustomer && !isRetailer) {
      res.status(403).json({
        success: false,
        message: 'You do not have access to this order',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order.orderId,
        trackingInfo: order.trackingInfo,
      },
    });
  } catch (error: any) {
    logger.error('❌ Get order tracking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch tracking info',
    });
  }
};

/**
 * Mark order as paid (COD payment collected)
 * POST /api/orders/:id/mark-paid
 * Requires: RETAILER role (order owner only)
 */
export const markOrderAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;

    // Find order
    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Check if retailer owns this order
    if (order.retailerId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only mark your own orders as paid',
      });
      return;
    }

    // Check if payment is already completed
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      res.status(400).json({
        success: false,
        message: 'Order payment is already marked as completed',
      });
      return;
    }

    // Check if payment is cancelled or refunded
    if (order.paymentStatus === PaymentStatus.CANCELLED || order.paymentStatus === PaymentStatus.REFUNDED) {
      res.status(400).json({
        success: false,
        message: `Cannot mark order as paid - payment status is ${order.paymentStatus}`,
      });
      return;
    }

    // Mark as paid
    await order.markAsPaid();

    logger.info(`✅ Order ${order.orderId} marked as paid by retailer ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Order marked as paid successfully',
      data: { order },
    });
  } catch (error: any) {
    logger.error('❌ Mark order as paid error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark order as paid',
    });
  }
};

/**
 * Mark sub-order as paid (COD payment collected by specific retailer)
 * POST /api/orders/:id/sub-orders/:subOrderId/mark-paid
 * Requires: RETAILER role (sub-order owner only)
 */
export const markSubOrderAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id: orderId, subOrderId } = req.params;

    // Find order
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Find the sub-order
    const subOrder = order.subOrders.find(so => so.subOrderId === subOrderId);

    if (!subOrder) {
      res.status(404).json({
        success: false,
        message: 'Sub-order not found',
      });
      return;
    }

    // Check if retailer owns this sub-order
    if (subOrder.retailerId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only mark your own sub-orders as paid',
      });
      return;
    }

    // Check if already paid
    if (subOrder.paymentStatus === PaymentStatus.COMPLETED) {
      res.status(400).json({
        success: false,
        message: 'Sub-order payment is already marked as completed',
      });
      return;
    }

    // Check if payment is cancelled or refunded
    if (subOrder.paymentStatus === PaymentStatus.CANCELLED || subOrder.paymentStatus === PaymentStatus.REFUNDED) {
      res.status(400).json({
        success: false,
        message: `Cannot mark sub-order as paid - payment status is ${subOrder.paymentStatus}`,
      });
      return;
    }

    // Mark sub-order as paid
    subOrder.paymentStatus = PaymentStatus.COMPLETED;

    // Recalculate master payment status
    const allSubOrdersPaid = order.subOrders.every(
      so => so.paymentStatus === PaymentStatus.COMPLETED
    );
    const anySubOrderPaid = order.subOrders.some(
      so => so.paymentStatus === PaymentStatus.COMPLETED
    );
    const anySubOrderCancelled = order.subOrders.some(
      so => so.paymentStatus === PaymentStatus.CANCELLED
    );

    if (allSubOrdersPaid) {
      order.paymentStatus = PaymentStatus.COMPLETED;
    } else if (anySubOrderCancelled) {
      order.paymentStatus = PaymentStatus.CANCELLED;
    } else if (anySubOrderPaid) {
      order.paymentStatus = PaymentStatus.PROCESSING; // Partial payment
    } else {
      order.paymentStatus = PaymentStatus.PENDING;
    }

    await order.save();

    logger.info(`✅ Sub-order ${subOrderId} marked as paid by retailer ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Sub-order marked as paid successfully',
      data: { order },
    });
  } catch (error: any) {
    logger.error('❌ Mark sub-order as paid error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark sub-order as paid',
    });
  }
};

/**
 * Download invoice for order
 * GET /api/orders/:id/invoice
 * Requires: Order owner (customer or retailer)
 */
export const downloadInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;

    // Find order and populate necessary fields
    const order = await Order.findById(id)
      .populate('customerId', 'email profile')
      .populate('retailerId', 'email profile businessName')
      .populate('subOrders.retailerId', 'email profile businessName');

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Check access permission
    const isCustomer = order.customerId._id.toString() === req.user._id.toString();

    // Check if retailer owns this order (support both old and new format)
    const retailerSubOrder = order.subOrders?.find(
      so => so.retailerId._id.toString() === req.user._id.toString()
    );
    const isRetailer = order.retailerId?._id?.toString() === req.user._id.toString() || !!retailerSubOrder;

    if (!isCustomer && !isRetailer) {
      res.status(403).json({
        success: false,
        message: 'You do not have access to this invoice',
      });
      return;
    }

    // Extract customer info
    const customer: any = order.customerId;
    const customerName = customer.profile?.name || customer.email;
    const customerEmail = customer.email;

    // Generate invoice based on user type
    let invoiceText: string;

    if (isCustomer) {
      // Customer gets full invoice with all sub-orders
      invoiceText = await invoiceService.generateCustomerInvoice({
        order,
        customerName,
        customerEmail,
      });
    } else {
      // Retailer gets invoice for their sub-order only
      const retailer: any = retailerSubOrder?.retailerId || order.retailerId;
      const retailerName = retailer.businessName || retailer.profile?.name || retailer.email;
      const retailerEmail = retailer.email;

      invoiceText = await invoiceService.generateRetailerInvoice({
        order,
        subOrder: retailerSubOrder,
        customerName,
        customerEmail,
        retailerName,
        retailerEmail,
      });
    }

    // Set headers for text file download
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderId}.txt"`);

    res.status(200).send(invoiceText);
  } catch (error: any) {
    logger.error('❌ Download invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate invoice',
    });
  }
};

/**
 * Download calendar event for shipping date
 * GET /api/orders/:id/sub-orders/:subOrderId/calendar
 * Requires: Customer (order owner only)
 */
export const downloadShippingCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id: orderId, subOrderId } = req.params;

    // Find order and populate necessary fields
    const order = await Order.findById(orderId)
      .populate('customerId', 'email profile')
      .populate('subOrders.retailerId', 'email profile businessName');

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Check if user is the customer who owns this order
    const isCustomer = order.customerId._id.toString() === req.user._id.toString();

    if (!isCustomer) {
      res.status(403).json({
        success: false,
        message: 'Only the customer can download the shipping calendar',
      });
      return;
    }

    // Find the specific sub-order
    const subOrder = order.subOrders.find(so => so.subOrderId === subOrderId);

    if (!subOrder) {
      res.status(404).json({
        success: false,
        message: 'Sub-order not found',
      });
      return;
    }

    // Check if shipping date is set
    if (!subOrder.expectedShippingDate) {
      res.status(400).json({
        success: false,
        message: 'Shipping date has not been set for this sub-order yet',
      });
      return;
    }

    // Extract customer and retailer info
    const customer: any = order.customerId;
    const customerName = customer.profile?.name || customer.email;
    const customerEmail = customer.email;

    const retailer: any = subOrder.retailerId;
    const retailerName = retailer.businessName || retailer.profile?.name || 'Retailer';

    // Generate .ics content
    const icsContent = calendarService.generateShippingCalendarEvent(
      order,
      subOrder,
      customerName,
      customerEmail,
      retailerName
    );

    const filename = calendarService.generateFilename(order.orderId, subOrderId);

    // Set headers for .ics file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(200).send(icsContent);
  } catch (error: any) {
    logger.error('❌ Download shipping calendar error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate calendar event',
    });
  }
};

export default {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  updateSubOrderStatus,
  cancelOrder,
  getOrderTracking,
  markOrderAsPaid,
  markSubOrderAsPaid,
  downloadInvoice,
  downloadShippingCalendar,
};
