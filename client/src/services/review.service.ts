/**
 * Review Service
 * Handles all review-related API calls
 */

import apiClient from './api';
import { ApiResponse } from '../types/auth.types';

export interface Review {
  _id: string;
  reviewId: string;
  userId: {
    _id: string;
    profile: {
      name: string;
      avatar?: string;
    };
  };
  productId: string | {
    _id: string;
    name: string;
    images: string[];
  };
  orderId: string | {
    _id: string;
    orderId: string;
  };
  rating: number;
  title?: string;
  comment?: string;
  images: string[];
  isVerifiedPurchase: boolean;
  isModerated: boolean;
  isApproved: boolean;
  isFlagged: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  retailerResponse?: {
    responderId: string;
    responseText: string;
    responseDate: string;
  };
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
}

export interface CreateReviewData {
  orderId: string;
  productId: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export interface UpdateReviewData {
  rating?: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export interface ReviewFilters {
  rating?: number;
  isVerifiedPurchase?: boolean;
  sort?: 'helpful' | 'recent' | 'rating-high' | 'rating-low';
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchaseCount: number;
}

export interface ReviewListResponse {
  reviews: Review[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalReviews: number;
    limit: number;
  };
  stats?: ReviewStats;
}

export interface ReviewableItem {
  productId: {
    _id: string;
    name: string;
    images: string[];
  };
  name: string;
  quantity: number;
  unitPrice: number;
  hasReview: boolean;
  reviewId?: string;
}

class ReviewService {
  /**
   * Create a new review (legacy method with URL-based images)
   */
  async createReview(data: CreateReviewData): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.post<ApiResponse<{ review: Review }>>('/reviews', data);
    return response.data;
  }

  /**
   * Create a new review with image file uploads
   */
  async createReviewWithImages(formData: FormData): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.post<ApiResponse<{ review: Review }>>('/reviews', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Get reviews for a product
   */
  async getProductReviews(
    productId: string,
    filters?: ReviewFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<ReviewListResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.rating) params.append('rating', filters.rating.toString());
    if (filters?.isVerifiedPurchase !== undefined) {
      params.append('isVerifiedPurchase', filters.isVerifiedPurchase.toString());
    }
    if (filters?.sort) params.append('sort', filters.sort);

    const response = await apiClient.get<ApiResponse<ReviewListResponse>>(
      `/reviews/product/${productId}?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get current user's reviews
   */
  async getUserReviews(page: number = 1, limit: number = 10): Promise<ApiResponse<ReviewListResponse>> {
    const response = await apiClient.get<ApiResponse<ReviewListResponse>>(
      `/reviews/user?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Get single review by ID
   */
  async getReviewById(reviewId: string): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.get<ApiResponse<{ review: Review }>>(`/reviews/${reviewId}`);
    return response.data;
  }

  /**
   * Update a review (legacy method with URL-based images)
   */
  async updateReview(reviewId: string, data: UpdateReviewData): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.put<ApiResponse<{ review: Review }>>(`/reviews/${reviewId}`, data);
    return response.data;
  }

  /**
   * Update a review with image file uploads
   */
  async updateReviewWithImages(reviewId: string, formData: FormData): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.put<ApiResponse<{ review: Review }>>(`/reviews/${reviewId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/reviews/${reviewId}`);
    return response.data;
  }

  /**
   * Vote review as helpful or not helpful
   */
  async voteHelpful(reviewId: string, isHelpful: boolean): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.post<ApiResponse<{ review: Review }>>(
      `/reviews/${reviewId}/helpful`,
      { isHelpful }
    );
    return response.data;
  }

  /**
   * Flag review as inappropriate
   */
  async flagReview(reviewId: string, reason: string): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.post<ApiResponse<{ review: Review }>>(
      `/reviews/${reviewId}/flag`,
      { reason }
    );
    return response.data;
  }

  /**
   * Add retailer response to review
   */
  async addRetailerResponse(reviewId: string, responseText: string): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.post<ApiResponse<{ review: Review }>>(
      `/reviews/${reviewId}/reply`,
      { responseText }
    );
    return response.data;
  }

  /**
   * Get reviewable items from an order
   */
  async getReviewableItems(orderId: string): Promise<ApiResponse<{ items: ReviewableItem[] }>> {
    const response = await apiClient.get<ApiResponse<{ items: ReviewableItem[] }>>(
      `/orders/${orderId}/reviewable-items`
    );
    return response.data;
  }

  /**
   * Get flagged reviews (Admin only)
   */
  async getFlaggedReviews(page: number = 1, limit: number = 20): Promise<ApiResponse<ReviewListResponse>> {
    const response = await apiClient.get<ApiResponse<ReviewListResponse>>(
      `/reviews/pending-moderation?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Moderate review (Admin only)
   */
  async moderateReview(
    reviewId: string,
    isApproved: boolean,
    moderationNotes?: string
  ): Promise<ApiResponse<{ review: Review }>> {
    const response = await apiClient.put<ApiResponse<{ review: Review }>>(
      `/reviews/${reviewId}/moderate`,
      { isApproved, moderationNotes }
    );
    return response.data;
  }
}

export default new ReviewService();
