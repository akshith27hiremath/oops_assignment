import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Product Model
 * Represents products in the Live MART platform
 */

export interface ICategory {
  categoryId: string;
  name: string;
  parentCategory?: string;
  icon?: string;
}

export enum ProductType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE'
}

export interface IBulkPricing {
  minQuantity: number;
  maxQuantity?: number;
  pricePerUnit: number;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  category: ICategory;
  specifications: Map<string, string>;
  images: string[];
  basePrice: number; // Reference/suggested price (used as default)
  unit: string; // kg, liter, piece, etc.
  tags: string[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId; // Who added to catalog (optional tracking)
  averageRating: number;
  reviewCount: number;
  productType: ProductType; // RETAIL or WHOLESALE (for filtering B2B vs B2C)
  // Wholesale-specific fields (used when showing in B2B marketplace)
  minimumOrderQuantity?: number; // Minimum quantity for bulk orders
  bulkPricing?: IBulkPricing[]; // Volume-based pricing tiers
  availableForRetailers?: boolean; // Show in B2B marketplace
  createdAt: Date;
  updatedAt: Date;
}

// Category Schema
const CategorySchema = new Schema<ICategory>({
  categoryId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
  },
  parentCategory: {
    type: String,
    default: null,
  },
  icon: {
    type: String,
    default: null,
  },
}, { _id: false });

// Product Schema
const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters'],
    maxlength: [200, 'Product name cannot exceed 200 characters'],
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  category: {
    type: CategorySchema,
    required: [true, 'Category is required'],
  },
  specifications: {
    type: Map,
    of: String,
    default: new Map(),
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid image URL format',
    },
  }],
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Price cannot be negative'],
    index: true,
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['kg', 'gram', 'liter', 'ml', 'piece', 'dozen', 'packet', 'box'],
    default: 'piece',
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
    index: true,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  productType: {
    type: String,
    enum: Object.values(ProductType),
    required: [true, 'Product type is required'],
    default: ProductType.RETAIL,
    index: true,
  },
  minimumOrderQuantity: {
    type: Number,
    min: [1, 'Minimum order quantity must be at least 1'],
    default: null,
  },
  bulkPricing: [{
    minQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    maxQuantity: {
      type: Number,
      min: 1,
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
  availableForRetailers: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
});

/**
 * Indexes
 */
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ 'category.name': 1 });
ProductSchema.index({ basePrice: 1 });
ProductSchema.index({ averageRating: -1 });
ProductSchema.index({ isActive: 1, averageRating: -1 });
ProductSchema.index({ createdBy: 1, isActive: 1 });
ProductSchema.index({ productType: 1, isActive: 1 }); // NEW: For filtering by product type
ProductSchema.index({ productType: 1, availableForRetailers: 1 }); // NEW: For B2B marketplace

/**
 * Instance Methods
 */

// Update product rating
ProductSchema.methods.updateRating = async function(newRating: number): Promise<void> {
  const currentTotal = this.averageRating * this.reviewCount;
  this.reviewCount += 1;
  this.averageRating = (currentTotal + newRating) / this.reviewCount;
  await this.save();
};

// Toggle active status
ProductSchema.methods.toggleActive = async function(): Promise<boolean> {
  this.isActive = !this.isActive;
  await this.save();
  return this.isActive;
};

// Add image
ProductSchema.methods.addImage = async function(imageUrl: string): Promise<void> {
  if (!this.images.includes(imageUrl)) {
    this.images.push(imageUrl);
    await this.save();
  }
};

// Remove image
ProductSchema.methods.removeImage = async function(imageUrl: string): Promise<void> {
  this.images = this.images.filter(img => img !== imageUrl);
  await this.save();
};

/**
 * Static Methods
 */

// Search products
ProductSchema.statics.searchProducts = function(query: string, filters?: any) {
  const searchQuery: any = {
    $text: { $search: query },
    isActive: true,
  };

  if (filters) {
    if (filters.category) searchQuery['category.name'] = filters.category;
    if (filters.minPrice) searchQuery.basePrice = { $gte: filters.minPrice };
    if (filters.maxPrice) searchQuery.basePrice = { ...searchQuery.basePrice, $lte: filters.maxPrice };
    if (filters.minRating) searchQuery.averageRating = { $gte: filters.minRating };
  }

  return this.find(searchQuery).sort({ score: { $meta: 'textScore' } });
};

// Find products by category
ProductSchema.statics.findByCategory = function(categoryName: string) {
  return this.find({
    'category.name': categoryName,
    isActive: true,
  }).sort({ averageRating: -1 });
};

// Find top-rated products
ProductSchema.statics.findTopRated = function(limit: number = 10) {
  return this.find({
    isActive: true,
    reviewCount: { $gte: 5 },
  })
    .sort({ averageRating: -1 })
    .limit(limit);
};

// Find products by creator
ProductSchema.statics.findByCreator = function(creatorId: mongoose.Types.ObjectId) {
  return this.find({
    createdBy: creatorId,
  }).sort({ createdAt: -1 });
};

// NEW: Find retail products (for customers)
ProductSchema.statics.findRetailProducts = function(filters?: any) {
  const query: any = {
    productType: ProductType.RETAIL,
    isActive: true,
  };

  if (filters) {
    if (filters.category) query['category.name'] = filters.category;
    if (filters.minPrice) query.basePrice = { $gte: filters.minPrice };
    if (filters.maxPrice) query.basePrice = { ...query.basePrice, $lte: filters.maxPrice };
  }

  return this.find(query).sort({ createdAt: -1 });
};

// NEW: Find wholesale products (for B2B marketplace)
ProductSchema.statics.findWholesaleProducts = function(filters?: any) {
  const query: any = {
    productType: ProductType.WHOLESALE,
    isActive: true,
    availableForRetailers: true,
  };

  if (filters) {
    if (filters.category) query['category.name'] = filters.category;
    if (filters.minPrice) query.basePrice = { $gte: filters.minPrice };
    if (filters.maxPrice) query.basePrice = { ...query.basePrice, $lte: filters.maxPrice };
  }

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static Methods
 */

// Recalculate product rating based on approved reviews
ProductSchema.statics.recalculateRating = async function(productId: mongoose.Types.ObjectId): Promise<void> {
  const Review = mongoose.model('Review');

  const reviews = await Review.find({ productId, isApproved: true });
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    await this.findByIdAndUpdate(productId, {
      averageRating: 0,
      reviewCount: 0
    });
    return;
  }

  const sum = reviews.reduce((acc: number, review: any) => acc + review.rating, 0);
  const averageRating = Math.round((sum / totalReviews) * 10) / 10; // Round to 1 decimal

  await this.findByIdAndUpdate(productId, {
    averageRating,
    reviewCount: totalReviews
  });
};

/**
 * Virtual fields
 */
ProductSchema.virtual('isPopular').get(function() {
  return this.reviewCount >= 10 && this.averageRating >= 4.0;
});

/**
 * Create and export Product model
 */
const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
