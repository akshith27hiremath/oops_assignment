/**
 * Wishlist Migration Script
 * Migrates Customer.wishlist (array of Product IDs) to new Wishlist model
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer.model';
import Wishlist from '../models/Wishlist.model';
import Product from '../models/Product.model';
import { logger } from '../utils/logger';

dotenv.config();

async function migrateWishlists() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/livemart_dev';
    logger.info(`Connecting to: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    logger.info('✅ Connected to MongoDB');

    // Find all customers with wishlist items
    const customers = await Customer.find({
      wishlist: { $exists: true, $ne: [] }
    }).lean();

    logger.info(`Found ${customers.length} customers with wishlist items`);

    if (customers.length === 0) {
      logger.info('No customers with wishlist items found. Migration not needed.');
      await mongoose.disconnect();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const customer of customers) {
      try {
        // Check if Wishlist already exists for this customer
        const existingWishlist = await Wishlist.findOne({ customerId: customer._id });

        if (existingWishlist) {
          logger.info(`Wishlist already exists for customer ${customer.email}, skipping...`);
          skippedCount++;
          continue;
        }

        // Get product details for each wishlist item
        const productIds = customer.wishlist || [];
        const items = [];

        for (const productId of productIds) {
          try {
            const product = await Product.findById(productId).lean();

            if (product) {
              items.push({
                productId: product._id,
                retailerId: product.createdBy,
                addedAt: new Date(),
                priceAlertEnabled: true,
                notifyOnDiscount: true,
                notifyOnTargetPrice: true,
                notifyOnRestock: true,
              });
            } else {
              logger.warn(`Product ${productId} not found, skipping...`);
            }
          } catch (productError) {
            logger.error(`Error fetching product ${productId}:`, productError);
          }
        }

        if (items.length === 0) {
          logger.info(`No valid products for customer ${customer.email}, skipping...`);
          skippedCount++;
          continue;
        }

        // Create new Wishlist document
        const newWishlist = new Wishlist({
          customerId: customer._id,
          items,
        });

        await newWishlist.save();
        migratedCount++;

        logger.info(`✅ Migrated ${items.length} items for customer ${customer.email}`);
      } catch (customerError: any) {
        errorCount++;
        logger.error(`❌ Error migrating customer ${customer.email}:`, customerError.message);
      }
    }

    // Summary
    logger.info('=================================');
    logger.info('Migration Complete!');
    logger.info(`✅ Migrated: ${migratedCount} customers`);
    logger.info(`⏭️  Skipped: ${skippedCount} customers (already migrated)`);
    logger.info(`❌ Errors: ${errorCount} customers`);
    logger.info('=================================');

    // Disconnect
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');

    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateWishlists();
