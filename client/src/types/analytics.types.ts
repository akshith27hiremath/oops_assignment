/**
 * Analytics Types
 * Type definitions for analytics and metrics
 */

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

export interface SalesChartData {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  sales: number;
  revenue: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerRetentionRate: number;
}

export interface AnalyticsResponse {
  success: boolean;
  message: string;
  data: {
    metrics: SalesMetrics;
    chartData: SalesChartData[];
    topProducts: TopProduct[];
    customerMetrics: CustomerMetrics;
  };
}
