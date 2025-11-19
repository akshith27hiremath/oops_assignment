import twilio from 'twilio';
import crypto from 'crypto';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { emailService } from './email.service';

/**
 * OTP Service
 * Handles OTP generation, sending, and verification using SMS or Email
 */

export type OTPMethod = 'sms' | 'email';

interface OTPData {
  code: string;
  identifier: string; // phone or email
  method: OTPMethod;
  expiresAt: number;
  attempts: number;
}

class OTPService {
  private twilioClient: twilio.Twilio | null = null;
  private OTP_EXPIRY_MS: number;
  private OTP_LENGTH: number;
  private MAX_ATTEMPTS = 3;
  private RESEND_COOLDOWN_MS = 60000; // 1 minute

  constructor() {
    // Initialize Twilio client if credentials are provided
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      logger.info('✅ Twilio client initialized');
    } else {
      logger.warn('⚠️  Twilio credentials not configured - OTP service will use mock mode');
    }

    // Get OTP settings from environment
    this.OTP_EXPIRY_MS = (parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60 * 1000);
    this.OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6');
  }

  /**
   * Generate OTP code
   */
  private generateOTP(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    const otp = Math.floor(min + Math.random() * (max - min + 1));
    return otp.toString();
  }

  /**
   * Get Redis key for OTP storage
   */
  private getOTPKey(identifier: string): string {
    return `otp:${identifier}`;
  }

  /**
   * Get Redis key for resend cooldown
   */
  private getResendKey(identifier: string): string {
    return `otp:resend:${identifier}`;
  }

  /**
   * Send OTP via SMS or Email
   */
  async sendOTP(
    identifier: string,
    method: OTPMethod,
    purpose: 'registration' | 'login' = 'registration'
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check resend cooldown
      const resendKey = this.getResendKey(identifier);
      const canResend = await redisClient.get(resendKey);

      if (canResend) {
        return {
          success: false,
          message: 'Please wait before requesting another OTP',
        };
      }

      // Generate OTP
      const code = this.generateOTP();
      const expiresAt = Date.now() + this.OTP_EXPIRY_MS;

      // Store OTP in Redis
      const otpData: OTPData = {
        code,
        identifier,
        method,
        expiresAt,
        attempts: 0,
      };

      const otpKey = this.getOTPKey(identifier);
      await redisClient.setEx(
        otpKey,
        Math.floor(this.OTP_EXPIRY_MS / 1000),
        JSON.stringify(otpData)
      );

      // Set resend cooldown
      await redisClient.setEx(
        resendKey,
        Math.floor(this.RESEND_COOLDOWN_MS / 1000),
        'true'
      );

      // Send OTP based on method
      if (method === 'sms') {
        await this.sendSMS(identifier, code, purpose);
      } else if (method === 'email') {
        await this.sendEmail(identifier, code);
      }

      return {
        success: true,
        message: `OTP sent successfully via ${method}`,
      };
    } catch (error: any) {
      logger.error('❌ Failed to send OTP:', error);
      throw new Error('Failed to send OTP. Please try again.');
    }
  }

  /**
   * Send OTP via SMS (Twilio)
   */
  private async sendSMS(phone: string, code: string, purpose: string): Promise<void> {
    if (this.twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      const message = `Your Live MART verification code is: ${code}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Do not share this code.`;

      await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      logger.info(`✅ OTP SMS sent to ${phone} for ${purpose}`);
    } else {
      // Mock mode for development
      logger.info(`🔐 [MOCK MODE] OTP SMS for ${phone}: ${code}`);
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📱 OTP SMS (MOCK MODE)`);
      console.log(`📞 Phone: ${phone}`);
      console.log(`🔐 Code: ${code}`);
      console.log(`⏰ Expires in: ${process.env.OTP_EXPIRY_MINUTES || 10} minutes`);
      console.log(`${'='.repeat(50)}\n`);
    }
  }

  /**
   * Send OTP via Email
   */
  private async sendEmail(email: string, code: string): Promise<void> {
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
    await emailService.sendOTP(email, code, expiryMinutes);
    logger.info(`✅ OTP email sent to ${email}`);
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(identifier: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const otpKey = this.getOTPKey(identifier);
      const otpDataStr = await redisClient.get(otpKey);

      if (!otpDataStr) {
        return {
          success: false,
          message: 'OTP expired or not found. Please request a new one.',
        };
      }

      const otpData: OTPData = JSON.parse(otpDataStr);

      // Check expiration
      if (Date.now() > otpData.expiresAt) {
        await redisClient.del(otpKey);
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.',
        };
      }

      // Check attempts
      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        await redisClient.del(otpKey);
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.',
        };
      }

      // Verify code
      if (otpData.code !== code) {
        // Increment attempts
        otpData.attempts += 1;
        const remainingTTL = Math.floor((otpData.expiresAt - Date.now()) / 1000);

        if (remainingTTL > 0) {
          await redisClient.setEx(
            otpKey,
            remainingTTL,
            JSON.stringify(otpData)
          );
        }

        const attemptsLeft = this.MAX_ATTEMPTS - otpData.attempts;
        return {
          success: false,
          message: `Invalid OTP code. ${attemptsLeft} attempt(s) remaining.`,
        };
      }

      // OTP verified successfully - delete from Redis
      await redisClient.del(otpKey);
      await redisClient.del(this.getResendKey(identifier));

      logger.info(`✅ OTP verified successfully for ${identifier}`);

      return {
        success: true,
        message: 'OTP verified successfully',
      };
    } catch (error: any) {
      logger.error('❌ Failed to verify OTP:', error);
      throw new Error('Failed to verify OTP. Please try again.');
    }
  }

  /**
   * Check if OTP exists for identifier
   */
  async hasActiveOTP(identifier: string): Promise<boolean> {
    const otpKey = this.getOTPKey(identifier);
    const exists = await redisClient.exists(otpKey);
    return exists === 1;
  }

  /**
   * Delete OTP (useful for cleanup)
   */
  async deleteOTP(identifier: string): Promise<void> {
    const otpKey = this.getOTPKey(identifier);
    await redisClient.del(otpKey);
    await redisClient.del(this.getResendKey(identifier));
  }

  /**
   * Get remaining time for resend cooldown (in seconds)
   */
  async getResendCooldown(identifier: string): Promise<number> {
    const resendKey = this.getResendKey(identifier);
    const ttl = await redisClient.ttl(resendKey);
    return ttl > 0 ? ttl : 0;
  }
}

export const otpService = new OTPService();
export default otpService;
