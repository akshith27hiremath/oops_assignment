import React from 'react';
import { Link } from 'react-router-dom';
import {
  Recipe,
  formatCookTime,
  getDifficultyColor,
  getDietaryTagColor,
  DietaryTagLabels,
} from '../../types/recipe.types';
import { Clock, Users, Star, ChefHat, Eye } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  return (
    <Link
      to={`/customer/recipes/${recipe.recipeId}`}
      className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img
          src={recipe.coverImage}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* Featured Badge */}
        {recipe.featured && (
          <div className="absolute top-3 left-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            Featured
          </div>
        )}

        {/* Difficulty Badge */}
        <div
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(
            recipe.difficulty
          )}`}
        >
          {recipe.difficulty}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
          {recipe.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {recipe.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          {/* Cook Time */}
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatCookTime(recipe.totalTime)}</span>
          </div>

          {/* Servings */}
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings}</span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">
              {recipe.averageRating > 0
                ? recipe.averageRating.toFixed(1)
                : 'New'}
            </span>
            {recipe.ratingCount > 0 && (
              <span className="text-gray-400">({recipe.ratingCount})</span>
            )}
          </div>
        </div>

        {/* Dietary Tags */}
        {recipe.dietaryTags && recipe.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.dietaryTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`text-xs px-2 py-0.5 rounded-full border ${getDietaryTagColor(
                  tag
                )}`}
              >
                {DietaryTagLabels[tag]}
              </span>
            ))}
            {recipe.dietaryTags.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">
                +{recipe.dietaryTags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Cuisine */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <ChefHat className="w-4 h-4" />
            <span>{recipe.cuisine}</span>
          </div>

          {/* Views */}
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Eye className="w-4 h-4" />
            <span>{recipe.viewCount || 0} views</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default RecipeCard;
