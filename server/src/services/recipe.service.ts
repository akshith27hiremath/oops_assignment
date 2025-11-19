import mongoose from 'mongoose';
import Recipe, {
  IRecipe,
  IRecipeIngredient,
  RecipeCategory,
  DietaryTag,
  DifficultyLevel,
  RecipeStatus,
} from '../models/Recipe.model';
import RecipeReview from '../models/RecipeReview.model';
import Product from '../models/Product.model';
import Inventory from '../models/Inventory.model';

// ==================== TYPES ====================

export interface CreateRecipeData {
  title: string;
  description: string;
  coverImage: string;
  additionalImages?: string[];
  ingredients: IRecipeIngredient[];
  instructions: Array<{
    stepNumber: number;
    instruction: string;
    image?: string;
    duration?: number;
    temperature?: string;
  }>;
  servings: number;
  prepTime: number;
  cookTime: number;
  category: RecipeCategory;
  cuisine: string;
  dietaryTags?: DietaryTag[];
  difficulty: DifficultyLevel;
  nutritionInfo?: {
    servingSize: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  tips?: string[];
  videoUrl?: string;
  tags?: string[];
  featured?: boolean;
  status?: RecipeStatus;
}

export interface ProductMatch {
  product: {
    _id: mongoose.Types.ObjectId;
    name: string;
    category: {
      name: string;
      parentCategory?: string;
    };
    images: string[];
    unit: string;
  };
  inventory: {
    _id: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    retailer: {
      _id: mongoose.Types.ObjectId;
      businessName?: string;
      profile?: { name: string };
    };
    sellingPrice: number;
    currentStock: number;
    availability: boolean;
    productDiscount?: {
      isActive: boolean;
      discountPercentage: number;
      validUntil: Date;
    };
  };
  matchScore: number; // 0-100
  matchReason: string; // "Exact match", "Category match", "Search term match"
  suggestedQuantity: number; // Converted from recipe quantity
  unitConversion?: string; // E.g., "1 cup ≈ 0.25 kg"
}

export interface IngredientMatchResult {
  ingredient: IRecipeIngredient;
  matches: ProductMatch[];
  available: boolean;
  bestMatch?: ProductMatch;
}

export interface RecipeMatchResponse {
  recipe: IRecipe;
  ingredientMatches: IngredientMatchResult[];
  totalAvailableIngredients: number;
  totalIngredients: number;
  availabilityPercentage: number;
  estimatedTotal: number; // Total cost if adding all to cart
  scaledServings?: number; // If user requested different serving size
}

// ==================== RECIPE SERVICE ====================

class RecipeService {
  /**
   * Generate unique recipe ID
   */
  private generateRecipeId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 12).toUpperCase();
    return `RCP-${timestamp}-${random}`;
  }

  /**
   * Create a new recipe (Admin only)
   */
  async createRecipe(
    data: CreateRecipeData,
    adminId: mongoose.Types.ObjectId
  ): Promise<IRecipe> {
    const recipeId = this.generateRecipeId();

    const recipe = new Recipe({
      recipeId,
      ...data,
      createdBy: adminId,
      status: data.status || RecipeStatus.DRAFT,
    });

    await recipe.save();
    return recipe;
  }

  /**
   * Update existing recipe
   */
  async updateRecipe(
    recipeId: string,
    updates: Partial<CreateRecipeData>
  ): Promise<IRecipe | null> {
    const recipe = await Recipe.findOne({ recipeId });
    if (!recipe) return null;

    Object.assign(recipe, updates);
    await recipe.save();

    return recipe;
  }

  /**
   * Get recipe by ID
   */
  async getRecipeById(recipeId: string, incrementView: boolean = false): Promise<IRecipe | null> {
    const recipe = await Recipe.findOne({ recipeId })
      .populate('createdBy', 'profile.name email');

    if (recipe && incrementView) {
      await recipe.incrementViewCount();
    }

    return recipe;
  }

  /**
   * Browse recipes with filters and pagination
   */
  async browseRecipes(filters: {
    category?: RecipeCategory;
    cuisine?: string;
    dietaryTags?: DietaryTag[];
    difficulty?: DifficultyLevel;
    maxTime?: number;
    featured?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {
      status: RecipeStatus.PUBLISHED,
    };

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.cuisine) {
      query.cuisine = new RegExp(filters.cuisine, 'i');
    }

    if (filters.dietaryTags && filters.dietaryTags.length > 0) {
      query.dietaryTags = { $all: filters.dietaryTags };
    }

    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    if (filters.maxTime) {
      query.totalTime = { $lte: filters.maxTime };
    }

    if (filters.featured !== undefined) {
      query.featured = filters.featured;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    const [recipes, total] = await Promise.all([
      Recipe.find(query)
        .sort(filters.search ? { score: { $meta: 'textScore' }, averageRating: -1 } : { averageRating: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'profile.name email'),
      Recipe.countDocuments(query),
    ]);

    return {
      recipes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Calculate string similarity score (0-100)
   * Uses Levenshtein distance algorithm
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return 100;

    // One contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 85;

    // Levenshtein distance
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    const similarity = ((maxLen - distance) / maxLen) * 100;

    return Math.round(similarity);
  }

  /**
   * Convert recipe units to product units (simplified)
   */
  private convertUnits(
    recipeQuantity: number,
    recipeUnit: string,
    productUnit: string
  ): { quantity: number; conversionNote?: string } {
    const ru = recipeUnit.toLowerCase();
    const pu = productUnit.toLowerCase();

    // Same unit - no conversion
    if (ru === pu) {
      return { quantity: recipeQuantity };
    }

    // Common conversions (simplified - real-world would need more comprehensive mapping)
    const conversions: Record<string, Record<string, number>> = {
      // Volume to weight (approximate for common ingredients)
      cup: { kg: 0.24, g: 240, ml: 240, liter: 0.24 },
      tbsp: { g: 15, ml: 15, kg: 0.015 },
      tsp: { g: 5, ml: 5, kg: 0.005 },
      liter: { ml: 1000, cup: 4.22, kg: 1 },
      ml: { liter: 0.001, cup: 0.00422, g: 1 },

      // Weight conversions
      kg: { g: 1000, lb: 2.20462 },
      g: { kg: 0.001, lb: 0.00220462 },
      lb: { kg: 0.453592, g: 453.592 },

      // Piece conversions (approximate)
      piece: { pieces: 1, pc: 1 },
      pieces: { piece: 1, pc: 1 },
    };

    if (conversions[ru] && conversions[ru][pu]) {
      const convertedQuantity = recipeQuantity * conversions[ru][pu];
      return {
        quantity: Math.round(convertedQuantity * 100) / 100,
        conversionNote: `${recipeQuantity} ${recipeUnit} ≈ ${convertedQuantity} ${productUnit}`,
      };
    }

    // No conversion found - return original quantity with warning
    return {
      quantity: recipeQuantity,
      conversionNote: `Unit conversion (${recipeUnit} → ${productUnit}) may be approximate`,
    };
  }

  /**
   * Find best product match for a recipe ingredient
   */
  private async findProductMatches(
    ingredient: IRecipeIngredient,
    maxResults: number = 5
  ): Promise<ProductMatch[]> {
    const matches: ProductMatch[] = [];

    // Priority 1: Exact product ID match (if pre-mapped)
    if (ingredient.productId) {
      const product = await Product.findById(ingredient.productId);
      if (product && product.isActive) {
        // Find available inventories
        const inventories = await Inventory.find({
          productId: ingredient.productId,
          availability: true,
          currentStock: { $gt: 0 },
        }).populate('ownerId', 'businessName profile.name');

        for (const inventory of inventories) {
          const conversion = this.convertUnits(
            ingredient.quantity,
            ingredient.unit,
            product.unit
          );

          matches.push({
            product: {
              _id: product._id,
              name: product.name,
              category: product.category,
              images: product.images,
              unit: product.unit,
            },
            inventory: {
              _id: inventory._id,
              ownerId: inventory.ownerId,
              retailer: inventory.ownerId as any,
              sellingPrice: inventory.sellingPrice,
              currentStock: inventory.currentStock,
              availability: inventory.availability,
              productDiscount: inventory.productDiscount,
            },
            matchScore: 100,
            matchReason: 'Pre-mapped product',
            suggestedQuantity: conversion.quantity,
            unitConversion: conversion.conversionNote,
          });
        }
      }
    }

    // Priority 2: Search by name and category
    if (matches.length < maxResults) {
      const searchTerms = [ingredient.name];
      if (ingredient.searchTerms) {
        searchTerms.push(...ingredient.searchTerms);
      }

      for (const term of searchTerms) {
        const products = await Product.aggregate([
          {
            $match: {
              isActive: true,
              $or: [
                { name: { $regex: term, $options: 'i' } },
                { tags: { $regex: term, $options: 'i' } },
              ],
            },
          },
          {
            $lookup: {
              from: 'inventories',
              localField: '_id',
              foreignField: 'productId',
              as: 'inventories',
            },
          },
          {
            $unwind: '$inventories',
          },
          {
            $match: {
              'inventories.availability': true,
              'inventories.currentStock': { $gt: 0 },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'inventories.ownerId',
              foreignField: '_id',
              as: 'retailer',
            },
          },
          {
            $unwind: '$retailer',
          },
          { $limit: maxResults * 2 }, // Get extras for scoring
        ]);

        for (const result of products) {
          // Calculate match score
          let score = this.calculateStringSimilarity(ingredient.name, result.name);

          // Boost score if category matches
          if (ingredient.category && result.category?.name) {
            const categoryMatch = this.calculateStringSimilarity(
              ingredient.category,
              result.category.name
            );
            if (categoryMatch > 70) {
              score = Math.min(100, score + 15);
            }
          }

          // Only include matches with decent score
          if (score >= 50) {
            const conversion = this.convertUnits(
              ingredient.quantity,
              ingredient.unit,
              result.unit
            );

            matches.push({
              product: {
                _id: result._id,
                name: result.name,
                category: result.category,
                images: result.images,
                unit: result.unit,
              },
              inventory: {
                _id: result.inventories._id,
                ownerId: result.inventories.ownerId,
                retailer: {
                  _id: result.retailer._id,
                  businessName: result.retailer.businessName,
                  profile: result.retailer.profile,
                },
                sellingPrice: result.inventories.sellingPrice,
                currentStock: result.inventories.currentStock,
                availability: result.inventories.availability,
                productDiscount: result.inventories.productDiscount,
              },
              matchScore: score,
              matchReason: score === 100 ? 'Exact name match' : 'Name similarity match',
              suggestedQuantity: conversion.quantity,
              unitConversion: conversion.conversionNote,
            });
          }
        }

        // Break if we have enough good matches
        if (matches.length >= maxResults) break;
      }
    }

    // Sort by match score (highest first) and remove duplicates
    const uniqueMatches = matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .filter((match, index, self) =>
        index === self.findIndex((m) => m.product._id.toString() === match.product._id.toString())
      )
      .slice(0, maxResults);

    return uniqueMatches;
  }

  /**
   * Match all ingredients in a recipe to available products
   */
  async matchRecipeIngredients(
    recipeId: string,
    servings?: number
  ): Promise<RecipeMatchResponse | null> {
    const recipe = await this.getRecipeById(recipeId);
    if (!recipe) return null;

    // Scale ingredients if different serving size requested
    const ingredients = servings
      ? recipe.scaleIngredients(servings)
      : recipe.ingredients;

    const ingredientMatches: IngredientMatchResult[] = [];
    let totalAvailable = 0;
    let estimatedTotal = 0;

    for (const ingredient of ingredients) {
      const matches = await this.findProductMatches(ingredient);
      const bestMatch = matches[0]; // Highest scoring match

      const available = matches.length > 0 && matches.some((m) => m.inventory.availability);

      if (available) {
        totalAvailable++;
      }

      if (bestMatch) {
        // Calculate price (with product discount if applicable)
        let price = bestMatch.inventory.sellingPrice * bestMatch.suggestedQuantity;

        if (bestMatch.inventory.productDiscount?.isActive) {
          const discountAmount =
            price * (bestMatch.inventory.productDiscount.discountPercentage / 100);
          price -= discountAmount;
        }

        estimatedTotal += price;
      }

      ingredientMatches.push({
        ingredient,
        matches,
        available,
        bestMatch,
      });
    }

    const availabilityPercentage = Math.round((totalAvailable / ingredients.length) * 100);

    return {
      recipe,
      ingredientMatches,
      totalAvailableIngredients: totalAvailable,
      totalIngredients: ingredients.length,
      availabilityPercentage,
      estimatedTotal: Math.round(estimatedTotal * 100) / 100,
      scaledServings: servings,
    };
  }

  /**
   * Get featured recipes
   */
  async getFeaturedRecipes(limit: number = 10): Promise<IRecipe[]> {
    return Recipe.findFeatured(limit);
  }

  /**
   * Delete recipe (Admin only)
   */
  async deleteRecipe(recipeId: string): Promise<boolean> {
    const result = await Recipe.deleteOne({ recipeId });
    return result.deletedCount > 0;
  }

  /**
   * Toggle recipe featured status (Admin only)
   */
  async toggleFeatured(recipeId: string): Promise<IRecipe | null> {
    const recipe = await Recipe.findOne({ recipeId });
    if (!recipe) return null;

    recipe.featured = !recipe.featured;
    await recipe.save();

    return recipe;
  }

  /**
   * Get recipe reviews
   */
  async getRecipeReviews(
    recipeId: string,
    options?: {
      onlyVerified?: boolean;
      minRating?: number;
      page?: number;
      limit?: number;
    }
  ) {
    const recipe = await Recipe.findOne({ recipeId });
    if (!recipe) return null;

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const reviews = await (RecipeReview as any).getRecipeReviews(recipe._id, {
      onlyVerified: options?.onlyVerified,
      minRating: options?.minRating,
      limit,
      skip,
    });

    const total = await RecipeReview.countDocuments({
      recipeId: recipe._id,
      status: 'APPROVED',
    });

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

export default new RecipeService();
