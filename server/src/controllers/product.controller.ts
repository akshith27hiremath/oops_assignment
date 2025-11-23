import { Request, Response } from 'express';
import Product, { ProductType } from '../models/Product.model';
import Inventory from '../models/Inventory.model';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import elasticsearchService from '../services/elasticsearch.service';
import { parseDistanceQuery } from '../utils/searchParser';
import { uploadMultipleImages } from '../utils/cloudinary.upload';

/**
 * Product Controller
 * Handles all product-related operations
 */

/**
 * Get all products
 * GET /api/products
 * Public access with optional filters
 */
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      subcategory,
      search,
      minPrice,
      maxPrice,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      inStock,
      productType,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Use Elasticsearch for search queries with fuzzy matching
    if (search && typeof search === 'string' && search.trim()) {
      try {
        // Parse distance queries like "apples within 2km"
        const parsed = parseDistanceQuery(search.trim());
        logger.info(`🔍 Parsed search: "${search}" → query: "${parsed.query}", distance: ${parsed.distance}km`);

        // If user has distance query and location, use geospatial search
        if (parsed.hasDistanceQuery && parsed.distance && req.user?.profile?.location?.coordinates) {
          const userLocation = req.user.profile.location.coordinates;
          const esResults = await elasticsearchService.searchNearby({
            latitude: userLocation[1],
            longitude: userLocation[0],
            radius: parsed.distance,
            query: parsed.query,
            category: category as string,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
            page: pageNum,
            limit: limitNum,
            sortBy: 'distance'
          });

          const productIds = esResults.products.map((p: any) => p.productId);
          const products = await Product.find({ _id: { $in: productIds }, isActive: true })
            .populate('createdBy', '-password -__v -oauth')
            .lean();

          // Maintain order from Elasticsearch results
          const orderedProducts = productIds.map((id: string) =>
            products.find((p: any) => p._id.toString() === id)
          ).filter(Boolean);

          return res.status(200).json({
            success: true,
            data: {
              products: orderedProducts,
              pagination: {
                total: esResults.total,
                page: esResults.page,
                limit: esResults.limit,
                pages: esResults.totalPages,
              },
              searchType: 'geospatial',
              parsedDistance: parsed.distance,
            },
          });
        }

        // Regular text search (no distance or no user location)
        const esResults = await elasticsearchService.searchProducts({
          query: parsed.query || search.trim(),
          category: category as string,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          page: pageNum,
          limit: limitNum,
        });

        // Get full product details from MongoDB
        const productIds = esResults.products.map((p: any) => p.productId);

        if (productIds.length === 0) {
          return res.status(200).json({
            success: true,
            data: {
              products: [],
              pagination: {
                total: 0,
                page: pageNum,
                limit: limitNum,
                pages: 0,
              },
            },
          });
        }

        // Use aggregation to include retailer inventories with discounts
        const products = await Product.aggregate([
          { $match: { _id: { $in: productIds.map((id: string) => new mongoose.Types.ObjectId(id)) }, isActive: true } },
          // Lookup inventory for each product FROM RETAILERS ONLY
          {
            $lookup: {
              from: 'inventories',
              let: { productId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$productId', '$$productId'] },
                    availability: true,
                  },
                },
                // Lookup owner to filter by userType
                {
                  $lookup: {
                    from: 'users',
                    localField: 'ownerId',
                    foreignField: '_id',
                    as: 'owner',
                  },
                },
                { $unwind: '$owner' },
                // Only include inventory from RETAILERS
                {
                  $match: {
                    'owner.userType': 'RETAILER',
                  },
                },
                // Project only needed fields including owner details
                {
                  $project: {
                    _id: 1,
                    ownerId: 1,
                    currentStock: 1,
                    reservedStock: 1,
                    sellingPrice: 1,
                    productDiscount: 1,
                    availability: 1,
                    expectedAvailabilityDate: 1,
                    owner: {
                      _id: 1,
                      businessName: 1,
                      userType: 1,
                      'profile.name': 1,
                      'profile.location': 1,
                    },
                  },
                },
              ],
              as: 'retailerInventories',
            },
          },
          // Calculate total stock
          {
            $addFields: {
              stock: { $sum: '$retailerInventories.currentStock' },
            },
          },
          // Populate createdBy
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy',
            },
          },
          { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
          // Remove sensitive fields from createdBy
          {
            $project: {
              'createdBy.password': 0,
              'createdBy.__v': 0,
              'createdBy.oauth': 0,
            },
          },
        ]);

        // Maintain Elasticsearch result order
        const orderedProducts = productIds.map((id: string) => {
          const product = products.find((p: any) => p._id.toString() === id);
          return product;
        }).filter(Boolean);

        return res.status(200).json({
          success: true,
          data: {
            products: orderedProducts,
            pagination: {
              total: esResults.total,
              page: esResults.page,
              limit: esResults.limit,
              pages: esResults.totalPages,
            },
          },
        });
      } catch (esError) {
        logger.warn('⚠️  Elasticsearch search failed, falling back to MongoDB', esError);
        // Fall through to MongoDB search below
      }
    }

    // Initial match for products (MongoDB fallback or non-search queries)
    const productMatch: any = { isActive: true };

    // Filter by productType if specified (for admin/filtering purposes)
    // NOTE: We don't filter by productType for customers because wholesale products
    // can be sold by retailers. Instead, we filter by retailer inventory availability.
    if (productType) {
      productMatch.productType = productType;
    }

    if (category) {
      productMatch['category.name'] = category;
    }

    if (subcategory) {
      productMatch['category.subcategory'] = subcategory;
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

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      productMatch.tags = { $in: tagArray };
    }

    const sortStage: any = {};
    sortStage[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const pipeline: mongoose.PipelineStage[] = [
      { $match: productMatch },
      // Lookup inventory for each product FROM RETAILERS ONLY
      {
        $lookup: {
          from: 'inventories',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$productId', '$$productId'] },
                // Include all inventory (even unavailable) to show stock status and expected dates
              },
            },
            // Lookup owner to filter by userType
            {
              $lookup: {
                from: 'users',
                localField: 'ownerId',
                foreignField: '_id',
                as: 'owner',
              },
            },
            { $unwind: '$owner' },
            // Only include inventory from RETAILERS (not wholesalers)
            {
              $match: {
                'owner.userType': 'RETAILER',
              },
            },
            // Project inventory fields including productDiscount
            {
              $project: {
                _id: 1,
                ownerId: 1,
                currentStock: 1,
                reservedStock: 1,
                sellingPrice: 1,
                productDiscount: 1,
                availability: 1,
                expectedAvailabilityDate: 1,
              },
            },
          ],
          as: 'retailerInventories',
        },
      },
      // Only show products that have at least one retailer with inventory
      {
        $match: {
          'retailerInventories.0': { $exists: true },
        },
      },
      // Calculate total stock from RETAILERS only
      {
        $addFields: {
          totalCurrentStock: { $sum: '$retailerInventories.currentStock' },
          totalReservedStock: { $sum: '$retailerInventories.reservedStock' },
        },
      },
      // Calculate available stock
      {
        $addFields: {
          stock: { $subtract: ['$totalCurrentStock', '$totalReservedStock'] },
        },
      },
    ];

    // Apply inStock filter if present
    if (inStock === 'true') {
      pipeline.push({
        $match: { stock: { $gt: 0 } },
      });
    }

    // Pre-pagination count (before limit/skip but after all filters)
    const countPipeline = [...pipeline, { $count: 'total' }];

    const productsPipeline = [
      ...pipeline,
      // Keep all fields (don't explicitly project yet, we'll do that after enriching data)
      // This allows retailerInventories to pass through
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limitNum },
      // Add retailer info (from first available retailer for simplicity)
      {
        $addFields: {
          // Pick first retailer who has this product in stock
          primaryRetailer: { $arrayElemAt: ['$retailerInventories', 0] },
        },
      },
      // Populate createdBy for product catalog tracking
      {
        $lookup: {
          from: 'users',
          localField: 'primaryRetailer.ownerId',
          foreignField: '_id',
          as: 'retailerInfo',
        },
      },
      {
        $addFields: {
          // Use retailer info as createdBy for backwards compatibility
          createdBy: { $arrayElemAt: ['$retailerInfo', 0] },
        },
      },
      {
        $project: {
          'createdBy.password': 0,
          'createdBy.__v': 0,
          'createdBy.oauth': 0,
          'createdBy.isVerified': 0,
          'createdBy.isActive': 0,
          'createdBy.lastActive': 0,
          'createdBy.lastLogin': 0,
          'createdBy.notificationSettings': 0,
          retailerInfo: 0,
          primaryRetailer: 0,
          // retailerInventories kept (not excluded) for frontend discount display
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
    logger.error(`❌ Get all products error: ${error.message}` || 'Failed to fetch products', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch products',
    });
  }
};

