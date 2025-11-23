/**
 * Inventory Management Page
 * Manage products, stock levels, and pricing
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import productService from '../../services/product.service';
import inventoryService, { Inventory } from '../../services/inventory.service';
import { Product } from '../../types/product.types';
import DarkModeToggle from '../../components/DarkModeToggle';
import toast from 'react-hot-toast';

const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    basePrice: 0,
    unit: 'kg',
    stock: 0,
    tags: '',
    images: '',
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [discountFormData, setDiscountFormData] = useState({
    discountPercentage: 10,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    reason: '',
  });

  // Category and subcategory options
  const categoryOptions: Record<string, string[]> = {
    'Fruits': ['Fresh Fruits', 'Dried Fruits', 'Exotic Fruits', 'Citrus Fruits'],
    'Vegetables': ['Leafy Greens', 'Root Vegetables', 'Seasonal Vegetables', 'Organic Vegetables'],
    'Dairy': ['Milk Products', 'Cheese', 'Yogurt', 'Butter & Ghee'],
    'Grains': ['Rice', 'Wheat', 'Pulses', 'Cereals'],
    'Spices': ['Whole Spices', 'Ground Spices', 'Spice Mixes', 'Herbs'],
    'Beverages': ['Tea', 'Coffee', 'Juices', 'Health Drinks'],
    'Bakery': ['Bread', 'Cakes', 'Cookies', 'Pastries'],
    'Snacks': ['Chips', 'Namkeen', 'Biscuits', 'Nuts'],
    'Oil & Ghee': ['Cooking Oil', 'Ghee', 'Specialty Oils'],
    'Personal Care': ['Soap', 'Shampoo', 'Oral Care', 'Skin Care'],
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventory();
      if (response.data && response.data.inventory) {
        setInventory(response.data.inventory);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = imageFiles.length + newFiles.length;

    if (totalFiles > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Validate file types and sizes
    for (const file of newFiles) {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Each image must be less than 5MB');
        return;
      }
    }

    const updatedFiles = [...imageFiles, ...newFiles];
    setImageFiles(updatedFiles);

    // Create preview URLs
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const categoryId = `CAT-${formData.category.toUpperCase().replace(/\s+/g, '-')}`;

      // If there are image files, use FormData
      if (imageFiles.length > 0) {
        const formDataObj = new FormData();
        formDataObj.append('name', formData.name);
        formDataObj.append('description', formData.description);
        formDataObj.append('category', JSON.stringify({
          categoryId: categoryId,
          name: formData.category,
          subcategory: formData.subcategory || undefined,
        }));
        formDataObj.append('basePrice', formData.basePrice.toString());
        formDataObj.append('unit', formData.unit);
        formDataObj.append('stock', formData.stock.toString());

        // Add tags
        const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        formDataObj.append('tags', JSON.stringify(tags));

        // Add image files
        imageFiles.forEach((file) => {
          formDataObj.append('images', file);
        });

        if (editingProduct) {
          await productService.updateProductWithImages(editingProduct._id, formDataObj);
          toast.success('Product updated successfully');
        } else {
          await productService.createProductWithImages(formDataObj);
          toast.success('Product created successfully');
        }
      } else {
        // No images, use regular JSON
        const productData = {
          name: formData.name,
          description: formData.description,
          category: {
            categoryId: categoryId,
            name: formData.category,
            subcategory: formData.subcategory || undefined,
          },
          basePrice: formData.basePrice,
          unit: formData.unit,
          stock: formData.stock,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          images: formData.images.split(',').map(img => img.trim()).filter(Boolean),
        };

        if (editingProduct) {
          await productService.updateProduct(editingProduct._id, productData);
          toast.success('Product updated successfully');
        } else {
          await productService.createProduct(productData);
          toast.success('Product created successfully');
        }
      }

      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleEdit = async (inventoryItem: Inventory) => {
    const product = inventoryItem.productId;
    setEditingProduct(product as any);

    // Fetch full product details to get description and tags
    try {
      const response = await productService.getProductById(product._id);
      const fullProduct = response.data.product;

      setFormData({
        name: fullProduct.name,
        description: fullProduct.description || '',
        category: fullProduct.category.name,
        subcategory: fullProduct.category.subcategory || '',
        basePrice: fullProduct.basePrice,
        unit: fullProduct.unit,
        stock: inventoryItem.currentStock,
        tags: fullProduct.tags ? fullProduct.tags.join(', ') : '',
        images: fullProduct.images.join(', '),
      });
    } catch (error) {
      // Fallback to inventory data if fetch fails
      setFormData({
        name: product.name,
        description: '',
        category: product.category.name,
        subcategory: product.category.subcategory || '',
        basePrice: product.basePrice,
        unit: product.unit,
        stock: inventoryItem.currentStock,
        tags: '',
        images: product.images.join(', '),
      });
    }

    setShowAddModal(true);
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productService.deleteProduct(productId);
      toast.success('Product deleted successfully');
      loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleStockUpdate = async (inventoryId: string, newStock: number) => {
    try {
      await inventoryService.updateStock(inventoryId, newStock);
      toast.success('Stock updated successfully');
      loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stock');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      subcategory: '',
      basePrice: 0,
      unit: 'kg',
      stock: 0,
      tags: '',
      images: '',
    });
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleSetDiscount = (item: Inventory) => {
    setSelectedInventory(item);
    if (item.productDiscount) {
      setDiscountFormData({
        discountPercentage: item.productDiscount.discountPercentage,
        validUntil: new Date(item.productDiscount.validUntil).toISOString().split('T')[0],
        reason: item.productDiscount.reason || '',
      });
    } else {
      setDiscountFormData({
        discountPercentage: 10,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reason: '',
      });
    }
    setShowDiscountModal(true);
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventory) return;

    try {
      await inventoryService.setProductDiscount(
        selectedInventory._id,
        discountFormData.discountPercentage,
        new Date(discountFormData.validUntil),
        discountFormData.reason || undefined
      );
      toast.success('Discount set successfully! This product will now appear in Featured Products.');
      setShowDiscountModal(false);
      loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to set discount');
    }
  };

  const handleRemoveDiscount = async (inventoryId: string) => {
    if (!window.confirm('Are you sure you want to remove this discount?')) {
      return;
    }

    try {
      await inventoryService.removeProductDiscount(inventoryId);
      toast.success('Discount removed successfully');
      loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove discount');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
            <div className="flex space-x-3 items-center">
              <DarkModeToggle />
              <button
                onClick={() => {
                  resetForm();
                  setEditingProduct(null);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Product
              </button>
              <Link to="/retailer/dashboard" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Inventory Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky right-0 bg-gray-50 dark:bg-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {inventory.map((item) => (
                <tr key={item._id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={item.productId.images[0] || 'https://via.placeholder.com/50'}
                        alt={item.productId.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.productId.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.productId.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {item.sourceType === 'B2B_ORDER' && item.wholesalerId ? (
                      <div>
                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400">From Wholesaler</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {item.wholesalerId.businessName || item.wholesalerId.profile?.name}
                        </div>
                        {item.sourceOrderId && (
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            Order: {item.sourceOrderId.orderNumber}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-green-600 dark:text-green-400">Created by me</div>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{item.productId.category.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.productId.category.subcategory}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">₹{item.sellingPrice}</div>
                    {item.wholesalePricePaid && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Cost: ₹{item.wholesalePricePaid} |
                        <span className={`ml-1 font-medium ${
                          item.sellingPrice > item.wholesalePricePaid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {((item.sellingPrice - item.wholesalePricePaid) / item.wholesalePricePaid * 100).toFixed(1)}% margin
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <input
                      type="number"
                      value={item.currentStock}
                      onChange={(e) => handleStockUpdate(item._id, Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.currentStock > item.reorderLevel ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        item.currentStock > 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {item.currentStock > item.reorderLevel ? 'In Stock' :
                         item.currentStock > 0 ? 'Low Stock' :
                         'Out of Stock'}
                      </span>
                      {item.currentStock === 0 && (
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Expected back:</label>
                          <input
                            type="date"
                            value={item.expectedAvailabilityDate ? new Date(item.expectedAvailabilityDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const date = e.target.value ? new Date(e.target.value) : null;
                              inventoryService.updateExpectedAvailability(item._id, date)
                                .then(() => {
                                  toast.success('Expected availability updated');
                                  loadInventory();
                                })
                                .catch(() => toast.error('Failed to update'));
                            }}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {item.productDiscount && item.productDiscount.isActive &&
                     new Date(item.productDiscount.validUntil) > new Date() ? (
                      <div>
                        <div className="text-sm font-medium text-green-600 dark:text-green-400">
                          {item.productDiscount.discountPercentage}% OFF
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Until {new Date(item.productDiscount.validUntil).toLocaleDateString()}
                        </div>
                        {item.productDiscount.reason && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 italic">
                            {item.productDiscount.reason}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">No discount</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white dark:bg-gray-800">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSetDiscount(item)}
                        className={`${
                          item.productDiscount && item.productDiscount.isActive &&
                          new Date(item.productDiscount.validUntil) > new Date()
                            ? 'text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300'
                            : 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300'
                        }`}
                        title={item.productDiscount && item.productDiscount.isActive &&
                          new Date(item.productDiscount.validUntil) > new Date()
                            ? 'Edit Discount'
                            : 'Set Discount'}
                      >
                        🏷️
                      </button>
                      {item.productDiscount && item.productDiscount.isActive &&
                       new Date(item.productDiscount.validUntil) > new Date() && (
                        <button
                          onClick={() => handleRemoveDiscount(item._id)}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                          title="Remove Discount"
                        >
                          ❌
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Edit Product"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(item.productId._id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="Delete Product"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                  resetForm();
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {Object.keys(categoryOptions).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subcategory</label>
                  <select
                    required
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.category}
                  >
                    <option value="">Select Subcategory</option>
                    {formData.category && categoryOptions[formData.category]?.map((subcat) => (
                      <option key={subcat} value={subcat}>{subcat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="kg">Kg</option>
                    <option value="g">Gram</option>
                    <option value="l">Liter</option>
                    <option value="ml">ML</option>
                    <option value="piece">Piece</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="organic, fresh, local"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Images (Optional)</label>

                {/* File Upload */}
                <div className="mt-2">
                  <input
                    type="file"
                    id="product-images"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="product-images"
                    className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                  >
                    <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload images</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">JPEG, PNG, WEBP (Max 5MB each, up to 5 images)</span>
                  </label>
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Or enter image URLs (comma-separated):
                </p>
                <input
                  type="text"
                  value={formData.images}
                  onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && selectedInventory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Set Product Discount
            </h2>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{selectedInventory.productId.name}</strong>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Current Price: ₹{selectedInventory.sellingPrice}
              </p>
            </div>

            <form onSubmit={handleDiscountSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={discountFormData.discountPercentage}
                  onChange={(e) => setDiscountFormData({
                    ...discountFormData,
                    discountPercentage: Number(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Discounted price: ₹{(selectedInventory.sellingPrice * (1 - discountFormData.discountPercentage / 100)).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={discountFormData.validUntil}
                  onChange={(e) => setDiscountFormData({
                    ...discountFormData,
                    validUntil: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={discountFormData.reason}
                  onChange={(e) => setDiscountFormData({
                    ...discountFormData,
                    reason: e.target.value
                  })}
                  placeholder="e.g., Flash Sale, Clearance, Season End"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-green-50 dark:bg-green-900 p-3 rounded border border-green-200 dark:border-green-700">
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  ✨ This product will be featured on the customer dashboard!
                </p>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  Products with active discounts appear in the Featured Products section.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Set Discount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscountModal(false);
                    setSelectedInventory(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
