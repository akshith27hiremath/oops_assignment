/**
 * Auth Service
 * Handles all authentication-related API calls
 */

import apiClient from './api';
import {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
  AuthResponse,
  ApiResponse,
  User,
} from '../types/auth.types';

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    console.log('🚀 Auth service sending data:', data);
    console.log('🚀 otpMethod in data:', (data as any).otpMethod);
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);

    // Save tokens to localStorage
    if (response.data.success && response.data.data.tokens) {
      localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }

    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/auth/logout');

      // Clear localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      return response.data;
    } catch (error) {
      // Clear localStorage even if request fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      throw error;
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>('/auth/forgot-password', data);
    return response.data;
  }

  /**
   * Reset password
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>('/auth/reset-password', data);
    return response.data;
  }

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', data);

    // Save new tokens to localStorage
    if (response.data.success && response.data.data.tokens) {
      localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
    }

    return response.data;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');

    // Update user in localStorage
    if (response.data.success && response.data.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }

    return response.data;
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<ApiResponse> {
    const response = await apiClient.get<ApiResponse>(`/auth/verify-email/${token}`);
    return response.data;
  }

  /**
   * Send OTP via SMS or Email
   */
  async sendOTP(
    identifier: string,
    method: 'sms' | 'email'
  ): Promise<ApiResponse<{ expiresIn: number; method: string }>> {
    const payload = method === 'sms' ? { phone: identifier, method } : { email: identifier, method };
    const response = await apiClient.post<ApiResponse<{ expiresIn: number; method: string }>>(
      '/auth/send-otp',
      payload
    );
    return response.data;
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(identifier: string, code: string, method: 'sms' | 'email'): Promise<ApiResponse> {
    const payload = method === 'sms' ? { phone: identifier, code } : { email: identifier, code };
    const response = await apiClient.post<ApiResponse>('/auth/verify-otp', payload);
    return response.data;
  }

  /**
   * Resend OTP code
   */
  async resendOTP(
    identifier: string,
    method: 'sms' | 'email'
  ): Promise<ApiResponse<{ expiresIn: number; method: string }>> {
    const payload = method === 'sms' ? { phone: identifier, method } : { email: identifier, method };
    const response = await apiClient.post<ApiResponse<{ expiresIn: number; method: string }>>(
      '/auth/resend-otp',
      payload
    );
    return response.data;
  }

  /**
   * Complete registration after OTP verification
   */
  async completeRegistration(data: RegisterRequest & { otpCode: string }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/complete-registration', data);

    // Save tokens to localStorage
    if (response.data.success && response.data.data.tokens) {
      localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }

    return response.data;
  }

  /**
   * Get stored user from localStorage
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = this.getStoredUser();
    return Boolean(token && user);
  }
}

export default new AuthService();
