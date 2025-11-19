import { Request, Response } from 'express';
import Product, { ProductType } from '../models/Product.model';
import Inventory from '../models/Inventory.model';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

/**
 * Wholesale/B2B Controller
 * Handles B2B marketplace operations for retailers to browse and order from wholesalers
 */

/**
 * Get all wholesale products (B2B Marketplace)
 * GET /api/wholesale/products
 * Accessible by: RETAILER, WHOLESALER
 */
export const getWholesaleProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Match only wholesale products available for retailers
    const productMatch: any = {
      productType: ProductType.WHOLESALE,
      isActive: true,
      availableForRetailers: true,
    };

    if (category) {
      productMatch['category.name'] = category;
    }

    if (search) {
      productMatch.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } },
      ];
    }

    if (minPrice || maxPrice) {
      productMatch.basePrice = {};
      if (minPrice) productMatch.basePrice.$gte = Number(minPrice);
      if (maxPrice) productMatch.basePrice.$lte = Number(maxPrice);
    }

    // Sorting
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Build aggregation pipeline
    const countPipeline = [
      { $match: productMatch },
      { $count: 'total' },
    ];

    const productsPipeline = [
      { $match: productMatch },
      { $sort: sort },
      { $skip: skip },
      { $limit: limitNum },
      // Join with inventory to get stock info
      {
        $lookup: {
          from: 'inventories',
          localField: '_id',
          foreignField: 'productId',
          as: 'inventoryInfo',
        },
      },
      // Join with wholesaler info
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'wholesaler',
        },
      },
      { $unwind: { path: '$wholesaler', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          totalStock: {
            $reduce: {
              input: '$inventoryInfo',
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.currentStock', 0] }] }
            }
          },
          availableStock: {
            $reduce: {
              input: '$inventoryInfo',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $subtract: [
                      { $ifNull: ['$$this.currentStock', 0] },
                      { $ifNull: ['$$this.reservedStock', 0] }
                    ]
                  }
                ]
              }
            }
          },
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          category: 1,
          images: 1,
          basePrice: 1,
          unit: 1,
          tags: 1,
          minimumOrderQuantity: 1,
          bulkPricing: 1,
          averageRating: 1,
          reviewCount: 1,
          createdAt: 1,
          wholesaler: {
            _id: '$wholesaler._id',
            businessName: '$wholesaler.businessName',
            email: '$wholesaler.email',
            rating: { $ifNull: ['$wholesaler.rating', 0] },
            'profile.name': '$wholesaler.profile.name',
          },
          totalStock: 1,
          availableStock: 1,
        },
      },
    ];

    const [totalResult, productsResult] = await Promise.all([
      Product.aggregate(countPipeline).exec(),
      Product.aggregate(productsPipeline).exec(),
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        products: productsResult,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error('❌ Get wholesale products error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wholesale products',
    });
  }
};

/**
 * Get wholesale product by ID (B2B Marketplace)
 * GET /api/wholesale/products/:id
 * Accessible by: RETAILER, WHOLESALER
 */
export const getWholesaleProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const productPipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          productType: ProductType.WHOLESALE,
          isActive: true,
        },
      },
      // Join with inventory
      {
        $lookup: {
          from: 'inventories',
          localField: '_id',
          foreignField: 'productId',
          as: 'inventoryInfo',
        },
      },
      // Join with wholesaler
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'wholesaler',
        },
      },
      { $unwind: { path: '$wholesaler', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          totalStock: {
            $reduce: {
              input: '$inventoryInfo',
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.currentStock', 0] }] }
            }
          },
          availableStock: {
            $reduce: {
              input: '$inventoryInfo',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $subtract: [
                      { $ifNull: ['$$this.currentStock', 0] },
                      { $ifNull: ['$$this.reservedStock', 0] }
                    ]
                  }
                ]
              }
            }
          },
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          category: 1,
          images: 1,
          basePrice: 1,
          unit: 1,
          tags: 1,
          minimumOrderQuantity: 1,
          bulkPricing: 1,
          specifications: 1,
          averageRating: 1,
          reviewCount: 1,
          createdAt: 1,
          wholesaler: {
            _id: '$wholesaler._id',
            businessName: '$wholesaler.businessName',
            email: '$wholesaler.email',
            rating: { $ifNull: ['$wholesaler.rating', 0] },
            'profile.name': '$wholesaler.profile.name',
            'profile.phone': '$wholesaler.profile.phone',
          },
          totalStock: 1,
          availableStock: 1,
        },
      },
    ];

    const productResult = await Product.aggregate(productPipeline).exec();

    if (!productResult || productResult.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Wholesale product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { product: productResult[0] },
    });
  } catch (error: any) {
    logger.error('❌ Get wholesale product by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch product',
    });
  }
};

/**
 * Get wholesale product categories (B2B Marketplace)
 * GET /api/wholesale/categories
 * Accessible by: RETAILER, WHOLESALER
 */
export const getWholesaleCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Product.aggregate([
      {
        $match: {
          productType: ProductType.WHOLESALE,
          isActive: true,
          availableForRetailers: true,
        },
      },
      {
        $group: {
          _id: '$category.name',
          count: { $sum: 1 },
          subcategories: { $addToSet: '$category.subcategory' },
        },
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          count: 1,
          subcategories: {
            $filter: {
              input: '$subcategories',
              as: 'sub',
              cond: { $ne: ['$$sub', null] },
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error: any) {
    logger.error('❌ Get wholesale categories error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch categories',
    });
  }
};

export default {
  getWholesaleProducts,
  getWholesaleProductById,
  getWholesaleCategories,
};
