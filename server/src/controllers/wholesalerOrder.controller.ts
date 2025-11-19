/**
 * WholesalerOrder Controller
 * Handles B2B order-related HTTP requests
 */

import { Request, Response } from 'express';
import wholesalerOrderService from '../services/wholesalerOrder.service';
import b2bInvoiceService from '../services/b2bInvoice.service';
import { WholesalerOrderStatus } from '../models/WholesalerOrder.model';
import logger from '../utils/logger';

class WholesalerOrderController {
  /**
   * Create B2B order (retailer orders from wholesaler)
   * POST /api/b2b/orders
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const retailerId = (req as any).user._id;
      const { wholesalerId, items, deliveryAddress, notes } = req.body;

      // Validation
      if (!wholesalerId || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Wholesaler ID and items are required',
        });
        return;
      }

      if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city) {
        res.status(400).json({
          success: false,
          message: 'Complete delivery address is required',
        });
        return;
      }

      logger.info(`📦 Creating B2B order: retailer=${retailerId}, wholesaler=${wholesalerId}`);

      const order = await wholesalerOrderService.createB2BOrder({
        retailerId,
        wholesalerId,
        items,
        deliveryAddress,
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'B2B order created successfully',
        data: { order },
      });
    } catch (error: any) {
      logger.error('❌ Create B2B order error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create B2B order',
        error: error.message,
      });
    }
  }

  /**
   * Get orders (filtered by user role)
   * GET /api/b2b/orders
   */
  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { status, page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      let result;

      if (user.userType === 'RETAILER') {
        // Retailer sees their orders
        result = await wholesalerOrderService.getRetailerOrders(
          user._id,
          status as WholesalerOrderStatus,
          pageNum,
          limitNum
        );
      } else if (user.userType === 'WHOLESALER') {
        // Wholesaler sees incoming orders
        result = await wholesalerOrderService.getWholesalerOrders(
          user._id,
          status as WholesalerOrderStatus,
          pageNum,
          limitNum
        );
      } else {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('❌ Get B2B orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: error.message,
      });
    }
  }

  /**
   * Get order details by ID
   * GET /api/b2b/orders/:id
   */
  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const order = await wholesalerOrderService.getOrderById(id);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      // Verify user has access to this order
      const retailerId = typeof order.retailerId === 'object' ? order.retailerId._id.toString() : order.retailerId.toString();
      const wholesalerId = typeof order.wholesalerId === 'object' ? order.wholesalerId._id.toString() : order.wholesalerId.toString();

      const isRetailer = retailerId === user._id.toString();
      const isWholesaler = wholesalerId === user._id.toString();

      if (!isRetailer && !isWholesaler) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (error: any) {
      logger.error('❌ Get B2B order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order',
        error: error.message,
      });
    }
  }

  /**
   * Confirm order (wholesaler accepts order)
   * PUT /api/b2b/orders/:id/confirm
   */
  async confirmOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const wholesalerId = (req as any).user._id;

      logger.info(`✅ Confirming B2B order: ${id}`);

      const order = await wholesalerOrderService.confirmOrder(id, wholesalerId);

      res.status(200).json({
        success: true,
        message: 'Order confirmed successfully',
        data: { order },
      });
    } catch (error: any) {
      logger.error('❌ Confirm B2B order error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to confirm order',
        error: error.message,
      });
    }
  }

  /**
   * Update order status (wholesaler updates progress)
   * PUT /api/b2b/orders/:id/status
   */
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const wholesalerId = (req as any).user._id;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status is required',
        });
        return;
      }

      // Validate status
      const validStatuses = Object.values(WholesalerOrderStatus);
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
        return;
      }

      logger.info(`📦 Updating B2B order ${id} status to ${status}`);

      const order = await wholesalerOrderService.updateOrderStatus(
        id,
        status,
        wholesalerId,
        notes
      );

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: { order },
      });
    } catch (error: any) {
      logger.error('❌ Update B2B order status error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update order status',
        error: error.message,
      });
    }
  }

  /**
   * Cancel order (retailer cancels before confirmation)
   * PUT /api/b2b/orders/:id/cancel
   */
  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const retailerId = (req as any).user._id;

      logger.info(`❌ Cancelling B2B order: ${id}`);

      const order = await wholesalerOrderService.cancelOrder(id, retailerId, reason);

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: { order },
      });
    } catch (error: any) {
      logger.error('❌ Cancel B2B order error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel order',
        error: error.message,
      });
    }
  }

  /**
   * Mark order as paid (wholesaler confirms payment received)
   * PUT /api/b2b/orders/:id/mark-paid
   */
  async markOrderAsPaid(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const order = await wholesalerOrderService.markOrderAsPaid(id, user._id);

      res.status(200).json({
        success: true,
        data: { order },
        message: 'Order marked as paid successfully',
      });
    } catch (error: any) {
      logger.error('❌ Mark order as paid error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to mark order as paid',
        error: error.message,
      });
    }
  }

  /**
   * Notify payment sent (retailer notifies wholesaler)
   * PUT /api/b2b/orders/:id/notify-payment-sent
   */
  async notifyPaymentSent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { paymentMethod, transactionReference, notes } = req.body;

      const order = await wholesalerOrderService.notifyPaymentSent(
        id,
        user._id,
        paymentMethod,
        transactionReference,
        notes
      );

      res.status(200).json({
        success: true,
        data: { order },
        message: 'Payment notification sent to wholesaler',
      });
    } catch (error: any) {
      logger.error('❌ Notify payment sent error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to send payment notification',
        error: error.message,
      });
    }
  }

  /**
   * Get wholesaler statistics
   * GET /api/b2b/orders/stats/wholesaler
   */
  async getWholesalerStats(req: Request, res: Response): Promise<void> {
    try {
      const wholesalerId = (req as any).user._id;

      const stats = await wholesalerOrderService.getWholesalerStats(wholesalerId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('❌ Get wholesaler stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: error.message,
      });
    }
  }

  /**
   * Get retailer network with stats
   * GET /api/b2b/retailer-network
   */
  async getRetailerNetwork(req: Request, res: Response): Promise<void> {
    try {
      const wholesalerId = (req as any).user._id;

      logger.info(`📊 Fetching retailer network for wholesaler: ${wholesalerId}`);

      const retailers = await wholesalerOrderService.getRetailerNetwork(wholesalerId);

      res.status(200).json({
        success: true,
        data: {
          retailers,
          totalRetailers: retailers.length,
          activeRetailers: retailers.filter(r => r.isActive).length,
        },
      });
    } catch (error: any) {
      logger.error('❌ Get retailer network error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch retailer network',
        error: error.message,
      });
    }
  }

  /**
   * Generate invoice for completed order
   * POST /api/b2b/orders/:id/generate-invoice
   */
  async generateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      logger.info(`📄 Generating invoice for order: ${id}`);

      const invoiceUrl = await b2bInvoiceService.generateInvoice(id);

      res.status(200).json({
        success: true,
        message: 'Invoice generated successfully',
        data: { invoiceUrl },
      });
    } catch (error: any) {
      logger.error('❌ Generate invoice error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to generate invoice',
        error: error.message,
      });
    }
  }

  /**
   * Download invoice PDF
   * GET /api/b2b/orders/:id/invoice
   */
  async downloadInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      logger.info(`📥 Downloading invoice for order: ${id}`);

      // Get order to check if invoice exists
      const order = await wholesalerOrderService.getOrderById(id);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      // If invoice doesn't exist, generate it
      let invoiceUrl = order.invoiceUrl;
      if (!invoiceUrl || !b2bInvoiceService.invoiceExists(invoiceUrl)) {
        invoiceUrl = await b2bInvoiceService.generateInvoice(id);
      }

      // Get file path and send file
      const filePath = b2bInvoiceService.getInvoicePath(invoiceUrl);
      res.download(filePath, `Invoice-${order.orderNumber}.pdf`, (err) => {
        if (err) {
          logger.error('❌ Download invoice error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Failed to download invoice',
            });
          }
        }
      });
    } catch (error: any) {
      logger.error('❌ Download invoice error:', error);
      if (!res.headersSent) {
        res.status(400).json({
          success: false,
          message: error.message || 'Failed to download invoice',
          error: error.message,
        });
      }
    }
  }
}

export default new WholesalerOrderController();
