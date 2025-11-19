/**
 * Delivery Time Estimation Utility
 * Calculates estimated delivery time based on distance from retailer
 */

export interface DeliveryEstimate {
  minHours: number;
  maxHours: number;
  label: string;
}

/**
 * Calculate estimated delivery time based on distance in kilometers
 *
 * Algorithm:
 * - 0-2 km: 30 min - 1 hour (express delivery)
 * - 2-5 km: 1-2 hours (same day)
 * - 5-10 km: 2-4 hours (same day)
 * - 10-20 km: 4-8 hours (same day)
 * - 20-50 km: 1-2 days
 * - 50+ km: 2-5 days
 */
export function calculateDeliveryTime(distanceKm: number): DeliveryEstimate {
  if (distanceKm < 0) {
    return { minHours: 0, maxHours: 0, label: 'Unknown' };
  }

  if (distanceKm <= 2) {
    return {
      minHours: 0.5,
      maxHours: 1,
      label: '30 min - 1 hour'
    };
  }

  if (distanceKm <= 5) {
    return {
      minHours: 1,
      maxHours: 2,
      label: '1-2 hours'
    };
  }

  if (distanceKm <= 10) {
    return {
      minHours: 2,
      maxHours: 4,
      label: '2-4 hours'
    };
  }

  if (distanceKm <= 20) {
    return {
      minHours: 4,
      maxHours: 8,
      label: '4-8 hours'
    };
  }

  if (distanceKm <= 50) {
    return {
      minHours: 24,
      maxHours: 48,
      label: '1-2 days'
    };
  }

  return {
    minHours: 48,
    maxHours: 120,
    label: '2-5 days'
  };
}

/**
 * Get delivery time category for sorting
 * Lower is faster
 */
export function getDeliveryTimeCategory(distanceKm: number): number {
  if (distanceKm <= 2) return 1;
  if (distanceKm <= 5) return 2;
  if (distanceKm <= 10) return 3;
  if (distanceKm <= 20) return 4;
  if (distanceKm <= 50) return 5;
  return 6;
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}
