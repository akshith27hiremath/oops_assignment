/**
 * Razorpay Payment Service
 * Handles all Razorpay payment gateway operations
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../utils/logger';

class RazorpayService {
  private razorpay: Razorpay;
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    if (!this.keyId || !this.keySecret) {
      logger.warn('⚠️  Razorpay credentials not found. Payment functionality will be limited.');
    }

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });

    logger.info('✅ Razorpay service initialized');
  }

  /**
   * Create Razorpay order
   */
  async createOrder(params: {
    amount: number; // in INR (will be converted to paise)
    currency?: string;
    receipt: string; // Order ID
    notes?: Record<string, any>;
  }): Promise<any> {
    try {
      const options = {
        amount: Math.round(params.amount * 100), // Convert to paise
        currency: params.currency || 'INR',
        receipt: params.receipt,
        notes: params.notes || {},
      };

      const order = await this.razorpay.orders.create(options);

      logger.info(`✅ Razorpay order created: ${order.id} for amount ₹${params.amount}`);

      return order;
    } catch (error: any) {
      logger.error('❌ Razorpay create order error:', error);
      throw new Error(error.message || 'Failed to create Razorpay order');
    }
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    try {
      const { orderId, paymentId, signature } = params;

      // Generate expected signature
      const text = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(text)
        .digest('hex');

      const isValid = expectedSignature === signature;

      if (isValid) {
        logger.info(`✅ Payment signature verified: ${paymentId}`);
      } else {
        logger.warn(`⚠️  Invalid payment signature: ${paymentId}`);
      }

      return isValid;
    } catch (error: any) {
      logger.error('❌ Verify signature error:', error);
      return false;
    }
  }

  /**
   * Fetch payment details
   */
  async fetchPayment(paymentId: string): Promise<any> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);

      logger.info(`✅ Payment fetched: ${paymentId} - ${payment.status}`);

      return payment;
    } catch (error: any) {
      logger.error('❌ Fetch payment error:', error);
      throw new Error(error.message || 'Failed to fetch payment details');
    }
  }

  /**
   * Fetch order details
   */
  async fetchOrder(orderId: string): Promise<any> {
    try {
      const order = await this.razorpay.orders.fetch(orderId);

      logger.info(`✅ Order fetched: ${orderId} - ${order.status}`);

      return order;
    } catch (error: any) {
      logger.error('❌ Fetch order error:', error);
      throw new Error(error.message || 'Failed to fetch order details');
    }
  }

  /**
   * Capture payment (for authorized payments)
   */
  async capturePayment(paymentId: string, amount: number): Promise<any> {
    try {
      const amountInPaise = Math.round(amount * 100);

      const payment = await this.razorpay.payments.capture(paymentId, amountInPaise, 'INR');

      logger.info(`✅ Payment captured: ${paymentId} - ₹${amount}`);

      return payment;
    } catch (error: any) {
      logger.error('❌ Capture payment error:', error);
      throw new Error(error.message || 'Failed to capture payment');
    }
  }

  /**
   * Create refund
   */
  async createRefund(params: {
    paymentId: string;
    amount?: number; // Optional - full refund if not specified
    notes?: Record<string, any>;
  }): Promise<any> {
    try {
      const options: any = {
        notes: params.notes || {},
      };

      if (params.amount) {
        options.amount = Math.round(params.amount * 100); // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(params.paymentId, options);

      logger.info(`✅ Refund created: ${refund.id} for payment ${params.paymentId}`);

      return refund;
    } catch (error: any) {
      logger.error('❌ Create refund error:', error);
      throw new Error(error.message || 'Failed to create refund');
    }
  }

  /**
   * Fetch refund details
   */
  async fetchRefund(paymentId: string, refundId: string): Promise<any> {
    try {
      const refund = await this.razorpay.payments.fetchRefund(paymentId, refundId);

      logger.info(`✅ Refund fetched: ${refundId} - ${refund.status}`);

      return refund;
    } catch (error: any) {
      logger.error('❌ Fetch refund error:', error);
      throw new Error(error.message || 'Failed to fetch refund details');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

      if (!webhookSecret) {
        logger.warn('⚠️  Webhook secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      const isValid = expectedSignature === signature;

      if (isValid) {
        logger.info('✅ Webhook signature verified');
      } else {
        logger.warn('⚠️  Invalid webhook signature');
      }

      return isValid;
    } catch (error: any) {
      logger.error('❌ Verify webhook signature error:', error);
      return false;
    }
  }

  /**
   * Get Razorpay key ID (for frontend)
   */
  getKeyId(): string {
    return this.keyId;
  }

  /**
   * Check if Razorpay is configured
   */
  isConfigured(): boolean {
    return !!(this.keyId && this.keySecret);
  }
}

export default new RazorpayService();
