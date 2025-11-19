import { Request, Response } from 'express';
import UPITransaction, { TransactionStatus, UPIGatewayType } from '../models/UPITransaction.model';
import Order, { PaymentStatus } from '../models/Order.model';
import notificationService from '../services/notification.service';
import razorpayService from '../services/razorpay.service';
import { logger } from '../utils/logger';

/**
 * Payment Controller
 * Handles all UPI payment-related operations
 */

/**
 * Initiate UPI payment
 * POST /api/payments/initiate
 * Requires: CUSTOMER role
 */
export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { orderId, gateway, upiId } = req.body;

    // Validate required fields
    if (!orderId || !gateway) {
      res.status(400).json({
        success: false,
        message: 'Order ID and gateway are required',
      });
      return;
    }

    // Validate gateway
    if (!Object.values(UPIGatewayType).includes(gateway)) {
      res.status(400).json({
        success: false,
        message: 'Invalid UPI gateway',
      });
      return;
    }

    // Find order
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Check if customer owns this order
    if (order.customerId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only pay for your own orders',
      });
      return;
    }

    // Check if order already paid
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      res.status(400).json({
        success: false,
        message: 'Order already paid',
      });
      return;
    }

    // Check if payment already initiated and pending
    const existingTransaction = await UPITransaction.findOne({
      orderId,
      status: { $in: [TransactionStatus.INITIATED, TransactionStatus.PENDING, TransactionStatus.PROCESSING] },
    });

    if (existingTransaction && !existingTransaction.isExpired()) {
      // Return existing Razorpay order details
      res.status(200).json({
        success: true,
        message: 'Payment already initiated',
        data: {
          transaction: existingTransaction,
          razorpayOrderId: existingTransaction.merchantTransactionId,
          razorpayKeyId: razorpayService.getKeyId(),
          amount: existingTransaction.amount,
          currency: existingTransaction.currency,
        },
      });
      return;
    }

    // Check if there's a recent failed transaction (within last 5 minutes)
    const recentFailedTransaction = await UPITransaction.findOne({
      orderId,
      status: TransactionStatus.FAILED,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
    }).sort({ createdAt: -1 });

    // If failed transaction exists, allow retry but log it
    if (recentFailedTransaction) {
      logger.warn(`⚠️  Retry payment after failure for order ${order.orderId}. Previous transaction: ${recentFailedTransaction.transactionId}`);
    }

    // Create Razorpay order
    const razorpayOrder = await razorpayService.createOrder({
      amount: order.totalAmount,
      currency: 'INR',
      receipt: order.orderId,
      notes: {
        orderId: order._id.toString(),
        customerId: req.user._id.toString(),
        customerEmail: req.user.email,
      },
    });

    // Get merchantId - for multi-retailer orders, use first retailer
    let merchantId = order.retailerId; // Try legacy field first
    if (!merchantId && order.subOrders && order.subOrders.length > 0) {
      merchantId = order.subOrders[0].retailerId; // Use first retailer for multi-retailer
    }

    if (!merchantId) {
      res.status(400).json({
        success: false,
        message: 'Order has no associated retailer',
      });
      return;
    }

    // Create UPI transaction record
    const transaction = new UPITransaction({
      orderId: order._id,
      customerId: req.user._id,
      merchantId, // Fixed: Handle multi-retailer orders
      amount: order.totalAmount,
      currency: 'INR',
      status: TransactionStatus.INITIATED,
      gateway,
      upiId,
      merchantTransactionId: razorpayOrder.id, // Store Razorpay order ID
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    // Save to trigger pre-save middleware
    await transaction.save();

    // Update order payment status
    order.paymentStatus = PaymentStatus.PENDING;
    order.upiTransactionId = transaction._id;
    await order.save();

    logger.info(`✅ Payment initiated: ${transaction.transactionId} for order ${order.orderId} (Razorpay: ${razorpayOrder.id})`);

    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        transaction,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: razorpayService.getKeyId(),
        amount: order.totalAmount,
        currency: 'INR',
      },
    });
  } catch (error: any) {
    logger.error('❌ Initiate payment error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to initiate payment',
    });
  }
};

/**
 * Verify payment status
 * POST /api/payments/verify
 * Requires: CUSTOMER role
 */
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { transactionId } = req.body;

    if (!transactionId) {
      res.status(400).json({
        success: false,
        message: 'Transaction ID is required',
      });
      return;
    }

    const transaction = await UPITransaction.findOne({ transactionId })
      .populate('orderId', 'orderId totalAmount paymentStatus');

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // Check if customer owns this transaction
    if (transaction.customerId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only verify your own transactions',
      });
      return;
    }

    // Mock verification - In production, this would call actual gateway API
    const isVerified = await transaction.verify();

    res.status(200).json({
      success: true,
      message: 'Payment verification completed',
      data: {
        transaction,
        isVerified,
      },
    });
  } catch (error: any) {
    logger.error('❌ Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment',
    });
  }
};

