import mongoose, { Document, Schema } from 'mongoose';

// ==================== ENUMS ====================

export enum DietaryTag {
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  GLUTEN_FREE = 'GLUTEN_FREE',
  DAIRY_FREE = 'DAIRY_FREE',
  NUT_FREE = 'NUT_FREE',
  EGG_FREE = 'EGG_FREE',
  KETO = 'KETO',
  LOW_CARB = 'LOW_CARB',
  HIGH_PROTEIN = 'HIGH_PROTEIN',
  PALEO = 'PALEO',
  WHOLE30 = 'WHOLE30',
}

export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum RecipeCategory {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
  DESSERT = 'DESSERT',
  BEVERAGE = 'BEVERAGE',
  APPETIZER = 'APPETIZER',
  SALAD = 'SALAD',
  SOUP = 'SOUP',
  SIDE_DISH = 'SIDE_DISH',
}

export enum RecipeStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// ==================== INTERFACES ====================

export interface IRecipeIngredient {
  name: string; // "Fresh Milk", "Tomatoes", etc.
  quantity: number; // 2, 0.5, 1, etc.
  unit: string; // "cups", "kg", "tbsp", "pieces", etc.

  // Product mapping (optional - helps with matching)
  productId?: mongoose.Types.ObjectId; // Pre-mapped product
  category?: string; // "Dairy", "Vegetables", "Spices"
  searchTerms?: string[]; // Alternative names: ["tomato", "tamatar"]
  substitutes?: string[]; // "Can use canned tomatoes instead"

  // Metadata
  optional?: boolean; // Is this ingredient optional?
  notes?: string; // "Chopped", "At room temperature", etc.
}

export interface ICookingStep {
  stepNumber: number;
  instruction: string;
  image?: string; // Optional step image
  duration?: number; // Duration in minutes (optional)
  temperature?: string; // "350°F", "Medium heat", etc.
}

export interface INutritionInfo {
  servingSize: string; // "1 bowl", "2 pieces"
  calories: number;
  protein: number; // grams
  carbohydrates: number; // grams
  fat: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
}

export interface IRecipe extends Document {
  // Basic Info
  recipeId: string; // "RCP-1234567890-ABCDEF"
  title: string;
  description: string;
  coverImage: string;
  additionalImages?: string[];

  // Recipe Content
  ingredients: IRecipeIngredient[];
  instructions: ICookingStep[];

  // Metadata
  servings: number; // Number of servings this recipe makes
  prepTime: number; // Minutes
  cookTime: number; // Minutes
  totalTime: number; // prepTime + cookTime (calculated)

  // Classification
  category: RecipeCategory;
  cuisine: string; // "Indian", "Italian", "Chinese", etc.
  dietaryTags: DietaryTag[];
  difficulty: DifficultyLevel;

  // Nutrition
  nutritionInfo?: INutritionInfo;

  // Engagement Metrics
  averageRating: number; // 0-5
  ratingCount: number;
  viewCount: number;
  savedCount: number; // How many users saved this
  cookCount: number; // How many times "Add to Cart" was clicked

  // Content
  tips?: string[]; // Cooking tips
  videoUrl?: string; // Optional video tutorial

  // Author & Status
  createdBy: mongoose.Types.ObjectId; // Admin who created
  status: RecipeStatus;
  featured: boolean; // Featured on homepage?

  // SEO & Discovery
  tags: string[]; // "quick", "budget-friendly", "one-pot", etc.
  searchKeywords?: string[]; // For search optimization

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;

  // Instance Methods
  updateRating(newRating: number): Promise<void>;
  incrementViewCount(): Promise<void>;
  incrementSavedCount(): Promise<void>;
  incrementCookCount(): Promise<void>;
  scaleIngredients(newServings: number): IRecipeIngredient[];
}

// ==================== SCHEMAS ====================

const RecipeIngredientSchema = new Schema<IRecipeIngredient>(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    category: { type: String },
    searchTerms: [{ type: String }],
    substitutes: [{ type: String }],
    optional: { type: Boolean, default: false },
    notes: { type: String },
  },
  { _id: false }
);

const CookingStepSchema = new Schema<ICookingStep>(
  {
    stepNumber: { type: Number, required: true },
    instruction: { type: String, required: true },
    image: { type: String },
    duration: { type: Number },
    temperature: { type: String },
  },
  { _id: false }
);

const NutritionInfoSchema = new Schema<INutritionInfo>(
  {
    servingSize: { type: String, required: true },
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbohydrates: { type: Number, required: true },
    fat: { type: Number, required: true },
    fiber: { type: Number },
    sugar: { type: Number },
    sodium: { type: Number },
  },
  { _id: false }
);

