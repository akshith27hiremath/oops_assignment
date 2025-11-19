import { Request, Response } from 'express';
import Inventory from '../models/Inventory.model';
import Product from '../models/Product.model';
import { logger } from '../utils/logger';

/**
 * Inventory Controller
 * Handles stock management operations
 */

/**
 * Get inventory for current user
 * GET /api/inventory
 */
export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [inventory, total] = await Promise.all([
      Inventory.find({ ownerId: req.user._id })
        .populate('productId', 'name category basePrice unit images')
        .populate('wholesalerId', 'profile.name businessName')
        .populate('sourceOrderId', 'orderNumber createdAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Inventory.countDocuments({ ownerId: req.user._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        inventory,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    logger.error('❌ Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch inventory',
    });
  }
};

/**
 * Create inventory entry
 * POST /api/inventory
 */
export const createInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { productId, currentStock, reorderLevel, sellingPrice } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Check if product belongs to this user
    if (product.createdBy.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only create inventory for your own products',
      });
      return;
    }

    // Check if inventory already exists
    const existingInventory = await Inventory.findOne({
      productId,
      ownerId: req.user._id,
    });

    if (existingInventory) {
      res.status(400).json({
        success: false,
        message: 'Inventory already exists for this product',
      });
      return;
    }

    // Create inventory
    const inventory = await Inventory.create({
      productId,
      ownerId: req.user._id,
      currentStock: currentStock || 0,
      reservedStock: 0,
      reorderLevel: reorderLevel || 10,
      sellingPrice: sellingPrice || product.basePrice,
      availability: (currentStock || 0) > 0,
      lastRestocked: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Inventory created successfully',
      data: { inventory },
    });
  } catch (error: any) {
    logger.error('❌ Create inventory error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create inventory',
    });
  }
};

/**
 * Update stock level
 * PATCH /api/inventory/:id/stock
 */
export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const { currentStock } = req.body;

    if (currentStock === undefined || currentStock < 0) {
      res.status(400).json({
        success: false,
        message: 'Valid stock quantity is required',
      });
      return;
    }

    const inventory = await Inventory.findById(id);

    if (!inventory) {
      res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
      return;
    }

    // Check ownership
    if (inventory.ownerId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own inventory',
      });
      return;
    }

    // Update stock
    inventory.currentStock = currentStock;
    inventory.availability = currentStock > 0;
    inventory.lastRestocked = new Date();
    await inventory.save();

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: { inventory },
    });
  } catch (error: any) {
    logger.error('❌ Update stock error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update stock',
    });
  }
};

/**
 * Get inventory by product ID
 * GET /api/inventory/product/:productId
 */
export const getInventoryByProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { productId } = req.params;

    const inventory = await Inventory.findOne({
      productId,
      ownerId: req.user._id,
    }).populate('productId');

    if (!inventory) {
      res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { inventory },
    });
  } catch (error: any) {
    logger.error('❌ Get inventory by product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch inventory',
    });
  }
};

/**
 * Set product discount
 * POST /api/inventory/:id/discount
 */
export const setProductDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const { discountPercentage, validUntil, reason } = req.body;

    if (!discountPercentage || !validUntil) {
      res.status(400).json({
        success: false,
        message: 'Discount percentage and valid until date are required',
      });
      return;
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      res.status(400).json({
        success: false,
        message: 'Discount percentage must be between 0 and 100',
      });
      return;
    }

    const inventory = await Inventory.findById(id).populate('productId');

    if (!inventory) {
      res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
      return;
    }

    // Check ownership
    if (inventory.ownerId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own inventory',
      });
      return;
    }

    await inventory.setProductDiscount(
      discountPercentage,
      new Date(validUntil),
      reason
    );

    logger.info(`✅ Product discount set: ${discountPercentage}% on ${inventory.productId}`);

    res.status(200).json({
      success: true,
      message: 'Product discount set successfully',
      data: { inventory },
    });
  } catch (error: any) {
    logger.error('❌ Set product discount error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to set product discount',
    });
  }
};

/**
 * Remove product discount
 * DELETE /api/inventory/:id/discount
 */
export const removeProductDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;

    const inventory = await Inventory.findById(id).populate('productId');

    if (!inventory) {
      res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
      return;
    }

    // Check ownership
    if (inventory.ownerId.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own inventory',
      });
      return;
    }

    await inventory.removeProductDiscount();

    logger.info(`✅ Product discount removed from ${inventory.productId}`);

    res.status(200).json({
      success: true,
      message: 'Product discount removed successfully',
      data: { inventory },
    });
  } catch (error: any) {
    logger.error('❌ Remove product discount error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to remove product discount',
    });
  }
};

/**
 * Get featured products (with discounts)
 * GET /api/inventory/featured
 */
export const getFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10 } = req.query;

    const featuredProducts = await Inventory.findFeaturedProducts(Number(limit));

    res.status(200).json({
      success: true,
      data: { products: featuredProducts },
    });
  } catch (error: any) {
    logger.error('❌ Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch featured products',
    });
  }
};

export default {
  getInventory,
  createInventory,
  updateStock,
  getInventoryByProduct,
  setProductDiscount,
  removeProductDiscount,
  getFeaturedProducts,
};
