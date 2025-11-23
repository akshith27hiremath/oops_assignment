import mongoose from 'mongoose';
import User from '../models/User.model';
import Customer from '../models/Customer.model';
import Retailer from '../models/Retailer.model';
import Wholesaler from '../models/Wholesaler.model';
import { jwtService, TokenPair } from './jwt.service';
import locationService from './location.service';
import { otpService } from './otp.service';
import { logger } from '../utils/logger';

/**
 * Auth Service
 * Handles user registration, login, logout, and token management
 */

export interface RegisterData {
  email: string;
  password: string;
  userType: 'CUSTOMER' | 'RETAILER' | 'WHOLESALER';
  profile: {
    name: string;
    phone: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  businessName?: string;
  gstin?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
  otpMethod?: 'sms' | 'email'; // OTP delivery method for customers
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  /**
   * Register a new user (with OTP verification for customers)
   */
  async register(data: RegisterData): Promise<{ user: any; tokens: TokenPair; requiresOTP?: boolean }> {
    try {
      // Validate password confirmation
      if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // For CUSTOMER registration, require OTP verification
      if (data.userType === 'CUSTOMER') {
        // Log incoming data for debugging
        logger.info(`🔍 Registration data received:`, JSON.stringify(data));
        logger.info(`🔍 Raw data.otpMethod:`, data.otpMethod);
        logger.info(`🔍 Type of data.otpMethod:`, typeof data.otpMethod);
        logger.info(`🔍 All keys in data:`, Object.keys(data));

        // HARDCODE TO EMAIL FOR TESTING
        const otpMethod = 'email'; // FORCED TO EMAIL
        const identifier = data.email;

        logger.info(`🔍 FORCED OTP method: ${otpMethod}, identifier: ${identifier}`);

        // Check if identifier already exists
        if (otpMethod === 'sms' && data.profile.phone) {
          const existingPhone = await User.findOne({ phone: data.profile.phone });
          if (existingPhone) {
            throw new Error('Phone number already registered');
          }
        }

        // Send OTP
        const otpResult = await otpService.sendOTP(identifier, otpMethod, 'registration');
        if (!otpResult.success) {
          throw new Error(otpResult.message);
        }

        logger.info(`📱 OTP sent for customer registration via ${otpMethod}: ${identifier}`);

        // Return indication that OTP is required
        return {
          user: null as any,
          tokens: null as any,
          requiresOTP: true,
        };
      }

      // Create user based on type
      let user;

      // Convert location to GeoJSON format if provided
      const profileData = { ...data.profile };
      logger.info(`🔍 Profile data received:`, JSON.stringify(profileData));
      if (profileData.location && profileData.location.latitude && profileData.location.longitude) {
        logger.info(`✅ Converting location to GeoJSON: lat=${profileData.location.latitude}, lng=${profileData.location.longitude}`);
        (profileData as any).location = locationService.latLngToGeoJson(
          profileData.location.latitude,
          profileData.location.longitude
        );
        logger.info(`✅ GeoJSON location:`, JSON.stringify(profileData.location));
      } else {
        logger.warn(`⚠️ No location data in profile or invalid format`);
      }

      const baseData = {
        email: data.email,
        password: data.password, // Will be hashed by pre-save hook
        phone: data.profile.phone, // Add phone to baseData
        userType: data.userType,
        profile: profileData,
        isActive: true,
      };

      switch (data.userType) {
        case 'CUSTOMER':
          user = await Customer.create(baseData);
          break;

        case 'RETAILER':
          if (!data.businessName) {
            throw new Error('Business name is required for retailers');
          }
          user = await Retailer.create({
            ...baseData,
            businessName: data.businessName,
            gstin: data.gstin,
            store: {
              name: data.businessName,
              isVerified: false,
            },
          });
          break;

        case 'WHOLESALER':
          if (!data.businessName || !data.gstin) {
            throw new Error('Business name and GSTIN are required for wholesalers');
          }
          if (!data.bankDetails) {
            throw new Error('Bank details are required for wholesalers');
          }
          user = await Wholesaler.create({
            ...baseData,
            businessName: data.businessName,
            gstin: data.gstin,
            bankDetails: data.bankDetails,
            minimumOrderValue: 1000, // Default minimum order
          });
          break;

        default:
          throw new Error('Invalid user type');
      }

      // Generate tokens
      const userId = (user._id as mongoose.Types.ObjectId).toString();
      const tokens = jwtService.generateTokenPair({
        userId,
        email: user.email,
        userType: user.userType as 'CUSTOMER' | 'RETAILER' | 'WHOLESALER',
      });

      // Store refresh token in Redis
      await jwtService.storeRefreshToken(userId, tokens.refreshToken);

      logger.info(`✅ New user registered: ${user.email} (${user.userType})`);

      // Remove password from response
      const userObject = user.toObject();
      if (userObject.password) {
        delete userObject.password;
      }

      return {
        user: userObject,
        tokens,
      };
    } catch (error: any) {
      logger.error('❌ Registration error:', error);
      throw error;
    }
  }

  /**
   * Complete customer registration after OTP verification
   */
  async completeRegistration(data: RegisterData, otpCode: string): Promise<{ user: any; tokens: TokenPair }> {
    try {
      // HARDCODED: Determine identifier based on email method (for now)
      const identifier = data.email; // FORCED TO EMAIL FOR NOW

      // Verify OTP
      const otpResult = await otpService.verifyOTP(identifier, otpCode);
      if (!otpResult.success) {
        throw new Error(otpResult.message);
      }

      // Check again if user already exists
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Convert location to GeoJSON format if provided
      const profileData = { ...data.profile };
      if (profileData.location && profileData.location.latitude && profileData.location.longitude) {
        (profileData as any).location = locationService.latLngToGeoJson(
          profileData.location.latitude,
          profileData.location.longitude
        );
      }

      // Create customer user (OTP verified)
      const user = await Customer.create({
        email: data.email,
        password: data.password,
        phone: data.profile.phone,
        userType: 'CUSTOMER',
        profile: profileData,
        isActive: true,
        isVerified: true, // Mark as verified since OTP is confirmed
        phoneVerifiedAt: new Date(),
      });

      // Generate tokens
      const userId = (user._id as mongoose.Types.ObjectId).toString();
      const tokens = jwtService.generateTokenPair({
        userId,
        email: user.email,
        userType: user.userType as 'CUSTOMER',
      });

      // Store refresh token in Redis
      await jwtService.storeRefreshToken(userId, tokens.refreshToken);

      logger.info(`✅ Customer registration completed: ${user.email} (OTP verified)`);

      // Remove password from response
      const userObject = user.toObject();
      if (userObject.password) {
        delete userObject.password;
      }

      return {
        user: userObject,
        tokens,
      };
    } catch (error: any) {
      logger.error('❌ Complete registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<{ user: any; tokens: TokenPair }> {
    try {
      // Find user by email (must select password field explicitly)
      const user = await User.findOne({ email: data.email }).select('+password');
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(data.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const userId = (user._id as mongoose.Types.ObjectId).toString();
      const tokens = jwtService.generateTokenPair({
        userId,
        email: user.email,
        userType: user.userType as 'CUSTOMER' | 'RETAILER' | 'WHOLESALER',
      });

      // Store refresh token in Redis
      await jwtService.storeRefreshToken(userId, tokens.refreshToken);

      logger.info(`✅ User logged in: ${user.email} (${user.userType})`);

      // Remove password from response
      const userObject = user.toObject();
      if (userObject.password) {
        delete userObject.password;
      }

      return {
        user: userObject,
        tokens,
      };
    } catch (error: any) {
      logger.error('❌ Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const payload = jwtService.verifyRefreshToken(refreshToken);

      // Check if refresh token is stored in Redis
      const storedToken = await jwtService.getRefreshToken(payload.userId);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Verify user still exists and is active
      const user = await User.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new token pair
      const userId = (user._id as mongoose.Types.ObjectId).toString();
      const tokens = jwtService.generateTokenPair({
        userId,
        email: user.email,
        userType: user.userType as 'CUSTOMER' | 'RETAILER' | 'WHOLESALER',
      });

      // Update stored refresh token
      await jwtService.storeRefreshToken(userId, tokens.refreshToken);

      logger.info(`✅ Token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error: any) {
      logger.error('❌ Refresh token error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, accessToken: string): Promise<void> {
    try {
      // Blacklist the access token
      await jwtService.blacklistToken(accessToken);

      // Delete refresh token from Redis
      await jwtService.deleteRefreshToken(userId);

      logger.info(`✅ User logged out: ${userId}`);
    } catch (error: any) {
      logger.error('❌ Logout error:', error);
      throw error;
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    try {
      // Delete all refresh tokens for the user
      await jwtService.deleteAllRefreshTokens(userId);

      logger.info(`✅ User logged out from all devices: ${userId}`);
    } catch (error: any) {
      logger.error('❌ Logout all error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error: any) {
      logger.error('❌ Get user error:', error);
      throw error;
    }
  }

  /**
   * Verify email (placeholder for future implementation)
   */
  async verifyEmail(token: string): Promise<void> {
    // TODO: Implement email verification
    throw new Error('Email verification not implemented yet');
  }

  /**
   * Request password reset (placeholder for future implementation)
   */
  async requestPasswordReset(email: string): Promise<void> {
    // TODO: Implement password reset request
    throw new Error('Password reset not implemented yet');
  }

  /**
   * Reset password (placeholder for future implementation)
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // TODO: Implement password reset
    throw new Error('Password reset not implemented yet');
  }
}

// Export singleton instance
export const authService = new AuthService();

export default authService;
