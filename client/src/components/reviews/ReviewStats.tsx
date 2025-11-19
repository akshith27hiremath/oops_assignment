import React from 'react';
import StarRating from './StarRating';
import { ReviewStats as ReviewStatsType } from '../../services/review.service';

interface ReviewStatsProps {
  stats: ReviewStatsType;
  className?: string;
}

const ReviewStats: React.FC<ReviewStatsProps> = ({ stats, className = '' }) => {
  const { averageRating, totalReviews, ratingDistribution, verifiedPurchaseCount } = stats;

  // Calculate percentages for each rating
  const ratingPercentages = Object.entries(ratingDistribution)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([rating, count]) => ({
      rating: Number(rating),
      count,
      percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
    }));

  const verifiedPercentage = totalReviews > 0 ? (verifiedPurchaseCount / totalReviews) * 100 : 0;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Customer Reviews</h3>

      {/* Overall Rating */}
      <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-200">
        <div className="text-center">
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {averageRating.toFixed(1)}
          </div>
          <StarRating rating={averageRating} size="lg" showNumber={false} />
          <div className="text-sm text-gray-600 mt-2">
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1">
          {ratingPercentages.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-1 w-16">
                <span className="text-sm font-medium text-gray-700">{rating}</span>
                <svg
                  className="w-4 h-4 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 w-12 text-right">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Verified Purchases Badge */}
      {verifiedPurchaseCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            <span className="font-semibold">{verifiedPercentage.toFixed(0)}%</span> of reviews
            are from verified purchases
          </span>
        </div>
      )}
    </div>
  );
};

export default ReviewStats;
