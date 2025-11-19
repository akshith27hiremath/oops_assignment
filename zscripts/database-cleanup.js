/**
 * LiveMart Database Cleanup Script
 *
 * This script cleans up legacy and test data from the database.
 *
 * IMPORTANT:
 * - Review database-analysis.md before running
 * - Create a backup before running: mongodump --db livemart_dev
 * - Run in dry-run mode first to preview changes
 *
 * Usage:
 * - Dry run: node database-cleanup.js --dry-run
 * - Execute: node database-cleanup.js --execute
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://admin:password123@localhost:27017/livemart_dev?authSource=admin';
const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

// User IDs to delete (test accounts without location and no activity)
const TEST_USERS_TO_DELETE = [
  'customer@test.com',
  'akshith.hiremath@gmail.com',
  'frankathon@gmail.com',
  'jimjameater123@gmail.com',
  'bitsstudent@gmail.com',
  'test@gmail.com',
  'wholesaler@test.com',
];

async function main() {
  console.log('='.repeat(60));
  console.log('LiveMart Database Cleanup Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (No changes will be made)' : 'EXECUTE (Changes will be applied)'}`);
  console.log('='.repeat(60));
  console.log('');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('livemart_dev');

    // ========================================
    // STEP 1: Fix Inventory SourceType
    // ========================================
    console.log('📦 STEP 1: Fixing Inventory SourceType Field');
    console.log('-'.repeat(60));

    const inventoryWithNullSource = await db.collection('inventories').find({
      sourceType: null
    }).toArray();

    console.log(`Found ${inventoryWithNullSource.length} inventory entries with null sourceType`);

    if (!DRY_RUN && inventoryWithNullSource.length > 0) {
      const result = await db.collection('inventories').updateMany(
        { sourceType: null },
        { $set: { sourceType: 'SELF_CREATED' } }
      );
      console.log(`✅ Updated ${result.modifiedCount} inventory entries`);
    } else if (inventoryWithNullSource.length > 0) {
      console.log(`📋 Would update ${inventoryWithNullSource.length} inventory entries`);
    }
    console.log('');

    // ========================================
    // STEP 2: Delete Test Users
    // ========================================
    console.log('👥 STEP 2: Removing Test Users');
    console.log('-'.repeat(60));

    for (const email of TEST_USERS_TO_DELETE) {
      const user = await db.collection('users').findOne({ email });

      if (!user) {
        console.log(`⚠️  User not found: ${email}`);
        continue;
      }

      // Check for dependencies
      const orderCount = await db.collection('orders').countDocuments({
        $or: [
          { customerId: user._id },
          { retailerId: user._id }
        ]
      });

      const b2bOrderCount = await db.collection('wholesalerorders').countDocuments({
        $or: [
          { retailerId: user._id },
          { wholesalerId: user._id }
        ]
      });

      const productCount = await db.collection('products').countDocuments({
        createdBy: user._id
      });

      const inventoryCount = await db.collection('inventories').countDocuments({
        ownerId: user._id
      });

      console.log(`\n${email} (${user.userType})`);
      console.log(`  - Orders: ${orderCount}`);
      console.log(`  - B2B Orders: ${b2bOrderCount}`);
      console.log(`  - Products: ${productCount}`);
      console.log(`  - Inventory: ${inventoryCount}`);

      // Safety check: Don't delete users with dependencies
      if (orderCount > 0 || b2bOrderCount > 0 || productCount > 0 || inventoryCount > 0) {
        console.log(`  ⚠️  SKIPPED: User has dependencies, not safe to delete`);
        continue;
      }

      if (!DRY_RUN) {
        await db.collection('users').deleteOne({ _id: user._id });
        console.log(`  ✅ DELETED`);
      } else {
        console.log(`  📋 Would delete (no dependencies)`);
      }
    }
    console.log('');

    // ========================================
    // STEP 3: Update Active Wholesaler Location
    // ========================================
    console.log('📍 STEP 3: Update wholesaler2@test.com Location');
    console.log('-'.repeat(60));

    const wholesaler2 = await db.collection('users').findOne({
      email: 'wholesaler2@test.com'
    });

    if (wholesaler2) {
      if (!wholesaler2.profile?.location) {
        console.log('Adding default location (Hyderabad)...');

        if (!DRY_RUN) {
          await db.collection('users').updateOne(
            { _id: wholesaler2._id },
            {
              $set: {
                'profile.location': {
                  type: 'Point',
                  coordinates: [78.4867, 17.3850] // Hyderabad coordinates
                }
              }
            }
          );
          console.log('✅ Updated wholesaler2@test.com location');
        } else {
          console.log('📋 Would add location: [78.4867, 17.3850]');
        }
      } else {
        console.log('✓ Location already exists');
      }
    } else {
      console.log('⚠️  wholesaler2@test.com not found');
    }
    console.log('');

    // ========================================
    // STEP 4: Statistics Summary
    // ========================================
    console.log('📊 FINAL STATISTICS');
    console.log('='.repeat(60));

    const stats = {
      users: await db.collection('users').countDocuments({}),
      usersWithoutLocation: await db.collection('users').countDocuments({
        'profile.location': { $exists: false }
      }),
      products: await db.collection('products').countDocuments({}),
      inventory: await db.collection('inventories').countDocuments({}),
      inventoryNullSource: await db.collection('inventories').countDocuments({
        sourceType: null
      }),
      b2cOrders: await db.collection('orders').countDocuments({}),
      b2bOrders: await db.collection('wholesalerorders').countDocuments({}),
    };

    console.log(`Total Users: ${stats.users}`);
    console.log(`Users Without Location: ${stats.usersWithoutLocation}`);
    console.log(`Total Products: ${stats.products}`);
    console.log(`Total Inventory: ${stats.inventory}`);
    console.log(`Inventory with null sourceType: ${stats.inventoryNullSource}`);
    console.log(`B2C Orders: ${stats.b2cOrders}`);
    console.log(`B2B Orders: ${stats.b2bOrders}`);
    console.log('');

    if (DRY_RUN) {
      console.log('='.repeat(60));
      console.log('⚠️  DRY RUN COMPLETE - No changes were made');
      console.log('To execute changes, run: node database-cleanup.js --execute');
      console.log('='.repeat(60));
    } else {
      console.log('='.repeat(60));
      console.log('✅ CLEANUP COMPLETE');
      console.log('='.repeat(60));
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

main().catch(console.error);
