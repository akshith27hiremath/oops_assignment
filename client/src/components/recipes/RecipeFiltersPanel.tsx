import React from 'react';
import {
  RecipeCategory,
  DietaryTag,
  DifficultyLevel,
  CategoryLabels,
  DietaryTagLabels,
  DifficultyLabels,
  RecipeFilters,
} from '../../types/recipe.types';
import { X, SlidersHorizontal } from 'lucide-react';

interface RecipeFiltersPanelProps {
  filters: RecipeFilters;
  onFilterChange: (filters: RecipeFilters) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const RecipeFiltersPanel: React.FC<RecipeFiltersPanelProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  isOpen,
  onToggle,
}) => {
  const handleCategoryChange = (category: RecipeCategory | '') => {
    onFilterChange({
      ...filters,
      category: category || undefined,
    });
  };

  const handleDifficultyChange = (difficulty: DifficultyLevel | '') => {
    onFilterChange({
      ...filters,
      difficulty: difficulty || undefined,
    });
  };

  const handleDietaryTagToggle = (tag: DietaryTag) => {
    const currentTags = filters.dietaryTags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    onFilterChange({
      ...filters,
      dietaryTags: newTags.length > 0 ? newTags : undefined,
    });
  };

  const handleCuisineChange = (cuisine: string) => {
    onFilterChange({
      ...filters,
      cuisine: cuisine || undefined,
    });
  };

  const handleMaxTimeChange = (time: string) => {
    onFilterChange({
      ...filters,
      maxTime: time ? parseInt(time) : undefined,
    });
  };

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.difficulty ? 1 : 0) +
    (filters.cuisine ? 1 : 0) +
    (filters.maxTime ? 1 : 0) +
    (filters.dietaryTags?.length || 0);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-full shadow-lg z-40 flex items-center gap-2"
      >
        <SlidersHorizontal className="w-5 h-5" />
        {activeFilterCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      <div
        className={`
          lg:block lg:relative lg:w-64 lg:flex-shrink-0
          fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Content */}
        <div className="p-4 h-full overflow-y-auto">
          {/* Header (Desktop) */}
          <div className="hidden lg:flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            {activeFilterCount > 0 && (
              <button
                onClick={onClearFilters}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) =>
                handleCategoryChange(e.target.value as RecipeCategory | '')
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {Object.entries(CategoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty
            </label>
            <select
              value={filters.difficulty || ''}
              onChange={(e) =>
                handleDifficultyChange(e.target.value as DifficultyLevel | '')
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Any Difficulty</option>
              {Object.entries(DifficultyLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Cuisine Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cuisine
            </label>
            <input
              type="text"
              value={filters.cuisine || ''}
              onChange={(e) => handleCuisineChange(e.target.value)}
              placeholder="e.g., Italian, Indian, Chinese"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Max Time Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Cooking Time
            </label>
            <select
              value={filters.maxTime || ''}
              onChange={(e) => handleMaxTimeChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Any Duration</option>
              <option value="15">Under 15 min</option>
              <option value="30">Under 30 min</option>
              <option value="45">Under 45 min</option>
              <option value="60">Under 1 hour</option>
              <option value="120">Under 2 hours</option>
            </select>
          </div>

          {/* Dietary Tags Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Dietary Preferences
            </label>
            <div className="space-y-2">
              {Object.entries(DietaryTagLabels).map(([key, label]) => {
                const isChecked = filters.dietaryTags?.includes(
                  key as DietaryTag
                );
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleDietaryTagToggle(key as DietaryTag)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-green-600">
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Mobile Clear Button */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                onClearFilters();
                onToggle();
              }}
              className="lg:hidden w-full mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default RecipeFiltersPanel;
