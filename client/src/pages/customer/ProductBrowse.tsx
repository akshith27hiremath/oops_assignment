/**
 * Product Browse Page - GroceryMart Style
 * Modern product cards with filters dropdown and similar products sidebar
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import productService from '../../services/product.service';
import wishlistService from '../../services/wishlist.service';
import geolocationService from '../../services/geolocation.service';
import { useCartStore } from '../../stores/cartStore';
import { Product, ProductFilters } from '../../types/product.types';
import StarRating from '../../components/reviews/StarRating';
import ReviewList from '../../components/reviews/ReviewList';
import { calculateDeliveryTime, calculateDistance } from '../../utils/deliveryTime';
import toast from 'react-hot-toast';

interface Location {
  latitude: number;
  longitude: number;
}

const ProductBrowse: React.FC = () => {
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'reviews'>('details');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'delivery'>('relevance');
  const { addItem } = useCartStore();

  // Category-subcategory mapping
  const categorySubcategories: Record<string, string[]> = {
    'Fruits': ['Fresh Fruits', 'Citrus Fruits', 'Berries', 'Tropical Fruits', 'Dried Fruits'],
    'Vegetables': ['Leafy Greens', 'Root Vegetables', 'Fresh Vegetables', 'Exotic Vegetables'],
    'Dairy': ['Milk Products', 'Cheese', 'Yogurt', 'Butter & Cream'],
    'Grains': ['Rice', 'Wheat Products', 'Millets', 'Pulses & Lentils'],
    'Spices': ['Whole Spices', 'Ground Spices', 'Spice Blends', 'Herbs'],
    'Beverages': ['Juices', 'Tea & Coffee', 'Health Drinks', 'Soft Drinks']
  };

  // Real categories from backend
  const categories = Object.keys(categorySubcategories);

  // Handle search query and product ID from dashboard
  useEffect(() => {
    const state = location.state as { searchQuery?: string; openProductId?: string };
    if (state?.searchQuery) {
      setSearchQuery(state.searchQuery);
      setFilters(prev => ({ ...prev, search: state.searchQuery }));
    }
    // If product ID is provided, load and open that product
    if (state?.openProductId) {
      loadAndOpenProduct(state.openProductId);
    }
  }, [location.state]);

  // Load user location on mount
  useEffect(() => {
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.profile?.location?.coordinates) {
          const profileLocation = {
            latitude: user.profile.location.coordinates[1],
            longitude: user.profile.location.coordinates[0],
          };
          setUserLocation(profileLocation);
          return;
        }
      }

      const savedLocation = geolocationService.getLocation();
      if (savedLocation) {
        setUserLocation(savedLocation);
      }
    } catch (error) {
      console.error('Failed to load user location:', error);
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  const getRetailerDistance = (product: Product): string | null => {
    if (!userLocation || !product.createdBy?.profile?.location?.coordinates) {
      return null;
    }
    const retailerLat = product.createdBy.profile.location.coordinates[1];
    const retailerLng = product.createdBy.profile.location.coordinates[0];
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      retailerLat,
      retailerLng
    );
    return distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`;
  };

  const getDeliveryTime = (product: Product): string | null => {
    if (!userLocation || !product.createdBy?.profile?.location?.coordinates) {
      return null;
    }
    const retailerLat = product.createdBy.profile.location.coordinates[1];
    const retailerLng = product.createdBy.profile.location.coordinates[0];
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      retailerLat,
      retailerLng
    );
    const deliveryEstimate = calculateDeliveryTime(distance);
    return deliveryEstimate.label;
  };

  const getRetailerName = (product: Product): string => {
    // Show the retailer who actually has inventory, not the wholesaler who created the product
    if (product.retailerInventories && product.retailerInventories.length > 0) {
      // Get the first retailer with stock
      const retailerWithStock = product.retailerInventories.find(inv => inv.currentStock > 0);
      const inventory = retailerWithStock || product.retailerInventories[0];

      if (inventory.owner) {
        return inventory.owner.businessName || inventory.owner.profile?.name || 'Retailer';
      }
    }

    // Fallback: if no retailer inventory, might be a direct retail product
    if (product.createdBy?.userType === 'RETAILER') {
      return product.createdBy?.businessName || product.createdBy?.profile?.name || 'Retailer';
    }

    return 'No Retailer Available';
  };

  // Get best discount from all retailer inventories
  const getBestDiscount = (product: Product): { discount: number; reason?: string } | null => {
    console.log('🔍 getBestDiscount called for:', product.name);

    if (!product.retailerInventories || product.retailerInventories.length === 0) {
      console.log('❌ No retailerInventories for', product.name);
      return null;
    }

    console.log('✅ Has', product.retailerInventories.length, 'inventory entries');

    let bestDiscount = 0;
    let bestReason: string | undefined;
    const now = new Date();

    for (const inventory of product.retailerInventories) {
      console.log('  Checking inventory:', inventory.productDiscount);
      if (inventory.productDiscount?.isActive && new Date(inventory.productDiscount.validUntil) > now) {
        console.log('  ✓ Valid discount found:', inventory.productDiscount.discountPercentage + '%');
        if (inventory.productDiscount.discountPercentage > bestDiscount) {
          bestDiscount = inventory.productDiscount.discountPercentage;
          bestReason = inventory.productDiscount.reason;
        }
      }
    }

    console.log('💰 Best discount for', product.name, ':', bestDiscount + '%');
    return bestDiscount > 0 ? { discount: bestDiscount, reason: bestReason } : null;
  };

  // Get discounted price
  const getDiscountedPrice = (product: Product): number => {
    const discountInfo = getBestDiscount(product);
    if (!discountInfo) return product.basePrice;

    return product.basePrice * (1 - discountInfo.discount / 100);
  };

  const getProductDistance = (product: Product): number => {
    if (!userLocation || !product.createdBy?.profile?.location?.coordinates) {
      return Infinity;
    }
    const retailerLat = product.createdBy.profile.location.coordinates[1];
    const retailerLng = product.createdBy.profile.location.coordinates[0];
    return calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      retailerLat,
      retailerLng
    );
  };

  // Get stock info from retailer inventories
  const getStockInfo = (product: Product): { stock: number; expectedDate?: string } | null => {
    if (!product.retailerInventories || product.retailerInventories.length === 0) {
      return null;
    }

    // Get the first retailer with stock, or first inventory
    const retailerWithStock = product.retailerInventories.find(inv => inv.currentStock > 0);
    const inventory = retailerWithStock || product.retailerInventories[0];

    return {
      stock: inventory.currentStock - inventory.reservedStock,
      expectedDate: inventory.expectedAvailabilityDate,
    };
  };

  const getSortedProducts = (): Product[] => {
    const productsCopy = [...products];

    switch (sortBy) {
      case 'price-low':
        return productsCopy.sort((a, b) => a.basePrice - b.basePrice);
      case 'price-high':
        return productsCopy.sort((a, b) => b.basePrice - a.basePrice);
      case 'delivery':
        return productsCopy.sort((a, b) => {
          const distA = getProductDistance(a);
          const distB = getProductDistance(b);
          return distA - distB; // Closest first
        });
      default:
        return productsCopy; // relevance (as returned from API)
    }
  };

  useEffect(() => {
    loadProducts();
    loadWishlist();
  }, [currentPage, filters]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts(filters, currentPage, 12);
      if (response.success) {
        console.log('📦 Loaded products:', response.data.products.length);
        response.data.products.forEach(p => {
          console.log(`  - ${p.name}: has retailerInventories = ${!!p.retailerInventories}, count = ${p.retailerInventories?.length || 0}`);
        });
        setProducts(response.data.products);
        setTotalPages(response.data.pagination.pages || response.data.pagination.totalPages || 1);
        setTotalProducts(response.data.pagination.total || response.data.pagination.totalItems || 0);
      }
    } catch (error: any) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadSimilarProducts = async (product: Product) => {
    try {
      // Load products from same category
      const response = await productService.getProducts(
        { category: product.category?.name },
        1,
        4
      );
      if (response.success) {
        // Filter out the current product
        const similar = response.data.products.filter(p => p._id !== product._id).slice(0, 3);
        setSimilarProducts(similar);
      }
    } catch (error) {
      console.error('Failed to load similar products:', error);
    }
  };

  const loadWishlist = async () => {
    try {
      const response = await wishlistService.getWishlist();
      if (response.success) {
        const wishlistIds = new Set(response.data.products.map((p: any) => p._id));
        setWishlistItems(wishlistIds);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    try {
      if (wishlistItems.has(productId)) {
        await wishlistService.removeFromWishlist(productId);
        setWishlistItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        toast.success('Removed from wishlist');
      } else {
        await wishlistService.addToWishlist(productId);
        setWishlistItems(prev => new Set(prev).add(productId));
        toast.success('Added to wishlist');
      }
    } catch (error: any) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    // If changing category, clear subcategory
    if (key === 'category') {
      const newFilters = { ...filters };
      delete newFilters.subcategory; // Clear subcategory when category changes

      if (value === '' || value === undefined) {
        delete newFilters.category;
        setFilters(newFilters);
      } else {
        setFilters({ ...newFilters, category: value });
      }
    } else if (value === '' || value === undefined) {
      // If value is empty string or undefined, remove the filter
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setFilters(prev => ({ ...prev, search: searchQuery.trim() }));
    } else {
      // Remove search filter if query is empty
      const newFilters = { ...filters };
      delete newFilters.search;
      setFilters(newFilters);
    }
    setCurrentPage(1);
  };

  // Live search as user types
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        setFilters(prev => ({ ...prev, search: searchQuery.trim() }));
      } else {
        // Remove search filter if query is empty
        const newFilters = { ...filters };
        delete newFilters.search;
        setFilters(newFilters);
      }
      setCurrentPage(1);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadAndOpenProduct = async (productId: string) => {
    try {
      const response = await productService.getProductById(productId);
      if (response.success && response.data.product) {
        openModal(response.data.product);
      } else {
        toast.error('Product not found');
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      toast.error('Failed to load product');
    }
  };

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
    setModalTab('details');
    setCurrentImageIndex(0);
    loadSimilarProducts(product);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setModalTab('details');
    setCurrentImageIndex(0);
    setSimilarProducts([]);
  };

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();

    // Check stock before adding
    const stockInfo = getStockInfo(product);
    if (!stockInfo || stockInfo.stock <= 0) {
      toast.error('This item is currently out of stock');
      return;
    }

    try {
      addItem(product, 1);
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const renderProductModal = () => {
    if (!isModalOpen || !selectedProduct) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center p-4" onClick={closeModal}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Main Product Details */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProduct.name}</h2>
                {selectedProduct.averageRating > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <StarRating rating={selectedProduct.averageRating} size="sm" showNumber />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ({selectedProduct.reviewCount} {selectedProduct.reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex gap-8">
                <button
                  onClick={() => setModalTab('details')}
                  className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
                    modalTab === 'details'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Product Details
                </button>
                <button
                  onClick={() => setModalTab('reviews')}
                  className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
                    modalTab === 'reviews'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Reviews ({selectedProduct.reviewCount || 0})
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="max-h-[60vh] overflow-y-auto">
              {modalTab === 'details' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {/* Main Image with Navigation */}
                    <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      {selectedProduct.images && selectedProduct.images.length > 0 ? (
                        <>
                          <img
                            src={selectedProduct.images[currentImageIndex]}
                            alt={`${selectedProduct.name} - Image ${currentImageIndex + 1}`}
                            className="w-full h-full object-cover"
                          />

                          {/* Navigation Arrows (only show if multiple images) */}
                          {selectedProduct.images.length > 1 && (
                            <>
                              {/* Previous Button */}
                              <button
                                onClick={() => setCurrentImageIndex((prev) =>
                                  prev === 0 ? selectedProduct.images.length - 1 : prev - 1
                                )}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 hover:bg-opacity-100 dark:hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
                                title="Previous image"
                              >
                                <svg className="w-5 h-5 text-gray-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>

                              {/* Next Button */}
                              <button
                                onClick={() => setCurrentImageIndex((prev) =>
                                  prev === selectedProduct.images.length - 1 ? 0 : prev + 1
                                )}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 hover:bg-opacity-100 dark:hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
                                title="Next image"
                              >
                                <svg className="w-5 h-5 text-gray-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>

                              {/* Image Counter */}
                              <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                {currentImageIndex + 1} / {selectedProduct.images.length}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Gallery (only show if multiple images) */}
                    {selectedProduct.images && selectedProduct.images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedProduct.images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                              currentImageIndex === index
                                ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-600'
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                          >
                            <img
                              src={image}
                              alt={`Thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{selectedProduct.description || 'No description available.'}</p>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between py-2 border-b dark:border-gray-700">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Price</span>
                        <div className="flex items-center gap-2">
                          {getBestDiscount(selectedProduct) ? (
                            <>
                              <span className="text-green-600 dark:text-green-400 font-bold">
                                ₹{getDiscountedPrice(selectedProduct).toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
                                ₹{selectedProduct.basePrice}
                              </span>
                              <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full font-bold">
                                {getBestDiscount(selectedProduct)!.discount}% OFF
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-900 dark:text-white">₹{selectedProduct.basePrice}</span>
                          )}
                          <span className="text-sm text-gray-500 dark:text-gray-400">/ {selectedProduct.unit}</span>
                        </div>
                      </div>
                      {getBestDiscount(selectedProduct)?.reason && (
                        <div className="py-2 border-b dark:border-gray-700">
                          <span className="text-sm text-orange-600 dark:text-orange-400 italic">
                            🔥 {getBestDiscount(selectedProduct)!.reason}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-b dark:border-gray-700">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Category</span>
                        <span className="text-gray-900 dark:text-white">{selectedProduct.category?.name || 'Uncategorized'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b dark:border-gray-700">
                        <span className="font-medium text-gray-700 dark:text-gray-300">In Stock</span>
                        <span className="text-gray-900 dark:text-white">{selectedProduct.stock > 0 ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b dark:border-gray-700">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Sold by</span>
                        <span className="text-gray-900 dark:text-white">{getRetailerName(selectedProduct)}</span>
                      </div>
                      {getRetailerDistance(selectedProduct) && (
                        <div className="flex justify-between py-2 border-b dark:border-gray-700">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Distance</span>
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {getRetailerDistance(selectedProduct)} away
                          </span>
                        </div>
                      )}
                      {getDeliveryTime(selectedProduct) && (
                        <div className="flex justify-between py-2 border-b dark:border-gray-700">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Est. Delivery</span>
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {getDeliveryTime(selectedProduct)}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        handleAddToCart({ stopPropagation: () => {} } as any, selectedProduct);
                        closeModal();
                      }}
                      className="w-full px-6 py-3 bg-gray-900 dark:bg-green-600 text-white font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-green-700 transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ) : (
                <ReviewList productId={selectedProduct._id} />
              )}
            </div>
          </div>

          {/* Similar Products Sidebar */}
          <div className="w-80 bg-gray-50 dark:bg-gray-800 p-6 border-l dark:border-gray-700 overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Similar Products</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">You might also like these alternatives</p>

            <div className="space-y-4">
              {similarProducts.map((product) => (
                <div
                  key={product._id}
                  onClick={() => {
                    closeModal();
                    setTimeout(() => openModal(product), 100);
                  }}
                  className="bg-white dark:bg-gray-900 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-3">
                    {product.tags?.includes('Organic') && (
                      <span className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                        Organic
                      </span>
                    )}
                    {getBestDiscount(product) && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        {getBestDiscount(product)!.discount}% OFF
                      </span>
                    )}
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.category?.name}</p>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">{product.name}</h4>

                  {/* Rating */}
                  {product.averageRating > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <StarRating rating={product.averageRating} size="sm" showNumber={false} />
                      <span className="text-xs text-gray-600 dark:text-gray-400">({product.reviewCount})</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    {getBestDiscount(product) ? (
                      <>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          ₹{getDiscountedPrice(product).toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
                          ₹{product.basePrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">/{product.unit}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          ₹{product.basePrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">/{product.unit}</span>
                      </>
                    )}
                  </div>

                  {/* Discount Reason */}
                  {getBestDiscount(product)?.reason && (
                    <div className="mt-1 text-xs text-orange-600 dark:text-orange-400 italic">
                      🔥 {getBestDiscount(product)!.reason}
                    </div>
                  )}

                  {/* Retailer Info */}
                  {getRetailerName(product) && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span className="truncate">{getRetailerName(product)}</span>
                    </div>
                  )}

                  {/* Stock Info */}
                  {(() => {
                    const stockInfo = getStockInfo(product);
                    if (!stockInfo) return null;

                    if (stockInfo.stock > 0) {
                      return (
                        <div className="mt-2 flex items-center gap-1 text-xs">
                          <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {stockInfo.stock} in stock
                          </span>
                        </div>
                      );
                    } else if (stockInfo.expectedDate) {
                      const expectedDate = new Date(stockInfo.expectedDate);
                      const formattedDate = expectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <div className="mt-2 flex items-center gap-1 text-xs">
                          <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-orange-600 dark:text-orange-400">
                            Back {formattedDate}
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="mt-2 flex items-center gap-1 text-xs">
                          <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-red-600 dark:text-red-400">
                            Out of stock
                          </span>
                        </div>
                      );
                    }
                  })()}

                  {/* Arrow Icon */}
                  <div className="flex justify-end mt-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const activeFiltersCount = Object.keys(filters).filter(k => k !== 'search').length;

  return (
    <CustomerLayout>
      {renderProductModal()}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Browse Products</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Fresh groceries delivered to your door</p>
      </div>

      {/* Search Bar and Filters */}
      <div className="mb-6 flex gap-3">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
          />
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="relevance">Sort by: Relevance</option>
            <option value="delivery">Sort by: Fastest Delivery</option>
            <option value="price-low">Sort by: Price (Low to High)</option>
            <option value="price-high">Sort by: Price (High to Low)</option>
          </select>
        </div>

        {/* Filters Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-medium text-gray-900 dark:text-white">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold">{activeFiltersCount}</span>
            )}
          </button>

          {/* Filters Dropdown Menu */}
          {showFiltersDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowFiltersDropdown(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-40 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h3>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                    <select
                      value={filters.category || ''}
                      onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory Filter - Only show when category is selected */}
                  {filters.category && categorySubcategories[filters.category] && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Subcategory</label>
                      <select
                        value={filters.subcategory || ''}
                        onChange={(e) => handleFilterChange('subcategory', e.target.value || undefined)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">All {filters.category}</option>
                        {categorySubcategories[filters.category].map(subcat => (
                          <option key={subcat} value={subcat}>{subcat}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Price Range Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Price Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice || ''}
                        onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice || ''}
                        onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* Stock Filter */}
                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.inStock || false}
                        onChange={(e) => handleFilterChange('inStock', e.target.checked ? true : undefined)}
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">In stock only</span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading products...</p>
          </div>
        </div>
      ) : products.length > 0 ? (
        <>
          {/* Results Summary */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-semibold">{(currentPage - 1) * 12 + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(currentPage * 12, totalProducts)}</span> of{' '}
              <span className="font-semibold">{totalProducts}</span> products
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getSortedProducts().map((product) => (
              <div
                key={product._id}
                onClick={() => openModal(product)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-xl transition-all cursor-pointer group overflow-hidden"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                  {/* Out of Stock Overlay */}
                  {(() => {
                    const stockInfo = getStockInfo(product);
                    if (stockInfo && stockInfo.stock <= 0) {
                      return (
                        <div className="absolute inset-0 bg-red-600 bg-opacity-80 z-20 flex flex-col items-center justify-center">
                          <svg className="w-16 h-16 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-white font-bold text-lg">OUT OF STOCK</span>
                          {stockInfo.expectedDate && (
                            <span className="text-white text-sm mt-1">
                              Back {new Date(stockInfo.expectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {product.tags?.includes('Organic') && (
                    <span className="absolute top-3 left-3 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                      Organic
                    </span>
                  )}
                  {getBestDiscount(product) && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10 shadow-lg">
                      {getBestDiscount(product)!.discount}% OFF
                    </span>
                  )}
                  {product.tags?.includes('Sale') && !getBestDiscount(product) && (
                    <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                      Sale
                    </span>
                  )}
                  {product.images && product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Wishlist & Rating */}
                  <button
                    onClick={(e) => handleToggleWishlist(e, product._id)}
                    className="absolute bottom-3 right-3 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
                  >
                    <svg
                      className={`w-5 h-5 ${
                        wishlistItems.has(product._id)
                          ? 'fill-red-500 stroke-red-500'
                          : 'fill-none stroke-gray-600 dark:stroke-gray-300'
                      }`}
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>

                  {product.averageRating > 0 && (
                    <div className="absolute bottom-3 left-3 bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{product.averageRating.toFixed(1)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({product.reviewCount})</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.category?.name || 'Uncategorized'}</p>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base mb-2 line-clamp-2 min-h-[3rem]">
                    {product.name}
                  </h3>

                  {/* Retailer Info */}
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                    <div className="flex items-center gap-1 truncate flex-1">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span className="truncate">{getRetailerName(product)}</span>
                    </div>
                    {getRetailerDistance(product) && (
                      <span className="text-green-600 dark:text-green-400 font-medium ml-2 flex-shrink-0">
                        {getRetailerDistance(product)}
                      </span>
                    )}
                  </div>

                  {/* Delivery Time */}
                  {getDeliveryTime(product) && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-3">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Delivery: {getDeliveryTime(product)}</span>
                    </div>
                  )}

                  {/* Stock Display */}
                  {(() => {
                    const stockInfo = getStockInfo(product);
                    if (!stockInfo) return null;

                    if (stockInfo.stock > 0) {
                      return (
                        <div className="flex items-center gap-1 text-xs mb-3">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {stockInfo.stock} in stock
                          </span>
                        </div>
                      );
                    } else if (stockInfo.expectedDate) {
                      const expectedDate = new Date(stockInfo.expectedDate);
                      const formattedDate = expectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <div className="flex items-center gap-1 text-xs mb-3">
                          <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            Back {formattedDate}
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center gap-1 text-xs mb-3">
                          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Out of stock
                          </span>
                        </div>
                      );
                    }
                  })()}

                  {/* Price and Cart */}
                  <div className="flex items-center justify-between">
                    <div>
                      {getBestDiscount(product) ? (
                        <>
                          <div className="flex items-baseline gap-2">
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">
                              ₹{getDiscountedPrice(product).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 line-through">
                              ₹{product.basePrice.toFixed(2)}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">/ {product.unit}</p>
                          {getBestDiscount(product)?.reason && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 italic mt-1">
                              🔥 {getBestDiscount(product)!.reason}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            ₹{product.basePrice.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">/ {product.unit}</p>
                        </>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      disabled={getStockInfo(product)?.stock === 0}
                      className={`p-3 rounded-lg transition-colors ${
                        getStockInfo(product)?.stock === 0
                          ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      title={getStockInfo(product)?.stock === 0 ? 'Out of stock' : 'Add to cart'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white text-sm font-medium"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white font-medium"
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex space-x-1">
                {(() => {
                  const pages = [];
                  const maxButtons = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

                  if (endPage - startPage < maxButtons - 1) {
                    startPage = Math.max(1, endPage - maxButtons + 1);
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-4 py-2 rounded-lg transition font-medium ${
                          currentPage === i
                            ? 'bg-green-600 text-white'
                            : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pages;
                })()}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white font-medium"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white text-sm font-medium"
              >
                Last
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 text-lg">No products found</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-green-600 hover:text-green-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </CustomerLayout>
  );
};

export default ProductBrowse;
