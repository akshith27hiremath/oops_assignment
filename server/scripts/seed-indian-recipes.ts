import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/livemart_dev?authSource=admin';

// Recipe enums
enum DietaryTag {
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  GLUTEN_FREE = 'GLUTEN_FREE',
  DAIRY_FREE = 'DAIRY_FREE',
}

enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

enum RecipeCategory {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
}

enum RecipeStatus {
  PUBLISHED = 'PUBLISHED',
}

// Generate recipe ID
function generateRecipeId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 12).toUpperCase();
  return `RCP-${timestamp}-${random}`;
}

const indianRecipes = [
  {
    recipeId: generateRecipeId(),
    title: 'Paneer Butter Masala',
    description: 'A rich and creamy North Indian curry made with paneer (cottage cheese) in a tomato-based gravy with butter and cream. Perfect for special occasions!',
    coverImage: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800',
    ingredients: [
      { name: 'Paneer', quantity: 250, unit: 'g', category: 'Dairy', searchTerms: ['cottage cheese', 'paneer'] },
      { name: 'Fresh Tomatoes', quantity: 4, unit: 'pieces', category: 'Vegetables', searchTerms: ['tomato', 'tamatar'] },
      { name: 'Butter', quantity: 50, unit: 'g', category: 'Dairy' },
      { name: 'Fresh Milk', quantity: 100, unit: 'ml', category: 'Dairy', searchTerms: ['milk', 'cream'] },
      { name: 'Garam Masala', quantity: 1, unit: 'tsp', category: 'Spices' },
      { name: 'Red Chili Powder', quantity: 1, unit: 'tsp', category: 'Spices' },
      { name: 'Coriander Powder', quantity: 1, unit: 'tsp', category: 'Spices' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Blanch tomatoes in hot water for 5 minutes, peel and puree them.', duration: 10 },
      { stepNumber: 2, instruction: 'Heat butter in a pan, add tomato puree and cook for 5 minutes.', duration: 5 },
      { stepNumber: 3, instruction: 'Add all spices (garam masala, chili powder, coriander powder) and salt. Mix well.', duration: 2 },
      { stepNumber: 4, instruction: 'Add milk and let it simmer for 5 minutes until the gravy thickens.', duration: 5 },
      { stepNumber: 5, instruction: 'Add paneer cubes and cook for another 3-4 minutes. Garnish and serve hot.', duration: 4 },
    ],
    servings: 4,
    prepTime: 15,
    cookTime: 25,
    category: RecipeCategory.DINNER,
    cuisine: 'North Indian',
    dietaryTags: [DietaryTag.VEGETARIAN, DietaryTag.GLUTEN_FREE],
    difficulty: DifficultyLevel.MEDIUM,
    nutritionInfo: {
      servingSize: '1 bowl',
      calories: 320,
      protein: 15,
      carbohydrates: 12,
      fat: 24,
    },
    tips: [
      'For extra richness, add a tablespoon of cashew paste',
      'You can substitute butter with ghee for authentic flavor',
      'Kasuri methi (dried fenugreek) adds amazing aroma',
    ],
    tags: ['indian', 'paneer', 'curry', 'vegetarian', 'north-indian'],
    featured: false,
    status: RecipeStatus.PUBLISHED,
  },
  {
    recipeId: generateRecipeId(),
    title: 'Aloo Gobi (Potato Cauliflower Curry)',
    description: 'A classic dry vegetarian curry made with potatoes and cauliflower, seasoned with aromatic Indian spices. A household favorite across India!',
    coverImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
    ingredients: [
      { name: 'Organic Potatoes', quantity: 2, unit: 'pieces', category: 'Vegetables', searchTerms: ['potato', 'aloo'] },
      { name: 'Cauliflower', quantity: 1, unit: 'piece', category: 'Vegetables', searchTerms: ['cauliflower', 'gobi'] },
      { name: 'Fresh Tomatoes', quantity: 2, unit: 'pieces', category: 'Vegetables' },
      { name: 'Organic Turmeric Powder', quantity: 0.5, unit: 'tsp', category: 'Spices', searchTerms: ['turmeric', 'haldi'] },
      { name: 'Red Chili Powder', quantity: 1, unit: 'tsp', category: 'Spices' },
      { name: 'Coriander Powder', quantity: 1, unit: 'tsp', category: 'Spices' },
      { name: 'Garam Masala', quantity: 0.5, unit: 'tsp', category: 'Spices' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Cut potatoes and cauliflower into medium-sized florets and cubes.', duration: 10 },
      { stepNumber: 2, instruction: 'Heat oil in a pan, add cumin seeds and let them crackle.', duration: 2 },
      { stepNumber: 3, instruction: 'Add chopped tomatoes and all spices. Cook until tomatoes are soft.', duration: 5 },
      { stepNumber: 4, instruction: 'Add potatoes and cauliflower, mix well with the masala.', duration: 3 },
      { stepNumber: 5, instruction: 'Cover and cook on low heat for 15-20 minutes until vegetables are tender. Stir occasionally.', duration: 20 },
    ],
    servings: 4,
    prepTime: 15,
    cookTime: 30,
    category: RecipeCategory.LUNCH,
    cuisine: 'North Indian',
    dietaryTags: [DietaryTag.VEGETARIAN, DietaryTag.VEGAN, DietaryTag.GLUTEN_FREE],
    difficulty: DifficultyLevel.EASY,
    nutritionInfo: {
      servingSize: '1 bowl',
      calories: 180,
      protein: 4,
      carbohydrates: 28,
      fat: 6,
    },
    tips: [
      'Don\'t add water; cook vegetables in their own moisture',
      'Parboiling cauliflower for 2 minutes reduces cooking time',
      'Serve hot with roti or rice',
    ],
    tags: ['indian', 'vegetarian', 'vegan', 'dry-curry', 'aloo-gobi'],
    featured: false,
    status: RecipeStatus.PUBLISHED,
  },
  {
    recipeId: generateRecipeId(),
    title: 'Palak Paneer (Spinach with Cottage Cheese)',
    description: 'Nutritious and delicious curry made with fresh spinach and soft paneer cubes in a creamy, mildly spiced gravy. A North Indian restaurant favorite!',
    coverImage: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800',
    ingredients: [
      { name: 'Green Spinach', quantity: 2, unit: 'bunch', category: 'Vegetables', searchTerms: ['spinach', 'palak'] },
      { name: 'Paneer', quantity: 200, unit: 'g', category: 'Dairy' },
      { name: 'Fresh Tomatoes', quantity: 2, unit: 'pieces', category: 'Vegetables' },
      { name: 'Fresh Milk', quantity: 50, unit: 'ml', category: 'Dairy', searchTerms: ['cream', 'milk'] },
      { name: 'Butter', quantity: 30, unit: 'g', category: 'Dairy' },
      { name: 'Garam Masala', quantity: 1, unit: 'tsp', category: 'Spices' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Blanch spinach in boiling water for 2 minutes, then plunge in ice water. Blend to a smooth puree.', duration: 10 },
      { stepNumber: 2, instruction: 'Heat butter in a pan, sauté onions and tomatoes until soft.', duration: 5 },
      { stepNumber: 3, instruction: 'Add garam masala and cook for 1 minute.', duration: 1 },
      { stepNumber: 4, instruction: 'Add spinach puree and cook for 5 minutes. Add milk and mix well.', duration: 5 },
      { stepNumber: 5, instruction: 'Gently add paneer cubes and simmer for 3 minutes. Serve hot.', duration: 3 },
    ],
    servings: 4,
    prepTime: 15,
    cookTime: 20,
    category: RecipeCategory.DINNER,
    cuisine: 'North Indian',
    dietaryTags: [DietaryTag.VEGETARIAN, DietaryTag.GLUTEN_FREE],
    difficulty: DifficultyLevel.MEDIUM,
    nutritionInfo: {
      servingSize: '1 bowl',
      calories: 280,
      protein: 14,
      carbohydrates: 10,
      fat: 20,
      fiber: 4,
    },
    tips: [
      'Blanching spinach helps retain its bright green color',
      'Don\'t overcook paneer or it will become hard',
      'Add a pinch of sugar to balance the taste',
    ],
    tags: ['indian', 'paneer', 'spinach', 'healthy', 'vegetarian'],
    featured: false,
    status: RecipeStatus.PUBLISHED,
  },
  {
    recipeId: generateRecipeId(),
    title: 'Vegetable Biryani',
    description: 'Aromatic and flavorful rice dish layered with mixed vegetables and fragrant spices. A complete meal in itself!',
    coverImage: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800',
    ingredients: [
      { name: 'Organic Brown Rice', quantity: 2, unit: 'cup', category: 'Grains', searchTerms: ['rice', 'basmati'] },
      { name: 'Fresh Carrots', quantity: 1, unit: 'piece', category: 'Vegetables', searchTerms: ['carrot', 'gajar'] },
      { name: 'Green Beans', quantity: 100, unit: 'g', category: 'Vegetables' },
      { name: 'Organic Potatoes', quantity: 1, unit: 'piece', category: 'Vegetables' },
      { name: 'Cauliflower', quantity: 0.5, unit: 'piece', category: 'Vegetables', optional: true },
      { name: 'Yogurt', quantity: 100, unit: 'g', category: 'Dairy', searchTerms: ['curd', 'dahi'] },
      { name: 'Garam Masala', quantity: 1, unit: 'tsp', category: 'Spices' },
      { name: 'Organic Turmeric Powder', quantity: 0.5, unit: 'tsp', category: 'Spices' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Wash and soak rice for 30 minutes. Boil until 70% cooked, then drain.', duration: 35 },
      { stepNumber: 2, instruction: 'Chop all vegetables into bite-sized pieces.', duration: 10 },
      { stepNumber: 3, instruction: 'Heat oil, add garam masala and turmeric. Sauté vegetables for 5 minutes.', duration: 5 },
      { stepNumber: 4, instruction: 'Add yogurt and salt. Mix well and cook for 3 minutes.', duration: 3 },
      { stepNumber: 5, instruction: 'Layer vegetables and rice in a pot. Cover tightly and cook on low heat for 20 minutes.', duration: 20, temperature: 'Low heat' },
      { stepNumber: 6, instruction: 'Let it rest for 5 minutes before opening. Gently fluff and serve.', duration: 5 },
    ],
    servings: 4,
    prepTime: 25,
    cookTime: 45,
    category: RecipeCategory.LUNCH,
    cuisine: 'Hyderabadi',
    dietaryTags: [DietaryTag.VEGETARIAN, DietaryTag.GLUTEN_FREE],
    difficulty: DifficultyLevel.MEDIUM,
    nutritionInfo: {
      servingSize: '1 plate',
      calories: 380,
      protein: 10,
      carbohydrates: 68,
      fat: 8,
      fiber: 6,
    },
    tips: [
      'Use good quality basmati rice for best results',
      'The key is to cook on very low heat during the dum (steaming) process',
      'You can add fried onions for extra flavor',
    ],
    tags: ['indian', 'biryani', 'rice', 'vegetarian', 'one-pot'],
    featured: false,
    status: RecipeStatus.PUBLISHED,
  },
  {
    recipeId: generateRecipeId(),
    title: 'Mango Lassi',
    description: 'A refreshing and creamy Indian yogurt-based drink made with ripe mangoes. Perfect for hot summer days!',
    coverImage: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=800',
    ingredients: [
      { name: 'Sweet Mangoes', quantity: 2, unit: 'pieces', category: 'Fruits', searchTerms: ['mango', 'aam'] },
      { name: 'Yogurt', quantity: 2, unit: 'cup', category: 'Dairy', searchTerms: ['curd', 'dahi'] },
      { name: 'Fresh Milk', quantity: 1, unit: 'cup', category: 'Dairy' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Peel and chop mangoes into chunks. Remove the seed.', duration: 5 },
      { stepNumber: 2, instruction: 'Add mango chunks, yogurt, milk, and sugar to a blender.', duration: 2 },
      { stepNumber: 3, instruction: 'Blend until smooth and creamy. Add ice cubes if desired.', duration: 2 },
      { stepNumber: 4, instruction: 'Pour into glasses and serve chilled. Garnish with a mango slice.', duration: 1 },
    ],
    servings: 4,
    prepTime: 10,
    cookTime: 0,
    category: RecipeCategory.SNACK,
    cuisine: 'Indian',
    dietaryTags: [DietaryTag.VEGETARIAN, DietaryTag.GLUTEN_FREE],
    difficulty: DifficultyLevel.EASY,
    nutritionInfo: {
      servingSize: '1 glass',
      calories: 180,
      protein: 6,
      carbohydrates: 32,
      fat: 4,
      sugar: 28,
    },
    tips: [
      'Use ripe, sweet mangoes for best flavor',
      'Adjust sugar based on sweetness of mangoes',
      'Can be made vegan by using plant-based yogurt',
    ],
    tags: ['indian', 'drink', 'mango', 'lassi', 'summer', 'quick'],
    featured: false,
    status: RecipeStatus.PUBLISHED,
  },
  {
    recipeId: generateRecipeId(),
    title: 'Tomato Rice (South Indian Style)',
    description: 'A simple and flavorful one-pot rice dish made with tomatoes and aromatic spices. Perfect for lunch boxes!',
    coverImage: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800',
    ingredients: [
      { name: 'Organic Brown Rice', quantity: 1.5, unit: 'cup', category: 'Grains', searchTerms: ['rice'] },
      { name: 'Fresh Tomatoes', quantity: 4, unit: 'pieces', category: 'Vegetables' },
      { name: 'Red Chili Powder', quantity: 1, unit: 'tsp', category: 'Spices' },
      { name: 'Organic Turmeric Powder', quantity: 0.5, unit: 'tsp', category: 'Spices' },
      { name: 'Coriander Powder', quantity: 1, unit: 'tsp', category: 'Spices' },
      { name: 'Garam Masala', quantity: 0.5, unit: 'tsp', category: 'Spices' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Cook rice until fluffy and keep aside.', duration: 20 },
      { stepNumber: 2, instruction: 'Blanch tomatoes, peel and chop them finely.', duration: 10 },
      { stepNumber: 3, instruction: 'Heat oil, add mustard seeds and curry leaves. Let them splutter.', duration: 2 },
      { stepNumber: 4, instruction: 'Add chopped tomatoes and all spices. Cook until tomatoes are mushy.', duration: 8 },
      { stepNumber: 5, instruction: 'Add cooked rice and mix gently. Cook for 2 minutes and serve hot.', duration: 3 },
    ],
    servings: 3,
    prepTime: 10,
    cookTime: 25,
    category: RecipeCategory.LUNCH,
    cuisine: 'South Indian',
    dietaryTags: [DietaryTag.VEGETARIAN, DietaryTag.VEGAN, DietaryTag.GLUTEN_FREE],
    difficulty: DifficultyLevel.EASY,
    nutritionInfo: {
      servingSize: '1 plate',
      calories: 320,
      protein: 7,
      carbohydrates: 62,
      fat: 5,
      fiber: 4,
    },
    tips: [
      'Use leftover rice for quicker preparation',
      'Add roasted peanuts for extra crunch',
      'Great for lunch boxes as it stays fresh',
    ],
    tags: ['indian', 'rice', 'one-pot', 'easy', 'south-indian', 'vegan'],
    featured: false,
    status: RecipeStatus.PUBLISHED,
  },
  {
    recipeId: generateRecipeId(),
    title: 'Carrot Halwa (Gajar Ka Halwa)',
    description: 'A classic Indian dessert made with grated carrots, milk, and ghee. Warm, comforting, and absolutely delicious!',
    coverImage: 'https://images.unsplash.com/photo-1606849965732-752c0c01f5ca?w=800',
    ingredients: [
      { name: 'Fresh Carrots', quantity: 500, unit: 'g', category: 'Vegetables', searchTerms: ['carrot', 'gajar'] },
      { name: 'Fresh Milk', quantity: 2, unit: 'cup', category: 'Dairy' },
      { name: 'Ghee', quantity: 4, unit: 'tbsp', category: 'Dairy' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Peel and grate carrots finely.', duration: 10 },
      { stepNumber: 2, instruction: 'Heat ghee in a heavy-bottomed pan. Add grated carrots and sauté for 5 minutes.', duration: 5 },
      { stepNumber: 3, instruction: 'Add milk and cook on medium heat, stirring occasionally until milk is absorbed.', duration: 25 },
      { stepNumber: 4, instruction: 'Add sugar and cardamom powder. Mix well and cook for another 10 minutes.', duration: 10 },
      { stepNumber: 5, instruction: 'Garnish with nuts and serve warm or cold.', duration: 2 },
    ],
    servings: 6,
    prepTime: 15,
    cookTime: 45,
    category: RecipeCategory.SNACK,
    cuisine: 'North Indian',
    dietaryTags: [DietaryTag.VEGETARIAN, DietaryTag.GLUTEN_FREE],
    difficulty: DifficultyLevel.EASY,
    nutritionInfo: {
      servingSize: '1 bowl',
      calories: 280,
      protein: 5,
      carbohydrates: 35,
      fat: 14,
      sugar: 28,
    },
    tips: [
      'Use red carrots for vibrant color',
      'Full-fat milk gives the best taste',
      'Slow cooking is the key to perfect texture',
    ],
    tags: ['indian', 'dessert', 'sweet', 'carrot', 'traditional', 'festival'],
    featured: false,
    status: RecipeStatus.PUBLISHED,
  },
];

async function seedRecipes() {
  try {
    console.log('🌱 Starting recipe seeding process...');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const recipesCollection = db.collection('recipes');
    const usersCollection = db.collection('users');

    // Find a user to use as creator (prefer admin, fallback to any user)
    const creator = await usersCollection.findOne({ userType: 'ADMIN' }) ||
                    await usersCollection.findOne({});

    if (!creator) {
      throw new Error('No users found in database. Please create a user first.');
    }

    console.log(`📝 Using user ${creator.email} as recipe creator`);

    // Check if recipes already exist
    const existingCount = await recipesCollection.countDocuments({});

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing recipes. Clearing...`);
      await recipesCollection.deleteMany({});
      console.log('✅ Cleared existing recipes');
    }

    // Insert recipes with creator
    const recipesWithCreator = indianRecipes.map(recipe => ({
      ...recipe,
      createdBy: creator._id,
      averageRating: 0,
      ratingCount: 0,
      viewCount: 0,
      savedCount: 0,
      cookCount: 0,
      totalTime: recipe.prepTime + recipe.cookTime,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
    }));

    const result = await recipesCollection.insertMany(recipesWithCreator);

    console.log(`✅ Successfully inserted ${result.insertedCount} recipes!`);
    console.log('\n📋 Recipe Summary:');
    indianRecipes.forEach((recipe, index) => {
      console.log(`   ${index + 1}. ${recipe.title} (${recipe.cuisine}) - ${recipe.difficulty}`);
    });

    console.log('\n🎉 Recipe seeding completed successfully!');
    console.log('💡 You can now browse these recipes at http://localhost:3000/customer/recipes\n');

  } catch (error) {
    console.error('❌ Error seeding recipes:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seeding
seedRecipes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
