/**
 * Recipe Browse Page
 * Browse and discover recipes with filters
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import RecipeCard from '../../components/recipes/RecipeCard';
import RecipeFiltersPanel from '../../components/recipes/RecipeFiltersPanel';
import recipeService from '../../services/recipe.service';
import { Recipe, RecipeFilters } from '../../types/recipe.types';
import { Search, ChefHat, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const RecipeBrowse: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [filters, setFilters] = useState<RecipeFilters>({
    page: 1,
    limit: 12,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Load recipes when filters change
  useEffect(() => {
    loadRecipes();
  }, [filters]);

  // Handle search query from URL params
  useEffect(() => {
    const query = searchParams.get('search');
    if (query) {
      setSearchQuery(query);
      handleSearch(query);
    }
  }, [searchParams]);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await recipeService.browseRecipes(filters);

      setRecipes(response.data.recipes);
      setCurrentPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.pages);
      setTotalRecipes(response.data.pagination.total);
    } catch (error: any) {
      console.error('Failed to load recipes:', error);
      toast.error(error.response?.data?.message || 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setFilters({
      ...filters,
      search: query || undefined,
      page: 1,
    });
    setSearchQuery(query);

    // Update URL params
    if (query) {
      setSearchParams({ search: query });
    } else {
      setSearchParams({});
    }
  };

  const handleFilterChange = (newFilters: RecipeFilters) => {
    setFilters({
      ...newFilters,
      page: 1,
      limit: filters.limit,
    });
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: filters.limit,
    });
    setSearchQuery('');
    setSearchParams({});
  };

  const handlePageChange = (page: number) => {
    setFilters({
      ...filters,
      page,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <ChefHat className="w-10 h-10" />
              <h1 className="text-4xl font-bold">Recipe Collection</h1>
            </div>
            <p className="text-green-100 text-lg">
              Discover delicious recipes and get all ingredients delivered
            </p>

            {/* Search Bar */}
            <div className="mt-6 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery);
                    }
                  }}
                  placeholder="Search recipes by name, ingredient, cuisine..."
                  className="w-full px-6 py-4 pr-12 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-300"
                />
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-6">
            {/* Filters Sidebar */}
            <RecipeFiltersPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              isOpen={isFiltersOpen}
              onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
            />

            {/* Recipe Grid */}
            <div className="flex-1">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {filters.search
                    ? `Search Results for "${filters.search}"`
                    : 'All Recipes'}
                  <span className="text-gray-500 font-normal ml-2">
                    ({totalRecipes} {totalRecipes === 1 ? 'recipe' : 'recipes'})
                  </span>
                </h2>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <Loader className="w-8 h-8 animate-spin text-green-600" />
                  <span className="ml-3 text-gray-600">Loading recipes...</span>
                </div>
              )}

              {/* No Results */}
              {!loading && recipes.length === 0 && (
                <div className="text-center py-20">
                  <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No recipes found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your filters or search query
                  </p>
                  <button
                    onClick={handleClearFilters}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              {/* Recipe Grid */}
              {!loading && recipes.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recipes.map((recipe) => (
                      <RecipeCard key={recipe._id} recipe={recipe} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((page) => {
                            // Show first, last, current, and nearby pages
                            return (
                              page === 1 ||
                              page === totalPages ||
                              Math.abs(page - currentPage) <= 1
                            );
                          })
                          .map((page, index, array) => {
                            // Add ellipsis if there's a gap
                            const prevPage = array[index - 1];
                            const showEllipsis = prevPage && page - prevPage > 1;

                            return (
                              <React.Fragment key={page}>
                                {showEllipsis && (
                                  <span className="px-2 text-gray-400">...</span>
                                )}
                                <button
                                  onClick={() => handlePageChange(page)}
                                  className={`px-4 py-2 rounded-lg ${
                                    page === currentPage
                                      ? 'bg-green-600 text-white'
                                      : 'border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default RecipeBrowse;
