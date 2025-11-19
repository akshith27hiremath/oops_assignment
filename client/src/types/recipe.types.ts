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

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  productId?: string;
  category?: string;
  searchTerms?: string[];
  substitutes?: string[];
  optional?: boolean;
  notes?: string;
}

export interface CookingStep {
  stepNumber: number;
  instruction: string;
  image?: string;
  duration?: number;
  temperature?: string;
}

export interface NutritionInfo {
  servingSize: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface Recipe {
  _id: string;
  recipeId: string;
  title: string;
  description: string;
  coverImage: string;
  additionalImages?: string[];
  ingredients: RecipeIngredient[];
  instructions: CookingStep[];
  servings: number;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  category: RecipeCategory;
  cuisine: string;
  dietaryTags: DietaryTag[];
  difficulty: DifficultyLevel;
  nutritionInfo?: NutritionInfo;
  averageRating: number;
  ratingCount: number;
  viewCount: number;
  savedCount: number;
  cookCount: number;
  tips?: string[];
  videoUrl?: string;
  createdBy: {
    _id: string;
    profile?: { name: string };
    email: string;
  };
  status: RecipeStatus;
  featured: boolean;
  tags: string[];
  searchKeywords?: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface RecipeReview {
  _id: string;
  recipeId: string;
  customerId: {
    _id: string;
    profile?: { name: string };
    email: string;
  };
  rating: number;
  comment?: string;
  images?: string[];
  helpfulCount: number;
  reportedCount: number;
  verified: boolean;
  orderId?: {
    _id: string;
    orderId: string;
    createdAt: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  moderatedBy?: string;
  moderatedAt?: string;
  moderationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== PRODUCT MATCH TYPES ====================

export interface ProductMatch {
  product: {
    _id: string;
    name: string;
    category: {
      name: string;
      parentCategory?: string;
    };
    images: string[];
    unit: string;
  };
  inventory: {
    _id: string;
    ownerId: string;
    retailer: {
      _id: string;
      businessName?: string;
      profile?: { name: string };
    };
    sellingPrice: number;
    currentStock: number;
    availability: boolean;
    productDiscount?: {
      isActive: boolean;
      discountPercentage: number;
      validUntil: string;
    };
  };
  matchScore: number;
  matchReason: string;
  suggestedQuantity: number;
  unitConversion?: string;
}

export interface IngredientMatchResult {
  ingredient: RecipeIngredient;
  matches: ProductMatch[];
  available: boolean;
  bestMatch?: ProductMatch;
}

export interface RecipeMatchResponse {
  recipe: Recipe;
  ingredientMatches: IngredientMatchResult[];
  totalAvailableIngredients: number;
  totalIngredients: number;
  availabilityPercentage: number;
  estimatedTotal: number;
  scaledServings?: number;
}

// ==================== API RESPONSE TYPES ====================

export interface RecipesResponse {
  success: boolean;
  data: {
    recipes: Recipe[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface RecipeResponse {
  success: boolean;
  data: Recipe;
}

export interface RecipeMatchResponseAPI {
  success: boolean;
  data: RecipeMatchResponse;
}

export interface RecipeReviewsResponse {
  success: boolean;
  data: {
    reviews: RecipeReview[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

// ==================== FILTER TYPES ====================

export interface RecipeFilters {
  category?: RecipeCategory;
  cuisine?: string;
  dietaryTags?: DietaryTag[];
  difficulty?: DifficultyLevel;
  maxTime?: number;
  featured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SubmitReviewData {
  rating: number;
  comment?: string;
  images?: string[];
  orderId?: string;
}

// ==================== CREATE/UPDATE TYPES ====================

export interface CreateRecipeData {
  title: string;
  description: string;
  coverImage: string;
  additionalImages?: string[];
  ingredients: RecipeIngredient[];
  instructions: CookingStep[];
  servings: number;
  prepTime: number;
  cookTime: number;
  category: RecipeCategory;
  cuisine: string;
  dietaryTags?: DietaryTag[];
  difficulty: DifficultyLevel;
  nutritionInfo?: NutritionInfo;
  tips?: string[];
  videoUrl?: string;
  tags?: string[];
  featured?: boolean;
  status?: RecipeStatus;
}

// ==================== UI HELPER TYPES ====================

export const DietaryTagLabels: Record<DietaryTag, string> = {
  [DietaryTag.VEGETARIAN]: 'Vegetarian',
  [DietaryTag.VEGAN]: 'Vegan',
  [DietaryTag.GLUTEN_FREE]: 'Gluten Free',
  [DietaryTag.DAIRY_FREE]: 'Dairy Free',
  [DietaryTag.NUT_FREE]: 'Nut Free',
  [DietaryTag.EGG_FREE]: 'Egg Free',
  [DietaryTag.KETO]: 'Keto',
  [DietaryTag.LOW_CARB]: 'Low Carb',
  [DietaryTag.HIGH_PROTEIN]: 'High Protein',
  [DietaryTag.PALEO]: 'Paleo',
  [DietaryTag.WHOLE30]: 'Whole30',
};

export const DifficultyLabels: Record<DifficultyLevel, string> = {
  [DifficultyLevel.EASY]: 'Easy',
  [DifficultyLevel.MEDIUM]: 'Medium',
  [DifficultyLevel.HARD]: 'Hard',
};

export const CategoryLabels: Record<RecipeCategory, string> = {
  [RecipeCategory.BREAKFAST]: 'Breakfast',
  [RecipeCategory.LUNCH]: 'Lunch',
  [RecipeCategory.DINNER]: 'Dinner',
  [RecipeCategory.SNACK]: 'Snack',
  [RecipeCategory.DESSERT]: 'Dessert',
  [RecipeCategory.BEVERAGE]: 'Beverage',
  [RecipeCategory.APPETIZER]: 'Appetizer',
  [RecipeCategory.SALAD]: 'Salad',
  [RecipeCategory.SOUP]: 'Soup',
  [RecipeCategory.SIDE_DISH]: 'Side Dish',
};

// ==================== HELPER FUNCTIONS ====================

export const formatCookTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${mins} min`;
};

export const getDifficultyColor = (difficulty: DifficultyLevel): string => {
  switch (difficulty) {
    case DifficultyLevel.EASY:
      return 'text-green-600 bg-green-50';
    case DifficultyLevel.MEDIUM:
      return 'text-yellow-600 bg-yellow-50';
    case DifficultyLevel.HARD:
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const getDietaryTagColor = (tag: DietaryTag): string => {
  switch (tag) {
    case DietaryTag.VEGETARIAN:
      return 'text-green-700 bg-green-100 border-green-200';
    case DietaryTag.VEGAN:
      return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    case DietaryTag.GLUTEN_FREE:
      return 'text-amber-700 bg-amber-100 border-amber-200';
    case DietaryTag.DAIRY_FREE:
      return 'text-blue-700 bg-blue-100 border-blue-200';
    case DietaryTag.KETO:
      return 'text-purple-700 bg-purple-100 border-purple-200';
    case DietaryTag.HIGH_PROTEIN:
      return 'text-pink-700 bg-pink-100 border-pink-200';
    default:
      return 'text-gray-700 bg-gray-100 border-gray-200';
  }
};
