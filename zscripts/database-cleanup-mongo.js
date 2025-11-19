/**
 * LiveMart Database Cleanup Script (MongoDB Shell)
 *
 * Run this script using:
 * docker exec livemart-mongodb-dev mongosh -u admin -p password123 --authenticationDatabase admin livemart_dev database-cleanup-mongo.js
 *
 * OR interactively in mongosh:
 * docker exec -it livemart-mongodb-dev mongosh -u admin -p password123 --authenticationDatabase admin livemart_dev
 * Then run: load('database-cleanup-mongo.js')
 */

// Set to true to execute changes, false for dry run
const EXECUTE = false;

print('='.repeat(60));
print('LiveMart Database Cleanup Script');
print('='.repeat(60));
print('Mode:', EXECUTE ? 'EXECUTE (Changes will be applied)' : 'DRY RUN (No changes)');
print('='.repeat(60));
print('');

// ========================================
// STEP 1: Fix Inventory SourceType
// ========================================
print('📦 STEP 1: Fixing Inventory SourceType Field');
print('-'.repeat(60));

const inventoryNullCount = db.inventories.countDocuments({ sourceType: null });
print(`Found ${inventoryNullCount} inventory entries with null sourceType`);

if (EXECUTE && inventoryNullCount > 0) {
  const result = db.inventories.updateMany(
    { sourceType: null },
    { $set: { sourceType: 'SELF_CREATED' } }
  );
  print(`✅ Updated ${result.modifiedCount} inventory entries`);
} else if (inventoryNullCount > 0) {
  print(`📋 Would update ${inventoryNullCount} inventory entries to sourceType='SELF_CREATED'`);
}
print('');

// ========================================
// STEP 2: Delete Test Users
// ========================================
print('👥 STEP 2: Removing Test Users');
print('-'.repeat(60));

const testUsersToDelete = [
  'customer@test.com',
  'akshith.hiremath@gmail.com',
  'frankathon@gmail.com',
  'jimjameater123@gmail.com',
  'bitsstudent@gmail.com',
  'test@gmail.com',
  'wholesaler@test.com',
];

let deletedCount = 0;
let skippedCount = 0;

testUsersToDelete.forEach(email => {
  const user = db.users.findOne({ email });

  if (!user) {
    print(`⚠️  User not found: ${email}`);
    return;
  }

  // Check for dependencies
  const orderCount = db.orders.countDocuments({
    $or: [
      { customerId: user._id },
      { retailerId: user._id }
    ]
  });

  const b2bOrderCount = db.wholesalerorders.countDocuments({
    $or: [
      { retailerId: user._id },
      { wholesalerId: user._id }
    ]
  });

  const productCount = db.products.countDocuments({ createdBy: user._id });
  const inventoryCount = db.inventories.countDocuments({ ownerId: user._id });
  const reviewCount = db.reviews.countDocuments({ userId: user._id });

  print(`\n${email} (${user.userType})`);
  print(`  - Orders: ${orderCount}`);
  print(`  - B2B Orders: ${b2bOrderCount}`);
  print(`  - Products: ${productCount}`);
  print(`  - Inventory: ${inventoryCount}`);
  print(`  - Reviews: ${reviewCount}`);

  // Safety check: Don't delete users with dependencies
  const totalDeps = orderCount + b2bOrderCount + productCount + inventoryCount + reviewCount;
  if (totalDeps > 0) {
    print(`  ⚠️  SKIPPED: User has ${totalDeps} dependencies, not safe to delete`);
    skippedCount++;
    return;
  }

  if (EXECUTE) {
    db.users.deleteOne({ _id: user._id });
    print(`  ✅ DELETED`);
    deletedCount++;
  } else {
    print(`  📋 Would delete (no dependencies)`);
    deletedCount++;
  }
});

print('');
print(`Summary: ${deletedCount} users ${EXECUTE ? 'deleted' : 'would be deleted'}, ${skippedCount} skipped`);
print('');

