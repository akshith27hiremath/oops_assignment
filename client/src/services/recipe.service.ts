/**
 * Recipe Service
 * Handles all recipe-related API calls
 */

import apiClient from './api';
import {
  Recipe,
  RecipeFilters,
  RecipesResponse,
  RecipeResponse,
  RecipeMatchResponseAPI,
  RecipeReviewsResponse,
  RecipeReview,
  SubmitReviewData,
  CreateRecipeData,
} from '../types/recipe.types';
import { ApiResponse } from '../types/auth.types';

class RecipeService {
  /**
   * Browse recipes with filters
   */
  async browseRecipes(filters?: RecipeFilters): Promise<RecipesResponse> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.category) params.append('category', filters.category);
      if (filters.cuisine) params.append('cuisine', filters.cuisine);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.maxTime) params.append('maxTime', filters.maxTime.toString());
      if (filters.search) params.append('search', filters.search);

      // Handle dietary tags (array)
      if (filters.dietaryTags && filters.dietaryTags.length > 0) {
        params.append('dietaryTags', filters.dietaryTags.join(','));
      }

      // Handle featured filter
      if (filters.featured !== undefined) {
        params.append('featured', filters.featured.toString());
      }
    }

    const response = await apiClient.get<RecipesResponse>(
      `/recipes?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get featured recipes
   */
  async getFeaturedRecipes(limit: number = 10): Promise<Recipe[]> {
    const response = await apiClient.get<{ success: boolean; data: Recipe[] }>(
      `/recipes/featured?limit=${limit}`
    );
    return response.data.data;
  }

  /**
   * Get recipe by ID
   */
  async getRecipeById(recipeId: string): Promise<Recipe> {
    const response = await apiClient.get<RecipeResponse>(`/recipes/${recipeId}`);
    return response.data.data;
  }

  /**
   * Match recipe ingredients to available products
   */
  async matchRecipeIngredients(
    recipeId: string,
    servings?: number
  ): Promise<RecipeMatchResponseAPI> {
    const response = await apiClient.post<RecipeMatchResponseAPI>(
      `/recipes/${recipeId}/match-ingredients`,
      { servings }
    );
    return response.data;
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
  ): Promise<RecipeReviewsResponse> {
    const params = new URLSearchParams();

    if (options) {
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.onlyVerified)
        params.append('onlyVerified', options.onlyVerified.toString());
      if (options.minRating) params.append('minRating', options.minRating.toString());
    }

    const response = await apiClient.get<RecipeReviewsResponse>(
      `/recipes/${recipeId}/reviews?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Submit a recipe review (Customer only)
   */
  async submitReview(
    recipeId: string,
    reviewData: SubmitReviewData
  ): Promise<ApiResponse<RecipeReview>> {
    const response = await apiClient.post<ApiResponse<RecipeReview>>(
      `/recipes/${recipeId}/reviews`,
      reviewData
    );
    return response.data;
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Create a new recipe (Admin only)
   */
  async createRecipe(data: CreateRecipeData): Promise<ApiResponse<Recipe>> {
    const response = await apiClient.post<ApiResponse<Recipe>>('/recipes', data);
    return response.data;
  }

  /**
   * Update a recipe (Admin only)
   */
  async updateRecipe(
    recipeId: string,
    data: Partial<CreateRecipeData>
  ): Promise<ApiResponse<Recipe>> {
    const response = await apiClient.put<ApiResponse<Recipe>>(
      `/recipes/${recipeId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a recipe (Admin only)
   */
  async deleteRecipe(recipeId: string): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/recipes/${recipeId}`);
    return response.data;
  }

  /**
   * Toggle recipe featured status (Admin only)
   */
  async toggleFeatured(recipeId: string): Promise<ApiResponse<Recipe>> {
    const response = await apiClient.patch<ApiResponse<Recipe>>(
      `/recipes/${recipeId}/featured`
    );
    return response.data;
  }

  /**
   * Get pending reviews (Admin only)
   */
  async getPendingReviews(limit: number = 50): Promise<RecipeReview[]> {
    const response = await apiClient.get<{ success: boolean; data: RecipeReview[] }>(
      `/recipes/reviews/pending?limit=${limit}`
    );
    return response.data.data;
  }

  /**
   * Approve a review (Admin only)
   */
  async approveReview(reviewId: string): Promise<ApiResponse<RecipeReview>> {
    const response = await apiClient.patch<ApiResponse<RecipeReview>>(
      `/recipes/reviews/${reviewId}/approve`
    );
    return response.data;
  }

  /**
   * Reject a review (Admin only)
   */
  async rejectReview(
    reviewId: string,
    reason: string
  ): Promise<ApiResponse<RecipeReview>> {
    const response = await apiClient.patch<ApiResponse<RecipeReview>>(
      `/recipes/reviews/${reviewId}/reject`,
      { reason }
    );
    return response.data;
  }
}

export default new RecipeService();
