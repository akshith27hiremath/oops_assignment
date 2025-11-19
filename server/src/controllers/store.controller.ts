import { Request, Response } from 'express';
import Retailer from '../models/Retailer.model';
import Product from '../models/Product.model';
import Inventory from '../models/Inventory.model';
import locationService from '../services/location.service';
import { logger } from '../utils/logger';
import { UserType } from '../models/User.model';

/**
 * Store Controller
 * Handles store/retailer location-based operations
 */

/**
 * Get nearby stores based on user location
 * GET /api/stores/nearby
 * Query params: lat, lng, radius (optional, default 10km), category (optional)
 */
export const getNearbyStores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius = 10, category, openNow, minRating } = req.query;

    // Validate required parameters
    if (!lat || !lng) {
      res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
      return;
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusInKm = parseFloat(radius as string);

    // Validate coordinates
    if (!locationService.validateCoordinates(latitude, longitude)) {
      res.status(400).json({
        success: false,
        message: 'Invalid coordinates',
      });
      return;
    }

    // Build query for retailers
    const query: any = {
      userType: UserType.RETAILER,
      isActive: true,
      'profile.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude], // GeoJSON uses [lng, lat]
          },
          $maxDistance: radiusInKm * 1000, // Convert km to meters
        },
      },
    };

    // Optional filters
    if (openNow === 'true') {
      query['store.isOpen'] = true;
    }

    if (minRating) {
      query['store.rating'] = { $gte: parseFloat(minRating as string) };
    }

    // Find nearby retailers
    const retailers = await Retailer.find(query)
      .select('profile store email phone createdAt')
      .limit(50) // Limit results
      .lean();

    // Calculate distance and get additional data for each store
    const storesWithDetails = await Promise.all(
      retailers.map(async (retailer: any) => {
        // Convert GeoJSON to latitude/longitude object for response
        const retailerLocation = locationService.geoJsonToLatLng(retailer.profile.location);

        const distance = locationService.calculateDistance(
          { latitude, longitude },
          retailer.profile.location
        );

        // Get product count for this retailer
        let productsCount = 0;
        if (category) {
          productsCount = await Product.countDocuments({
            createdBy: retailer._id,
            isActive: true,
            'category.name': category,
          });
        } else {
          productsCount = await Product.countDocuments({
            createdBy: retailer._id,
            isActive: true,
          });
        }

        return {
          _id: retailer._id,
          name: retailer.store.name,
          description: retailer.store.description,
          location: retailerLocation, // Use converted location
          address: retailer.profile.address,
          operatingHours: retailer.store.operatingHours,
          rating: retailer.store.rating,
          reviewCount: retailer.store.reviewCount,
          deliveryRadius: retailer.store.deliveryRadius,
          isOpen: retailer.store.isOpen,
          distance,
          formattedDistance: locationService.formatDistance(distance),
          productsCount,
          email: retailer.email,
          phone: retailer.phone,
        };
      })
    );

    // Filter by category if specified (only stores with products in that category)
    let filteredStores = storesWithDetails;
    if (category) {
      filteredStores = storesWithDetails.filter(store => store.productsCount > 0);
    }

    // Sort by distance
    filteredStores.sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      data: {
        stores: filteredStores,
        total: filteredStores.length,
        userLocation: { latitude, longitude },
        searchRadius: radiusInKm,
      },
    });
  } catch (error: any) {
    logger.error('❌ Get nearby stores error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch nearby stores',
    });
  }
};

/**
 * Get store details by ID
 * GET /api/stores/:id
 */
