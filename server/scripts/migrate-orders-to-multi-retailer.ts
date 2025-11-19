/**
 * Migration Script: Convert Single-Retailer Orders to Multi-Retailer Format
 *
 * This script migrates existing orders from the old single-retailer format to
 * the new multi-retailer sub-order format.
 *
 * OLD FORMAT:
 * - retailerId: ObjectId
 * - items: [OrderItem]
 * - status: OrderStatus
 * - trackingInfo: TrackingInfo
 *
 * NEW FORMAT:
 * - subOrders: [{
 *     retailerId: ObjectId,
 *     items: [OrderItem],
 *     status: OrderStatus,
 *     trackingInfo: TrackingInfo,
 *     ...pricing fields
 *   }]
 * - masterStatus: OrderStatus
 *
 * Run: npx ts-node server/scripts/migrate-orders-to-multi-retailer.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/livemart';

interface OldOrderFormat {
  _id: mongoose.Types.ObjectId;
  orderId: string;
  retailerId?: mongoose.Types.ObjectId;
  items?: any[];
  status?: string;
  trackingInfo?: any;
  totalAmount: number;
  discountBreakdown?: any;
  subOrders?: any[];
}

async function migrateOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const ordersCollection = db!.collection('orders');

    // Find all orders that need migration (have retailerId but no subOrders)
    const ordersToMigrate = await ordersCollection.find({
      retailerId: { $exists: true },
      $or: [
        { subOrders: { $exists: false } },
        { subOrders: { $size: 0 } }
      ]
    }).toArray();

    console.log(`\n📦 Found ${ordersToMigrate.length} orders to migrate`);

    if (ordersToMigrate.length === 0) {
      console.log('✅ No orders to migrate. All orders are already in the new format.');
      await mongoose.disconnect();
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    for (const order of ordersToMigrate as OldOrderFormat[]) {
      try {
        // Skip if missing required fields
        if (!order.retailerId || !order.items || order.items.length === 0) {
          console.log(`⚠️ Skipping order ${order.orderId}: Missing retailerId or items`);
          errorCount++;
          continue;
        }

        // Calculate pricing breakdown for sub-order
        const discountBreakdown = order.discountBreakdown || {};

        const subtotalBeforeProductDiscounts = discountBreakdown.subtotal || order.totalAmount;
        const productDiscountSavings = discountBreakdown.productDiscountSavings || 0;
        const subtotalAfterProductDiscounts = discountBreakdown.subtotalAfterProductDiscounts ||
                                               (subtotalBeforeProductDiscounts - productDiscountSavings);
        const tierCodeDiscountShare = discountBreakdown.finalDiscount || 0;

        // Create sub-order from existing order data
        const subOrder = {
          subOrderId: `${order.orderId}-R1`, // Single retailer, so it's R1
          retailerId: order.retailerId,
          items: order.items,
          subtotalBeforeProductDiscounts,
          productDiscountSavings,
          subtotalAfterProductDiscounts,
          tierCodeDiscountShare,
          totalAmount: order.totalAmount,
          status: order.status || 'PENDING',
          trackingInfo: order.trackingInfo || {
            currentStatus: order.status || 'PENDING',
            statusHistory: [{
              status: order.status || 'PENDING',
              timestamp: new Date(),
              notes: 'Migrated from old format'
            }]
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Update order with new format
        await ordersCollection.updateOne(
          { _id: order._id },
          {
            $set: {
              subOrders: [subOrder],
              masterStatus: order.status || 'PENDING',
              // Keep old fields for backward compatibility (they're now optional)
              // retailerId, items, status, trackingInfo remain unchanged
            }
          }
        );

        migratedCount++;
        console.log(`✅ Migrated order ${order.orderId} (${migratedCount}/${ordersToMigrate.length})`);
      } catch (error: any) {
        console.error(`❌ Error migrating order ${order.orderId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total orders found: ${ordersToMigrate.length}`);
    console.log(`   ✅ Successfully migrated: ${migratedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    // Verify migration
    const verifyCount = await ordersCollection.countDocuments({
      subOrders: { $exists: true, $ne: [] }
    });
    console.log(`\n🔍 Verification: ${verifyCount} orders now have sub-orders`);

    console.log('\n✅ Migration completed successfully!');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateOrders()
  .then(() => {
    console.log('\n✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