const RecipeSchema = new Schema<IRecipe>(
  {
    recipeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: 'text', // Text search on title
    },
    description: {
      type: String,
      required: true,
      trim: true,
      index: 'text', // Text search on description
    },
    coverImage: {
      type: String,
      required: true,
    },
    additionalImages: [{ type: String }],

    ingredients: {
      type: [RecipeIngredientSchema],
      required: true,
      validate: {
        validator: (v: IRecipeIngredient[]) => v.length > 0,
        message: 'Recipe must have at least one ingredient',
      },
    },
    instructions: {
      type: [CookingStepSchema],
      required: true,
      validate: {
        validator: (v: ICookingStep[]) => v.length > 0,
        message: 'Recipe must have at least one instruction step',
      },
    },

    servings: {
      type: Number,
      required: true,
      min: 1,
    },
    prepTime: {
      type: Number,
      required: true,
      min: 0,
    },
    cookTime: {
      type: Number,
      required: true,
      min: 0,
    },
    totalTime: {
      type: Number,
      required: true,
    },

    category: {
      type: String,
      enum: Object.values(RecipeCategory),
      required: true,
      index: true,
    },
    cuisine: {
      type: String,
      required: true,
      index: true,
    },
    dietaryTags: {
      type: [String],
      enum: Object.values(DietaryTag),
      default: [],
      index: true,
    },
    difficulty: {
      type: String,
      enum: Object.values(DifficultyLevel),
      required: true,
      index: true,
    },

    nutritionInfo: NutritionInfoSchema,

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    savedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    cookCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    tips: [{ type: String }],
    videoUrl: { type: String },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(RecipeStatus),
      default: RecipeStatus.DRAFT,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },
    searchKeywords: [{ type: String }],

    publishedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

// Compound indexes for common queries
RecipeSchema.index({ status: 1, featured: 1, averageRating: -1 }); // Featured recipes
RecipeSchema.index({ status: 1, category: 1, createdAt: -1 }); // Browse by category
RecipeSchema.index({ status: 1, cuisine: 1, createdAt: -1 }); // Browse by cuisine
RecipeSchema.index({ status: 1, difficulty: 1, totalTime: 1 }); // Filter by difficulty and time
RecipeSchema.index({ dietaryTags: 1, status: 1 }); // Filter by dietary preferences
RecipeSchema.index({ createdBy: 1, status: 1, createdAt: -1 }); // Admin's recipes

// Text search index
RecipeSchema.index({ title: 'text', description: 'text', tags: 'text' });

// ==================== PRE-SAVE HOOKS ====================

RecipeSchema.pre('save', function (next) {
  // Calculate total time
  this.totalTime = this.prepTime + this.cookTime;

  // Set publishedAt when status changes to PUBLISHED
  if (this.isModified('status') && this.status === RecipeStatus.PUBLISHED && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// ==================== INSTANCE METHODS ====================

RecipeSchema.methods.updateRating = async function (newRating: number): Promise<void> {
  if (newRating < 1 || newRating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const totalRating = this.averageRating * this.ratingCount;
  this.ratingCount += 1;
  this.averageRating = (totalRating + newRating) / this.ratingCount;

  await this.save();
};

RecipeSchema.methods.incrementViewCount = async function (): Promise<void> {
  this.viewCount += 1;
  await this.save();
};

RecipeSchema.methods.incrementSavedCount = async function (): Promise<void> {
  this.savedCount += 1;
  await this.save();
};

RecipeSchema.methods.incrementCookCount = async function (): Promise<void> {
  this.cookCount += 1;
  await this.save();
};

RecipeSchema.methods.scaleIngredients = function (newServings: number): IRecipeIngredient[] {
  if (newServings <= 0) {
    throw new Error('Servings must be greater than 0');
  }

  const scaleFactor = newServings / this.servings;

  return this.ingredients.map((ingredient) => ({
    ...ingredient.toObject(),
    quantity: Math.round(ingredient.quantity * scaleFactor * 100) / 100, // Round to 2 decimals
  }));
};

// ==================== STATIC METHODS ====================

RecipeSchema.statics.findFeatured = function (limit: number = 10) {
  return this.find({ status: RecipeStatus.PUBLISHED, featured: true })
    .sort({ averageRating: -1, createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'profile.name email');
};

RecipeSchema.statics.findByDietaryTags = function (tags: DietaryTag[], limit: number = 20) {
  return this.find({
    status: RecipeStatus.PUBLISHED,
    dietaryTags: { $all: tags },
  })
    .sort({ averageRating: -1, createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'profile.name email');
};

RecipeSchema.statics.findByCuisine = function (cuisine: string, limit: number = 20) {
  return this.find({
    status: RecipeStatus.PUBLISHED,
    cuisine: new RegExp(cuisine, 'i'),
  })
    .sort({ averageRating: -1, createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'profile.name email');
};

RecipeSchema.statics.searchRecipes = function (
  query: string,
  filters?: {
    category?: RecipeCategory;
    cuisine?: string;
    dietaryTags?: DietaryTag[];
    difficulty?: DifficultyLevel;
    maxTime?: number; // Max total time in minutes
  },
  limit: number = 20
) {
  const searchQuery: any = {
    status: RecipeStatus.PUBLISHED,
  };

  // Text search
  if (query) {
    searchQuery.$text = { $search: query };
  }

  // Apply filters
  if (filters) {
    if (filters.category) {
      searchQuery.category = filters.category;
    }
    if (filters.cuisine) {
      searchQuery.cuisine = new RegExp(filters.cuisine, 'i');
    }
    if (filters.dietaryTags && filters.dietaryTags.length > 0) {
      searchQuery.dietaryTags = { $all: filters.dietaryTags };
    }
    if (filters.difficulty) {
      searchQuery.difficulty = filters.difficulty;
    }
    if (filters.maxTime) {
      searchQuery.totalTime = { $lte: filters.maxTime };
    }
  }

  const sortCriteria: any = {};
  if (query) {
    sortCriteria.score = { $meta: 'textScore' };
  }
  sortCriteria.averageRating = -1;
  sortCriteria.createdAt = -1;

  return this.find(searchQuery)
    .sort(sortCriteria)
    .limit(limit)
    .populate('createdBy', 'profile.name email');
};

// ==================== MODEL ====================

const Recipe = mongoose.model<IRecipe>('Recipe', RecipeSchema);

export default Recipe;
