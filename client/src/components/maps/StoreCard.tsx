import React from 'react';
import { Link } from 'react-router-dom';
import { Store } from '../../types/store.types';

interface StoreCardProps {
  store: Store;
  onGetDirections?: () => void;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, onGetDirections }) => {
  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${store.location.latitude},${store.location.longitude}`;
    window.open(url, '_blank');
    if (onGetDirections) {
      onGetDirections();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-gray-200">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
        {store.isOpen ? (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
            Open
          </span>
        ) : (
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
            Closed
          </span>
        )}
      </div>

      {store.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{store.description}</p>
      )}

      <div className="space-y-2 mb-3">
        {/* Rating */}
        <div className="flex items-center">
          <svg
            className="h-4 w-4 text-yellow-400 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {store.rating.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500 ml-1">({store.reviewCount})</span>
        </div>

        {/* Distance */}
        {store.formattedDistance && (
          <div className="flex items-center text-sm text-gray-600">
            <svg
              className="h-4 w-4 mr-1 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {store.formattedDistance} away
          </div>
        )}

        {/* Products Count */}
        {store.productsCount !== undefined && (
          <div className="flex items-center text-sm text-gray-600">
            <svg
              className="h-4 w-4 mr-1 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            {store.productsCount} products available
          </div>
        )}

        {/* Address */}
        {store.address && (
          <div className="flex items-start text-sm text-gray-600">
            <svg
              className="h-4 w-4 mr-1 text-gray-400 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="line-clamp-2">
              {store.address.street}, {store.address.city}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Link
          to={`/customer/browse?store=${store._id}`}
          className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition text-center"
        >
          View Products
        </Link>
        <button
          onClick={handleGetDirections}
          className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition"
        >
          Directions
        </button>
      </div>
    </div>
  );
};

export default StoreCard;
