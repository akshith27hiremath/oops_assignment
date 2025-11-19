const imageUrl = "https://i.ytimg.com/vi/ivBKibihfEY/maxresdefault.jpg";

const retailerIds = [
  "6903680adf87abc193ce5f47", // Fresh Veggies Store
  "6903680adf87abc193ce5f48", // Fruit Paradise
  "6903680adf87abc193ce5f49", // Organic Bazaar
  "6903680adf87abc193ce5f4a", // Spice Market
  "6903680adf87abc193ce5f4b"  // Dairy Delights
];

const products = [];

// Fresh Veggies Store products
products.push(
  { name: "Fresh Tomatoes", description: "Red ripe tomatoes", category: { name: "Vegetables", subcategory: "Fresh Vegetables" }, basePrice: 40, unit: "kg", tags: ["fresh", "vegetables"], images: [imageUrl], isActive: true, createdBy: retailerIds[0] },
  { name: "Organic Potatoes", description: "Farm fresh organic potatoes", category: { name: "Vegetables", subcategory: "Root Vegetables" }, basePrice: 30, unit: "kg", tags: ["organic", "vegetables"], images: [imageUrl], isActive: true, createdBy: retailerIds[0] },
  { name: "Green Spinach", description: "Fresh green spinach leaves", category: { name: "Vegetables", subcategory: "Leafy Greens" }, basePrice: 25, unit: "bunch", tags: ["fresh", "leafy"], images: [imageUrl], isActive: true, createdBy: retailerIds[0] },
  { name: "Fresh Carrots", description: "Crunchy orange carrots", category: { name: "Vegetables", subcategory: "Root Vegetables" }, basePrice: 35, unit: "kg", tags: ["fresh", "vegetables"], images: [imageUrl], isActive: true, createdBy: retailerIds[0] },
  { name: "Green Beans", description: "Fresh tender green beans", category: { name: "Vegetables", subcategory: "Fresh Vegetables" }, basePrice: 60, unit: "kg", tags: ["fresh", "vegetables"], images: [imageUrl], isActive: true, createdBy: retailerIds[0] },
  { name: "Cauliflower", description: "Fresh white cauliflower", category: { name: "Vegetables", subcategory: "Fresh Vegetables" }, basePrice: 45, unit: "piece", tags: ["fresh", "vegetables"], images: [imageUrl], isActive: true, createdBy: retailerIds[0] }
);

// Fruit Paradise products
products.push(
  { name: "Fresh Apples", description: "Crisp red apples from Kashmir", category: { name: "Fruits", subcategory: "Fresh Fruits" }, basePrice: 150, unit: "kg", tags: ["fresh", "fruits"], images: [imageUrl], isActive: true, createdBy: retailerIds[1] },
  { name: "Ripe Bananas", description: "Yellow ripe bananas", category: { name: "Fruits", subcategory: "Fresh Fruits" }, basePrice: 50, unit: "dozen", tags: ["fresh", "fruits"], images: [imageUrl], isActive: true, createdBy: retailerIds[1] },
  { name: "Sweet Mangoes", description: "Alphonso mangoes", category: { name: "Fruits", subcategory: "Fresh Fruits" }, basePrice: 200, unit: "kg", tags: ["fresh", "fruits"], images: [imageUrl], isActive: true, createdBy: retailerIds[1] },
  { name: "Fresh Oranges", description: "Juicy oranges", category: { name: "Fruits", subcategory: "Citrus Fruits" }, basePrice: 80, unit: "kg", tags: ["fresh", "fruits"], images: [imageUrl], isActive: true, createdBy: retailerIds[1] },
  { name: "Watermelon", description: "Sweet red watermelon", category: { name: "Fruits", subcategory: "Fresh Fruits" }, basePrice: 30, unit: "kg", tags: ["fresh", "fruits"], images: [imageUrl], isActive: true, createdBy: retailerIds[1] },
  { name: "Green Grapes", description: "Seedless green grapes", category: { name: "Fruits", subcategory: "Fresh Fruits" }, basePrice: 120, unit: "kg", tags: ["fresh", "fruits"], images: [imageUrl], isActive: true, createdBy: retailerIds[1] }
);

