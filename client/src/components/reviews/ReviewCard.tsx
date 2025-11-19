import React, { useState } from 'react';
import StarRating from './StarRating';
import { Review } from '../../services/review.service';
import reviewService from '../../services/review.service';

interface ReviewCardProps {
  review: Review;
  onUpdate?: () => void;
  showProductInfo?: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, onUpdate, showProductInfo = false }) => {
  // Get user from localStorage
  const getUserFromStorage = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const user = getUserFromStorage();
  const [isHelpful, setIsHelpful] = useState(false);
  const [isNotHelpful, setIsNotHelpful] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [notHelpfulCount, setNotHelpfulCount] = useState(review.notHelpfulCount);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isOwnReview = user?._id === (typeof review.userId === 'object' ? review.userId._id : review.userId);
  const userName = typeof review.userId === 'object' ? review.userId.profile.name : 'Anonymous';
  const userAvatar = typeof review.userId === 'object' ? review.userId.profile.avatar : undefined;

  const productName = showProductInfo && typeof review.productId === 'object'
    ? review.productId.name
    : undefined;
  const productImage = showProductInfo && typeof review.productId === 'object'
    ? review.productId.images[0]
    : undefined;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleVoteHelpful = async (helpful: boolean) => {
    if (!user) {
      alert('Please login to vote');
      return;
    }

    try {
      setLoading(true);
      await reviewService.voteHelpful(review._id, helpful);

      // Toggle logic
      if (helpful) {
        if (isHelpful) {
          setIsHelpful(false);
          setHelpfulCount(prev => prev - 1);
        } else {
          setIsHelpful(true);
          setHelpfulCount(prev => prev + 1);
          if (isNotHelpful) {
            setIsNotHelpful(false);
            setNotHelpfulCount(prev => prev - 1);
          }
        }
      } else {
        if (isNotHelpful) {
          setIsNotHelpful(false);
          setNotHelpfulCount(prev => prev - 1);
        } else {
          setIsNotHelpful(true);
          setNotHelpfulCount(prev => prev + 1);
          if (isHelpful) {
            setIsHelpful(false);
            setHelpfulCount(prev => prev - 1);
          }
        }
      }

      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Error voting:', error);
      alert(error.response?.data?.message || 'Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  const handleFlag = async () => {
    if (!flagReason.trim()) {
      alert('Please provide a reason');
      return;
    }

    try {
      setLoading(true);
      await reviewService.flagReview(review._id, flagReason);
      alert('Review flagged successfully');
      setShowFlagModal(false);
      setFlagReason('');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Error flagging review:', error);
      alert(error.response?.data?.message || 'Failed to flag review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Product Info (if showing) */}
      {showProductInfo && productName && (
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
          {productImage && (
            <img
              src={productImage}
              alt={productName}
              className="w-12 h-12 object-cover rounded"
            />
          )}
          <div className="font-medium text-gray-900">{productName}</div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <div className="font-semibold text-gray-900">{userName}</div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
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

        {/* Actions */}
        {!isOwnReview && user && (
          <button
            onClick={() => setShowFlagModal(true)}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Report review"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Rating */}
      <div className="mb-3">
        <StarRating rating={review.rating} size="md" />
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}

      {/* Comment */}
      {review.comment && (
        <p className="text-gray-700 mb-4 leading-relaxed">{review.comment}</p>
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

      {/* Edited Badge */}
      {review.editedAt && (
        <div className="text-xs text-gray-500 mb-3">
          Edited on {formatDate(review.editedAt)}
        </div>
      )}

      {/* Retailer Response */}
      {review.retailerResponse && review.retailerResponse.responseText && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-r">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <span className="font-semibold text-blue-900">Store Response</span>
          </div>
          <p className="text-gray-700 text-sm">{review.retailerResponse.responseText}</p>
          <div className="text-xs text-gray-500 mt-2">
            {formatDate(review.retailerResponse.responseDate)}
          </div>
        </div>
      )}

      {/* Helpful Votes */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <span className="text-sm text-gray-600">Was this review helpful?</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVoteHelpful(true)}
            disabled={loading}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              isHelpful
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
            <span>Yes ({helpfulCount})</span>
          </button>
          <button
            onClick={() => handleVoteHelpful(false)}
            disabled={loading}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              isNotHelpful
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
            </svg>
            <span>No ({notHelpfulCount})</span>
          </button>
        </div>
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Report Review</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for flagging this review:
            </p>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleFlag}
                disabled={loading || !flagReason.trim()}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
              <button
                onClick={() => {
                  setShowFlagModal(false);
                  setFlagReason('');
                }}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
