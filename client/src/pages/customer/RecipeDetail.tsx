/**
 * Recipe Detail Page
 * View recipe details and add all ingredients to cart
 */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import recipeService from '../../services/recipe.service';
import { useCartStore } from '../../stores/cartStore';
import {
  Recipe,
  RecipeMatchResponse,
  IngredientMatchResult,
  formatCookTime,
  getDifficultyColor,
  getDietaryTagColor,
  DietaryTagLabels,
} from '../../types/recipe.types';
import {
  Clock,
  Users,
  Star,
  ChefHat,
  ShoppingCart,
  Check,
  X,
  AlertCircle,
  Loader,
  Plus,
  Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';

const RecipeDetail: React.FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [matchResult, setMatchResult] = useState<RecipeMatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchingIngredients, setMatchingIngredients] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [servings, setServings] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>(
    'ingredients'
  );
  const { addItem } = useCartStore();

  useEffect(() => {
    if (recipeId) {
      loadRecipe();
    }
  }, [recipeId]);

  useEffect(() => {
    if (recipe) {
      setServings(recipe.servings);
      matchIngredients(recipe.servings);
    }
  }, [recipe]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const data = await recipeService.getRecipeById(recipeId!);
      setRecipe(data);
    } catch (error: any) {
      console.error('Failed to load recipe:', error);
      toast.error(error.response?.data?.message || 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const matchIngredients = async (targetServings?: number) => {
    if (!recipeId) return;

    try {
      setMatchingIngredients(true);
      const result = await recipeService.matchRecipeIngredients(
        recipeId,
        targetServings
      );
      setMatchResult(result.data);
    } catch (error: any) {
      console.error('Failed to match ingredients:', error);
      toast.error('Failed to find matching products');
    } finally {
      setMatchingIngredients(false);
    }
  };

  const handleServingsChange = (newServings: number) => {
    if (newServings < 1 || !recipe) return;
    setServings(newServings);
    matchIngredients(newServings);
  };

  const handleAddAllToCart = async () => {
    if (!matchResult) return;

    try {
      setAddingToCart(true);
      let addedCount = 0;
      let unavailableCount = 0;

      for (const ingredientMatch of matchResult.ingredientMatches) {
        if (ingredientMatch.bestMatch) {
          const match = ingredientMatch.bestMatch;

          try {
            await addItem({
              productId: match.product._id,
              quantity: Math.ceil(match.suggestedQuantity), // Round up to ensure enough
            });
            addedCount++;
          } catch (error) {
            console.error(
              `Failed to add ${match.product.name}:`,
              error
            );
          }
        } else {
          unavailableCount++;
        }
      }

      if (addedCount > 0) {
        toast.success(
          `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to cart!${
            unavailableCount > 0
              ? ` (${unavailableCount} unavailable)`
              : ''
          }`
        );
      } else {
        toast.error('No items could be added to cart');
      }
    } catch (error) {
      console.error('Failed to add items to cart:', error);
      toast.error('Failed to add items to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddSingleItem = async (match: IngredientMatchResult) => {
    if (!match.bestMatch) return;

    try {
      await addItem({
        productId: match.bestMatch.product._id,
        quantity: Math.ceil(match.bestMatch.suggestedQuantity),
      });

      toast.success(`Added ${match.bestMatch.product.name} to cart!`);
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add item to cart');
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="w-8 h-8 animate-spin text-green-600" />
          <span className="ml-3 text-gray-600">Loading recipe...</span>
        </div>
      </CustomerLayout>
    );
  }

  if (!recipe) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <ChefHat className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Recipe not found
          </h2>
          <Link
            to="/recipes"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← Back to recipes
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-gray-50 pb-12">
        {/* Hero Section */}
        <div className="relative h-96 bg-gray-900">
          <img
            src={recipe.coverImage}
            alt={recipe.title}
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Recipe Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-2 mb-3">
                {recipe.dietaryTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs px-3 py-1 rounded-full border ${getDietaryTagColor(
                      tag
                    )} bg-opacity-90`}
                  >
                    {DietaryTagLabels[tag]}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {recipe.title}
              </h1>
              <p className="text-white/90 text-lg mb-4">
                {recipe.description}
              </p>

              {/* Recipe Meta */}
              <div className="flex items-center gap-6 text-white">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{formatCookTime(recipe.totalTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{recipe.servings} servings</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span>
                    {recipe.averageRating > 0
                      ? `${recipe.averageRating.toFixed(1)} (${
                          recipe.ratingCount
                        })`
                      : 'No ratings'}
                  </span>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(
                    recipe.difficulty
                  )}`}
                >
                  {recipe.difficulty}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Instructions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-sm p-1 flex gap-2">
                <button
                  onClick={() => setActiveTab('ingredients')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'ingredients'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Ingredients
                </button>
                <button
                  onClick={() => setActiveTab('instructions')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'instructions'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Instructions
                </button>
              </div>

              {/* Instructions Tab */}
              {activeTab === 'instructions' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Cooking Instructions
                  </h2>
                  <div className="space-y-6">
                    {recipe.instructions.map((step) => (
                      <div key={step.stepNumber} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold">
                          {step.stepNumber}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-700 leading-relaxed">
                            {step.instruction}
                          </p>
                          {step.duration && (
                            <p className="text-sm text-gray-500 mt-1">
                              <Clock className="w-4 h-4 inline mr-1" />
                              {step.duration} minutes
                            </p>
                          )}
                          {step.temperature && (
                            <p className="text-sm text-gray-500 mt-1">
                              🌡️ {step.temperature}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingredients Tab */}
              {activeTab === 'ingredients' && matchResult && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Ingredients
                    </h2>

                    {/* Servings Adjuster */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Servings:</span>
                      <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                        <button
                          onClick={() => handleServingsChange(servings - 1)}
                          disabled={servings <= 1}
                          className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 font-semibold">{servings}</span>
                        <button
                          onClick={() => handleServingsChange(servings + 1)}
                          className="p-2 hover:bg-gray-100"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {matchingIngredients ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader className="w-6 h-6 animate-spin text-green-600" />
                      <span className="ml-3 text-gray-600">
                        Finding products...
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {matchResult.ingredientMatches.map((match, index) => (
                        <IngredientMatchCard
                          key={index}
                          match={match}
                          onAddToCart={() => handleAddSingleItem(match)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cooking Tips */}
              {recipe.tips && recipe.tips.length > 0 && (
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    💡 Pro Tips
                  </h3>
                  <ul className="space-y-2">
                    {recipe.tips.map((tip, index) => (
                      <li key={index} className="text-amber-800 flex gap-2">
                        <span className="flex-shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right Column - Sticky Add to Cart */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-4">
                {/* Availability Summary */}
                {matchResult && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Ingredient Availability
                    </h3>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Available</span>
                        <span className="font-semibold text-green-600">
                          {matchResult.availabilityPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${matchResult.availabilityPercentage}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Available:</span>
                        <span className="font-semibold text-green-600 flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          {matchResult.totalAvailableIngredients}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Not found:</span>
                        <span className="font-semibold text-red-600 flex items-center gap-1">
                          <X className="w-4 h-4" />
                          {matchResult.totalIngredients -
                            matchResult.totalAvailableIngredients}
                        </span>
                      </div>
                    </div>

                    {/* Estimated Total */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span className="text-gray-900">Estimated Total:</span>
                        <span className="text-green-600">
                          ₹{matchResult.estimatedTotal.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Price may vary based on selected products
                      </p>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={handleAddAllToCart}
                      disabled={
                        addingToCart ||
                        matchingIngredients ||
                        matchResult.totalAvailableIngredients === 0
                      }
                      className="w-full mt-4 bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingToCart ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Adding to Cart...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5" />
                          Add All to Cart
                        </>
                      )}
                    </button>

                    {matchResult.totalAvailableIngredients === 0 && (
                      <p className="text-sm text-red-600 text-center mt-2">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        No ingredients available for delivery
                      </p>
                    )}
                  </div>
                )}

                {/* Nutrition Info */}
                {recipe.nutritionInfo && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Nutrition Facts
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Per serving ({recipe.nutritionInfo.servingSize})
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-semibold">Calories</span>
                        <span>{recipe.nutritionInfo.calories} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protein</span>
                        <span>{recipe.nutritionInfo.protein}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carbohydrates</span>
                        <span>{recipe.nutritionInfo.carbohydrates}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fat</span>
                        <span>{recipe.nutritionInfo.fat}g</span>
                      </div>
                      {recipe.nutritionInfo.fiber && (
                        <div className="flex justify-between">
                          <span>Fiber</span>
                          <span>{recipe.nutritionInfo.fiber}g</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

// Ingredient Match Card Component
interface IngredientMatchCardProps {
  match: IngredientMatchResult;
  onAddToCart: () => void;
}

const IngredientMatchCard: React.FC<IngredientMatchCardProps> = ({
  match,
  onAddToCart,
}) => {
  if (!match.bestMatch) {
    return (
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {match.ingredient.name}
              </p>
              <p className="text-sm text-gray-600">
                {match.ingredient.quantity} {match.ingredient.unit}
              </p>
            </div>
            <span className="text-sm text-red-600 font-medium">
              Not Available
            </span>
          </div>
          {match.ingredient.substitutes && match.ingredient.substitutes.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              💡 Substitute: {match.ingredient.substitutes.join(', ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  const product = match.bestMatch;
  const originalPrice = product.inventory.sellingPrice * product.suggestedQuantity;
  const discountedPrice = product.inventory.productDiscount?.isActive
    ? originalPrice *
      (1 - product.inventory.productDiscount.discountPercentage / 100)
    : originalPrice;

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-green-500 transition-colors">
      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-medium text-gray-900">{match.ingredient.name}</p>
            <p className="text-sm text-gray-600">
              {match.ingredient.quantity} {match.ingredient.unit}
            </p>
            <p className="text-sm text-green-600 font-medium mt-1">
              → {product.product.name} ({Math.ceil(product.suggestedQuantity)}{' '}
              {product.product.unit})
            </p>
            {product.unitConversion && (
              <p className="text-xs text-gray-500 mt-1">
                {product.unitConversion}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              {product.inventory.productDiscount?.isActive && (
                <span className="text-xs text-gray-400 line-through">
                  ₹{originalPrice.toFixed(2)}
                </span>
              )}
              <span className="font-semibold text-gray-900">
                ₹{discountedPrice.toFixed(2)}
              </span>
            </div>
            <button
              onClick={onAddToCart}
              className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
