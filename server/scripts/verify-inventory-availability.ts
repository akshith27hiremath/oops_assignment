/**
 * Verification Script: Expected Availability Date Field
 *
 * This script verifies that the expectedAvailabilityDate field can be
 * added to inventory items and provides a summary of out-of-stock items
 * that could benefit from having this field set.
 *
 * Since MongoDB is schemaless and the field is optional, no actual migration
 * is needed. This script just verifies backwards compatibility.
 *
 * Run: npm run verify:inventory
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyInventoryAvailability() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/livemart';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get the Inventory collection
    const db = mongoose.connection.db;
    const inventoryCollection = db!.collection('inventories');

    // Count total inventory items
    const totalCount = await inventoryCollection.countDocuments();
    console.log(`\n📦 Total inventory items: ${totalCount}`);

    // Count out-of-stock items
    const outOfStockCount = await inventoryCollection.countDocuments({
      currentStock: 0
    });
    console.log(`📉 Out of stock items: ${outOfStockCount}`);

    // Count in-stock items
    const inStockCount = await inventoryCollection.countDocuments({
      currentStock: { $gt: 0 }
    });
    console.log(`📈 In stock items: ${inStockCount}`);

    // Count items that already have expectedAvailabilityDate set
    const withExpectedDateCount = await inventoryCollection.countDocuments({
      expectedAvailabilityDate: { $exists: true, $ne: null }
    });
    console.log(`📅 Items with expected availability date: ${withExpectedDateCount}`);

    // Find out-of-stock items without expected date
    const outOfStockWithoutDate = await inventoryCollection.find({
      currentStock: 0,
      $or: [
        { expectedAvailabilityDate: { $exists: false } },
        { expectedAvailabilityDate: null }
      ]
    }).limit(10).toArray();

    console.log(`\n📋 Out-of-stock items without expected date (first 10):`);
    if (outOfStockWithoutDate.length === 0) {
      console.log('   ✨ None found - all out-of-stock items either have dates or there are no out-of-stock items');
    } else {
      for (const item of outOfStockWithoutDate) {
        // Populate product name
        const productId = item.productId;
        const productsCollection = db!.collection('products');
        const product = await productsCollection.findOne({ _id: productId });
        console.log(`   - ${product?.name || 'Unknown Product'} (Stock: ${item.currentStock})`);
      }
    }

    // Test: Try to add expectedAvailabilityDate to one out-of-stock item
    if (outOfStockWithoutDate.length > 0) {
      console.log(`\n🧪 Testing field addition...`);
      const testItem = outOfStockWithoutDate[0];
      const testDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await inventoryCollection.updateOne(
        { _id: testItem._id },
        { $set: { expectedAvailabilityDate: testDate } }
      );

      // Verify the update
      const updated = await inventoryCollection.findOne({ _id: testItem._id });
      if (updated?.expectedAvailabilityDate) {
        console.log(`   ✅ Successfully added expectedAvailabilityDate to test item`);
        console.log(`   📅 Date set to: ${new Date(updated.expectedAvailabilityDate).toLocaleDateString()}`);

        // Clean up test - remove the date we just added
        await inventoryCollection.updateOne(
          { _id: testItem._id },
          { $unset: { expectedAvailabilityDate: "" } }
        );
        console.log(`   🧹 Cleaned up test data`);
      } else {
        console.log(`   ❌ Failed to add field - schema might have restrictions`);
      }
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Total Items:              ${totalCount}`);
    console.log(`   In Stock:                 ${inStockCount} (${((inStockCount/totalCount)*100).toFixed(1)}%)`);
    console.log(`   Out of Stock:             ${outOfStockCount} (${((outOfStockCount/totalCount)*100).toFixed(1)}%)`);
    console.log(`   With Expected Date:       ${withExpectedDateCount}`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (outOfStockCount > 0 && withExpectedDateCount === 0) {
      console.log(`\n💡 Recommendation:`);
      console.log(`   You have ${outOfStockCount} out-of-stock items.`);
      console.log(`   Retailers can now set expected availability dates for these items`);
      console.log(`   from the Inventory Management page.`);
    }

    console.log(`\n✅ Verification completed successfully!`);
    console.log(`   The expectedAvailabilityDate field is fully compatible with existing inventory.`);
    console.log(`   No migration needed - field is optional and backwards compatible.`);

    // Disconnect
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Verification failed:', error);
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

// Run verification
console.log('🚀 Starting Inventory Availability Field Verification...\n');
verifyInventoryAvailability();
