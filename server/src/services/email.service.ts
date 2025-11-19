import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

/**
 * Email Service
 * Handles email sending using Nodemailer (supports Gmail, SendGrid, etc.)
 */

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'noreply@livemart.com';
    this.fromName = process.env.EMAIL_FROM_NAME || process.env.SENDGRID_FROM_NAME || 'Live MART';

    // Try to configure email transporter
    this.configureTransporter();
  }

  private configureTransporter() {
    // Option 1: Gmail configuration
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });
      this.isConfigured = true;
      this.fromEmail = gmailUser;
      logger.info('✅ Email service initialized with Gmail');
      return;
    }

    // Option 2: Generic SMTP configuration
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: parseInt(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.isConfigured = true;
      logger.info('✅ Email service initialized with SMTP');
      return;
    }

    logger.warn('⚠️  Email credentials not configured - Email service will use mock mode');
    logger.info('💡 To enable emails, set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  }

  /**
   * Send OTP email
   */
  async sendOTP(email: string, code: string, expiryMinutes: number = 10): Promise<{ success: boolean; message: string }> {
    try {
      const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #f9f9f9;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 28px;
                font-weight: bold;
                color: #16a34a;
              }
              .otp-box {
                background-color: #ffffff;
                border: 2px solid #16a34a;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
              }
              .otp-code {
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #16a34a;
                margin: 10px 0;
              }
              .warning {
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🛒 Live MART</div>
                <p style="color: #666; margin-top: 10px;">Verification Code</p>
              </div>

              <p>Hello,</p>
              <p>You have requested a verification code for your Live MART account. Use the code below to complete your verification:</p>

              <div class="otp-box">
                <p style="margin: 0; color: #666; font-size: 14px;">Your Verification Code</p>
                <div class="otp-code">${code}</div>
                <p style="margin: 0; color: #666; font-size: 12px;">Valid for ${expiryMinutes} minutes</p>
              </div>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                Do not share this code with anyone. Live MART will never ask you for this code via phone or email.
              </div>

              <p>If you didn't request this code, please ignore this email or contact our support team if you have concerns.</p>

              <div class="footer">
                <p>© ${new Date().getFullYear()} Live MART. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `;

      const textContent = `Your verification code is: ${code}. This code will expire in ${expiryMinutes} minutes. Do not share this code with anyone.`;

      if (this.isConfigured && this.transporter) {
        const mailOptions = {
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to: email,
          subject: 'Your Live MART Verification Code',
          text: textContent,
          html: htmlContent,
        };

        await this.transporter.sendMail(mailOptions);
        logger.info(`✅ OTP email sent to ${email}`);
      } else {
        // Mock mode for development
        logger.info(`📧 [MOCK MODE] OTP Email to ${email}: ${code}`);
        console.log(`\n${'='.repeat(50)}`);
        console.log(`📧 OTP EMAIL (MOCK MODE)`);
        console.log(`📨 To: ${email}`);
        console.log(`🔐 Code: ${code}`);
        console.log(`⏰ Expires in: ${expiryMinutes} minutes`);
        console.log(`${'='.repeat(50)}\n`);
      }

      return {
        success: true,
        message: 'OTP email sent successfully',
      };
    } catch (error: any) {
      logger.error('❌ Failed to send OTP email:', error);
      throw new Error('Failed to send OTP email. Please try again.');
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject: 'Welcome to Live MART!',
        text: `Welcome to Live MART, ${name}! We're excited to have you on board.`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { font-size: 28px; font-weight: bold; color: #16a34a; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🛒 Live MART</div>
              </div>
              <h2>Welcome, ${name}!</h2>
              <p>Thank you for joining Live MART. We're excited to have you as part of our community.</p>
              <p>Start exploring our platform and discover amazing products from local sellers.</p>
            </div>
          </body>
          </html>
        `,
      };

      if (this.isConfigured && this.transporter) {
        await this.transporter.sendMail(mailOptions);
        logger.info(`✅ Welcome email sent to ${email}`);
      } else {
        logger.info(`📧 [MOCK MODE] Welcome email to ${email}`);
      }
    } catch (error: any) {
      logger.error('❌ Failed to send welcome email:', error);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    try {
      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject: 'Reset Your Live MART Password',
        text: `Click the following link to reset your password: ${resetUrl}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #16a34a;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Reset Your Password</h2>
              <p>Click the button below to reset your Live MART password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>If you didn't request this, please ignore this email.</p>
              <p>This link will expire in 1 hour.</p>
            </div>
          </body>
          </html>
        `,
      };

      if (this.isConfigured && this.transporter) {
        await this.transporter.sendMail(mailOptions);
        logger.info(`✅ Password reset email sent to ${email}`);
      } else {
        logger.info(`📧 [MOCK MODE] Password reset email to ${email}`);
        console.log(`Reset URL: ${resetUrl}`);
      }
    } catch (error: any) {
      logger.error('❌ Failed to send password reset email:', error);
    }
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    email: string,
    title: string,
    message: string,
    type: string,
    link?: string
  ): Promise<void> {
    try {
      // Map notification types to icons and colors
      const typeConfig: Record<string, { icon: string; color: string; emoji: string }> = {
        ORDER_PLACED: { icon: '📦', color: '#16a34a', emoji: '✅' },
        ORDER_CONFIRMED: { icon: '✅', color: '#16a34a', emoji: '✓' },
        ORDER_PROCESSING: { icon: '⚙️', color: '#3b82f6', emoji: '🔄' },
        ORDER_SHIPPED: { icon: '🚚', color: '#3b82f6', emoji: '📮' },
        ORDER_DELIVERED: { icon: '🎉', color: '#16a34a', emoji: '🎁' },
        ORDER_CANCELLED: { icon: '❌', color: '#ef4444', emoji: '✖' },
        PAYMENT_RECEIVED: { icon: '💰', color: '#16a34a', emoji: '💳' },
        PAYMENT_FAILED: { icon: '⚠️', color: '#ef4444', emoji: '⚠' },
        LOW_STOCK: { icon: '⚠️', color: '#f59e0b', emoji: '📉' },
        NEW_REVIEW: { icon: '⭐', color: '#f59e0b', emoji: '💬' },
        REVIEW_RESPONSE: { icon: '💬', color: '#3b82f6', emoji: '↩' },
        ACCOUNT_UPDATE: { icon: 'ℹ️', color: '#3b82f6', emoji: 'ℹ' },
        PROMOTION: { icon: '🎁', color: '#8b5cf6', emoji: '🎉' },
        SYSTEM: { icon: '🔔', color: '#6b7280', emoji: '📢' },
      };

      const config = typeConfig[type] || typeConfig.SYSTEM;
      const actionButton = link
        ? `<a href="${link}" class="button" style="background-color: ${config.color};">View Details</a>`
        : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #16a34a;
            }
            .notification-box {
              background-color: #ffffff;
              border-left: 4px solid ${config.color};
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .notification-title {
              font-size: 20px;
              font-weight: bold;
              color: ${config.color};
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .notification-message {
              color: #555;
              font-size: 15px;
              line-height: 1.8;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🛒 Live MART</div>
              <p style="color: #666; margin-top: 10px;">Notification</p>
            </div>

            <div class="notification-box">
              <div class="notification-title">
                <span>${config.icon}</span>
                <span>${title}</span>
              </div>
              <div class="notification-message">
                ${message}
              </div>
            </div>

            ${actionButton}

            <div class="footer">
              <p>© ${new Date().getFullYear()} Live MART. All rights reserved.</p>
              <p>You received this email because you have an account with us.</p>
              <p>To manage your notification preferences, visit your account settings.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `${config.emoji} ${title}\n\n${message}${link ? `\n\nView details: ${link}` : ''}`;

      if (this.isConfigured && this.transporter) {
        const mailOptions = {
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to: email,
          subject: `${config.emoji} ${title}`,
          text: textContent,
          html: htmlContent,
        };

        await this.transporter.sendMail(mailOptions);
        logger.info(`✅ Notification email sent to ${email}: ${title}`);
      } else {
        // Mock mode for development
        logger.info(`📧 [MOCK MODE] Notification email to ${email}`);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📧 NOTIFICATION EMAIL (MOCK MODE)`);
        console.log(`📨 To: ${email}`);
        console.log(`📌 Type: ${type}`);
        console.log(`📝 Title: ${title}`);
        console.log(`💬 Message: ${message}`);
        if (link) console.log(`🔗 Link: ${link}`);
        console.log(`${'='.repeat(60)}\n`);
      }
    } catch (error: any) {
      // Log error but don't throw - email failure shouldn't break notification creation
      logger.error(`❌ Failed to send notification email to ${email}:`, error.message);
    }
  }
}

export const emailService = new EmailService();
export default emailService;
