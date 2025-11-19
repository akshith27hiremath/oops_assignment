import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Type Definitions for User and related schemas
 */

// User Types Enum
export enum UserType {
  CUSTOMER = 'CUSTOMER',
  RETAILER = 'RETAILER',
  WHOLESALER = 'WHOLESALER',
  ADMIN = 'ADMIN',
}

// GeoLocation Interface (GeoJSON format for MongoDB geospatial queries)
export interface IGeoLocation {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

// Address Interface
export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Notification Settings Interface
export interface INotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  orderUpdates: boolean;
  promotions: boolean;
}

// Price Alert Preferences Interface
export interface IPriceAlertPreferences {
  enabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  minimumDiscountPercent: number;  // Only notify if discount >= X%
  maxAlertsPerDay: number;         // Rate limiting
}

// User Preferences Interface
export interface IUserPreferences {
  categories?: string[];
  deliveryRadius?: number;
  notificationSettings: INotificationSettings;
  priceAlerts?: IPriceAlertPreferences;
  language?: string;
  currency?: string;
}

// User Profile Interface
export interface IUserProfile {
  name: string;
  address?: IAddress;
  location?: IGeoLocation;
  avatar?: string;
  preferences: IUserPreferences;
}

// OAuth Interface
export interface IOAuth {
  google?: {
    id: string;
    email: string;
  };
  facebook?: {
    id: string;
    email: string;
  };
}

// Base User Interface
export interface IUser extends Document {
  email: string;
  phone: string;
  password?: string;  // Optional because OAuth users may not have password
  userType: UserType;
  profile: IUserProfile;
  oauth?: IOAuth;
  isVerified: boolean;
  phoneVerifiedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
  lastLogin?: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastActive(): Promise<void>;
  getPublicProfile(): Partial<IUser>;
}

/**
 * Mongoose Schemas
 */

// GeoLocation Schema (GeoJSON format for MongoDB geospatial queries)
const GeoLocationSchema = new Schema<IGeoLocation>({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function(coords: number[]) {
        return coords.length === 2 &&
               coords[0] >= -180 && coords[0] <= 180 && // longitude
               coords[1] >= -90 && coords[1] <= 90; // latitude
      },
      message: 'Coordinates must be [longitude, latitude] with valid ranges',
    },
  },
}, { _id: false });

// Address Schema
const AddressSchema = new Schema<IAddress>({
  street: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  zipCode: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    default: 'India',
    trim: true,
  },
}, { _id: false });

// Notification Settings Schema
const NotificationSettingsSchema = new Schema<INotificationSettings>({
  emailEnabled: {
    type: Boolean,
    default: true,
  },
  smsEnabled: {
    type: Boolean,
    default: true,
  },
  pushEnabled: {
    type: Boolean,
    default: true,
  },
  orderUpdates: {
    type: Boolean,
    default: true,
  },
  promotions: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Price Alert Preferences Schema
const PriceAlertPreferencesSchema = new Schema<IPriceAlertPreferences>({
  enabled: {
    type: Boolean,
    default: true,
  },
  emailEnabled: {
    type: Boolean,
    default: false,
  },
  inAppEnabled: {
    type: Boolean,
    default: true,
  },
  minimumDiscountPercent: {
    type: Number,
    default: 5,
    min: 0,
    max: 100,
  },
  maxAlertsPerDay: {
    type: Number,
    default: 10,
    min: 1,
    max: 50,
  },
}, { _id: false });

// User Preferences Schema
const UserPreferencesSchema = new Schema<IUserPreferences>({
  categories: [String],
  deliveryRadius: {
    type: Number,
    default: 10, // km
    min: 1,
    max: 50,
  },
  notificationSettings: {
    type: NotificationSettingsSchema,
    default: () => ({}),
  },
  priceAlerts: {
    type: PriceAlertPreferencesSchema,
    default: () => ({}),
  },
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'hi'],
  },
  currency: {
    type: String,
    default: 'INR',
  },
}, { _id: false });

// User Profile Schema
const UserProfileSchema = new Schema<IUserProfile>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  address: AddressSchema,
  location: GeoLocationSchema,
  avatar: {
    type: String,
    default: null,
  },
  preferences: {
    type: UserPreferencesSchema,
    default: () => ({}),
  },
}, { _id: false });

/**
 * Base User Schema
 * This serves as the base for Customer, Retailer, and Wholesaler models
 */
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    index: true,
  },
  phone: {
    type: String,
    required: false,  // Not required for OAuth users
    unique: true,
    sparse: true,  // Allow null values for unique index
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
    index: true,
  },
  password: {
    type: String,
    required: false,  // Not required for OAuth users
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password by default
  },
  userType: {
    type: String,
    enum: Object.values(UserType),
    required: [true, 'User type is required'],
    index: true,
  },
  profile: {
    type: UserProfileSchema,
    required: true,
  },
  oauth: {
    google: {
      id: { type: String },
      email: { type: String },
    },
    facebook: {
      id: { type: String },
      email: { type: String },
    },
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true,
  },
  phoneVerifiedAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
  discriminatorKey: 'userType', // For model inheritance
});

/**
 * Indexes
 */
UserSchema.index({ email: 1, userType: 1 });
UserSchema.index({ phone: 1, userType: 1 });
UserSchema.index({ isVerified: 1, isActive: 1 });
UserSchema.index({ 'profile.location': '2dsphere' }); // Geospatial index

/**
 * Pre-save Middleware
 * 1. Hash password before saving if it's modified
 * 2. Normalize phone number to international format
 */
UserSchema.pre('save', async function(next) {
  // Normalize phone number to international format (+91 for India)
  if (this.isModified('phone') && this.phone) {
    // If phone is 10 digits, assume Indian number
    if (/^[0-9]{10}$/.test(this.phone)) {
      this.phone = `+91${this.phone}`;
    }
    // If phone starts with digit but no +, add +
    else if (/^[1-9]\d{1,14}$/.test(this.phone)) {
      this.phone = `+${this.phone}`;
    }
  }

  // Only hash password if it's modified or new AND password exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

/**
 * Instance Methods
 */

// Compare password for authentication
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    // Return false if password doesn't exist (OAuth users)
    if (!this.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Update last active timestamp
UserSchema.methods.updateLastActive = async function(): Promise<void> {
  this.lastActive = new Date();
  await this.save();
};

// Get public profile (remove sensitive data)
UserSchema.methods.getPublicProfile = function(): Partial<IUser> {
  const userObject = this.toObject();
  if (userObject.password) {
    delete userObject.password;
  }
  return userObject;
};

/**
 * Static Methods
 */

// Find user by email
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Find user by phone
UserSchema.statics.findByPhone = function(phone: string) {
  return this.findOne({ phone, isActive: true });
};

/**
 * Create and export User model
 */
const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
