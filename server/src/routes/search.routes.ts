import { Router } from 'express';
import searchController from '../controllers/search.controller';

/**
 * Search Routes
 * Handles Elasticsearch-powered product search
 */

const router = Router();

/**
 * Base route - Search API info
 */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Search API',
    endpoints: {
      public: [
        'GET /api/search/products - Smart product search with fuzzy matching',
        'GET /api/search/suggestions - Get autocomplete suggestions',
        'POST /api/search/nearby - Search products near location',
      ],
    },
    parameters: {
      searchProducts: {
        q: 'Search query (string)',
        category: 'Filter by category (string)',
        minPrice: 'Minimum price (number)',
        maxPrice: 'Maximum price (number)',
        sellerType: 'Filter by seller type: RETAILER or WHOLESALER',
        minRating: 'Minimum rating (number, 0-5)',
        page: 'Page number (default: 1)',
        limit: 'Results per page (default: 20, max: 100)',
        sortBy: 'Sort by: relevance, price_asc, price_desc, rating, newest (default: relevance)',
      },
      suggestions: {
        q: 'Search query (min 2 characters)',
      },
      nearby: {
        latitude: 'User latitude (required)',
        longitude: 'User longitude (required)',
        radius: 'Search radius in kilometers (required)',
        query: 'Optional search query',
      },
    },
  });
});

/**
 * Public Routes
 */

// GET /api/search/products - Smart product search
router.get('/products', searchController.searchProducts);

// GET /api/search/suggestions - Autocomplete suggestions
router.get('/suggestions', searchController.getSearchSuggestions);

// POST /api/search/nearby - Geospatial search
router.post('/nearby', searchController.searchNearbyProducts);

// POST /api/search/sync - Sync products to Elasticsearch
router.post('/sync', searchController.syncProducts);

// GET /api/search/compare-prices - Compare prices across sellers
router.get('/compare-prices', searchController.comparePrices);

export default router;
