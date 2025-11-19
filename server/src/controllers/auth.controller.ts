import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { otpService } from '../services/otp.service';
import { logger } from '../utils/logger';
import User from '../models/User.model';

/**
 * Auth Controller
 * Handles authentication-related requests
 */

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user, tokens, requiresOTP } = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: requiresOTP ? 'OTP sent to your phone number' : 'User registered successfully',
      data: {
        user,
        tokens,
      },
      requiresOTP, // Include the OTP flag in response
    });
  } catch (error: any) {
    logger.error('❌ Registration controller error:', error);

    const statusCode = error.message.includes('already exists') ? 409 : 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user, tokens } = await authService.login(req.body);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        tokens,
      },
    });
  } catch (error: any) {
    logger.error('❌ Login controller error:', error);

    const statusCode = error.message.includes('deactivated') ? 403 : 401;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Login failed',
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens,
      },
    });
  } catch (error: any) {
    logger.error('❌ Refresh token controller error:', error);

    res.status(401).json({
      success: false,
      message: error.message || 'Token refresh failed',
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.token) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    await authService.logout(userId, req.token);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    logger.error('❌ Logout controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Logout failed',
    });
  }
};

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    await authService.logoutAll(userId);

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error: any) {
    logger.error('❌ Logout all controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Logout from all devices failed',
    });
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error: any) {
    logger.error('❌ Get current user controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user info',
    });
  }
};

/**
 * Verify email (placeholder)
 * GET /api/auth/verify-email/:token
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Token is required',
      });
      return;
    }
    await authService.verifyEmail(token);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    logger.error('❌ Email verification controller error:', error);

    res.status(400).json({
      success: false,
      message: error.message || 'Email verification failed',
    });
  }
};

/**
 * Request password reset (placeholder)
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset(email);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error: any) {
    logger.error('❌ Forgot password controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send password reset email',
    });
  }
};

/**
 * Reset password (placeholder)
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    logger.error('❌ Reset password controller error:', error);

    res.status(400).json({
      success: false,
      message: error.message || 'Password reset failed',
    });
  }
};

/**
 * Complete registration after OTP verification
 * POST /api/auth/complete-registration
 */
export const completeRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { otpCode, ...registrationData } = req.body;

    if (!otpCode) {
      res.status(400).json({
        success: false,
        message: 'OTP code is required',
      });
      return;
    }

    const { user, tokens } = await authService.completeRegistration(registrationData, otpCode);

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        user,
        tokens,
      },
    });
  } catch (error: any) {
    logger.error('❌ Complete registration controller error:', error);

    res.status(400).json({
      success: false,
      message: error.message || 'Registration completion failed',
    });
  }
};

/**
 * Send OTP via SMS or Email
 * POST /api/auth/send-otp
 */
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    let { phone, email, method } = req.body;

    // Validate method
    if (!method || (method !== 'sms' && method !== 'email')) {
      res.status(400).json({
        success: false,
        message: 'Method is required and must be either "sms" or "email"',
      });
      return;
    }

    let identifier: string;

    if (method === 'sms') {
      if (!phone) {
        res.status(400).json({
          success: false,
          message: 'Phone number is required for SMS OTP',
        });
        return;
      }

      // Normalize phone to international format
      if (/^[0-9]{10}$/.test(phone)) {
        // Indian 10-digit number without country code
        phone = `+91${phone}`;
      } else if (/^[1-9]\d{1,14}$/.test(phone)) {
        // Number without + prefix
        phone = `+${phone}`;
      } else if (!/^\+?[1-9]\d{1,14}$/.test(phone)) {
        // Invalid format
        res.status(400).json({
          success: false,
          message: 'Invalid phone number format',
        });
        return;
      }

      identifier = phone;
    } else {
      // method === 'email'
      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email address is required for email OTP',
        });
        return;
      }

      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email address format',
        });
        return;
      }

      identifier = email;
    }

    const result = await otpService.sendOTP(identifier, method, 'registration');

    if (!result.success) {
      res.status(429).json({
        success: false,
        message: result.message,
      });
      return;
    }

    logger.info(`✅ OTP sent to ${identifier} via ${method}`);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60, // seconds
        method,
      },
    });
  } catch (error: any) {
    logger.error('❌ Send OTP controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP',
    });
  }
};

/**
 * Verify OTP code
 * POST /api/auth/verify-otp
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, email, code } = req.body;

    const identifier = phone || email;

    if (!identifier || !code) {
      res.status(400).json({
        success: false,
        message: 'Phone number or email and OTP code are required',
      });
      return;
    }

    const result = await otpService.verifyOTP(identifier, code);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message,
      });
      return;
    }

    logger.info(`✅ OTP verified for ${identifier}`);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    logger.error('❌ Verify OTP controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify OTP',
    });
  }
};

/**
 * Resend OTP code
 * POST /api/auth/resend-otp
 */
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    let { phone, email, method } = req.body;

    // Validate method
    if (!method || (method !== 'sms' && method !== 'email')) {
      res.status(400).json({
        success: false,
        message: 'Method is required and must be either "sms" or "email"',
      });
      return;
    }

    let identifier: string;

    if (method === 'sms') {
      if (!phone) {
        res.status(400).json({
          success: false,
          message: 'Phone number is required for SMS OTP',
        });
        return;
      }

      // Normalize phone to international format
      if (/^[0-9]{10}$/.test(phone)) {
        phone = `+91${phone}`;
      } else if (/^[1-9]\d{1,14}$/.test(phone)) {
        phone = `+${phone}`;
      }

      identifier = phone;
    } else {
      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email address is required for email OTP',
        });
        return;
      }
      identifier = email;
    }

    // Check cooldown
    const cooldown = await otpService.getResendCooldown(identifier);
    if (cooldown > 0) {
      res.status(429).json({
        success: false,
        message: `Please wait ${cooldown} seconds before requesting another OTP`,
        data: {
          retryAfter: cooldown,
        },
      });
      return;
    }

    const result = await otpService.sendOTP(identifier, method, 'registration');

    if (!result.success) {
      res.status(429).json({
        success: false,
        message: result.message,
      });
      return;
    }

    logger.info(`✅ OTP resent to ${identifier} via ${method}`);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60, // seconds
        method,
      },
    });
  } catch (error: any) {
    logger.error('❌ Resend OTP controller error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resend OTP',
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    const updateData = req.body;

    // Find and update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    logger.info(`✅ Profile updated for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error: any) {
    logger.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile',
    });
  }
};

/**
 * Update user password
 * PUT /api/auth/password
 */
export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        message: 'All password fields are required',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        message: 'New passwords do not match',
      });
      return;
    }

    const userId = (req.user as any)._id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`✅ Password updated for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error: any) {
    logger.error('❌ Update password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update password',
    });
  }
};

/**
 * Update user location
 * PUT /api/auth/location
 */
export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
      return;
    }

    const userId = (req.user as any)._id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Update location in GeoJSON format
    user.profile.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    } as any;

    await user.save();

    logger.info(`✅ Location updated for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: { user },
    });
  } catch (error: any) {
    logger.error('❌ Update location error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update location',
    });
  }
};

export default {
  register,
  completeRegistration,
  login,
  refreshToken,
  logout,
  logoutAll,
  getCurrentUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  sendOTP,
  verifyOTP,
  resendOTP,
  updateProfile,
  updatePassword,
  updateLocation,
};
