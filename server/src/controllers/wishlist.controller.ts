import { Request, Response } from 'express';
import Customer from '../models/Customer.model';
import Product from '../models/Product.model';
import Inventory from '../models/Inventory.model';
import Wishlist from '../models/Wishlist.model';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

/**
 * Wishlist Controller
 * Handles all wishlist-related operations for customers
 */

/**
 * Get customer's wishlist
 * GET /api/wishlist
 */
export const getWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Find customer by _id (not userId - Customer IS the User)
    let customer = await Customer.findById(req.user._id)
      .populate({
        path: 'wishlist',
        select: '-__v',
        populate: {
          path: 'createdBy',
          select: 'profile businessName userType',
        },
      })
      .lean();

    if (!customer) {
      // Customer profile doesn't exist - should only happen if user is not CUSTOMER type
      logger.warn(`⚠️ Customer profile not found for user ${req.user.email} (userType: ${req.user.userType})`);

      res.status(404).json({
        success: false,
        message: 'Customer profile not found. This feature is only available for customer accounts.',
      });
      return;
    }

    // Filter out any null products (in case some were deleted)
    const products = (customer.wishlist || []).filter((product: any) => product !== null);

    // Fetch inventory data for each product to get stock information
    const productsWithStock = await Promise.all(
      products.map(async (product: any) => {
        // Find inventory for this product (there could be multiple retailers selling it)
        // We'll aggregate the total available stock across all retailers
        const inventories = await Inventory.find({
          productId: product._id,
          availability: true,
        }).lean();

        const totalStock = inventories.reduce(
          (sum, inv) => sum + (inv.currentStock - inv.reservedStock),
          0
        );

        return {
          ...product,
          stock: Math.max(0, totalStock), // Ensure stock is never negative
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        products: productsWithStock,
        count: productsWithStock.length,
      },
    });
  } catch (error: any) {
    logger.error('❌ Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wishlist',
      error: error.message,
    });
  }
};

/**
 * Add product to wishlist
 * POST /api/wishlist
 * Body: { productId }
 */
export const addToWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { productId } = req.body;

    if (!productId) {
      res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
      return;
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Find customer by _id (Customer IS the User)
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer profile not found. This feature is only available for customer accounts.',
      });
      return;
    }

    // Add to wishlist
    await customer.addToWishlist(new mongoose.Types.ObjectId(productId));

    logger.info(`✅ Product ${productId} added to wishlist for user ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
    });
  } catch (error: any) {
    logger.error('❌ Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist',
      error: error.message,
    });
  }
};

/**
 * Remove product from wishlist
 * DELETE /api/wishlist/:productId
 */
export const removeFromWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { productId } = req.params;

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer profile not found. This feature is only available for customer accounts.',
      });
      return;
    }

    // Remove from wishlist
    await customer.removeFromWishlist(new mongoose.Types.ObjectId(productId));

    logger.info(`✅ Product ${productId} removed from wishlist for user ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
    });
  } catch (error: any) {
    logger.error('❌ Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist',
      error: error.message,
    });
  }
};

/**
 * Check if product is in wishlist
 * GET /api/wishlist/check/:productId
 */
export const checkWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { productId } = req.params;

    const customer = await Customer.findById(req.user._id).lean();

    const isInWishlist = customer?.wishlist?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === productId
    ) || false;

    res.status(200).json({
      success: true,
      data: {
        isInWishlist,
      },
    });
  } catch (error: any) {
    logger.error('❌ Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist',
      error: error.message,
    });
  }
};

/**
 * Clear entire wishlist
 * DELETE /api/wishlist
 */
export const clearWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer profile not found. This feature is only available for customer accounts.',
      });
      return;
    }

    customer.wishlist = [];
    await customer.save();

    logger.info(`✅ Wishlist cleared for user ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared',
    });
  } catch (error: any) {
    logger.error('❌ Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist',
      error: error.message,
    });
  }
};

/**
 * Add all wishlist items to cart
 * POST /api/wishlist/move-to-cart
 */
export const moveWishlistToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const customer = await Customer.findById(req.user._id)
      .populate('wishlist')
      .lean();

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer profile not found. This feature is only available for customer accounts.',
      });
      return;
    }

    const products = customer.wishlist || [];

    res.status(200).json({
      success: true,
      data: {
        products,
        count: products.length,
      },
      message: 'Wishlist items ready to add to cart',
    });
  } catch (error: any) {
    logger.error('❌ Move wishlist to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move wishlist to cart',
      error: error.message,
    });
  }
};

/**
 * Set target price for wishlist item
 * PUT /api/wishlist/:productId/target-price
 */
export const setTargetPrice = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { productId } = req.params;
    const { targetPrice } = req.body;

    // Validate target price
    if (targetPrice !== undefined && (targetPrice < 0 || isNaN(targetPrice))) {
      res.status(400).json({
        success: false,
        message: 'Invalid target price',
      });
      return;
    }

    // Get or create wishlist
    let wishlist = await Wishlist.findOne({ customerId: req.user._id });

    if (!wishlist) {
      // Create new wishlist if it doesn't exist
      wishlist = new Wishlist({
        customerId: req.user._id,
        items: [],
      });
    }

    // Find the item in wishlist
    const item = wishlist.items.find(
      (item: any) => item.productId.toString() === productId
    );

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Product not in wishlist. Add to wishlist first.',
      });
      return;
    }

    // Set target price
    await wishlist.setTargetPrice(new mongoose.Types.ObjectId(productId), targetPrice);

    logger.info(`✅ Target price ₹${targetPrice} set for product ${productId} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Target price set successfully',
      data: { item },
    });
  } catch (error: any) {
    logger.error('❌ Set target price error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set target price',
      error: error.message,
    });
  }
};

/**
 * Update wishlist item preferences
 * PUT /api/wishlist/:productId/preferences
 */
export const updateItemPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { productId } = req.params;
    const preferences = req.body;

    const wishlist = await Wishlist.findOne({ customerId: req.user._id });

    if (!wishlist) {
      res.status(404).json({
        success: false,
        message: 'Wishlist not found',
      });
      return;
    }

    const item = wishlist.items.find(
      (item: any) => item.productId.toString() === productId
    );

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Product not in wishlist',
      });
      return;
    }

    // Update preferences
    await wishlist.updateItemPreferences(new mongoose.Types.ObjectId(productId), preferences);

    logger.info(`✅ Preferences updated for product ${productId} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: { item },
    });
  } catch (error: any) {
    logger.error('❌ Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message,
    });
  }
};

/**
 * Get price history for a product
 * GET /api/wishlist/price-history/:productId
 */
export const getPriceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { productId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const priceMonitoringService = (await import('../services/priceMonitoring.service')).default;
    const history = await priceMonitoringService.getPriceHistory(productId, days);

    if (!history) {
      res.status(404).json({
        success: false,
        message: 'No price history found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { history },
    });
  } catch (error: any) {
    logger.error('❌ Get price history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get price history',
      error: error.message,
    });
  }
};

export default {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist,
  moveWishlistToCart,
  setTargetPrice,
  updateItemPreferences,
  getPriceHistory,
};
