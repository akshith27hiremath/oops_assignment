/**
 * Profile Service
 * Handles user profile-related API calls
 */

import apiClient from './api';
import { ApiResponse, User } from '../types/auth.types';

export interface UpdateProfileRequest {
  profile?: {
    name?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
  };
  businessName?: string;
  gstin?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateLocationRequest {
  latitude: number;
  longitude: number;
}

class ProfileService {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>('/auth/profile', data);
    return response.data;
  }

  /**
   * Update user password
   */
  async updatePassword(data: UpdatePasswordRequest): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.put<ApiResponse<{ message: string }>>('/auth/password', data);
    return response.data;
  }

  /**
   * Update user location
   */
  async updateLocation(data: UpdateLocationRequest): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>('/auth/location', data);
    return response.data;
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post<ApiResponse<{ avatarUrl: string }>>(
      '/auth/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>('/auth/account', {
      data: { password },
    });
    return response.data;
  }
}

export default new ProfileService();
