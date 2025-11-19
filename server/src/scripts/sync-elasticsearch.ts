/**
 * Sync MongoDB products to Elasticsearch
 * This script populates Elasticsearch index with all products from MongoDB
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { elasticsearchService } from '../services/elasticsearch.service';
import Product from '../models/Product.model';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function syncProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/livemart_dev?authSource=admin';
    logger.info('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    logger.info('✅ MongoDB connected');

    // Wait for Elasticsearch to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!elasticsearchService.isHealthy()) {
      logger.error('❌ Elasticsearch is not connected');
      process.exit(1);
    }

    logger.info('✅ Elasticsearch connected');

    // Fetch all products with seller information
    logger.info('📦 Fetching products from MongoDB...');
    const products = await Product.find({ isActive: { $ne: false } })
      .populate('seller', 'profile businessName userType')
      .lean();

    logger.info(`📦 Found ${products.length} active products`);

    if (products.length === 0) {
      logger.warn('⚠️  No products to index');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Bulk index products
    logger.info('🚀 Starting bulk index...');
    await elasticsearchService.bulkIndexProducts(products);

    logger.info('✅ Sync completed successfully');
    logger.info(`📊 Indexed ${products.length} products`);

    // Disconnect
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run sync
syncProducts();