/**
 * Get product by ID
 * GET /api/products/:id
 * Public access
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const productWithInventory = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      // Lookup retailer inventories with owner details
      {
        $lookup: {
          from: 'inventories',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$productId', '$$productId'] },
                // Include all inventory (even unavailable) to show stock status and expected dates
              },
            },
            // Lookup owner to filter by userType
            {
              $lookup: {
                from: 'users',
                localField: 'ownerId',
                foreignField: '_id',
                as: 'owner',
              },
            },
            { $unwind: '$owner' },
            // Only include inventory from RETAILERS
            {
              $match: {
                'owner.userType': 'RETAILER',
              },
            },
            // Project only needed fields including owner details
            {
              $project: {
                _id: 1,
                ownerId: 1,
                currentStock: 1,
                reservedStock: 1,
                sellingPrice: 1,
                productDiscount: 1,
                availability: 1,
                owner: {
                  _id: 1,
                  businessName: 1,
                  userType: 1,
                  'profile.name': 1,
                  'profile.location': 1,
                },
              },
            },
          ],
          as: 'retailerInventories',
        },
      },
      // Calculate total stock
      {
        $addFields: {
          stock: { $sum: '$retailerInventories.currentStock' },
        },
      },
      // Populate createdBy
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
        },
      },
      { $unwind: '$createdBy' },
      {
        $project: {
          'createdBy.password': 0,
          'createdBy.__v': 0,
          'createdBy.oauth': 0,
          'createdBy.isVerified': 0,
          'createdBy.isActive': 0,
          'createdBy.lastActive': 0,
          'createdBy.lastLogin': 0,
          'createdBy.notificationSettings': 0,
        },
      },
    ]);

    if (!productWithInventory || productWithInventory.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { product: productWithInventory[0] },
    });
  } catch (error: any) {
    logger.error(`❌ Get product by ID error: ${error.message}` || 'Failed to fetch product', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch product',
    });
  }
};

/**
 * Create product
 * POST /api/products
 * Requires: RETAILER or WHOLESALER role
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { stock, ...productFields } = req.body;

    // Parse JSON strings from FormData (if sent as multipart/form-data)
    if (typeof productFields.category === 'string') {
      try {
        productFields.category = JSON.parse(productFields.category);
      } catch (e) {
        // If parsing fails, leave as is
      }
    }
    if (typeof productFields.tags === 'string') {
      try {
        productFields.tags = JSON.parse(productFields.tags);
      } catch (e) {
        // If parsing fails, leave as is
      }
    }

    // Handle uploaded image files
    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      try {
        imageUrls = await uploadMultipleImages(req.files as Express.Multer.File[], {
          folder: 'products',
        });
        logger.info(`✅ Uploaded ${imageUrls.length} product images to Cloudinary`);
      } catch (uploadError: any) {
        logger.error('❌ Product image upload error:', uploadError);
        res.status(400).json({
          success: false,
          message: 'Failed to upload product images',
        });
        return;
      }
    }

    // Auto-determine productType based on user role
    const productType = req.user.userType === 'WHOLESALER' ? ProductType.WHOLESALE : ProductType.RETAIL;

    const productData = {
      ...productFields,
      createdBy: req.user._id,
      productType, // Auto-set based on user type
      images: imageUrls.length > 0 ? imageUrls : (productFields.images || []),
      // Set wholesale defaults if wholesaler
      ...(productType === ProductType.WHOLESALE && {
        availableForRetailers: productFields.availableForRetailers !== false, // Default true
        minimumOrderQuantity: productFields.minimumOrderQuantity || 1,
      }),
    };

    const product = await Product.create(productData);

    // Auto-create inventory entry if stock is provided
    if (stock !== undefined) {
      await Inventory.create({
        productId: product._id,
        ownerId: req.user._id,
        currentStock: stock || 0,
        reservedStock: 0,
        reorderLevel: 10,
        sellingPrice: product.basePrice,
        availability: (stock || 0) > 0,
        lastRestocked: new Date(),
      });
      logger.info(`✅ Inventory created for product: ${product.name} with stock: ${stock}`);
    }

    logger.info(`✅ Product created: ${product.name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error: any) {
    logger.error('❌ Create product error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create product',
    });
  }
};

/**
 * Update product
 * PUT /api/products/:id
 * Requires: Owner (creator) only
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Check ownership
    if (product.createdBy.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own products',
      });
      return;
    }

    // Handle uploaded image files
    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      try {
        imageUrls = await uploadMultipleImages(req.files as Express.Multer.File[], {
          folder: 'products',
        });
        logger.info(`✅ Uploaded ${imageUrls.length} product images to Cloudinary`);
      } catch (uploadError: any) {
        logger.error('❌ Product image upload error:', uploadError);
        res.status(400).json({
          success: false,
          message: 'Failed to upload product images',
        });
        return;
      }
    }

    // Prepare update data
    const updateData = { ...req.body };

    // Parse JSON strings from FormData (if sent as multipart/form-data)
    if (typeof updateData.category === 'string') {
      try {
        updateData.category = JSON.parse(updateData.category);
      } catch (e) {
        // If parsing fails, leave as is
      }
    }
    if (typeof updateData.tags === 'string') {
      try {
        updateData.tags = JSON.parse(updateData.tags);
      } catch (e) {
        // If parsing fails, leave as is
      }
    }

    if (imageUrls.length > 0) {
      // If new images uploaded, append to existing images
      updateData.images = [...product.images, ...imageUrls];
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    logger.info(`✅ Product updated: ${updatedProduct?.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct },
    });
  } catch (error: any) {
    logger.error('❌ Update product error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update product',
    });
  }
};

/**
 * Delete product
 * DELETE /api/products/:id
 * Requires: Owner (creator) only
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Check ownership
    if (product.createdBy.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own products',
      });
      return;
    }

    // Soft delete by marking as inactive
    product.isActive = false;
    await product.save();

    logger.info(`✅ Product deleted: ${product.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    logger.error('❌ Delete product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete product',
    });
  }
};

/**
 * Get products by category
 * GET /api/products/category/:category
 * Public access
 */
export const getProductsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find({
        'category.name': category,
        isActive: true,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-__v')
        .populate('createdBy', 'profile.name userType'),
      Product.countDocuments({
        'category.name': category,
        isActive: true,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    logger.error('❌ Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch products',
    });
  }
};

/**
 * Get seller's products
 * GET /api/products/seller/my-products
 * Requires: RETAILER or WHOLESALER role
 */
export const getMyProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { page = 1, limit = 20, includeInactive = false } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = { createdBy: req.user._id };
    if (includeInactive !== 'true') {
      query.isActive = true;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-__v'),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    logger.error('❌ Get my products error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch your products',
    });
  }
};

export default {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getMyProducts,
};
