/**
 * Delivery Estimation Service
 * Uses Google Maps Routes API to calculate delivery time and distance
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

interface DeliveryEstimate {
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  calculatedAt: Date;
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
}

class DeliveryService {
  /**
   * Geocode an address to coordinates using Google Maps Geocoding API
   */
  async geocodeAddress(address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }): Promise<GeocodingResult | null> {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        logger.warn('Google Maps API key not configured');
        return null;
      }

      // Construct full address string
      const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;

      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: fullAddress,
          key: GOOGLE_MAPS_API_KEY,
        },
      });

      if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }

      logger.warn(`Geocoding failed for address: ${fullAddress}. Status: ${response.data.status}`);
      return null;
    } catch (error: any) {
      logger.error('Geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Calculate delivery time and distance using Google Maps Routes API (v2)
   */
  async calculateDeliveryEstimate(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<DeliveryEstimate | null> {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        logger.warn('Google Maps API key not configured');
        return null;
      }

      // Use Routes API v2 (Compute Routes)
      // Documentation: https://developers.google.com/maps/documentation/routes/compute_route_directions
      const response = await axios.post(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          origin: {
            location: {
              latLng: {
                latitude: originLat,
                longitude: originLng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destLat,
                longitude: destLng,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: false,
          routeModifiers: {
            avoidTolls: false,
            avoidHighways: false,
            avoidFerries: false,
          },
          languageCode: 'en-US',
          units: 'METRIC',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
          },
        }
      );

      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const distanceMeters = route.distanceMeters || 0;
        const durationSeconds = parseInt(route.duration?.replace('s', '') || '0');

        // Format distance (e.g., "5.2 km" or "850 m")
        let distanceText: string;
        if (distanceMeters >= 1000) {
          distanceText = `${(distanceMeters / 1000).toFixed(1)} km`;
        } else {
          distanceText = `${distanceMeters} m`;
        }

        // Format duration (e.g., "15 mins" or "1 hr 20 mins")
        let durationText: string;
        const minutes = Math.round(durationSeconds / 60);
        if (minutes >= 60) {
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;
          durationText = remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} mins` : `${hours} hr`;
        } else {
          durationText = `${minutes} mins`;
        }

        return {
          distanceMeters,
          distanceText,
          durationSeconds,
          durationText,
          calculatedAt: new Date(),
        };
      }

      logger.warn('No routes found in Google Maps Routes API response');
      return null;
    } catch (error: any) {
      logger.error('Delivery estimate calculation error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Calculate Haversine distance between two coordinates (in km)
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Create fallback delivery estimate using Haversine distance
   * Assumes average city driving speed of 20 km/h (conservative estimate)
   */
  private createFallbackEstimate(distanceKm: number): DeliveryEstimate {
    const distanceMeters = Math.round(distanceKm * 1000);

    // Format distance
    let distanceText: string;
    if (distanceMeters >= 1000) {
      distanceText = `${(distanceMeters / 1000).toFixed(1)} km`;
    } else {
      distanceText = `${distanceMeters} m`;
    }

    // Estimate duration: assume 20 km/h average speed in city traffic
    const averageSpeedKmh = 20;
    const durationHours = distanceKm / averageSpeedKmh;
    const durationSeconds = Math.round(durationHours * 3600);

    // Format duration
    let durationText: string;
    const minutes = Math.round(durationSeconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      durationText = remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} mins` : `${hours} hr`;
    } else {
      durationText = `${minutes} mins`;
    }

    return {
      distanceMeters,
      distanceText,
      durationSeconds,
      durationText,
      calculatedAt: new Date(),
    };
  }

  /**
   * Get delivery estimate from retailer location to delivery address
   * Uses Google Maps APIs with fallback to Haversine distance calculation
   */
  async getDeliveryEstimate(
    retailerLocation: { latitude: number; longitude: number },
    deliveryAddress: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    }
  ): Promise<{
    coordinates: GeocodingResult | null;
    estimate: DeliveryEstimate | null;
  }> {
    try {
      // Step 1: Try to geocode the delivery address using Google Maps
      let coordinates = await this.geocodeAddress(deliveryAddress);

      // Fallback: If geocoding fails, use city center as approximation
      if (!coordinates) {
        logger.warn('Geocoding failed, attempting to use city/state for approximate location');

        // Try geocoding with just city and state (more generic, likely to work)
        const simplifiedAddress = {
          street: '',
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          zipCode: '',
          country: deliveryAddress.country,
        };

        coordinates = await this.geocodeAddress(simplifiedAddress);

        if (!coordinates) {
          logger.warn('Failed to geocode even simplified address, using Haversine distance fallback');

          // Final fallback: Estimate based on Haversine distance
          // Use a reasonable approximation for the delivery location based on city
          // For Hyderabad, use approximate city center coordinates
          const cityApproximations: { [key: string]: GeocodingResult } = {
            'Hyderabad': { latitude: 17.3850, longitude: 78.4867 },
            'Bangalore': { latitude: 12.9716, longitude: 77.5946 },
            'Mumbai': { latitude: 19.0760, longitude: 72.8777 },
            'Delhi': { latitude: 28.7041, longitude: 77.1025 },
          };

          coordinates = cityApproximations[deliveryAddress.city] || null;

          if (!coordinates) {
            logger.error('Cannot estimate delivery - unknown city and geocoding failed');
            return { coordinates: null, estimate: null };
          }

          logger.info(`Using approximate coordinates for ${deliveryAddress.city}`);
        }
      }

      // Step 2: Try to calculate route using Google Maps Routes API
      let estimate = await this.calculateDeliveryEstimate(
        retailerLocation.latitude,
        retailerLocation.longitude,
        coordinates.latitude,
        coordinates.longitude
      );

      // Fallback: If Routes API fails, use Haversine distance
      if (!estimate) {
        logger.warn('Google Maps Routes API failed, using Haversine distance fallback');

        const distance = this.calculateHaversineDistance(
          retailerLocation.latitude,
          retailerLocation.longitude,
          coordinates.latitude,
          coordinates.longitude
        );

        estimate = this.createFallbackEstimate(distance);
        logger.info(`📍 Fallback estimate: ${estimate.distanceText}, ${estimate.durationText} (direct distance)`);
      }

      return { coordinates, estimate };
    } catch (error: any) {
      logger.error('Get delivery estimate error:', error.message);

      // Ultimate fallback: Return null to allow order creation to continue
      return { coordinates: null, estimate: null };
    }
  }
}

export default new DeliveryService();
