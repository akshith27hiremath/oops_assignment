/**
 * Product Reviews Management Page for Retailers
 * View and respond to reviews on retailer's products
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import reviewService, { Review } from '../../services/review.service';
import productService from '../../services/product.service';
import { Product } from '../../types/product.types';
import StarRating from '../../components/reviews/StarRating';
import toast from 'react-hot-toast';
import DarkModeToggle from '../../components/DarkModeToggle';

const ProductReviews: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadReviews();
    }
  }, [selectedProduct, currentPage]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getInventory();
      if (response.success) {
        // Filter products that have reviews
        const productsWithReviews = response.data.products.filter(
          p => (p.reviewCount || 0) > 0
        );
        setProducts(productsWithReviews);
        if (productsWithReviews.length > 0) {
          setSelectedProduct(productsWithReviews[0]);
        }
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast.error(error.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    if (!selectedProduct) return;

    try {
      setLoadingReviews(true);
      const response = await reviewService.getProductReviews(
        selectedProduct._id,
        { sort: 'recent' },
        currentPage,
        10
      );
      if (response.success && response.data) {
        setReviews(response.data.reviews);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error: any) {
      console.error('Error loading reviews:', error);
      toast.error(error.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleAddResponse = async (reviewId: string) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    if (responseText.length > 500) {
      toast.error('Response must be 500 characters or less');
      return;
    }

    try {
      setSubmitting(true);
      await reviewService.addRetailerResponse(reviewId, responseText);
      toast.success('Response added successfully');
      setRespondingTo(null);
      setResponseText('');
      loadReviews();
    } catch (error: any) {
      console.error('Error adding response:', error);
      toast.error(error.response?.data?.message || 'Failed to add response');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading reviews...</p>
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Reviews</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                View and respond to customer reviews on your products
              </p>
            </div>
            <Link
              to="/retailer/dashboard"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Product Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sticky top-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Products</h2>
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {products.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedProduct?._id === product._id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:bg-gray-900 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images[0] || 'https://via.placeholder.com/50'}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <StarRating rating={product.averageRating || 0} size="sm" />
                            <span className="text-xs text-gray-600 dark:text-gray-300">
                              ({product.reviewCount || 0})
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="lg:col-span-3">
              {selectedProduct && (
                <>
                  {/* Product Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={selectedProduct.images[0] || 'https://via.placeholder.com/100'}
                        alt={selectedProduct.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {selectedProduct.name}
                        </h2>
                        <div className="flex items-center gap-3">
                          <StarRating
                            rating={selectedProduct.averageRating || 0}
                            size="lg"
                            showNumber
                          />
                          <span className="text-gray-600 dark:text-gray-300">
                            ({selectedProduct.reviewCount || 0} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reviews List */}
                  {loadingReviews ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600 dark:text-gray-300">Loading reviews...</p>
                    </div>
                  ) : reviews.length > 0 ? (
                    <>
                      <div className="space-y-4 mb-6">
                        {reviews.map((review) => {
                          const userName = typeof review.userId === 'object'
                            ? review.userId.profile.name
                            : 'Anonymous';
                          const userAvatar = typeof review.userId === 'object'
                            ? review.userId.profile.avatar
                            : undefined;
                          const hasResponse = !!review.retailerResponse && !!review.retailerResponse.responseText;

                          return (
                            <div
                              key={review._id}
                              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                            >
                              {/* Review Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <DarkModeToggle />
                                  {/* User Avatar */}
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                    {userAvatar ? (
                                      <img
                                        src={userAvatar}
                                        alt={userName}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      userName.charAt(0).toUpperCase()
                                    )}
                                  </div>

                                  <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{userName}</div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                      <span>{formatDate(review.createdAt)}</span>
                                      {review.isVerifiedPurchase && (
                                        <span className="flex items-center gap-1 text-green-600">
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                              fillRule="evenodd"
                                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                          Verified Purchase
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Rating */}
                              <div className="mb-3">
                                <StarRating rating={review.rating} size="md" />
                              </div>

                              {/* Title */}
                              {review.title && (
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                  {review.title}
                                </h4>
                              )}

                              {/* Comment */}
                              {review.comment && (
                                <p className="text-gray-700 dark:text-gray-200 mb-4 leading-relaxed">
                                  {review.comment}
                                </p>
                              )}

                              {/* Images */}
                              {review.images && review.images.length > 0 && (
                                <div className="flex gap-2 mb-4">
                                  {review.images.map((image, index) => (
                                    <img
                                      key={index}
                                      src={image}
                                      alt={`Review ${index + 1}`}
                                      className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => window.open(image, '_blank')}
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Helpful Votes */}
                              <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-300">
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                  </svg>
                                  {review.helpfulCount} helpful
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                  </svg>
                                  {review.notHelpfulCount} not helpful
                                </span>
                              </div>

                              {/* Retailer Response or Add Response Button */}
                              {hasResponse ? (
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
                                  <div className="flex items-center gap-2 mb-2">
                                    <svg
                                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                    </svg>
                                    <span className="font-semibold text-blue-900">Your Response</span>
                                  </div>
                                  <p className="text-gray-700 dark:text-gray-200 text-sm">
                                    {review.retailerResponse.responseText}
                                  </p>
                                  <div className="text-xs text-gray-500 mt-2">
                                    {formatDate(review.retailerResponse.responseDate)}
                                  </div>
                                </div>
                              ) : (
                                <div className="border-t border-gray-200 pt-4">
                                  {respondingTo === review._id ? (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                        Add your response
                                      </label>
                                      <textarea
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value)}
                                        placeholder="Write a professional response to this review..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        rows={4}
                                        maxLength={500}
                                      />
                                      <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-gray-500">
                                          {responseText.length}/500 characters
                                        </span>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => {
                                              setRespondingTo(null);
                                              setResponseText('');
                                            }}
                                            disabled={submitting}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleAddResponse(review._id)}
                                            disabled={submitting || !responseText.trim()}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                          >
                                            {submitting ? 'Submitting...' : 'Submit Response'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setRespondingTo(review._id)}
                                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition font-medium"
                                    >
                                      <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                        />
                                      </svg>
                                      Add Response
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:bg-gray-900 transition"
                          >
                            Previous
                          </button>
                          <span className="px-4 py-2 text-gray-700 dark:text-gray-200">
                            Page {currentPage} of {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:bg-gray-900 transition"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                      <svg
                        className="mx-auto h-24 w-24 text-gray-400 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        No Reviews Yet
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        This product hasn't received any reviews yet.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-24 w-24 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Products with Reviews
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You don't have any products with customer reviews yet.
            </p>
            <Link
              to="/retailer/inventory"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              View Inventory
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductReviews;