// ========================================
// STEP 3: Update Active Wholesaler Location
// ========================================
print('📍 STEP 3: Update wholesaler2@test.com Location');
print('-'.repeat(60));

const wholesaler2 = db.users.findOne({ email: 'wholesaler2@test.com' });

if (wholesaler2) {
  if (!wholesaler2.profile?.location) {
    print('Adding default location (Hyderabad: 78.4867, 17.3850)...');

    if (EXECUTE) {
      db.users.updateOne(
        { _id: wholesaler2._id },
        {
          $set: {
            'profile.location': {
              type: 'Point',
              coordinates: [78.4867, 17.3850]
            }
          }
        }
      );
      print('✅ Updated wholesaler2@test.com location');
    } else {
      print('📋 Would add location coordinates');
    }
  } else {
    print('✓ Location already exists');
  }
} else {
  print('⚠️  wholesaler2@test.com not found');
}
print('');

// ========================================
// STEP 4: Update wholesalertest@gmail.com Location
// ========================================
print('📍 STEP 4: Update wholesalertest@gmail.com Location');
print('-'.repeat(60));

const wholesalerTest = db.users.findOne({ email: 'wholesalertest@gmail.com' });

if (wholesalerTest) {
  if (!wholesalerTest.profile?.location) {
    print('Adding default location (Hyderabad: 78.4400, 17.4200)...');

    if (EXECUTE) {
      db.users.updateOne(
        { _id: wholesalerTest._id },
        {
          $set: {
            'profile.location': {
              type: 'Point',
              coordinates: [78.4400, 17.4200]
            }
          }
        }
      );
      print('✅ Updated wholesalertest@gmail.com location');
    } else {
      print('📋 Would add location coordinates');
    }
  } else {
    print('✓ Location already exists');
  }
} else {
  print('⚠️  wholesalertest@gmail.com not found');
}
print('');

// ========================================
// STEP 5: Statistics Summary
// ========================================
print('📊 FINAL STATISTICS');
print('='.repeat(60));

const stats = {
  users: db.users.countDocuments({}),
  usersWithoutLocation: db.users.countDocuments({
    'profile.location': { $exists: false }
  }),
  customers: db.users.countDocuments({ userType: 'CUSTOMER' }),
  retailers: db.users.countDocuments({ userType: 'RETAILER' }),
  wholesalers: db.users.countDocuments({ userType: 'WHOLESALER' }),
  products: db.products.countDocuments({}),
  inventory: db.inventories.countDocuments({}),
  inventoryNullSource: db.inventories.countDocuments({ sourceType: null }),
  inventorySelfCreated: db.inventories.countDocuments({ sourceType: 'SELF_CREATED' }),
  inventoryB2B: db.inventories.countDocuments({ sourceType: 'B2B_ORDER' }),
  b2cOrders: db.orders.countDocuments({}),
  b2bOrders: db.wholesalerorders.countDocuments({}),
};

print(`Total Users: ${stats.users}`);
print(`  - Customers: ${stats.customers}`);
print(`  - Retailers: ${stats.retailers}`);
print(`  - Wholesalers: ${stats.wholesalers}`);
print(`Users Without Location: ${stats.usersWithoutLocation}`);
print('');
print(`Total Products: ${stats.products}`);
print(`Total Inventory: ${stats.inventory}`);
print(`  - Self Created: ${stats.inventorySelfCreated}`);
print(`  - From B2B: ${stats.inventoryB2B}`);
print(`  - Null (needs fix): ${stats.inventoryNullSource}`);
print('');
print(`B2C Orders: ${stats.b2cOrders}`);
print(`B2B Orders: ${stats.b2bOrders}`);
print('');

if (!EXECUTE) {
  print('='.repeat(60));
  print('⚠️  DRY RUN COMPLETE - No changes were made');
  print('To execute changes:');
  print('1. Edit this file and set EXECUTE = true');
  print('2. Run the script again');
  print('='.repeat(60));
} else {
  print('='.repeat(60));
  print('✅ CLEANUP COMPLETE');
  print('='.repeat(60));
}