/**
 * Verify Razorpay payment signature
 * POST /api/payments/verify-razorpay
 * Requires: CUSTOMER role
 */
export const verifyRazorpayPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, transactionId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !transactionId) {
      res.status(400).json({
        success: false,
        message: 'Missing required payment details',
      });
      return;
    }

    // Find transaction
    const transaction = await UPITransaction.findOne({ transactionId });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // Check if customer owns this transaction
    if (transaction.customerId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only verify your own transactions',
      });
      return;
    }

    // Verify signature
    const isValid = razorpayService.verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      // Mark as failed
      await transaction.updateStatus(TransactionStatus.FAILED, {
        code: 'INVALID_SIGNATURE',
        message: 'Payment signature verification failed',
      });

      res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
      return;
    }

    // Fetch payment details from Razorpay
    const payment = await razorpayService.fetchPayment(razorpayPaymentId);

    // Update transaction
    await transaction.updateStatus(TransactionStatus.SUCCESS, {
      code: 'SUCCESS',
      message: 'Payment completed successfully',
      bankReference: payment.acquirer_data?.bank_transaction_id || razorpayPaymentId,
      gatewayData: {
        razorpayPaymentId,
        razorpayOrderId,
        method: payment.method,
        vpa: payment.vpa,
        email: payment.email,
        contact: payment.contact,
      },
    });

    // Update order payment status
    const order = await Order.findById(transaction.orderId);
    if (order) {
      // Update master payment status
      order.paymentStatus = PaymentStatus.COMPLETED;

      // Update all sub-order payment statuses for multi-retailer orders
      if (order.subOrders && order.subOrders.length > 0) {
        order.subOrders.forEach((subOrder: any) => {
          subOrder.paymentStatus = PaymentStatus.COMPLETED;
        });
      }

      await order.save();

      // Send success notification
      await notificationService.notifyPaymentSuccess(
        transaction.customerId,
        transaction.transactionId,
        transaction.amount,
        order._id.toString()
      );
    }

    logger.info(`✅ Razorpay payment verified: ${razorpayPaymentId} for transaction ${transactionId}`);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: { transaction, payment },
    });
  } catch (error: any) {
    logger.error('❌ Verify Razorpay payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment',
    });
  }
};

/**
 * Mark Razorpay payment as failed
 * POST /api/payments/mark-failed
 * Called when payment.failed event occurs in frontend
 */
export const markPaymentFailed = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { transactionId, errorCode, errorDescription } = req.body;

    if (!transactionId) {
      res.status(400).json({
        success: false,
        message: 'Transaction ID is required',
      });
      return;
    }

    // Find transaction
    const transaction = await UPITransaction.findOne({
      transactionId,
      customerId: req.user._id,
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // Only update if not already in final state
    if (transaction.status === TransactionStatus.SUCCESS || transaction.status === TransactionStatus.REFUNDED) {
      res.status(400).json({
        success: false,
        message: 'Transaction already in final state',
      });
      return;
    }

    // Update transaction to FAILED
    await transaction.updateStatus(TransactionStatus.FAILED, {
      code: errorCode || 'PAYMENT_FAILED',
      message: errorDescription || 'Payment failed',
    });

    // Update order payment status to FAILED
    const order = await Order.findById(transaction.orderId);
    if (order) {
      order.paymentStatus = PaymentStatus.FAILED;
      await order.save();
      logger.info(`❌ Order ${order.orderId} payment status updated to FAILED`);
    }

    logger.info(`❌ Payment marked as failed: ${transactionId} - ${errorDescription}`);

    res.status(200).json({
      success: true,
      message: 'Payment marked as failed',
      data: { transaction },
    });
  } catch (error: any) {
    logger.error('❌ Mark payment failed error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark payment as failed',
    });
  }
};

/**
 * Razorpay Webhook Handler
 * POST /api/payments/razorpay-webhook
 * Public endpoint for Razorpay webhook events
 */
