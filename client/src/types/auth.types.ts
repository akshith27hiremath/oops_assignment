/**
 * Authentication Types
 * Type definitions for authentication and user data
 */

export enum UserType {
  CUSTOMER = 'CUSTOMER',
  RETAILER = 'RETAILER',
  WHOLESALER = 'WHOLESALER',
}

export interface User {
  _id: string;
  email: string;
  userType: UserType;
  profile: {
    name: string;
    avatar?: string | null;
    bio?: string;
    preferences: {
      categories: string[];
      deliveryRadius: number;
      language: string;
      currency: string;
      notificationSettings: {
        emailEnabled: boolean;
        smsEnabled: boolean;
        pushEnabled: boolean;
        orderUpdates: boolean;
        promotions: boolean;
      };
    };
  };
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;

  // Customer-specific fields
  wishlist?: string[];
  orderHistory?: string[];
  loyaltyPoints?: number;
  cart?: string | null;

  // Retailer/Wholesaler-specific fields
  businessName?: string;
  gstin?: string;
  store?: {
    name: string;
    operatingHours: Record<string, any>;
    rating: number;
    reviewCount: number;
    deliveryRadius: number;
    isOpen: boolean;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User | null; // Allow null when OTP is required
    tokens: AuthTokens | null; // Allow null when OTP is required
  };
  requiresOTP?: boolean; // Flag for customer OTP verification
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  userType: UserType;
  profile: {
    name: string;
    phone: string;
  };
  businessName?: string;
  gstin?: string;
  otpMethod?: 'sms' | 'email'; // OTP delivery method for customers
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface ApiSuccess<T = any> {
  success: true;
  message: string;
  data: T;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;
