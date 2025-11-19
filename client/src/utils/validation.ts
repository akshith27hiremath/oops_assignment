/**
 * Form Validation Schemas
 * Zod schemas for form validation
 */

import { z } from 'zod';
import { UserType } from '../types/auth.types';

/**
 * Register Schema
 */
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
    userType: z.nativeEnum(UserType, {
      required_error: 'Please select user type',
    }),
    profile: z.object({
      name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be less than 100 characters'),
      phone: z
        .string()
        .regex(/^\d{10}$/, 'Phone number must be 10 digits'),
      location: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }).optional(),
    }),
    businessName: z.string().optional(),
    gstin: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.userType === UserType.RETAILER || data.userType === UserType.WHOLESALER) {
        return Boolean(data.businessName && data.businessName.length >= 2);
      }
      return true;
    },
    {
      message: 'Business name is required for retailers and wholesalers',
      path: ['businessName'],
    }
  )
  .refine(
    (data) => {
      if (data.userType === UserType.RETAILER || data.userType === UserType.WHOLESALER) {
        return Boolean(data.gstin && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstin));
      }
      return true;
    },
    {
      message: 'Valid GSTIN is required for retailers and wholesalers',
      path: ['gstin'],
    }
  )
  .refine(
    (data) => {
      if (data.userType === UserType.CUSTOMER || data.userType === UserType.RETAILER) {
        return Boolean(data.profile.location?.latitude && data.profile.location?.longitude);
      }
      return true;
    },
    {
      message: 'Location is required. Please allow location access or enter manually.',
      path: ['profile', 'location'],
    }
  );

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Login Schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Forgot Password Schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset Password Schema
 */
export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
