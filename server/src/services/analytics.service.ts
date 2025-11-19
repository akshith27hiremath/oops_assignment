/**
 * Analytics Service
 * Business logic for analytics and metrics across all user types
 */

import mongoose from 'mongoose';
import Order, { OrderStatus } from '../models/Order.model';
import WholesalerOrder, { WholesalerOrderStatus } from '../models/WholesalerOrder.model';
import Product from '../models/Product.model';
import logger from '../utils/logger';

class AnalyticsService {
  /**
   * Get customer analytics (spending, orders, favorite products)
   */
  async getCustomerAnalytics(customerId: string | mongoose.Types.ObjectId, startDate?: Date, endDate?: Date) {
    try {
      const matchStage: any = {
        customerId: new mongoose.Types.ObjectId(customerId as string),
        status: { $in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
      };

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = startDate;
        if (endDate) matchStage.createdAt.$lte = endDate;
      }

      // Get order metrics
      const orderMetrics = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' },
          },
        },
      ]);

      // Get monthly spending chart data
      const monthlyData = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]);

      // Get top products
      const topProducts = await Order.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalOrders: { $sum: 1 },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.subtotal' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        {
          $project: {
            name: '$product.name',
            orders: '$totalOrders',
            quantity: '$totalQuantity',
            revenue: '$totalRevenue',
          },
        },
      ]);

      const metrics = orderMetrics[0] || {
        totalOrders: 0,
        totalSpent: 0,
        avgOrderValue: 0,
      };

      return {
        metrics: {
          totalOrders: metrics.totalOrders,
          totalSpent: metrics.totalSpent,
          averageOrderValue: metrics.avgOrderValue || 0,
        },
        chartData: monthlyData.map(item => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          revenue: item.revenue,
          orders: item.orders,
        })),
        topProducts,
      };
    } catch (error: any) {
      logger.error(`❌ Get customer analytics error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get retailer analytics (B2C sales, inventory, customers)
   */
  async getRetailerAnalytics(retailerId: string | mongoose.Types.ObjectId, startDate?: Date, endDate?: Date) {
    try {
      const retailerIdObj = new mongoose.Types.ObjectId(retailerId as string);

      // Build match stage for time filtering
      const timeFilter: any = {};
      if (startDate || endDate) {
        timeFilter.createdAt = {};
        if (startDate) timeFilter.createdAt.$gte = startDate;
        if (endDate) timeFilter.createdAt.$lte = endDate;
        logger.info(`📊 Retailer Analytics - Date Range: ${startDate?.toISOString()} to ${endDate?.toISOString()}`);
      } else {
        logger.info(`📊 Retailer Analytics - No date range (ALL TIME)`);
      }

      // Get B2C order metrics (handle both single-retailer and multi-retailer orders)
      const orderMetrics = await Order.aggregate([
        {
          $match: {
            ...timeFilter,
            $or: [
              // Single-retailer order
              { retailerId: retailerIdObj },
              // Multi-retailer order with this retailer in sub-orders
              { 'subOrders.retailerId': retailerIdObj }
            ]
          }
        },
        // Unwind sub-orders for multi-retailer orders
        {
          $addFields: {
            relevantSubOrders: {
              $filter: {
                input: { $ifNull: ['$subOrders', []] },
                as: 'subOrder',
                cond: { $eq: ['$$subOrder.retailerId', retailerIdObj] }
              }
            }
          }
        },
        // Calculate this retailer's portion
        {
          $addFields: {
            retailerRevenue: {
              $cond: {
                if: { $gt: [{ $size: '$relevantSubOrders' }, 0] },
                then: { $sum: '$relevantSubOrders.totalAmount' },
                else: '$totalAmount' // Single-retailer order
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$retailerRevenue' },
            avgOrderValue: { $avg: '$retailerRevenue' },
            uniqueCustomers: { $addToSet: '$customerId' },
          },
        },
      ]);

      // Get previous period for growth calculation
      const previousPeriodEnd = startDate || new Date();
      const periodLength = endDate && startDate
        ? endDate.getTime() - startDate.getTime()
        : 30 * 24 * 60 * 60 * 1000;
      const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);

      const previousMetrics = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: previousPeriodStart, $lt: previousPeriodEnd },
            $or: [
              { retailerId: retailerIdObj },
              { 'subOrders.retailerId': retailerIdObj }
            ]
          },
        },
        {
          $addFields: {
            relevantSubOrders: {
              $filter: {
                input: { $ifNull: ['$subOrders', []] },
                as: 'subOrder',
                cond: { $eq: ['$$subOrder.retailerId', retailerIdObj] }
              }
            }
          }
        },
        {
          $addFields: {
            retailerRevenue: {
              $cond: {
                if: { $gt: [{ $size: '$relevantSubOrders' }, 0] },
                then: { $sum: '$relevantSubOrders.totalAmount' },
                else: '$totalAmount'
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$retailerRevenue' },
            totalOrders: { $sum: 1 },
          },
        },
      ]);

      // Calculate growth
      const current = orderMetrics[0] || { totalRevenue: 0, totalOrders: 0 };
      const previous = previousMetrics[0] || { totalRevenue: 0, totalOrders: 0 };
      const revenueGrowth = previous.totalRevenue > 0
        ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
        : 0;
      const ordersGrowth = previous.totalOrders > 0
        ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100
        : 0;

      // Get daily sales chart data
      const dailyData = await Order.aggregate([
        {
          $match: {
            ...timeFilter,
            $or: [
              { retailerId: retailerIdObj },
              { 'subOrders.retailerId': retailerIdObj }
            ]
          }
        },
        {
          $addFields: {
            relevantSubOrders: {
              $filter: {
                input: { $ifNull: ['$subOrders', []] },
                as: 'subOrder',
                cond: { $eq: ['$$subOrder.retailerId', retailerIdObj] }
              }
            }
          }
        },
        {
          $addFields: {
            retailerRevenue: {
              $cond: {
                if: { $gt: [{ $size: '$relevantSubOrders' }, 0] },
                then: { $sum: '$relevantSubOrders.totalAmount' },
                else: '$totalAmount'
              }
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            revenue: { $sum: '$retailerRevenue' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 30 },
      ]);

      // Get top selling products (from this retailer's sub-orders)
      const topProducts = await Order.aggregate([
        {
          $match: {
            ...timeFilter,
            $or: [
              { retailerId: retailerIdObj },
              { 'subOrders.retailerId': retailerIdObj }
            ]
          }
        },
        // Unwind sub-orders
        {
          $addFields: {
            relevantSubOrders: {
              $filter: {
                input: { $ifNull: ['$subOrders', []] },
                as: 'subOrder',
                cond: { $eq: ['$$subOrder.retailerId', retailerIdObj] }
              }
            }
          }
        },
        // Use items from relevant sub-orders, or main items if single-retailer
        {
          $addFields: {
            itemsToUnwind: {
              $cond: {
                if: { $gt: [{ $size: '$relevantSubOrders' }, 0] },
                then: { $arrayElemAt: ['$relevantSubOrders.items', 0] },
                else: '$items'
              }
            }
          }
        },
        { $unwind: '$itemsToUnwind' },
        {
          $group: {
            _id: '$itemsToUnwind.productId',
            totalSold: { $sum: '$itemsToUnwind.quantity' },
            totalRevenue: { $sum: '$itemsToUnwind.subtotal' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        {
          $project: {
            name: '$product.name',
            sold: '$totalSold',
            revenue: '$totalRevenue',
          },
        },
      ]);

      const metrics = orderMetrics[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        uniqueCustomers: [],
      };

      logger.info(`📊 Retailer Analytics Results - Orders: ${metrics.totalOrders}, Revenue: ₹${metrics.totalRevenue}, Customers: ${metrics.uniqueCustomers.length}`);
      logger.info(`📊 Revenue Growth: ${revenueGrowth.toFixed(1)}%, Orders Growth: ${ordersGrowth.toFixed(1)}%`);

      return {
        metrics: {
          totalRevenue: metrics.totalRevenue,
          totalOrders: metrics.totalOrders,
          averageOrderValue: metrics.avgOrderValue || 0,
          totalCustomers: metrics.uniqueCustomers.length,
          revenueGrowth: Number(revenueGrowth.toFixed(1)),
          ordersGrowth: Number(ordersGrowth.toFixed(1)),
        },
        chartData: dailyData.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          revenue: item.revenue,
          orders: item.orders,
        })),
        topProducts,
      };
    } catch (error: any) {
      logger.error(`❌ Get retailer analytics error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get wholesaler analytics (B2B sales, retailers, orders)
   */
  async getWholesalerAnalytics(wholesalerId: string | mongoose.Types.ObjectId, startDate?: Date, endDate?: Date) {
    try {
      const matchStage: any = {
        wholesalerId: new mongoose.Types.ObjectId(wholesalerId as string),
        status: { $in: [WholesalerOrderStatus.DELIVERED, WholesalerOrderStatus.COMPLETED] },
      };

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = startDate;
        if (endDate) matchStage.createdAt.$lte = endDate;
      }

      // Get B2B order metrics
      const orderMetrics = await WholesalerOrder.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' },
            uniqueRetailers: { $addToSet: '$retailerId' },
          },
        },
      ]);

      // Calculate growth
      const previousPeriodEnd = startDate || new Date();
      const periodLength = endDate && startDate
        ? endDate.getTime() - startDate.getTime()
        : 30 * 24 * 60 * 60 * 1000;
      const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);

      const previousMetrics = await WholesalerOrder.aggregate([
        {
          $match: {
            wholesalerId: new mongoose.Types.ObjectId(wholesalerId as string),
            status: { $in: [WholesalerOrderStatus.DELIVERED, WholesalerOrderStatus.COMPLETED] },
            createdAt: { $gte: previousPeriodStart, $lt: previousPeriodEnd },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]);

      const current = orderMetrics[0] || { totalRevenue: 0 };
      const previous = previousMetrics[0] || { totalRevenue: 0 };
      const revenueGrowth = previous.totalRevenue > 0
        ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
        : 0;

      // Get monthly chart data
      const monthlyData = await WholesalerOrder.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]);

      // Get top retailers by revenue
      const topRetailers = await WholesalerOrder.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$retailerId',
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'retailer',
          },
        },
        { $unwind: '$retailer' },
        {
          $project: {
            name: { $ifNull: ['$retailer.businessName', '$retailer.profile.name'] },
            orders: 1,
            revenue: 1,
          },
        },
      ]);

      const metrics = orderMetrics[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        uniqueRetailers: [],
      };

      return {
        metrics: {
          totalRevenue: metrics.totalRevenue,
          totalOrders: metrics.totalOrders,
          averageOrderValue: metrics.avgOrderValue || 0,
          activeRetailers: metrics.uniqueRetailers.length,
          revenueGrowth: Number(revenueGrowth.toFixed(1)),
        },
        chartData: monthlyData.map(item => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          revenue: item.revenue,
          orders: item.orders,
        })),
        topRetailers,
      };
    } catch (error: any) {
      logger.error(`❌ Get wholesaler analytics error: ${error.message}`);
      throw error;
    }
  }
}

export default new AnalyticsService();
