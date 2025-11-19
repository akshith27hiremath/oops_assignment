/**
 * Analytics Service
 * Handles all analytics-related API calls
 */

import apiClient from './api';
import { AnalyticsResponse } from '../types/analytics.types';

class AnalyticsService {
  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<AnalyticsResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get<AnalyticsResponse>(
      `/analytics/customer?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get retailer sales analytics
   */
  async getRetailerAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<AnalyticsResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get<AnalyticsResponse>(
      `/analytics/retailer?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get wholesaler analytics
   */
  async getWholesalerAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<AnalyticsResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get<AnalyticsResponse>(
      `/analytics/wholesaler?${params.toString()}`
    );
    return response.data;
  }
}

export default new AnalyticsService();
