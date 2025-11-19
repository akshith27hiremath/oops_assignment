import { Request, Response } from 'express';
import { elasticsearchService } from '../services/elasticsearch.service';
import Product from '../models/Product.model';
import { logger } from '../utils/logger';

/**
 * Search Controller
 * Handles Elasticsearch-powered product search
 */

/**
 * Smart Product Search
 * GET /api/search/products
 * Query params: q, category, minPrice, maxPrice, sellerType, minRating, page, limit, sortBy
 */
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      sellerType,
      minRating,
      page,
      limit,
      sortBy,
    } = req.query;

    // Validate and parse parameters
    const searchParams = {
      query: (q as string) || '',
      category: category as string | undefined,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      sellerType: sellerType as 'RETAILER' | 'WHOLESALER' | undefined,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      sortBy: (sortBy as 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest') || 'relevance',
    };

    // Validate numeric parameters
    if (searchParams.minPrice !== undefined && isNaN(searchParams.minPrice)) {
      res.status(400).json({
        success: false,
        message: 'Invalid minPrice parameter',
      });
      return;
    }

    if (searchParams.maxPrice !== undefined && isNaN(searchParams.maxPrice)) {
      res.status(400).json({
        success: false,
        message: 'Invalid maxPrice parameter',
      });
      return;
    }

    if (isNaN(searchParams.page) || searchParams.page < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid page parameter',
      });
      return;
    }

    if (isNaN(searchParams.limit) || searchParams.limit < 1 || searchParams.limit > 100) {
      res.status(400).json({
        success: false,
        message: 'Invalid limit parameter (must be between 1 and 100)',
      });
      return;
    }

    // Perform search
    const result = await elasticsearchService.searchProducts(searchParams);

    logger.info(`🔍 Search: "${searchParams.query}" - Found ${result.total} results`);

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform search',
      error: error.message,
    });
  }
};

/**
 * Get search suggestions (autocomplete)
 * GET /api/search/suggestions
 * Query params: q
 */
export const getSearchSuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Query must be at least 2 characters',
      });
      return;
    }

    const maxLimit = limit ? Math.min(parseInt(limit as string, 10), 20) : 10;

    // Get autocomplete suggestions with product details
    const suggestions = await elasticsearchService.getSuggestions(q, maxLimit);

    logger.info(`💡 Suggestions for "${q}": Found ${suggestions.length} results`);

    res.json({
      success: true,
      message: 'Suggestions retrieved successfully',
      data: {
        query: q,
        products: suggestions,
        count: suggestions.length,
      },
    });
  } catch (error: any) {
    logger.error('❌ Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      error: error.message,
    });
  }
};

/**
 * Search products by location (geospatial search)
 * POST /api/search/nearby
 * Body: { latitude, longitude, radius, query?, ... }
 */
export const searchNearbyProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      latitude,
      longitude,
      radius,
      query,
      category,
      minPrice,
      maxPrice,
      minRating,
      page,
      limit,
      sortBy,
    } = req.body;

    // Validate required parameters
    if (!latitude || !longitude || !radius) {
      res.status(400).json({
        success: false,
        message: 'Latitude, longitude, and radius (in km) are required',
      });
      return;
    }

    // Validate numeric parameters
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius);

    if (isNaN(lat) || isNaN(lon) || isNaN(rad)) {
      res.status(400).json({
        success: false,
        message: 'Invalid latitude, longitude, or radius',
      });
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90, longitude between -180 and 180',
      });
      return;
    }

    if (rad <= 0 || rad > 1000) {
      res.status(400).json({
        success: false,
        message: 'Radius must be between 0 and 1000 km',
      });
      return;
    }

    // Build search parameters
    const searchParams = {
      latitude: lat,
      longitude: lon,
      radius: rad,
      query: query as string | undefined,
      category: category as string | undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
      sortBy: (sortBy as 'distance' | 'price_asc' | 'price_desc' | 'rating') || 'distance',
    };

    // Perform nearby search
    const result = await elasticsearchService.searchNearby(searchParams);

    logger.info(`📍 Nearby search: [${lat}, ${lon}] within ${rad}km - Found ${result.total} results`);

    res.json({
      success: true,
      message: 'Nearby search completed successfully',
      data: {
        ...result,
        searchParams: {
          latitude: lat,
          longitude: lon,
          radius: rad,
          query: query || null,
        },
      },
    });
  } catch (error: any) {
    logger.error('❌ Nearby search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search nearby products',
      error: error.message,
    });
  }
};

/**
 * Sync products from MongoDB to Elasticsearch
 * POST /api/search/sync
 */
export const syncProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🔄 Starting product sync to Elasticsearch...');

    // Fetch all active products with creator information
    const products = await Product.find({ isActive: { $ne: false } })
      .populate('createdBy', 'profile businessName userType')
      .lean();

    if (products.length === 0) {
      res.json({
        success: true,
        message: 'No products to sync',
        data: { indexed: 0 },
      });
      return;
    }

    // Bulk index products
    await elasticsearchService.bulkIndexProducts(products);

    logger.info(`✅ Synced ${products.length} products to Elasticsearch`);

    res.json({
      success: true,
      message: `Successfully synced ${products.length} products`,
      data: { indexed: products.length },
    });
  } catch (error: any) {
    logger.error('❌ Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync products',
      error: error.message,
    });
  }
};

/**
 * Compare prices across sellers
 * GET /api/search/compare-prices
 * Query params: product (product name)
 */
export const comparePrices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { product, limit } = req.query;

    if (!product || typeof product !== 'string' || product.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Product name must be at least 2 characters',
      });
      return;
    }

    const maxLimit = limit ? Math.min(parseInt(limit as string, 10), 50) : 10;

    // Get price comparison
    const comparison = await elasticsearchService.comparePrices(product, maxLimit);

    if (comparison.totalSellers === 0) {
      res.status(404).json({
        success: false,
        message: `No sellers found for "${product}"`,
      });
      return;
    }

    logger.info(`💰 Price comparison for "${product}": ${comparison.totalSellers} sellers, ₹${comparison.lowestPrice} - ₹${comparison.highestPrice}`);

    res.json({
      success: true,
      message: 'Price comparison retrieved successfully',
      data: comparison,
    });
  } catch (error: any) {
    logger.error('❌ Price comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare prices',
      error: error.message,
    });
  }
};

export default {
  searchProducts,
  getSearchSuggestions,
  searchNearbyProducts,
  syncProducts,
  comparePrices,
};
