/**
 * Wholesaler Inventory Management Page
 * Manage bulk products, stock levels, and pricing for wholesale
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import productService from '../../services/product.service';
import inventoryService, { Inventory } from '../../services/inventory.service';
import { ProductType } from '../../types/product.types';
import toast from 'react-hot-toast';
import DarkModeToggle from '../../components/DarkModeToggle';

const WholesalerInventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    basePrice: 0,
    unit: 'kg',
    stock: 0,
    minimumOrderQuantity: 10, // Wholesale default
    tags: '',
    images: '',
    availableForRetailers: true,
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventory();
      if (response.success) {
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
        formDataObj.append('minimumOrderQuantity', formData.minimumOrderQuantity.toString());
        formDataObj.append('availableForRetailers', formData.availableForRetailers.toString());

        const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        formDataObj.append('tags', JSON.stringify(tags));

        imageFiles.forEach((file) => {
          formDataObj.append('images', file);
        });

        const response = await productService.createProductWithImages(formDataObj);
        if (response.success) {
          toast.success('Wholesale product added successfully!');
          setShowAddModal(false);
          resetForm();
          loadInventory();
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
          minimumOrderQuantity: formData.minimumOrderQuantity,
          availableForRetailers: formData.availableForRetailers,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          images: formData.images.split(',').map(img => img.trim()).filter(Boolean),
        };

        const response = await productService.createProduct(productData);
        if (response.success) {
          toast.success('Wholesale product added successfully!');
          setShowAddModal(false);
          resetForm();
          loadInventory();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save product');
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

  const handleEdit = (item: Inventory) => {
    setEditingItem(item);
    setFormData({
      name: item.productId.name || '',
      description: item.productId.description || '',
      category: item.productId.category?.name || '',
      subcategory: item.productId.category?.subcategory || '',
      basePrice: item.sellingPrice || 0,
      unit: item.productId.unit || 'kg',
      stock: item.currentStock || 0,
      minimumOrderQuantity: item.productId.minimumOrderQuantity || 10,
      tags: (item.productId.tags && Array.isArray(item.productId.tags)) ? item.productId.tags.join(', ') : '',
      images: (item.productId.images && Array.isArray(item.productId.images)) ? item.productId.images.join(', ') : '',
      availableForRetailers: item.productId.availableForRetailers !== undefined ? item.productId.availableForRetailers : true,
    });
    setShowEditModal(true);
  };

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      // Update stock
      await inventoryService.updateStock(editingItem._id, formData.stock);

      // Update selling price if changed
      if (formData.basePrice !== editingItem.sellingPrice) {
        await inventoryService.updateInventory(editingItem._id, {
          sellingPrice: formData.basePrice,
        });
      }

      toast.success('Inventory updated successfully!');
      setShowEditModal(false);
      setEditingItem(null);
      resetForm();
      loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update inventory');
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
      minimumOrderQuantity: 10,
      tags: '',
      images: '',
      availableForRetailers: true,
    });
    setImageFiles([]);
    setImagePreviews([]);
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Inventory Management</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Manage your wholesale products</p>
            </div>
            <div className="flex gap-3">
              <DarkModeToggle />
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Add Bulk Product
              </button>
              <Link
                to="/wholesaler/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Products</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{inventory.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">In Stock</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {inventory.filter(item => item.currentStock > item.reorderLevel).length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Low Stock</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {inventory.filter(item => item.currentStock > 0 && item.currentStock <= item.reorderLevel).length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Out of Stock</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {inventory.filter(item => item.currentStock === 0).length}
            </p>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={item.productId.images[0] || 'https://via.placeholder.com/50'}
                        alt={item.productId.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.productId.name}</div>
                        <div className="text-sm text-gray-500">{item.productId.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{item.productId.category.name}</div>
                    <div className="text-sm text-gray-500">{item.productId.category.subcategory}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">₹{item.sellingPrice}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={item.currentStock}
                      onChange={(e) => handleStockUpdate(item._id, Number(e.target.value))}
                      className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.currentStock > item.reorderLevel ? 'bg-green-100 text-green-800 dark:text-green-400' :
                      item.currentStock > 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.currentStock > item.reorderLevel ? 'In Stock' :
                       item.currentStock > 0 ? 'Low Stock' :
                       'Out of Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Edit Inventory Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Edit Inventory</h2>
              <form onSubmit={handleUpdateInventory} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Product Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-900 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-900 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Selling Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Current Stock</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Unit</label>
                    <input
                      type="text"
                      value={formData.unit}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-900 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Minimum Order Quantity</label>
                    <input
                      type="number"
                      value={formData.minimumOrderQuantity}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-900 shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-900 shadow-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Inventory
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Add New Wholesale Product</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Product Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Category</label>
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Subcategory</label>
                    <input
                      type="text"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="gram">Gram (g)</option>
                      <option value="liter">Liter (L)</option>
                      <option value="ml">Milliliter (ml)</option>
                      <option value="piece">Piece</option>
                      <option value="dozen">Dozen</option>
                      <option value="packet">Packet</option>
                      <option value="box">Box</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Base Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Initial Stock</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Minimum Order Quantity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.minimumOrderQuantity}
                      onChange={(e) => setFormData({ ...formData, minimumOrderQuantity: Number(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum quantity retailers must order</p>
                  </div>
                  <div>
                    <label className="flex items-center mt-6">
                      <input
                        type="checkbox"
                        checked={formData.availableForRetailers}
                        onChange={(e) => setFormData({ ...formData, availableForRetailers: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Available for Retailers</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="wholesale, bulk, organic"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Product Images (Optional)</label>

                  {/* File Upload */}
                  <div className="mt-2">
                    <input
                      type="file"
                      id="wholesaler-product-images"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="wholesaler-product-images"
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
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WholesalerInventoryManagement;
