/**
 * Migration Script: Add Payment Status to Sub-Orders
 *
 * This script adds the paymentStatus field to all existing sub-orders
 * in the database to support the new multi-retailer payment tracking.
 *
 * Run: npm run migrate:suborder-payment
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

async function migrateSubOrderPaymentStatus() {
  try {
    // Connect to MongoDB first
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/livemart';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get the Order collection directly
    const db = mongoose.connection.db;
    const ordersCollection = db!.collection('orders');

    // Find all orders with sub-orders
    const orders = await ordersCollection.find({ 'subOrders.0': { $exists: true } }).toArray();
    console.log(`📦 Found ${orders.length} orders with sub-orders`);

    if (orders.length === 0) {
      console.log('ℹ️  No orders with sub-orders found. Nothing to migrate.');
      await mongoose.disconnect();
      process.exit(0);
    }

    let ordersUpdated = 0;
    let subOrdersUpdated = 0;

    for (const order of orders) {
      let orderModified = false;

      for (const subOrder of order.subOrders) {
        // Check if paymentStatus is missing or undefined
        if (!subOrder.paymentStatus) {
          // Set payment status based on master order payment status
          // If master is COMPLETED, assume all sub-orders were paid
          // Otherwise, set to PENDING
          if (order.paymentStatus === PaymentStatus.COMPLETED) {
            subOrder.paymentStatus = PaymentStatus.COMPLETED;
          } else if (order.paymentStatus === PaymentStatus.PENDING) {
            subOrder.paymentStatus = PaymentStatus.PENDING;
          } else if (order.paymentStatus === PaymentStatus.FAILED) {
            subOrder.paymentStatus = PaymentStatus.PENDING; // Failed payment = not collected
          } else if (order.paymentStatus === PaymentStatus.CANCELLED) {
            subOrder.paymentStatus = PaymentStatus.CANCELLED;
          } else if (order.paymentStatus === PaymentStatus.REFUNDED) {
            subOrder.paymentStatus = PaymentStatus.REFUNDED;
          } else {
            // Default to PENDING for any other status
            subOrder.paymentStatus = PaymentStatus.PENDING;
          }

          orderModified = true;
          subOrdersUpdated++;

          console.log(`  ├─ Order ${order.orderId} - Sub-order ${subOrder.subOrderId}: ${subOrder.paymentStatus}`);
        }
      }

      if (orderModified) {
        await ordersCollection.updateOne(
          { _id: order._id },
          { $set: { subOrders: order.subOrders } }
        );
        ordersUpdated++;
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Orders processed: ${orders.length}`);
    console.log(`   - Orders updated: ${ordersUpdated}`);
    console.log(`   - Sub-orders updated: ${subOrdersUpdated}`);

    // Disconnect
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);

    // Disconnect on error
    try {
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    process.exit(1);
  }
}

// Run migration
console.log('🚀 Starting Sub-Order Payment Status Migration...\n');
migrateSubOrderPaymentStatus();