export const razorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookBody = JSON.stringify(req.body);
    const signature = req.headers['x-razorpay-signature'] as string;

    // Verify webhook signature
    const isValid = razorpayService.verifyWebhookSignature(webhookBody, signature);

    if (!isValid) {
      logger.warn('⚠️  Invalid Razorpay webhook signature');
      res.status(400).json({
        success: false,
        message: 'Invalid webhook signature',
      });
      return;
    }

    const event = req.body.event;
    const payload = req.body.payload.payment?.entity || req.body.payload.order?.entity;

    logger.info(`📨 Razorpay webhook received: ${event}`);

    // Handle different event types
    switch (event) {
      case 'payment.authorized':
      case 'payment.captured':
        // Payment successful
        await handlePaymentSuccess(payload);
        break;

      case 'payment.failed':
        // Payment failed
        await handlePaymentFailed(payload);
        break;

      case 'refund.created':
      case 'refund.processed':
        // Refund processed
        logger.info(`💰 Refund processed: ${payload.id}`);
        break;

      default:
        logger.info(`ℹ️  Unhandled webhook event: ${event}`);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error: any) {
    logger.error('❌ Razorpay webhook error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process webhook',
    });
  }
};

/**
 * Handle successful payment from webhook
 */
async function handlePaymentSuccess(payment: any): Promise<void> {
  try {
    const razorpayOrderId = payment.order_id;

    // Find transaction by Razorpay order ID
    const transaction = await UPITransaction.findOne({ merchantTransactionId: razorpayOrderId });

    if (!transaction) {
      logger.warn(`⚠️  Transaction not found for Razorpay order: ${razorpayOrderId}`);
      return;
    }

    if (transaction.status === TransactionStatus.SUCCESS) {
      logger.info(`ℹ️  Payment already marked as successful: ${transaction.transactionId}`);
      return;
    }

    // Update transaction
    await transaction.updateStatus(TransactionStatus.SUCCESS, {
      code: 'SUCCESS',
      message: 'Payment completed successfully',
      bankReference: payment.acquirer_data?.bank_transaction_id || payment.id,
      gatewayData: {
        razorpayPaymentId: payment.id,
        razorpayOrderId,
        method: payment.method,
        vpa: payment.vpa,
        email: payment.email,
        contact: payment.contact,
      },
    });

    // Update order
    const order = await Order.findById(transaction.orderId);
    if (order) {
      // Update master payment status
      order.paymentStatus = PaymentStatus.COMPLETED;

      // Update all sub-order payment statuses for multi-retailer orders
      if (order.subOrders && order.subOrders.length > 0) {
        order.subOrders.forEach((subOrder: any) => {
          subOrder.paymentStatus = PaymentStatus.COMPLETED;
        });
      }

      await order.save();

      // Send notification
      await notificationService.notifyPaymentSuccess(
        transaction.customerId,
        transaction.transactionId,
        transaction.amount,
        order._id.toString()
      );
    }

    logger.info(`✅ Payment success webhook processed: ${payment.id}`);
  } catch (error: any) {
    logger.error('❌ Handle payment success error:', error);
  }
}

/**
 * Handle failed payment from webhook
 */
async function handlePaymentFailed(payment: any): Promise<void> {
  try {
    const razorpayOrderId = payment.order_id;

    // Find transaction
    const transaction = await UPITransaction.findOne({ merchantTransactionId: razorpayOrderId });

    if (!transaction) {
      logger.warn(`⚠️  Transaction not found for Razorpay order: ${razorpayOrderId}`);
      return;
    }

    // Update transaction
    await transaction.updateStatus(TransactionStatus.FAILED, {
      code: payment.error_code || 'FAILED',
      message: payment.error_description || 'Payment failed',
    });

    // Update order
    const order = await Order.findById(transaction.orderId);
    if (order) {
      order.paymentStatus = PaymentStatus.FAILED;
      await order.save();

      // Send notification
      await notificationService.notifyPaymentFailed(
        transaction.customerId,
        transaction.transactionId,
        transaction.amount,
        order._id.toString()
      );
    }

    logger.info(`❌ Payment failed webhook processed: ${payment.id}`);
  } catch (error: any) {
    logger.error('❌ Handle payment failed error:', error);
  }
}

/**
 * Update payment status (webhook/callback)
 * POST /api/payments/callback
 * Public endpoint for payment gateway callbacks
 */
