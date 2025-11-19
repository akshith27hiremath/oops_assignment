/**
 * Test Price Monitoring - Manual Trigger
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import priceMonitoringService from '../services/priceMonitoring.service';
import { logger } from '../utils/logger';

dotenv.config();

async function testPriceMonitoring() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/livemart_dev';
    logger.info(`Connecting to: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    logger.info('✅ Connected to MongoDB');

    // Run price monitoring
    logger.info('🔍 Starting price monitoring...');
    await priceMonitoringService.monitorAllPrices();
    logger.info('✅ Price monitoring completed');

    // Disconnect
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');

    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Price monitoring failed:', error);
    process.exit(1);
  }
}

// Run test
testPriceMonitoring();