// Organic Bazaar products
products.push(
  { name: "Organic Apples", description: "100% organic apples", category: { name: "Fruits", subcategory: "Organic Fruits" }, basePrice: 180, unit: "kg", tags: ["organic", "fruits"], images: [imageUrl], isActive: true, createdBy: retailerIds[2] },
  { name: "Organic Tomatoes", description: "Pesticide-free tomatoes", category: { name: "Vegetables", subcategory: "Organic Vegetables" }, basePrice: 60, unit: "kg", tags: ["organic", "vegetables"], images: [imageUrl], isActive: true, createdBy: retailerIds[2] },
  { name: "Organic Brown Rice", description: "Unpolished brown rice", category: { name: "Grains", subcategory: "Organic Grains" }, basePrice: 90, unit: "kg", tags: ["organic", "grains"], images: [imageUrl], isActive: true, createdBy: retailerIds[2] },
  { name: "Organic Honey", description: "Pure organic honey", category: { name: "Organic Products", subcategory: "Sweeteners" }, basePrice: 450, unit: "kg", tags: ["organic", "honey"], images: [imageUrl], isActive: true, createdBy: retailerIds[2] },
  { name: "Organic Turmeric Powder", description: "Pure turmeric powder", category: { name: "Spices", subcategory: "Organic Spices" }, basePrice: 350, unit: "kg", tags: ["organic", "spices"], images: [imageUrl], isActive: true, createdBy: retailerIds[2] },
  { name: "Organic Jaggery", description: "Chemical-free jaggery", category: { name: "Organic Products", subcategory: "Sweeteners" }, basePrice: 120, unit: "kg", tags: ["organic", "jaggery"], images: [imageUrl], isActive: true, createdBy: retailerIds[2] }
);

// Spice Market products
products.push(
  { name: "Red Chili Powder", description: "Premium chili powder", category: { name: "Spices", subcategory: "Powdered Spices" }, basePrice: 280, unit: "kg", tags: ["spices", "powder"], images: [imageUrl], isActive: true, createdBy: retailerIds[3] },
  { name: "Coriander Powder", description: "Fresh coriander powder", category: { name: "Spices", subcategory: "Powdered Spices" }, basePrice: 200, unit: "kg", tags: ["spices", "powder"], images: [imageUrl], isActive: true, createdBy: retailerIds[3] },
  { name: "Garam Masala", description: "Blend of Indian spices", category: { name: "Spices", subcategory: "Masala Blends" }, basePrice: 400, unit: "kg", tags: ["spices", "masala"], images: [imageUrl], isActive: true, createdBy: retailerIds[3] },
  { name: "Cashew Nuts", description: "Premium cashew nuts", category: { name: "Dry Fruits", subcategory: "Nuts" }, basePrice: 700, unit: "kg", tags: ["dry fruits", "nuts"], images: [imageUrl], isActive: true, createdBy: retailerIds[3] },
  { name: "Almonds", description: "California almonds", category: { name: "Dry Fruits", subcategory: "Nuts" }, basePrice: 650, unit: "kg", tags: ["dry fruits", "nuts"], images: [imageUrl], isActive: true, createdBy: retailerIds[3] },
  { name: "Black Pepper", description: "Whole black peppercorns", category: { name: "Spices", subcategory: "Whole Spices" }, basePrice: 550, unit: "kg", tags: ["spices", "pepper"], images: [imageUrl], isActive: true, createdBy: retailerIds[3] }
);

// Dairy Delights products
products.push(
  { name: "Fresh Milk", description: "Farm fresh milk", category: { name: "Dairy", subcategory: "Milk Products" }, basePrice: 60, unit: "liter", tags: ["dairy", "milk"], images: [imageUrl], isActive: true, createdBy: retailerIds[4] },
  { name: "Yogurt", description: "Fresh homemade yogurt", category: { name: "Dairy", subcategory: "Milk Products" }, basePrice: 50, unit: "kg", tags: ["dairy", "yogurt"], images: [imageUrl], isActive: true, createdBy: retailerIds[4] },
  { name: "Paneer", description: "Fresh cottage cheese", category: { name: "Dairy", subcategory: "Cheese" }, basePrice: 300, unit: "kg", tags: ["dairy", "paneer"], images: [imageUrl], isActive: true, createdBy: retailerIds[4] },
  { name: "Butter", description: "Homemade white butter", category: { name: "Dairy", subcategory: "Butter" }, basePrice: 450, unit: "kg", tags: ["dairy", "butter"], images: [imageUrl], isActive: true, createdBy: retailerIds[4] },
  { name: "Ghee", description: "Pure cow ghee", category: { name: "Dairy", subcategory: "Ghee" }, basePrice: 550, unit: "kg", tags: ["dairy", "ghee"], images: [imageUrl], isActive: true, createdBy: retailerIds[4] },
  { name: "Cheese Slices", description: "Processed cheese slices", category: { name: "Dairy", subcategory: "Cheese" }, basePrice: 400, unit: "kg", tags: ["dairy", "cheese"], images: [imageUrl], isActive: true, createdBy: retailerIds[4] }
);

console.log(JSON.stringify(products));