export const paymentCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId, status, responseCode, responseMessage, bankReference, gatewayData } = req.body;

    if (!transactionId || !status) {
      res.status(400).json({
        success: false,
        message: 'Transaction ID and status are required',
      });
      return;
    }

    const transaction = await UPITransaction.findOne({ transactionId });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // Update transaction status
    await transaction.updateStatus(status, {
      code: responseCode,
      message: responseMessage,
      bankReference,
      gatewayData,
    });

    // Update order payment status
    const order = await Order.findById(transaction.orderId);
    if (order) {
      if (status === TransactionStatus.SUCCESS) {
        order.paymentStatus = PaymentStatus.COMPLETED;
        // Send success notification
        await notificationService.notifyPaymentSuccess(
          transaction.customerId,
          transaction.transactionId,
          transaction.amount,
          order._id.toString()
        );
      } else if (status === TransactionStatus.FAILED || status === TransactionStatus.TIMEOUT) {
        order.paymentStatus = PaymentStatus.FAILED;
        // Send failure notification
        await notificationService.notifyPaymentFailed(
          transaction.customerId,
          transaction.transactionId,
          transaction.amount,
          order._id.toString()
        );
      }
      await order.save();
    }

    logger.info(`✅ Payment callback processed: ${transactionId} - ${status}`);

    res.status(200).json({
      success: true,
      message: 'Payment callback processed successfully',
      data: { transaction },
    });
  } catch (error: any) {
    logger.error('❌ Payment callback error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process payment callback',
    });
  }
};

/**
 * Get transaction by ID
 * GET /api/payments/transaction/:id
 * Requires: Authentication (customer or merchant)
 */
export const getTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;

    const transaction = await UPITransaction.findById(id)
      .populate('customerId', 'email profile.name userType')
      .populate('merchantId', 'email profile.name businessName userType')
      .populate('orderId', 'orderId totalAmount status');

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // Check access permission
    const isCustomer = transaction.customerId._id.toString() === req.user._id.toString();
    const isMerchant = transaction.merchantId._id.toString() === req.user._id.toString();

    if (!isCustomer && !isMerchant) {
      res.status(403).json({
        success: false,
        message: 'You do not have access to this transaction',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { transaction },
    });
  } catch (error: any) {
    logger.error('❌ Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction',
    });
  }
};

/**
 * Get my transactions
 * GET /api/payments/transactions
 * Requires: Authentication
 */
export const getMyTransactions = async (req: Request, res: Response): Promise<void> => {
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
    } else if (req.user.userType === 'RETAILER' || req.user.userType === 'WHOLESALER') {
      query.merchantId = req.user._id;
    } else {
      res.status(403).json({
        success: false,
        message: 'Invalid user type for transactions',
      });
      return;
    }

    if (status) {
      query.status = status;
    }

    const [transactions, total] = await Promise.all([
      UPITransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('customerId', 'email profile.name userType')
        .populate('merchantId', 'email businessName userType')
        .populate('orderId', 'orderId totalAmount')
        .select('-gatewayResponseData -__v'),
      UPITransaction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    logger.error('❌ Get my transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transactions',
    });
  }
};

/**
 * Initiate refund
 * POST /api/payments/refund
 * Requires: RETAILER or WHOLESALER role
 */
export const initiateRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { transactionId, amount, reason } = req.body;

    if (!transactionId || !amount || !reason) {
      res.status(400).json({
        success: false,
        message: 'Transaction ID, amount, and reason are required',
      });
      return;
    }

    const transaction = await UPITransaction.findOne({ transactionId });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // Check if merchant owns this transaction
    if (transaction.merchantId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only refund your own transactions',
      });
      return;
    }

    // Initiate refund
    await transaction.initiateRefund(amount, reason);

    // Update order payment status
    const order = await Order.findById(transaction.orderId);
    if (order) {
      order.paymentStatus = PaymentStatus.REFUND_INITIATED;
      await order.save();
    }

    logger.info(`✅ Refund initiated: ${transaction.refund?.refundId} for ${transactionId}`);

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      data: { transaction },
    });
  } catch (error: any) {
    logger.error('❌ Initiate refund error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to initiate refund',
    });
  }
};

/**
 * Get payment statistics
 * GET /api/payments/statistics
 * Requires: RETAILER or WHOLESALER role
 */
export const getPaymentStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { startDate, endDate } = req.query;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };
    }

    const [statistics, gatewayStats] = await Promise.all([
      UPITransaction.getStatistics(req.user._id, dateRange),
      UPITransaction.getGatewayStats(req.user._id, dateRange),
    ]);

    res.status(200).json({
      success: true,
      data: {
        statistics,
        gatewayStats,
      },
    });
  } catch (error: any) {
    logger.error('❌ Get payment statistics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment statistics',
    });
  }
};

export default {
  initiatePayment,
  verifyPayment,
  verifyRazorpayPayment,
  markPaymentFailed,
  razorpayWebhook,
  paymentCallback,
  getTransaction,
  getMyTransactions,
  initiateRefund,
  getPaymentStatistics,
};