export const getStoreById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userLat, userLng } = req.query;

    const retailer = await Retailer.findOne({
      _id: id,
      userType: UserType.RETAILER,
      isActive: true,
    })
      .select('profile store email phone createdAt')
      .lean();

    if (!retailer) {
      res.status(404).json({
        success: false,
        message: 'Store not found',
      });
      return;
    }

    // Convert GeoJSON to latitude/longitude object for response
    const retailerLocation = locationService.geoJsonToLatLng(retailer.profile.location);

    // Calculate distance if user location is provided
    let distance = null;
    let formattedDistance = null;
    if (userLat && userLng) {
      const latitude = parseFloat(userLat as string);
      const longitude = parseFloat(userLng as string);
      if (locationService.validateCoordinates(latitude, longitude)) {
        distance = locationService.calculateDistance(
          { latitude, longitude },
          retailer.profile.location
        );
        formattedDistance = locationService.formatDistance(distance);
      }
    }

    // Get products count
    const productsCount = await Product.countDocuments({
      createdBy: retailer._id,
      isActive: true,
    });

    // Get inventory summary
    const inventorySummary = await Inventory.aggregate([
      { $match: { ownerId: retailer._id } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          lowStockItems: {
            $sum: {
              $cond: [
                { $lt: ['$currentStock', '$reorderLevel'] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const storeData = {
      _id: retailer._id,
      name: retailer.store.name,
      description: retailer.store.description,
      location: retailerLocation, // Use converted location
      address: retailer.profile.address,
      operatingHours: retailer.store.operatingHours,
      rating: retailer.store.rating,
      reviewCount: retailer.store.reviewCount,
      deliveryRadius: retailer.store.deliveryRadius,
      isOpen: retailer.store.isOpen,
      distance,
      formattedDistance,
      productsCount,
      inventorySummary: inventorySummary[0] || {
        totalItems: 0,
        totalStock: 0,
        lowStockItems: 0,
      },
      email: retailer.email,
      phone: retailer.phone,
    };

    res.status(200).json({
      success: true,
      data: { store: storeData },
    });
  } catch (error: any) {
    logger.error('❌ Get store by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch store details',
    });
  }
};

/**
 * Search stores with advanced filters
 * POST /api/stores/search
 */
export const searchStores = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      latitude,
      longitude,
      radius = 10,
      query,
      category,
      minRating,
      openNow,
      sortBy = 'distance', // distance, rating, name
    } = req.body;

    if (!latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
      return;
    }

    // Validate coordinates
    if (!locationService.validateCoordinates(latitude, longitude)) {
      res.status(400).json({
        success: false,
        message: 'Invalid coordinates',
      });
      return;
    }

    const searchQuery: any = {
      userType: UserType.RETAILER,
      isActive: true,
      'profile.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radius * 1000,
        },
      },
    };

    // Text search on store name
    if (query) {
      searchQuery['store.name'] = { $regex: query, $options: 'i' };
    }

    if (openNow) {
      searchQuery['store.isOpen'] = true;
    }

    if (minRating) {
      searchQuery['store.rating'] = { $gte: minRating };
    }

    const retailers = await Retailer.find(searchQuery)
      .select('profile store email phone')
      .limit(50)
      .lean();

    const storesWithDetails = await Promise.all(
      retailers.map(async (retailer: any) => {
        // Convert GeoJSON to latitude/longitude object for response
        const retailerLocation = locationService.geoJsonToLatLng(retailer.profile.location);

        const distance = locationService.calculateDistance(
          { latitude, longitude },
          retailer.profile.location
        );

        let productsCount = 0;
        if (category) {
          productsCount = await Product.countDocuments({
            createdBy: retailer._id,
            isActive: true,
            'category.name': category,
          });
        } else {
          productsCount = await Product.countDocuments({
            createdBy: retailer._id,
            isActive: true,
          });
        }

        return {
          _id: retailer._id,
          name: retailer.store.name,
          description: retailer.store.description,
          location: retailerLocation, // Use converted location
          address: retailer.profile.address,
          rating: retailer.store.rating,
          reviewCount: retailer.store.reviewCount,
          isOpen: retailer.store.isOpen,
          distance,
          formattedDistance: locationService.formatDistance(distance),
          productsCount,
        };
      })
    );

    // Filter by category if specified
    let filteredStores = storesWithDetails;
    if (category) {
      filteredStores = storesWithDetails.filter(store => store.productsCount > 0);
    }

    // Sort results
    filteredStores.sort((a, b) => {
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // Default: sort by distance
      return a.distance - b.distance;
    });

    res.status(200).json({
      success: true,
      data: {
        stores: filteredStores,
        total: filteredStores.length,
      },
    });
  } catch (error: any) {
    logger.error('❌ Search stores error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search stores',
    });
  }
};

export default {
  getNearbyStores,
  getStoreById,
  searchStores,
};
