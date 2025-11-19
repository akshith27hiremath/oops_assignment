/**
 * Migration Script: Update Transaction Gateways
 * Updates all existing transactions from PHONEPE to RAZORPAY
 * Since we're using Razorpay as the payment gateway, not PhonePe directly
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UPITransaction, { UPIGatewayType } from '../models/UPITransaction.model';
import logger from '../utils/logger';

dotenv.config();

// Use environment variable or Docker MongoDB URI
const MONGO_URI = process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://admin:password123@mongodb:27017/livemart_dev?authSource=admin';

async function updateTransactionGateways() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    logger.info('✅ Connected to MongoDB');

    // Update all transactions with gateway PHONEPE to RAZORPAY
    const result = await UPITransaction.updateMany(
      { gateway: UPIGatewayType.PHONEPE },
      { $set: { gateway: UPIGatewayType.RAZORPAY } }
    );

    logger.info(`✅ Updated ${result.modifiedCount} transactions from PHONEPE to RAZORPAY`);

    // Verify update
    const razorpayCount = await UPITransaction.countDocuments({ gateway: UPIGatewayType.RAZORPAY });
    const phonePeCount = await UPITransaction.countDocuments({ gateway: UPIGatewayType.PHONEPE });

    logger.info(`📊 Current gateway distribution:`);
    logger.info(`   - RAZORPAY: ${razorpayCount} transactions`);
    logger.info(`   - PHONEPE: ${phonePeCount} transactions`);

    // Close connection
    await mongoose.connection.close();
    logger.info('✅ Migration completed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error(`❌ Migration failed: ${error.message}`);
    process.exit(1);
  }
}

// Run migration
updateTransactionGateways();
