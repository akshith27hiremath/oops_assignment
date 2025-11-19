/**
 * Analytics Controller
 * Handles analytics-related HTTP requests for all user types
 */

import { Request, Response } from 'express';
import analyticsService from '../services/analytics.service';
import logger from '../utils/logger';

class AnalyticsController {
  /**
   * Get customer analytics
   * GET /api/analytics/customer
   */
  async getCustomerAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const customerId = (req as any).user._id;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      logger.info(`📊 Fetching customer analytics for: ${customerId}`);

      const analytics = await analyticsService.getCustomerAnalytics(customerId, start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      logger.error('❌ Get customer analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch customer analytics',
        error: error.message,
      });
    }
  }

  /**
   * Get retailer analytics
   * GET /api/analytics/retailer
   */
  async getRetailerAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const retailerId = (req as any).user._id;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      if (start || end) {
        logger.info(`📊 Fetching retailer analytics for: ${retailerId} (Date range: ${start?.toISOString()} to ${end?.toISOString()})`);
      } else {
        logger.info(`📊 Fetching retailer analytics for: ${retailerId} (All time - Dashboard preview)`);
      }

      const analytics = await analyticsService.getRetailerAnalytics(retailerId, start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      logger.error('❌ Get retailer analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch retailer analytics',
        error: error.message,
      });
    }
  }

  /**
   * Get wholesaler analytics
   * GET /api/analytics/wholesaler
   */
  async getWholesalerAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const wholesalerId = (req as any).user._id;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      logger.info(`📊 Fetching wholesaler analytics for: ${wholesalerId}`);

      const analytics = await analyticsService.getWholesalerAnalytics(wholesalerId, start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      logger.error('❌ Get wholesaler analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wholesaler analytics',
        error: error.message,
      });
    }
  }
}

export default new AnalyticsController();
