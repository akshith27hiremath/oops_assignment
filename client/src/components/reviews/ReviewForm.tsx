import React, { useState } from 'react';
import StarRating from './StarRating';
import reviewService, { CreateReviewData } from '../../services/review.service';

interface ReviewFormProps {
  productId: string;
  productName: string;
  orderId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  productId,
  productName,
  orderId,
  onSuccess,
  onCancel,
}) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = imageFiles.length + newFiles.length;

    if (totalFiles > 5) {
      alert('Maximum 5 images allowed');
      return;
    }

    // Validate file types and sizes
    for (const file of newFiles) {
      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Each image must be less than 5MB');
        return;
      }
    }

    // Add files and create previews
    const updatedFiles = [...imageFiles, ...newFiles];
    setImageFiles(updatedFiles);

    // Create preview URLs for new files
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Please write at least 10 characters in your review');
      return;
    }

    try {
      setLoading(true);

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('productId', productId);
      formData.append('rating', rating.toString());
      if (title.trim()) {
        formData.append('title', title.trim());
      }
      formData.append('comment', comment.trim());

      // Append image files (optional)
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });

      await reviewService.createReviewWithImages(formData);

      // Success
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error creating review:', err);
      setError(err.response?.data?.message || 'Failed to create review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Write a Review</h2>
      <p className="text-gray-600 mb-6">for {productName}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-4">
            <StarRating
              rating={rating}
              interactive
              size="xl"
              onChange={setRating}
            />
            {rating > 0 && (
              <span className="text-lg font-semibold text-gray-700">
                {rating} {rating === 1 ? 'star' : 'stars'}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
            placeholder="Sum up your experience in one line"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="text-sm text-gray-500 mt-1 text-right">{title.length}/50</div>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Review <span className="text-red-500">*</span>
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            minLength={10}
            maxLength={2000}
            rows={5}
            placeholder="Share your experience with this product..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
          <div className="text-sm text-gray-500 mt-1 text-right">
            {comment.length}/2000 (minimum 10 characters)
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Images (Optional, max 5)
          </label>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Review ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition-colors shadow-md"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Images */}
          {imageFiles.length < 5 && (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <input
                type="file"
                id="review-images"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <label
                htmlFor="review-images"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg
                  className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Click to upload images
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  JPEG, PNG, WEBP (Max 5MB each)
                </span>
              </label>
            </div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Upload up to 5 images to your review ({imageFiles.length}/5)
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Review Guidelines:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be honest and detailed about your experience</li>
            <li>• Focus on the product's features and quality</li>
            <li>• Keep your review respectful and constructive</li>
            <li>• You can edit your review within 48 hours of posting</li>
          </ul>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
